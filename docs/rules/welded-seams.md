---
status: provisional
added: 2026-11-22
check: `villa` (tools/audit/villaCheck.mjs: mesh_audit contact.js on the villa's LOD0, gate and grounds: 0 floating, 0 overhang)
---
**Rule.** Two faces of a scripted model that meet along an edge split it at the SAME points (subdivision on a world grid,
tools/blender/villa.py grid_cuts; a draped ground's skirt built on the surface's own boundary edges,
viewer/villa/villaGroundsGeom.js): the seam is welded, never a T-junction, so a slab meets its wall, a deck its side and a
paving its skirt with no open edge.

**Why.** The villa's walls and decks were each split on their own (columns of 1 m, cells of 0.7 m) and the paving's skirt
was cut uniformly while its surface was bisected: the contact audit found 16 floating edges and 11 overhangs along the
terrace, the house's back plinth and the drive (2026-11-22). A T-junction is also a crack the sky can show through.
