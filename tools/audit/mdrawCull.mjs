// MULTI-DRAW CULL GATE (claude/mdraw, docs/AGARGARO.md jobs 1-2, docs/QUALITY_RULES.md rule 21): viewer/multiDraw.js
// MultiDrawSet's chunking + per-pass cull on a synthetic city (node, the real class, a stand-in for the renderer).
//   node --import ./tools/heap/register.mjs tools/audit/mdrawCull.mjs [--quiet]      exit 1 on a failure
// WHY: the cull decides what each pass draws. A chunk that only grazes a frustum draws every instance in it (160 m
// chunks: the sun's / lamps' shadow cameras drew whole blocks); the order of the draws decides how much early-z
// rejects. Both are pure CPU logic over a few hundred boxes, so a change there can lose instances (holes) or reorder a
// shadow / blended pass without anyone seeing it on one spot.
// Checks (old = 160 m / 48, new = the opt-in ?mdchunk=80&mdsort=1: 80 m / 128 + near-to-far; the defaults are the old ones):
//   1. chunks: every part's chunks tile [0, n) exactly (no instance lost or doubled), <= CHMAX, boxes hold their cells;
//      the overflow fallback (too many cells for CHMAX: coarser chunks) taken and still exact
//   2. records: each drawn offset's indirect record = (the part's index count, the chunk's instances, its first index,
//      0, region + chunk start); the instance buffers are byte-identical old vs new (same instances: only the culls differ)
//   3. culls: for view / sun-shadow / lamp-shadow cameras, every instance whose box meets the frustum is drawn, old and
//      new (no instance lost); new draws <= old summed per camera kind (extra only from coarse chunks)
//   4. order: the view camera's opaque list is near to far and a permutation of the unsorted list; shadow cameras and
//      a blended view keep the old order exactly
//   5. budget: indirect buffer <= 2560 B a part, a part's write uploads only its records (update range, no whole
//      buffer, no DynamicDrawUsage); sort CPU <= 0.02 ms a frame; the whole cull (all cameras) <= 2 x the 160 m one
import * as THREE from "three/webgpu";
import { measure, timed, gateExit } from "../gate/timing.mjs";
// (?indpool=old: each view keeps its own indirect buffer, so records sit at k * chMax * 5 and offsets decode from 0;
// the pooled layout (one buffer, a slot base per view) is checked by tools/audit/indirectPoolCheck.mjs, row indirectpool)
globalThis.window = globalThis; globalThis.location = { search: "?indpool=old" };
const MD = await import("../../viewer/multiDraw.js");
const { MultiDrawSet, setMultiDrawViewCamera, nearBucket, CHUNK_M, CHUNK_MAX, MD_SORT } = MD;
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
// (both jobs are OFF by default since the browser turn (no GPU gain): the defaults stay the old chunks and order;
// the jobs' logic is still checked here with their opt-in settings, ?mdchunk=80&mdsort=1)
ok(CHUNK_M === 160 && CHUNK_MAX === 48 && !MD_SORT, `defaults: 160 m chunks, 48 a part, unsorted (got ${CHUNK_M} / ${CHUNK_MAX} / ${MD_SORT})`);

