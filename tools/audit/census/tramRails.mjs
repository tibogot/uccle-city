// CENSUS class E (claude/census 2026-11-18, owner playtest image 92: tram rails running into the sidewalk on the
// Chaussée d'Alsemberg). Gate row `tramrails` since claude/tramfit (rule 32 provisional).
//
// The rails are drawn along each tram track as the tile worker makes it (viewer/track.js tramTracks: the OSM way
// fitted to the measured street, data/tramfit/<T>.json, tools/tramfit/build_tramfit.mjs; --old = ?tramfit=old: each OSM
// way smoothed as it is; main.js featureObjects: two ribbons at +-GAUGE/2, their top = max(the DRAWN surface, the track
// profile), so a rail over a raised sidewalk climbs onto it). Every 0.5 m of arc length of every track, both rail centre
// lines (+-RAIL_C) are tested against the drawn street's class raster (viewer/streets/fitCore.js classAt over the
// measured UrbIS surfaces):
//   raised   the rail lies on a raised class: sidewalk, median / island, ramp, tree pit (the paving and its kerb)
//   kerb     the rail lies within KERB_D of a drawn kerb line (in the gutter / cutting the kerb), on any class
//   (squareM: a rail on a raised square, reported only)
// Runs of flagged samples (gaps < 2 m merged) are the findings, sized by their length in metres.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/tramRails.mjs [--all | T ...] [--out FILE]
//        [--old] [--persegment] [--max raised=M,kerb=M,runs=N] [--requirefit] [--quiet]
//   --max         exit 1 when a sum is over its ceiling (the gate: the after-count of claude/tramfit)
//   --requirefit  exit 1 when a tile with tram ways is not drawn from its fit (no data/tramfit/<T>.json, or one made
//                 for other OSM ways: the worker then falls back to the OSM ways as they are)
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, at, ROOT, SC, CLASS_NAME, imp } from "./lib_street.mjs";

const { CHILD, TILES, OUT, JOBS, WORST, flag } = cli();
const OLD = flag("--old");          // ?tramfit=old: the OSM ways as they are (claude/tramfit)
const PERSEG = flag("--persegment"); // the census's first sampler (2026-11-18 numbers: 421 m / 152 m)
const QUIET = flag("--quiet"), REQFIT = flag("--requirefit");
const PLATOLD = flag("--platold");   // (claude/defects1) ?platpole=old: a `platform` pole with no platform drawn under it stays flagged (and where it is)
const MAXARG = (() => { const a = process.argv.slice(2), i = a.indexOf("--max"); return i >= 0 ? a[i + 1] : null; })();
const MAX = MAXARG ? Object.fromEntries(MAXARG.split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, +v])) : null;
const RAIL_C = 1.435 / 2 + 0.036, STEP = 0.5, KERB_D = 0.15;
const RAISED = new Set([SC.sidewalk, SC.median, SC.ramp, SC.pit, SC.path]);

