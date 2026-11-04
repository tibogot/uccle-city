// CAR PACKS -> one GLB per source (models/cars/<source>.glb), for the Car Lab comparison (labs/car-lab.html?mode=compare).
//
//   node tools/cars/convertPacks.mjs            all sources
//   node tools/cars/convertPacks.mjs kenney     one source;  --survey  prints each car's palette swatches / materials
//
// Inputs (CC0, downloaded by hand, git-ignored, read as plain data: nothing in them is executed):
//   data/raw/cars/kenney/kit/Models/GLB format/*.glb + Textures/colormap.png   Kenney "Car Kit" 3.1 (kenney.nl)
//   data/raw/cars/quaternius/glb/*.glb                                         Quaternius "Cars Pack" (poly.pizza bundle)
//
// What it does, per car (all in this file, no Blender: the packs are already triangle meshes):
//   - flattens the node tree (TRS + children) into world space; wheels found by node name, rear axles split by x sign
//   - colours BAKED TO VERTEX COLOURS: Kenney's palette texture sampled per corner at its UV (clamped into the face's
//     swatch, so the gradients stay and no neighbour bleeds in), Quaternius' flat material colours per primitive.
//     sRGB texels -> linear (glTF COLOR_0 is linear). One material then draws every car of a source.
//   - _KIND per vertex: 0 fixed colour, 1 body paint (COLOR_0 then holds the shade, the viewer multiplies the paint
//     colour in: per-instance colour variety), 2 head lights, 3 tail lights, 4 glass. The car's own paint colour goes
//     in the node's extras (paint), so "as designed" can be shown too. Taxis and police cars keep their livery.
//   - axes: +z forward, +x left, y up, wheels on y = 0, origin midway between the axles (as tools/blender/car.py)
//   - Kenney's cars are toys (2.5 m long, 1.5 m wide, 1.1-1.3 m tall): stretched to a real footprint ALONG Z PIECEWISE,
//     over the wheel arches with the height's factor (arches stay round round the wheels), the rest of the length
//     taken by the bonnet / cabin / boot; x scaled to the real width; y by up to 1.2 towards the real height, wheels
//     scaled with it (radius 0.30 -> 0.36 m). Quaternius is life size already.
//   - no LODs here: the viewer makes them with meshoptimizer at load (viewer/drive/carPacks.js)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const RAW = path.join(ROOT, "data/raw/cars");
const OUT = path.join(ROOT, "models/cars");

// ---------------------------------------------------------------------------------------------- the picks
const SOURCES = {
  kenney: {
    dir: "kenney/kit/Models/GLB format", texture: "Textures/colormap.png", credit: "Kenney, Car Kit 3.1 (kenney.nl), CC0",
    cars: [
      // file, id, label, type, target length / width (m); swatches: palette cells of the body paint / glass / lights
      { file: "hatchback-sports.glb", id: "hatchback", label: "hatchback", type: "hatchback", L: 4.15, W: 1.80, H: 1.45 },
      { file: "sedan.glb", id: "sedan", label: "saloon", type: "sedan", L: 4.65, W: 1.82, H: 1.46 },
      { file: "taxi.glb", id: "taxi", label: "taxi", type: "taxi", L: 4.70, W: 1.82, H: 1.62, keepPaint: true },
      { file: "suv.glb", id: "suv", label: "SUV", type: "suv", L: 4.55, W: 1.86, H: 1.68 },
      { file: "van.glb", id: "van", label: "MPV / van", type: "van", L: 4.85, W: 1.92, H: 1.80 },
      { file: "delivery.glb", id: "delivery", label: "delivery van", type: "van", L: 5.40, W: 2.02, H: 2.30 },
    ],
  },
  quaternius: {
    dir: "quaternius/glb", credit: "Quaternius, Cars Pack (quaternius.com, via poly.pizza), CC0",
    cars: [
      { file: "car_a.glb", id: "car_a", label: "hatchback (NormalCar1)", type: "hatchback" },
      { file: "car_b.glb", id: "car_b", label: "saloon (NormalCar2)", type: "sedan" },
      { file: "taxi.glb", id: "taxi", label: "taxi", type: "taxi", keepPaint: true },
      { file: "suv.glb", id: "suv", label: "SUV", type: "suv" },
      { file: "police.glb", id: "police", label: "police", type: "police", keepPaint: true },
    ],
  },
};
// Kenney palette cells (16 x 4 swatches of 32 x 128 px), read off colormap.png and the --survey of the six cars
const K_GLASS = new Set([48, 49]);               // white / ice blue: windows
const K_HEAD = new Set([50, 51]);                // yellow: head lights
const K_TAIL = new Set([52, 53]);                // red: tail lights
const K_FIXED = new Set([34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]);   // the dark / grey cells: tyres, sills, bumpers, trim

