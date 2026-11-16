// SHOPS2 before / after shots (docs/SHOPS2.md). In the city page (boot once at ?tile=I6, then move without reloading):
//   const s = await import("/debug/shops2Shots.js?v=1"); await s.shop("osm:n9204588938");   -> the camera parked in
//   front of that shop (9 m out, eye height, facing the front); s.shop(id, { dist, side, h, th, fov })
//   await s.at(x, z, tx, tz, { h, th, fov })                                             -> any view (joinsShots.go)
// take_screenshot (DevTools) then grabs the page; s.hud(true) brings the HUD back.
import { go } from "./joinsShots.js";

const docs = {};
async function doc(t) { return (docs[t] ??= fetch(`/data/streetlife/${t}.json?r=${Date.now()}`).then((r) => r.json())); }

/** the POI record (with its face) by id, searched in the given tiles */
export async function poi(id, tiles = ["I5", "I6", "E7", "J5", "H5", "H6"]) {
  for (const t of tiles) { const d = await doc(t); const p = d.pois.find((q) => q.id === id); if (p) return { ...p, tile: t }; }
  return null;
}

/** park the camera in front of a shop: dist m out along the façade normal, side m along the front (+ = right seen from
 *  the street), h m over the ground; looking at the front th m up */
export async function shop(id, { dist = 9, side = 0, h = 1.7, th = 2.6, fov = 55, settle = 2500 } = {}) {
  const p = await poi(id);
  if (!p) return { error: "no poi " + id };
  const f = p.face, X = [f.nz, -f.nx];      // right along the wall seen from the street (layout.js frameOf)
  const x = f.x + f.nx * dist + X[0] * side, z = f.z + f.nz * dist + X[1] * side;
  const r = await go({ x, z, h, tx: f.x, tz: f.z, th, fov }, { settle });
  return { ...r, name: p.name, face: { x: f.x, z: f.z, w: f.w, nx: f.nx, nz: f.nz } };
}

export async function at(x, z, tx, tz, { h = 1.7, th = 2.6, fov = 55, settle = 2500 } = {}) {
  return go({ x, z, h, tx, tz, th, fov }, { settle });
}

export function hud(on) {
  document.querySelectorAll("body > *").forEach((d) => { if (!d.contains(viewer.renderer.domElement) && d.tagName !== "SCRIPT") d.style.visibility = on ? "" : "hidden"; });
  if (on) viewer.pause(false);
}
