// Bodies v2 (P4): Mr.doob's code-built person (vendor/slop-ped buildPersonGeometry, unchanged) plus extra lofted parts
// with the same vertex layout (skin = bone A, bone B, weight of B, part id; extra = girth direction x / z, u; female
// and hair deltas), so ONE instanced draw per LOD still draws everyone: hats (beanie / cap), scarves, long coats,
// skirts, a shoulder bag with its strap, a backpack, an umbrella (open in the rain, a closed one when dry) and a cane.
// Every part is in every body; personMaterial.js shows or collapses it per person from the style code. Skirts and long
// coats are skinned to the pelvis at the waist and blended toward each thigh down to the hem, so the hem follows the
// stride. The umbrella and the cane are built where the umbrella / cane families' baked right hand holds them, then
// moved into the forearm's bind frame (so they ride the forearm). All scripted.
import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildPersonGeometry } from "../../vendor/slop-ped/pedestrians.js";
import { PART } from "./personMaterial.js";

const B = { PELVIS: 0, CHEST: 1, HEAD: 2, FOREARM_R: 6, THIGH_L: 7, THIGH_R: 11 };

/** A closed loft through rings (arrays of [x, y, z]); skinFn(x, y, z) -> [boneA, boneB, wB]. Caps: centroid fans
 *  (small parts only; the hat top and the umbrella tip close onto a point ring instead). */
