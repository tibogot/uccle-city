// CAR DENTS (claude/dent, docs/CARHIT.md "Dents without holes", QUALITY_RULES 41): the crumpled corners of a hit car.
//
// Owner playtest 2026-11-19: "the damage leaves some hollow mesh". The carhit crumple (carPacks.js crumpleOffset, the
// accident props' fold) pushed every vertex ALONG ITS OWN NORMAL, by up to 1.3 x the corner's depth (28 cm: 36 cm),
// with a fold wave of 23 / m. Three ways that opened the body:
//   - split normals: the vertices of a hard edge (the rear face meets the side, a lamp's rim, a panel seam) sit in one
//     place with different normals: each copy moved its own way and the shell tore open along the crease;
//   - two-faced parts (bumper lips, wheel arches, the boot lining under the tailgate): the outer face pushed in along
//     its normal, the inner face (normal pointing in) pushed OUT: they crossed and the faces turned inside out;
//   - the push (36 cm) and its wave changed faster than the panel's own size: neighbouring vertices crossed over.
// With back faces culled, every one of those is a see-through hole.
//
// Now the dent is a DISPLACEMENT FIELD of the position only (never the normal), smooth and slow:
//   - each END (front: FL + FR, rear: RL + RR; x = left, z = forward) is pushed in along the car by P = (dvL t +
//     dvR (1 - t)) f: t the left corner's share, LINEAR across the width (a head-on hit pushes the whole end evenly, a
//     corner hit tilts it: the wide triangles of a low-poly end stay flat across x), f = (1 - (b / RZ)^2 - over^2)^2
//     with b the distance from the end and `over` the height above the belt line YT (/ RY); dv the corner's depth
//     eased (a 4 cm hit 5.8 cm, the 28 cm cap ~15 cm: a light dent, never a hole); a little sag (UY);
//   - the sides near a dented corner squeezed toward the mid-plane (x' = x (1 - UX dv f / hw): 0 on the mid-plane);
//   - the across / along parts softly capped by KM x the distance to the mid-planes, the whole push by KB x the
//     distance to the CABIN box (rounded by RB: the interior's bounding box from the model's own kind-8 vertices, the
//     glass house when a pack has none): no skin vertex reaches the cabin or the other side, whatever the depth.
//     Soft caps (v c / sqrt(v^2 + c^2)): a hard min() folds the field and the long thin triangles flip along the fold.
// Coincident vertices move together (same position, same offset): the shell stays closed by construction; the
// gradients stay well under 1, so no triangle turns its back (rule 41: every model of every pack at every LOD at the
// full depth of each corner, seen from 17 outside directions, tools/audit/dentGate.mjs).
// The paint in the zone gets darker and rougher with a crease band on the dent's flank (a varying, the paint only).
//
// One source for both the shader (TSL nodes) and the gate (numbers): dentField(ops, ...) with ops = TSL or JS math.
// ?dent=old: the normal-push crumple as before (carPacks.js crumpleOffset). ?carpush=old: no crumple at all.
import { add, sub, mul, div, min, max, sqrt, float, vec3, varying, select, mix } from "three/tsl";

export const DENT_OLD = typeof location !== "undefined" && /[?&]dent=old(&|$)/.test(location.search);

/** the field's constants (metres) */
export const DENT = {
  RZ: 1.0, RY: 0.9, YT: 0.62,              // the dent's reach along the car / above the belt line YT
  DMAX: 0.2035, DK: 0.1,                    // visual depth dv = DMAX d / (d + DK): 4 cm -> 5.8, 12 -> 11, 28 -> 15 cm
  KB: 0.6, KM: 0.9, RB: 0.2,                // soft caps: x the (rounded by RB) distance to the cabin box / to the mid-plane
  UX: 0.55, UY: 0.08, UZ: 1,                // the push direction (inward across, down, inward along)
  TONE: 0.15,                               // dv giving full paint tone
};
/** corners in the order of the depth vec4: FL FR RL RR (sx +1 = left, sz +1 = front) */
export const CORNERS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];

