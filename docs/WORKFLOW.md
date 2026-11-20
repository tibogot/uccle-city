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

Run the gate:
- `node tools/audit/mergeGate.mjs` runs everything.
- `node tools/audit/mergeGate.mjs meta tlights` runs only those rows.
- `--list` prints the row names. An unknown name exits 2.

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
   - `auto` (the default) runs `meta` plus every row whose script imports a changed file, or names it as a path.
     If a changed `data/` or `models/` file is named by no row, it runs the full gate.
   - `full` runs every row (the nightly safety net).
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