// ------------------------------------------------------------------ a synthetic city: tiles of 8 x 8 cells of 50 m
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const TILE = 400, CELL = 50, NT = 6;                         // 2.4 km square, tiles row by row, cells row by row
const centre = new THREE.Vector3(1200, 0, 1200);
/** a kind of thing: parts (pieces), instances per cell per part, size (half extent), LOD band [d0, d1] round centre */
function source(parts, perCell, h, hy) {
  const cells = [];
  for (let tz = 0; tz < NT; tz++) for (let tx = 0; tx < NT; tx++) for (let cz = 0; cz < 8; cz++) for (let cx = 0; cx < 8; cx++) {
    const x0 = tx * TILE + cx * CELL, z0 = tz * TILE + cz * CELL, inst = [];
    for (let k = 0; k < parts; k++) {
      const n = Math.floor(rnd() * perCell * 2);
      for (let i = 0; i < n; i++) { const y = 30 + 25 * Math.sin((x0 + z0) / 300); inst.push({ k, x: x0 + rnd() * CELL, y: y + rnd() * 6, z: z0 + rnd() * CELL, h: h * (0.5 + rnd()), hy }); }
    }
    cells.push(inst);
  }
  return cells;
}
/** the gather (instanceStream.js): per part, cell by cell in tile order, the instances in the band; runs [end, box] */
function gather(cells, parts, d0, d1) {
  const out = Array.from({ length: parts }, () => ({ inst: [], runs: [], box: new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]) }));
  for (const cell of cells) {
    const add = Array.from({ length: parts }, () => null);
    for (const p of cell) {
      const d = Math.hypot(p.x - centre.x, p.z - centre.z);
      if (d < d0 || d > d1) continue;
      const g = out[p.k]; g.inst.push(p);
      const b = (add[p.k] ||= [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
      b[0] = Math.min(b[0], p.x - p.h); b[1] = Math.min(b[1], p.y - p.hy); b[2] = Math.min(b[2], p.z - p.h);
      b[3] = Math.max(b[3], p.x + p.h); b[4] = Math.max(b[4], p.y + p.hy); b[5] = Math.max(b[5], p.z + p.h);
    }
    add.forEach((b, k) => { if (!b) return; const g = out[k]; g.runs.push([g.inst.length, b]); for (let i = 0; i < 3; i++) { g.box[i] = Math.min(g.box[i], b[i]); g.box[i + 3] = Math.max(g.box[i + 3], b[i + 3]); } });
  }
  return out;
}
const geom = (k) => { const g = new THREE.BoxGeometry(1 + k * 0.1, 1, 1); return g; };
/** the city's sets: name, parts, per cell, size, band (trees by LOD, roofs by LOD, street kit, a far band that overflows) */
const KINDS = [
  ["trees-lod0", 6, 1.2, 4, 6, 0, 120], ["trees-lod1", 6, 1.2, 4, 6, 120, 400], ["trees-lod2", 6, 1.2, 4, 6, 400, 1200],
  ["roofs-lod0", 15, 0.6, 6, 4, 0, 150], ["roofs-lod1", 15, 0.6, 6, 4, 150, 450], ["roofs-lod2", 15, 0.6, 6, 4, 450, 1100],
  ["kit-a", 8, 0.8, 1.5, 1.5, 0, 200], ["kit-b", 8, 0.8, 1.5, 1.5, 0, 200], ["kit-c", 12, 0.5, 2, 2, 0, 300],
];
const cfgOld = { chunk: 160, chmax: 48, sort: false }, cfgNew = { chunk: 80, chmax: 128, sort: true }, cfgNewU = { ...cfgNew, sort: false };
// (count the overflow fallback: chunk() calls itself with a coarser limit)
const chunk0 = MultiDrawSet.prototype.chunk;
const coarse = new Set();                                   // (a Set, not a field: the parts keep one shape for the JIT)
MultiDrawSet.prototype.chunk = function (P, n, box, runs, lim) { if (lim !== undefined && lim > this.chunkM) coarse.add(P); return chunk0.call(this, P, n, box, runs, lim); };
const opaque = new THREE.MeshBasicMaterial(), glass = new THREE.MeshBasicMaterial({ transparent: true });
const city = KINDS.map(([name, parts, perCell, h, hy, d0, d1]) => {
  const g = gather(source(parts, perCell, h, hy), parts, d0, d1);
  const mk = (cfg) => {
    const set = new MultiDrawSet({ name, parts, attrs: [["instanceMatrix", 16], ["treeXf", 3]], cap0: 64, ...cfg });
    set.pad = 1;
    const view = set.addView({ geoms: Array.from({ length: parts }, (_, k) => geom(k)), material: opaque, castShadow: true });
    const blended = set.addView({ geoms: Array.from({ length: parts }, (_, k) => (k % 2 ? geom(k) : null)), material: glass });
    g.forEach((p, k) => {
      const n = p.inst.length, M = new Float32Array(n * 16), X = new Float32Array(n * 3);
      p.inst.forEach((q, i) => { M.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, q.x, q.y, q.z, 1], i * 16); X.set([q.h, q.hy, k], i * 3); });
      set.write(k, n, { instanceMatrix: M, treeXf: X }, n ? p.box : new Float64Array(6), p.runs);
    });
    return { set, view, blended };
  };
  return { name, parts, g, old: mk(cfgOld), neu: mk(cfgNew), neuU: mk(cfgNewU) };
});

