---
number: 41
status: provisional
check: `dent`: tools/audit/dentGate.mjs (`--old` = ?dent=old: fails)
---
**Rule.** A deformation drawn on a closed body (a crumple, a dent, any vertex-shader push) is a smooth field of the POSITION only, never of the vertex normal: vertices that share a place move together (no seam tears), the field changes slowly against the mesh (all gradients well under 1: no triangle turns its back, at the coarsest LOD too), it never crosses the body's mid-planes nor reaches into its cabin (capped softly by the distance to them: a hard min() folds the field and the thin triangles flip along the fold), and the look of the damage (darker, rougher paint, a crease) comes from the shading, not from deeper pushes. Checked headless on every model of every pack at every LOD at the full damage of each corner, by the same function the shader runs, from outside view directions.

**Why.** the carhit crumple pushed each vertex along its own normal by up to 1.3 x 28 cm with a 23 / m fold wave: hard edges tore open (the copies of a vertex moved apart), bumper lips / wheel arches / boot linings turned inside out (inner faces pushed out through the outer ones), a back-culled body showed holes at the dented corner (owner playtest 2026-11-19: "the damage leaves some hollow mesh"); measured: 7,668 wound-round triangles seen from outside, 73,724 torn seams, 38,718 vertices into the cabin over the 4 packs (claude/dent)
