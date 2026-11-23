// PER-FRAME ALLOCATION SAMPLER (perf job B, docs/PERF_RESEARCH_2026-11.md "Job B", rule docs/rules/alloc-rate.md).
// The chrome-devtools MCP has no HeapProfiler, so this drives its OWN Chrome over CDP (a temp profile, a debug port, the
// sound off: --mute-audio + localStorage uccle-sound=off before any page script), runs the scripted falcon flight
// (debug/falconStutter.js run) or the police drive (debug/gamePerf.js police) under HeapProfiler.startSampling with the
// objects collected by minor AND major GCs kept (so short-lived garbage counts, not only what survives), and writes the
// top allocating functions with bytes per frame.
//   node tools/perf/allocSample.mjs --base http://localhost:8861 --mode falcon|police [--seconds 40] [--query "&x=old"]
//        [--out file.json] [--profile raw.json] [--top 30] [--port 9333] [--interval 16384]
// Two views of the same profile: "self" (the function that allocated, three's internals included) and "ours" (each
// sample in OUR code charged to that function; one in a builtin as "<our nearest frame> > builtin"; one inside three as
// "[lib] fn < our nearest frame": what to fix on our side). `--from raw.json` re-reads a saved --profile (no browser). Close every other
// WebGPU tab first: two cities on one laptop GPU skew each other (MB/frame is robust to load, frame times are not).
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = opt("base", "http://localhost:8861"), MODE = opt("mode", "falcon"), SECONDS = +opt("seconds", 40);
const QUERY = opt("query", ""), OUT = opt("out", null), RAWOUT = opt("profile", null), TOP = +opt("top", 30), PORT = +opt("port", 9333), INTERVAL = +opt("interval", 16384);
const CHROME = opt("chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FROM = opt("from", null);
const prof = FROM ? null : mkdtempSync(path.join(tmpdir(), "uccle-alloc-"));
const chrome = FROM ? null : spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--mute-audio", "--no-first-run", "--no-default-browser-check",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=1600,900",
  "--enable-precise-memory-info", "about:blank"], { stdio: "ignore" });
let done = false;
// (the whole process tree, synchronously: chrome.kill() alone left the browser running a city on Windows)
const cleanup = () => {
  if (done || FROM) return; done = true;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { stdio: "ignore" }); else try { chrome.kill("SIGKILL"); } catch { /* gone */ }
  for (let i = 0; i < 20; i++) { try { rmSync(prof, { recursive: true, force: true }); break; } catch { const t = Date.now(); while (Date.now() - t < 250); } }
};
process.on("exit", cleanup); process.on("SIGINT", () => { cleanup(); process.exit(130); });

