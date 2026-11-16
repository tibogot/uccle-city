// TILE PACK (perfgame round 4, viewer/tileCache.js): a built tile (plain objects, arrays, typed arrays, Maps, Sets,
// numbers incl. NaN / +-Infinity) as ONE binary blob and back, for the Cache API (Response bodies), which does not
// structured-clone. Layout: [u32 skeleton length][skeleton JSON utf-8][pad to 8][buffers back to back, each 8-aligned].
// The skeleton is the object with every typed array / ArrayBuffer replaced by { "\u0000t": kind, i, o, n } (its byte
// offset and element count in the blob) and the values JSON cannot hold tagged ("\u0000n": "NaN" | "Infinity"...,
// "\u0000m": Map entries, "\u0000s": Set values, "\u0000u": undefined in arrays).
const KINDS = { Float32Array, Float64Array, Int8Array, Int16Array, Int32Array, Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray, BigInt64Array, BigUint64Array };
const T = "\u0000t", N = "\u0000n", M = "\u0000m", S = "\u0000s", U = "\u0000u";

export function packTile(r) {
  const bufs = []; let off = 0;
  const seen = new Map();             // the same typed array twice (shared): stored once
  const enc = (v) => {
    if (v === null || typeof v === "boolean" || typeof v === "string") return v;
    if (typeof v === "number") return Number.isFinite(v) ? v : { [N]: String(v) };
    if (v === undefined) return { [U]: 1 };
    if (typeof v !== "object") return null;
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) {
      if (seen.has(v)) return seen.get(v);
      const kind = v instanceof ArrayBuffer ? "ArrayBuffer" : v.constructor.name;
      const bytes = v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      off = (off + 7) & ~7;
      const ref = { [T]: kind, o: off, n: v instanceof ArrayBuffer ? v.byteLength : v.length };
      bufs.push([off, bytes]); off += bytes.byteLength;
      seen.set(v, ref);
      return ref;
    }
    if (v instanceof Map) return { [M]: [...v].map(([k, x]) => [enc(k), enc(x)]) };
    if (v instanceof Set) return { [S]: [...v].map(enc) };
    if (Array.isArray(v)) return v.map(enc);
    const o = {};
    for (const k of Object.keys(v)) { const x = v[k]; if (x !== undefined && typeof x !== "function") o[k] = enc(x); }
    return o;
  };
  const skel = new TextEncoder().encode(JSON.stringify(enc(r)));
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
  const made = new Map();
  const dec = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(dec);
    if (T in v) {
      const key = v.o;
      if (made.has(key)) return made.get(key);
      let x;
      if (v[T] === "ArrayBuffer") x = ab.slice(head + v.o, head + v.o + v.n);
      else { const C = KINDS[v[T]]; x = new C(ab.slice(head + v.o, head + v.o + v.n * C.BYTES_PER_ELEMENT)); }   // (own buffers: transferable one by one)
      made.set(key, x);
      return x;
    }
    if (N in v) return Number(v[N]);
    if (U in v) return undefined;
    if (M in v) return new Map(v[M].map(([k, x]) => [dec(k), dec(x)]));
    if (S in v) return new Set(v[S].map(dec));
    const o = {};
    for (const k of Object.keys(v)) o[k] = dec(v[k]);
    return o;
  };
  return dec(skel);
}
