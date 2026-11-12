// The jitter meter (labs/jitterMeter.js) in the CITY: ?impkit=0 (viewer/impostors.js) against ?impkit=1 (the kit)
// over the same views and camera paths (docs/CITY_TREES.md §1). In the page's console, on a city tab:
//   const m = await import("/labs/cityJitter.js"); await m.cityMeter()
// The far trees' band = the pixels the far-tree impostors change (hidden / shown per frame); d2 = the mean second
// temporal difference over them (lower is steadier), share = the blinking pixels.
import { jitterRun } from "./jitterMeter.js";

export const VIEWS = {
  // a park: Wolvendael from the east, 70 m up, its trees 450-900 m away
  park: { eye: [520, 70, 380], target: [-150, 0, 120] },
  // an avenue: Avenue Houzeau's double row from its north end, 25 m up, 450-650 m away
  avenue: { eye: [654, 25, 260], target: [654, 0, -900] },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function goView(name) {
  const v = window.viewer, V = VIEWS[name];
  const [tx, , tz] = V.target, [ex, eh, ez] = V.eye;
  v.controls.target.set((tx + ex) / 2, 0, (tz + ez) / 2);           // stream round the middle of the view
  v.controls.target.y = v.world.surface(ex, ez);
  v.camera.position.set(ex, 0, ez);
  v.controls.update();
  await wait(15000);                                                 // the streaming (one full tile a second)
  for (let i = 0; i < 40 && v.fader.busy; i++) await wait(500);
  const y = v.world.surface(ex, ez);
  v.camera.position.set(ex, y + eh, ez);
  v.controls.target.set(tx, v.world.surface(ex, ez) + eh * 0.4, tz);
  v.camera.lookAt(v.controls.target);
  await wait(3000);
}

function farTrees() {
  const v = window.viewer, kit = window.__treeKit;
  if (kit) return [kit.group];
  const out = [];
  v.scene.traverse((o) => { if (o.name === "tree-impostors") out.push(o); });
  return out;
}

/** One run: path "strafe" (0.12 m / frame sideways) | "dolly" (1 m / frame forward) | "orbit" (0.02° / frame). */
export async function meter(path = "strafe", frames = 24) {
  const v = window.viewer, cam = v.camera;
  const p0 = cam.position.clone(), q0 = cam.quaternion.clone(), t0 = v.controls.target.clone();
  const fwd = cam.getWorldDirection(p0.clone()).clone(), right = fwd.clone().cross(cam.up).normalize();
  const objs = farTrees();
  const pose = (f) => {
    if (path === "strafe") cam.position.copy(p0).addScaledVector(right, 0.12 * f);
    else if (path === "dolly") cam.position.copy(p0).addScaledVector(fwd, 1.0 * f);
    else { const a = (0.02 * f * Math.PI) / 180, o = p0.clone().sub(t0); cam.position.copy(t0).add(o.applyAxisAngle(cam.up, a)); cam.lookAt(t0); return; }
    cam.quaternion.copy(q0);
    cam.updateMatrixWorld();
  };
  v.pause(true);
  try {
    const r = await jitterRun({ frames, pose, render: () => v.renderFrame(), canvas: v.renderer.domElement,
      bands: [{ name: "far trees", hide: () => objs.forEach((o) => (o.visible = false)), show: () => objs.forEach((o) => (o.visible = true)) }] });
    return { path, ...r.bands["far trees"], heatURL: r.heatURL };
  } finally {
    cam.position.copy(p0); cam.quaternion.copy(q0); v.pause(false);
  }
}

export async function cityMeter(views = ["park", "avenue"], paths = ["strafe", "dolly", "orbit"]) {
  const out = {};
  for (const name of views) {
    await goView(name);
    out[name] = {};
    for (const p of paths) { const r = await meter(p); out[name][p] = { maskPx: r.maskPx, share: +(r.share * 100).toFixed(2), d2: +(r.d2 * 1000).toFixed(1) }; }
  }
  return out;
}

/** Show a PNG URL over the page (full window) for a screenshot; returns a remover. */
export function overlay(url) {
  const img = document.createElement("img");
  Object.assign(img.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", objectFit: "contain", zIndex: 99, background: "#000" });
  img.src = url;
  document.body.append(img);
  return () => img.remove();
}

/**
 * Frames through the hand-over: the camera looks at one tree with a long lens (fov) and walks back so the tree goes
 * from d0 to d1 metres (steps frames); returns a strip PNG URL of the crops round the tree, 3x.
 */
export async function handoverStrip(x, z, { d0 = 360, d1 = 420, steps = 12, fov = 12, h = 6, dir = [0, 1], crop = 96 } = {}) {
  const { stripURL } = await import("./jitterMeter.js");
  const v = window.viewer, cam = v.camera, y = v.world.surface(x, z);
  const fov0 = cam.fov, p0 = cam.position.clone(), q0 = cam.quaternion.clone();
  const L = Math.hypot(dir[0], dir[1]), ux = dir[0] / L, uz = dir[1] / L;
  cam.fov = fov; cam.updateProjectionMatrix();
  const W = v.renderer.domElement.width, H = v.renderer.domElement.height;
  const c2 = new OffscreenCanvas(W, H), x2 = c2.getContext("2d", { willReadFrequently: true });
  const kept = [];
  v.pause(true);
  try {
    for (let s = -2; s < steps; s++) {
      const d = d0 + ((d1 - d0) * Math.max(0, s)) / (steps - 1);
      cam.position.set(x + ux * d, y + h + 0.0, z + uz * d);
      cam.lookAt(x, y + 6, z);
      cam.updateMatrixWorld();
      v.renderFrame();
      if (s < 0) { await wait(50); continue; }
      x2.drawImage(v.renderer.domElement, 0, 0);
      const cw = Math.round(crop * W / 1000), ch = cw;
      const im = x2.getImageData(Math.round(W / 2 - cw / 2), Math.round(H / 2 - ch / 2), cw, ch);
      kept.push({ w: cw, h: ch, data: im.data });
      await wait(30);
    }
  } finally { cam.fov = fov0; cam.updateProjectionMatrix(); cam.position.copy(p0); cam.quaternion.copy(q0); v.pause(false); }
  return stripURL(kept, 2, `hand-over ${d0}-${d1} m, fov ${fov}, ${window.__treeKit ? "impkit=1" : "impkit=0"}`);
}

/** GPU cost of the far trees in this view: alternating rounds of far trees on / off (GPU timestamps, p50 per round). */
export async function farBench(rounds = 4, secs = 3) {
  const v = window.viewer, objs = farTrees(), on = [], off = [];
  const setVis = (b) => objs.forEach((o) => (o.visible = b));
  for (let r = 0; r < rounds; r++) {
    for (const [b, arr] of r % 2 ? [[false, off], [true, on]] : [[true, on], [false, off]]) {
      setVis(b); await wait(600); v.resetGpu(); await wait(secs * 1000); arr.push(v.gpuStats().p50);
    }
  }
  setVis(true);
  const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return { on, off, delta: +(med(on) - med(off)).toFixed(2), deltas: on.map((x, i) => +(x - off[i]).toFixed(2)) };
}
