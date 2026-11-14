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
};

// everything but the city's own canvas hidden (HUD, dev panel, minimap, street name)
const hud = () => { const cv = viewer.renderer.domElement; document.querySelectorAll("body > *").forEach((d) => { if (d !== cv && !d.contains(cv)) d.style.visibility = "hidden"; }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function go(name, { frames = 40 } = {}) {
  const v = typeof name === "string" ? VIEWS[name] : name;
  const w = viewer.world, cam = viewer.camera, c = viewer.controls;
  const y = (x, z) => w.heightAt(x, z);
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
