# Speed plan: where development time goes and how to cut it

Measured read-only on 2026-11-20. The owner asked: "find the way that will make us work faster."

## Where the time goes

**The merge gate.**
- 47 rows, run one after another: 34.5 min of median row time per run, plus flaky reruns.
- Seven rows take 77 %: drivecheck 326 s, ground 310, trafpark 259, roads 140, tramrails 118, markings 101, streetprops 99.

**Duplicate work in every gate run.**
- The road stage is built ~579 times for 120 distinct tiles (4.8×).
- The full worker build ~300 times for 120 tiles (2.5×), all with the same entry.

**Rows run that a change never touches.**
- Over the last 15 merges: 31,094 s with full runs vs 16,524 s if only the needed rows had run (-47 %).
- The 7 merges that didn't touch the tile core needed ~4-6 min, not 34.
- 14 rows run on every merge only because they read features.js / main.js as text.

**Flaky timing rows.**
- stutter2 and mdrawcull assert the max of one wall-time sample.
- drivecheck hits the fixed 600 s timeout.
- 4 of 13 logged runs failed on timing alone.

**Merge conflicts.** Over 40 merges, both sides changed:

| File | Merges |
|---|---|
| mergeGate.mjs | 23 |
| QUALITY_RULES.md | 21 |
| features.js | 20 |
| CENSUS.md | 15 |
| main.js | 15 |

Also: 5 rule renumberings, and 23 hand commits that only rebuild the worker bundle.

**Browser checks.**
- One Chrome, by hand, queued.
- 39 debug/ scripts already expose run / ab / check functions; about 12 of the 20 browser checks can be scripted today.
- Nothing launches headless Chrome yet.

**Old switches.** features.js has 196 `old(...)` rows, all under 3 weeks old.

## Speed-ups, ranked by time saved per merge
1. **Run only the rows a change needs**, found by a dependency tracer, plus memoising passing rows by content hash: 34 → ~18 min on average, and ~1-4 min on non-core merges. A full run stays as the nightly safety net.
2. **No more sync conflicts:**
   - one file per gate row (`tools/audit/gate.d/<name>.mjs`);
   - one file per rule (`docs/rules/<slug>.md`, by name, no numbers) and per census class;
   - `.gitattributes merge=union` for features.js, one row per line.
   - Saves ~20-35 min per avoided sync.
3. **A `meta` row** for the features-row / no-light / no-DynamicDrawUsage text checks, so 14 rows stop running on every merge: 3-4 min on small merges.
4. **One tile build, many probes**, plus a content-hashed cross-run tile cache: 8-12 min on core runs, ~0 when the core didn't change.
5. **A parallel runner with a memory budget** (4 heavy slots + a light pool; trafpark / tlights on worker jobs): 8-10 min.
6. **Robust timing rows** (best of N + a calibration ratio; timing rows run alone first; a timeout per row): 3-5 min plus agent turns.
7. **A headless browser runner** (tools/browser/run.mjs: serve.mjs + Chrome --headless=new with WebGPU over CDP; a GPU lock for perf rows): 10-30 min of browser turns per merge, and browser checks run in parallel.
8. **Bundle freshness:** auto-rebuild the worker bundle in a one-command merge script (merge, rebuild, needed rows, push, worktree cleanup): 2-5 min plus no stale-bundle risk.

**Old-switch policy:** a switch lives until the owner accepts the feature, or 7 days / 3 merges. Then the old path is deleted and its "old fails" proof is frozen as a fixture.

## Jobs, in order
1. gate-split
2. rules-split + the features.js union
3. meta row
4. dependency tracer
5. row memo + `--changed`
6. timing robustness
7. parallel runner
8. tile cache / shared pass (measure first)
9. bundle freshness + merge script
10. headless runner (BIRDS, TRAFPARK, HEAP, JITTER first)
11. old-switch retirement

Jobs 1-3 and 9 come first: they touch the files every branch edits, so they land when the queue is short, with the merge script converting branch rows into gate.d files.
