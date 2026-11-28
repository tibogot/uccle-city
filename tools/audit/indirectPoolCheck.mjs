// INDIRECT POOL GATE (claude/indpool, perf job C, docs/PERF_RESEARCH_2026-11.md "Job C result", rule docs/rules/indirect-pool.md).
//   node --import ./tools/heap/register.mjs tools/audit/indirectPoolCheck.mjs [--quiet]      exit 1 on a failure
// WHY: Dawn on D3D12 validates indirect-draw args per indirect BUFFER; the main pass drew ~2,300-2,500 indirect draws
// from 55-69 distinct buffers (one per multi-draw view, one per cell-culled tile mesh). viewer/indirectPool.js puts the
// CPU-written records in one growing buffer; a slot that overlaps another, a misaligned offset or a geometry left on the
// old attribute after a growth draws someone else's records (garbage geometry, holes) without any error.
// RULE: CPU-written indirect records are slots of the one pool (alloc / touch / bind / free); only GPU-written args (atomic
// counters in compute) keep their own attribute, at the listed sites.
// Checks:
//   1. allocator: 4,000 random alloc / free steps on a small pool (it grows): live slots never overlap, stay inside the
//      buffer, byte offsets are multiples of 20 (5 u32: WebGPU wants multiples of 4), the holes stay sorted and merged,
//      used = the sum of the live slots; freeing all leaves one hole = the whole buffer
//   2. growth: the records keep their base and values, every bound geometry points at the new attribute, update
//      ranges after a growth go to the new attribute
//   3. multiDraw on the pool (default): every view's geometry draws from the pool attribute, the views' slots do not
//      overlap, each record = (index count, chunk instances, first index, 0, region + chunk start) at base + its old
//      place, a part's write uploads only its records (one update range at the slot), every culled offset decodes into
//      the view's own slot; ?indpool=old keeps one attribute per view (tools/audit/mdrawCull.mjs checks that layout)
//   4. text: `new THREE.IndirectStorageBufferAttribute` only in viewer/indirectPool.js, the GPU-written exceptions and the
//      ?indpool=old branches (a POOL_ON / else line); cellCull allocs, binds and frees on the geometry's dispose; the
//      features row
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three/webgpu";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
globalThis.window = globalThis; globalThis.location = { search: "" };
const { IndirectPool, POOL_ON, indirectPool, BYTES, WORDS } = await import("../../viewer/indirectPool.js");
let seed = 424242;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
ok(POOL_ON === true && BYTES === 20 && WORDS === 5, `default: the pool on, 5-word / 20-byte records (got ${POOL_ON} / ${WORDS} / ${BYTES})`);

// ------------------------------------------------------------------ 1. allocator
function invariants(P, tag) {
  const live = [...P.slots].sort((a, b) => a.base - b.base);
  let bad = null, used = 0;
  for (let i = 0; i < live.length && !bad; i++) {
    const s = live[i]; used += s.n;
    if (s.base < 0 || s.base + s.n > P.cap) bad = `slot [${s.base}, +${s.n}] outside the buffer (${P.cap})`;
    else if ((s.base * BYTES) % 4 || (s.base * BYTES) % BYTES) bad = `slot ${s.base} byte offset not aligned`;
    else if (i && live[i - 1].base + live[i - 1].n > s.base) bad = `slots [${live[i - 1].base}, +${live[i - 1].n}] and [${s.base}, +${s.n}] overlap`;
  }
  const H = P.holes;
  for (let i = 0; i < H.length && !bad; i++) {
    if (H[i][1] <= 0) bad = `empty hole ${H[i]}`;
    else if (i && H[i - 1][0] + H[i - 1][1] >= H[i][0]) bad = `holes ${H[i - 1]} / ${H[i]} not sorted or not merged`;
    else for (const s of live) if (s.base < H[i][0] + H[i][1] && H[i][0] < s.base + s.n) { bad = `hole ${H[i]} overlaps slot ${s.base}`; break; }
  }
  if (!bad && used !== P.used) bad = `used ${P.used} != the live slots' ${used}`;
  if (!bad && used + H.reduce((t, h) => t + h[1], 0) !== P.cap) bad = `slots + holes != the buffer (${P.cap})`;
  if (bad) ok(false, `${tag}: ${bad}`);
  return !bad;
}
{
  const P = new IndirectPool(64), live = [];
  let good = true, steps = 0;
  for (; steps < 4000 && good; steps++) {
    if (live.length && rnd() < 0.45) P.free(live.splice(Math.floor(rnd() * live.length), 1)[0]);
    else live.push(P.alloc(1 + Math.floor(rnd() * rnd() * 300)));
    good = invariants(P, `step ${steps}`);
  }
  ok(good, `${steps} random alloc / free steps: no overlap, inside the buffer, aligned, holes sorted + merged, used counted (cap 64 -> ${P.cap}, ${P.grows} growths)`);
  ok(P.grows > 0, `the small pool grew (${P.grows} times)`);
  for (const s of live.splice(0)) P.free(s);
  ok(P.used === 0 && P.holes.length === 1 && P.holes[0][0] === 0 && P.holes[0][1] === P.cap, `all freed: one hole = the whole buffer (${JSON.stringify(P.holes)})`);
  const s = P.alloc(5); P.free(s); P.free(s);
  ok(P.used === 0 && P.holes.length === 1, "a double free is ignored");
}

