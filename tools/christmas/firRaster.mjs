// A small SOFTWARE RASTERIZER for the fir's needle cards (offline, no GPU): what the GPU does with the alpha-tested
// cards, counted per pixel. Used by tools/christmas/firCost.mjs (the cost model: fragments x layers at 8 / 21 / 45 m,
// the shadow pass) and tools/christmas_pack.mjs (the hidden-card cull: a card no eye can see from any sampled
// viewpoint round the tree is moved past the drawn range).
//
// Pixel centres, edge functions, depth = 1 / w (perspective; larger = nearer) or the light-space depth (orthographic),
// UVs perspective-correct, the atlas' alpha point-sampled at level 0 (the KTX2's alpha mips are coverage-preserving:
// a level's share of texels >= 0.5 is level 0's, so level 0 gives the right coverage statistics at any distance).
// The GPU model counted: early depth TEST with a late WRITE (a shader with discard: the depth is written only for the
// texels that pass the alpha test), 2 x 2 quads (helper lanes: a quad touched by a triangle shades 4 lanes).
import fs from "node:fs";
import zlib from "node:zlib";

// ------------------------------------------------------------------------------------------------ the raw GLB
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const TYPED = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const NORMF = { 5126: 1, 5123: 65535, 5121: 255 };
/** an UNCOMPRESSED GLB (tools/blender/christmasKit.py's raw export) -> { node name: [{ slot, P, N, UV0, C, I }] } */
export function readGlb(file) {
  const glb = fs.readFileSync(file);
  const jl = glb.readUInt32LE(12), J = JSON.parse(glb.subarray(20, 20 + jl).toString()), binOff = 20 + jl + 8;
  const acc = (ai, asFloat = true) => {
    const a = J.accessors[ai], v = J.bufferViews[a.bufferView], n = SIZE[a.type], T = TYPED[a.componentType];
    const stride = v.byteStride || n * T.BYTES_PER_ELEMENT, base = binOff + (v.byteOffset || 0) + (a.byteOffset || 0);
    const out = new (asFloat ? Float32Array : Uint32Array)(a.count * n);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
      const o = base + i * stride + k * T.BYTES_PER_ELEMENT;
      const raw = T === Float32Array ? glb.readFloatLE(o) : T === Uint32Array ? glb.readUInt32LE(o) : T === Uint16Array ? glb.readUInt16LE(o) : glb.readUInt8(o);
      out[i * n + k] = asFloat && a.normalized ? raw / NORMF[a.componentType] : raw;
    }
    return out;
  };
  const meshes = {};
  for (const node of J.nodes) {
    if (node.mesh == null) continue;
    const t = node.translation || [0, 0, 0];
    meshes[node.name] = J.meshes[node.mesh].primitives.map((p) => {
      const A = p.attributes, P = acc(A.POSITION);
      for (let i = 0; i < P.length; i += 3) { P[i] += t[0]; P[i + 1] += t[1]; P[i + 2] += t[2]; }
      return { slot: J.materials[p.material].name, P, N: acc(A.NORMAL), UV0: A.TEXCOORD_0 != null ? acc(A.TEXCOORD_0) : null, C: A.COLOR_0 != null ? acc(A.COLOR_0) : null, I: acc(p.indices, false) };
    });
  }
  return meshes;
}

// ------------------------------------------------------------------------------------------------ the atlas' alpha
/** an 8-bit PNG (grey / RGB / grey+alpha / RGBA, not interlaced) -> { W, H, ch, data } */
export function decodePNG(file) {
  const b = fs.readFileSync(file);
  const W = b.readUInt32BE(16), H = b.readUInt32BE(20), depth = b[24], ct = b[25];
  if (depth !== 8 || b[28] !== 0) throw new Error(`${file}: only 8-bit non-interlaced PNGs`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct], idat = [];
  for (let o = 8; o < b.length;) { const L = b.readUInt32BE(o), t = b.toString("ascii", o + 4, o + 8); if (t === "IDAT") idat.push(b.subarray(o + 8, o + 8 + L)); o += 12 + L; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = W * ch, out = new Uint8Array(W * H * ch);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < H; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? row[i - ch] : 0, up = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      row[i] = v & 255;
    }
    prev = row;
  }
  return { W, H, ch, data: out };
}
/** the alpha test at 0.5 as a bit mask (glTF UV: (0, 0) = the image's top-left) */
export function alphaMask(png) {
  const { W, H, ch, data } = png, m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = data[i * ch + ch - 1] >= 128 ? 1 : 0;
  let cov = 0; for (let i = 0; i < W * H; i++) cov += m[i];
  return { W, H, m, coverage: cov / (W * H) };
}

