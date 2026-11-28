// THE PLAYGROUNDS' DATA, PURE (no three): which playgrounds a build draws, with which kit and pieces, and a piece's
// collider triangles from its kit's oriented boxes. Shared by the city (viewer/playgroundCity.js) and the gate
// (tools/audit/parkPiecesCheck.mjs). claude/places2 + claude/places3 (rule park-pieces-real).
const qs = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
/** ?parkpieces=old: the playground kit's plastic stand-ins where an entry has its real kit (as before claude/places3) */
export const PARKPIECES_OLD = qs.get("parkpieces") === "old";

/** the playgrounds this build draws (a set's entries only with its switch on), each with the kit and pieces it draws */
export function playgroundsOn(ov, params, old = PARKPIECES_OLD) {
  const all = ov?.playgrounds || {};
  return Object.entries(all).filter(([k, v]) => !k.startsWith("_") && v?.pieces?.length && (v.set !== "places2" || params.get("places2") !== "old"))
    .map(([id, v]) => (old && v.piecesOld?.length ? { id, ...v, kit: "playgroundkit", pieces: v.piecesOld } : { id, kit: "playgroundkit", ...v }));
}
/** the collider roots' names (main.js: viewer/heroColliders.js HERO_ROOTS) */
export const playgroundRootNames = (ov, params) => playgroundsOn(ov, params).map((g) => `playground-${g.id}`);

/** a piece's oriented boxes (the kit json, Blender frame: centre + three half-axes) -> world triangles (9 floats each,
 *  12 a box) at (x, y, z, yaw); pure (the gate row runs it) */
export function pieceColliderTris(boxes, x, y, z, yaw) {
  const out = [], c = Math.cos(yaw), s = Math.sin(yaw);
  // Blender (bx, by, bz) -> glTF (bx, bz, -by), then the yaw about +Y (three's makeRotationY) and the placement
  const W = (bx, by, bz) => { const gx = bx, gy = bz, gz = -by; return [x + gx * c + gz * s, y + gy, z - gx * s + gz * c]; };
  const F = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  for (const b of boxes) {
    const [cx, cy, cz, ax, ay, az, bx, by, bz, ux, uy, uz] = b;
    const P = [];     // corner index = (i > 0) * 4 + (j > 0) * 2 + (k > 0)
    for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) P.push(W(cx + i * ax + j * bx + k * ux, cy + i * ay + j * by + k * uy, cz + i * az + j * bz + k * uz));
    for (const [a, b2, c2, d] of F) out.push(...P[a], ...P[b2], ...P[c2], ...P[a], ...P[c2], ...P[d]);
  }
  return out;
}

