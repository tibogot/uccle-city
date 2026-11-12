# fixes1 resume notes

Branch `claude/fixes1`, worktree `.claude/worktrees/fixes1`, server `python %TEMP%/uccle_nocache_server.py 8843 <worktree>`.
Write-up with all numbers and images: `docs/fixes1/README.md`. Both jobs built, waiting for the owner.

## How to re-check

- Tram: `node tools/build_tram_profile.mjs` (after a change to the tram tracks / DTM); in the city
  `const m = await import("/debug/tramStrip.js"); await m.jointCheck(tripId, d0, d1)`; strips `m.strip({...})`.
  `?trackprofile=0` = the old behaviour.
- Buildings: `node tools/mesh_audit/cityBuildings.mjs I6 H6 E5 F2`; after editing viewer/facadeGeom.js rebuild the
  worker bundle `node tools/build_worker.mjs` (the worktree's tools/worker/node_modules is a junction to the main
  checkout's). In the city: `const s = await import("/debug/shots.js"); await s.shot({pos, target, fov})`,
  `await s.flicker({...})`.
- A background Chrome tab has no requestAnimationFrame: open the city with an initScript that maps rAF to setTimeout,
  or the tree kit never bakes and the animation loop never runs (debug harnesses render by hand).
- Shadows: `viewer.lighting.radiusAdapt = false` = the old 1-texel kernel. Forest: `__treeKit.view.farBias.value = 0`.

## Next (see README "Left")

Verge strip on gable rakes; shadow cascades for aerial views + a clean visual proof on a quiet GPU with frozen weather;
garage placement (CR42L -> features -> facadeGeom bay -> facades.js paint / cut -> placement.js); the far forest's grey
fade target; the remaining audit categories.
