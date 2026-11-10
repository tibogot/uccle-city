// FLAGS IN THE CITY (?flags=1, needs ?townhall=1 for now): the town hall's three balcony poles fly the EU, Belgian and
// Uccle flags (models/townhall/townhall.json flag_poles; the designs as on the photos). viewer/flags/ does the work:
//   - each flag is a BakedFlags set (its loop recorded in a worker in world space with the city wind, the wall
//     behind found by raycasts against the town hall's LOD0 so the cloth never enters the façade) and, within
//     LIVE_RADIUS, a LiveFlag (Verlet cloth) handed over both ways without a pop;
//   - shaders built through the page's precompile queue before the flags show (no shader build on a frame);
//   - shown only while the town hall is (its tile streamed in), hidden beyond HIDE_DIST (sub-pixel there anyway);
//   - the wind: speed / direction from ?wind=<m/s>,<deg towards> (default 5 m/s towards 70 deg, the dev panel's cloud
//     wind direction) + slow drifts; a wind change re-records the loops in the worker and cross-fades them.
import * as THREE from "three/webgpu";
import { BakedFlags, LiveFlag, wallPlanesFrom } from "./flags/flagField.js";
import { FABRIC } from "./flags/flagCloth.js";
import { flagTexture } from "./flags/flagDesigns.js";

const LIVE_RADIUS = 45, HIDE_DIST = 700, DESIGN = { south: "eu", centre: "belgium", north: "uccle" };

export async function addFlags({ scene, updaters, renderer, compiler, log, params }) {
  const t0 = performance.now();
  for (let i = 0; i < 240 && !window.townhall?.root; i++) await new Promise((r) => setTimeout(r, 250));
  const th = window.townhall;
  if (!th?.root) { log("flags: no town hall (?townhall=1) - nothing to fly them from"); return; }
  const notes = th.model.notes, poles = notes?.flag_poles ?? [];
  if (!poles.length) { log("flags: models/townhall/townhall.json has no flag_poles"); return; }
  const [ws, wd] = (params.get("wind") ?? "5,70").split(",").map(Number);
  const wind = { speed: Number.isFinite(ws) ? ws : 5, deg: Number.isFinite(wd) ? wd : 70 };
  const dirOf = (deg) => { const a = THREE.MathUtils.degToRad(deg); return [Math.cos(a), 0, -Math.sin(a)]; };
  // the LOD0 group of the town hall, for the wall raycasts
  th.root.updateMatrixWorld(true);
  const lod0 = th.levels[0];
  const flags = [];
  for (const p of poles) {
    const base = new THREE.Vector3(...p.base_city_xyz), tip = new THREE.Vector3(...p.tip_city_xyz);
    const axis = tip.clone().sub(base).normalize(), top = tip.clone().addScaledVector(axis, -0.12);
    const planes = wallPlanesFrom(lod0, top);
    const cloth = { width: 1.5, height: 1.0, axis: [axis.x, axis.y, axis.z], out: dirOf(wind.deg), windDir: dirOf(wind.deg), fabric: FABRIC.polyester, planes };
    const design = DESIGN[p.name] ?? "belgium", map = flagTexture(design, renderer);
    const set = await BakedFlags.create({ cloth, map, capacity: 1, speed: wind.speed });
    set.add(top.x, top.y, top.z, { yaw: 0, phase: Math.random() });
    set.mesh.visible = false;
    scene.add(set.mesh);
    flags.push({ name: p.name, design, top, axis, planes, cloth, map, set, live: null, state: "baked" });
  }
  // build every shader (the baked flags + each flag's live material, kept for reuse) before anything shows
  const probes = flags.map((f) => { const p = new LiveFlag({ cloth: f.cloth, map: f.map }); p.mesh.position.copy(f.top); f.liveMat = p.mesh.material; p.mesh.visible = false; scene.add(p.mesh); return p; });
  let compile = compiler();
  while (!compile) { await new Promise((r) => setTimeout(r, 250)); compile = compiler(); }
  await compile([...flags.map((f) => f.set.mesh), ...probes.map((p) => p.mesh)]);
  for (const p of probes) { scene.remove(p.mesh); p.mesh.geometry.dispose(); }

  let last = performance.now(), t = 0, simMs = 0;
  const makeLive = (f) => {
    f.live = new LiveFlag({ cloth: { ...f.cloth, windDir: undefined }, map: f.map });
    Object.assign(f.live.cloth.wind, { speed: wind.speed, dir: dirOf(wind.deg) });
    f.live.startFrom(f.set.stateAt(0, t), 0);
    f.live.mesh.position.copy(f.top);
    f.live.mesh.material.dispose(); f.live.mesh.material = f.liveMat;            // the precompiled one
    scene.add(f.live.mesh);
    f.set.setVisible(0, false); f.state = "live";
  };
  const drop = (f) => { scene.remove(f.live.mesh); f.live.mesh.geometry.dispose(); f.live = null; f.set.setVisible(0, true); f.state = "baked"; };
  updaters.push((camPos) => {
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now; t += dt;
    const shown = th.root.visible;
    let sim = 0;
    for (const f of flags) {
      const d = camPos.distanceTo(f.top), on = shown && d < HIDE_DIST;
      f.set.mesh.visible = on;
      if (!on) { if (f.live) drop(f); continue; }
      f.set.setWind(wind.speed); f.set.update(t, dt);
      const want = d < LIVE_RADIUS + (f.live ? 5 : 0);
      if (want && f.state === "baked") makeLive(f);
      else if (want && f.state === "handback") { f.live.blend = null; f.state = "live"; }
      else if (!want && f.state === "live") { f.live.handBack(() => f.set.stateAt(0, t), 0); f.state = "handback"; }
      if (f.live) {
        Object.assign(f.live.cloth.wind, { speed: wind.speed, dir: dirOf(wind.deg) });
        const going = f.live.update(dt); sim += f.live.simMs;
        if (f.state === "handback" && !going) drop(f);
      }
    }
    simMs += (sim - simMs) * 0.05;
  });
  /** change the wind (m/s, degrees towards): the loops are re-recorded in the worker and cross-faded */
  const setWind = (speed, deg = wind.deg) => {
    const turned = Math.abs(deg - wind.deg) > 5;
    Object.assign(wind, { speed, deg });
    for (const f of flags) {
      if (turned) f.cloth = { ...f.cloth, out: dirOf(deg), windDir: dirOf(deg) };
      f.set.retarget(speed, f.cloth);
    }
  };
  window.flags = { flags, wind, setWind, get simMs() { return simMs; } };
  log(`flags: ${flags.length} on the town hall balcony (${flags.map((f) => f.design).join(" / ")}), loops recorded in a worker, ready in ${(performance.now() - t0).toFixed(0)} ms (?wind=m/s,deg)`);
}
