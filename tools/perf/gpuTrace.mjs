// GPU-PROCESS TRACE WITH THE DAWN CATEGORIES (perf job C, docs/PERF_RESEARCH_2026-11.md "Job C result"). The chrome-devtools
// MCP trace cannot pick categories, so this drives its OWN Chrome over CDP (temp profile, debug port, --mute-audio +
// localStorage uccle-sound=off before any page script), opens the city at a place (debug/featureAB.js at), then
// records `--seconds` of a BROWSER-wide trace with gpu / dawn / disabled-by-default-gpu.dawn / webgpu categories and
// prints the GPU process' events by name (count, total ms, per frame), the ones matching /indirect|valid/i first.
//   node tools/perf/gpuTrace.mjs --base http://localhost:8864 [--place stjob-street] [--query "&indpool=old"]
//        [--seconds 4] [--out trace.json] [--port 9334]
// Close every other city tab first (browser.lock): two cities on one laptop GPU skew each other.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = opt("base", "http://localhost:8864"), PLACE = opt("place", "stjob-street"), QUERY = opt("query", ""), SECONDS = +opt("seconds", 4);
const OUT = opt("out", null), PORT = +opt("port", 9334);
const CHROME = opt("chrome", "C:/Program Files/Google/Chrome/Application/chrome.exe");
const CATS = ["gpu", "dawn", "disabled-by-default-gpu.dawn", "disabled-by-default-gpu.service", "webgpu", "disabled-by-default-webgpu", "toplevel"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prof = mkdtempSync(path.join(tmpdir(), "uccle-gtrace-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--mute-audio", "--no-first-run", "--no-default-browser-check",
  "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=1600,900", "about:blank"], { stdio: "ignore" });
let done = false;
const cleanup = () => {
  if (done) return; done = true;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { stdio: "ignore" }); else try { chrome.kill("SIGKILL"); } catch { /* gone */ }
  for (let i = 0; i < 20; i++) { try { rmSync(prof, { recursive: true, force: true }); break; } catch { const t = Date.now(); while (Date.now() - t < 250); } }
};
process.on("exit", cleanup); process.on("SIGINT", () => { cleanup(); process.exit(130); });

async function connect(url) {
  const ws = new WebSocket(url);
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

(async () => {
  let list = null, ver = null;
  for (let i = 0; i < 60 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(500); } }
  const page = list?.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const P = await connect(page.webSocketDebuggerUrl), B = await connect(ver.webSocketDebuggerUrl);
  await P.send("Page.enable"); await P.send("Runtime.enable");
  await P.send("Page.addScriptToEvaluateOnNewDocument", { source: "try{localStorage.setItem('uccle-sound','off')}catch(e){}" });
  const url = `${BASE}/viewer/index.html?ring=1&far=1&time=golden&traffic=0${QUERY}`;
  console.log(`open ${url}`);
  await P.send("Page.navigate", { url });
  await sleep(3000);
  await evalP(P, `(async()=>{for(let i=0;i<120;i++){if(window.viewer?.world?.tiles?.length)break;await new Promise(r=>setTimeout(r,2500));}})()`);
  await evalP(P, `(async()=>{const A=await import('/debug/featureAB.js');await A.at(${JSON.stringify(PLACE)},{settle:8});})()`);
  const counts = await evalP(P, `(async()=>{const C=await import('/debug/indirectCount.js');C.start();await C.wait(2000);C.stop();const r=C.report();return {max:r.maxDistinctBuffersInAPass,main:Object.entries(r.byPass).filter(([,b])=>b.indAvg>100).map(([k,b])=>[k,b.indAvg,b.bufsAvg])};})()`);
  console.log("indirectCount:", JSON.stringify(counts));
  const events = [];
  B.on.set("Tracing.dataCollected", (p) => { for (const e of p.value) events.push(e); });
  const complete = new Promise((r) => B.on.set("Tracing.tracingComplete", r));
  await B.send("Tracing.start", { transferMode: "ReportEvents", traceConfig: { recordMode: "recordAsMuchAsPossible", includedCategories: CATS } });
  const raf0 = await evalP(P, `(window.__gtr=0,(function f(){window.__gtr++;requestAnimationFrame(f)})(),0)`);
  await sleep(SECONDS * 1000);
  const frames = await evalP(P, `window.__gtr`) - raf0;
  await B.send("Tracing.end");
  await complete;
  // process names
  const pname = {};
  for (const e of events) if (e.ph === "M" && e.name === "process_name") pname[e.pid] = e.args?.name;
  const gpuPid = +Object.keys(pname).find((k) => /GPU/i.test(pname[k]));
  const by = new Map();
  for (const e of events) {
    if (e.ph !== "X" && e.ph !== "B") continue;
    const k = `${e.pid === gpuPid ? "gpu" : pname[e.pid] || e.pid} ${e.cat} ${e.name}`;
    const b = by.get(k) || { n: 0, ms: 0 };
    b.n++; b.ms += (e.dur || 0) / 1000; by.set(k, b);
  }
  const rows = [...by.entries()].map(([k, b]) => ({ k, n: b.n, ms: +b.ms.toFixed(2), perFrame: +(b.n / Math.max(1, frames)).toFixed(1), msPerFrame: +(b.ms / Math.max(1, frames)).toFixed(3) }));
  const hit = rows.filter((r) => /indirect|valid/i.test(r.k));
  console.log(`${events.length} events, ${frames} frames, GPU pid ${gpuPid}`);
  console.log("-- /indirect|valid/i --"); for (const r of hit) console.log(JSON.stringify(r));
  console.log("-- top GPU-process events by ms --"); for (const r of rows.filter((r) => r.k.startsWith("gpu ")).sort((a, b) => b.ms - a.ms).slice(0, 30)) console.log(JSON.stringify(r));
  if (OUT) writeFileSync(OUT, JSON.stringify({ traceEvents: events }));
  try { await Promise.race([B.send("Browser.close"), sleep(1500)]); } catch { /* closing */ }
  cleanup();
  process.exit(0);
})().catch((e) => { console.error(e); cleanup(); process.exit(1); });
