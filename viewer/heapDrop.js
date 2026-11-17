// HEAP DROP (docs/HEAP.md; ?heapdrop=old = all off, each item has its own ?x=old): the CPU copies that nothing reads
// once three r187 (WebGPU) has uploaded them are let go.
//
// Why it is safe for three: the WebGPU backend writes a BufferAttribute's array into its GPU buffer once (Attributes
// .update: data.version undefined -> createAttribute), again only when attribute.version grows (needsUpdate) and never
// re-reads it otherwise; after the upload it reads only array.constructor / BYTES_PER_ELEMENT (vertex format, index
// format: kept, the array is swapped for an EMPTY array of the same type) and attribute.count (a plain property: kept).
// The GPU buffer lives until the geometry dispatches 'dispose' (Geometries onDispose / RenderObject onGeometryDispose).
// A texture: written once (Textures.updateTexture: textureData.version === texture.version -> return), again only on a
// version bump; its mipmaps' width / height (kept) give the level count at creation.
// What could still break, and the guards (a TRIP: console.error once per kind + window.__heapDrop.trips):
//   - a dropped attribute uploaded again (its geometry disposed while still drawn, or a needsUpdate): the update is
//     skipped (the GPU copy stays as it was) and it is a trip; a re-CREATE (GPU buffer gone) cannot be helped: a trip
//   - bounds: boundingBox + boundingSphere are computed BEFORE the drop; computeBoundingBox / Sphere on a dropped
//     geometry keep the old ones (a trip); clone / toNonIndexed of one (they would copy nothing): a trip
//   - a dropped texture's version bump: skipped (its GPU copy stays), a trip; its re-creation after a dispose: a trip
// What is dropped is decided by the CALLERS (main.js tiles, the far tiles; this file's texture hook for KTX2), after
// listing every reader of that data (docs/HEAP.md "readers"); only geometries a caller registers are ever touched.
import * as THREE from "three/webgpu";

const qs = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
/** one switch: ?heapdrop=old = every drop off; ?<key>=old = that one off */
export const heapOn = (key) => qs.get("heapdrop") !== "old" && qs.get(key) !== "old";

const stats = { geometries: 0, attributes: 0, bytes: 0, textures: 0, texBytes: 0, pending: 0, held: 0, byTag: {}, trips: [], on: false };
const trips = new Map();                   // kind -> count
const dropped = new WeakSet();             // attributes whose array went
const ownerOf = new WeakMap();             // attribute -> "tag mesh-name" (the trips say whose)
const droppedGeo = new WeakSet();          // geometries with at least one dropped attribute
const droppedTex = new WeakSet();          // textures whose data went
const pending = new Set();                 // { mesh, geometry, keep: Set, tag, t0 }
const holds = new Map();                   // tag -> count (held tags are not dropped yet)
const texWanted = new WeakSet();           // DataTextures a caller marked (dropTextureData)
let R = null, timer = null, texKtx = false;

function trip(kind, what) {
  const n = (trips.get(kind) || 0) + 1;
  trips.set(kind, n);
  if (stats.trips.length < 50) stats.trips.push({ kind, what: String(what ?? ""), t: Math.round(performance.now()) });
  if (n === 1) console.error(`[heapDrop] ${kind}: ${what ?? ""} (a reader of a dropped CPU copy: docs/HEAP.md; ?heapdrop=old turns every drop off)`);
}

