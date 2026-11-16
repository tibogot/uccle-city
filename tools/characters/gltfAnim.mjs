// Minimal glTF (GLB) skeleton + animation reader / writer and the quaternion math the retargeter needs. No three.js:
// the files are read as data, the math is explicit (and testable: tools/characters/retarget.mjs --roundtrip).
//
//   const g = readGLB(path)      { json, bin, nodes: [{ name, parent, t, r, s, children }], anims: [{ name, channels }] }
//   sampleAnim(g, anim, time)    -> per node local { t, r, s } (rest where the clip has no channel)
//   worldPose(g, local)          -> per node world { p, q, s } (uniform scale)
import fs from "node:fs";

// ------------------------------------------------------------------------------------------------ math
export const q = {
  mul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; },
  inv(a) { return [-a[0], -a[1], -a[2], a[3]]; },
  norm(a) { const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1; return [a[0] / l, a[1] / l, a[2] / l, a[3] / l]; },
  rot(a, v) {   // rotate vector v by unit quaternion a
    const [x, y, z, w] = a, [vx, vy, vz] = v;
    const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  },
  slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b;
    if (d < 0) { d = -d; bb = [-b[0], -b[1], -b[2], -b[3]]; }
    if (d > 0.9995) return q.norm([a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t, a[2] + (bb[2] - a[2]) * t, a[3] + (bb[3] - a[3]) * t]);
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return [a[0] * wa + bb[0] * wb, a[1] * wa + bb[1] * wb, a[2] * wa + bb[2] * wb, a[3] * wa + bb[3] * wb];
  },
  /** The rotation whose columns are the orthonormal axes x, y, z. */
  fromBasis(x, y, z) {
    const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2], tr = m00 + m11 + m22;
    let r;
    if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); r = [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
    else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); r = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
    else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); r = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
    else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); r = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
    return q.norm(r);
  },
  axisAngle(ax, ang) { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; },
  angle(a, b) { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)); },
};
export const v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

// ------------------------------------------------------------------------------------------------ GLB
const COMP = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array, 5122: Int16Array, 5120: Int8Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function readGLB(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  let o = 12, json = null, bin = null;
  while (o < buf.length) {
    const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8")); else if (type === 0x004e4942) bin = data;
    o += 8 + len;
  }
  const accessor = (i) => {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView], C = COMP[a.componentType], n = NCOMP[a.type];
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || 0, size = n * C.BYTES_PER_ELEMENT;
    const out = new Float32Array(a.count * n);
    if (!stride || stride === size) {          // packed: one copy
      const src = new C(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * size));
      const div = a.normalized ? (C === Int16Array ? 32767 : C === Uint16Array ? 65535 : C === Int8Array ? 127 : 255) : 1;
      for (let k = 0; k < out.length; k++) out[k] = src[k] / div;
      return out;
    }
    for (let k = 0; k < a.count; k++) {
      const src = new C(bin.buffer.slice(bin.byteOffset + off + k * (stride || size), bin.byteOffset + off + k * (stride || size) + size));
      for (let c = 0; c < n; c++) out[k * n + c] = a.normalized ? src[c] / (C === Int16Array ? 32767 : C === Uint16Array ? 65535 : C === Int8Array ? 127 : 255) : src[c];
    }
    return out;
  };
  const nodes = json.nodes.map((n, i) => ({ i, name: n.name || `node${i}`, parent: -1, t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1], children: n.children || [] }));
  for (const n of nodes) for (const c of n.children) nodes[c].parent = n.i;
  const anims = (json.animations || []).map((a) => ({
    name: a.name,
    channels: a.channels.map((ch) => {
      const s = a.samplers[ch.sampler];
      return { node: ch.target.node, path: ch.target.path, interp: s.interpolation || "LINEAR", times: accessor(s.input), values: accessor(s.output) };
    }).filter((c) => c.node !== undefined && c.path !== "weights"),
  }));
  // (clips start at 0: Blender's exports start at frame 1, 1/fps)
  for (const a of anims) {
    const t0 = Math.min(...a.channels.map((c) => c.times[0]));
    if (t0 > 0 && t0 < 0.5) for (const c of a.channels) { const T = new Float32Array(c.times); for (let k = 0; k < T.length; k++) T[k] -= t0; c.times = T; }
    a.duration = Math.max(0, ...a.channels.map((c) => c.times[c.times.length - 1]));
  }
  return { file, json, bin, nodes, anims, accessor, byName: new Map(nodes.map((n) => [n.name, n.i])) };
}

