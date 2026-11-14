// Street surfaces (docs/STREET_SURFACES.md): fixed views for before / after shots and the flicker test.
//   const p = await import("/debug/pavingShots.js");
//   await p.go("geleytsbeek")              // sets the view (HUD hidden), renders a few frames; then take the screenshot
//   await p.flicker("geleytsbeek", "strafe") -> { ppm, blink } (labs/flickerTest.js)
// Load the page with ?paving=old for "before". Views: [camera x, z, height above ground], [target x, z, height].
import { flickerTest } from "/labs/flickerTest.js";

export const VIEWS = {
  // Rue Geleytsbeek (OSM surface=sett): along the street, eye level
  geleytsbeek: { cam: [-188, 803.5, 1.7], at: [-150, 791, 0.3] },
  // the same street from a car driver's seat (1.2 m), looking further
  geleytsbeekCar: { cam: [-200, 806, 1.2], at: [-130, 784, 0.6] },
  // the setts close: the camera looking down at 1.7 m
  geleytsbeekClose: { cam: [-176, 799.5, 1.7], at: [-171, 797.8, 0] },
  // Place de Saint-Job (measured square), eye level
  stjob: { cam: [1140, 532, 1.7], at: [1160, 545, 0.2] },
  // Chaussée de Saint-Job by the square: sidewalk slabs + kerb + asphalt
  stjobStreet: { cam: [1128, 556, 1.7], at: [1150, 568, 0.2] },
  // a driver's view over the roads round the square (1.2 m)
  stjobCar: { cam: [1100, 560, 1.2], at: [1160, 545, 0.5] },
  // Montagne de Saint-Job (OSM surface=paving_stones): the concrete pavers
  montagne: { cam: [1140, 583, 1.7], at: [1154, 623, 0.1] },
};

// everything but the city's own canvas hidden (HUD, dev panel, minimap, street name)
const hud = () => { const cv = viewer.renderer.domElement; document.querySelectorAll("body > *").forEach((d) => { if (d !== cv && !d.contains(cv)) d.style.visibility = "hidden"; }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function go(name, { frames = 40 } = {}) {
  const v = typeof name === "string" ? VIEWS[name] : name;
  const w = viewer.world, cam = viewer.camera, c = viewer.controls;
  const y = (x, z) => w.surface(x, z);   // the street level (not a roof)
  c.target.set(v.at[0], y(v.at[0], v.at[1]) + v.at[2], v.at[1]);
  cam.position.set(v.cam[0], y(v.cam[0], v.cam[1]) + v.cam[2], v.cam[1]);
  c.update(); cam.lookAt(c.target); cam.updateMatrixWorld(true);
  hud();
  viewer.lighting.snapNext = true;
  for (let i = 0; i < frames; i++) await sleep(33);
  return { cam: cam.position.toArray().map((q) => +q.toFixed(2)) };
}

/** flicker test of a view. freezeLight: the sun's shadow box stops following the camera during the test (it moves with
 *  every camera step, and its shadow texels / penumbra noise then blink on any bright ground: an engine effect that is
 *  not the surface's; measure both ways) */
export async function flicker(name, { move = "strafe", step = 0.0006, freezeLight = false } = {}) {
  await go(name);
  viewer.pause(true);
  const L = viewer.lighting, upd = L.update;
  if (freezeLight) { viewer.renderFrame(); L.update = () => {}; }
  try {
    const r = await flickerTest({ renderFrame: viewer.renderFrame, canvas: viewer.renderer.domElement, camera: viewer.camera, controls: viewer.controls, frames: 24, move, step });
    return r;
  } finally { L.update = upd; viewer.pause(false); }
}

/** LIVE A/B of the street materials in one page (same GPU background for both): every road mesh gets a twin
 *  material built with the procedural look (?paving=old), swapped in and out. Returns { a: old, b: new } setters.
 *  const ab = await p.ab(); const g = await import("/debug/gpuAB.js"); await g.alternate(ab.a, ab.b) */
export async function ab() {
  const P = await import("/viewer/streets/paving.js"), R = await import("/viewer/roadPaint.js"), C = await import("/viewer/cobbles.js");
  const meshes = [];
  viewer.scene.traverse((o) => { if (o.isMesh && /^roads-(asphalt|concrete|square)$/.test(o.name)) meshes.push(o); });
  P.setPavingOff(true);
  const cache = new Map();
  const oldOf = (m, name) => {
    if (cache.has(m)) return cache.get(m);
    const o = name === "roads-asphalt" ? R.asphaltMaterial(m.userData.atlas ?? null) : name === "roads-square" ? C.cobbleMaterial()
      : R.concreteMaterial({ framed: true });          // (measured tiles: the framed sidewalks)
    cache.set(m, o); return o;
  };
  const pairs = meshes.map((o) => ({ o, nu: o.material, old: oldOf(o.material, o.name) }));
  P.setPavingOff(false);
  return { n: pairs.length, a: () => pairs.forEach((q) => { q.o.material = q.old; }), b: () => pairs.forEach((q) => { q.o.material = q.nu; }) };
}
