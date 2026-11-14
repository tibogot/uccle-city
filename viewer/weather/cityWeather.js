// THE WEATHER IN THE CITY (docs/WEATHER.md "City hookup"): one Weather (weatherState.js) for the session, its surface
// state simulated per frame, and the systems the weather lab built, wired to the streamed city:
//   materials     wxMat() in the material factories (cityWeatherize.js): compiled once at boot, gated by wx.uOn
//   overhead map  64 m round the camera (12.5 cm cells), baked from above when the weather needs it and re-baked as
//                 the camera moves (GPU bake + readback async, the shape pass in a worker: no main-thread stall)
//   falling       rain streaks + splashes, snow flakes, autumn leaves round the camera (precipitation.js, compute)
//   snow layer    the volumetric layer (snowLayer.js) over the map's window, thinning out at its round edge
//   sky / fog     Firmament's cloud deck from the cloud cover, the key light fading under it, visibility fog + mist
//                 (lighting.js fogNode's weather terms), urban sky glow over snow at night
// Clear weather on load = the city as before (no bake, nothing drawn, the gate shut). ?weather=old: none of it.
// ?wx=<preset> (clear, overcast, drizzle, rain, storm, snowfall, snow cover, fog, live) starts with a weather.
import * as THREE from "three/webgpu";
import { Weather, WEATHER_PRESETS, wx } from "./weatherState.js";
import { WX_ON, setWeatherMap } from "./cityWeatherize.js";
import { createOverheadMap, SOLID_LAYER, CANOPY_LAYER, ROAD_LAYER } from "./overheadMap.js";
import { createPrecipitation } from "./precipitation.js";
import { createSnowLayer } from "./snowLayer.js";
import { wxLook } from "./surfaceWeather.js";
import { season, setDay } from "../seasons/season.js";
import { fetchLive, mapLive } from "./liveWeather.js";
import { env } from "../lighting.js";

const qp = new URLSearchParams(location.search);

// the city's presets (the dev panel's list): the lab's physics, named for the owner
Object.assign(WEATHER_PRESETS, {
  "overcast": { rain: 0, snow: 0, temp: 9, wind: 3, windDir: 230, cloud: 0.95, vis: 15000, state: { wet: 0, puddle: 0, depth: 0 } },
  "rain": { rain: 4, snow: 0, temp: 10, wind: 4, windDir: 225, cloud: 1, vis: 5000, state: { wet: 0.9, puddle: 0.4, depth: 0 } },
  "storm": { rain: 18, snow: 0, temp: 12, wind: 12, windDir: 240, cloud: 1, vis: 1500, state: { wet: 1, puddle: 0.95, depth: 0 } },
  "snowfall": { rain: 0, snow: 1.5, temp: -1.5, wind: 3, windDir: 60, cloud: 1, vis: 1500, state: { wet: 0.1, puddle: 0, depth: 0.08 } },
  "snow cover": { rain: 0, snow: 0, temp: -3, wind: 1, windDir: 60, cloud: 0.25, vis: 20000, state: { wet: 0, puddle: 0, depth: 0.15, icicle: 0.6 } },
  "fog": { rain: 0, snow: 0, temp: 4, wind: 0.5, windDir: 90, cloud: 0.6, vis: 300, state: { wet: 0.45, puddle: 0.15, depth: 0 } },
});
export const CITY_PRESETS = ["clear", "overcast", "drizzle", "rain", "storm", "snowfall", "snow cover", "fog"];
const MIST = { fog: 0.02 };

const MAP_SIZE = Math.max(32, Math.min(128, +(qp.get("wxmap") ?? 64)));
const map = WX_ON ? createOverheadMap({ renderer: null, size: MAP_SIZE, res: 512, depth: 260, height: 160 }) : null;
if (map) setWeatherMap(map);      // before any material is built: the ground families read its exposure

const lerp = THREE.MathUtils.lerp, sstep = THREE.MathUtils.smoothstep;