// ------------------------------------------------------------------ 2. growth
{
  const P = new IndirectPool(16);
  const a = P.alloc(10), g = new THREE.BufferGeometry(), g2 = new THREE.BufferGeometry();
  for (let i = 0; i < 50; i++) P.array[a.base * 5 + i] = 1000 + i;
  P.bind(a, g, [P.off(a, 0), P.off(a, 3)]); P.bind(a, g2, null);
  const attr0 = P.attr;
  const b = P.alloc(40);                                    // (does not fit: grows)
  ok(P.attr !== attr0 && P.cap >= 50 && P.grows === 1, `a slot that does not fit grows the buffer (16 -> ${P.cap} records)`);
  ok(a.base === 0 && [...P.array.subarray(0, 50)].every((x, i) => x === 1000 + i), "the records keep their base and values after the growth");
  ok(g.indirect === P.attr && g2.indirect === P.attr, "every bound geometry points at the new attribute");
  ok(g.indirectOffset[1] === 60, `the offsets are unchanged (${g.indirectOffset})`);
  ok(b.base + b.n <= P.cap && invariants(P, "after growth"), "the new slot fits after the growth");
  P.attr.clearUpdateRanges(); P.touch(b, 2, 3);
  const R = P.attr.updateRanges;
  ok(R.length === 1 && R[0].start === (b.base + 2) * 5 && R[0].count === 15 && attr0.updateRanges.length === 0, `touch uploads the slot's records on the new attribute only (${JSON.stringify(R)})`);
  ok(P.attr.usage !== THREE.DynamicDrawUsage, "no DynamicDrawUsage on the pool");
}

// ------------------------------------------------------------------ 3. multiDraw on the pool
{
  const { MultiDrawSet } = await import("../../viewer/multiDraw.js");
  const IP = indirectPool();
  const sets = [];
  for (let s = 0; s < 3; s++) {
    const parts = 3 + s;
    const set = new MultiDrawSet({ name: `t${s}`, parts, attrs: [["instanceMatrix", 16]], cap0: 16 });
    set.pad = 1;
    const geoms = Array.from({ length: parts }, (_, k) => new THREE.BoxGeometry(1 + k * 0.1, 1, 1));
    const view = set.addView({ geoms, material: new THREE.MeshBasicMaterial(), castShadow: true });
    const twin = set.addView({ shareOf: view, material: new THREE.MeshBasicMaterial() });
    const blended = set.addView({ geoms: geoms.map((g, k) => (k % 2 ? g : null)), material: new THREE.MeshBasicMaterial({ transparent: true }) });
    for (let k = 0; k < parts; k++) {
      const n = 20 + k * 7, M = new Float32Array(n * 16), runs = [];
      for (let i = 0; i < n; i++) M.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, s * 500 + k * 40 + (i % 5) * 3, 0, (i / 5 | 0) * 3, 1], i * 16);
      for (let e = 5; e <= n; e += 5) runs.push([e, [s * 500 + k * 40, -1, ((e - 5) / 5) * 3 - 1, s * 500 + k * 40 + 14, 1, ((e - 1) / 5) * 3 + 1]]);
      if (n % 5) runs.push([n, [s * 500 + k * 40, -1, 0, s * 500 + k * 40 + 14, 1, n * 3 / 5 + 1]]);
      set.write(k, n, { instanceMatrix: M }, new Float64Array([s * 500 + k * 40, -1, -1, s * 500 + k * 40 + 14, 1, n]), runs);
    }
    sets.push({ set, view, twin, blended });
  }
  const views = sets.flatMap((x) => [x.view, x.twin, x.blended]);
  ok(views.every((v) => v.geo.indirect === IP.attr && v.indirect === IP.attr), `every view draws from the pool attribute (${views.length} views, pool ${JSON.stringify(IP.stats())})`);
  ok(sets.every((x) => x.twin.slot === x.view.slot && x.twin.base === x.view.base), "a shareOf twin uses its view's slot");
  const own = sets.flatMap((x) => [x.view, x.blended]);
  let ov = 0;
  for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) { const a = own[i].slot, b = own[j].slot; if (a.base < b.base + b.n && b.base < a.base + a.n) ov++; }
  ok(ov === 0 && own.every((v) => v.slot.n === v.mesh.userData.multiDraw.parts.length * v.mesh.userData.multiDraw.chMax), `the views' slots do not overlap and hold parts x chMax records (${ov} overlaps)`);
  let recBad = 0, recN = 0;
  for (const x of sets) for (const v of [x.view, x.blended]) {
    const S = x.set, A = IP.array;
    S.parts.forEach((P, k) => {
      if (!v.ranges[k]) return;
      for (let c = 0; c < P.nch; c++) {
        const o = (v.base + k * S.chMax + c) * 5; recN++;
        if (A[o] !== v.ranges[k][1] || A[o + 1] !== P.ch[c * 2 + 1] || A[o + 2] !== v.ranges[k][0] || A[o + 3] !== 0 || A[o + 4] !== P.off + P.ch[c * 2]) recBad++;
      }
    });
  }
  ok(recN > 0 && recBad === 0, `the records sit at base + their old place, with the old values (${recN} records, ${recBad} wrong)`);
  {
    const x = sets[1], S = x.set, v = x.view, k = 1, P = S.parts[k];
    IP.attr.clearUpdateRanges(); IP.attr.needsUpdate = false;
    const n = 23, M = new Float32Array(n * 16);
    S.write(k, n, { instanceMatrix: M }, new Float64Array([500, -1, -1, 520, 1, 20]), null);
    const R = IP.attr.updateRanges.filter((r) => r.start >= v.base * 5 && r.start < (v.base + v.slot.n) * 5);
    ok(R.length === 1 && R[0].start === (v.base + k * S.chMax) * 5 && R[0].count === P.nch * 5, `a part's write uploads only its records, at the slot (${JSON.stringify(R)})`);
  }
  // culls: every offset of a view's list decodes inside its own slot and back to a drawn chunk
  const cam = new THREE.PerspectiveCamera(60, 1, 0.5, 5000); cam.position.set(600, 400, -400); cam.lookAt(600, 0, 50); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  let offBad = 0, offN = 0;
  for (const x of sets) for (const v of [x.view, x.twin, x.blended]) {
    const list = x.set.cull(cam, 1, v), S = x.set;
    for (const off of list) {
      offN++;
      const r = off / BYTES - v.base, k = Math.floor(r / S.chMax), c = r % S.chMax;
      if (off % BYTES || r < 0 || r >= v.slot.n || !v.ranges[k] || c >= S.parts[k].nch) offBad++;
    }
  }
  ok(offN > 0 && offBad === 0, `every culled offset is 20-aligned and decodes into its view's own slot (${offN} offsets, ${offBad} wrong)`);
}