// ---------------------------------------------------------------------------------------------- GLB / PNG reading
function readGlb(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  let o = 12, json = null, bin = null;
  while (o < b.length) {
    const len = b.readUInt32LE(o), type = b.readUInt32LE(o + 4), chunk = b.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8")); else if (type === 0x004e4942) bin = chunk;
    o += 8 + len;
  }
  return { json, bin };
}
const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function accessor(g, i) {
  const a = g.json.accessors[i], v = g.json.bufferViews[a.bufferView], [T, size] = COMP[a.componentType], n = NCOMP[a.type];
  const stride = v.byteStride || size * n, base = (v.byteOffset || 0) + (a.byteOffset || 0), out = new Float64Array(a.count * n);
  const dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.byteLength);
  const get = { 5120: "getInt8", 5121: "getUint8", 5122: "getInt16", 5123: "getUint16", 5125: "getUint32", 5126: "getFloat32" }[a.componentType];
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[get](base + k * stride + c * size, true);
  if (a.normalized) { const m = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType]; for (let k = 0; k < out.length; k++) out[k] /= m; }
  return out;
}
function readPng(file) {
  const b = fs.readFileSync(file);
  let o = 8, w = 0, h = 0, ct = 0, bd = 0, il = 0; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString("latin1", o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; }
    else if (type === "IDAT") idat.push(d);
    o += 12 + len;
  }
  if (bd !== 8 || il !== 0 || (ct !== 6 && ct !== 2)) throw new Error(`${file}: only 8-bit RGB(A), non-interlaced PNGs`);
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), px = new Uint8Array(w * h * 4), row = w * bpp;
  let prev = new Uint8Array(row);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (row + 1)], cur = new Uint8Array(raw.subarray(y * (row + 1) + 1, (y + 1) * (row + 1)));
    for (let x = 0; x < row; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = up; else if (f === 3) p = (a + up) >> 1;
      else if (f === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[x] = (cur[x] + p) & 255;
    }
    for (let x = 0; x < w; x++) { for (let c = 0; c < 3; c++) px[(y * w + x) * 4 + c] = cur[x * bpp + c]; px[(y * w + x) * 4 + 3] = bpp === 4 ? cur[x * 4 + 3] : 255; }
    prev = cur;
  }
  return { w, h, px };
}
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

