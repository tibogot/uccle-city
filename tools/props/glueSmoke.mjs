// node --import ./tools/christmas/hook.mjs tools/props/glueSmoke.mjs: the props' city glue (viewer/props/cityProps.js)
// on real three.js objects headless: a layer's Streamer (instanceStream.js pools of a two-LOD piece), a plain instanced
// mesh (bollards), a prop of each made, woken, flown, slept, reset. Checks: the pool instance hidden by ONE update range
// where the pool holds it (and restored), the proxies draw it (count, matrix moving, update ranges, no new mesh per prop),
// the shape from the drawn geometry, no exception. (Part of tools/propsTest.mjs's ranges row in spirit; run alone.)
globalThis.addEventListener ??= () => {};
globalThis.window ??= globalThis;
globalThis.location ??= { search: process.argv.includes("--settleold") ? "?propsettle=old" : "" };
const SETTLE = !process.argv.includes("--settleold");   // (claude/perf6, rule settled-props-in-pool: asleep = back in its pool)
const THREE = await import("three/webgpu");
const { Streamer, StreamPool, FadeSlots, sourceFromYaw } = await import("../../viewer/instanceStream.js");
const { cityProps } = await import("../../viewer/props/cityProps.js");
const { PropWorld } = await import("../../viewer/props/propWorld.js");
const { buildColliders, KIND } = await import("../../viewer/drive/colliders.js");
let fails = 0;
const check = (n, ok, m) => { console.log(`${ok ? "pass" : "FAIL"} ${n}: ${m}`); if (!ok) fails++; };