// ------------------------------------------------------------------ 4. text
{
  const EXC = ["viewer/foliage/grass.js", "viewer/grass/grass.js", "viewer/foliage/plants.js", "viewer/birds/skyFlocks.js"];   // GPU-written args (compute atomics)
  const OLD = ["viewer/multiDraw.js", "viewer/cellCull.js"];                                                                // ?indpool=old branches only
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); } else if (/\.m?js$/.test(e.name) && !/bundle\.js$/.test(e.name)) files.push(p); } };
  for (const d of ["viewer", "labs", "debug"]) if (fs.existsSync(path.join(ROOT, d))) walk(d);
  const bad = [];
  for (const f of files) {
    const lines = src(f).split("\n");
    lines.forEach((l, i) => {
      if (!/new THREE\.IndirectStorageBufferAttribute\b/.test(l) || /^\s*\/\//.test(l)) return;
      if (f === "viewer/indirectPool.js" || EXC.includes(f)) return;
      if (OLD.includes(f) && (/POOL_ON/.test(l) || /^\s*else\b/.test(l))) return;
      bad.push(`${f}:${i + 1}`);
    });
  }
  ok(!bad.length, `new THREE.IndirectStorageBufferAttribute only in indirectPool.js, the GPU-written exceptions (${EXC.length}) and the ?indpool=old branches${bad.length ? `: ${bad.join(", ")}` : ""}`);
  const cc = src("viewer/cellCull.js");
  ok(/indirectPool\(\)/.test(cc) && /\.alloc\(n\)/.test(cc) && /\.bind\(s, g/.test(cc) && /addEventListener\("dispose", \(\) => IP\.free\(s\)\)/.test(cc) && /\(base \+ r\) \* 20/.test(cc), "cellCull: a pool slot per mesh, bound, offsets from its base, freed on the geometry's dispose");
  const md = src("viewer/multiDraw.js");
  ok(/IP\.alloc\(this\.parts\.length \* this\.chMax\)/.test(md) && /\(base \+ src\[i\] \* CHMAX \+ src\[i \+ 1\]\) \* 20/.test(md), "multiDraw: a pool slot per view, culled offsets from its base");
  const feat = src("viewer/features.js");
  ok(/old\("indpool", /.test(feat), "viewer/features.js: the ?indpool=old row");
}

console.log(fails ? `indirectpool: ${fails} FAIL` : "indirectpool: all checks pass");
process.exit(fails ? 1 : 0);
