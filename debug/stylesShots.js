// BUILDING TYPES before / after shots (docs/STYLES.md). In the city page (default = after; ?styles=old = before):
//   const s = await import("/debug/stylesShots.js"); await s.go("brugmann");   -> camera parked, HUD hidden, paused
//   s.resume() gives the page back. Same cameras both ways (debug/joinsShots.js go()).
import { go as goView, resume } from "./joinsShots.js";
export { resume };
export const VIEWS = {
  stjob: { x: 1102, z: 542, h: 1.7, tx: 1175, tz: 540, th: 3, fov: 60 },                 // Place Saint-Job (I6)
  "stjob-air": { x: 1120, z: 520, h: 30, tx: 1180, tz: 560, th: 0, fov: 55 },
  vanderkindere: { x: -560, z: -1626, h: 1.7, tx: -470, tz: -1632, th: 4, fov: 60 },    // Rue Vanderkindere (E1)
  brugmann: { x: -905, z: -150, h: 1.7, tx: -850, tz: -184, th: 5, fov: 60 },          // Avenue Brugmann (D4)
  defre: { x: -392, z: -478, h: 1.7, tx: -445, tz: -469, th: 3, fov: 60 },              // Avenue De Fré (E3 / E4)
  coghen: { x: -650, z: -935, h: 1.7, tx: -675, tz: -1020, th: 3, fov: 60 },            // Avenue Coghen (E2): interwar / art deco
  orange: { x: 836, z: 1905, h: 1.7, tx: 880, tz: 1990, th: 3, fov: 60 },              // Avenue du Prince d'Orange (H8): villas
  churchill: { x: 330, z: -1431, h: 1.7, tx: 450, tz: -1412, th: 6, fov: 60 },          // Avenue Winston Churchill (G1): blocks
};
/** the orbit controls clamp the camera up (~8 m over the street); the eye is put back where the view says, no
 *  controls update, then a few frames */
export async function go(name, o) {
  const v = typeof name === "string" ? VIEWS[name] : name;
  const r = await goView(v, o);
  const W = viewer.world, cam = viewer.camera;
  const y = W.surface(v.x, v.z) + v.h, ty = W.surface(v.tx, v.tz) + (v.th || 0);
  cam.position.set(v.x, y, v.z); cam.lookAt(v.tx, ty, v.tz); cam.updateMatrixWorld(true);
  viewer.lighting.snapNext = true;
  for (let i = 0; i < 20; i++) { viewer.renderFrame(); await new Promise((q) => setTimeout(q, 30)); }
  return { ...r, eye: +(cam.position.y - W.surface(v.x, v.z)).toFixed(2) };
}

/** a street front of building type `t` (buildingTypes.js TYPE) near (x, z): the first one found in the loaded walls,
 *  -> a view 14 m in front of it, looking at it (for close-ups while tuning) */
export function find(t, x, z, { skip = 0, dist = 14, garage = null } = {}) {
  const hits = [];
  viewer.scene.traverse((o) => {
    if (!/^buildings-walls/.test(o.name) || !o.geometry?.attributes?.aBld) return;
    const B = o.geometry.attributes.aBld.array, P = o.geometry.attributes.position.array, F = o.geometry.attributes.aFN.array, Wl = o.geometry.attributes.aWall.array;
    for (let i = 0; i < B.length / 4; i += 3) {
      const zq = Math.round(B[i * 4 + 2]), tt = Math.floor((zq % 16) / 2);
      if (tt !== t || !(zq % 2) || Wl[i * 4 + 1] < 5) continue;
      if (garage !== null && (zq >= 16) !== garage) continue;
      hits.push({ x: P[i * 3], z: P[i * 3 + 2], nx: F[i * 4], nz: F[i * 4 + 1], d: Math.hypot(P[i * 3] - x, P[i * 3 + 2] - z) });
    }
  });
  hits.sort((a, b) => a.d - b.d);
  const seen = []; for (const h of hits) if (!seen.some((s) => Math.hypot(s.x - h.x, s.z - h.z) < 15)) seen.push(h);
  const h = seen[skip]; if (!h) return null;
  return { x: h.x + h.nx * dist, z: h.z + h.nz * dist, h: 1.7, tx: h.x, tz: h.z, th: 4, fov: 60 };
}