// ------------------------------------------------------------------ 1. chunks tile the instances exactly
let fallbacks = 0, partsN = 0, chunksOld = 0, chunksNew = 0;
for (const c of city) for (const [tag, S] of [["old", c.old.set], ["new", c.neu.set]]) S.parts.forEach((P, k) => {
  const g = c.g[k], n = g.inst.length;
  let at = 0, bad = null;
  for (let ch = 0; ch < P.nch; ch++) {
    const a = P.ch[ch * 2], m = P.ch[ch * 2 + 1];
    if (a !== at || m <= 0) { bad = `chunk ${ch} starts ${a} (expected ${at}), ${m} instances`; break; }
    const B = P.chBox.subarray(ch * 6, ch * 6 + 6);
    for (let i = a; i < a + m; i++) { const q = g.inst[i]; if (q.x - q.h < B[0] - 1e-3 || q.x + q.h > B[3] + 1e-3 || q.z - q.h < B[2] - 1e-3 || q.z + q.h > B[5] + 1e-3 || q.y - q.hy < B[1] - 1e-3 || q.y + q.hy > B[4] + 1e-3) { bad = `instance ${i} outside its chunk box`; break; } }
    if (bad) break;
    at += m;
  }
  if (!bad && at !== n) bad = `chunks cover ${at} of ${n}`;
  if (!bad && P.nch > S.chMax) bad = `${P.nch} chunks > ${S.chMax}`;
  if (bad) ok(false, `${c.name} ${tag} part ${k}: ${bad}`);
  if (tag === "new") { partsN++; chunksNew += P.nch; if (coarse.has(P)) fallbacks++; } else chunksOld += P.nch;
});
ok(fails === 0, `chunks tile [0, n) exactly, inside CHMAX, boxes hold their instances (${partsN} parts x 2 chunkings; chunks old ${chunksOld}, new ${chunksNew})`);
ok(fallbacks > 0, `the CHMAX overflow fallback was taken (${fallbacks} parts: the far bands) and stays exact (above)`);

// ------------------------------------------------------------------ 2. records + same instance data
let recBad = 0, bufSame = true;
for (const c of city) {
  for (const T of [c.old, c.neu]) for (const v of [T.view, T.blended]) {
    const A = v.indirect.array;
    T.set.parts.forEach((P, k) => {
      if (!v.ranges[k]) return;
      for (let ch = 0; ch < P.nch; ch++) {
        const o = (k * T.set.chMax + ch) * 5;
        if (A[o] !== v.ranges[k][1] || A[o + 1] !== P.ch[ch * 2 + 1] || A[o + 2] !== v.ranges[k][0] || A[o + 3] !== 0 || A[o + 4] !== P.off + P.ch[ch * 2]) recBad++;
      }
    });
  }
  for (const [name] of c.old.set.attrs) {
    const a = c.old.set.buf[name].array, b = c.neu.set.buf[name].array;
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) bufSame = false;
  }
}
ok(recBad === 0, `indirect records match the chunks in every view (${recBad} wrong)`);
ok(bufSame, "instance buffers byte-identical old vs new (same instances, only the culls differ)");

