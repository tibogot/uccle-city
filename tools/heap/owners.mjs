// HEAP OWNERS (docs/HEAP.md): who holds the big ArrayBuffer backing stores of a .heapsnapshot, ALL retainers (not the
// first one tools/perf/heapsnap.mjs keeps), walked up through native / system / hidden nodes until a JS object with a
// name (a class, a closure's context, a Map...) is reached: for the round-9 "193 MB held only by other native
// ArrayBuffers" (no JS owner within 40 first-retainer levels).
//   node --max-old-space-size=6000 tools/heap/owners.mjs x.heapsnapshot [--min 262144] [--depth 8] > owners.json
// One stream per level (a 520 MB file: ~6 s each). Output: per owner path (the classes and edge names from the buffer
// up), count + MB; and the biggest single buffers with their full retainer lists.
import fs from "node:fs";

const args = process.argv.slice(2);
const file = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args[i + 1] : d; };
const MIN = opt("--min", 262144), DEPTH = opt("--depth", 8), MORE = opt("--more", 3);
const MB = (b) => +(b / 1048576).toFixed(2);

function meta() {
  const fd = fs.openSync(file, "r"), head = Buffer.alloc(1 << 20), n = fs.readSync(fd, head, 0, head.length, 0);
  fs.closeSync(fd);
  const t = head.subarray(0, n).toString("latin1"), ni = t.indexOf('"nodes":[');
  return { m: JSON.parse(t.slice(0, ni).replace(/,\s*$/, "") + "}").snapshot, start: ni + '"nodes":['.length };
}
const { m: M, start } = meta();
const NF = M.meta.node_fields.length, EF = M.meta.edge_fields.length;
const fT = M.meta.node_fields.indexOf("type"), fN = M.meta.node_fields.indexOf("name"), fS = M.meta.node_fields.indexOf("self_size"), fE = M.meta.node_fields.indexOf("edge_count");
const eT = M.meta.edge_fields.indexOf("type"), eN = M.meta.edge_fields.indexOf("name_or_index"), eTo = M.meta.edge_fields.indexOf("to_node");
const nodeTypes = M.meta.node_types[0], edgeTypes = M.meta.edge_types[0];
const N = M.node_count;
const nType = new Uint8Array(N), nName = new Uint32Array(N), nSelf = new Float64Array(N), nEdges = new Uint32Array(N);
const strings = [];

/** one pass over the file; onEdge(from, type, name, to) for every edge when `edges` is set */
function stream({ nodes = false, edges = null, strs = false }) {
  const fd = fs.openSync(file, "r"), buf = Buffer.alloc(16 << 20);
  let pos = start, section = "nodes", num = 0, inNum = false, field = 0, idx = 0, key = "";
  let from = 0, left = 0, et = 0, en = 0, inStr = false, esc = false, sb = [];
  for (;;) {
    const n = fs.readSync(fd, buf, 0, buf.length, pos);
    if (n <= 0) break;
    pos += n;
    for (let i = 0; i < n; i++) {
      const c = buf[i];
      if (section === "nodes" || section === "edges") {
        if (c >= 48 && c <= 57) { num = num * 10 + (c - 48); inNum = true; continue; }
        if (inNum) {
          if (section === "nodes") {
            if (nodes) { if (field === fT) nType[idx] = num; else if (field === fN) nName[idx] = num; else if (field === fS) nSelf[idx] = num; else if (field === fE) nEdges[idx] = num; }
            if (++field === NF) { field = 0; idx++; }
          } else if (edges) {
            while (left === 0 && from < N) { left = nEdges[from]; if (left === 0) from++; }
            if (field === eT) et = num; else if (field === eN) en = num; else if (field === eTo) edges(from, et, en, num / NF);
            if (++field === EF) { field = 0; if (--left === 0) from++; }
          } else if (++field === EF) field = 0;
          num = 0; inNum = false;
        }
        if (c === 93) { section = section === "nodes" ? "b1" : "b2"; key = ""; if (section === "b2" && !strs) { fs.closeSync(fd); return; } }
        continue;
      }
      if (section === "b1" || section === "b2") {
        key += String.fromCharCode(c); if (key.length > 64) key = key.slice(-32);
        if (section === "b1" && key.endsWith('"edges":[')) { section = "edges"; field = 0; from = 0; left = 0; }
        else if (section === "b2" && key.endsWith('"strings":[')) section = "strings";
        continue;
      }
      if (section === "strings") {
        if (!inStr) { if (c === 34) { inStr = true; sb = []; } else if (c === 93) { fs.closeSync(fd); return; } continue; }
        if (esc) { esc = false; if (sb.length < 240) sb.push(92, c); continue; }
        if (c === 92) { esc = true; continue; }
        if (c === 34) { inStr = false; let s; try { s = JSON.parse('"' + Buffer.from(sb).toString("utf8") + '"'); } catch { s = Buffer.from(sb).toString("latin1"); } strings.push(s.slice(0, 80)); continue; }
        if (sb.length < 240) sb.push(c);
      }
    }
  }
  fs.closeSync(fd);
}
const t0 = Date.now();
stream({ nodes: true, strs: true });
const S = (i) => strings[i] ?? `#${i}`;
const tn = (n) => nodeTypes[nType[n]] ?? "?";
const label = (n) => `${tn(n)}:${S(nName[n]).slice(0, 50)}`;
// a JS owner: an object / closure / array with a real name (not the buffer machinery)
const machinery = (n) => { const t = tn(n), s = S(nName[n]); return t === "native" || t === "hidden" || (t === "object" && /^(ArrayBuffer|SharedArrayBuffer|system \/|\(system\)|[A-Z][a-z]+(8|16|32|64)(Clamped)?Array|DataView|BigU?Int64Array)/.test(s)) || t === "synthetic"; };
const targets = [];
for (let n = 0; n < N; n++) if (tn(n) === "native" && nSelf[n] >= MIN && /ArrayBuffer|BackingStore/i.test(S(nName[n]))) targets.push(n);
let bytes = 0; for (const n of targets) bytes += nSelf[n];
console.error(`${targets.length} backing stores >= ${MIN} B: ${MB(bytes)} MB (pass 1 ${Date.now() - t0} ms)`);
// level by level: the retainers of the frontier
const ret = new Map();                    // node -> [[from, edgeType, edgeName]]
let frontier = new Set(targets);
const WEAK = edgeTypes.indexOf("weak");
for (let d = 0; d < DEPTH && frontier.size; d++) {
  stream({ edges: (from, et, en, to) => { if (et === WEAK || !frontier.has(to)) return; let r = ret.get(to); if (!r) ret.set(to, (r = [])); if (r.length < 40) r.push([from, et, en]); } });
  const next = new Set();
  for (const n of frontier) for (const [f] of ret.get(n) || []) if (machinery(f) && !ret.has(f)) next.add(f);
  console.error(`level ${d + 1}: ${frontier.size} nodes, next ${next.size} (${Date.now() - t0} ms)`);
  frontier = next;
}
// the owners' own retainers, MORE levels up (first strong one each)
const ret2 = new Map();
{ let fr = new Set();
  for (const n of targets) for (const [f] of ret.get(n) || []) for (const [g] of ret.get(f) || []) if (!machinery(g)) fr.add(g);
  for (const n of [...ret.keys()]) for (const [f] of ret.get(n)) if (!machinery(f)) fr.add(f);
  for (let k = 0; k < MORE && fr.size; k++) {
    stream({ edges: (from, et, en, to) => { if (et === WEAK || edgeTypes[et] === "shortcut" || !fr.has(to) || ret2.has(to)) return; ret2.set(to, [[from, et, en]]); } });
    const nx = new Set(); for (const n of fr) { const r = ret2.get(n); if (r) nx.add(r[0][0]); } fr = nx;
  } }