if (!CHILD) {
  if (!TILES.length) { console.error("usage: tramRails.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS, extra: [...(OLD ? ["--old"] : []), ...(PERSEG ? ["--persegment"] : []), ...(PLATOLD ? ["--platold"] : [])] });
  const sum = { tiles: 0, trackM: 0, raisedM: 0, kerbM: 0, squareM: 0, platM: 0, poles: 0, polesOff: 0, runs: 0 }, runs = [], offPoles = [];
  for (const r of res) {
    if (r.error || (!r.trackM && !r.poles)) continue;
    sum.tiles++; sum.trackM += r.trackM; sum.raisedM += r.raisedM; sum.kerbM += r.kerbM; sum.squareM += r.squareM || 0; sum.platM += r.platM || 0; sum.poles += r.poles || 0; sum.polesOff += (r.polesOff || []).length; offPoles.push(...(r.polesOff || []).map((a) => `${r.tile} ${a}`)); sum.runs += r.runs.length;
    for (const x of r.runs) runs.push({ tile: r.tile, ...x });
  }
  runs.sort((a, b) => b.len - a.len);
  for (const k of ["trackM", "raisedM", "kerbM", "squareM", "platM"]) sum[k] = Math.round(sum[k]);
  const notFit = OLD ? [] : res.filter((r) => !r.error && r.tramMode && r.tramMode !== "fit").map((r) => r.tile), errors = res.filter((r) => r.error).map((r) => r.tile);
  console.log(`class E${OLD ? " (?tramfit=old)" : ""}: ${JSON.stringify(sum)}${notFit.length ? ` NOT FITTED: ${notFit.join(" ")}` : ""}`);
  const pf = res.filter((r) => r.platFit).reduce((a, r) => ({ platforms: a.platforms + r.platFit.platforms, moved: a.moved + r.platFit.moved, maxMove: Math.max(a.maxMove, r.platFit.maxMove) }), { platforms: 0, moved: 0, maxMove: 0 });
  if (!OLD) console.log(`platforms beside their tracks: ${JSON.stringify(pf)}`);
  if (sum.platM && (!QUIET || WORST)) console.log(`rail under a platform near (20 m cells): ${res.flatMap((r) => (r.platSpots || []).map((k) => `${r.tile} ${k.split(",").map((v) => v * 20).join(", ")}`)).join("; ")}`);
  if (offPoles.length && (!QUIET || WORST)) console.log(`platform poles off every platform: ${offPoles.join("; ")}`);
  if (!QUIET || WORST) {
    console.log(`worst ${WORST}:`);
    for (const x of runs.slice(0, WORST)) console.log(`  ${x.tile} ${JSON.stringify(x)}`);
  }
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), old: OLD, sum, runs }, null, 1));
  const fails = [];
  if (MAX) for (const [k, key] of [["raised", "raisedM"], ["kerb", "kerbM"], ["runs", "runs"], ["platform", "platM"], ["poles", "polesOff"]]) if (MAX[k] != null && sum[key] > MAX[k]) fails.push(`${key} ${sum[key]} > ${MAX[k]}`);
  if (REQFIT && notFit.length) fails.push(`tiles drawn without their fit: ${notFit.join(" ")} (run tools/tramfit/build_tramfit.mjs)`);
  if (errors.length) fails.push(`tiles failed: ${errors.join(" ")}`);
  if (fails.length) { console.log(`FAIL: ${fails.join("; ")}`); process.exit(1); }
  if (MAX || REQFIT) console.log("PASS");
  process.exit(0);
}