// ------------------------------------------------------------------ 3. culls: nothing lost, tighter
const viewCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 6000);
setMultiDrawViewCamera(viewCam);
const sunCam = new THREE.OrthographicCamera(-150, 150, 150, -150, 1, 1500);
const lampCam = new THREE.PerspectiveCamera(100, 1, 0.5, 30);
const _f = new THREE.Frustum(), _M = new THREE.Matrix4(), _b = new THREE.Box3();
const frustumOf = (cam) => _f.setFromProjectionMatrix(_M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), cam.coordinateSystem, cam.reversedDepth);
function place(i) {
  const a = rnd() * Math.PI * 2, r = rnd() * 250, x = centre.x + Math.cos(a) * r, z = centre.z + Math.sin(a) * r, yaw = rnd() * Math.PI * 2, y = 30 + 25 * Math.sin((x + z) / 300);
  viewCam.position.set(x, y + 1.7 + (i % 5 === 0 ? 40 : 0), z); viewCam.rotation.set(i % 5 === 0 ? -0.5 : (rnd() - 0.5) * 0.3, yaw, 0, "YXZ");
  const sun = new THREE.Vector3(Math.cos(yaw * 0.3), 0.6, Math.sin(yaw * 0.3)).normalize();
  sunCam.position.set(x, y, z).addScaledVector(sun, 600); sunCam.lookAt(x, y, z);
  lampCam.position.set(x + 10, y + 6, z + 5); lampCam.lookAt(x + 10, y, z + 5);
  for (const cam of [viewCam, sunCam, lampCam]) { cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); }
}
const decode = (S, list) => list.map((off) => { const r = off / 20; return [Math.floor(r / S.chMax), r % S.chMax]; });
const drawnSet = (S, list) => { const s = new Set(); for (const [k, ch] of decode(S, list)) { const P = S.parts[k]; for (let i = 0; i < P.ch[ch * 2 + 1]; i++) s.add(k * 1e7 + P.ch[ch * 2] + i); } return s; };
const kinds = { view: viewCam, sun: sunCam, lamp: lampCam };
const tally = { view: [0, 0, 0], sun: [0, 0, 0], lamp: [0, 0, 0] };        // [truth, old drawn, new drawn]
let lost = 0, orderBad = 0, permBad = 0, shadowOrderBad = 0, blendBad = 0, frame = 0;
const CAMS = 40;
for (let i = 0; i < CAMS; i++) {
  place(i); frame++;
  for (const [kind, cam] of Object.entries(kinds)) {
    const F = frustumOf(cam);
    for (const c of city) {
      const lo = c.old.set.cull(cam, frame, c.old.view), ln = c.neu.set.cull(cam, frame, c.neu.view), lu = c.neuU.set.cull(cam, frame, c.neuU.view);
      const so = drawnSet(c.old.set, lo), sn = drawnSet(c.neu.set, ln);
      let truth = 0;
      c.g.forEach((g, k) => g.inst.forEach((q, j) => {
        _b.min.set(q.x - q.h, q.y - q.hy, q.z - q.h); _b.max.set(q.x + q.h, q.y + q.hy, q.z + q.h);
        if (!F.intersectsBox(_b)) return;
        truth++;
        const id = k * 1e7 + j;
        if (!so.has(id) || !sn.has(id)) { if (lost++ < 3) console.log(`  lost: ${c.name} ${kind} part ${k} #${j} old ${so.has(id)} new ${sn.has(id)}`); }
      }));
      tally[kind][0] += truth; tally[kind][1] += so.size; tally[kind][2] += sn.size;
      // 4. order
      const sameSet = ln.length === lu.length && [...ln].sort((a, b) => a - b).every((x, j) => x === [...lu].sort((a, b) => a - b)[j]);
      if (!sameSet) permBad++;
      if (kind === "view") {
        const p = cam.matrixWorld.elements, pad = c.neu.set.pad;
        let last = -1;
        for (const [k, ch] of decode(c.neu.set, ln)) {
          const b = c.neu.set.parts[k].chBox, o = ch * 6;
          const dx = Math.max(b[o] - pad - p[12], p[12] - b[o + 3] - pad, 0), dy = Math.max(b[o + 1] - pad - p[13], p[13] - b[o + 4] - pad, 0), dz = Math.max(b[o + 2] - pad - p[14], p[14] - b[o + 5] - pad, 0);
          const q = nearBucket(dx * dx + dy * dy + dz * dz);
          if (q < last) orderBad++;
          last = q;
        }
        const lb = c.neu.set.cull(cam, frame, c.neu.blended), lbu = c.neuU.set.cull(cam, frame, c.neuU.blended);
        if (lb.length !== lbu.length || lb.some((x, j) => x !== lbu[j])) blendBad++;
      } else if (ln.length !== lu.length || ln.some((x, j) => x !== lu[j])) shadowOrderBad++;
    }
  }
}
ok(lost === 0, `no instance lost: every instance whose box meets the frustum is drawn, old and new chunks (${CAMS} places x view / sun shadow / lamp shadow, ${lost} lost)`);
const pct = (k) => (100 * (1 - tally[k][2] / tally[k][1])).toFixed(1);
for (const k of Object.keys(tally)) ok(tally[k][2] <= tally[k][1], `${k}: instances drawn new ${tally[k][2]} <= old ${tally[k][1]} (-${pct(k)} %; truly in the frustum ${tally[k][0]})`);
ok(permBad === 0, `sorted lists draw the same records as unsorted ones (${permBad} differ)`);
ok(orderBad === 0, `view camera, opaque views: records near to far (${orderBad} out of order)`);
ok(shadowOrderBad === 0, `shadow cameras (sun, lamp): the old part / chunk order, untouched (${shadowOrderBad} differ)`);
ok(blendBad === 0, `blended view under the view camera: the old order (${blendBad} differ)`);

