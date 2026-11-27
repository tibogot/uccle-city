# Workflow for job agents (short)

The files every job used to edit are now one file per entry, so two branches rarely touch the same file
(docs/SPEED_PLAN.md jobs 1-3 and 9). Do not hand-edit `tools/audit/mergeGate.mjs`, `docs/QUALITY_RULES.md` or
`docs/CENSUS.md`.

## Add a gate row

Add one file: `tools/audit/gate.d/<name>.mjs`. The name is lower case (letters, digits, `-`) and must match the file name.

```js
// gate row `tlights` (docs/WORKFLOW.md)
export default {
  name: "tlights",
  script: "tools/audit/tlightsCheck.mjs",          // a node script: exit 0 = PASS
  node: ["--import", "./tools/road_audit/register.mjs"],   // optional node options
  args: ["--quiet"],
  guards: "what it guards (rule <slug>, docs/X.md)",       // shown in the table
  timeout: 600,       // optional, seconds (default 600; drivecheck has 1800)
  timing: true,       // optional: it measures wall time, so it runs first
  deps: ["data/x/"],  // optional: extra files / dirs it reads that the import crawl cannot see
  meta: {             // optional: the cheap text checks, run by the `meta` row (not by this row)
    features: [{ key: "tlights", type: "old" }],          // a viewer/features.js row (with these fields)
    clean: ["viewer/tlights/"],                           // no DynamicDrawUsage, no light made
    text: [{ file: "viewer/main.js", what: "hands the sites to cityTLights", test: (s) => /cityTLights\.addTile\(/.test(s) }],
  },
};
```

Put "a features.js row exists", "main.js wires it", "no light / no DynamicDrawUsage" checks in `meta`, not in your
script. If those live in the script, the row has to run every time someone touches features.js or main.js.

A browser-turn check is `tools/audit/gate.d/browser/<name>.mjs`: `export default { name, text }`.

Two more fields:
- `timing: true` when the row asserts a wall time. It must measure through `tools/gate/timing.mjs` (see "Timing rows"
  below); the `meta` row checks that.
- `heavy: true` when the row builds many tiles. Usually not needed: the runner measures each row's memory.

Run the gate:
- `node tools/audit/mergeGate.mjs` runs every row, except the rows the memo skips (below).
- `node tools/audit/mergeGate.mjs meta tlights` runs only those rows (the memo still applies).
- `--full` turns the memo off: every picked row runs.
- `--changed [--base REF]` runs only the rows whose deps changed since REF, plus `meta`. REF defaults to the merge base
  with claude/foundation; uncommitted and untracked files count as changed.
- `--serial` runs one row at a time. `--jobs N` and `--mem MB` set the parallel budgets.
- `--list` prints the row names. An unknown name exits 2.

It prints which rows it skips and why, then the table in the rows' own order (a skipped row says `SKIP`). Each row's
full output is in `.cache/gate/logs/<row>.txt`.

## Memo and --changed

Every row runs traced: `tools/gate/trace.mjs` is loaded into the row's process, its node children and its worker
threads (through `NODE_OPTIONS`). It records the modules they load, the files they read and the directories they list,
into `.cache/gate/deps/<row>.json` (git-ignored). Files the row writes are its outputs, so they are left out.
- **Memo.** After a PASS, the gate stores a key in `.cache/gate/pass/<row>.json`. The key hashes the node version, the
  row's gate.d file, the content of every traced file and the names in every listed directory. The next run skips the
  row while the key is the same. A file edited while the row ran gives no memo.
- **--changed.** A row runs when a changed file is one of its traced files, or a file added to / deleted from a
  directory it listed. A row with no trace yet falls back to the static import crawl (`tools/gate/deps.mjs`).
- **Not memoised:** a row that runs a program other than node or git (`meta` runs esbuild): what that program reads is
  not traced.
- **Limits.** The trace sees what one run did: a file read only on another code path (another tile list, a failure
  branch) is not in it. `--full` is the nightly safety net. A file inside `node_modules` is recorded as its package's
  `package.json`.

`tools/merge.mjs` `auto` runs `mergeGate --changed --base <the pre-merge commit>`; `full` runs `--full`.

## Tile cache

A row that builds tiles with the tile worker's code calls `tileData(entry, base)` from `tools/gate/tileBuild.mjs`, not
`buildTileData` (rule tile-cache). The tile lands in `.cache/tiles/` (git-ignored); every later row, and every later
gate run, reads it back in ~0.1 s instead of rebuilding it (4-10 s a tile).
- **Key.** The import closure of `viewer/tileWorker.js` (the worker bundle's own inputs; `meta` checks this against
  esbuild's list), the canonical entry, the node version, and every file the build read (recorded while it built,
  re-hashed at each lookup). Edit any of those and the tile is rebuilt; nothing else to invalidate by hand.
- **What comes back** is what the worker would post (plain data). With `keepNet`, only `d.deckRings`,
  `d.net.streetModel.segments` and `d.hm` (a `Heightmap.from`) are there; any other `d.net.*` throws. Need more of the
  network? Add it to `pack` / `unpack` in tileBuild.mjs as plain data.
- **Off.** `node tools/audit/mergeGate.mjs --no-tile-cache ...`, or `--no-tile-cache` on a row script, or
  `TILE_CACHE=0`. `TILE_CACHE=verify` also builds every hit fresh and throws on a difference.