/** hook the renderer (once): the attribute / texture guards, the KTX2 texture drop, the pending check every second */
export function installHeapDrop(renderer, { log = null, ktx = heapOn("ktxdrop") } = {}) {
  if (R || !renderer?._attributes || !renderer?._textures) return stats;
  R = renderer; texKtx = ktx; stats.on = true;
  const A = renderer._attributes, origUpdate = A.update;
  A.update = function (attribute, type) {
    if (dropped.has(attribute)) {
      const d = this.data.get(attribute);
      if (d === undefined || d.version === undefined) trip("dropped attribute created again (its GPU buffer was released: geometry disposed while still drawn?)", ownerOf.get(attribute) ?? attribute.name);
      else if (d.version < attribute.version) { trip("dropped attribute marked for update (needsUpdate after the drop): skipped, the GPU copy stays", ownerOf.get(attribute) ?? attribute.name); d.version = attribute.version; return; }
    }
    return origUpdate.call(this, attribute, type);
  };
  const T = renderer._textures, origTex = T.updateTexture;
  T.updateTexture = function (texture, options) {
    if (droppedTex.has(texture)) {
      const td = this.get(texture);
      if (td.initialized === true && td.version !== texture.version) { trip("dropped texture marked for update: skipped, the GPU copy stays", texture.name); td.version = texture.version; return td.generation; }
      if (td.initialized !== true) trip("dropped texture created again (disposed, then drawn)", texture.name);
    }
    const g = origTex.call(this, texture, options);
    if ((texKtx && texture.isCompressedTexture && !texture.isCompressedCubeTexture) || texWanted.has(texture)) {
      const td = this.get(texture);
      if (td.initialized === true && td.version === texture.version && td.isDefaultTexture === false && texture.source?.dataReady !== false) dropTex(texture);
    }
    return g;
  };
  // the geometry methods that would read a dropped array
  for (const k of ["computeBoundingBox", "computeBoundingSphere"]) {
    const f = THREE.BufferGeometry.prototype[k];
    THREE.BufferGeometry.prototype[k] = function () {
      if (droppedGeo.has(this) && (k === "computeBoundingBox" ? this.boundingBox : this.boundingSphere)) { trip(`${k} on a dropped geometry: the bounds from before the drop kept`, this.name); return; }
      return f.apply(this, arguments);
    };
  }
  for (const k of ["clone", "toNonIndexed", "computeVertexNormals", "computeTangents", "applyMatrix4"]) {
    const f = THREE.BufferGeometry.prototype[k];
    THREE.BufferGeometry.prototype[k] = function () { if (droppedGeo.has(this)) trip(`${k} on a dropped geometry (reads nothing)`, this.name); return f.apply(this, arguments); };
  }
  timer = setInterval(tick, 1000);
  if (log) stats.log = log;
  window.__heapDrop = stats;
  return stats;
}

function dropTex(texture) {
  let bytes = 0;
  if (texture.isCompressedTexture) {
    // new mipmap objects (a material's clone of the texture, if any, keeps its own list)
    texture.mipmaps = texture.mipmaps.map((m) => { bytes += m.data?.byteLength || 0; return { width: m.width, height: m.height, ...(m.depth != null ? { depth: m.depth } : {}), data: null }; });
  } else if (texture.image?.data) {
    bytes += texture.image.data.byteLength || 0;
    texture.image = { width: texture.image.width, height: texture.image.height, depth: texture.image.depth, data: null };
    if (texture.mipmaps?.length) texture.mipmaps = texture.mipmaps.map((m) => { bytes += m.data?.byteLength || 0; return { width: m.width, height: m.height, data: null }; });
  }
  droppedTex.add(texture);
  stats.textures++; stats.texBytes += bytes;
}

/** a DataTexture / DataArrayTexture whose CPU data nothing reads after its upload (the caller listed its readers) */
export function dropTextureData(texture) { if (texture && R && (texture.isDataTexture || texture.isDataArrayTexture || texture.isData3DTexture)) texWanted.add(texture); return texture; }

/** register the meshes under `root` (non-instanced, own geometry): each uploaded attribute (and the index) that is not
 *  in `keep` goes once three has written it to the GPU. tag: a name for the stats and for holds (hold(tag) keeps it
 *  until release(tag)). filter(mesh) -> false skips a mesh; keep may be a function (mesh) -> list. */