function loft(rings, part, skinFn, { capStart = false, capEnd = false, girth = null } = {}) {
  const rows = rings.length, cols = rings[0].length, per = cols + 1;
  const pos = [], idx = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < per; j++) pos.push(...rings[i][j % cols]);
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols; j++) {
    const a = i * per + j, b = a + 1, c = a + per + 1, d = a + per;
    idx.push(a, b, d, b, c, d);
  }
  const cap = (row, flip) => {
    const start = pos.length / 3, ctr = [0, 0, 0];
    for (let j = 0; j < cols; j++) { const p = rings[row][j]; pos.push(...p); ctr[0] += p[0] / cols; ctr[1] += p[1] / cols; ctr[2] += p[2] / cols; }
    pos.push(...ctr);
    for (let j = 0; j < cols; j++) { const a = start + j, b = start + ((j + 1) % cols), c = start + cols; flip ? idx.push(c, b, a) : idx.push(c, a, b); }
  };
  if (capStart) cap(0, true);
  if (capEnd) cap(rows - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = pos.length / 3, skin = new Float32Array(n * 4), extra = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const [a, b, w] = skinFn(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    skin.set([a, b, w, part], v * 4);
    if (girth) { extra[v * 3] = pos[v * 3] * girth; extra[v * 3 + 1] = pos[v * 3 + 2] * girth; }
  }
  g.setAttribute("skin", new THREE.BufferAttribute(skin, 4));
  g.setAttribute("extra", new THREE.BufferAttribute(extra, 3));
  g.setAttribute("femaleDelta", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("hairDelta", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return g;
}
const ring = (y, rx, rzF, rzB, cz, n, cx = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  return [cx + c * rx, y, cz + s * (s >= 0 ? rzF : rzB)];
});
const fixed = (bone) => () => [bone, bone, 0];

/** A rigid part built in a posed frame (q, t of the bone in the person's local frame, scale 1) moved to bind space. */
function toBind(g, q, t) {
  const inv = q.clone().invert(), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(t).applyQuaternion(inv); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return g;
}
/** The forearm R pose (local frame) of a family's idle, frame 0, male (from the bone table). */
function forearmPose(table, clipName) {
  const c = table.clips[table.byName[clipName]];
  if (!c) return null;
  const o = ((0 * table.total + c.start) * 15 + B.FOREARM_R) * 8, d = table.data;
  return { q: new THREE.Quaternion(d[o], d[o + 1], d[o + 2], d[o + 3]), t: new THREE.Vector3(d[o + 4], d[o + 5], d[o + 6]) };
}
// the right hand's centre in the male bind pose (his arm hangs 8 degrees out, the hand ~0.6 m from the shoulder)
const HAND_BIND = new THREE.Vector3(-0.185, 1.43, -0.015).add(new THREE.Vector3(-Math.sin(0.14), -Math.cos(0.14), 0).multiplyScalar(0.6));

export function buildExtras(detail, table) {
  const hi = detail > 0, n = hi ? 14 : 7, parts = [];
  // hat (a beanie; the "cap" style uses the same shell, coloured): over the hair shell
  {
    const rows = [[1.6, 0.106, 0.112, 0.118, -0.012], [1.64, 0.112, 0.116, 0.124, -0.012], [1.69, 0.108, 0.11, 0.12, -0.013], [1.735, 0.09, 0.09, 0.1, -0.013], [1.77, 0.055, 0.055, 0.06, -0.013], [1.787, 0.012, 0.012, 0.012, -0.013]];
    parts.push(loft(rows.map(([y, rx, f, b, cz]) => ring(y, rx, f, b, cz, n)), PART.HAT, fixed(B.HEAD), { capEnd: true }));
  }
  // scarf: a thick ring round the neck + a tail down the chest
  {
    const rows = [[1.445, 0.1, 0.1, 0.095, -0.008], [1.47, 0.088, 0.096, 0.088, -0.01], [1.5, 0.078, 0.088, 0.08, -0.012], [1.53, 0.07, 0.08, 0.072, -0.012]];
    parts.push(loft(rows.map(([y, rx, f, b, cz]) => ring(y, rx, f, b, cz, n)), PART.SCARF, (x, y) => (y > 1.5 ? [B.CHEST, B.HEAD, 0.35] : [B.CHEST, B.CHEST, 0]), { capStart: true, capEnd: true }));
    const tail = [1.46, 1.38, 1.3, 1.24].map((y, i) => ring(y, 0.032, 0.012, 0.012, 0.118 + i * 0.006 - (1.46 - y) * 0.05, 6, 0.035));
    parts.push(loft(tail, PART.SCARF, fixed(B.CHEST), { capStart: true, capEnd: true }));
  }
  // skirt (to just above the knee) and long coat (to below the knee): a flared tube from the hips, blended to the thighs
  const tube = (part, yTop, yHem, rTop, rHem) => {
    const ys = hi ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1];
    const rows = ys.map((t) => { const y = yTop + (yHem - yTop) * t, r = rTop.map((v, k) => v + (rHem[k] - v) * t); return ring(y, r[0], r[1], r[2], 0, hi ? 16 : 8); });
    return loft(rows, part, (x, y) => {
      const t = Math.min(1, Math.max(0, (yTop - y) / (yTop - yHem)));
      const k = Math.min(1, Math.abs(x) / 0.06);                     // the middle front / back stays with the pelvis
      return [B.PELVIS, x >= 0 ? B.THIGH_L : B.THIGH_R, 0.62 * t * k];
    }, { girth: 0.6 });
  };
  parts.push(tube(PART.SKIRT, 0.99, 0.5, [0.172, 0.112, 0.118], [0.215, 0.16, 0.17]));
  parts.push(tube(PART.COAT, 0.97, 0.42, [0.18, 0.12, 0.125], [0.225, 0.17, 0.18]));
  // shoulder bag at the left hip + its strap over the right shoulder
  {
    const box = (cx, cy, cz, hx, hy, hz, part, bone) => {
      const rows = [cy - hy, cy - hy * 0.3, cy + hy * 0.3, cy + hy].map((y) => [[cx - hx, y, cz - hz], [cx + hx, y, cz - hz], [cx + hx, y, cz + hz], [cx - hx, y, cz + hz]]);
      return loft(rows, part, fixed(bone), { capStart: true, capEnd: true });
    };
    parts.push(box(0.2, 0.92, 0.02, 0.035, 0.1, 0.12, PART.BAG, B.PELVIS));
    const strap = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, x = -0.13 + (0.2 + 0.13) * t, y = 1.45 - (1.45 - 1.03) * t, z = 0.105 * Math.sin(Math.PI * t) + 0.02;
      strap.push(ring(y, 0.014, 0.006, 0.006, z, 4, x));
    }
    parts.push(loft(strap, PART.BAG, (x, y) => (y > 1.12 ? [B.CHEST, B.CHEST, 0] : [B.CHEST, B.PELVIS, 0.6])));
    // backpack on the back
    parts.push(box(0, 1.2, -0.2, 0.14, 0.19, 0.07, PART.BACKPACK, B.CHEST));
  }
  // umbrella (open + closed) and cane, built at the baked hand of their family, then into the forearm's bind frame
  const fp = forearmPose(table, "umbrella:idle");
  if (fp) {
    const H = HAND_BIND.clone().applyQuaternion(fp.q).add(fp.t);
    const shaft = [H.y - 0.1, H.y + 0.5, H.y + 0.98].map((y) => ring(y, 0.009, 0.009, 0.009, H.z, 6, H.x));
    const top = H.y + 1.0;
    const canopy = [[0.012, top + 0.02], [0.18, top - 0.03], [0.36, top - 0.13], [0.5, top - 0.27], [0.53, top - 0.33]]
      .map(([r, y]) => ring(y, r, r, r, H.z, hi ? 16 : 8, H.x));
    parts.push(toBind(loft(shaft, PART.UMBRELLA, fixed(B.FOREARM_R), { capStart: true, capEnd: true }), fp.q, fp.t));
    parts.push(toBind(loft(canopy, PART.UMBRELLA, fixed(B.FOREARM_R), { capStart: true }), fp.q, fp.t));
    const closed = [[0.012, H.y - 0.1], [0.04, H.y + 0.15], [0.05, H.y + 0.55], [0.01, H.y + 0.9]].map(([r, y]) => ring(y, r, r, r, H.z, 6, H.x));
    parts.push(toBind(loft(closed, PART.UMB_CLOSED, fixed(B.FOREARM_R), { capStart: true, capEnd: true }), fp.q, fp.t));
  }
  const fc = forearmPose(table, "cane:idle");
  if (fc) {
    const H = HAND_BIND.clone().applyQuaternion(fc.q).add(fc.t);
    const cane = [[H.y + 0.03, 0.013], [H.y - 0.3, 0.011], [0.25, 0.011], [0.01, 0.012]].map(([y, r]) => ring(y, r, r, r, H.z + 0.02, 6, H.x));
    // the crook: a short horizontal grip
    const grip = [0, 1, 2, 3].map((i) => ring(H.y + 0.03, 0.012, 0.012, 0.012, H.z + 0.02 - 0.03 * i, 6, H.x));
    parts.push(toBind(loft(cane, PART.CANE, fixed(B.FOREARM_R), { capStart: true, capEnd: true }), fc.q, fc.t));
    parts.push(toBind(loft(grip.map((r) => r.map(([x, y, z]) => [x, y, z])), PART.CANE, fixed(B.FOREARM_R), { capStart: true, capEnd: true }), fc.q, fc.t));
  }
  return parts;
}

/** The body for a LOD level: his geometry + the extras, merged (one draw). */
export function buildBody(detail, table) {
  const his = buildPersonGeometry(detail);
  const extras = buildExtras(detail, table).map((g) => {
    // match his attribute set exactly (he has no uv): drop nothing, add nothing
    for (const k of Object.keys(g.attributes)) if (!his.attributes[k]) g.deleteAttribute(k);
    return g;
  });
  const g = mergeGeometries([his, ...extras]);
  g.computeBoundingSphere();
  return g;
}
