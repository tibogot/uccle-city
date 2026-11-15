// polish1: wait for the boot / the weather, set a fixed view, hide the HUD (docs/POLISH.md)
//   const p = await import("/debug/polishShots.js"); await p.ready(); p.view({ pos: [x, z, h], target: [x, z, h] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function ready({ weather = false, timeout = 150000 } = {}) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    const W = weather ? (await import("/viewer/weather/cityWeather.js")).cityWeather : null;
    if (window.viewer?.world?.tiles?.length && (!weather || (W.layer && W.map?.ready))) return Math.round(performance.now() - t0);
    await wait(1000);
  }
  return -1;
}
export function hud(show) {
  const cv = window.viewer.renderer.domElement;
  for (const d of document.body.children) if (d !== cv && !d.contains(cv) && d.tagName !== "SCRIPT") d.style.visibility = show ? "" : "hidden";
}
/** pos / target: [x, z, height above the ground] */
export function view({ pos, target, fov = null }) {
  const V = window.viewer, w = V.world, c = V.controls, cam = V.camera;
  cam.position.set(pos[0], w.surface(pos[0], pos[1]) + pos[2], pos[1]);
  c.target.set(target[0], w.surface(target[0], target[1]) + target[2], target[1]);
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  c.update();
  hud(false);
}
/** mean sRGB of 24 x 24 px boxes at the given screen fractions [[x, y], ...] (render + read in one task) */
export function sample(points) {
  const V = window.viewer, cv = V.renderer.domElement;
  V.renderFrame();
  const c2 = new OffscreenCanvas(cv.width, cv.height), g = c2.getContext("2d");
  g.drawImage(cv, 0, 0);
  return points.map(([x, y]) => {
    const d = g.getImageData(Math.round(x * cv.width) - 12, Math.round(y * cv.height) - 12, 24, 24).data;
    let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4; return [Math.round(r / n), Math.round(gg / n), Math.round(b / n)];
  });
}