export const cityWeather = {
  on: WX_ON, map, weather: null, preset: "clear", live: false, liveInfo: "-",
  stats: { bakes: 0, bakeMs: 0, gpuMs: 0, shapeMs: 0, markMs: 0, solid: 0 },
  /** main.js, after the pipeline is set up (before the warm-up): build everything, compile it once */
  async start({ scene, renderer, camera, lighting, updaters, world, pipe = null, log = console.log }) {
    if (!WX_ON) return;
    const t0 = performance.now();
    const weather = this.weather = new Weather();
    weather.timeScale = 20;                      // simulated s per real s (the panel; the lab runs x60)
    window.__weather = weather;                  // the falcon's flight reads the wind (cityFlyer.js)
    map.setRenderer(renderer);
    const rain = createPrecipitation({ renderer, kind: "rain", map });
    const snow = createPrecipitation({ renderer, kind: "snow", map });
    const leaves = createPrecipitation({ renderer, kind: "leaves", map, trees: Array.from({ length: 8 }, () => ({ x: 0, z: 0, r: 4, y: -1e4 })) });
    const layer = createSnowLayer({ renderer, map, edgeFade: true });
    const group = new THREE.Group(); group.name = "weather";
    group.add(rain.mesh, rain.splashes, snow.mesh, leaves.mesh, layer.mesh);
    group.traverse((o) => { o.userData.wxSkip = true; });
    scene.add(group);
    Object.assign(this, { scene, renderer, camera, lighting, world, pipe, rain, snow, leaves, layer, group, log });
    // the start weather: ?wx=, else clear (the city as before)
    const want = (qp.get("wx") || "clear").replace(/_/g, " ");
    if (want === "live") this.goLive(); else this.setPreset(CITY_PRESETS.includes(want) || WEATHER_PRESETS[want] ? want : "clear", 0);
    this.last = performance.now();
    updaters.push((camPos, cam) => this.update(camPos, cam));
    // compile now (boot), not on the first rain: the compute passes and the draws, shown once in a hidden-count state
    for (const p of [rain, snow, leaves]) p.warm();
    layer.warm();
    // the draws for the post chain's scene pass (its MRT target: compileAsync on the canvas built other pipelines)
    try {
      const { precompile } = await import("../warmup.js");
      await precompile(renderer, group, camera, scene, { target: pipe?.passTarget ?? null, mrt: pipe?.passMRT ?? null });
    } catch (e) { log(`weather: compile ${e.message}`); }
    // one bake now, whatever the weather: its override-material pipelines compile at boot, not on the first rain
    if (!map.ready && !this.baking) await this.bake(camera.position, camera);
    log(`weather: ready in ${(performance.now() - t0).toFixed(0)} ms (?wx=rain|snowfall|..., ?weather=old: none), start ${this.preset}`);
  },

  setPreset(name, seconds = 3) {
    if (!this.weather || !WEATHER_PRESETS[name]) return;
    this.live = false; this.preset = name;
    this.weather.setPreset(name, seconds);
    this.mist = MIST[name] ?? 0;
    this.wantBake = true;
  },
  async goLive() {
    this.liveInfo = "fetching...";
    try {
      const m = mapLive(await fetchLive({ force: true }));
      const W = this.weather;
      W.fade = { from: { ...W.input }, to: m.input, t: 0, dur: 3 };
      W.state.depth = m.state.depth;
      if (m.state.wetHint != null) W.state.wet = Math.max(W.state.wet, m.state.wetHint);
      this.live = true; this.preset = "live"; this.liveInfo = m.label;
      this.mist = m.input.vis < 1000 ? 0.02 : 0;
      this.log?.(`weather: live Uccle (Open-Meteo, CC BY 4.0): ${m.label}`);
    } catch (e) { this.liveInfo = `failed: ${e.message}`; this.live = false; }
  },
  /** does anything on screen need the overhead map now? */
  needsMap() {
    const S = this.weather.state;
    return wx.uRain.value > 0 || wx.uSnowFall.value > 0 || S.depth > 0.002 || S.wet > 0.05 || S.puddle > 0.01 || this.leavesOn > 0;
  },

  update(camPos, cam) {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const W = this.weather, L = this.lighting;
    if (this.live && now - (this.liveAt ?? 0) > 15 * 60e3) { this.liveAt = now; this.goLive(); }
    W.update(dt);
    if ((this.frame = (this.frame ?? 0) + 1) % 120 === 1 && L.day != null && L.day !== season.day) setDay(L.day);
    // how much of the weather shows (0 = the city as before): ramps in / out over ~3 s
    const target = this.preset === "clear" && wx.uOn.value === 0 ? 0 : 1;
    this.w = THREE.MathUtils.clamp((this.w ?? 0) + Math.sign(target - (this.w ?? 0)) * dt / 3, 0, 1);
    this.coupleSky(dt);
    // ---- the overhead map: baked while the weather needs it, re-baked when the camera leaves its middle half
    if (this.needsMap()) {
      const c = map.centre, far = Math.hypot(camPos.x - c.x, camPos.z - c.z) > MAP_SIZE * 0.22;
      const stale = now - (this.bakedAt ?? -1e9) > 12000;           // tiles streaming in, cars moving: refresh now and then
      if (!this.baking && (!map.ready || far || stale || this.wantBake)) this.bake(camPos, cam);
    }
    // ---- falling things
    const H = this.renderer.domElement.height;
    this.rain.update(cam, dt, wx.uRain.value, H);
    this.snow.update(cam, dt, wx.uSnowFall.value, H);
    // leaves: autumn, only while there is weather (wind) on: clear stays the city as before
    this.leavesOn = this.w > 0 && map.ready && this.crowns ? season.uLeafFall.value * (0.3 + 0.7 * Math.min(1, W.input.wind / 6)) * this.w : 0;
    this.leaves.update(cam, dt, this.leavesOn * 0.6, H);
    // ---- the snow layer
    this.layer.update(dt, this.stamps?.() ?? []);
    this.layer.mesh.visible = map.ready && wx.uSnowDepth.value > 0.003;
    // particle colours: drops lens the sky behind them; flakes are white grains lit by the whole sky
    const fc = L.uFogColor?.value ?? { x: 0.5, y: 0.55, z: 0.6 }, night = this.night();
    this.rain.uColor.value.setRGB(fc.x * 0.95 + night * 0.25, fc.y * 0.97 + night * 0.2, fc.z + night * 0.14);
    this.snow.uColor.value.setRGB(fc.x * 2.2 + night * 0.5, fc.y * 2.25 + night * 0.45, fc.z * 2.35 + night * 0.4);
  },
  night() { return env.uNight.value; },

  /** Firmament + key light + fog follow the weather, blended by this.w; at w = 0 everything is handed back as it was. */
  coupleSky() {
    const L = this.lighting, W = this.weather, w = this.w;
    const F = L.wxFog;
    if (w <= 0) {
      if (this.saved) {                                   // hand the sky back exactly as the user / time preset had it
        const s = this.saved, p = L.sky?.params;
        L.firm.coverage = s.coverage; L.firm.cloudType = s.cloudType;
        if (p) for (const k of Object.keys(s.p)) p[k] = s.p[k];
        if (L.hemi) L.hemi.intensity = s.hemi;
        if (this.pipe?.lookId) this.pipe.look(this.pipe.lookId);     // the grade as the time preset has it
        this.saved = null;
      }
      if (F) { F.uBeta.value = 0; F.uMist.value = 0; F.uGrey.value = 0; }
      return;
    }
    const p = L.sky?.params;
    const K = ["weatherBias", "cloudBase", "cloudThickness", "stratusThickness", "typeVariation", "haze", "cirrus", "wetness"];
    this.saved ??= { coverage: L.firm.coverage, cloudType: L.firm.cloudType, p: p ? Object.fromEntries(K.filter((k) => k in p).map((k) => [k, p[k]])) : {}, hemi: L.hemi?.intensity ?? 0 };
    const s = this.saved, c = W.input.cloud, k = sstep(c, 0.55, 0.95);
    const wetAir = Math.min(1, wx.uRain.value + wx.uSnowFall.value);
    L.firm.coverage = lerp(s.coverage, 0.15 + 0.85 * c, w);
    L.firm.cloudType = lerp(s.cloudType, c > 0.85 ? 0.08 : 0.5, w);
    if (p) {
      const P0 = s.p, set = (key, v) => { if (key in P0) p[key] = lerp(P0[key], v, w); };
      set("weatherBias", lerp(P0.weatherBias ?? 0, 0.92, k));
      set("cloudBase", lerp(P0.cloudBase ?? 4000, 900 - 300 * wetAir, k));
      set("cloudThickness", lerp(P0.cloudThickness ?? 1000, 3000, k));
      set("stratusThickness", lerp(P0.stratusThickness ?? 0, 0.16, k));
      set("typeVariation", lerp(P0.typeVariation ?? 0.5, 0.12, k));
      set("cirrus", lerp(P0.cirrus ?? 0.5, 0.1, k));
      set("wetness", 0.5 * wetAir);
      set("haze", (P0.haze ?? 1.6) * (1 + 1.5 * wetAir + 2 * Math.min(1, 2000 / Math.max(200, W.input.vis))));
    }
    // the key light fades under a full deck (no hard shadows when overcast): after lighting.update set it this frame
    if (L.uKey) L.uKey.value.multiplyScalar(1 - 0.88 * k * w);
    // the grade: a wet / snowy day under a full deck is grey and flat (the photos: no warm cast, low contrast)
    const G = this.pipe?.grade;
    if (G) {
      const l = G.looks[this.pipe.lookId] || G.looks.golden, o = G.looks.overcast, kk = k * w;
      G.saturation.value = lerp(l.saturation, o.saturation * 0.88, kk);
      G.contrast.value = lerp(l.contrast, o.contrast, kk);
      // white balance: under a full deck the light is the cloud's, near neutral grey; Firmament's horizon still carries
      // the low sun's warmth (golden hour): neutralise most of its tint (the photos of rainy / snowy Uccle are cool grey)
      const hz = L.uFogColor?.value, lum = hz ? 0.2126 * hz.x + 0.7152 * hz.y + 0.0722 * hz.z : 0;
      const inv = (c) => (hz && c > 1e-4 ? THREE.MathUtils.clamp(lum / c, 0.75, 1.3) : 1);
      const nb = hz ? [inv(hz.x), inv(hz.y), inv(hz.z) * 1.03] : [1, 1, 1];
      G.balance.value.set(lerp(l.balance[0], o.balance[0] * lerp(1, nb[0], 0.75), kk), lerp(l.balance[1], o.balance[1] * lerp(1, nb[1], 0.75), kk), lerp(l.balance[2], o.balance[2] * lerp(1, nb[2], 0.75), kk));
    }
    if (F) {
      F.uBeta.value = W.fogBeta * w;
      F.uMist.value = (this.mist ?? 0) * w;
      F.uGrey.value = Math.min(0.95, c * c * 0.8 + 0.3 * wetAir) * w;
    }
    // URBAN SKY GLOW (the lab, round 2: night photos of Uccle in snow): the cloud deck glows from the street lights and
    // lights the snow everywhere; the hemisphere light (a fixed light, intensity only), x night x cloud x snow
    if (L.hemi) {
      const glow = this.night() * (0.25 + 0.75 * c) * (1 + 1.5 * wx.uSnowCover.value) * 0.25 * w;
      if (glow > 0.001) { L.hemi.color.setRGB(1.0, 0.72, 0.48); L.hemi.groundColor.setRGB(0.5, 0.42, 0.36); }
      L.hemi.intensity = lerp(s.hemi, glow, w);
    }
  },

  /** Mark what the bake sees (solid / canopy / road), then bake round the camera (async; the frame goes on). */
  async bake(camPos, cam) {
    this.baking = true; this.wantBake = false;
    try {
      const t0 = performance.now();
      const n = this.mark();
      const t1 = performance.now();
      const gy = this.world?.tiles?.length ? this.world.surface(camPos.x, camPos.z) : camPos.y - 2;
      // a little ahead of the camera's look: walking / driving forward reaches the window's edge later
      const d = cam.getWorldDirection(this._d ??= new THREE.Vector3()).setY(0);
      if (d.lengthSq() > 1e-6) d.normalize().multiplyScalar(MAP_SIZE * 0.12);
      await map.bake(this.scene, { x: camPos.x + d.x, y: gy, z: camPos.z + d.z });
      this.layer.follow();
      this.findCrowns();
      this.bakedAt = performance.now();
      Object.assign(this.stats, { bakes: this.stats.bakes + 1, bakeMs: map.bakeMs, gpuMs: map.gpuMs, shapeMs: map.shapeMs, markMs: t1 - t0, solid: n });
    } catch (e) { this.log?.(`weather: overhead bake failed: ${e.message}`); }
    this.baking = false;
  },
  /** solid = every visible opaque mesh (its own instancing / batching only: a custom positionNode is not seen by the
   *  bake's override material), canopy = tree crowns, road = the carriageway material (salted in winter) */
  mark() {
    let n = 0;
    this.scene.traverseVisible((o) => {
      if (!o.isMesh || o.userData.wxSkip) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m) return;
      // crowns: their cards' wind / morph (positionNode) is not in the bake, the instanced crown volume is: shelter only
      if (m.userData?.wxCanopy || o.userData?.wxCanopy) { o.layers.enable(CANOPY_LAYER); o.layers.disable(SOLID_LAYER); return; }
      if (m.positionNode) { o.layers.disable(SOLID_LAYER); return; }
      if (m.transparent && !m.userData?.wxRoad) { o.layers.disable(SOLID_LAYER); return; }
      o.layers.enable(SOLID_LAYER); n++;
      if (m.userData?.wxRoad) o.layers.enable(ROAD_LAYER);
    });
    return n;
  },
  /** autumn leaves fall from the crowns the bake found (the 8 most sheltered 8 x 8 m blocks) */
  findCrowns() {
    const N = map.res, B = 64, nb = N / B, sums = [];
    for (let bj = 0; bj < nb; bj++) for (let bi = 0; bi < nb; bi++) {
      let s = 0, sx = 0, sz = 0, hy = 0;
      for (let j = bj * B; j < (bj + 1) * B; j += 4) for (let i = bi * B; i < (bi + 1) * B; i += 4) {
        const v = map.shelter[j * N + i]; if (v > 0.3) { s += v; sx += i * v; sz += j * v; hy += map.H[j * N + i] * v; }
      }
      if (s > 4) sums.push({ s, x: map.uOrigin.value.x + (sx / s + 0.5) * map.cell, z: map.uOrigin.value.y + (sz / s + 0.5) * map.cell, y: hy / s + 7, r: 3.5 });
    }
    sums.sort((a, b) => b.s - a.s);
    this.crowns = sums.length ? sums.slice(0, 8) : null;
    if (this.crowns) this.leaves.setTrees(this.crowns);
  },

  /** the dev panel's Weather folder (viewer/devPanel.js) */
  panel(f, setParam) {
    if (!WX_ON || !this.weather) return;
    const W = this.weather, S = { preset: this.preset, live: this.live };
    const refresh = () => f.ctrls.forEach((c) => c.updateDisplay());
    const custom = () => { if (this.preset === "clear") { this.preset = "custom"; this.wantBake = true; } };
    f.add(S, "preset", CITY_PRESETS).name("weather").onChange((v) => { this.setPreset(v); setParam?.("wx", v === "clear" ? null : v.replace(/ /g, "_")); refresh(); });
    f.add(W, "timeScale", 1, 600, 1).name("time x (sim s / s)");
    f.add(S, "live").name("live weather (Uccle, Open-Meteo)").onChange((v) => { if (v) { this.goLive().then(refresh); setParam?.("wx", "live"); } else this.setPreset("clear"); });
    f.add(this, "liveInfo").name("live").listen();
    f.add(W.input, "rain", 0, 25, 0.1).name("rain (mm/h)").onChange(custom).listen();
    f.add(W.input, "snow", 0, 6, 0.05).name("snowfall (cm/h)").onChange(custom).listen();
    f.add(W.input, "temp", -10, 25, 0.1).name("temperature (C)").onChange(custom).listen();
    f.add(W.input, "wind", 0, 15, 0.1).name("wind (m/s)").onChange(custom).listen();
    f.add(W.input, "cloud", 0, 1, 0.01).name("cloud cover").onChange(custom).listen();
    f.add(W.input, "vis", 100, 40000, 50).name("visibility (m)").onChange(custom).listen();
    f.add(W.state, "wet", 0, 1, 0.01).name("wet film").onChange(custom).listen();
    f.add(W.state, "puddle", 0, 1, 0.01).name("puddles").onChange(custom).listen();
    f.add(W.state, "depth", 0, 0.35, 0.005).name("snow depth (m)").onChange(custom).listen();
    f.add(W.state, "slush", 0, 1, 0.01).name("slush").onChange(custom).listen();
    f.add(wx.uSalt, "value", 0, 1, 0.01).name("roads salted");
    f.add(wxLook.uDarken, "value", 0, 0.9, 0.01).name("wet darkening");
    f.add(wxLook.uSparkle, "value", 0, 2, 0.01).name("snow sparkle");
  },
};