export const jsOps = { add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b, min: Math.min, max: Math.max, sqrt: Math.sqrt };
export const tslOps = { add, sub, mul, div, min, max, sqrt };

/** The dent at local point (x, y, z): dep = 4 corner depths (m, FL FR RL RR), F = { hw, zF, zR } the body's half width
 *  and front / rear ends, B = { x0, y0, z0, x1, y1, z1 } the cabin box. -> [dx, dy, dz, tone] (ADD the offset; tone
 *  0.. ~1.2, the paint's dent shading). Works on numbers (jsOps) and TSL nodes (tslOps).
 *  Every cap is SOFT (v c / sqrt(v^2 + c^2) < c, smooth): a hard min() folds the field along the line where it switches
 *  and the long thin triangles of a body flip across such a fold. */
export function dentField(o, x, y, z, dep, F, B) {
  const { add, sub, mul, div, min, max, sqrt } = o, K = DENT;
  const sq = (v) => mul(v, v);
  const soft = (v, c) => div(mul(v, c), sqrt(add(add(sq(v), sq(c)), 1e-12)));     // |result| < c, ~v while |v| << c
  // the cabin cap: the distance to the box ROUNDED by RB (its inner box grown by RB, minus RB sqrt 3: never more than
  // the distance to the box itself, curvature <= 1 / RB instead of 1 / d at the box's edges)
  const r = K.RB;
  const ex = max(max(sub(B.x0, add(x, -r)), sub(x, sub(B.x1, r))), 0);
  const ey = max(max(sub(B.y0, add(y, -r)), sub(y, sub(B.y1, r))), 0);
  const ez = max(max(sub(B.z0, add(z, -r)), sub(z, sub(B.z1, r))), 0);
  const g = max(sub(sqrt(add(add(sq(ex), sq(ey)), sq(ez))), r * Math.sqrt(3)), 0);
  const h = max(sub(y, K.YT), 0), hh = mul(sq(h), 1 / (K.RY * K.RY));
  let dx = 0, dy = 0, dz = 0, tone = 0;
  // across the width: the left corner's share t (0 at the right side, 1 at the left), LINEAR in x: the push along
  // the car is affine across the end (a head-on hit pushes the whole end evenly, one corner tilts it), so the wide
  // triangles of a low-poly end cannot fold across x
  const t = min(max(add(mul(div(x, F.hw), 0.5), 0.5), 0), 1);
  const sL = div(max(x, 0), F.hw), sR = div(max(mul(x, -1), 0), F.hw);   // the side squeeze: 0 on the mid-plane
  for (const [sz, cL, cR] of [[1, 0, 1], [-1, 2, 3]]) {
    const end = sz > 0 ? F.zF : F.zR;
    const b = max(mul(sub(end, z), sz), 0);
    const q = max(sub(sub(1, mul(sq(b), 1 / (K.RZ * K.RZ))), hh), 0), f = mul(q, q);   // along the car + over the belt
    const vL = div(mul(dep[cL], K.DMAX), add(dep[cL], K.DK)), vR = div(mul(dep[cR], K.DMAX), add(dep[cR], K.DK));
    const P = mul(add(mul(vL, t), mul(vR, sub(1, t))), f);                                // the end's push
    dz = sub(dz, mul(mul(P, K.UZ), sz));
    dy = sub(dy, mul(P, K.UY));
    // the sides pulled in toward the mid-plane near the dented corner (a uniform squeeze of that half: x' = x (1 - k))
    dx = sub(dx, mul(mul(f, K.UX), sub(mul(vL, sL), mul(vR, sR))));
    // shading: the dent's floor + a crease band on its flank (q (1 - q) peaks half way along)
    tone = add(tone, mul(add(mul(vL, t), mul(vR, sub(1, t))), add(mul(f, 0.6), mul(mul(q, sub(1, q)), 3.2))));
  }
  // the cabin: the whole push softly capped by KB x the (rounded) distance to the cabin box
  const len = sqrt(add(add(add(sq(dx), sq(dy)), sq(dz)), 1e-12)), k = div(soft(len, mul(g, K.KB)), len);
  return [mul(dx, k), mul(dy, k), mul(dz, k), mul(tone, 1 / K.TONE)];
}