// ---------------------------------------------------------------------------------------------- 4x4 (column-major)
const mul = (a, b) => { const o = new Float64Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
function trs(n) {
  if (n.matrix) return Float64Array.from(n.matrix);
  const [tx, ty, tz] = n.translation || [0, 0, 0], [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1];
  return Float64Array.from([
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1]);
}
const I4 = Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

// ---------------------------------------------------------------------------------------------- one car -> triangle soup
/** -> [{ part: "body" | "wheel", pos, nrm, col, kind, idx }] in world space (soups, indexed per primitive) */
function flatten(g, sample) {
  const out = [];
  const roots = g.json.scenes?.[g.json.scene || 0]?.nodes ?? g.json.nodes.map((_, i) => i);
  const walk = (ni, parentM, parentName) => {
    const n = g.json.nodes[ni], M = mul(parentM, trs(n)), name = n.name || parentName || "";
    if (n.mesh != null) for (const p of g.json.meshes[n.mesh].primitives) {
      const P = accessor(g, p.attributes.POSITION), N = p.attributes.NORMAL != null ? accessor(g, p.attributes.NORMAL) : null;
      const UV = p.attributes.TEXCOORD_0 != null ? accessor(g, p.attributes.TEXCOORD_0) : null;
      const idx = p.indices != null ? Uint32Array.from(accessor(g, p.indices)) : Uint32Array.from({ length: P.length / 3 }, (_, k) => k);
      const nv = P.length / 3, pos = new Float64Array(nv * 3), nrm = new Float64Array(nv * 3);
      for (let k = 0; k < nv; k++) {
        const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2];
        for (let r = 0; r < 3; r++) pos[k * 3 + r] = M[r] * x + M[4 + r] * y + M[8 + r] * z + M[12 + r];
        if (N) { const a = N[k * 3], b = N[k * 3 + 1], c = N[k * 3 + 2]; for (let r = 0; r < 3; r++) nrm[k * 3 + r] = M[r] * a + M[4 + r] * b + M[8 + r] * c; }   // no shear in these packs
      }
      const mat = g.json.materials?.[p.material] || {};
      out.push({ node: name, mat: mat.name || "", pos, nrm, uv: UV, idx, base: mat.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1] });
    }
    for (const c of n.children || []) walk(c, M, name);
  };
  for (const r of roots) walk(r, I4, "");
  return out;
}

/** De-index into per-corner vertices (colours are per corner), colour + kind per corner via colorOf(prim, tri, corner). */
function bake(prims, colorOf) {
  const parts = new Map();
  for (const p of prims) {
    const key = p.wheel || "body";
    const P = parts.get(key) || parts.set(key, { pos: [], nrm: [], col: [], kind: [] }).get(key);
    for (let t = 0; t < p.idx.length / 3; t++) {
      const res = colorOf(p, t);
      for (let c = 0; c < 3; c++) {
        const v = p.idx[t * 3 + c];
        P.pos.push(p.pos[v * 3], p.pos[v * 3 + 1], p.pos[v * 3 + 2]);
        const nx = p.nrm[v * 3], ny = p.nrm[v * 3 + 1], nz = p.nrm[v * 3 + 2], l = Math.hypot(nx, ny, nz) || 1;
        P.nrm.push(nx / l, ny / l, nz / l);
        P.col.push(...res.col[c]); P.kind.push(res.kind);
      }
    }
  }
  return parts;
}

/** Weld identical corners (position + normal + colour + kind) back into an indexed mesh. */
function weld(P) {
  const map = new Map(), pos = [], nrm = [], col = [], kind = [], idx = [];
  const q = (v) => Math.round(v * 1e5);
  for (let k = 0; k < P.kind.length; k++) {
    const key = [q(P.pos[k * 3]), q(P.pos[k * 3 + 1]), q(P.pos[k * 3 + 2]), q(P.nrm[k * 3]), q(P.nrm[k * 3 + 1]), q(P.nrm[k * 3 + 2]),
      q(P.col[k * 3]), q(P.col[k * 3 + 1]), q(P.col[k * 3 + 2]), P.kind[k]].join(",");
    let i = map.get(key);
    if (i == null) { i = kind.length; map.set(key, i); pos.push(P.pos[k * 3], P.pos[k * 3 + 1], P.pos[k * 3 + 2]); nrm.push(P.nrm[k * 3], P.nrm[k * 3 + 1], P.nrm[k * 3 + 2]); col.push(P.col[k * 3], P.col[k * 3 + 1], P.col[k * 3 + 2]); kind.push(P.kind[k]); }
    idx.push(i);
  }
  // drop degenerate triangles (zero area after the weld)
  const out = [];
  for (let t = 0; t < idx.length; t += 3) if (idx[t] !== idx[t + 1] && idx[t + 1] !== idx[t + 2] && idx[t] !== idx[t + 2]) out.push(idx[t], idx[t + 1], idx[t + 2]);
  return { pos, nrm, col, kind, idx: out };
}

const bboxOf = (arrs) => {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const a of arrs) for (let k = 0; k < a.length; k += 3) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], a[k + c]); hi[c] = Math.max(hi[c], a[k + c]); }
  return { lo, hi };
};