// one camera, one frame, new matrices (a point light's 6 cube faces): the cull is redone, not reused
{
  const c = city[0], S = c.neu.set; frame++;
  place(7); const l1 = [...S.cull(lampCam, frame, c.neu.view)];
  lampCam.lookAt(lampCam.position.x + 10, lampCam.position.y, lampCam.position.z); lampCam.updateMatrixWorld(true); lampCam.matrixWorldInverse.copy(lampCam.matrixWorld).invert();
  const F = frustumOf(lampCam), l2 = S.cull(lampCam, frame, c.neu.view);
  let miss = 0;
  c.g.forEach((g, k) => g.inst.forEach((q, j) => { _b.min.set(q.x - q.h, q.y - q.hy, q.z - q.h); _b.max.set(q.x + q.h, q.y + q.hy, q.z + q.h); if (F.intersectsBox(_b) && !drawnSet(S, l2).has(k * 1e7 + j)) miss++; }));
  ok(miss === 0, `same camera + frame, other matrices (cube faces): culled again (${l1.length} -> ${l2.length} records, ${miss} lost)`);
}
// the switches: ?mdsort=0&mdchunk=160 = the old order and chunks (their features.js rows, main.js wiring: the meta row)
{
  globalThis.location = { search: "?mdsort=1&mdchunk=80" };
  const O = await import("../../viewer/multiDraw.js?switches");
  globalThis.location = { search: "" };
  ok(O.MD_SORT === true && O.CHUNK_M === 80 && O.CHUNK_MAX === 128, `?mdsort=1&mdchunk=80: sorted, 80 m / 128 (got ${O.MD_SORT} / ${O.CHUNK_M} / ${O.CHUNK_MAX})`);
}