/** The dent frame of a car body from its arrays (P xyz, K kind, skip(i) -> true for a wheel vertex):
 *  { hw, zF, zR, box: { x0, y0, z0, x1, y1, z1 } }. The cabin box = the interior's (kind 8) bounding box; a pack without
 *  an interior: the glass house (the glass's x / z range, from 0.35 m under the glass to its top). */
export function dentFrame(P, K, skip = null) {
  const n = P.length / 3;
  let hw = 0, zF = -1e9, zR = 1e9, ok = false;
  const ib = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], gb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  const grow = (bb, i) => { for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], P[i * 3 + k]); bb[k + 3] = Math.max(bb[k + 3], P[i * 3 + k]); } };
  for (let i = 0; i < n; i++) {
    if (skip && skip(i)) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    ok = true;
    if (y < 0.85) hw = Math.max(hw, Math.abs(x));          // (under the mirrors)
    zF = Math.max(zF, z); zR = Math.min(zR, z);
    const k = K ? Math.round(K[i]) : 0;
    if (k === 8) grow(ib, i); else if (k === 4) grow(gb, i);
  }
  if (!ok) return null;
  let box;
  if (ib[3] > ib[0]) box = { x0: ib[0], y0: ib[1], z0: ib[2], x1: ib[3], y1: ib[4], z1: ib[5] };
  else if (gb[3] > gb[0]) box = { x0: gb[0] + 0.05, y0: gb[1] - 0.35, z0: gb[2], x1: gb[3] - 0.05, y1: gb[4], z1: gb[5] };
  else box = { x0: -hw * 0.7, y0: 0.6, z0: zR * 0.6, x1: hw * 0.7, y1: 1.3, z1: zF * 0.6 };
  return { hw: hw || 0.9, zF, zR, box };
}
/** a frame as 3 vec4 rows (the uniforms' layout): (hw, zF, zR, 0), box min, box max */
export function frameRows(F) {
  const b = F.box;
  return [[F.hw, F.zF, F.zR, 0], [b.x0, b.y0, b.z0, 0], [b.x1, b.y1, b.z1, 0]];
}

/** TSL: the dent of position p (vec3 node) for dep (vec4 node) and frame rows r0, r1, r2 (vec4 nodes, frameRows).
 *  -> { offset: vec3 node (ADD to the position), tone: float node (vertex stage) } */
export function dentNodes(p, dep, r0, r1, r2) {
  const F = { hw: r0.x, zF: r0.y, zR: r0.z }, B = { x0: r1.x, y0: r1.y, z0: r1.z, x1: r2.x, y1: r2.y, z1: r2.z };
  const [dx, dy, dz, tone] = dentField(tslOps, p.x, p.y, p.z, [dep.x, dep.y, dep.z, dep.w], F, B);
  return { offset: vec3(dx, dy, dz), tone: float(tone) };
}

/** the paint's dent shading on a pack material (after its colour / roughness / clear coat are set): tone (vertex stage,
 *  0 off the dent) -> darker, rougher, less clear coat on the paint (isPaint) only. A varying: one per vertex. */
export function shadeDent(m, tone, isPaint) {
  const t = select(isPaint, varying(tone.clamp(0, 1), "v_carDent"), float(0));
  if (m.colorNode) m.colorNode = m.colorNode.mul(float(1).sub(t.mul(0.2)));
  if (m.roughnessNode) m.roughnessNode = mix(m.roughnessNode, float(0.62), t.mul(0.75));
  if (m.clearcoatNode) m.clearcoatNode = m.clearcoatNode.mul(float(1).sub(t.mul(0.7)));
}
