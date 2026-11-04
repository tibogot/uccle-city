// THE DEV PANEL: every control that matters, in collapsible folders (viewer/panelUI.js: our own UI, no library: the owner's rule), top right.
//   Time & sun · Sky & clouds · Weather · Lighting & post · World · Camera & modes · Performance · Debug
// Live where the engine allows it; settings that need a rebuild (tile ring, tree mode...) reload the page with
// the new URL. "Copy link to this view" encodes the panel's state + the camera into ?dev= so a view can be shared;
// opening such a link restores it. H hides all the UI (photo mode). ?panel=0: the old HUD only.
import * as THREE from "three/webgpu";
import { Panel as GUI } from "./panelUI.js";
import { uLampPower } from "./lampLight.js";

const TIMES = ["golden", "midday", "overcast", "twilight", "night", "misty"];

export function createDevPanel(ctx) {
  const { renderer, scene, camera, controls, lighting, pipe, world, layers, contourOn, setView, walk, fly, flyer, walker, tsel, dev, gpuStats, resetGpu, params, log } = ctx;
  const sky = lighting.sky, SP = sky?.params;
  document.body.classList.add("devpanel");
  const gui = new GUI({ title: "Uccle 3D · dev panel" });
  const refresh = () => gui.controllersRecursive().forEach((c) => c.updateDisplay());

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
  };

  // ---------------------------------------------------------------- Time & sun
  const fT = gui.addFolder("Time & sun");
  fT.add(S, "preset", TIMES).name("preset").onChange((v) => {
    tsel.value = v; tsel.onchange();
    lighting.hourOverride = null; S.hour = lighting.hour; S.coverage = lighting.firm.coverage; S.cloudType = lighting.firm.cloudType; S.vfog = !!lighting.vfogOn;
    refresh();
  });
  fT.add(S, "hour", 0, 24, 0.01).name("solar time (h)").onChange((v) => { lighting.hourOverride = v; }).listen();
  fT.add(S, "day", 1, 365, 1).name("day of year").onChange((v) => { lighting.day = v; });
  fT.add(S, "timeSpeed", 0, 2000, 1).name("time speed (x real)");
  fT.add({ f: () => { lighting.hourOverride = null; S.hour = lighting.hour; refresh(); } }, "f").name("back to the preset's time");

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
  fW.add(S, "vfog").name("volumetric valley fog").onChange((v) => { lighting.vfogOn = v; });
  fW.add(S, "fogDensity", 0.001, 0.05, 0.001).name("fog density").onChange((v) => { lighting.vfogParams.density = v; });
  fW.add(S, "fogTop", 40, 160, 1).name("fog layer top (m TAW)").onChange((v) => { lighting.vfogParams.top = v; });
  fW.add(S, "fogFalloff", 2, 60, 1).name("fog falloff (m)").onChange((v) => { lighting.vfogParams.falloff = v; });
  fW.add({ note: "rain / wet roads, snow: planned" }, "note").name("next").disable();
  fW.close();

  // ---------------------------------------------------------------- Lighting & post
  const fL = gui.addFolder("Lighting & post");
  fL.add(S, "lampPower", 0, 5, 0.05).name("street lamp pools").onChange((v) => { uLampPower.value = v; });
  fL.add(S, "skyHaze").name("sky haze + sun shafts").onChange((v) => { dev.haze = v; });
  if (pipe) {
    fL.add(S, "ao", 0, 1, 0.01).name("ambient occlusion").onChange((v) => { pipe.uniforms.ao.value = v; });
    fL.add(S, "ssr", 0, 2, 0.01).name("reflections (SSR)").onChange((v) => { pipe.uniforms.ssr.value = v; });
    fL.add(S, "bloom", 0, 1.5, 0.01).name("bloom").onChange((v) => { pipe.bloomPass.strength.value = v; });
  }
  fL.add(S, "shadows").name("sun shadows (recompiles)").onChange((v) => { lighting.sun.castShadow = v; });
  fL.close();

  // ---------------------------------------------------------------- World
  const fWo = gui.addFolder("World");
  for (const k of Object.keys(layers)) fWo.add(layers[k], "visible").name(`layer: ${k}`);
  fWo.add({ c: false }, "c").name("contour lines (1 m)").onChange((v) => { contourOn.value = v ? 1 : 0; });
  const R = { ring: +(params.get("ring") ?? 1), far: +(params.get("far") ?? 3), trees: params.get("trees") || "stylized", impostors: params.get("impostors") === "1", lamps: params.get("lampmodel") !== "0" };
  fWo.add(R, "ring", 0, 2, 1).name("full-detail ring (reload)");
  fWo.add(R, "far", 0, 6, 1).name("far LOD ring (reload)");
  fWo.add(R, "trees", ["stylized", "slop", "simple"]).name("trees (reload)");
  fWo.add(R, "impostors").name("tree impostors (reload)");
  fWo.add(R, "lamps").name("Blender lamps (reload)");
  fWo.add({ f: () => {
    const q = new URLSearchParams(location.search);
    q.set("ring", R.ring); q.set("far", R.far);
    R.trees === "stylized" ? q.delete("trees") : q.set("trees", R.trees);
    R.impostors ? q.set("impostors", "1") : q.delete("impostors");
    R.lamps ? q.delete("lampmodel") : q.set("lampmodel", "0");
    location.search = q.toString();
  } }, "f").name("↻ reload with these");
  fWo.close();

  // ---------------------------------------------------------------- Camera & modes
  const fC = gui.addFolder("Camera & modes");
  fC.add({ f: () => setView("overview") }, "f").name("overview");
  fC.add({ f: () => setView("stjob") }, "f").name("Saint-Job close-up");
  fC.add({ f: () => walk() }, "f").name("walk (WASD)");
  fC.add({ f: () => fly() }, "f").name("fly the falcon (from the spire)");
  fC.add(S, "fov", 25, 90, 1).name("field of view").onChange((v) => { camera.fov = v; camera.updateProjectionMatrix(); });
  fC.add({ f: () => photo(true) }, "f").name("photo mode (H to leave)");
  fC.close();

  // ---------------------------------------------------------------- Performance
  const fP = gui.addFolder("Performance");
  const M = { fps: "", gpu: "", draws: "", tris: "", mem: "", shaders: "", bench: "" };
  for (const k of ["fps", "gpu", "draws", "tris", "mem", "shaders"]) fP.add(M, k).name({ fps: "fps", gpu: "GPU ms (p50 / p95)", draws: "draw calls", tris: "triangles", mem: "GPU memory", shaders: "shader programs" }[k]).listen().disable();
  fP.add({ f: () => benchmark() }, "f").name("▶ benchmark (3 views, ~20 s)");
  fP.add(M, "bench").name("last benchmark").listen().disable();
  let frames = 0, t0 = performance.now();
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - t0 > 500) {
      M.fps = (frames / ((now - t0) / 1000)).toFixed(0); frames = 0; t0 = now;
      const g = gpuStats(), r = renderer.info.render, mem = renderer.info.memory;
      M.gpu = g.p50 != null ? `${g.p50} / ${g.p95}` : "n/a";
      M.draws = String(r.drawCalls ?? r.calls); M.tris = `${(r.triangles / 1e6).toFixed(2)} M`;
      M.mem = `${(mem.total / 1e6).toFixed(0)} MB`; M.shaders = String(mem.programs);
      if (S.timeSpeed) { S.hour = (lighting.hour + S.timeSpeed * 0.5 / 3600) % 24; lighting.hourOverride = S.hour; }
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
  const D = { wireframe: false, log: true, hud: true };
  fD.add(D, "wireframe").onChange((v) => scene.traverse((o) => { for (const m of [].concat(o.material || [])) m.wireframe = v; }));
  fD.add(D, "log").name("dev log").onChange((v) => { const b = document.getElementById("logBox"); if (b) b.open = v; });
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
    const st = { ...S, cam: camera.position.toArray().map((n) => +n.toFixed(2)), tgt: controls.target.toArray().map((n) => +n.toFixed(2)) };
    const q = new URLSearchParams(location.search);
    q.set("dev", btoa(JSON.stringify(st)));
    const url = `${location.origin}${location.pathname}?${q}`;
    navigator.clipboard?.writeText(url).then(() => log("dev panel: link copied"), () => log(url));
    history.replaceState(null, "", url);
  }
  // restore a shared view
  const enc = params.get("dev");
  if (enc) {
    try {
      const st = JSON.parse(atob(enc));
      for (const c of gui.controllersRecursive()) if (c.object === S && c.property in st && c.property !== "preset") { c.setValue(st[c.property]); }
      if (st.preset && st.preset !== S.preset) gui.controllersRecursive().find((c) => c.property === "preset")?.setValue(st.preset);
      if (st.hour != null) { lighting.hourOverride = st.hour; S.hour = st.hour; }
      if (st.cam && st.tgt) { setView("stjob"); camera.position.fromArray(st.cam); controls.target.fromArray(st.tgt); controls.update(); }
      refresh();
    } catch (e) { log(`dev link: ${e.message}`); }
  }
  return gui;
}
