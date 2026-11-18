// GATE `heroshell` (claude/heroshell 2026-11-18, QUALITY_RULES rule 27, provisional): every hero (landmark GLB) is
// closed from the street at every LOD level. Owner playtest 2026-11-18, screenshot 88: Saint-Pierre's south side had
// whole wall pieces missing; the census (docs/CENSUS.md class A) found 11 of 16 heroes open. Nothing checked the heroes:
// `shell` / wallAudit read only the UrbIS solids (every hero's solid is hidden), the pack-time mesh_audit treats a hole
// wider than 30 mm as an "opening" (info), and 4 heroes were never pack-audited.
//
// The probe is the census's (tools/audit/census/openMeshes.mjs probeAround): horizontal rays from 16 directions, a fail
// = the first hit is a BACK face (the street sees the inside through a hole) or the ray runs under the hero's own roof
// and comes out again without meeting a face (sees through it). Fails cluster on a 3 m grid; clusters >= 1 m2 count.
// A cluster that is a real, intended opening (a porch, an arcade, a belfry, an open gallery) is listed in
// tools/audit/heroShell.allow.json with its reason; everything else is an open shell. Per hero and level the open m2
// (the clusters not allowed) may not exceed tools/audit/heroShell.ceil.json (the after-count of claude/heroshell).
// Every model placed as a building (its placement says which UrbIS solids it hides / replaces) must be in the probe's
// hero list (no unprobed hero; the rail bridges have no such key).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/heroShell.mjs [--quiet] [--hero name] [--jobs 4] [--write-ceil]
//   (--write-ceil: store this run's open m2 as the new ceilings; only after a reviewed fix)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT, tileOf } from "./census/lib_mesh.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const QUIET = argv.includes("--quiet"), WRITE = argv.includes("--write-ceil");
const CHILD = opt("--child", null), ONLY = opt("--hero", null), JOBS = +opt("--jobs", 4);
const ALLOW_F = join(ROOT, "tools/audit/heroShell.allow.json"), CEIL_F = join(ROOT, "tools/audit/heroShell.ceil.json");
const TOL = 0.05;          // m2: rounding of the cluster areas

const { HERO_LIST, probeHero } = await import("./census/openMeshes.mjs");

// PARTY WALLS: a cluster on the line of a NEIGHBOUR's footprint (a city tile building the hero does not hide), under
// that neighbour's top, is a wall the street cannot see (the neighbour stands in front of it): not counted. The hero
// alone is probed, so its party walls look open (Van Buuren against 509389, the police station against 531654).
const tileBuildings = new Map();
function buildingsOf(T) {
  if (!tileBuildings.has(T)) {
    const f = join(ROOT, "data/tiles", T, "buildings.json");
    tileBuildings.set(T, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).buildings : []);
  }
  return tileBuildings.get(T);
}
function partyWall(name, c) {
  const pl = JSON.parse(readFileSync(join(ROOT, "models", name + ".json"), "utf8")).placement || {};
  const hidden = new Set([...(pl.hides_solids || []), ...(pl.hides_bu_ids || [])].map((u) => String(u).split("/").pop()));
  if (typeof pl.hides === "string") for (const m of pl.hides.matchAll(/(\d{6,})/g)) hidden.add(m[1]);
  const tiles = new Set();
  for (const dx of [-30, 0, 30]) for (const dz of [-30, 0, 30]) { const T = tileOf(c.x + dx, c.z + dz); if (T) tiles.add(T); }
  for (const T of tiles) for (const b of buildingsOf(T)) {
    const id = String(b.id).split("/").pop(), bu = String(b.attrs?.BU_ID || "").split("/").pop();
    if (hidden.has(id) || hidden.has(bu)) continue;
    const top = b.top ?? (b.base + b.height);
    if (!(c.y <= top && c.y >= b.base - 1)) continue;
    const ring = b.footprint[0];
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      if (!L2) continue;
      const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / L2));
      if (Math.hypot(ax + t * dx - c.x, az + t * dz - c.z) < 1.5) return id;
    }
  }
  return null;
}

if (CHILD) {
  const res = await probeHero(CHILD);
  console.log(JSON.stringify(res.map((r) => ({ level: r.level, tris: r.tris, holeM2: r.holeM2, back: r.backSamples, through: r.throughSamples, clusters: r.clusters }))));
  process.exit(0);
}

