# Defect census (claude/census, 2026-11-18)

After the owner's playtest of 2026-11-18 (docs/TODO.md "OWNER PLAYTEST 2026-11-18"), the owner asked for each defect
CLASS to be counted across the whole city before anything is fixed. Each class below has a detector that runs headless
in node: it builds every tile with the city's own code and checks what is drawn. Nothing is fixed yet and no detector is
a gate row yet. When a class is fixed, its detector becomes that fix's row in `tools/audit/mergeGate.mjs`.

All the detectors run as `node --import ./tools/road_audit/register.mjs tools/audit/census/<script>.mjs --all [--out FILE]`,
and `T ...` runs single tiles. Raw results are in `docs/census/*.json`. Positions are in local metres (x east, z south),
so a spot can be opened with `?quick=1&at=x,z`.

This page is GENERATED (`node tools/docs/rulesIndex.mjs`) from one file per class, `docs/census/<class>.md` (+ this
head, `_head.md`, and `_tail.md`); the `meta` gate row fails when it is stale. A new class or a class fixed: edit or add
its file, then regenerate (docs/WORKFLOW.md).
