# Quality rules and the checks that enforce them

Every defect the owner found becomes a **rule** and, where possible, an **automated check**.
Before every merge into `claude/foundation`:

1. Run `node tools/audit/mergeGate.mjs` (or `node tools/merge.mjs <branch>`, docs/WORKFLOW.md). All rows must PASS (exit 0).
2. Run the browser gates it lists, including the **visual tour** (docs/TOUR.md): `debug/tour.html` on the branch, then
   `node tools/tour/compare.mjs foundation <run>`. Look at every flagged view and explain it in the merge message.
3. After the merge, the branch's tour run becomes the new `foundation` baseline (the old one is kept as
   `foundation-pre-<branch>`).

This page is GENERATED (`node tools/docs/rulesIndex.mjs`) from one file per rule, `docs/rules/<slug>.md`; the `meta`
gate row fails when it is stale. To add a rule: a new `docs/rules/<slug>.md` (`added:` date, `check:`, **Rule.** and
**Why.** paragraphs; no number: rules 1-48 keep theirs for history, new ones are named by slug), plus its gate row
`tools/audit/gate.d/<name>.mjs` (node, offline) or `tools/audit/gate.d/browser/<name>.mjs` (needs the viewer), then
regenerate this page. See docs/WORKFLOW.md.
