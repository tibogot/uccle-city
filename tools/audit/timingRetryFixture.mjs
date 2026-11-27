// A minimal timing row for the self-test (tools/audit/timingRetryCheck.mjs, rule timing-rows-alone): one timed
// path (a fixed CPU loop, the best of 3 between two calibrations) against a budget relative to the calibration, so
// it passes on any load; GATE_SLOW=fixture makes the path GATE_SLOW_X (4) times dearer: a real regression.
//   node tools/audit/timingRetryFixture.mjs [--structural]   (--structural: also a non-timing failure -> exit 1)
// Exit 0 pass, 75 only the timing failed (tools/gate/timing.mjs gateExit), 1 a structural failure.
import { measure, bestOf, calibrate, timed, gateExit, slow } from "../gate/timing.mjs";

let fails = 0;
const check = (name, ok, msg) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${msg}`); };
// the path: one calibration loop (calibrate(1) = a warm loop + one timed loop: ~2 loops of work)
const MT = await measure(() => bestOf(3, () => { const t0 = performance.now(); calibrate(1); slow("fixture", t0); return performance.now() - t0; }));
const c = (MT.c0 + MT.c1) / 2, BUDGET = 3;   // quiet: ~2 x c; slowed x4: ~8 x c
check("path cost", timed(MT.value <= BUDGET * c), `${MT.value.toFixed(2)} ms, budget ${BUDGET} x the calibration ${c.toFixed(2)} ms (${MT.note})`);
if (process.argv.includes("--structural")) check("structural", false, "a non-timing failure (--structural)");
process.exit(gateExit(fails));
