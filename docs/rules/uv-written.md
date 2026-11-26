---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2e: every big slot primitive's UV spans more than 0..1 and is not mostly 0 / 1) + villa.py make() reads the UV back and stops the build if it did not take
---
**Rule.** A Blender generator that writes a mesh's UV (or any attribute) through the Python API fetches the layer by
name right before writing it, never through a reference taken before another attribute or layer was added, and reads
it back once (the build stops if what it wrote is not there). The shipped GLB's UV is checked against Blender's
default per-face 0 / 1 unwrap.

**Why.** Found in villa v3 job 2 (2026-11-26) while the throw's knit would not show: since round 1 every villa UV
(exterior and interior) was the default 0 / 1 per face. tools/blender/villa.py make() took `uv = me.uv_layers.new()`,
then added the colour attribute (which reallocates the mesh's attribute storage), then wrote through the stale `uv`:
the write went nowhere, silently. Every metre-based TSL pattern (oak planks, cladding boards, marble veins, floor
tiles, the plaster's noise, the library scans, the fabric scans) was drawn once per face: the audit's "stripy oak" and
"fish-scale plaster" were this bug.
