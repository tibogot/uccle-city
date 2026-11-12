# Collisions + joins audit: where the work stands (resume here)

Branch `claude/audit-collide` (worktree `.claude/worktrees/audit-collide`), server
`python %TEMP%/uccle_nocache_server.py 8842 <worktree>`. `tools/worker/node_modules` is a junction to the main
checkout's (git-ignored). Rebuild the tile worker after any change under viewer/ that it bundles: `node tools/build_worker.mjs`.

## Done (see README.md for the numbers)
- JOINS check: `tools/mesh_audit/contact.js` + city runner `viewer/contactAudit.js` (`viewer.contactAudit(name | "roads:<tile>")`).
- Verrewinkel: deck-tongue skirts + footbridge landing seats (tools/blender/roadBridge.py), SE apron dropped, the
  ground at the bridge ends raised to the decks BEFORE the roads are built (viewer/rail/railData.js `abutmentFill`,
  tileData.js). Police hedge sunk 0.45 m under its lower side (tools/blender/police_rouge.py).
- COLLISION TEST: `viewer/drive/collisionTest.js` (`viewer.collisionTest(tile)`), loop `docs/collisions/runall.js`
  (paste into the page with the render loop paused; results in `window.__runAll`), summary `docs/collisions/summarize.py`.
- Collider fixes (switch `?colfix=0` = the old colliders, for A/B):
  - buildings: colliders from the DRAWN walls at car height (colliders.js `buildingBlocks`), not the UrbIS footprints;
  - landmarks + bridges: colliders from their LOD0 (viewer/heroColliders.js): car blocks + character triangles; the
    UrbIS solids they replace are out of every collider set; hand-made St-Job steps / bridge parapet rings retired;
  - parked cars, benches, bike racks, shelters, signals, stop poles, tram poles, rail masts, rail platforms for the car
    (driveMode.js `featureColliders`, colliders.js `extendColliders`);
  - two-layer drive surface in Uint16 (a street under a deck; the Uint8 clamp at 2.55 m);
  - walk mode = the third-person capsule controller in one shared city collision world (cityHook.js `cityCollision`);
  - the Wolvendael pond drags the car (carEnv.js), no wall at the shore.

## Next / open
- Heroes contact check after the fixes (docs/collisions/joinrun.js on E4 / D6 / H5 / G2 / F7 with ring=1) and the
  roads-vs-terrain contact run (docs/collisions/roadsrun.js) over all tiles: road defects go to the roads agent.
- Character in the pond (wades onto the bed today).
- Images per fix at street level (docs/collisions/images/).
