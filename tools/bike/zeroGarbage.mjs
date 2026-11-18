// node tools/bike/zeroGarbage.mjs [--json]: the bike's physics step and garbage (feel round 4, docs/BIKE.md).
// Counts the young-generation collections over a million steps (any few bytes a step would run that collector many
// times) on flat ground (the physics alone) and on the D6 city spot (+ its ground, buildings, garden walls, benches),
// in THIS fresh process: one or two ground functions, as in the game (a test runner that has built dozens of grounds
// makes V8's call sites megamorphic and measures itself). bikeTest.mjs runs it as a child.
import fs from "node:fs";
import { PerformanceObserver } from "node:perf_hooks";
import { SURF, createBikeState, stepBike, groundQuery } from "../../viewer/bike/bikePhysics.js";
import { createBikeEnv } from "../../viewer/bike/bikeEnv.js";
import { loadCityDocs, buildCitySpot } from "../../viewer/bike/bikeCitySpot.js";
import { buildColliders, KIND } from "../../viewer/drive/colliders.js";

let gcs = 0;
const obs = new PerformanceObserver((l) => { gcs += l.getEntries().length; });
obs.observe({ entryTypes: ["gc"] });
const tick = () => new Promise((r) => setTimeout(r, 30));
async function count(env, s, inp, home, N = 1e6) {
  const run = () => {
    stepBike(s, inp, env);
    if (Math.abs(s.x - home[0]) > 40 || Math.abs(s.z - home[1]) > 40 || s.crashed) { s.x = home[0]; s.z = home[1]; s.y = home[2] + 0.9; s.crashed = false; s.vx = 0; s.vz = 4; s._prepX = NaN; }
  };
  for (let i = 0; i < 3e5; i++) run();              // (warm: optimised)
  await tick(); gcs = 0;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) run();
  const us = Number(process.hrtime.bigint() - t0) / 1000 / N;
  await tick();
  return { gc: gcs, us };
}
const flat = createBikeEnv({ ground: groundQuery(() => 0, () => SURF.asphalt) }), fsB = createBikeState(0, 0, 0, 0); fsB.vz = 4;
const rFlat = await count(flat, fsB, { pedal: 1, steer: 0.3 }, [0, 0, 0]);
const docs = await loadCityDocs("D6", async (p) => fs.readFileSync(p)), C = buildCitySpot(docs, [-1287, 721], { SURF, KIND });
const CC = buildColliders(C.polys, C.circles, C.bounds);
const city = createBikeEnv({ sets: () => [CC], ground: groundQuery(C.height, C.surface, 0.03), edges: C.edges });
const home = [-1290, 735, C.height(-1290, 735)], cs = createBikeState(home[0], home[1], 0, home[2]); cs.vz = 4;
const rCity = await count(city, cs, { pedal: 1, steer: 0.2 }, home);
obs.disconnect();
const out = { flat: rFlat, city: rCity };
if (process.argv.includes("--json")) console.log(JSON.stringify(out));
else console.log(`young collections per 1e6 steps: flat ${rFlat.gc} (${rFlat.us.toFixed(2)} us a step), the D6 spot ${rCity.gc} (${rCity.us.toFixed(2)} us)`);
