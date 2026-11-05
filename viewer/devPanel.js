// THE DEV PANEL: every control that matters, in collapsible folders (viewer/panelUI.js: our own UI, no library: the owner's rule), top right.
//   Modes & camera · Time & sun · Trams · Sky & clouds · Weather · Lighting & post · World · Performance · Debug
// LIVE where the engine allows it (and mirrored into the address bar, so a reload or a copied URL keeps it);
// settings that need a rebuild say "(reload)" and are applied together by "↻ reload with these".
// "Copy link to this view" encodes the panel's state, the mode and the camera into ?dev= so a view can be shared;
// opening such a link restores it. H hides all the UI (photo mode). ?panel=0: the old HUD only.
import { Panel as GUI } from "./panelUI.js";
import { uLampPower } from "./lampLight.js";
import { addSmoothnessFolder } from "./smoothPanel.js";

const TIMES = ["golden", "midday", "overcast", "twilight", "night", "misty"];
const CHARS = ["hoodie", "casual", "capsule"];
const FACETED = ["hatch_s", "hatch_c", "estate", "saloon", "suv", "van_c", "van_p", "taxi"];   // models/cars/faceted.glb

export function createDevPanel(ctx) {
  const { renderer, scene, camera, controls, lighting, pipe, layers, contourOn, setView, walk, fly, drive, thirdPerson, driver, getThird, getTram, tsel, dev, gpuStats, resetGpu, params, log } = ctx;
  const sky = lighting.sky, SP = sky?.params;
  document.body.classList.add("devpanel");
  const gui = new GUI({ title: "Uccle 3D · dev panel" });
  const refresh = () => gui.controllersRecursive().forEach((c) => c.updateDisplay());
  /** Mirror a live setting into the address bar (no reload): null / the default removes it. */
  const setParam = (k, v, def = null) => {
    const q = new URLSearchParams(location.search);
    if (v == null || v === def) q.delete(k); else q.set(k, v);
    history.replaceState(null, "", `${location.pathname}?${q}`);
  };

  // ---------------------------------------------------------------- state (what the share link carries)
  const S = {
    preset: tsel.value, hour: lighting.hour, day: lighting.day, timeSpeed: 0,
    coverage: lighting.firm?.coverage ?? 0.4, cloudType: lighting.firm?.cloudType ?? 0.5,
    cirrus: SP?.cirrus ?? 0.5, windSpeed: SP?.windSpeed ?? 12, windDeg: SP?.windDeg ?? 70, cloudBase: SP?.cloudBase ?? 4000,
    haze: SP?.haze ?? 1.6, aerosols: SP?.aerosols ?? 1, sunSize: SP?.sunSizeDeg ?? 0.6,
    autoExposure: SP?.autoExposure ?? true, ev: 0, nightEV: SP?.nightEV ?? 1.6,
    vfog: !!lighting.vfogOn, fogDensity: lighting.vfogParams?.density ?? 0.014, fogTop: lighting.vfogParams?.top ?? 82, fogFalloff: lighting.vfogParams?.falloff ?? 18,
    lampPower: uLampPower.value, ao: pipe?.uniforms.ao.value ?? 0.6, ssr: pipe?.uniforms.ssr.value ?? 1, bloom: pipe?.bloomPass?.strength.value ?? 0.24,
    skyHaze: dev.haze, shadows: lighting.sun.castShadow, fov: camera.fov,
    car: params.get("car") || "faceted:hatch_c", char: params.get("char") || "hoodie", parked: true,
  };
  const mode = () => (getThird()?.on ? "third" : driver?.on ? "drive" : ctx.flyer?.on ? "fly" : ctx.walker?.on ? "walk" : "orbit");

  // ---------------------------------------------------------------- Modes & camera
  const fC = gui.addFolder("Modes & camera");
  const MODES = {
    overview: () => setView("overview"), "Saint-Job close-up": () => setView("stjob"), "walk (first person)": () => walk(),
    "fly the falcon": () => fly(), "drive": () => drive(), "third person": () => thirdPerson(),
  };
  const viewParam = { overview: null, "Saint-Job close-up": "stjob", "walk (first person)": "walk", "fly the falcon": "fly", drive: "drive", "third person": "third" };
  for (const [name, go] of Object.entries(MODES)) fC.add({ f: () => { go(); setParam("view", viewParam[name]); } }, "f").name(`▶ ${name}`);
  const cars = ["scripted", ...FACETED.map((id) => `faceted:${id}`)];
  if (!cars.includes(S.car)) cars.push(S.car);
  fC.add(S, "car", cars).name("car (drive)").onChange(async (v) => {
    setParam("car", v, "faceted:hatch_c");
    try { await driver.setCar(v); log(`drive: car ${v}`); } catch (e) { log(`drive: car ${v} failed (${e.message})`); }
  });
  fC.add({ on: /[?&]drivedebug=1/.test(location.search) }, "on").name("car colliders (G)").onChange((v) => { driver.debug.visible = v; driver.debugWanted = v; setParam("drivedebug", v ? "1" : null); });
  fC.add(S, "char", CHARS).name("character (3rd person)").onChange(async (v) => {
    setParam("char", v, "hoodie");
    const t = getThird();
    if (!t) { log("third person: the character applies when the mode starts"); return; }
    try { await t.tp.useCharacter(v, renderer); t.character = v; log(`third person: ${v}`); } catch (e) { log(`third person: ${v} failed (${e.message})`); }
  });
  fC.add({ on: /[?&]chardebug=1/.test(location.search) }, "on").name("character colliders (G)").onChange((v) => {
    setParam("chardebug", v ? "1" : null);
    const t = getThird(); if (t) t.tp.debug.visible = v;
  });
  fC.add({ on: true }, "on").name("foot IK").onChange((v) => { const t = getThird(); if (t) t.tp.body.ikOn = v; });
  fC.add(S, "fov", 25, 90, 1).name("field of view").onChange((v) => { camera.fov = v; camera.updateProjectionMatrix(); });
  fC.add({ f: () => photo(true) }, "f").name("photo mode (H to leave)");
  const MS = { now: "" };
  fC.add(MS, "now").name("mode now").listen();

  // ---------------------------------------------------------------- Time & sun
  const fT = gui.addFolder("Time & sun");
  fT.add(S, "preset", TIMES).name("preset").onChange((v) => {
    tsel.value = v; tsel.onchange();
    lighting.hourOverride = null; S.hour = lighting.hour; S.coverage = lighting.firm.coverage; S.cloudType = lighting.firm.cloudType; S.vfog = !!lighting.vfogOn;
    setParam("time", v, "golden"); setParam("hour", null);
    refresh();
  });
  fT.add(S, "hour", 0, 24, 0.01).name("solar time (h)").onChange((v) => { lighting.hourOverride = v; setParam("hour", v.toFixed(2)); }).listen();
  fT.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; setParam("day", v, 200); });
  fT.add(S, "timeSpeed", 0, 2000, 1).name("sun speed (x real)");
  fT.add({ f: () => { lighting.hourOverride = null; S.hour = lighting.hour; setParam("hour", null); refresh(); } }, "f").name("back to the preset's time");
  fT.close();

  // ---------------------------------------------------------------- Trams (line 92 on STIB's timetable)
  const fTr = gui.addFolder("Trams");
  const TR = { clock: 12, speed: 1, on: params.get("trams") !== "0", model: params.get("tram") !== "box", info: "" };
  fTr.add(TR, "clock", 0, 23.99, 1 / 60).name("timetable clock (h)").onChange((v) => {
    const t = getTram(); if (!t) return;
    t.setClock(v * 3600);
    const hh = Math.floor(v), mm = Math.round((v - hh) * 60);
    setParam("clock", `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }).listen();
  fTr.add(TR, "speed", 0, 60, 0.5).name("timetable speed (x real)").onChange((v) => { getTram()?.setTimescale(v); setParam("timescale", v, 1); });
  fTr.add({ f: () => { const t = getTram(); if (!t) return; t.setClock(null); t.setTimescale(1); TR.speed = 1; setParam("clock", null); setParam("timescale", null); refresh(); } }, "f").name("back to now, real speed");
  fTr.add(TR, "info").name("running").listen();
  fTr.close();

  // ---------------------------------------------------------------- Sky & clouds (Firmament)
  if (SP) {
    const fS = gui.addFolder("Sky & clouds");
    fS.add(S, "coverage", 0, 1, 0.01).name("cloud cover").onChange((v) => { lighting.firm.coverage = v; });
    fS.add(S, "cloudType", 0, 1, 0.01).name("type: stratus ↔ cumulus ↔ storm").onChange((v) => { lighting.firm.cloudType = v; });
    fS.add(S, "cloudBase", 500, 8000, 50).name("cloud base (m)").onChange((v) => { SP.cloudBase = v; });
    fS.add(S, "cirrus", 0, 1.5, 0.01).onChange((v) => { SP.cirrus = v; });
    fS.add(S, "windSpeed", 0, 90, 0.5).name("wind at the clouds (m/s)").onChange((v) => { SP.windSpeed = v; });
    fS.add(S, "windDeg", 0, 360, 1).name("wind direction (°)").onChange((v) => { SP.windDeg = v; });
    fS.add(S, "haze", 0, 6, 0.05).name("air haze").onChange((v) => { SP.haze = v; });
    fS.add(S, "aerosols", 0, 45, 0.1).name("aerosols (whiter sky)").onChange((v) => { SP.aerosols = v; });
    fS.add(S, "sunSize", 0.3, 3, 0.01).name("sun disc (°)").onChange((v) => { SP.sunSizeDeg = v; });
    fS.add(S, "autoExposure").name("eye adaptation").onChange((v) => { SP.autoExposure = v; });
    fS.add(S, "ev", -3, 3, 0.1).name("exposure bias (EV)").onChange((v) => { if (pipe) pipe.evBias = v; });
    fS.add(S, "nightEV", 0, 4, 0.1).name("night exposure (EV)").onChange((v) => { SP.nightEV = v; });
    fS.close();
  }

  // ---------------------------------------------------------------- Weather
  const fW = gui.addFolder("Weather");
  // the fog keeps its own copy of the settings once created (vendor/volumetric-fog: P = { ...defaults, ...params }):
  // write both, or the sliders do nothing
  const fogSet = (k, v) => { lighting.vfogParams[k] = v; if (lighting.vfog?.params) lighting.vfog.params[k] = v; };
  fW.add(S, "vfog").name("volumetric valley fog").onChange((v) => { lighting.vfogOn = v; setParam("vfog", v ? "1" : null); });
  fW.add(S, "fogDensity", 0.001, 0.05, 0.001).name("fog density").onChange((v) => fogSet("density", v));
  fW.add(S, "fogTop", 40, 160, 1).name("fog layer top (m TAW)").onChange((v) => fogSet("top", v));
  fW.add(S, "fogFalloff", 2, 60, 1).name("fog falloff (m)").onChange((v) => fogSet("falloff", v));
  fW.close();

  // ---------------------------------------------------------------- Lighting & post
  const fL = gui.addFolder("Lighting & post");
  fL.add(S, "lampPower", 0, 5, 0.05).name("street lamp pools").onChange((v) => { uLampPower.value = v; });
  fL.add(S, "skyHaze").name("sky haze + sun shafts").onChange((v) => { dev.haze = v; setParam("haze", v ? null : "0"); });
  if (pipe) {
    fL.add(S, "ao", 0, 1, 0.01).name("ambient occlusion").onChange((v) => { pipe.uniforms.ao.value = v; });
    fL.add(S, "ssr", 0, 2, 0.01).name("reflections (SSR)").onChange((v) => { pipe.uniforms.ssr.value = v; });
    fL.add(S, "bloom", 0, 1.5, 0.01).name("bloom").onChange((v) => { pipe.bloomPass.strength.value = v; });
  }
  fL.add(S, "shadows").name("sun shadows (recompiles)").onChange((v) => { lighting.sun.castShadow = v; });
  fL.close();

  // ---------------------------------------------------------------- World (live + reload)
  const fWo = gui.addFolder("World");
  for (const k of Object.keys(layers)) fWo.add(layers[k], "visible").name(`layer: ${k}`);
  fWo.add({ c: false }, "c").name("contour lines (1 m)").onChange((v) => { contourOn.value = v ? 1 : 0; });
  fWo.add(S, "parked").name("parked cars").onChange((v) => scene.traverse((o) => { if ((o.name === "parked-cars" || o.name === "parked-cars-fleet") && o.isGroup) o.visible = v; }));   // box cars (?cars=box) or the faceted fleet (carFleet.js)
  const R = {
    roads: params.get("roads") === "engine" ? "engine" : "measured (surface)", stjob: params.get("stjob") !== "0", lamps: params.get("lampmodel") !== "0",
    trams: TR.on, tramModel: TR.model ? "model (T3000)" : "boxes", trees: params.get("trees") || "stylized", impostors: params.get("impostors") === "1",
    ring: +(params.get("ring") ?? 1), far: +(params.get("far") ?? 3), fx: params.get("fx") !== "0", gpu: params.get("gpu") !== "0", sunlight: params.get("sunlight") === "1",
  };
  fWo.add(R, "roads", ["measured (surface)", "engine"]).name("roads (reload)");
  fWo.add(R, "stjob").name("Saint-Job model (reload)");
  fWo.add(R, "lamps").name("Blender lamps (reload)");
  fWo.add(R, "trams").name("trams (reload)");
  fWo.add(R, "tramModel", ["model (T3000)", "boxes"]).name("tram look (reload)");
  fWo.add(R, "trees", ["stylized", "slop", "simple"]).name("trees (reload)");
  fWo.add(R, "impostors").name("tree impostors (reload)");
  fWo.add(R, "ring", 0, 2, 1).name("full-detail ring (reload)");
  fWo.add(R, "far", 0, 6, 1).name("far LOD ring (reload)");
  fWo.add(R, "fx").name("post effects (reload)");
  fWo.add(R, "sunlight").name("cascaded sun (reload)");
  fWo.add(R, "gpu").name("GPU timing (reload)");
  fWo.add({ f: () => {
    const q = new URLSearchParams(location.search);
    const put = (k, on, v) => (on ? q.set(k, v) : q.delete(k));
    put("roads", R.roads === "engine", "engine"); put("stjob", !R.stjob, "0"); put("lampmodel", !R.lamps, "0");
    put("trams", !R.trams, "0"); put("tram", R.tramModel === "boxes", "box"); put("trees", R.trees !== "stylized", R.trees);
    put("impostors", R.impostors, "1"); q.set("ring", R.ring); q.set("far", R.far); put("fx", !R.fx, "0"); put("sunlight", R.sunlight, "1"); put("gpu", !R.gpu, "0");
    const m = mode(); put("view", m !== "orbit", m);
    location.search = q.toString();
  } }, "f").name("↻ reload with these");
  fWo.close();

  // ---------------------------------------------------------------- Smoothness (viewer/smoothPanel.js)
  addSmoothnessFolder(gui, ctx);

  // ---------------------------------------------------------------- Performance
  const fP = gui.addFolder("Performance");
  const M = { stats: "", fps: "", gpu: "", draws: "", tris: "", mem: "", shaders: "", char: "", bench: "" };
  fP.add(M, "stats").name("stats").listen();
  for (const k of ["fps", "gpu", "draws", "tris", "mem", "shaders", "char"]) fP.add(M, k).name({ fps: "fps", gpu: "GPU ms (p50 / p95)", draws: "draw calls", tris: "triangles", mem: "GPU memory", shaders: "shader programs", char: "character / car CPU" }[k]).listen();
  fP.add({ f: () => benchmark() }, "f").name("▶ benchmark (3 views, ~20 s)");
  fP.add(M, "bench").name("last benchmark").listen();
  let frames = 0, t0 = performance.now(), last = performance.now(), wasDriving = false;
  const tick = () => {
    frames++;
    if (driver?.on && !wasDriving && driver.debugWanted != null) driver.debug.visible = driver.debugWanted;   // the toggle survives a restart
    wasDriving = !!driver?.on;
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    // the sun moves every frame (it used to step every half second: visible jumps at high speeds)
    if (S.timeSpeed) { S.hour = (lighting.hour + S.timeSpeed * dt / 3600) % 24; lighting.hourOverride = S.hour; }
    if (now - t0 > 500) {
      M.fps = (frames / ((now - t0) / 1000)).toFixed(0); frames = 0; t0 = now;
      const g = gpuStats(), r = renderer.info.render, mem = renderer.info.memory;
      M.gpu = g.p50 != null ? `${g.p50} / ${g.p95}` : renderer.backend.trackTimestamp ? "…" : "off (?gpu=0)";
      M.draws = String(r.drawCalls ?? r.calls); M.tris = `${(r.triangles / 1e6).toFixed(2)} M`;
      M.mem = `${(mem.total / 1e6).toFixed(0)} MB`; M.shaders = String(mem.programs);
      M.stats = (document.getElementById("stats")?.textContent || "").split("\n").slice(0, 2).join(" · ");
      const t = getThird();
      M.char = t?.on ? `character ${t.tp.perf.ms.toFixed(3)} ms` : driver?.on ? `car ${driver.ms.toFixed(3)} ms` : "—";
      const tr = getTram();
      if (tr) { const T = tr.clockSecs; TR.clock = T / 3600; TR.info = tr.info().split(". ")[0].replace(/^tram \d+ \([^)]*\): /, ""); }
      MS.now = mode();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  async function benchmark() {
    const out = [], sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const [name, go] of [["overview", () => setView("overview")], ["close-up", () => setView("stjob")], ["walk", () => walk()]]) {
      go(); await sleep(2500); resetGpu(); await sleep(3500);
      const g = gpuStats(); out.push(`${name} ${g.p50}/${g.p95}`);
    }
    M.bench = out.join(" · ");
    log(`benchmark GPU ms p50/p95: ${M.bench}`);
  }
  fP.close();

  // ---------------------------------------------------------------- Debug
  const fD = gui.addFolder("Debug");
  const D = { wireframe: false, log: !!document.getElementById("logBox")?.open, hud: true };
  fD.add(D, "wireframe").onChange((v) => scene.traverse((o) => { for (const m of [].concat(o.material || [])) { m.wireframe = v; m.needsUpdate = true; } }));
  fD.add(D, "log").name("dev log").onChange((v) => { const b = document.getElementById("logBox"); if (b) b.open = v; setParam("log", v ? null : "0"); });
  fD.add(D, "hud").name("old HUD (stats)").onChange((v) => { document.getElementById("hud").style.display = v ? "" : "none"; });
  fD.add({ f: () => share() }, "f").name("🔗 copy link to this view");
  fD.close();

  // ---------------------------------------------------------------- photo mode, share link
  function photo(on) {
    document.getElementById("hud").style.display = on ? "none" : (D.hud ? "" : "none");
    gui.domElement.style.display = on ? "none" : "";
  }
  addEventListener("keydown", (e) => { if (e.code === "KeyH" && !e.repeat && document.activeElement?.tagName !== "INPUT") photo(gui.domElement.style.display !== "none"); });
  function share() {
    const st = { ...S, mode: mode(), cam: camera.position.toArray().map((n) => +n.toFixed(2)), tgt: controls.target.toArray().map((n) => +n.toFixed(2)) };
    const q = new URLSearchParams(location.search);
    q.set("dev", btoa(JSON.stringify(st)));
    const url = `${location.origin}${location.pathname}?${q}`;
    navigator.clipboard?.writeText(url).then(() => log("dev panel: link copied"), () => log(url));
    history.replaceState(null, "", url);
  }
  // restore a shared view (the mode's own state: car, character come from the URL / S)
  const enc = params.get("dev");
  if (enc) {
    try {
      const st = JSON.parse(atob(enc));
      const skip = new Set(["preset", "car", "char", "parked"]);
      for (const c of gui.controllersRecursive()) if (c.object === S && c.property in st && !skip.has(c.property)) { c.setValue(st[c.property]); }
      if (st.preset && st.preset !== S.preset) gui.controllersRecursive().find((c) => c.property === "preset")?.setValue(st.preset);
      if (st.hour != null) { lighting.hourOverride = st.hour; S.hour = st.hour; }
      if (st.cam && st.tgt && (!st.mode || st.mode === "orbit")) { setView("stjob"); camera.position.fromArray(st.cam); controls.target.fromArray(st.tgt); controls.update(); }
      else if (st.mode === "drive") drive(); else if (st.mode === "third") thirdPerson(); else if (st.mode === "fly") fly(); else if (st.mode === "walk") walk();
      refresh();
    } catch (e) { log(`dev link: ${e.message}`); }
  }
  window.__devPanel = { gui, S, R, TR, M, pipe, mode };
  return gui;
}
