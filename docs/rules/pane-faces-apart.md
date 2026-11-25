---
status: provisional
added: 2026-11-25
check: `underpass` (tools/audit/underpassCheck.mjs section 5: no frosted pane with its inside and outside faces on one plane in LOD0 + throat or LOD0 + inside; the kiosks' heroshell ceiling 0 m2 at every level) + `heroshell` (tools/audit/heroShell.mjs, ceiling tools/audit/heroShell.ceil.json)
---
**Rule.** A thin panel drawn as two one-sided faces back to back (a pane's outside face in the shell, its inside face in
a throat or a streamed interior) never puts both faces on one plane: the inside face stands at least 5 mm inside the
outside one (the underpass's frosted panes: 12 mm, `GLASS_GAP` in tools/blender/underpass.py). Every set of meshes drawn
together is checked, not each file alone. A hero's heroshell ceiling is lowered to what it measures after a fix, so the
open area cannot come back unnoticed.

**Why.** Round 1 of the Calevoet underpass (claude/underpass1) left 9.9 m2 "open" at the kiosks' LOD0 and wrote it
down as a gap to trace. Traced in round 2: the frosted bays' outside panes (LOD0) and their inside faces (the throat,
and the streamed inside) were both built on the wall's mid plane, facing away from each other. A ray from the street met
both at the same distance and the tie went to the face seen from behind (192 coplanar opposite pairs with the throat,
464 with the inside): heroshell counted it as a hole. On screen the culled back face mostly loses, but which one wins
depends on rounding, so it is a real defect, not only a probe artefact. 12 mm apart: 0 pairs, 0 m2 open at every LOD.