// every hero model the city places over a hidden UrbIS solid is probed
const placed = [];
for (const d of readdirSync(join(ROOT, "models"), { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of readdirSync(join(ROOT, "models", d.name))) {
    if (!f.endsWith(".json") || f.split(".").length > 2) continue;          // (x.lods.json, x.allow.json: not placements)
    try {
      const j = JSON.parse(readFileSync(join(ROOT, "models", d.name, f), "utf8"));
      const pl = j.placement;
      if (pl && ("hides_solids" in pl || "hides_bu_ids" in pl || "hides" in pl) && existsSync(join(ROOT, "models", d.name, f.replace(/\.json$/, ".glb")))) placed.push(`${d.name}/${f.replace(/\.json$/, "")}`);
    } catch { /* not a placement file */ }
  }
}
const unprobed = placed.filter((p) => !HERO_LIST.includes(p));

const allow = existsSync(ALLOW_F) ? JSON.parse(readFileSync(ALLOW_F, "utf8")) : [];
const ceil = existsSync(CEIL_F) ? JSON.parse(readFileSync(CEIL_F, "utf8")) : {};
const list = HERO_LIST.filter((n) => !ONLY || n.includes(ONLY));
const results = {};
const queue = list.slice();
const run = (name) => new Promise((ok) => {
  const p = spawn(process.execPath, ["--max-old-space-size=3072", "--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", name], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let so = "", se = ""; p.stdout.on("data", (b) => { so += b; }); p.stderr.on("data", (b) => { se += b; });
  p.on("close", (code) => {
    const line = so.trim().split("\n").filter((l) => l.startsWith("[")).pop();
    results[name] = code === 0 && line ? JSON.parse(line) : { error: se.trim().split("\n").slice(-3).join(" / ") || `exit ${code}` };
    ok();
  });
});
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));

const allowedBy = (hero, level, c) => allow.find((a) => a.hero === hero && (a.level === undefined || a.level === "*" || (Array.isArray(a.level) ? a.level.includes(level) : a.level === level))
  && (a.yRange ? c.y >= a.yRange[0] && c.y <= a.yRange[1] && Math.hypot(c.x - a.at[0], c.z - a.at[2]) <= a.radius
              : Math.hypot(c.x - a.at[0], c.y - a.at[1], c.z - a.at[2]) <= a.radius));
let fails = 0;
const newCeil = {};
const rows = [];
for (const name of list) {
  const hero = name.split("/")[0], R = results[name];
  if (R.error) { fails++; rows.push(`FAIL ${hero}: probe error ${R.error}`); continue; }
  newCeil[hero] = {};
  for (const r of R) {
    for (const c of r.clusters) c.party = partyWall(name, c);
    const open = r.clusters.filter((c) => !c.party && !allowedBy(hero, r.level, c)), ok = r.clusters.filter((c) => c.party || allowedBy(hero, r.level, c));
    const m2 = +open.reduce((s, c) => s + c.m2, 0).toFixed(1), aM2 = +ok.reduce((s, c) => s + c.m2, 0).toFixed(1);
    newCeil[hero]["L" + r.level] = m2;
    const lim = ceil[hero]?.["L" + r.level];
    const bad = lim === undefined || m2 > lim + TOL;
    if (bad) fails++;
    const worst = open.slice(0, 3).map((c) => `${c.m2} m2 at ${c.x},${c.y},${c.z} (${c.dirs} dirs, ${c.back} back)`).join("; ");
    rows.push(`${bad ? "FAIL" : "ok  "} ${hero.padEnd(20)} L${r.level} ${String(r.tris).padStart(7)} tris  open ${String(m2).padStart(5)} m2 (ceiling ${lim ?? "none"})  allowed openings + party walls ${aM2} m2${bad || !QUIET ? (worst ? "  worst: " + worst : "") : ""}`);
  }
}
for (const u of unprobed) { fails++; rows.push(`FAIL ${u}: a placed hero (hides UrbIS solids) not in the probe's HERO_LIST (tools/audit/census/openMeshes.mjs)`); }
for (const r of rows) if (!QUIET || r.startsWith("FAIL")) console.log(r);
if (WRITE) { writeFileSync(CEIL_F, JSON.stringify(newCeil, null, 1) + "\n"); console.log(`ceilings written: ${CEIL_F}`); }
console.log(fails ? `heroshell: ${fails} FAIL` : `heroshell: ${list.length} heroes x every LOD closed (open m2 within the ceilings, ${allow.length} allowed openings)`);
process.exitCode = fails && !WRITE ? 1 : 0;
