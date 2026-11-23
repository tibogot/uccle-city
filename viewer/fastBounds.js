// GEOMETRY BOUNDS WITHOUT GARBAGE (claude/allocrate2, rule alloc-rate; ?fastbounds=old = three's own methods).
// three r187's BufferGeometry.computeBoundingBox / computeBoundingSphere walk the positions through
// Vector3.fromBufferAttribute -> attribute.getX / getY / getZ: calls that the optimiser rarely inlines in this rarely-hot
// code, so every Float32 read came back as a new heap number. heapDrop.js computes the bounds of every streamed tile
// geometry before it lets the arrays go: the allocation sampler charged ~36 KB a frame of the falcon flight to
// three's getX / getY / getZ under heapDrop's tick (and ~10 more to its update()). vendor/ and three stay untouched: this
// reads the typed array by index and writes the SAME numbers three would (Math.min / Math.max in the same order, the
// same centre, the same squared distances), and leaves every case it does not cover (interleaved, normalized,
// morph targets, GLBufferAttribute, no position) to three's own method.
import * as THREE from "three/webgpu";

export const FAST_BOUNDS = new URLSearchParams(globalThis.location?.search || "").get("fastbounds") !== "old";

const plain = (g) => {
  const p = g.attributes.position;
  return p && p.isBufferAttribute && !p.isInterleavedBufferAttribute && !p.isGLBufferAttribute && !p.normalized && p.itemSize >= 3 && p.array && !g.morphAttributes.position ? p : null;
};

/** the box three's computeBoundingBox gives, into g.boundingBox -> true; false = not covered (call three's) */
export function fastBox(g) {
  const p = plain(g);
  if (!FAST_BOUNDS || !p) return false;
  const a = p.array, s = p.itemSize, n = p.count;
  let x0 = +Infinity, y0 = +Infinity, z0 = +Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0, o = 0; i < n; i++, o += s) {
    const x = a[o], y = a[o + 1], z = a[o + 2];
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
  }
  const b = (g.boundingBox ??= new THREE.Box3());
  b.min.set(x0, y0, z0); b.max.set(x1, y1, z1);
  return !(isNaN(x0) || isNaN(y0) || isNaN(z0));   // (NaN: three's own method, its report)
}
export const computeBox = (g) => { if (!fastBox(g)) g.computeBoundingBox(); };

const _box = /* @__PURE__ */ new THREE.Box3();
/** the sphere three's computeBoundingSphere gives, into g.boundingSphere -> true; false = not covered */
export function fastSphere(g) {
  const p = plain(g);
  if (!FAST_BOUNDS || !p) return false;
  const a = p.array, s = p.itemSize, n = p.count;
  let x0 = +Infinity, y0 = +Infinity, z0 = +Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0, o = 0; i < n; i++, o += s) {
    const x = a[o], y = a[o + 1], z = a[o + 2];
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
  }
  _box.min.set(x0, y0, z0); _box.max.set(x1, y1, z1);
  const S = (g.boundingSphere ??= new THREE.Sphere()), c = S.center;
  _box.getCenter(c);
  const cx = c.x, cy = c.y, cz = c.z;
  let m = 0;
  for (let i = 0, o = 0; i < n; i++, o += s) { const dx = cx - a[o], dy = cy - a[o + 1], dz = cz - a[o + 2]; m = Math.max(m, dx * dx + dy * dy + dz * dz); }
  S.radius = Math.sqrt(m);
  return !isNaN(S.radius);
}
export const computeSphere = (g) => { if (!fastSphere(g)) g.computeBoundingSphere(); };