// ---------------------------------------------------------------------------------------------- per source
function wheelKey(nodeName, mat) {
  const n = nodeName.toLowerCase();
  if (!/wheel/.test(n) || /wheel-back$/.test(n)) return null;            // Kenney SUV: "wheel-back" = the spare on the tailgate
  return /back|rear/.test(n) ? "R" : "F";                                // left / right from x after the axes are set
}

function convertCar(src, car, opts) {
  const g = readGlb(path.join(RAW, src.dir, car.file));
  const prims = flatten(g);
  for (const p of prims) p.axle = wheelKey(p.node, p.mat);
  // ---- orientation: +z forward. Kenney faces +z (front wheels at +z). Quaternius: the head lights tell.
  let flip = false;
  if (src === SOURCES.quaternius) {
    let s = 0, n = 0;
    for (const p of prims) if (/headlight/i.test(p.mat)) for (let k = 2; k < p.pos.length; k += 3) { s += p.pos[k]; n++; }
    flip = n > 0 && s / n < 0;
  } else {
    let s = 0, n = 0;
    for (const p of prims) if (p.axle === "F") for (let k = 2; k < p.pos.length; k += 3) { s += p.pos[k]; n++; }
    flip = n > 0 && s / n < 0;
  }
  if (flip) for (const p of prims) for (let k = 0; k < p.pos.length; k += 3) { p.pos[k] *= -1; p.pos[k + 2] *= -1; p.nrm[k] *= -1; p.nrm[k + 2] *= -1; }
  // ---- split axles into wheels by x sign (Quaternius' rear axle is one mesh), per triangle
  const split = [];
  for (const p of prims) {
    if (!p.axle) { split.push(p); continue; }
    const L = [], R = [];
    for (let t = 0; t < p.idx.length; t += 3) {
      const cx = (p.pos[p.idx[t] * 3] + p.pos[p.idx[t + 1] * 3] + p.pos[p.idx[t + 2] * 3]) / 3;
      (cx > 0 ? L : R).push(p.idx[t], p.idx[t + 1], p.idx[t + 2]);
    }
    if (L.length) split.push({ ...p, idx: Uint32Array.from(L), wheel: p.axle + "L" });
    if (R.length) split.push({ ...p, idx: Uint32Array.from(R), wheel: p.axle + "R" });
  }
  // ---- colours
  let colorOf, survey = null;
  if (src === SOURCES.kenney) {
    const tex = opts.tex, cellW = tex.w / 16, cellH = tex.h / 4;
    const texel = (u, v) => { const x = Math.min(tex.w - 1, Math.max(0, Math.floor(u))), y = Math.min(tex.h - 1, Math.max(0, Math.floor(v))), o = (y * tex.w + x) * 4; return [tex.px[o], tex.px[o + 1], tex.px[o + 2]]; };
    // the body paint = the biggest-area cell that is not glass / lights / grey (red cars: the red cell wins over tail lights by area)
    const area = new Map();
    const cellOf = (p, t) => {
      let u = 0, v = 0;
      for (let c = 0; c < 3; c++) { const i = p.idx[t * 3 + c]; u += p.uv[i * 2]; v += p.uv[i * 2 + 1]; }
      return Math.min(15, Math.floor(u / 3 * 16)) + 16 * Math.min(3, Math.floor(v / 3 * 4));
    };
    const triArea = (p, t) => {
      const a = p.idx[t * 3] * 3, b = p.idx[t * 3 + 1] * 3, c = p.idx[t * 3 + 2] * 3;
      const ux = p.pos[b] - p.pos[a], uy = p.pos[b + 1] - p.pos[a + 1], uz = p.pos[b + 2] - p.pos[a + 2], vx = p.pos[c] - p.pos[a], vy = p.pos[c + 1] - p.pos[a + 1], vz = p.pos[c + 2] - p.pos[a + 2];
      return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    };
    for (const p of split) if (!p.wheel) for (let t = 0; t < p.idx.length / 3; t++) { const k = cellOf(p, t); area.set(k, (area.get(k) || 0) + triArea(p, t)); }
    const ranked = [...area].sort((a, b) => b[1] - a[1]);
    survey = ranked.map(([k, a]) => { const c = texel((k % 16 + 0.5) * cellW, (Math.floor(k / 16) + 0.5) * cellH); return `cell ${k} rgb(${c}) ${a.toFixed(2)} m²`; });
    const paintCell = ranked.find(([k]) => !K_GLASS.has(k) && !K_HEAD.has(k) && !K_FIXED.has(k))?.[0];
    const mean = (k) => { const c = texel((k % 16 + 0.5) * cellW, (Math.floor(k / 16) + 0.5) * cellH).map(toLin); return c; };
    const paintLin = paintCell != null ? mean(paintCell) : [0.5, 0.5, 0.5];
    const paintLum = 0.2126 * paintLin[0] + 0.7152 * paintLin[1] + 0.0722 * paintLin[2];
    car.paint = paintLin;
    colorOf = (p, t) => {
      const k = cellOf(p, t), x0 = (k % 16) * cellW, y0 = Math.floor(k / 16) * cellH;
      const kind = p.wheel ? 0 : k === paintCell && !car.keepPaint ? 1 : K_GLASS.has(k) ? 4 : K_HEAD.has(k) ? 2 : K_TAIL.has(k) && k !== paintCell ? 3 : 0;
      const col = [];
      for (let c = 0; c < 3; c++) {
        const i = p.idx[t * 3 + c];
        const u = Math.min(x0 + cellW - 1.5, Math.max(x0 + 1.5, p.uv[i * 2] * tex.w)), v = Math.min(y0 + cellH - 1.5, Math.max(y0 + 1.5, p.uv[i * 2 + 1] * tex.h));
        const lin = texel(u, v).map(toLin);
        if (kind === 1) { const s = (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]) / (paintLum || 1); col.push([s, s, s]); }   // the swatch's gradient as a shade
        else col.push(lin);
      }
      return { col, kind };
    };
  } else {
    const FIXED = /^(black|grey|gray)/i;
    const area = new Map();
    for (const p of split) if (!p.wheel) area.set(p.mat, (area.get(p.mat) || 0) + p.idx.length);
    survey = [...area].map(([m, n]) => `${m} ${n / 3} tris`);
    const isPaint = (m) => !/window|headlight|taillight/i.test(m) && !FIXED.test(m);
    const paintMat = [...area].filter(([m]) => isPaint(m)).sort((a, b) => b[1] - a[1])[0]?.[0];
    car.paint = (prims.find((p) => p.mat === paintMat)?.base || [0.5, 0.5, 0.5]).slice(0, 3);
    colorOf = (p) => {
      const m = p.mat, b = p.base.slice(0, 3);
      const kind = p.wheel ? 0 : /window/i.test(m) ? 4 : /headlight/i.test(m) ? 2 : /taillight/i.test(m) ? 3 : m === paintMat && !car.keepPaint ? 1 : 0;
      const col = kind === 1 ? [1, 1, 1] : b;
      return { col: [col, col, col], kind };
    };
  }
  // ---- bake, then the axes / origin / scale
  let parts = bake(split, colorOf);
  const all = bboxOf([...parts.values()].map((p) => p.pos));
  const wheels = [...parts.keys()].filter((k) => k !== "body");
  const wb = Object.fromEntries(wheels.map((k) => [k, bboxOf([parts.get(k).pos])]));
  const ground = Math.min(...wheels.map((k) => wb[k].lo[1]));
  const zF = wheels.filter((k) => k[0] === "F").map((k) => (wb[k].lo[2] + wb[k].hi[2]) / 2), zR = wheels.filter((k) => k[0] === "R").map((k) => (wb[k].lo[2] + wb[k].hi[2]) / 2);
  const zMid = (Math.max(...zF) + Math.min(...zR)) / 2, xMid = (all.lo[0] + all.hi[0]) / 2;
  const L0 = all.hi[2] - all.lo[2], W0 = all.hi[0] - all.lo[0];
  // piecewise z map for Kenney: slope 1 within +-arch of each axle, slope k elsewhere, to reach car.L
  let zmap = (z) => z - zMid, sx = 1, sy = 1;
  if (car.L) {
    sy = Math.min(1.2, Math.max(1, car.H / (all.hi[1] - ground)));
    const r = Math.max(...wheels.map((k) => (wb[k].hi[1] - wb[k].lo[1]) / 2)), arch = r * 1.45;
    const knots = [all.lo[2], ...[Math.min(...zR), Math.max(...zF)].flatMap((z) => [z - arch, z + arch]), all.hi[2]].map((z) => Math.min(all.hi[2], Math.max(all.lo[2], z))).sort((a, b) => a - b);
    const keep = 4 * arch, k = (car.L - keep * sy) / (L0 - keep);
    const zs = [0];
    for (let i = 1; i < knots.length; i++) zs.push(zs[i - 1] + (knots[i] - knots[i - 1]) * (i % 2 === 0 ? sy : k));   // segments 2, 4 = arches (slope sy)
    const f = (z) => { for (let i = 1; i < knots.length; i++) if (z <= knots[i] || i === knots.length - 1) { const t = (z - knots[i - 1]) / ((knots[i] - knots[i - 1]) || 1); return zs[i - 1] + t * (zs[i] - zs[i - 1]); } return 0; };
    const mid = (f(Math.max(...zF)) + f(Math.min(...zR))) / 2;
    zmap = (z) => f(z) - mid;
    sx = car.W / W0;
    car.slope = k;
  }
  const out = { id: car.id, label: car.label, type: car.type, paint: car.paint, keepPaint: !!car.keepPaint, parts: {} };
  for (const [key, P] of parts) {
    const c = key === "body" ? null : wb[key];
    const cx = c ? (c.lo[0] + c.hi[0]) / 2 : 0, cy = c ? (c.lo[1] + c.hi[1]) / 2 : 0, cz = c ? (c.lo[2] + c.hi[2]) / 2 : 0;
    const origin = c ? [(cx - xMid) * sx, (cy - ground) * sy, zmap(cz)] : [0, 0, 0];
    for (let k = 0; k < P.pos.length; k += 3) {
      if (c) {   // wheels: x width scaled about the wheel centre, radius kept, then moved to the mapped centre (stored in the node)
        P.pos[k] = (P.pos[k] - cx) * sx; P.pos[k + 1] = (P.pos[k + 1] - cy) * sy; P.pos[k + 2] = (P.pos[k + 2] - cz) * sy;
      } else {
        const z = P.pos[k + 2], dz = car.L ? (zmap(z + 1e-3) - zmap(z - 1e-3)) / 2e-3 : 1;   // local z slope, for the normals
        P.pos[k] = (P.pos[k] - xMid) * sx; P.pos[k + 1] = (P.pos[k + 1] - ground) * sy; P.pos[k + 2] = zmap(z);
        // normals under the scale diag(sx, sy, dz): n' = n / scale, renormalised
        const nx = P.nrm[k] / sx, ny = P.nrm[k + 1] / sy, nz = P.nrm[k + 2] / dz, l = Math.hypot(nx, ny, nz) || 1;
        P.nrm[k] = nx / l; P.nrm[k + 1] = ny / l; P.nrm[k + 2] = nz / l;
      }
    }
    if (c) for (let k = 0; k < P.pos.length; k += 3) { const nx = P.nrm[k] / sx, ny = P.nrm[k + 1] / sy, nz = P.nrm[k + 2] / sy, l = Math.hypot(nx, ny, nz) || 1; P.nrm[k] = nx / l; P.nrm[k + 1] = ny / l; P.nrm[k + 2] = nz / l; }
    out.parts[key === "body" ? "body" : key[0] + key[1]] = { mesh: weld(P), origin };
  }
  const bb = bboxOf(Object.values(out.parts).map((p) => p.mesh.pos.map((v, i) => v + p.origin[i % 3])));
  out.size = [bb.hi[0] - bb.lo[0], bb.hi[1] - bb.lo[1], bb.hi[2] - bb.lo[2]].map((v) => +v.toFixed(3));
  out.tris = Object.values(out.parts).reduce((s, p) => s + p.mesh.idx.length / 3, 0);
  return { out, survey };
}

