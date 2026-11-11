# Foliage Lab: where to resume (2026-11-11, end of the first session)

Branch `claude/foliage` (worktree `.claude/worktrees/foliage`), lab only. Read `docs/FOLIAGE.md` (what exists) and
`docs/FOLIAGE_RESEARCH.md` (why). Serve: `python C:/Users/tibog/AppData/Local/Temp/uccle_nocache_server.py 8827 <worktree>`,
open `http://localhost:8827/labs/foliage-lab.html` (`?scene=garden` for the test bed).

## Done
- Research doc; GPU grass fields (near / main / flowers / litter) with the far ground hand-over; wind; seasons;
  placement from real data (D8 villa streets); procedural hedges with leaf cards; 8 Blender plants + far shells with
  GPU LODs; lab panel, on/off and per-part GPU benchmarks, flicker test and frame strips wired (`lab.runFlicker`,
  `lab.strip`).

## Not done (in priority order)
1. **Ivy** (JS growth on a wall: Luft's IvyGenerator rules; leaves = the `ivy` card already drawn in `cards.js`) and
   **window boxes** (a JS box planter + the Blender `geranium` instanced 3-4 per box). Not started.
2. **Mesh audit to 0 blocking** on every plant (`docs/foliage/audit_summary.txt`, `leak` skipped: see FOLIAGE.md §7):
   remaining items are petals / leaves crossing or coplanar at 1-3 mm (rhododendron trusses 117, laurel 40,
   bulbs 36 = tulip / daffodil petals sharing a plane at their base, lavender 26, geranium 17, hydrangea 9, rose 2,
   box ball 1). Fix in `plants.py`: inner / outer petal whorls offset by 3 mm, leaves' tilt jitter.
3. **Budget**: hedges are the biggest part (cards near). Ideas: a depth pre-pass for the cards, fewer cards on the
   street side seen grazing, cards only on the street-facing side and top.
4. Plants GLB is 9.8 MB (per-corner AO splits every vertex): pack with meshopt compression / quantization
   (gltfpack or the townhall pack script) and store AO per vertex.
5. Snow look (white tops on hedges / shrubs exist; grass under snow shortens; a snow ground layer is the weather lab's).
6. City integration (later, after the owner's review): masks + placements per tile in the worker, the ground shader
   taking `grassGroundColor()`.