export function dropAfterUpload(root, { tag = "misc", keep = [], filter = null } = {}) {
  if (!R || !root) return 0;
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || o.geometry.userData?.shared) return;
    if (filter && !filter(o)) return;
    if (o.material && (Array.isArray(o.material) ? o.material.some((m) => m.wireframe) : o.material.wireframe)) return;   // (three keeps a wireframe index made from the array)
    const g = o.geometry;
    if (Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) return;
    if (Object.keys(g.morphAttributes).length) return;
    const k = typeof keep === "function" ? keep(o) : keep;
    const e = { mesh: o, geometry: g, keep: new Set(k), tag, t0: performance.now() };
    const off = () => { pending.delete(e); g.removeEventListener("dispose", off); };
    e.off = off;
    g.addEventListener("dispose", off);
    pending.add(e); n++;
  });
  stats.pending = pending.size;
  return n;
}
/** keep the geometries of `tag` until release(tag) (a reader that reads them later: docs/HEAP.md) */
export function hold(tag) { holds.set(tag, (holds.get(tag) || 0) + 1); }
export function release(tag) { const n = (holds.get(tag) || 0) - 1; if (n > 0) holds.set(tag, n); else holds.delete(tag); }

const uploaded = (attr) => { const d = R._attributes.data.get(attr); return d !== undefined && d.version !== undefined && d.version === attr.version && !(attr.updateRanges?.length); };
const MAX_WAIT = 180000;                   // an attribute no pass ever uploads (not read by any shader) is left after this
function tick() {
  if (!pending.size) return;
  const now = performance.now();
  let held = 0;
  for (const e of [...pending]) {
    if (holds.has(e.tag)) { held++; continue; }
    const g = e.geometry, cc = e.mesh.userData?.cellCull;
    if (e.mesh.geometry !== g) { e.off(); continue; }
    if (cc && (cc.state === "waiting" || cc.state === "sorting")) continue;      // (cellCull.js copies position + index at the first draw)
    const list = Object.entries(g.attributes).filter(([k]) => !e.keep.has(k)).map(([, a]) => a);
    if (g.index && !e.keep.has("index")) list.push(g.index);
    let left = 0;
    for (const a of list) {
      if (dropped.has(a) || !a.array?.length) continue;
      if (!uploaded(a)) { left++; continue; }
      if (!droppedGeo.has(g)) {
        // the bounds from the full arrays first (frustum culling, LOD distances, contact checks read them later)
        if (!g.boundingBox) g.computeBoundingBox();
        if (!g.boundingSphere) g.computeBoundingSphere();
        droppedGeo.add(g); stats.geometries++;
        g.userData.heapDropped = e.tag;
      }
      const bytes = a.array.byteLength;
      a.array = new a.array.constructor(0);
      dropped.add(a);
      ownerOf.set(a, `${e.tag} ${e.mesh.name || "?"}${a === g.index ? " index" : ""}`);
      stats.attributes++; stats.bytes += bytes;
      const t = (stats.byTag[e.tag] ??= { attributes: 0, MB: 0 });
      t.attributes++; t.MB = +(t.MB + bytes / 1048576).toFixed(2);
    }
    if (!left || now - e.t0 > MAX_WAIT) e.off();
  }
  stats.pending = pending.size; stats.held = held;
  stats.MB = +(stats.bytes / 1048576).toFixed(1); stats.texMB = +(stats.texBytes / 1048576).toFixed(1);
  stats.tripCounts = Object.fromEntries(trips);
}
/** for audits / tools that read geometry on the CPU: true when this geometry's arrays went (docs/HEAP.md) */
export const isDropped = (g) => !!g && droppedGeo.has(g);
/** an audit that reads these attributes ("index" = the index) of `g` on the CPU: throws if one of them was dropped */
export function needCpu(g, names = ["position", "index"], who = "this audit") {
  if (!g || !droppedGeo.has(g)) return;
  for (const n of names) {
    const a = n === "index" ? g.index : g.attributes[n];
    if (a && dropped.has(a)) throw new Error(`${who}: the CPU copy of ${g.userData.heapDropped || "a"} geometry's ${n} was let go after its upload (docs/HEAP.md): reload with ?heapdrop=old to run it`);
  }
}
export const heapDropStats = () => (tick(), stats);
