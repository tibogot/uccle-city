// The tiny far body (LOD2, 60-250 m): the vendored far mesh (buildPersonGeometry(0), ~0.9k triangles) simplified with
// meshoptimizer in JS (the owner's rule: LODs with meshoptimizer). The lofts have a duplicated seam column (uv seam),
// so positions are welded first (else every seam is a border the simplifier keeps); each welded position keeps one of
// its vertices, so every attribute the crowd shader reads (skin bones, part id, girth / female / hair deltas) is an
// original vertex's. At 60-250 m a person is 7-30 px tall: the hands may collapse, the silhouette must not.
import * as THREE from "three/webgpu";
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export async function buildLod2(src, { ratio = 0.22, error = 0.02 } = {}) {
  await MeshoptSimplifier.ready;
  const pos = src.attributes.position.array, index = src.index.array, n = pos.length / 3;
  // weld by position (and part id: separate parts touching must stay separate)
  const part = src.attributes.skin.array;
  const key = new Map(), remap = new Uint32Array(n), rep = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos[i * 3] * 1e4)},${Math.round(pos[i * 3 + 1] * 1e4)},${Math.round(pos[i * 3 + 2] * 1e4)},${part[i * 4 + 3]}`;
    let r = key.get(k);
    if (r === undefined) { r = rep.length; key.set(k, r); rep.push(i); }
    remap[i] = r;
  }
  const wpos = new Float32Array(rep.length * 3);
  rep.forEach((v, r) => wpos.set(pos.subarray(v * 3, v * 3 + 3), r * 3));
  const widx = new Uint32Array(index.length);
  for (let i = 0; i < index.length; i++) widx[i] = remap[index[i]];
  const target = Math.floor((index.length / 3) * ratio) * 3;
  const [sidx, err] = MeshoptSimplifier.simplify(widx, wpos, 3, target, error, ["ErrorAbsolute"]);
  // back to original vertices (compact)
  const used = new Map(), order = [];
  const out = new Uint32Array(sidx.length);
  for (let i = 0; i < sidx.length; i++) {
    const v = rep[sidx[i]];
    let o = used.get(v);
    if (o === undefined) { o = order.length; used.set(v, o); order.push(v); }
    out[i] = o;
  }
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) {
    const s = a.itemSize, arr = new Float32Array(order.length * s);
    order.forEach((v, o) => { for (let k = 0; k < s; k++) arr[o * s + k] = a.array[v * s + k]; });
    g.setAttribute(name, new THREE.BufferAttribute(arr, s));
  }
  g.setIndex(new THREE.BufferAttribute(out, 1));
  g.computeVertexNormals();          // the welded surface's own normals (no seam crease)
  g.computeBoundingSphere();
  g.userData = { tris: out.length / 3, srcTris: index.length / 3, error: err };
  return g;
}
