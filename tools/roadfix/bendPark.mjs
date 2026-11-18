// claude/deckrail item 2 (TODO NOW: "traffic-alsemberg tour view lost a parked car at the left kerb since curvedroads"):
// does the bend trim (viewer/streets/roadBends.js, ?roadbend=old) change where cars are parked? For the tour view's
// tiles (E4 + the neighbours the quick boot loads: E3 D3 D4) the worker's parked sites and traffic graphs are built
// with the trim on and off, and the main thread's border drop (viewer/traffic/borderPark.js laneHits) is applied as
// main.js does. Exit 1 when anything differs or the view's car (E4, -916.3, -308.9) is not parked in both.
//   node --import ./tools/road_audit/register.mjs tools/roadfix/bendPark.mjs
// Result 2026-11-18: identical (177 sites, the van parked, 9 border drops, the four graphs bit-identical): the car's
// absence in the tour is the traffic sim's pull-out (docs/DECKRAIL.md "Item 2").
import "../road_audit/register.mjs";
import { buildTile } from "./tile.mjs";
import { laneHits } from "../../viewer/traffic/borderPark.js";
const realLog = console.log; console.log = () => {};
const out = {};
for (const mode of ["default", "old"]) {
  const o = { keepNet: true, parkWidth: true, trafpark: true, ...(mode === "old" ? { roadBend: false } : {}) };
  const g = new Map();
  let e4 = null;
  for (const T of ["E4", "E3", "D3", "D4"]) { const d = await buildTile(T, o); g.set(T, d.traffic); if (T === "E4") e4 = d; }
  const sites = e4.parked.sites, hits = laneHits(sites, g, "E4"), i = sites.findIndex((s) => Math.hypot(s.x + 916.26, s.z + 308.87) < 0.5);
  out[mode] = { sites: JSON.stringify(sites.map((s) => [s.x.toFixed(3), s.z.toFixed(3), s.yaw.toFixed(4)])), n: sites.length, vanParked: i >= 0 && !hits.has(i), border: [...hits].sort().join(","),
    graphs: [...g].map(([k, t]) => `${k}:${t.xy ? Array.from(t.xy).reduce((a, v) => (a * 31 + Math.round(v * 1000)) % 1e9, 7) : "-"}`).join(" ") };
}
console.log = realLog;
const same = ["sites", "border", "graphs"].every((k) => out.default[k] === out.old[k]);
console.log(`parked sites E4: default ${out.default.n}, ?roadbend=old ${out.old.n}; identical: ${out.default.sites === out.old.sites}; border drops identical: ${out.default.border === out.old.border}; traffic graphs E4 E3 D3 D4 identical: ${out.default.graphs === out.old.graphs}; the view's car parked: ${out.default.vanParked} / ${out.old.vanParked}`);
const ok = same && out.default.vanParked && out.old.vanParked;
console.log(ok ? "BEND PARK: PASS" : "BEND PARK: FAIL");
process.exitCode = ok ? 0 : 1;
