// HEAP SNAPSHOT SUMMARY + DIFF (perf9, docs/PERF_GAME.md round 9). A 1.5-2 GB heap gives a multi-GB .heapsnapshot that
// JSON.parse cannot take (and DevTools' own comparison view needs the GUI): this streams the file once, keeps the nodes in
// typed arrays (~22 bytes a node) and writes a small JSON summary; two summaries are then compared.
//   node --max-old-space-size=6000 tools/perf/heapsnap.mjs sum start.heapsnapshot  > start.json
//   node --max-old-space-size=6000 tools/perf/heapsnap.mjs sum play30.heapsnapshot > play30.json
//   node tools/perf/heapsnap.mjs diff start.json play30.json            (classes by growth, their retainers)
// Summary: totals by node type; by class ("object:BufferAttribute", "closure:onObjectUpdate", "string", "native:..."),
// count + self MB; for the top classes their RETAINERS: the first strong edge that reaches each object (parent class
// . edge name), summed by self size: e.g. "string <- object:NodeBuilderState.fragmentShader". Self sizes only: a
// dominator tree (retained sizes) is out of reach for 20 M+ nodes here; the first-retainer split names the holders.
// Note: ArrayBuffer contents show as "native:system / JSArrayBufferData" (or similar) here, but performance.memory's
// usedJSHeapSize does NOT count them (V8 external memory): compare "heapNoBuffers" with the page's heap number.
import fs from "node:fs";

const MB = (b) => +(b / 1048576).toFixed(1);