const edgeName = (et, en) => (edgeTypes[et] === "element" || edgeTypes[et] === "hidden" ? `[${en}]` : S(en));
/** the owner path of a buffer: the SHORTEST way up through the machinery (native wrappers of transferred buffers
 *  point at each other: the first retainer can be a cycle) to the first JS owner */
function path(n) {
  const prev = new Map([[n, null]]);
  let level = [n];
  for (let d = 0; d < DEPTH && level.length; d++) {
    const next = [];
    for (const c of level) for (const [f, et, en] of ret.get(c) || []) {
      if (prev.has(f)) continue;
      prev.set(f, [c, et, en]);
      if (!machinery(f)) {
        const parts = []; let x = f;
        while (prev.get(x)) { const [c2, a, b] = prev.get(x); parts.push(`${label(x)}.${edgeName(a, b)}`); x = c2; }
        // (+ MORE levels above the owner, first retainers: Object.data <- DataTexture.image ...)
        let up = f; const more = [];
        for (let k = 0; k < MORE; k++) { const r = ret2.get(up)?.[0]; if (!r) break; more.push(`${label(r[0])}.${edgeName(r[1], r[2])}`); up = r[0]; }
        return [...parts.reverse(), ...more].join(" <- ");
      }
      next.push(f);
    }
    level = next;
  }
  return `(no JS owner within ${DEPTH}: ${(ret.get(n) || []).slice(0, 3).map(([f, a, b]) => `${label(f)}.${edgeName(a, b)}`).join(" | ")})`;
}
const byPath = new Map();
for (const n of targets) { const p = path(n); const e = byPath.get(p) || [0, 0]; e[0]++; e[1] += nSelf[n]; byPath.set(p, e); }
const big = targets.slice().sort((a, b) => nSelf[b] - nSelf[a]).slice(0, 25).map((n) => ({ MB: MB(nSelf[n]), node: label(n),
  retainers: (ret.get(n) || []).map(([f, et, en]) => `${label(f)}.${edgeName(et, en)} <- ${(ret.get(f) || []).slice(0, 4).map(([g, a, b]) => `${label(g)}.${edgeName(a, b)}`).join(" | ")}`) }));
console.log(JSON.stringify({ file, buffers: targets.length, MB: MB(bytes), byOwner: [...byPath].sort((a, b) => b[1][1] - a[1][1]).slice(0, 60).map(([p, [c, s]]) => [p, c, MB(s)]), biggest: big }, null, 1));
