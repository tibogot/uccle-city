// JOINS2 before / after shots (docs/JOINS2.md). In the city page (boot once, then move without reloading):
//   const j = await import("/debug/joinsShots.js"); await j.go("wolv-path");   -> { tile, ms } (the camera parked there)
//   j.VIEWS: name -> { x, z, h, tx, tz, th, fov }  (h / th over the drawn ground)
// The orbit target drives the streaming: the target is set, then we wait for the tile under it (and its neighbours'
// first frames), hide the HUD and render a few frames. take_screenshot (DevTools) then grabs the page.
export const VIEWS = {
  // forest paths / wood edges (TERRAIN TEXTURE EDGES)
  "wolv-air": { x: -360, z: -60, h: 28, tx: -400, tz: -100, th: 0, fov: 55 },
  "f4-air": { x: -300, z: -80, h: 22, tx: -286, tz: -100, th: 0, fov: 60, noTrees: true },
  "f4-street": { x: -292, z: -118, h: 1.7, tx: -284, tz: -98, th: 0, fov: 60 },
  "wolv-path": { x: -425, z: -105, h: 1.7, tx: -405, tz: -108, th: 0, fov: 60 },
  "g6-wood": { x: 300, z: 760, h: 22, tx: 260, tz: 790, th: 0, fov: 55 },
  "g6-path": { x: 392, z: 912, h: 9, tx: 403, tz: 930, th: 0, fov: 60, noTrees: true },
  "f4-path": { x: -298, z: -112, h: 9, tx: -286, tz: -97, th: 0, fov: 60 },
  "c7-path": { x: -1600, z: 1095, h: 14, tx: -1583, tz: 1118, th: 0, fov: 60, noTrees: true },
  "d7-path": { x: -1480, z: 1128, h: 14, tx: -1462, tz: 1149, th: 0, fov: 60, noTrees: true },
  "h5-park": { x: 600, z: 300, h: 25, tx: 560, tz: 340, th: 0, fov: 55 },
  // Place Saint-Job sidewalk gap (POLISH1) and the tram wire (1102, 542)
  "stjob-gap": { x: 1165, z: 540, h: 6, tx: 1175, tz: 549, th: 0, fov: 55 },
  "stjob-street": { x: 1102, z: 542, h: 1.7, tx: 1175, tz: 540, th: 3, fov: 60 },
  // Dix Monolithes island signs
  "monolithes": { x: -2214, z: 400, h: 1.7, tx: -2240, tz: 376, th: 3, fov: 55 },
  "monolithes-air": { x: -2205, z: 335, h: 35, tx: -2240, tz: 376, th: 2, fov: 55 },
  // Fort-Jaco zebra crossings, kerb band
  "fortjaco": { x: 1805, z: 1125, h: 1.7, tx: 1830, tz: 1220, th: 3, fov: 60 },
  "fortjaco-air": { x: 1740, z: 1060, h: 90, tx: 1813, tz: 1165, th: 0, fov: 55 },
};
const hud = (on) => document.querySelectorAll("body > *").forEach((d) => { if (!d.contains(viewer.renderer.domElement) && d.tagName !== "SCRIPT") d.style.visibility = on ? "" : "hidden"; });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function tileAt(x, z) {
  return viewer.world.tiles.find((t) => t.bounds && x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1);
}
/** hide / show the trees (tree pool, tree kit, per-tile tree meshes) for the ground audits from the air */
export function trees(on) {
  viewer.scene.traverse((o) => { if (/tree|canopy/i.test(o.name) && o !== viewer.scene) { o.userData.jVis ??= o.visible; o.visible = on ? o.userData.jVis : false; } });
}
export async function go(name, { settle = 3000, frames = 30, noTrees = false } = {}) {
  const v = typeof name === "string" ? VIEWS[name] : name, t0 = performance.now();
  const c = viewer.controls, cam = viewer.camera, W = viewer.world;
  viewer.pause(false);
  c.target.set(v.tx, 60, v.tz); cam.position.set(v.x, 200, v.z); c.update();
  for (let i = 0; i < 240; i++) {               // the tile under the target and the one under the camera
    const names = W.tiles.map((t) => t.name);
    if (names.length && [[v.tx, v.tz], [v.x, v.z]].every(([x, z]) => W.tiles.some((t) => t.bounds ? (x >= t.bounds.x0 && x < t.bounds.x1 && z >= t.bounds.z0 && z < t.bounds.z1) : false))) break;
    await wait(500);
  }
  await wait(settle);
  const y = W.surface(v.x, v.z) + v.h, ty = W.surface(v.tx, v.tz) + (v.th || 0);
  c.target.set(v.tx, ty, v.tz); cam.position.set(v.x, y, v.z);
  if (v.fov) { cam.fov = v.fov; cam.updateProjectionMatrix(); }
  c.update(); cam.lookAt(v.tx, ty, v.tz); cam.updateMatrixWorld(true);
  hud(false);
  trees(!noTrees && !v.noTrees);
  viewer.pause(true);
  viewer.lighting.snapNext = true;
  for (let i = 0; i < frames; i++) { viewer.renderFrame(); await wait(30); }
  return { ms: Math.round(performance.now() - t0), tiles: W.tiles.length };
}
export const resume = () => { hud(true); viewer.pause(false); };
