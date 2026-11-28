// Timing-only failures retried alone (rule timing-rows-alone, docs/rules/timing-rows-alone.md).
// A gate row that exits TIMING_EXIT (75: tools/gate/timing.mjs gateExit, every failure a timing verdict) measured a
// machine that may have been busy (a tour, another gate, Blender): it is run again, alone, up to RETRIES more times,
// PAUSE_MS apart (a burst of other work passes). It passes on the first run that passes; it FAILS when every run
// failed. Any other non-zero exit (a structural failure) or a timeout is final at once. A real regression is over
// budget on every run and still fails (the self-test, tools/audit/timingRetryCheck.mjs, gate row `timingretry`).
import { TIMING_EXIT } from "./timing.mjs";

export { TIMING_EXIT };
export const RETRIES = 3, PAUSE_MS = 5000;

/** a run's result { code, timedOut } is a timing-only failure (retry it) */
export const timingOnly = (r) => !r.timedOut && r.code === TIMING_EXIT;

/**
 * runOnce(attempt) -> { code, timedOut, ... }, again while it is a timing-only failure, at most 1 + retries runs.
 * Returns the last run's result + { attempts, codes, ok }.
 */
export async function withRetries(runOnce, { retries = RETRIES, pauseMs = PAUSE_MS, onRetry = () => {} } = {}) {
  const codes = [];
  let r = null;
  for (let a = 0; a <= retries; a++) {
    r = await runOnce(a);
    codes.push(r.timedOut ? "timeout" : r.code);
    if (!timingOnly(r) || a === retries) break;
    onRetry(a + 1, r);
    if (pauseMs) await new Promise((ok) => setTimeout(ok, pauseMs));
  }
  return { ...r, attempts: codes.length, codes, ok: r.code === 0 && !r.timedOut };
}