/** Local TRS of every node at time t of anim (rest where the clip has no channel). */
export function sampleAnim(g, anim, t) {
  const L = g.nodes.map((n) => ({ t: n.t.slice(), r: n.r.slice(), s: n.s.slice() }));
  if (!anim) return L;
  for (const ch of anim.channels) {
    const T = ch.times, n = ch.path === "rotation" ? 4 : 3, V = ch.values, cubic = ch.interp === "CUBICSPLINE";
    const val = (k) => { const o = (cubic ? k * 3 + 1 : k) * n; return Array.from(V.subarray(o, o + n)); };
    let out;
    if (t <= T[0]) out = val(0);
    else if (t >= T[T.length - 1]) out = val(T.length - 1);
    else {
      let k = 0;
      while (T[k + 1] < t) k++;
      const u = ch.interp === "STEP" ? 0 : (t - T[k]) / (T[k + 1] - T[k]), a = val(k), b = val(k + 1);
      out = n === 4 ? q.slerp(a, b, u) : v.lerp(a, b, u);
    }
    const key = ch.path === "translation" ? "t" : ch.path === "rotation" ? "r" : "s";
    L[ch.node][key] = n === 4 ? q.norm(out) : out;
  }
  return L;
}

/** World { p, q, s } of every node (uniform scale assumed per node, its x). */
export function worldPose(g, L) {
  const W = new Array(g.nodes.length);
  const visit = (i) => {
    if (W[i]) return W[i];
    const n = g.nodes[i], l = L[i];
    if (n.parent < 0) W[i] = { p: l.t.slice(), q: l.r.slice(), s: l.s[0] };
    else {
      const P = visit(n.parent);
      W[i] = { p: v.add(P.p, q.rot(P.q, v.mul(l.t, P.s))), q: q.norm(q.mul(P.q, l.r)), s: P.s * l.s[0] };
    }
    return W[i];
  };
  for (let i = 0; i < g.nodes.length; i++) visit(i);
  return W;
}

/** Local { t, r } of node i that puts it at world { p, q } under its parent's world. */
export function toLocal(g, W, i, p, rq) {
  const n = g.nodes[i];
  if (n.parent < 0) return { t: p, r: rq };
  const P = W[n.parent], iq = q.inv(P.q);
  return { t: v.mul(q.rot(iq, v.sub(p, P.p)), 1 / P.s), r: q.norm(q.mul(iq, rq)) };
}

/**
 * Write a GLB with the given node subtree (a skeleton: names, hierarchy, rest TRS) and animations.
 * anims: [{ name, times: Float32Array, tracks: [{ node (index into nodes), path, values: Float32Array }] }]
 */
export function writeClipsGLB(file, nodes, anims, extras = {}) {
  const chunks = [], bufferViews = [], accessors = [];
  let off = 0;
  const addAcc = (arr, type, minmax) => {
    const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), pad = (4 - (b.length % 4)) % 4;
    chunks.push(b, Buffer.alloc(pad));
    bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length });
    off += b.length + pad;
    const a = { bufferView: bufferViews.length - 1, componentType: 5126, count: arr.length / NCOMP[type], type };
    if (minmax) { a.min = [arr[0]]; a.max = [arr[arr.length - 1]]; }
    accessors.push(a);
    return accessors.length - 1;
  };
  const json = {
    asset: { version: "2.0", generator: "uccle-city tools/characters/retarget.mjs", extras },
    scene: 0, scenes: [{ nodes: nodes.map((n, i) => i).filter((i) => nodes[i].parent < 0) }],
    nodes: nodes.map((n) => {
      const o = { name: n.name };
      if (n.children.length) o.children = n.children;
      if (n.t.some((x) => x !== 0)) o.translation = n.t;
      if (n.r[3] !== 1) o.rotation = n.r;
      if (n.s.some((x) => x !== 1)) o.scale = n.s;
      return o;
    }),
    animations: anims.map((a) => {
      const input = addAcc(a.times, "SCALAR", true), samplers = [], channels = [];
      for (const tr of a.tracks) {
        samplers.push({ input, output: addAcc(tr.values, tr.path === "rotation" ? "VEC4" : "VEC3"), interpolation: "LINEAR" });
        channels.push({ sampler: samplers.length - 1, target: { node: tr.node, path: tr.path } });
      }
      return { name: a.name, samplers, channels, ...(a.extras ? { extras: a.extras } : {}) };
    }),
    accessors, bufferViews, buffers: [{ byteLength: off }],
  };
  const pad = (b, c) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, c)]);
  const j = pad(Buffer.from(JSON.stringify(json), "utf8"), 0x20), b = pad(Buffer.concat(chunks), 0);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + j.length + 8 + b.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(j.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(b.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(file, Buffer.concat([head, jh, j, bh, b]));
  return fs.statSync(file).size;
}
