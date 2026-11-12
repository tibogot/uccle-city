# Merge plan (updated 2026-11-13)

## Done on 2026-11-13 (owner: "merge everything usable, on in the city, fine-tune in the labs")

Merged into `claude/foundation`, nothing pushed: facade-kit, stalle, hero-prep, vanbuuren, wolvendael, police,
nekkersgat (= Calevoet station), saint-pierre, observatory, sauvagere (lab, paused), trains + verrewinkel, smallfixes
(night fix re-applied to the new tree code), nightlights, flags, minimap, sound, weather, foliage, pedestrians,
streetlife, falcon-flight, tram2, materials, city-trees, texfactory, roads2 (rounds 1-3). Defaults flipped ON for the
landmarks, trains, flags, minimap, kit, tree impostor kit, material library (`?x=0` turns one off).

## Still open

| branch | state | before merging |
|---|---|---|
| roads2 (round 4) | agent running | shimmer + cost + ground materials + traffic; then merge again |
| traffic | old, `?traffic=1` | adapt to the new lane graph (`rd.net`, ROUND2/3.md notes): part of roads round 4 |
| audit-collide | agent running | collisions + joins |
| fixes1 | agent running | tram on slopes, clean-buildings pass (facadeGeom.js), garage door, far forest |
| police-car | lab | round 2 (narrow beam fan, light through walls) |
| furniture | old (150+ behind) | re-check or rebase first |
| character-audit, character2 | the other chat | leave to it |

## How merges are done (lessons)

- Shared bookkeeping files (`.gitignore`, `labs/index.html`, `docs/TODO.md`, `HANDOFF.md`) keep both sides; then check
  for duplicated cards / lines.
- Code files are resolved BY HAND, never keep-both: on 2026-11-13 keep-both stacked three versions of `tileData()`'s
  `entry = {...}` line in viewer/main.js; the last won and silently dropped the facade kit and the pond beds.
- After a merge: `node --check` on the changed JS, `node tools/build_worker.mjs`, the city loaded at 2-3 tiles with the
  console clean, one look at the screen; tile data changes need a new manifest version stamp (browser caches).
- The local no-cache server must queue more than 5 connections (`request_queue_size = 128` in
  `%TEMP%/uccle_nocache_server.py`), or module bursts fail silently.