- **Size.** Capped at `TILE_CACHE_MB` (default 4096) with LRU eviction; no store while the disk has < 10 GB free.
- **Check.** The `tilecache` row (tools/audit/tileCacheCheck.mjs) tests the mechanism and compares I6 / H6 / E9 through
  the cache with a fresh build, byte for byte. The gate prints a `tile cache:` line (hits per row) after the table;
  every lookup is a line in `.cache/tiles/log.jsonl`.
- Another builder (the road stage, `tools/road_audit/tile.mjs` `loadTile`) can use `cached()` from
  `tools/gate/tileCache.mjs` once its result is plain data; today it holds closures (`net.locate`, `prep`), so it is
  not cached (docs/SPEED_PLAN.md job 8).

## Timing rows

A row that asserts a wall time is `timing: true` and uses `tools/gate/timing.mjs` (rule timing-rows):
- `measure(fn)` times a fixed loop before and after `fn`. If the two calibrations differ by more than 15 %, it throws
  the run away and measures again (up to 5 times). It returns `k`, the slow-down against the fastest calibration this
  machine ever gave (`.cache/gate/calib.json`; at least 1, at most 3). Write budgets as `budget * k`.
- `bestOf(n, fn)` keeps the best of n repeats.
- `cleanSteps(makeGen, 5)` times every step of a sliced generator 5 times and keeps each step's best. It then cuts the
  clean steps the way `sliced()` does. Check those slices, and check that a real `sliced()` run yields at least half
  as often.
- No `process.cpuUsage()` for a window under 1 s: on Windows it counts in 15.6 ms ticks.
- Mark every timing verdict `timed(ok)` and exit `gateExit(fails)`: 75 = only timing verdicts failed. The gate re-runs
  such a row alone up to 3 more times (tools/gate/retry.mjs) and fails it only when every run failed; exit 1 (a
  structural failure) is never retried. A structural row with a calibrated timing inside (pedsgraph W6, pedssim S4)
  stays in the parallel group: its exit 75 is re-run alone after the parallel phase. Never judge a time stored with a
  cached tile (`d.times`): time the step in the row. `GATE_SLOW=<name>` + `slow(name, t0)` slows a timed path for
  the self-test (row `timingretry`, rule timing-rows-alone).

The gate runs the timing rows alone, first, one at a time. Then it runs the other rows in parallel:
- a CPU budget (the logical cores);
- a memory budget (60 % of RAM, and 1 GB must stay free on the machine);
- at most 3 heavy rows at once.

Each row's cost comes from its last trace (peak memory of its processes, peak node threads). Without a trace, `--jobs` /
`--all` in its args make it heavy. The longest rows start first. Timeouts are doubled in the parallel part. The table
warns when a row writes a file another row reads.

## Add a rule

1. Add `docs/rules/<slug>.md`. Name it by its slug; a new rule gets no number. In docs and code, call it "rule <slug>".

   ```
   ---
   status: provisional
   added: 2026-11-20
   check: `tlights` (tools/audit/tlightsCheck.mjs)
   ---
   **Rule.** What must hold, in one paragraph.

   **Why.** What went wrong, in one paragraph.
   ```

2. Run `node tools/docs/rulesIndex.mjs`. It regenerates `docs/QUALITY_RULES.md` (and `docs/CENSUS.md`). The `meta` row
   fails while either index is stale.
3. A census class works the same way: `docs/census/<class>.md`. Its frontmatter holds `class:`, `title:` and one
   `row:` line per summary-table row. Then regenerate.

## Add a feature switch

Add one row to `viewer/features.js` (see the field list at the top of the file).
- Keep the whole row on ONE line.
- Use a new key.
- Git merges this file with `merge=union` (`.gitattributes`): when two branches add rows, both lines are kept. Where a
  row sits inside its section does not matter: the dev panel groups rows by `sub`.
- The `meta` row checks that the file imports, that every row is on one line, and that no key appears twice.
- If your gate script needs the switch, declare it in your row's `meta.features`.

## Merge a branch (the coordinator, in the main checkout on claude/foundation)

```
node tools/merge.mjs claude/<job> --message-file <msg.txt> [--rows auto|full|a,b,c] [--no-push] [--keep-worktree] [--dry-run]
```

1. Merges with `--no-ff -F <file>`. On a conflict it stops and lists the files. Resolve them, `git commit`, then run
   `node tools/merge.mjs claude/<job> --no-merge`.
2. Rebuilds `viewer/tileWorker.bundle.js` here in the main repo (rule 12). If its code hash changed, it commits the bundle.
3. Runs the gate rows:
   - `auto` (the default) runs `mergeGate --changed` against the pre-merge commit: `meta`, plus every row whose traced
     deps the merge changed, minus the rows the memo skips (see "Memo and --changed").
   - `full` runs every row with the memo off (the nightly safety net).
   - `a,b,c` runs those rows only.
4. On PASS it pushes (never `--force`). On FAIL it stops: nothing is pushed and the merge stays a local commit.
5. It unlinks the branch's worktree junctions (`rmdir`, never a delete through a junction) and removes the worktree
   (under `Downloads/uccle-jobs/` or named `uccle-*`). It checks that `data/raw` has the same file count. It keeps a
   worktree that has uncommitted tracked changes, and it never deletes a branch.

`--dry-run` shows the changed files and the rows it would run. It changes nothing.

Still by hand: the browser rows the gate lists, and the city tour vs the baseline (docs/TOUR.md).

## An old branch (made before claude/speed1)

On the branch, run `git merge claude/foundation`, then `node tools/gate/convertBranch.mjs`. See docs/SPEED_PLAN.md
"Branch conversion".
