// TILE PACK (perfgame round 4, viewer/tileCache.js): a built tile (plain objects, arrays, typed arrays, Maps, Sets,
// numbers incl. NaN / +-Infinity) as ONE binary blob and back, for the Cache API (Response bodies), which does not
// structured-clone. Layout: [u32 skeleton length][skeleton JSON utf-8][pad to 8][buffers back to back, each 8-aligned].
// Like a structured clone it keeps SHARED REFERENCES (an object / array / Map / Set reached twice comes back as one
// object, cycles too: the road graph's nodes are shared by its roads, and code keys Maps on them) and shared typed
// arrays. Tags (keys starting with \u0000): t = a typed array / ArrayBuffer { kind, o: byte offset, n: length },
// n = a number JSON cannot hold, u = undefined in an array, m = Map entries, s = Set values, i / v = an object reached
// more than once (its id, its value), r = a later reference to it.
const KINDS = { Float32Array, Float64Array, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray, BigInt64Array, BigUint64Array };
const T = "\u0000t", N = "\u0000n", M = "\u0000m", S = "\u0000s", U = "\u0000u", I = "\u0000i", V = "\u0000v", R = "\u0000r";
const isBin = (v) => ArrayBuffer.isView(v) || v instanceof ArrayBuffer;

export function packTile(root) {
  // pass 1: how many times each container is reached
  const count = new Map();
  const walk = (v) => {
    if (v === null || typeof v !== "object" || isBin(v)) return;
    const c = count.get(v) || 0;
    count.set(v, c + 1);
    if (c) return;
    if (v instanceof Map) { for (const [k, x] of v) { walk(k); walk(x); } return; }
    if (v instanceof Set || Array.isArray(v)) { for (const x of v) walk(x); return; }
    for (const k of Object.keys(v)) walk(v[k]);
  };
  walk(root);
  const bufs = []; let off = 0;
  const bin = new Map(), ids = new Map(), views = new Map();
  let nextId = 0;
  const enc = (v) => {
    if (v === null || typeof v === "boolean" || typeof v === "string") return v;
    if (typeof v === "number") return Number.isFinite(v) ? v : { [N]: String(v) };
    if (v === undefined) return { [U]: 1 };
    if (typeof v !== "object") return null;
    if (isBin(v)) {
      // each ArrayBuffer once, whole; views keep their offset into it (two views of one buffer stay one buffer)
      const buf = v instanceof ArrayBuffer ? v : v.buffer;
      let o = bin.get(buf);
      if (o === undefined) { off = (off + 7) & ~7; o = off; bufs.push([off, new Uint8Array(buf)]); off += buf.byteLength; bin.set(buf, o); }
      if (views.has(v)) return views.get(v);
      const ref = v instanceof ArrayBuffer ? { [T]: "ArrayBuffer", o, n: buf.byteLength } : { [T]: v.constructor.name, o, n: v.length, bo: v.byteOffset, bl: buf.byteLength, w: views.size };
      views.set(v, ref);
      return ref;
    }
    const shared = count.get(v) > 1;
    if (shared && ids.has(v)) return { [R]: ids.get(v) };
    let id = -1;
    if (shared) { id = nextId++; ids.set(v, id); }
    let out;
    if (v instanceof Map) out = { [M]: [...v].map(([k, x]) => [enc(k), enc(x)]) };
    else if (v instanceof Set) out = { [S]: [...v].map(enc) };
    else if (Array.isArray(v)) out = v.map(enc);
    else { out = {}; for (const k of Object.keys(v)) { const x = v[k]; if (x !== undefined && typeof x !== "function") out[k] = enc(x); } }
    return shared ? { [I]: id, [V]: out } : out;
  };
  const skel = new TextEncoder().encode(JSON.stringify(enc(root)));
  const head = (4 + skel.byteLength + 7) & ~7;
  const out = new Uint8Array(head + off);
  new DataView(out.buffer).setUint32(0, skel.byteLength, true);
  out.set(skel, 4);
  for (const [o, b] of bufs) out.set(b, head + o);
  return out;
}

export function unpackTile(ab) {
  const u8 = new Uint8Array(ab), len = new DataView(ab).getUint32(0, true);
  const skel = JSON.parse(new TextDecoder().decode(u8.subarray(4, 4 + len)));
  const head = (4 + len + 7) & ~7;
  const made = new Map(), byId = new Map(), viewsMade = new Map();
  // decode `v` into a fresh container registered under `id` BEFORE its children (a cycle finds it)
  const fill = (v, id) => {
    if (Array.isArray(v)) { const a = []; if (id >= 0) byId.set(id, a); for (const x of v) a.push(dec(x)); return a; }
    if (M in v) { const m = new Map(); if (id >= 0) byId.set(id, m); for (const [k, x] of v[M]) m.set(dec(k), dec(x)); return m; }
    if (S in v) { const s = new Set(); if (id >= 0) byId.set(id, s); for (const x of v[S]) s.add(dec(x)); return s; }
    const o = {}; if (id >= 0) byId.set(id, o);
    for (const k of Object.keys(v)) o[k] = dec(v[k]);
    return o;
  };
  const dec = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return fill(v, -1);
    if (T in v) {
      // the buffer once (its own copy: transferable), each view on it as it was
      const bl = v[T] === "ArrayBuffer" ? v.n : v.bl;
      let buf = made.get(v.o);
      if (!buf) { buf = ab.slice(head + v.o, head + v.o + bl); made.set(v.o, buf); }
      if (v[T] === "ArrayBuffer") return buf;
      if (!viewsMade.has(v.w)) viewsMade.set(v.w, new KINDS[v[T]](buf, v.bo, v.n));   // (the same view object twice: one)
      return viewsMade.get(v.w);
    }
    if (N in v) return Number(v[N]);
    if (U in v) return undefined;
    if (R in v) return byId.get(v[R]);
    if (I in v) return fill(v[V], v[I]);
    return fill(v, -1);
  };
  return dec(skel);
}
