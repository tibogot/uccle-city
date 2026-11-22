// THE GAP REGISTER (docs/STREET_MODEL_PLAN.md 4, rule gap-register): data/gaps.json holds ONE entry per known
// exception of a gated detector, never a city-wide sum. A detector row reports its violations as findings with stable
// ids `<invariant>:<elementId>:<s0-s1>` (invariant = `<row>.<check>`, element = an OSM road id / a data id / a kind@x,z,
// s0-s1 = the station span in whole metres along that element, `0-0` for a point). The row fails on
//   - a finding whose id is not in the register (a new defect, or a known one that moved: re-measure, then register),
//   - a register entry of that row's invariants, on a tile the run covered, that no finding matches (stale: fixed, or
//     moved; remove it).
// Fixing 9 m somewhere no longer frees 9 m for a new defect elsewhere.
//
//   import { judge, loadGaps } from "./gaps.mjs"
//   judge(findings, { invariants: ["markings.atKerb", ...], tiles: ["E7", ...] }) -> { ok, unregistered, stale, matched }
//   rewrite(findings, {...})   the detectors' --write-register (keeps each kept entry's cause / decision / date)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const GAPS_FILE = join(ROOT, "data/gaps.json");

/** why a gap is open: each cause names what removes it (the plan's job) */
export const CAUSES = {
  "junction-unmodelled": "inside / at a junction the per-way fit does not model (no junction polygon yet): STREET_MODEL_PLAN job 7",
  "seam-rebuild": "at a tile seam: the tile rebuilds its neighbour's road from its own clipped raster: job 2 (seam ownership)",
  "osm-contradiction": "OSM centre line > 1.5 m outside the measured carriageway (confidence X): the guessed stack shows through: jobs 2-3",
  "fit-lost": "the fit has no measurement there (road not fitted, or kerb not found): jobs 2-3 (kerb-referenced lines)",
  "short-piece": "a short OSM piece (< 42 m) fitted on its own between junctions: jobs 2-3, 7",
  "stack-lag": "measured street, but the smoothed OSM lane stack lags the kerb (bulb-out, flare, lay-by): job 3",
  "lane-data": "the keep-out comes from the guessed lane data, not the model's carriageway: job 6",
  "tram-envelope": "a piece inside the tram envelope where the platform / tram data disagree: job 6",
  "sign-data": "a sign whose facing comes from the source data (one per spot, no model of the street it addresses yet): job 6",
  "source-data": "the source data itself is wrong / incomplete there (survey, OSM): a data fix",
  "signal-phases": "two signal junctions a few metres apart on different phases (a queue waiting at the second one stands inside the first one's turn, a yield inside that turn): the SIGNALS job (docs/TODO.md: one phase along the road for the close pairs)",
  "priority-starved": "a give-way approach starved by a steady conflicting flow (no gap of GAP_T s for 60 s, a priority junction at the peak): the SIGNALS job (docs/TODO.md: junction control + demand)",
  "carriageway-estimated": "the carriageway there is only estimated (driving ends D / O / G, or no UrbIS at all: the OSM band), so the check judges the lane against a guess: the measure (STREET_MODEL_PLAN job 2, more measured inputs)",
  "lane-old-fit": "our builder: a lane / turn the street model does not build (kept on the old fit: dual-carriageway halves, roundabout arms, pieces under 50 % measured): STREET_MODEL_PLAN job 4b",
  "lane-dragged": "our builder: a model lane outside the model's own room at a measured station (a need from another station ramped in): STREET_MODEL_PLAN job 4b",
  "after-model": "our builder: a model lane / turn moved after the model stage (lane joins, kink rounding, the turn repair): STREET_MODEL_PLAN job 4b",
  "lane-end": "our builder: within 4 m of a model lane's end (its cap at a junction mouth or a corner): STREET_MODEL_PLAN job 4b / job 7",
  "turn-corner": "our builder: a G2 junction turn leaving its junction / meeting a kerb or a building: STREET_MODEL_PLAN job 4b / job 7",
  "parking-both-sides": "an emergency vehicle on a street parked on both sides, no room to pass the oncoming / yielding cars: the PARKING job (docs/TODO.md: its route avoids such streets, or the parking leaves a gap)",
};
export const ID_RE = /^[a-z0-9]+\.[A-Za-z0-9]+:[^:\s]+:\d+-\d+$/;

export function loadGaps(file = GAPS_FILE) {
  if (!existsSync(file)) return { entries: [] };
  return JSON.parse(readFileSync(file, "utf8"));
}

