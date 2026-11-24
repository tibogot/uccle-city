---
status: provisional
added: 2026-11-24
check: `underpass` (tools/audit/underpassCheck.mjs: the OSM ways, the hide lists, the budgets, the worker's well cut on tile D6, the joins, an offline walk-through east -> west and back) + the mesh audit in tools/underpass/pack.mjs (0 blocking)
---
**Rule.** Something under the city's ground (the Calevoet pedestrian underpass U1, later U2 and the car park) opens the
ground ONLY inside a wall that hides the cut's edge: the drawn terrain is dropped inside the model's well rings (the
kiosks' inner wall faces and the mouth's landing-slab skirt) and the triangles crossing a rim are CLIPPED on it (the
outside part kept on its own plane: no stair-step, no floating edge), never anywhere else; a measured street surface
round a well gets the well as a hole (never a partial cover); the height fields the cars, the road engine, the birds and
the falcon read are NOT changed. The walker is carried by the model's own collision mesh (in LOD0, loaded with the tile)
and its height field gets VOIDS: off inside a well, off under a corridor only below the corridor's soffit + a margin (a
body on the ground over it is still carried). Nothing underground is drawn from far: the inside streams in within 50 m,
its light is a Cycles bake (no light added: rule fixed-light-count), and the kiosks replace the UrbIS boxes they stand in
(full URIs: rule hide-ids-full-uri). Murals and tags in it are our own invented designs, never a copy of the real artwork.
`?underpass=0`: none of it (today's city).

**Why.** The owner asked for the Calevoet underpass (2026-11-24, docs/TODO.md): the city's ground is a height field, it
cannot hold a tunnel; cutting a hole where nothing hides its edge shows the cut from the street (the joins rule), lowering
the height field there would drop the cars and the road engine into the stairs, and the walker's height field pushed any
body below the ground back up through the corridor's roof. The first data look found the west kiosk standing inside the
Rue Egide Van Ophem sidewalk surface (UrbIS 138343): its paving would have covered the stair mouth, and the land cover
painted the tunnel's footway across the ballast as a dirt path.