async function summarize(file, { top = 60, retTop = 8 } = {}) {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(1 << 20);
  const hn = fs.readSync(fd, head, 0, head.length, 0);
  const htxt = head.subarray(0, hn).toString("latin1");
  const ni = htxt.indexOf('"nodes":[');
  if (ni < 0) throw new Error("no nodes array in the first MB");
  const meta = JSON.parse(htxt.slice(0, ni).replace(/,\s*$/, "") + "}").snapshot;
  const nf = meta.meta.node_fields, ef = meta.meta.edge_fields;
  const NF = nf.length, EF = ef.length;
  const nodeTypes = meta.meta.node_types[0], edgeTypes = meta.meta.edge_types[0];
  const N = meta.node_count, E = meta.edge_count;
  const fT = nf.indexOf("type"), fN = nf.indexOf("name"), fS = nf.indexOf("self_size"), fE = nf.indexOf("edge_count");
  const eT = ef.indexOf("type"), eN = ef.indexOf("name_or_index"), eTo = ef.indexOf("to_node");
  const nType = new Uint8Array(N), nName = new Uint32Array(N), nSelf = new Float64Array(N), nEdges = new Uint32Array(N);
  const retFrom = new Int32Array(N).fill(-1), retName = new Uint32Array(N), retType = new Uint8Array(N);
  const WEAK = edgeTypes.indexOf("weak"), SHORT = edgeTypes.indexOf("shortcut"), ELEM = edgeTypes.indexOf("element"), HIDDEN = edgeTypes.indexOf("hidden");
  const strings = [];
  // ---- the stream: sections "nodes", "edges", (others skipped), "strings"
  let section = "seek", num = 0, inNum = false, field = 0, idx = 0;
  let edgeFrom = 0, edgesLeft = 0, eType = 0, eName = 0;
  let inStr = false, esc = false, strBuf = [];
  const keyBuf = { s: "" };
  const onNodeNum = (v) => {
    const node = idx;
    if (field === fT) nType[node] = v; else if (field === fN) nName[node] = v; else if (field === fS) nSelf[node] = v; else if (field === fE) nEdges[node] = v;
    if (++field === NF) { field = 0; idx++; }
  };
  const onEdgeNum = (v) => {
    while (edgesLeft === 0 && edgeFrom < N) { edgesLeft = nEdges[edgeFrom]; if (edgesLeft === 0) edgeFrom++; }
    if (field === eT) eType = v; else if (field === eN) eName = v;
    else if (field === eTo) {
      const to = v / NF;
      if (eType !== WEAK && eType !== SHORT && retFrom[to] < 0) { retFrom[to] = edgeFrom; retName[to] = eName; retType[to] = eType; }
    }
    if (++field === EF) { field = 0; idx++; if (--edgesLeft === 0) edgeFrom++; }
  };
  const start = ni + '"nodes":['.length;
  section = "nodes"; idx = 0; field = 0;
  const buf = Buffer.alloc(16 << 20);
  let pos = start;
  for (;;) {
    const n = fs.readSync(fd, buf, 0, buf.length, pos);
    if (n <= 0) break;
    pos += n;
    for (let i = 0; i < n; i++) {
      const c = buf[i];
      if (section === "nodes" || section === "edges") {
        if (c >= 48 && c <= 57) { num = num * 10 + (c - 48); inNum = true; continue; }
        if (inNum) { (section === "nodes" ? onNodeNum : onEdgeNum)(num); num = 0; inNum = false; }
        if (c === 93) { section = section === "nodes" ? "between1" : "between2"; keyBuf.s = ""; }        // ]
        continue;
      }
      if (section === "between1" || section === "between2") {
        keyBuf.s += String.fromCharCode(c);
        if (keyBuf.s.length > 64) keyBuf.s = keyBuf.s.slice(-32);
        if (section === "between1" && keyBuf.s.endsWith('"edges":[')) { section = "edges"; idx = 0; field = 0; edgeFrom = 0; edgesLeft = 0; }
        else if (section === "between2" && keyBuf.s.endsWith('"strings":[')) section = "strings";
        continue;
      }
      if (section === "strings") {
        if (!inStr) { if (c === 34) { inStr = true; strBuf = []; } else if (c === 93) { section = "done"; break; } continue; }
        if (esc) { esc = false; if (strBuf.length < 400) strBuf.push(92, c); continue; }
        if (c === 92) { esc = true; continue; }
        if (c === 34) {
          inStr = false;
          let s; try { s = JSON.parse('"' + Buffer.from(strBuf).toString("utf8") + '"'); } catch { s = Buffer.from(strBuf).toString("latin1"); }
          strings.push(s.length > 120 ? s.slice(0, 120) : s);
          continue;
        }
        if (strBuf.length < 400) strBuf.push(c);
      }
    }
    if (section === "done") break;
  }
  fs.closeSync(fd);
  // ---- the summary
  const S = (i) => strings[i] ?? `#${i}`;
  const typeName = (t) => nodeTypes[t] ?? `t${t}`;
  const cls = (n) => {
    const t = typeName(nType[n]);
    if (t === "string" || t === "concatenated string" || t === "sliced string") return "string";
    if (t === "number" || t === "code" || t === "object shape" || t === "symbol" || t === "bigint") return t;
    if (t === "array") return `array:${S(nName[n]) || "(array)"}`;
    if (t === "closure") return "closure";
    return `${t}:${S(nName[n]).slice(0, 60)}`;
  };
  const byType = new Map(), byCls = new Map();
  let total = 0, buffers = 0;
  for (let n = 0; n < N; n++) {
    const s = nSelf[n]; total += s;
    const t = typeName(nType[n]);
    const bt = byType.get(t) || [0, 0]; bt[0]++; bt[1] += s; byType.set(t, bt);
    const k = cls(n);
    const bc = byCls.get(k) || [0, 0]; bc[0]++; bc[1] += s; byCls.set(k, bc);
    if (t === "native" && /JSArrayBufferData|ArrayBuffer/.test(S(nName[n]))) buffers += s;
  }
  const topCls = [...byCls].sort((a, b) => b[1][1] - a[1][1]).slice(0, top);
  const want = new Set(topCls.slice(0, 25).map(([k]) => k));
  const rets = new Map();
  for (let n = 0; n < N; n++) {
    const k = cls(n);
    if (!want.has(k)) continue;
    const f = retFrom[n];
    const en = retType[n] === ELEM || retType[n] === HIDDEN ? "[]" : S(retName[n]);
    const rk = f < 0 ? "(root)" : `${cls(f)}.${en}`;
    let m = rets.get(k); if (!m) rets.set(k, (m = new Map()));
    m.set(rk, (m.get(rk) || 0) + nSelf[n]);
  }
  // retainer CHAINS (first strong retainers, up to `depth` levels) for the biggest classes: "ArrayBuffer.backing_store
  // <- Float32Array.buffer <- BufferAttribute.array <- Object.position <- BufferGeometry.attributes"
  const depth = +(process.env.CHAIN_DEPTH || 6);
  const chains = new Map();
  const wantChains = new Set(topCls.slice(0, 6).map(([k]) => k));
  for (let n = 0; n < N; n++) {
    const k = cls(n);
    if (!wantChains.has(k) || nSelf[n] < 1024) continue;
    const parts = [];
    let c = n;
    for (let d = 0; d < depth; d++) {
      const f = retFrom[c];
      if (f < 0) { parts.push("(root)"); break; }
      const en = retType[c] === ELEM || retType[c] === HIDDEN ? "[]" : S(retName[c]).slice(0, 30);
      parts.push(`${cls(f).replace(/^object:/, "")}.${en}`);
      c = f;
    }
    const key = parts.join(" <- ");
    let m = chains.get(k); if (!m) chains.set(k, (m = new Map()));
    const e = m.get(key) || [0, 0]; e[0]++; e[1] += nSelf[n]; m.set(key, e);
  }
  return {
    chains: Object.fromEntries([...chains].map(([k, m]) => [k, [...m].sort((a, b) => b[1][1] - a[1][1]).slice(0, 40).map(([r, [c, s]]) => [r, c, MB(s)])])),
    file, nodes: N, edges: E, totalMB: MB(total), buffersMB: MB(buffers), heapNoBuffersMB: MB(total - buffers),
    byType: [...byType].sort((a, b) => b[1][1] - a[1][1]).map(([k, [c, s]]) => [k, c, MB(s)]),
    byClass: topCls.map(([k, [c, s]]) => [k, c, MB(s)]),
    retainers: Object.fromEntries([...rets].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1]).slice(0, retTop).map(([r, s]) => [r, MB(s)])])),
    allClasses: Object.fromEntries([...byCls].filter(([, v]) => v[1] > 262144).map(([k, [c, s]]) => [k, [c, MB(s)]])),
  };
}

function diff(a, b, top = 40) {
  const A = a.allClasses, B = b.allClasses, keys = new Set([...Object.keys(A), ...Object.keys(B)]);
  const rows = [...keys].map((k) => { const x = A[k] || [0, 0], y = B[k] || [0, 0]; return [k, y[0] - x[0], +(y[1] - x[1]).toFixed(1), y[1]]; })
    .sort((p, q) => q[2] - p[2]);
  return { totalMB: [a.totalMB, b.totalMB, +(b.totalMB - a.totalMB).toFixed(1)], heapNoBuffersMB: [a.heapNoBuffersMB, b.heapNoBuffersMB],
    grew: rows.slice(0, top), shrank: rows.slice(-10).reverse(), retainersAfter: b.retainers };
}

const [, , cmd, f1, f2] = process.argv;
if (cmd === "sum") console.log(JSON.stringify(await summarize(f1), null, 1));
else if (cmd === "diff") console.log(JSON.stringify(diff(JSON.parse(fs.readFileSync(f1, "utf8")), JSON.parse(fs.readFileSync(f2, "utf8"))), null, 1));
else console.log("usage: heapsnap.mjs sum file.heapsnapshot > s.json | heapsnap.mjs diff a.json b.json");
