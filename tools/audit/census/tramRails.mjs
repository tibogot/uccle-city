// CENSUS class E (claude/census 2026-11-18, owner playtest image 92: tram rails running into the sidewalk on the
// Chaussée d'Alsemberg). Report only (no fix, no gate row yet).
//
// The rails are drawn along each OSM tram track as the tile worker smooths it (viewer/track.js smoothPolyline;
// main.js featureObjects: two ribbons at +-GAUGE/2, their top = max(the DRAWN surface, the track profile), so a rail
// over a raised sidewalk climbs onto it). Every 0.5 m of every track, both rail centre lines (+-RAIL_C) are tested
// against the drawn street's class raster (viewer/streets/fitCore.js classAt over the measured UrbIS surfaces):
//   raised   the rail lies on a raised class: sidewalk, median / island, ramp, tree pit (the paving and its kerb)
//   kerb     the rail lies within KERB_D of a drawn kerb line (in the gutter / cutting the kerb), on any class
// Runs of flagged samples (gaps < 2 m merged) are the findings, sized by their length in metres.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/census/tramRails.mjs [--all | T ...] [--out FILE]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { streetTile, runTiles, cli, at, ROOT, SC, CLASS_NAME } from "./lib_street.mjs";

const { CHILD, TILES, OUT, JOBS, WORST } = cli();
const RAIL_C = 1.435 / 2 + 0.036, STEP = 0.5, KERB_D = 0.15;
const RAISED = new Set([SC.sidewalk, SC.median, SC.ramp, SC.pit, SC.path]);

if (!CHILD) {
  if (!TILES.length) { console.error("usage: tramRails.mjs [--all | T ...] [--out FILE]"); process.exit(2); }
  const res = await runTiles(new URL(import.meta.url), TILES, { jobs: JOBS });
  const sum = { tiles: 0, trackM: 0, raisedM: 0, kerbM: 0, runs: 0 }, runs = [];
  for (const r of res) {
    if (r.error || !r.trackM) continue;
    sum.tiles++; sum.trackM += r.trackM; sum.raisedM += r.raisedM; sum.kerbM += r.kerbM; sum.runs += r.runs.length;
    for (const x of r.runs) runs.push({ tile: r.tile, ...x });
  }
  runs.sort((a, b) => b.len - a.len);
  for (const k of ["trackM", "raisedM", "kerbM"]) sum[k] = Math.round(sum[k]);
  console.log(`class E: ${JSON.stringify(sum)}`);
  console.log(`worst ${WORST}:`);
  for (const x of runs.slice(0, WORST)) console.log(`  ${x.tile} ${JSON.stringify(x)}`);
  if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify({ when: new Date().toISOString(), sum, runs }, null, 1));
  process.exit(0);
}

const T = TILES[0];
const S = await streetTile(T);
const { tram, fit, classAt, inB, nameAt } = S;
let trackM = 0, raisedM = 0, kerbM = 0;
const runs = [];
if (fit) for (const l of tram) {
  const P = l.line;
  // samples along the track, both rails
  let cur = null;
  const close = () => { if (cur && cur.len >= 1) runs.push({ len: +cur.len.toFixed(1), at: at(cur.x, cur.z), street: nameAt(cur.x, cur.z), raised: +cur.raised.toFixed(1), kerb: +cur.kerb.toFixed(1), what: [...cur.what].join("/") }); cur = null; };
  let gapM = 0;
  for (let k = 1; k < P.length; k++) {
    const [ax, az] = P[k - 1], [bx, bz] = P[k], L = Math.hypot(bx - ax, bz - az); if (L < 1e-6) continue;
    const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
    for (let d = 0; d < L; d += STEP) {
      const x = ax + ux * d, z = az + uz * d;
      if (!inB(x, z)) continue;
      trackM += STEP;
      let bad = false, why = null;
      for (const s of [-1, 1]) {
        const rx = x + nx * s * RAIL_C, rz = z + nz * s * RAIL_C, c = classAt(rx, rz);
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
console.log(JSON.stringify({ tile: T, trackM: Math.round(trackM), raisedM: +raisedM.toFixed(1), kerbM: +kerbM.toFixed(1), runs }));
