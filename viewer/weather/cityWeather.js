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
import { WX_ON, setWeatherMap, setWeatherTrails } from "./cityWeatherize.js";
import { createOverheadMap, SOLID_LAYER, CANOPY_LAYER, ROAD_LAYER, CAR_LAYER } from "./overheadMap.js";
import { createPrecipitation } from "./precipitation.js";
import { createSnowLayer } from "./snowLayer.js";
import { createSnowTrails, TRAILS_ON } from "./snowTrails.js";      // snowtracks: footprints / tyre tracks (?snowtracks=0)
import { createSnowMovers } from "./snowMovers.js";
import { createCityCaps } from "./cityCaps.js";                     // snow caps on cars / furniture / shelters / copings (?snowcaps=0)
import { wxLook } from "./surfaceWeather.js";
import { season, setDay } from "../seasons/season.js";
import { fetchLive, mapLive } from "./liveWeather.js";
import { env } from "../lighting.js";
import { season as foliageSeason } from "../foliage/seasons.js";   // hedges, garden plants, grass read its uSnow / uWet
import { polishOld } from "../polish.js";

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
// snowtracks: the camera-centred trail texture (same window as the map) the movers stamp into; the ground families
// read it too (compacted / darker where trodden), so it exists before any material is built
const trails = map && TRAILS_ON ? createSnowTrails({ size: MAP_SIZE }) : null;
if (trails) setWeatherTrails(trails);

const SNOW_WB = !polishOld("snowwb");
/** scene children that move (never baked as ground): trams, trains, the traffic, the player's car, birds */
/** snow caps: the parked cars' batches (their tops cut the layer: the cap meshes carry the snow) */
const CAR_RE = /^parked-car-batch/;
const CAPS_CUT = new URLSearchParams(location.search).get("snowcaps") !== "0";
// joins2 (docs/JOINS2.md; ?snowfurn=old = solids as before): street furniture (benches, bins, bollards, sign poles, lamps,
// bus / tram shelters, the street kit) is baked as SHELTER, not as solid ground: as a solid its top became the layer's
// base, the cliff round it cut a hard, blotchy hole in the snow under a bench (a pale outline: the material cover) and a
// jagged cut round the shelters; now the snow runs on under them, thinner under the seat / roof, and the caps (snowCaps.js) stay on top
const FURN_RE = /^(furniture2|streetkit|stops|street-furniture|street-lamps|furniture2-|streetkit-|stops-|tram-poles$|tram-shelter)/;
const SNOW_FURN = new URLSearchParams(location.search).get("snowfurn") !== "old";
const MOVER_RE = /^(tram2?-|tram$|trains$|traffic-fleet$|car$|moto|player-falcon$|falcons$|pigeons$|air-streaks$)/;
const lerp = THREE.MathUtils.lerp, sstep = THREE.MathUtils.smoothstep;

