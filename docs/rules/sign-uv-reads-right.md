---
status: provisional
added: 2026-11-25
check: `underpass` (tools/audit/underpassCheck.mjs section 5: every lettered face of the inside reads left to right and upright, with the same UV0 scale both ways within 2 %, and the round-2 shader samples it as mapped)
---
**Rule.** Lettering (a sign, a lettered beam, a plate) is mapped once, in the model script, so that it reads correctly
from the side it faces: UV0 x grows to the viewer's right (right = -normal x up), the stored v falls as the face rises
(glTF keeps 1 - v), and the UV scale is the same along both axes (no stretch). The shader then samples the atlas exactly
as mapped: no per-region mirror or flip to "fix" what one screenshot showed. The check measures the UV gradients on the
packed GLB's faces, so a later change to the script or the exporter that mirrors or stretches a sign fails the gate.

**Why.** Round 1 of the Calevoet underpass saw mirrored direction signs in its first browser look and mirrored the
atlas range x 37..40 in the shader (`77 - x`). Its GLB was then re-exported with the signs mapped the right way, so the
shader mirror turned them back to front again: the round-2 look (2026-11-25, `before/day_signs.png`) showed "Rue
Engeland · Dieweg" and the arrows reversed. Measured on the packed GLB: all 28 lettered faces already read left to right
at 1.667 atlas metres per metre both ways; the shader mirror was the defect. A fix made in the shader for what a model
should carry hides the next change to the model.