async function cdp() {
  let list = null;
  for (let i = 0; i < 60 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(500); } }
  const page = list?.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const wait = new Map(), on = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { const [r, j] = wait.get(d.id); wait.delete(d.id); d.error ? j(new Error(d.error.message)) : r(d.result); } else if (d.method) on.get(d.method)?.(d.params); };
  const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; wait.set(i, [r, j]); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, on, ws };
}
const evalP = async (C, expr, timeout = 600000) => {
  const r = await C.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

const OURS = /\/(viewer|labs)\//;   // (debug/ = the harness: its wrappers are see-through, their callees charge the viewer frame above)
const shortUrl = (u) => (u || "").replace(/^https?:\/\/[^/]+\//, "").replace(/\?.*$/, "");
function aggregate(profile, frames) {
  const self = new Map(), ours = new Map();
  let total = 0;
  const add = (m, k, b) => m.set(k, (m.get(k) || 0) + b);
  // "ours": a sample whose allocating function is OUR code is charged to it; one in a builtin (no url: next, subarray,
  // push, Set, ...) to "<our nearest frame> > builtin"; one inside three / vendor to "three fn < our nearest frame"
  const walk = (n, near) => {
    const cf = n.callFrame, u = shortUrl(cf.url);
    const key = `${cf.functionName || "(anon)"} ${u}:${cf.lineNumber + 1}`;
    const own = OURS.test("/" + u), near2 = own ? key : near;
    if (n.selfSize) {
      total += n.selfSize;
      add(self, key, n.selfSize);
      add(ours, own ? key : !u ? `${near || "(no own frame)"} > ${cf.functionName || "(builtin)"}` : `[lib] ${key.replace(/npm\/three@[\d.]+\/build\//, "")} < ${near || "(no own frame)"}`, n.selfSize);
    }
    for (const ch of n.children || []) walk(ch, near2);
  };
  walk(profile.head, null);
  const rows = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([fn, b]) => ({ fn, MB: +(b / 1e6).toFixed(1), KBperFrame: +(b / 1e3 / Math.max(1, frames)).toFixed(1), pct: +(100 * b / total).toFixed(1) }));
  return { totalMB: +(total / 1e6).toFixed(0), KBperFrame: +(total / 1e3 / Math.max(1, frames)).toFixed(1), self: rows(self), ours: rows(ours) };
}

const print = (agg) => {
  console.log("\n-- ours: our allocating function / our frame > builtin / [lib] fn < our frame (KB/frame) --");
  for (const r of agg.ours) console.log(`${String(r.KBperFrame).padStart(7)}  ${String(r.pct).padStart(5)} %  ${r.fn}`);
  console.log("\n-- by allocating function (self) --");
  for (const r of agg.self) console.log(`${String(r.KBperFrame).padStart(7)}  ${String(r.pct).padStart(5)} %  ${r.fn}`);
};
if (FROM) { const raw = JSON.parse(readFileSync(FROM, "utf8")); const agg = aggregate(raw.profile, raw.frames); console.log(`${raw.frames} frames, ${agg.totalMB} MB, ${agg.KBperFrame} KB/frame`); print(agg); process.exit(0); }
(async () => {
  const C = await cdp();
  await C.send("Page.enable"); await C.send("Runtime.enable");
  await C.send("Page.addScriptToEvaluateOnNewDocument", { source: "try{localStorage.setItem('uccle-sound','off')}catch(e){}" });
  const url = `${BASE}/viewer/index.html?game=${MODE}${QUERY}`;
  console.log(`open ${url}`);
  await C.send("Page.navigate", { url });
  await sleep(3000);
  // ready: the play loader gone and the game kit up
  const readyExpr = MODE === "falcon"
    ? `(async()=>{const F=await import('/debug/falconStutter.js');return await F.ready({maxMs:300000});})()`
    : `(async()=>{const t0=performance.now();while(performance.now()-t0<300000){const k=window.__game;if(globalThis.__playAt&&k?.current?.def.id==='police'&&k.host.driver?.on&&!document.body.classList.contains('loading'))return Math.round(performance.now()-t0);await new Promise(r=>setTimeout(r,500));}throw new Error('police not ready');})()`;
  const readyMs = await evalP(C, readyExpr);
  console.log(`ready after ${readyMs} ms; settle 8 s`);
  await sleep(8000);
  await C.send("HeapProfiler.enable");
  await C.send("HeapProfiler.collectGarbage");
  await C.send("HeapProfiler.startSampling", { samplingInterval: INTERVAL, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  const runExpr = MODE === "falcon"
    ? `(async()=>{const F=await import('/debug/falconStutter.js');const r=await F.run({seconds:${SECONDS}});return {frames:r.frames.length, brief:F.brief(r)};})()`
    : `(async()=>{const G=await import('/debug/gamePerf.js');const r=await G.police({seconds:${SECONDS}});return {frames:r.frames, brief:{frameMs:r.frameMs,cpu:r.cpuLoopMs,gc:{n:r.gc.n,heapMB:r.gc.heapMB},valid:r.valid}};})()`;
  const res = await evalP(C, runExpr);
  const { profile } = await C.send("HeapProfiler.stopSampling");
  const agg = aggregate(profile, res.frames);
  const out = { at: new Date().toISOString(), url, mode: MODE, seconds: SECONDS, frames: res.frames, run: res.brief, ...agg };
  console.log(JSON.stringify({ mode: MODE, query: QUERY, frames: res.frames, totalMB: agg.totalMB, KBperFrame: agg.KBperFrame, run: res.brief }, null, 1));
  console.log("\n-- ours: our allocating function / our frame > builtin / [lib] fn < our frame (KB/frame) --");
  for (const r of agg.ours) console.log(`${String(r.KBperFrame).padStart(7)}  ${String(r.pct).padStart(5)} %  ${r.fn}`);
  console.log("\n-- by allocating function (self) --");
  for (const r of agg.self) console.log(`${String(r.KBperFrame).padStart(7)}  ${String(r.pct).padStart(5)} %  ${r.fn}`);
  if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
  if (RAWOUT) writeFileSync(RAWOUT, JSON.stringify({ frames: res.frames, profile }));
  try { await Promise.race([C.send("Browser.close"), sleep(1500)]); } catch { /* closing */ }
  C.ws.close();
  cleanup();
  process.exit(0);
})().catch((e) => { console.error(e); cleanup(); process.exit(1); });