export const cityWeather = {
  on: WX_ON, map, weather: WX_ON ? new Weather() : null,   // (here at load: the dev panel binds it before start()) preset: "clear", live: false, liveInfo: "-",
  stats: { bakes: 0, bakeMs: 0, gpuMs: 0, shapeMs: 0, markMs: 0, solid: 0 },
  /** main.js, after the pipeline is set up (before the warm-up): build everything, compile it once */
  async start({ scene, renderer, camera, lighting, updaters, world, pipe = null, log = console.log }) {
    if (!WX_ON) return;
    const t0 = performance.now();
    const weather = this.weather;
    weather.timeScale = 20;                      // simulated s per real s (the panel; the lab runs x60)
    window.__weather = weather;                  // the falcon's flight reads the wind (cityFlyer.js)
    map.setRenderer(renderer);
    const rain = createPrecipitation({ renderer, kind: "rain", map });
    const snow = createPrecipitation({ renderer, kind: "snow", map });
    const leaves = createPrecipitation({ renderer, kind: "leaves", map, trees: Array.from({ length: 8 }, () => ({ x: 0, z: 0, r: 4, y: -1e4 })) });
    trails?.setRenderer(renderer);
    const movers = trails ? createSnowMovers({ ground: world?.tiles ? (x, z) => world.surface(x, z) : null, getMovers: () => this.movers }) : null;
    const layer = createSnowLayer({ renderer, map, edgeFade: true, trail: trails });
    const group = new THREE.Group(); group.name = "weather";
    group.add(rain.mesh, rain.splashes, snow.mesh, leaves.mesh, layer.mesh);
    // snow caps: their own group (precompiled with the weather's draws: one dummy instance per family)
    const [{ cityFurniture }, { cityStops }, { cityGardens }] = await Promise.all([import("../furniture2/cityFurniture.js"), import("../stops/cityStops.js"), import("../gardens/cityGardens.js")]);
    const capGroup = new THREE.Group(); capGroup.name = "snow-caps";
    const caps = createCityCaps({ group: capGroup, getMovers: () => this.movers, kits: { furniture: () => cityFurniture, stops: () => cityStops, gardens: () => cityGardens } });
    if (caps) group.add(capGroup);
    group.traverse((o) => { o.userData.wxSkip = true; });
    scene.add(group);
    Object.assign(this, { scene, renderer, camera, lighting, world, pipe, rain, snow, leaves, layer, group, log, trails, snowMovers: movers, caps });
    // the start weather: ?wx=, else clear (the city as before)
    const want = (qp.get("wx") || "clear").replace(/_/g, " ");
    if (want === "live") this.goLive(); else this.setPreset(CITY_PRESETS.includes(want) || WEATHER_PRESETS[want] ? want : "clear", 0);
    this.last = performance.now();
    updaters.push((camPos, cam) => this.update(camPos, cam));
    // compile now (boot), not on the first rain: the compute passes and the draws, shown once in a hidden-count state
    for (const p of [rain, snow, leaves]) p.warm();
    layer.warm();
    trails?.warm();
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
    // the foliage family (hedges, garden plants, our grass) has its own snow / wet uniforms: the weather drives them
    foliageSeason.uSnow.value = wx.uSnowCover.value * Math.min(1, wx.uSnowDepth.value / 0.03);
    foliageSeason.uWet.value = wx.uWet.value;
    // ---- the snow layer
    this.layer.update(dt, this.stamps?.() ?? []);
    this.caps?.update(camPos, dt);          // snow caps (hidden without snow)
    // ---- snowtracks: the movers stamp the trail texture while there is snow; snowfall fills the grooves back
    if (this.trails) {
      const snowOn = wx.uSnowDepth.value > 0.003 && wx.uSnowCover.value > 0.05;
      const cmh = W.input.snow > 0 && W.input.temp <= 1 ? W.input.snow : 0;
      // packed amount decays as fresh snow covers the groove: ~4 cm of new snow fills a track (per real second)
      const refill = (cmh / 100 / 3600) * W.timeScale / 0.04;
      this.trails.update(camPos, dt, { snow: snowOn, refill, stamps: snowOn ? this.snowMovers.gather(camPos, dt) : [] });
    }
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
        if (this.pipe) { this.pipe.wxEV = 0; if (this.pipe.grade?.warmHighs) this.pipe.grade.warmHighs.value = 1; }
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
      // polish1 (docs/POLISH.md item 1, ?snowwb=old = before): with snow on the ground the eye takes the snow as the
      // white: the correction goes all the way (the fog colour = the cloud-lit ambient becomes neutral, a touch cool, as
      // the photos of Brussels in snow), with a wider clamp; without snow it is the 75 % of before
      const sn = SNOW_WB ? Math.min(1, wx.uSnowCover.value * Math.min(1, wx.uSnowDepth.value / 0.02)) : 0;
      const lo = lerp(0.75, 0.5, sn), hi = lerp(1.3, 2.3, sn), amt = lerp(0.75, 1.0, sn), cool = [lerp(1, 0.84, sn), 1, lerp(1.03, 1.02, sn)];
      // (the snow is lit by the sky dome + what is left of the key, warmer than the horizon colour itself: under snow the
      // correction is the horizon's inverse to the power 1.65, measured on the snow at golden hour, Place Saint-Job)
      const pw = lerp(1, 1.65, sn);
      const inv = (c) => (hz && c > 1e-4 ? THREE.MathUtils.clamp(Math.pow(lum / c, pw), lo, hi) : 1);
      const nb = hz ? [inv(hz.x) * cool[0], inv(hz.y), inv(hz.z) * cool[2]] : [1, 1, 1];
      G.balance.value.set(lerp(l.balance[0], o.balance[0] * lerp(1, nb[0], amt), kk), lerp(l.balance[1], o.balance[1] * lerp(1, nb[1], amt), kk), lerp(l.balance[2], o.balance[2] * lerp(1, nb[2], amt), kk));
      // under snow: no warm split-tone on the highlights (the snow is the highlight) and +0.45 EV (snow scenes are
      // metered up, as a photographer does: the snow reads white, not mid-grey)
      if (G.warmHighs) G.warmHighs.value = 1 - sn * kk;
      this.pipe.wxEV = 0.45 * sn * w;
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
    let n = 0, cars = 0;
    const furnOf = (o) => { for (let p = o, k = 0; p && k < 4; p = p.parent, k++) if (FURN_RE.test(p.name)) return true; return false; };
    const pools = new Set();
    // snowtracks / snow caps: MOVERS are not ground. Baked at the pose they had at the bake, the layer drew a snow slab
    // floating where the player's car, a tram or a traffic car had been (and a hole in the street under it) until the
    // next bake; their snow is the caps' job (snowCaps.js)
    const off = (o) => o.traverse((m) => { if (m.isMesh) { m.layers.disable(SOLID_LAYER); m.layers.disable(ROAD_LAYER); } });
    const M = this.movers, own = new Set([M?.driver?.car?.root, M?.driver?.moto?.root, M?.third?.()?.tp?.body?.root].filter(Boolean));
    for (const r of own) off(r);
    for (const top of this.scene.children) {
      if (MOVER_RE.test(top.name) || own.has(top)) { off(top); continue; }
      top.traverseVisible((o) => {
      if (!o.isMesh || o.userData.wxSkip) return;
      if (o.isSkinnedMesh) { o.layers.disable(SOLID_LAYER); return; }
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m) return;
      // crowns: their cards' wind / morph (positionNode) is not in the bake, the instanced crown volume is: shelter only
      if (SNOW_FURN && furnOf(o)) { o.layers.enable(CANOPY_LAYER); o.layers.disable(SOLID_LAYER); o.layers.disable(CAR_LAYER); return; }
      if (m.userData?.wxCanopy || o.userData?.wxCanopy) {
        // snow round 2: the city-wide tree POOL (perf pass 2, multiDraw.js: indirect draws, the instances' live ranges in
        // its parts) baked as ~98 % "under a crown" (every slot of the buffer drawn: the Heros lawn's blotchy snow);
        // its crowns go into the bake as proxies built from the live ranges instead (canopyProxy below)
        if (o.userData?.multiDraw) { pools.add(o.userData.multiDraw); o.layers.disable(CANOPY_LAYER); o.layers.disable(SOLID_LAYER); return; }
        o.layers.enable(CANOPY_LAYER); o.layers.disable(SOLID_LAYER); return;
      }
      if (m.positionNode) { o.layers.disable(SOLID_LAYER); return; }
      if (m.transparent && !m.userData?.wxRoad) { o.layers.disable(SOLID_LAYER); return; }
      o.layers.enable(SOLID_LAYER); n++;
      if (m.userData?.wxRoad) o.layers.enable(ROAD_LAYER);
      // snow caps: a parked car carries its own cap (snowCaps.js): the layer is cut on its top (overheadShape carPx)
      if (CAPS_CUT && CAR_RE.test(o.name)) { o.layers.enable(CAR_LAYER); cars++; } else o.layers.disable(CAR_LAYER);
      });
    }
    for (const r of own) off(r);
    map.carsMarked = cars > 0;
    this.canopyProxy(pools);
    return n;
  },
  /** crown proxies for the bake's canopy pass (snow round 2): one squashed sphere per live tree of the multi-draw tree
   *  pools within the map window, on CANOPY_LAYER only (never drawn by the city's cameras) */
  canopyProxy(pools) {
    if (!this._canopy) {
      const g = new THREE.SphereGeometry(1, 10, 6);
      const m = new THREE.MeshBasicNodeMaterial();
      const mesh = new THREE.InstancedMesh(g, m, 2048);
      mesh.layers.set(CANOPY_LAYER); mesh.frustumCulled = false; mesh.count = 0; mesh.name = "wx-canopy-proxy";
      mesh.userData.wxSkip = true;
      this.scene.add(mesh);
      this._canopy = mesh;
    }
    const P = this._canopy, M = P.instanceMatrix.array, c = map.centre, R = MAP_SIZE * 0.75;
    let n = 0;
    const seen = new Set();
    for (const set of pools) {
      const A = set.buf?.instanceMatrix?.array; if (!A) continue;
      for (const part of set.parts) for (let i = part.off; i < part.off + part.n && n < 2048; i++) {
        const o = i * 16, x = A[o + 12], y = A[o + 13], z = A[o + 14];
        if (Math.abs(x - c.x) > R || Math.abs(z - c.z) > R) continue;
        const key = Math.round(x * 10) * 100003 + Math.round(z * 10);
        if (seen.has(key)) continue; seen.add(key);
        const sx = Math.hypot(A[o], A[o + 2]), sy = A[o + 5], H = 11 * sy, r = 4.2 * sx;      // (a stylized tree ~11 m, its crown ~0.4 H wide)
        M.set([r, 0, 0, 0, 0, H * 0.3, 0, 0, 0, 0, r, 0, x, y + H * 0.62, z, 1], n * 16); n++;
      }
    }
    P.count = n; P.visible = n > 0;
    P.instanceMatrix.clearUpdateRanges(); P.instanceMatrix.addUpdateRange(0, Math.max(1, n) * 16); P.instanceMatrix.needsUpdate = true;
    if (n) P.layers.set(CANOPY_LAYER);
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