/** structural check of the register: [problem strings] */
export function validate(doc) {
  const bad = [], seen = new Set();
  if (!Array.isArray(doc.entries)) return ["entries is not an array"];
  for (const e of doc.entries) {
    const w = (m) => bad.push(`${e.id ?? "(no id)"}: ${m}`);
    if (typeof e.id !== "string" || !ID_RE.test(e.id)) w("id is not <row>.<check>:<elementId>:<s0-s1>");
    if (seen.has(e.id)) w("id twice"); seen.add(e.id);
    if (!CAUSES[e.cause]) w(`cause "${e.cause}" is not one of ${Object.keys(CAUSES).join(", ")}`);
    if (!e.evidence || typeof e.evidence !== "object" || !e.evidence.tile || !e.evidence.at) w("evidence needs { tile, at, ... }");
    if (typeof e.decision !== "string" || !e.decision.trim()) w("no decision");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) w("date is not YYYY-MM-DD");
    if (/[*?]/.test(e.id || "")) w("wildcards are not allowed (one entry per exception)");
  }
  return bad;
}

/** findings [{ id, tile, ... }] vs the register entries of `invariants` on `tiles` */
export function judge(findings, { invariants, tiles, doc = loadGaps() }) {
  const inv = new Set(invariants), tl = tiles ? new Set(tiles) : null;
  const mine = (doc.entries || []).filter((e) => inv.has(e.id.split(":")[0]) && (!tl || tl.has(e.evidence?.tile)));
  const reg = new Map(mine.map((e) => [e.id, e]));
  const got = new Set(), unregistered = [];
  for (const f of findings) {
    if (!inv.has(f.id.split(":")[0])) continue;
    if (got.has(f.id)) continue; got.add(f.id);
    if (!reg.has(f.id)) unregistered.push(f);
  }
  const stale = mine.filter((e) => !got.has(e.id));
  return { ok: !unregistered.length && !stale.length, unregistered, stale, matched: got.size - unregistered.length };
}

/** print a judge() result; returns the number of failures */
export function report(name, r, { show = 15 } = {}) {
  console.log(`  ${r.ok ? "ok  " : "FAIL"} register ${name}: ${r.matched} registered, ${r.unregistered.length} not in data/gaps.json, ${r.stale.length} stale`);
  for (const f of r.unregistered.slice(0, show)) console.log(`    new   ${f.id}  ${f.tile} ${f.at ?? ""} ${f.street ?? ""} ${f.m != null ? f.m + " m" : ""}`);
  for (const e of r.stale.slice(0, show)) console.log(`    stale ${e.id}  ${e.evidence?.tile} ${e.evidence?.at}`);
  return r.ok ? 0 : 1;
}

/** rewrite the register's entries of `invariants` on `tiles` from findings (each new one gets cause = f.cause; kept
 *  entries keep their cause / decision / date); for the detectors' --write-register */
export function rewrite(findings, { invariants, tiles, date, file = GAPS_FILE, decision }) {
  const doc = loadGaps(file);
  doc._doc ??= "The gap register (rule gap-register, tools/audit/gaps.mjs): one entry per known exception of a gated detector; the row fails on a finding not listed here and on a listed entry no finding matches. No sums, no wildcards.";
  const inv = new Set(invariants), tl = tiles ? new Set(tiles) : null;
  const old = new Map((doc.entries || []).map((e) => [e.id, e]));
  const keep = (doc.entries || []).filter((e) => !(inv.has(e.id.split(":")[0]) && (!tl || tl.has(e.evidence?.tile))));
  const seen = new Set(), add = [];
  for (const f of findings) {
    if (!inv.has(f.id.split(":")[0]) || seen.has(f.id)) continue; seen.add(f.id);
    const o = old.get(f.id);
    const evidence = { tile: f.tile, at: f.at, ...(f.street ? { street: f.street } : {}), ...(f.m != null ? { m: f.m } : {}), ...(f.info ? { info: f.info } : {}) };
    add.push(o ? { ...o, evidence } : { id: f.id, cause: f.cause, evidence, decision: decision(f), date });
  }
  doc.entries = [...keep, ...add].sort((a, b) => a.id.localeCompare(b.id));
  writeGaps(doc, file);
  return { kept: keep.length, written: add.length };
}

/** one entry a line (sorted by id), so two branches adding entries rarely touch the same line */
export function writeGaps(doc, file = GAPS_FILE) {
  const head = Object.entries(doc).filter(([k]) => k !== "entries").map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
  const rows = (doc.entries || []).map((e) => `  ${JSON.stringify(e)}`).join(",\n");
  writeFileSync(file, `{\n${head}\n "entries": [\n${rows}\n ]\n}\n`);
}

/** a finding's span id part: whole metres, s0 floored, s1 ceiled */
export const span = (s0, s1) => `${Math.max(0, Math.floor(Math.min(s0, s1)))}-${Math.max(0, Math.ceil(Math.max(s0, s1)))}`;
