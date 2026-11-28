// GPU WATCH (claude/xmasperf4, rule timing-gpu-state, docs/perf/PREFLIGHT.md): what the GPU did DURING a timed run.
// tools/perf/preflight.ps1 reads the GPU once, at rest; on this laptop (RTX 4050 Laptop, 30-35 W ceiling) a city page
// at 60 Hz heats it from ~56 C to 82-85 C within ~15 min and then runs it under its software power cap. A GPU A/B
// difference (debug/xmasPerf.js) scales with the clocks it ran at: 2026-11-28 the 24 Nov commit itself read 0.43 ms for
// the layer at street level, not 0.12. Run this around every timed run and print it with the numbers:
//   node tools/perf/gpuWatch.mjs start             (background sampler, 1 s, writes <tmp>/gpuwatch.csv)
//   node tools/perf/gpuWatch.mjs stop              (stops it, prints the summary + verdict)
//   node tools/perf/gpuWatch.mjs once              (one sample now)
// Verdict: HOT when the median temperature >= 78 C or >= 25 % of the samples were power / thermal capped; a HOT run's
// timing rows are an upper bound, not a regression (compare only inside one alternated run, never across sessions).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const Q = "timestamp,temperature.gpu,clocks.sm,clocks.max.sm,power.draw,utilization.gpu,clocks_event_reasons.active";
const DIR = path.join(os.tmpdir(), "uccle-gpuwatch");
const CSV = path.join(DIR, "gpuwatch.csv"), PID = path.join(DIR, "gpuwatch.pid");
const mode = process.argv[2] ?? "once";

/** one CSV line -> sample */
export function parse(line) {
  const f = line.split(/,\s*/);
  if (f.length < 7 || !/^\d/.test(f[1])) return null;
  const mask = parseInt(String(f[6]).replace(/^0x/, ""), 16) || 0;
  return { t: f[0], temp: +f[1], sm: +f[2], smMax: +f[3], watts: +f[4], util: +f[5], power: !!(mask & 0x4), thermal: !!(mask & 0x60 || mask & 0x8) };
}
/** samples -> summary + verdict */
export function summary(S) {
  if (!S.length) return { n: 0, verdict: "NO DATA" };
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const busy = S.filter((s) => s.util > 5);
  const B = busy.length ? busy : S;
  const r = { n: S.length, tempMed: med(B.map((s) => s.temp)), tempMax: Math.max(...S.map((s) => s.temp)), smMed: med(B.map((s) => s.sm)), smMax: S[0].smMax,
    wattsMed: med(B.map((s) => s.watts)), cappedPct: Math.round((100 * B.filter((s) => s.power || s.thermal).length) / B.length) };
  r.verdict = r.tempMed >= 78 || r.cappedPct >= 25 ? "HOT" : r.tempMed >= 70 || r.cappedPct >= 10 ? "WARM" : "COOL";
  return r;
}

if (mode === "once") {
  const o = spawnSync("nvidia-smi", [`--query-gpu=${Q}`, "--format=csv,noheader,nounits"], { encoding: "utf8" });
  console.log(JSON.stringify(parse(o.stdout.trim())));
} else if (mode === "start") {
  fs.mkdirSync(DIR, { recursive: true });
  try { process.kill(+fs.readFileSync(PID, "utf8"), 0); console.log("already running"); process.exit(0); } catch {}
  const out = fs.openSync(CSV, "w");
  const p = spawn("nvidia-smi", [`--query-gpu=${Q}`, "--format=csv,noheader,nounits", "-l", "1"], { stdio: ["ignore", out, "ignore"], detached: true });
  p.unref(); fs.writeFileSync(PID, String(p.pid)); console.log(`gpuWatch started (pid ${p.pid}) -> ${CSV}`);
} else if (mode === "stop" || mode === "read") {
  if (mode === "stop") { try { process.kill(+fs.readFileSync(PID, "utf8")); } catch {} try { fs.unlinkSync(PID); } catch {} }
  const S = (fs.existsSync(CSV) ? fs.readFileSync(CSV, "utf8") : "").split(/\r?\n/).map(parse).filter(Boolean);
  console.log(JSON.stringify(summary(S)));
}