// ---------------------------------------------------------------------------------------------- GLB writing
function writeGlb(file, cars, credit) {
  const chunks = [], views = [], accessors = [], meshes = [], nodes = [];
  let off = 0;
  const push = (typed, target) => {
    const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), pad = (4 - (b.length % 4)) % 4;
    views.push({ buffer: 0, byteOffset: off, byteLength: b.length, ...(target ? { target } : {}) });
    chunks.push(b, Buffer.alloc(pad)); off += b.length + pad;
    return views.length - 1;
  };
  const acc = (arr, type, comp, minmax, target) => {
    const typed = comp === 5126 ? Float32Array.from(arr) : comp === 5125 ? Uint32Array.from(arr) : Uint16Array.from(arr);
    const a = { bufferView: push(typed, target), componentType: comp, count: arr.length / NCOMP[type], type };
    if (minmax) { const n = NCOMP[type]; a.min = Array(n).fill(Infinity); a.max = Array(n).fill(-Infinity); for (let k = 0; k < arr.length; k++) { a.min[k % n] = Math.min(a.min[k % n], typed[k]); a.max[k % n] = Math.max(a.max[k % n], typed[k]); } }
    accessors.push(a); return accessors.length - 1;
  };
  const roots = [];
  for (const car of cars) {
    const kids = [];
    for (const [name, { mesh, origin }] of Object.entries(car.parts)) {
      const prim = {
        attributes: { POSITION: acc(mesh.pos, "VEC3", 5126, true, 34962), NORMAL: acc(mesh.nrm, "VEC3", 5126, false, 34962), COLOR_0: acc(mesh.col, "VEC3", 5126, false, 34962), _KIND: acc(mesh.kind, "SCALAR", 5126, false, 34962) },
        indices: acc(mesh.idx, "SCALAR", mesh.pos.length / 3 > 65535 ? 5125 : 5123, false, 34963), material: 0,
      };
      meshes.push({ name: `${car.id}_${name}`, primitives: [prim] });
      nodes.push({ name: name === "body" ? "Body" : `Wheel_${name}`, mesh: meshes.length - 1, translation: origin.map((v) => +v.toFixed(5)) });
      kids.push(nodes.length - 1);
    }
    nodes.push({ name: car.id, children: kids, extras: { label: car.label, type: car.type, paint: car.paint.map((v) => +v.toFixed(4)), keepPaint: car.keepPaint, size: car.size, tris: car.tris } });
    roots.push(nodes.length - 1);
  }
  const json = {
    asset: { version: "2.0", generator: "uccle-city tools/cars/convertPacks.mjs", copyright: credit },
    scene: 0, scenes: [{ nodes: roots }], nodes, meshes, accessors, bufferViews: views, buffers: [{ byteLength: off }],
    materials: [{ name: "CarPalette", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
  };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const bin = Buffer.concat(chunks);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  fs.writeFileSync(file, Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]));
}

// ---------------------------------------------------------------------------------------------- main
const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const SURVEY = process.argv.includes("--survey");
fs.mkdirSync(OUT, { recursive: true });
for (const [name, src] of Object.entries(SOURCES)) {
  if (want.length && !want.includes(name)) continue;
  const opts = src.texture ? { tex: readPng(path.join(RAW, src.dir, src.texture)) } : {};
  const cars = [];
  for (const car of src.cars) {
    const { out, survey } = convertCar(src, { ...car }, opts);
    cars.push(out);
    console.log(`${name}/${out.id}: ${out.tris} tris, ${out.size.map((v) => v.toFixed(2)).join(" x ")} m (w h l), paint ${out.paint.map((v) => v.toFixed(3))}${out.keepPaint ? " (kept)" : ""}`);
    if (SURVEY) for (const s of survey) console.log("    " + s);
  }
  const file = path.join(OUT, `${name}.glb`);
  writeGlb(file, cars, src.credit);
  console.log(`-> ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}
