// Tour determinism (claude/deckrail, docs/TOUR.md "Determinism"): the tour's common switches carry still=1, and under
// ?still=1 the traffic sim's random parked-car pull-outs / reverse-ins are off (parkRate 0); normal play keeps them (1).
// A real TrafficSim is constructed with location.search set each way. Exit 1 on failure (tools/audit/mergeGate.mjs).
//   node --import ./tools/road_audit/register.mjs tools/tour/tourDeterminism.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fails = [];
for (const f of ["tools/tour/views.json", "tools/tour/views_xmas.json"]) {
  const v = JSON.parse(readFileSync(join(ROOT, f), "utf8"));
  if (v.common?.still !== "1") fails.push(`${f}: common switches lack still=1`);
  for (const q of v.views || []) if (q.q?.still && q.q.still !== "1") fails.push(`${f} ${q.id}: still overridden`);
}
const rates = {};
for (const search of ["?quick=1&still=1&place=alsemberg&with=traffic", "?place=alsemberg&with=traffic", ""]) {
  globalThis.location = { search };
  const { TrafficSim, parkRateFor } = await import(pathToFileURL(join(ROOT, "viewer/traffic/trafficSim.js")).href + `?s=${encodeURIComponent(search)}`);
  const sim = new TrafficSim({ slots: [] }, { cap: 4, types: [], paints: [] });
  rates[search || "(none)"] = [sim.params.parkRate, parkRateFor(search)];
}
const [tour, play, none] = Object.values(rates);
if (tour[0] !== 0 || tour[1] !== 0) fails.push(`tour (?still=1): parkRate ${tour[0]} (want 0)`);
if (play[0] !== 1 || none[0] !== 1) fails.push(`normal play: parkRate ${play[0]} / ${none[0]} (want 1)`);
console.log(`parkRate: tour ${tour[0]}, play ${play[0]}, no query ${none[0]}`);
for (const f of fails) console.log(`FAIL ${f}`);
console.log(fails.length ? "TOUR DETERMINISM: FAIL" : "TOUR DETERMINISM: PASS");
process.exitCode = fails.length ? 1 : 0;