// ------------------------------------------------------------------------------------------------ triangle sets
/** a primitive as a raster set: cards (alpha-tested, per-triangle card id) or opaque (occluders) */
export function makeSet(prim, { cards = false, keepTri = null } = {}) {
  let I = prim.I;
  if (keepTri) { const out = []; for (let t = 0; t < I.length / 3; t++) if (keepTri(t)) out.push(I[t * 3], I[t * 3 + 1], I[t * 3 + 2]); I = Uint32Array.from(out); }
  const set = { slot: prim.slot, P: prim.P, UV: cards ? prim.UV0 : null, I, cards, card: null, ncards: 0 };
  if (cards) { const r = cardIds(prim.P, prim.UV0, I); set.card = r.triCard; set.ncards = r.n; }
  return set;
}
/** connected components of a card primitive: vertices joined by the index AND by equal position + UV (a card's fold
 *  splits its vertices by normal; two cards at the same twig point differ by their UVs: never joined) */
export function cardIds(P, UV, I) {
  const nv = P.length / 3, par = new Int32Array(nv).map((_, i) => i);
  const fnd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const uni = (a, b) => { a = fnd(a); b = fnd(b); if (a !== b) par[a] = b; };
  const key = new Map();
  for (let i = 0; i < nv; i++) {
    const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)},${UV ? Math.round(UV[i * 2] * 1e5) + "," + Math.round(UV[i * 2 + 1] * 1e5) : ""}`;
    const o = key.get(k); if (o == null) key.set(k, i); else uni(i, o);
  }
  for (let t = 0; t < I.length; t += 3) { uni(I[t], I[t + 1]); uni(I[t], I[t + 2]); }
  const id = new Int32Array(nv).fill(-1), triCard = new Int32Array(I.length / 3);
  let n = 0;
  for (let t = 0; t < I.length / 3; t++) { const r = fnd(I[t * 3]); if (id[r] < 0) id[r] = n++; triCard[t] = id[r]; }
  return { triCard, n };
}

// ------------------------------------------------------------------------------------------------ views
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** a perspective eye (Y up): fovY in degrees, W x H pixels */
export function perspView(eye, target, fovY, W, H) {
  const f = norm(sub(target, eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const ty = Math.tan((fovY * Math.PI) / 360), tx = ty * W / H;
  return { type: "persp", eye, r, u, f, W, H, sx: W / (2 * tx), sy: H / (2 * ty), near: 0.3 };
}
/** an orthographic light view: `dir` = toward the light, `half` m half size round `center`, W x W texels */
export function orthoView(dir, center, half, W) {
  const f = norm(dir.map((x) => -x)), r = norm(cross(f, Math.abs(f[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0])), u = cross(r, f);
  return { type: "ortho", eye: sub(center, f.map((x) => x * 100)), r, u, f, W, H: W, sx: W / (2 * half), sy: W / (2 * half), near: 0 };
}

// ------------------------------------------------------------------------------------------------ the raster
/** draw the sets in order into one depth buffer. Returns per set { tris, fragAll, fragZ, fragCut, quadAll, quadZ, vis }
 *  (+ perCard: the final visible pixels per card when opts.perCard), and the frame's covered pixels.
 *  fragAll: every covered sample (all layers, after the frustum); fragZ: those passing the depth TEST when drawn
 *  (early test, late write: what a single alpha-tested pass shades); fragCut: those also passing the alpha test (they
 *  write depth); quadAll / quadZ: the 2 x 2 quads (x 4 lanes) touched by them; vis: the final pixels the set owns. */
export function rasterize(view, sets, { alpha = null, perCard = false, keep = false } = {}) {
  const { W, H } = view, depth = new Float32Array(W * H).fill(-Infinity), owner = new Int32Array(W * H).fill(-1);
  const ownCard = perCard ? new Int32Array(W * H).fill(-1) : null, ownTri = new Int32Array(W * H).fill(-1);
  const QW = (W + 1) >> 1, stampA = new Int32Array(QW * ((H + 1) >> 1)).fill(-1), stampZ = new Int32Array(QW * ((H + 1) >> 1)).fill(-1);
  const out = sets.map((s) => ({ tris: s.I.length / 3, verts: s.P.length / 3, fragAll: 0, fragZ: 0, fragCut: 0, quadAll: 0, quadZ: 0, vis: 0, quadEq: 0, perCard: perCard && s.cards ? new Uint32Array(s.ncards) : null }));
  const AM = alpha?.m, AW = alpha?.W ?? 1, AH = alpha?.H ?? 1;
  let triSerial = 0;
  for (let si = 0; si < sets.length; si++) {
    const S = sets[si], O = out[si], P = S.P, I = S.I, UV = S.UV, nv = P.length / 3;
    // project every vertex once
    const X = new Float32Array(nv), Y = new Float32Array(nv), Z = new Float32Array(nv), ok = new Uint8Array(nv);
    for (let i = 0; i < nv; i++) {
      const d = [P[i * 3] - view.eye[0], P[i * 3 + 1] - view.eye[1], P[i * 3 + 2] - view.eye[2]];
      const z = dot(d, view.f);
      if (view.type === "persp") {
        if (z < view.near) continue;
        ok[i] = 1; X[i] = W / 2 + (dot(d, view.r) / z) * view.sx; Y[i] = H / 2 - (dot(d, view.u) / z) * view.sy; Z[i] = 1 / z;
      } else { ok[i] = 1; X[i] = W / 2 + dot(d, view.r) * view.sx; Y[i] = H / 2 - dot(d, view.u) * view.sy; Z[i] = -z; }
    }
    const persp = view.type === "persp";
    for (let t = 0; t < I.length / 3; t++) {
      const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
      triSerial++;
      if (!ok[a] || !ok[b] || !ok[c]) continue;
      const x0 = X[a], y0 = Y[a], x1 = X[b], y1 = Y[b], x2 = X[c], y2 = Y[c];
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (area === 0) continue;
      let minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
      let minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minX > maxX || minY > maxY) continue;
      const inv = 1 / area, z0 = Z[a], z1 = Z[b], z2 = Z[c];
      // (perspective-correct UV: u / w and v / w interpolated linearly, divided by 1 / w)
      let u0 = 0, u1 = 0, u2 = 0, v0 = 0, v1 = 0, v2 = 0;
      if (UV) {
        const wa = persp ? z0 : 1, wb = persp ? z1 : 1, wc = persp ? z2 : 1;
        u0 = UV[a * 2] * wa; v0 = UV[a * 2 + 1] * wa; u1 = UV[b * 2] * wb; v1 = UV[b * 2 + 1] * wb; u2 = UV[c * 2] * wc; v2 = UV[c * 2 + 1] * wc;
      }
      const card = S.card ? S.card[t] : -1;
      for (let py = minY; py <= maxY; py++) {
        const yc = py + 0.5;
        for (let px = minX; px <= maxX; px++) {
          const xc = px + 0.5;
          const w0 = ((x1 - xc) * (y2 - yc) - (x2 - xc) * (y1 - yc)) * inv;
          const w1 = ((x2 - xc) * (y0 - yc) - (x0 - xc) * (y2 - yc)) * inv;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * z0 + w1 * z1 + w2 * z2, pi = py * W + px;
          O.fragAll++;
          const q = (py >> 1) * QW + (px >> 1);
          if (stampA[q] !== triSerial) { stampA[q] = triSerial; O.quadAll += 4; }
          if (z <= depth[pi]) continue;
          O.fragZ++;
          if (stampZ[q] !== triSerial) { stampZ[q] = triSerial; O.quadZ += 4; }
          if (UV && AM) {
            const iw = persp ? 1 / z : 1;
            const u = (w0 * u0 + w1 * u1 + w2 * u2) * iw, v = (w0 * v0 + w1 * v1 + w2 * v2) * iw;
            const tx = Math.min(AW - 1, Math.max(0, (u * AW) | 0)), ty = Math.min(AH - 1, Math.max(0, (v * AH) | 0));
            if (!AM[ty * AW + tx]) continue;
          }
          O.fragCut++;
          depth[pi] = z; owner[pi] = si; ownTri[pi] = triSerial;
          if (ownCard) ownCard[pi] = card;
        }
      }
    }
  }
  // the EQUAL-depth colour pass after a depth pre-pass: per 2 x 2 quad, one quad (4 lanes) per distinct triangle that
  // owns a pixel of it (the lit shader runs once per visible pixel + the quad's helper lanes)
  for (let qy = 0; qy < H; qy += 2) for (let qx = 0; qx < W; qx += 2) {
    const ids = [];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x = qx + dx, y = qy + dy; if (x >= W || y >= H) continue;
      const i = y * W + x; if (owner[i] < 0 || ids.includes(ownTri[i])) continue;
      ids.push(ownTri[i]); out[owner[i]].quadEq += 4;
    }
  }
  let covered = 0;
  for (let i = 0; i < W * H; i++) {
    const s = owner[i]; if (s < 0) continue;
    covered++; out[s].vis++;
    if (ownCard && out[s].perCard && ownCard[i] >= 0) out[s].perCard[ownCard[i]]++;
  }
  return { sets: out, covered, W, H, ...(keep ? { owner, depth } : {}) };
}