// ------------------------------------------------------------------ 5. budget
const perPart = cfgNew.chmax * 5 * 4;
ok(perPart <= 2560, `indirect buffer ${perPart} B a part (old ${48 * 20} B); this city ${city.reduce((s, c) => s + c.neu.view.indirect.array.byteLength + c.neu.blended.indirect.array.byteLength, 0)} B over ${city.length} sets x 2 views`);
{
  const c = city[1], S = c.neu.set, v = c.neu.view, k = 2, P = S.parts[k], g = c.g[k];
  v.indirect.clearUpdateRanges(); v.indirect.needsUpdate = false;
  const n = g.inst.length, M = new Float32Array(n * 16), X = new Float32Array(n * 3);
  S.write(k, n, { instanceMatrix: M, treeXf: X }, g.box, g.runs);
  const R = v.indirect.updateRanges, sum = R.reduce((s, r) => s + r.count, 0);
  ok(R.length === 1 && R[0].start === k * S.chMax * 5 && sum === P.nch * 5, `a part's write uploads its own ${P.nch} records only (ranges ${JSON.stringify(R)}, buffer ${v.indirect.array.length} words)`);
  ok(v.indirect.usage !== THREE.DynamicDrawUsage && S.buf.instanceMatrix.usage !== THREE.DynamicDrawUsage, "no DynamicDrawUsage on the indirect / instance buffers");
}
// CPU: a frame's culls (view + sun + lamp for every set), sorted vs unsorted, old vs new chunks (best of rounds: the
// machine may be busy; the browser measures the real city, docs/AGARGARO.md). This synthetic city holds ~3,000 chunks
// (old ~1,500): heavier than the street-level frame, so the absolute numbers are an upper bound.
function timeFrames(which, cams, frames) {
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) { frame++; for (const cam of cams) for (const c of city) { const T = c[which]; T.set.cull(cam, frame, T.view); } }
  return (performance.now() - t0) / frames;
}
place(3);
// (interleaved rounds between two calibrations, again while the machine changed speed; the absolute sort budget * k:
// tools/gate/timing.mjs)
const MT = await measure(() => {
  const R = { old: [], neu: [], neuU: [], vS: [], vU: [] };
  // (short windows, interleaved: 120 rounds of 20 frames, the best of each; 15 windows of 200 frames each held another
  // process's time slice on a busy machine: the ratio swung 1.5-2.04 x)
  for (let r = 0; r < 120; r++) {
    R.old.push(timeFrames("old", [viewCam, sunCam, lampCam], 20)); R.neu.push(timeFrames("neu", [viewCam, sunCam, lampCam], 20)); R.neuU.push(timeFrames("neuU", [viewCam, sunCam, lampCam], 20));
  }
  // the sort: many short windows (30 frames, a few ms: most of them see no preemption), sorted and unsorted back to
  // back; the best of each (a 300-frame window always held some other process's time slice: the difference of two
  // such bests swung 10-35 us on a busy machine)
  for (let r = 0; r < 150; r++) { R.vS.push(timeFrames("neu", [viewCam], 30)); R.vU.push(timeFrames("neuU", [viewCam], 30)); }
  return R;
});
const R = MT.value;
const best = (a) => Math.min(...a), us = (ms) => (ms * 1000).toFixed(1);
if (process.env.MDRAW_DEBUG) console.log(`sort: best ${us(best(R.vS))} - ${us(best(R.vU))} us, k ${MT.k.toFixed(2)}`);
const sortMs = Math.max(0, best(R.vS) - best(R.vU)), visible = city.reduce((s, c) => s + c.neu.set.culls.find((e) => e.cam === viewCam).all.length / 2, 0);
ok(timed(sortMs <= 0.02 * MT.k), `sort CPU ${us(sortMs)} us a frame (${visible} visible chunks in ${city.length} sets; target <= 20 us; ${MT.note})`);
ok(best(R.neu) <= 2 * best(R.old), `whole cull a frame (view + sun + lamp, ${city.length} sets, ${chunksNew} chunks): new ${us(best(R.neu))} us (unsorted ${us(best(R.neuU))}) <= 2 x the 160 m chunks' ${us(best(R.old))} us (${chunksOld} chunks); browser target < 50 us on the real city`);

console.log(fails ? `mdrawCull: ${fails} FAIL` : "mdrawCull: all pass");
process.exitCode = gateExit(fails);   // (75: only timing verdicts failed, rule timing-rows-alone)
