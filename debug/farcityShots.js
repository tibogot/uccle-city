// FAR CITY before / after shots (docs/FARCITY.md). Boot the city at the Place Saint-Job (default URL, or ?farlook=old =
// before), then in the page:
//   const s = await import("/debug/farcityShots.js"); await s.settle(); await s.go("falcon");   -> camera parked, HUD hidden, paused
//   s.state() = the full / far / fading tiles; s.resume() gives the page back.
// The orbit TARGET stays on the Place (it drives the streaming: the full ring H5..J7 round I6), only the eye moves: the
// views look out of the full ring at the far ring (falcon height 90 m over I7 looking south at I8 / H8 ~150 m away, a
// 300 m flight looking west, a 420 m overview).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hud = (on) => document.querySelectorAll("body > *").forEach((d) => { if (!d.contains(viewer.renderer.domElement) && d.tagName !== "SCRIPT") d.style.visibility = on ? "" : "hidden"; });
export const TARGET = { x: 1102, z: 542 };
export const VIEWS = {
  falcon: { x: 1150, z: 1380, h: 90, tx: 1020, tz: 1900, th: 0, gy: 76.06, ty: 80.37, fov: 60 },           // over I7, the far I8 / H8 from ~120 m
  falcon2: { x: 1250, z: 980, h: 60, tx: 1250, tz: 1700, th: 0, gy: 80.44, ty: 74.07, fov: 60 },          // lower, at the I6 / I7 seam, a long look south
  flight300: { x: 1350, z: 700, h: 300, tx: -200, tz: 900, th: 0, gy: 91.24, ty: 87.06, fov: 60 },        // 300 m, west over G6 / F6
  overview: { x: 1700, z: -300, h: 420, tx: 900, tz: 1300, th: 0, gy: 84.41, ty: 82.36, fov: 55 },        // 420 m, the whole far ring to the south-west
  // the hand-over A/B: the same buildings of I7 full (default) and far (?ring=0): from I6, 45 m up, 100-300 m away
  handover: { x: 1250, z: 880, h: 45, tx: 1230, tz: 1150, th: 0, gy: 90.18, ty: 73.16, fov: 50 },
  handover2: { x: 1300, z: 700, h: 150, tx: 1150, tz: 1250, th: 0, gy: 89.63, ty: 76.06, fov: 50 },
  close: { x: 1120, z: 1470, h: 35, tx: 1080, tz: 1620, th: 0, gy: 77.15, ty: 78.76, fov: 60 },           // a far tile at ~100 m from 35 m (hand-over range)
};
/** the full / far tiles, the tiles still fading, the pending stream */
export function state() {
  const v = viewer, fad = v.fader?.list?.length ?? null;
  return { full: v.world.tiles.map((t) => t.name).join(" "), far: [...v.lite.keys()].sort().join(" "), nFar: v.lite.size, fading: fad };
}
/** wait until the stream is quiet (no change of the tile sets and no fade for `quiet` ms, at most `max` ms) */
export async function settle({ quiet = 6000, max = 240000 } = {}) {
  const c = viewer.controls; c.target.set(TARGET.x, 60, TARGET.z); c.update();
  const t0 = performance.now();
  let last = JSON.stringify(state()), since = performance.now();
  while (performance.now() - t0 < max) {
    await wait(1000);
    const s = state(), k = JSON.stringify({ ...s, fading: 0 });
    if (k !== last || s.fading) { last = k; since = performance.now(); }
    else if (performance.now() - since > quiet) break;
  }
  return { ms: Math.round(performance.now() - t0), ...state() };
}
export async function go(name, { frames = 40 } = {}) {
  const v = typeof name === "string" ? VIEWS[name] : name;
  const c = viewer.controls, cam = viewer.camera, W = viewer.world;
  viewer.pause(false);
  c.target.set(TARGET.x, 60, TARGET.z); c.update();
  const g = (x, z) => { const s = W.surface(x, z); return Number.isFinite(s) ? s : 100; };
  // (gy / ty: the ground under the eye and the target point, absolute: the same camera whether a tile is full or far)
  const y = (v.gy ?? g(v.x, v.z)) + v.h, ty = (v.ty ?? g(v.tx, v.tz)) + (v.th || 0);
  cam.position.set(v.x, y, v.z);
  if (v.fov) { cam.fov = v.fov; cam.updateProjectionMatrix(); }
  cam.lookAt(v.tx, ty, v.tz); cam.updateMatrixWorld(true);
  hud(false);
  viewer.pause(true);
  viewer.lighting.snapNext = true;
  for (let i = 0; i < frames; i++) { viewer.renderFrame(); await wait(30); }    // (TAAU converges)
  return state();
}
export const resume = () => { hud(true); viewer.pause(false); };
