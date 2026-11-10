#!/usr/bin/env node
// MESH AUDIT CLI: node tools/mesh_audit/cli.mjs <file.glb> [options]
//   --nodes A,B          audit only these root nodes (default: all)
//   --range Node=D,...   farthest camera distance (m) per root node: its LOD band's end (default 120 m)
//   --skip-checks a,b    leave checks out (e.g. opening,seam)
//   --allow file.json    accepted items: [{ "check": "near", "at": [x,y,z], "radius": 0.2, "why": "..." }]
//   --offset x,y,z       add to the reported positions (e.g. 0,30,0 = the chapel's heights in m TAW)
//   --out dir            write <name>.audit.json + <name>.audit.md there (default: next to the GLB)
//   --set key=value      override a threshold of DEFAULTS (audit.js), e.g. --set coincident=0.001
//   --ignore-below y     drop items below this height (scene Y, before --offset): under the ground
//   --no-fail            exit 0 even with blocking items
// Exit code 1 when blocking items remain (after --allow), 0 when clean.
import fs from "fs";
import path from "path";
import { readGlb } from "./glb.mjs";
import { auditParts, toMarkdown, DEFAULTS } from "./audit.js";

export async function auditGlb(file, { nodes = null, range = {}, allow = [], skip = [], offset = [0, 0, 0], out = null, set = {}, quiet = false, title = null } = {}) {
  const { parts, quantum } = await readGlb(file);
  const use = parts.filter((p) => !nodes || nodes.includes(p.name)).map((p) => ({ ...p, maxDistance: range[p.name] ?? range["*"] }));
  const report = auditParts(use, { quantum, ...set });
  // accepted items
  for (const [k, list] of Object.entries(report.items)) {
    report.items[k] = list.filter((x) => {
      const a = allow.find((q) => q.check === k && Math.hypot(...q.at.map((v, i) => v - x.at[i])) <= (q.radius ?? 0.05));
      if (a) { report.summary.counts[k]--; report.summary.accepted = (report.summary.accepted ?? 0) + 1; return false; }
      return !skip.includes(k);
    });
    if (skip.includes(k)) report.summary.counts[k] = 0;
  }
  const SEVB = ["coplanar", "depth", "crossing", "leak", "flipped", "streak"];
  report.summary.blocking = SEVB.reduce((s, k) => s + (report.summary.counts[k] ?? 0), 0);
  for (const list of Object.values(report.items)) for (const x of list) x.at = x.at.map((v, i) => +(v + offset[i]).toFixed(3));
  report.file = path.basename(file);
  const base = path.join(out ?? path.dirname(file), path.basename(file).replace(/\.glb$/i, ""));
  if (out !== false) {
    fs.mkdirSync(path.dirname(base), { recursive: true });
    fs.writeFileSync(`${base}.audit.json`, JSON.stringify(report, null, 1));
    fs.writeFileSync(`${base}.audit.md`, toMarkdown(report, { title: title ?? `Mesh audit: ${path.basename(file)}` }) +
      `\n\nNodes: ${[...new Set(use.map((p) => p.name))].join(", ")}. Distances: ${JSON.stringify(range)}. Quantum ${(quantum * 1000).toFixed(3)} mm. Offset ${offset.join(",")}.\n`);
  }
  if (!quiet) {
    const c = report.summary.counts;
    console.log(`[mesh audit] ${path.basename(file)}: ${report.summary.triangles} tris, ${report.summary.blocking} BLOCKING, ${report.summary.warnings} warnings (${report.summary.ms} ms)` +
      `\n  ${Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(" · ")}` + (out !== false ? `\n  -> ${base}.audit.md` : ""));
  }
  return report;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (isMain) {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const file = a.find((x) => x.endsWith(".glb"));
  if (!file) { console.log(fs.readFileSync(new URL(import.meta.url)).toString().split("\n").slice(1, 12).join("\n")); process.exit(2); }
  const range = Object.fromEntries((opt("--range") || "").split(",").filter(Boolean).map((s) => { const [k, v] = s.split("="); return [k, +v]; }));
  const set0 = Object.fromEntries(a.flatMap((x, i) => (x === "--set" ? [a[i + 1].split("=")] : [])).map(([k, v]) => [k, v.startsWith("[") ? JSON.parse(v) : k in DEFAULTS ? +v : v]));
  const set = { ...set0, ...(opt("--ignore-below") ? { ignoreBelow: +opt("--ignore-below") } : {}) };
  const report = await auditGlb(file, {
    nodes: opt("--nodes")?.split(","), range, set,
    allow: opt("--allow") ? JSON.parse(fs.readFileSync(opt("--allow"))) : [],
    skip: (opt("--skip-checks") || "").split(",").filter(Boolean),
    offset: (opt("--offset") || "0,0,0").split(",").map(Number), out: opt("--out"),
  });
  process.exit(report.summary.blocking && !a.includes("--no-fail") ? 1 : 0);
}