const T = TILES[0];
const S = await streetTile(T, { tramfit: !OLD });
const { tram, fit, classAt, inB, nameAt, platforms } = S;
const { onPlatform, platformFollow } = await imp("viewer/streets/tramPlatforms.js");
// the STIB poles data/stops puts on a tram platform (`platform: true`), moved with it as main.js does: on one as drawn?
const stopsDoc = (await import("node:fs")).existsSync(join(ROOT, "data/stops", `${T}.json`)) ? JSON.parse((await import("node:fs")).readFileSync(join(ROOT, "data/stops", `${T}.json`), "utf8")) : null;
const { platformUnflag } = await imp("viewer/streets/tramPlatforms.js");
const stops2 = (stopsDoc?.stops || []).map((s) => (s.pole ? { ...s, pole: { ...s.pole } } : s));
if (!OLD) platformFollow(stops2.map((s) => (s.pole?.platform ? s.pole : null)), { lines: platforms });
// (claude/defects1, as main.js) a flagged pole with no platform drawn under it is an ordinary pole (streetProps.mjs checks it
// is out of the lanes): what is left flagged must stand on a platform as drawn, so the ceiling is 0 (--platold: 16)
if (!OLD && !PLATOLD) platformUnflag(stops2, { lines: platforms });
const platPoles = stops2.map((s) => (s.pole?.platform ? s.pole : null)).filter(Boolean);
const polesOff = platPoles.filter((p) => !platforms.some((l) => onPlatform(l, p.x, p.z))).map((p) => at(p.x, p.z));
// the platforms near each point (8 m grid of their boxes)
const PG = new Map(), pk = (x, z) => Math.floor(x / 8) * 100003 + Math.floor(z / 8);
for (const l of platforms) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of l.line) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  for (let i = Math.floor((x0 - 3) / 8); i <= Math.floor((x1 + 3) / 8); i++) for (let j = Math.floor((z0 - 3) / 8); j <= Math.floor((z1 + 3) / 8); j++) { const q = i * 100003 + j; if (!PG.has(q)) PG.set(q, []); PG.get(q).push(l); }
}
const underPlatform = (x, z) => (PG.get(pk(x, z)) || []).some((l) => onPlatform(l, x, z));
let trackM = 0, raisedM = 0, kerbM = 0, squareM = 0, platM = 0;   // (squareM: a rail on a raised square, reported only)
const runs = [], platRuns = new Set();
for (const l of tram) {
  const P = l.line;
  // samples along the track, both rails
  let cur = null;
  const close = () => { if (cur && cur.len >= 1) runs.push({ len: +cur.len.toFixed(1), at: at(cur.x, cur.z), street: nameAt(cur.x, cur.z), raised: +cur.raised.toFixed(1), kerb: +cur.kerb.toFixed(1), what: [...cur.what].join("/") }); cur = null; };
  let gapM = 0, cum = 0;
  for (let k = 1; k < P.length; k++) {
    const [ax, az] = P[k - 1], [bx, bz] = P[k], L = Math.hypot(bx - ax, bz - az); if (L < 1e-6) continue;
    const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
    // (claude/tramfit: one sample every STEP m of ARC LENGTH, carried over the vertices; before, every segment started
    // its own samples at its first point, so a densely smoothed bend counted up to 2x its length: --persegment = as before)
    const start = PERSEG ? 0 : Math.ceil(cum / STEP - 1e-9) * STEP - cum;
    cum += L;
    for (let d = start; d < L; d += STEP) {
      const x = ax + ux * d, z = az + uz * d;
      if (!inB(x, z)) continue;
      trackM += STEP;
      let bad = false, why = null;
      for (const s of [-1, 1]) {
        const rx = x + nx * s * RAIL_C, rz = z + nz * s * RAIL_C, c = classAt(rx, rz);
        if (underPlatform(rx, rz)) { platM += STEP / 2; platRuns.add(`${Math.round(rx / 20)},${Math.round(rz / 20)}`); }
        if (!fit) continue;
        if (c === SC.square) squareM += STEP / 2;
        if (RAISED.has(c)) { bad = true; why = CLASS_NAME[c]; raisedM += STEP / 2; if (!cur) cur = { len: 0, x: rx, z: rz, raised: 0, kerb: 0, what: new Set() }; cur.raised += STEP / 2; cur.what.add(why); continue; }
        const kb = fit.nearKerb(rx, rz, KERB_D + 0.05);
        if (kb && kb.d < KERB_D) { bad = true; kerbM += STEP / 2; if (!cur) cur = { len: 0, x: rx, z: rz, raised: 0, kerb: 0, what: new Set() }; cur.kerb += STEP / 2; cur.what.add("kerb"); }
      }
      if (bad) { cur.len += STEP + gapM; gapM = 0; }
      else if (cur) { gapM += STEP; if (gapM >= 2) { close(); gapM = 0; } }
    }
  }
  close();
}
console.log(JSON.stringify({ tile: T, tramMode: S.tramMode, trackM: Math.round(trackM), raisedM: +raisedM.toFixed(1), kerbM: +kerbM.toFixed(1), squareM: +squareM.toFixed(1), platM: +platM.toFixed(1), poles: platPoles.length, polesOff, platSpots: [...platRuns], platFit: S.platFit, runs }));
