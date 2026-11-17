// HEAP (docs/HEAP.md): viewer/heapDrop.js against a stand-in of three r187's Attributes / Textures (no GPU):
// drop only after upload, keep lists, holds, cellCull wait, bounds first, the guards.
//   node --import ./tools/road_audit/register.mjs tools/heap/dropCheck.mjs
import * as THREE from "three/webgpu";
globalThis.window = globalThis; globalThis.location = { search: "" };
const timers = []; globalThis.setInterval = (f) => (timers.push(f), 1);
const H = await import("../../viewer/heapDrop.js");
class DataMap { constructor() { this.data = new WeakMap(); } get(o) { let m = this.data.get(o); if (!m) this.data.set(o, (m = {})); return m; } }
const A = new DataMap(); A.update = function (a) { const d = this.get(a); if (d.version === undefined) { d.version = a.version; d.bytes = a.array.byteLength; } else if (d.version < a.version) { d.version = a.version; d.rewrites = (d.rewrites || 0) + 1; } };
const T = new DataMap(); T.updateTexture = function (t) { const d = this.get(t); if (d.initialized && d.version === t.version) return 0; d.initialized = true; d.isDefaultTexture = false; d.version = t.version; d.uploads = (d.uploads || 0) + 1; return 0; };
const R = { _attributes: A, _textures: T };
const errs = []; console.error = (m) => errs.push(m);
H.installHeapDrop(R, { ktx: true });
const tick = () => timers.forEach((f) => f());
const upload = (g) => { for (const a of Object.values(g.attributes)) A.update(a); if (g.index) A.update(g.index); };
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok  ", m); };

const box = () => new THREE.BoxGeometry(2, 4, 6, 4, 4, 4);
const root = new THREE.Group();
const terr = new THREE.Mesh(box(), new THREE.MeshBasicMaterial()); terr.name = "terrain"; root.add(terr);
const road = new THREE.Mesh(box(), new THREE.MeshBasicMaterial()); road.name = "roads-asphalt"; root.add(road);
H.dropAfterUpload(root, { tag: "terrain:X", filter: (o) => o.name === "terrain" });
H.dropAfterUpload(root, { tag: "roads:X", keep: ["position", "index"], filter: (o) => o.name !== "terrain" });
tick();
ok(terr.geometry.attributes.position.array.length > 0, "nothing dropped before the upload");
upload(terr.geometry); A.update(road.geometry.attributes.position); A.update(road.geometry.attributes.normal);
H.hold("terrain:X");
tick();
ok(terr.geometry.attributes.position.array.length > 0, "a held tag is kept");
ok(road.geometry.attributes.normal.array.length === 0 && road.geometry.attributes.position.array.length > 0, "roads: normal dropped, position kept");
ok(road.geometry.attributes.uv.array.length > 0, "an attribute never uploaded is kept");
const n0 = terr.geometry.attributes.position.count;
H.release("terrain:X"); tick();
const g = terr.geometry;
ok(g.attributes.position.array.length === 0 && g.index.array.length === 0 && g.attributes.position.array instanceof Float32Array, "terrain: every attribute + index dropped, same array type");
ok(g.attributes.position.count === n0, "count kept");
ok(g.boundingSphere && g.boundingSphere.radius > 3 && g.boundingBox.max.z === 3, "bounds computed before the drop");
const r0 = g.boundingSphere.radius; g.computeBoundingSphere();
ok(g.boundingSphere.radius === r0 && errs.length === 1, "computeBoundingSphere after the drop: bounds kept, a trip");
g.attributes.position.needsUpdate = true; A.update(g.attributes.position);
ok(!A.get(g.attributes.position).rewrites && errs.length === 2, "needsUpdate after the drop: skipped, a trip");
ok(H.isDropped(g), "isDropped");
let threw = false; try { H.needCpu(g, ["position"], "test"); } catch { threw = true; } ok(threw, "needCpu throws on a dropped attribute");
threw = false; try { H.needCpu(road.geometry, ["position", "index"], "test"); } catch { threw = true; } ok(!threw, "needCpu passes on kept attributes");
// cellCull: wait while sorting
const big = new THREE.Mesh(box(), new THREE.MeshBasicMaterial()); big.userData.cellCull = { state: "sorting" };
H.dropAfterUpload(big, { tag: "b" }); upload(big.geometry); tick();
ok(big.geometry.attributes.position.array.length > 0, "cellCull sorting: kept");
big.userData.cellCull.state = "on"; tick();
ok(big.geometry.attributes.position.array.length === 0, "cellCull on: dropped");
// disposed before upload: off the list
const p0 = H.heapDropStats().pending, gone = new THREE.Mesh(box(), new THREE.MeshBasicMaterial()); H.dropAfterUpload(gone, { tag: "gone" }); gone.geometry.dispose();
ok(H.heapDropStats().pending === p0, "disposed geometry leaves the pending list");
// KTX2-like compressed texture
const mips = [{ data: new Uint8Array(1024), width: 32, height: 32 }, { data: new Uint8Array(256), width: 16, height: 16 }];
const ct = new THREE.CompressedTexture(mips, 32, 32, THREE.RGBA_BPTC_Format); ct.needsUpdate = true;
T.updateTexture(ct);
ok(ct.mipmaps.length === 2 && ct.mipmaps[0].data === null && ct.mipmaps[0].width === 32 && mips[0].data, "compressed: mip data dropped (new objects), sizes kept");
ct.needsUpdate = true; T.updateTexture(ct);
ok(T.get(ct).uploads === 1 && errs.length === 3, "compressed: version bump after the drop skipped, a trip");
const dt = new THREE.DataTexture(new Uint8Array(64), 4, 4); dt.needsUpdate = true; H.dropTextureData(dt); T.updateTexture(dt);
ok(dt.image.data === null && dt.image.width === 4, "marked DataTexture: pixels dropped, size kept");
const dt2 = new THREE.DataTexture(new Uint8Array(64), 4, 4); dt2.needsUpdate = true; T.updateTexture(dt2);
ok(dt2.image.data, "unmarked DataTexture kept");
const s = H.heapDropStats();
console.log(JSON.stringify({ MB: s.MB, attributes: s.attributes, geometries: s.geometries, textures: s.textures, byTag: s.byTag, trips: s.tripCounts }));
console.log(fails ? `${fails} FAILED` : "all ok");
process.exit(fails ? 1 : 0);
