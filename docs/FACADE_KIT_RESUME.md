# Façade kit round 3: DONE 2026-11-12 (this file is historical; see docs/facadekit/README.md "Round 3")

The specular AA build error was `transformNormalByViewMatrix()` (r187) inside the IBL's getTextureLevel / getUV
contexts: the wall normal is now `cameraViewMatrix x vec4(n, 0)`; SAA is on. Baked rebuild, lab check, flicker test,
GPU and docs done.

# Façade kit round 3: resume notes (WIP, stopped 2026-11-12 on the owner's shutdown)

Branch `claude/facade-kit`, worktree `.claude/worktrees/agent-a511811fc16efd9dd`, lab `labs/kit-lab.html` (port 8806).
`claude/foundation` merged in first (d63cca9: main.js keeps both the kit start and the town hall; .gitignore both sides).

## Done
- Mesh checker copied from `claude/stalle` a3d14ab: `tools/mesh_audit/*`, `labs/flickerTest.js`.
- `tools/facadekit/auditKit.mjs`: audits the PACKED kit as the city draws it (groups that stand together, wall with the
  opening cut and nothing behind it, ground / roof, LOD0 to 28 m and LOD1 to 115 m, 3 opening sizes, runs at outside /
  inside / straight joins). **All groups 0 blocking (leak included), both LODs, all sizes** (last run audit15, before the
  final material edits; Blender was run with `--no-bake`, see below).
- Gap / z-fight fixes in `tools/blender/facadeKit.py`: surrounds start on the wall plane at the opening (welded to the
  reveal, reveal jambs from y = -0.004, flat heads one quad), leaves meet at x = 0 with a full-height astragal (the 4 mm
  meeting-stile slit), panes tucked 4 mm into their members, no door frame bottom rail / no reveal bottom on doors,
  window B frame = one mitred sweep, bricks / quoins on the wall plane, door A surround stacked (no shared faces),
  muntin split, railing handrail one closed mitred sweep, rails between posts, wider ornament side bars, plain-railing
  variants `balconyP` / `balconnetP` for French windows < 1.1 m.
- FAR mode: every piece has a scripted far variant (no bevels / beads / bolections) = LOD1 source; packKit simplifies it
  gently (3 mm, LockBorder; runs / small mouldings 8-10 mm).
- `tools/facadekit/packKit.mjs`: own normals per LOD (angle-limited smoothing, 14.5 deg clamp, flat regions flat) and a
  per-vertex REGION WIDTH + run-end flag + arch rise in a new `aKitW` attribute (kit.json version 3).
- Runs mitred in the shader (`kitMaterials.js sliceDelta`: end rings shear by z * tan(turn / 2); arched heads bend onto
  the true arch of the stretched width); `placement.js joinRuns` joins run ends tile-wide; cornCorner no longer built.
- New pieces (Blender, audited clean): band (string course), doorNouveau, doorDeco, doorModern (side light + letter slot),
  garage (built, NOT placed: the façade shader has no garage openings), winC (stained transom, slot glass_stained),
  shutter, bay (oriel), dormer, numPlate (blank enamel plate; figures from streetlife later). New slots appended:
  slate, brick_dark, render_white, copper_patina, glass_stained, metal_anodised, enamel_blue.
- Placement rules for all of them (`placement.js`; facadeGeom passes `roofAt` for the dormer test); worker bundle rebuilt.
  I6: 741 kit faces, 230 run joins.
- Materials: thin-part filter (town hall's region width, normal bent to the wall's, coverage albedo), Mr.doob's
  `filteredPulse` box filter on joints / speckle / grain, new looks.
- Lab: city shadow box size (`shadowHalf`, main.js formula), gallery walls as closed blocks (no dark room plane), new
  pieces + mitred cornice / band corner + dormer on a roof, AA switches, flicker test buttons, `lab.flicker()`.

## Half done (exact state)
- `viewer/facadeKit/kitMaterials.js specularAA()` (Filament / Tokuyoshi-Kaplanyan kernel): fails to BUILD in situ
  ("TSL: Cannot read properties of undefined (reading 'getNodeType')", SplitNode -> OperatorNode, 52 objects = every
  opaque LOD0 kit mesh) even on a plain `renderer.render(scene, camera)` of the lab scene, while `compileAsync` of the
  same material in a fresh scene passes. Bisected: it is the SAA roughness (normal bend and fades are fine). Now OFF
  unless `?saa=1`. Note: three r187 already adds `getGeometryRoughness` (max |dFdx/dFdy normalViewGeometry|) inside
  `getRoughness`. Next: build the kernel inside the look Fn (or as an `Fn` with the derivatives taken before the slot
  `If` chain), or check whether the derivative node is reached in the vertex stage via positionNode.
- Blender pieces were built with `--no-bake` while iterating: rebuild WITH the AO bake + previews:
  `blender --factory-startup -b -P tools/blender/facadeKit.py -- models/facadekit/src --previews docs/facadekit/wip`,
  then `node tools/facadekit/packKit.mjs`, then `node tools/facadekit/auditKit.mjs` (must stay 0).
  The committed `models/facadekit/kit.*` are from the no-bake build (AO = 1).
- Lab not yet looked at with the new pieces in a front-lit view; the doors looked black backlit (golden) - check midday.

## Next, in order
1. Fix specularAA build; A/B it in the lab.
2. Baked rebuild + previews; audit; commit.
3. Flicker test before (port 8807 worktree at d63cca9: `scratchpad/fk3/before`, flickerTest.js copied in) vs after on a
   door and a window close-up (strafe + dolly); heat maps.
4. Lab screenshots of every new piece (front-lit); real-photo comparison (look-only).
5. Row / city frame strips walking a street; GPU per view in-page A/B (noisy: other tabs share the GPU, say so).
6. Update docs/facadekit/README.md (round 3 section) and docs/TODO.md.

## Open questions
- Garage door placement: needs garage openings (OSM garages / a shader opening kind).
- Number figures: format of the streetlife address data for the plate.
- LOD1 triangle counts rose for some pieces (balcony 566 -> 1234) to keep 0 leaks: acceptable?