// a layer: one piece (a 0.6 x 1 m drum, two LODs) as a StreamPool, a tile of 50 instances
const scene = new THREE.Scene();
const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 12).translate(0, 0.5, 0);
const mat = new THREE.MeshStandardNodeMaterial();
const meshes = [0, 1].map((k) => { const m = new THREE.InstancedMesh(geo.clone(), mat, 1); m.name = `bin-lod${k}`; scene.add(m); return m; });
const spec = meshes.map((m, k) => ({ mesh: m, l0: k ? 25 : 0, l1: k ? 200 : 27, attrs: [["instanceMatrix", "instanceMatrix", 16], ["iBand", "iBand", 4]] }));
const pool = new StreamPool("bin", spec, 0.6, 6);
const fades = new FadeSlots();
const streamer = new Streamer({ name: "test", pools: [pool], fades, budget: 10 });
cityProps.hook(mat);
cityProps.prepare(streamer, ["bin"]);
const recs = [];
for (let i = 0; i < 50; i++) recs.push((i % 10) * 4, 0, Math.floor(i / 10) * 4 + 10, i * 0.3, 0, 0, 0, 0);
const A = new Float32Array(recs);
const g = new THREE.Group(); scene.add(g);
const props = [];
streamer.addTile("T", g, (slot) => ({ bin: sourceFromYaw(A, 8, 0.6, { iBand: (o, v) => { v[0] = 25; v[1] = 200; v[2] = slot; } }) }));
for (let i = 0; i < 50; i++) props.push(cityProps.make("bin", "T", A[i * 8], 0, A[i * 8 + 2], A[i * 8 + 3], [{ streamer, tile: "T", key: "bin", i }]));
const cam = new THREE.PerspectiveCamera(); cam.position.set(18, 2, 0);
streamer.flush(cam);
// a plain mesh layer (bollards)
const bg = new THREE.CylinderGeometry(0.1, 0.1, 1, 8).translate(0, 0.5, 0), bm = new THREE.MeshStandardNodeMaterial();
cityProps.hook(bm);
const boll = new THREE.InstancedMesh(bg, bm, 5); boll.name = "bollards"; const M = new THREE.Matrix4();
for (let i = 0; i < 5; i++) boll.setMatrixAt(i, M.makeTranslation(i * 2, 0, 5));
scene.add(boll);
const bprops = [0, 1, 2, 3, 4].map((i) => cityProps.make("bollard", "T", i * 2, 0, 5, 0, [{ mesh: boll, i }]));
// the world + start (a stub driver)
const col = buildColliders([], [], { x0: -100, x1: 100, z0: -100, z1: 100 });
const world = new PropWorld({ sets: () => [col], ground: () => 0 });
const updaters = [];
cityProps.start({ scene, updaters, driver: { props: world, on: false }, log: () => {} });
const frame = () => { cam.updateMatrixWorld(); for (const u of updaters) u(cam.position, cam); streamer.update(cam); };
for (let f = 0; f < 6; f++) frame();                                // (the warm-up frames)
check("warm", !cityProps.warming && cityProps.kinds.size === 2, `${cityProps.kinds.size} proxy kinds (bin, bollards), warmed`);
// (claude/perf6, ?propshide=old) an empty proxy left visible by someone else's save / restore (the boot's warm-up did it:
// 47 empty render objects a frame) is hidden by the next render, even with no prop displaced
{
  const L = [...cityProps.kinds.values()][0].lods[0].mesh;
  L.count = 0; L.visible = true; L.frustumCulled = false;
  frame();
  if (SETTLE) check("empty proxy hidden", !L.visible && L.frustumCulled, `visible ${L.visible}, frustumCulled ${L.frustumCulled} after one frame with nothing displaced`);
  else { L.visible = false; L.frustumCulled = true; }
}
// wake bin 23 with a kick
const p = props[23], live = () => { const L = pool.meshes[0]; const at = pool.slotOf(L.log, streamer.tiles.get("T").srcs.bin, streamer.tiles.get("T").srcs.bin.inv[23]); return at; };
const at = live(), Mi = meshes[0].instanceMatrix;
Mi.clearUpdateRanges();
const k = world.wake(p);
world.vx[k] = 6; world.vy[k] = 3; world.wz[k] = 4;
const hidden = at >= 0 && Mi.array[at * 16] === 0 && Mi.array[at * 16 + 5] === 0 && Mi.updateRanges.length === 1 && Mi.updateRanges[0].count === 16;
check("hide", hidden && p.ref.hidden, `the pool's copy at ${at} zero-scaled by ${Mi.updateRanges.length} range(s) of ${Mi.updateRanges[0]?.count} floats; collider ref hidden ${p.ref.hidden}`);
check("shape", Math.abs(p.shape.hy - 0.5) < 1e-3 && Math.abs(p.shape.cy - 0.5) < 1e-3 && Math.abs(p.shape.hx - 0.3) < 0.01, `from the drawn geometry: ${JSON.stringify(p.shape)}`);
const K = [...cityProps.kinds.values()][0];
const ranges = [];
let moved = 0, last = null, nMesh = scene.children.length;
for (let f = 0; f < 240; f++) {
  world.frame(1 / 60, cam.position.x, cam.position.z);
  frame();
  const L0 = K.lods[0].mesh;
  if (L0.count) { const x = L0.instanceMatrix.array[12]; if (last !== null && Math.abs(x - last) > 1e-4) moved++; last = x; ranges.push(L0.instanceMatrix.updateRanges.length ? L0.instanceMatrix.updateRanges[0].count : -1); }
}
check("proxy draws it", moved > 20 && ranges.every((c) => c === -1 || c % 16 === 0), `LOD0 proxy moved in ${moved} frames, ranges ${[...new Set(ranges)].join(", ")} floats; meshes in the scene before / after ${nMesh} / ${scene.children.length}`);
check("asleep", p.slot < 0 && p.state === 2, `state ${p.state} (2 = asleep off its rest), slot ${p.slot}`);
// (SETTLE) asleep where it landed: back in its pool at that pose (the source + the live copy), no proxy draw
const srcOf = () => streamer.tiles.get("T").srcs.bin, j23 = srcOf().inv[23];
const srcX = srcOf().cols.instanceMatrix[j23 * 16 + 12], liveAt = live();
if (SETTLE) {
  check("settled in its pool", K.lods.every((L) => L.mesh.count === 0) && srcOf().cols.instanceMatrix[j23 * 16] !== 0 && Math.abs(srcX - last) < 1e-3 && liveAt >= 0 && Math.abs(Mi.array[liveAt * 16 + 12] - last) < 1e-3 && p.inPool,
    `proxies ${K.lods.map((L) => L.mesh.count).join("/")}, the source's x ${srcX.toFixed(3)} = the proxy's last ${last?.toFixed(3)}, the live copy's x ${Mi.array[liveAt * 16 + 12]?.toFixed(3)}, inPool ${p.inPool}`);
  // hit again: out of the pool (zero scale) in the frame its proxy draws it
  const k2 = world.wake(p); world.vx[k2] = -4; world.vy[k2] = 2;
  world.frame(1 / 60, cam.position.x, cam.position.z); frame();
  const drawnNow = K.lods.some((L) => L.mesh.count > 0), hiddenNow = srcOf().cols.instanceMatrix[j23 * 16] === 0 && Mi.array[live() * 16] === 0;
  check("woken out of the pool", drawnNow && hiddenNow && !p.inPool, `proxy drawing ${drawnNow}, hidden in the pool ${hiddenNow} (same frame), inPool ${p.inPool}`);
  for (let f = 0; f < 300 && p.state !== 2; f++) { world.frame(1 / 60, cam.position.x, cam.position.z); frame(); }
  for (let f = 0; f < 4; f++) frame();
  check("settled again", p.state === 2 && p.inPool && K.lods.every((L) => L.mesh.count === 0), `state ${p.state}, inPool ${p.inPool}`);
} else check("old: asleep stays a proxy", K.lods.some((L) => L.mesh.count > 0) && srcOf().cols.instanceMatrix[j23 * 16] === 0, `proxies ${K.lods.map((L) => L.mesh.count).join("/")}, hidden in the source`);
// a bollard snapped by hand: hidden in its mesh, drawn by its proxy
const b = bprops[2]; const kb = world.wake(b); world.vx[kb] = 3;
for (let f = 0; f < 10; f++) { world.frame(1 / 60); frame(); }
const bk = [...cityProps.kinds.values()][1];
check("mesh handle", boll.instanceMatrix.array[2 * 16] === 0 && bk.lods[0].mesh.count === 1, `the bollard's own instance hidden, its proxy draws ${bk.lods[0].mesh.count}`);
// the tile goes: everything back
const before = SETTLE ? 0 : streamer.tiles.get("T").srcs.bin.cols.instanceMatrix[streamer.tiles.get("T").srcs.bin.inv[23] * 16];   // (SETTLE: in the pool at its pose until the reset)
cityProps.removeTile("T");
for (let f = 0; f < 3; f++) frame();
const after = streamer.tiles.get("T").srcs.bin.cols.instanceMatrix[streamer.tiles.get("T").srcs.bin.inv[23] * 16];
check("reset", before === 0 && Math.abs(after - Math.cos(23 * 0.3)) < 1e-5 && world.dN === 0 && boll.instanceMatrix.array[2 * 16] === 1 && K.lods[0].mesh.count === 0, `source matrix ${before} -> ${after.toFixed(3)}, displaced ${world.dN}, bollard restored ${boll.instanceMatrix.array[2 * 16]}, proxies ${K.lods[0].mesh.count}`);
console.log(fails ? `${fails} FAILED` : "glue smoke: all pass");
process.exitCode = fails ? 1 : 0;
