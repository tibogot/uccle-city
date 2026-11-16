# FAR CITY (branch claude/farcity)

Owner, 2026-11-15: the far tiles look **blocky from the air** (falcon height, the overview). The far tiles (the ring
past the full tiles, `loadLiteTile` in viewer/main.js) drew the UrbIS LoD2 solids with one flat colour per building: no
windows, no base, no roof texture. Next to the near city's façades they read as plain boxes.

## Round 1 (commit 9df719c8, merged with foundation in c0f37367)

### What it does

**Far buildings get the near façade's look, in one material, one draw a tile (as before).**

- Worker, `viewer/farLookData.js` (`farBuildings`, called from `tileData.js buildLiteData`): every wall triangle carries
  the same wall-local coordinates the near façade shader reads (a simplified `facadeGeom.js analyseBuildings`): the
  triangles of a building grouped into planar faces, `u` along the face, the face width, the height over the base, the
  face's own eaves line; plus the building's wall style and TYPE (`buildingTypes.js classify`, the same draw as the full
  tile), a party-wall probe (0.35 m outside the face: a neighbour = blind wall), a gable flag and a hash. Roof triangles
  carry their real (orthophoto) colour and a flat flag.
  Two vec4 per vertex: `aFA`, `aFB` (layout in the file header). The flat `color` attribute is gone on this path.
- GPU, `viewer/farLook.js` (`farBuildingMaterial`, one shared `MeshStandardNodeMaterial`):
  - walls: the style's colour (with the material library on, the brick scans' mean albedo, so it matches the near
    bricks), art deco light tints, +-6 % per building; the type's window grid (`TYPE_GRID` bays / window width / sill /
    head) on the near façade's fitted storeys (`facades.js storeyK`, same formulas, so the grid lands where the near one
    does at the hand-over); frames (per type palette), glass = dark room + the sky's fresnel sheen, per-window tone that
    melts to its mean under a few pixels; blue-stone plinth (0.9 m maison de maître, 0.5 m others); a light cornice line
    and the eaves' shadow band; blind party walls; height AO + ground-contact band;
  - roofs: the real colour, tile / slate courses down the slope as zero-mean stripes (average = the real colour), flat
    roofs plain, +-5 % per building;
  - night: some rooms lit (`env.uInteriorGlow x env.uNight`), the share melting to 38 % when a window is sub-pixel;
  - anti-aliasing: every pattern is a box-filtered pulse (`tslkit.js filteredPulse` with `fwidth`): no texture, no
    per-pixel noise, patterns fade to their average colour as they shrink (no shimmer under TAAU).
  - landmarks (style 6+): plain ashlar stone, no grid (they have their own far LODs).
- **Tree hand-over** (`viewer/treeKitCity.js`, `SOLO_WHILE_LITE`): a tile's far tree impostors stay "solo" while its
  far tile is still registered. Before, the full tile registered "full" as soon as it STARTED building (hidden, then
  0.9 s fade): the far tile's trees dropped to the 400 m hand-over at once and the tile stood treeless for the build +
  the fade (seen at 45 m over Saint-Job: the whole of I7 bare). Now they stay until the far tile is disposed at the end
  of the full tile's fade-in. The other way (full -> far) the far tile registers first, so the trees are solo before
  the full tile fades out.

### Switches

| URL | Effect |
| --- | --- |
| `?farlook=old` | far buildings as before: flat-coloured solids (`lite-buildings` material, vertex colours) |
| `?treehandover=old` | far tile's tree impostors drop as soon as its full tile starts building (bare tile during the build + fade) |

Both are rows in viewer/features.js (dev panel, "Places & assets"). `entry.farLook` is part of the tile entry, so the
tile cache key (`tileCache.js cacheKey`: the whole entry + the worker bundle hash) differs between the two looks: no
stale far tile when the switch flips. The far-look arrays (`aFA`, `aFB`, sliced or not) survive `tilePack.js`
pack / unpack (checked in node: lengths, values, sub-views).

### Costs (measured so far)

- **Draws**: unchanged, 1 building draw + 1 terrain draw (+ the trees) per far tile.
- **Worker** (node, warm, `farBuildings` alone incl. `classify`): 16-46 ms a far tile (H6, 535 buildings: 31 ms; I7
  88 ms first warm run, JIT noise). Once per tile, off the main thread; with the tile cache warm it is not paid at all.
- **Memory**: 56 bytes / vertex instead of 36 (pos + normal + 2 x vec4 vs pos + normal + rgb): +0.7 to +1.2 MB per far
  tile (I7 1.24 -> 1.93 MB, H6 2.17 -> 3.38 MB), GPU and tile cache.
- **GPU**: the fragment shader is heavier than a flat colour (about 20 filtered pulses, a TYPE_GRID select chain, a
  fresnel). Not yet measured on GREEN: `debug/farcityAB.js` swaps the far material for a flat one in one page at a
  parked camera and times both with timestamp queries (round 2 browser turn).
- **Compile**: one more pipeline (+ its fade copy), compiled with the far tile (`preCompile(g, TILE_FADE)`).

### Tools

- `debug/farcityShots.js`: parked views (`s.go("falcon")`, `"overview"`, ...), HUD hidden, paused; `s.state()` lists
  full / far / fading tiles.
- `debug/farcityAB.js`: GPU A/B far look vs flat (see above).

### Images (round 1, from the previous agent; before = `?farlook=old`)

- falcon height over Saint-Job: `farcity/r1_falcon_before.jpg` -> `farcity/r1_falcon_v2.jpg`
- overview: `farcity/r1_overview_before.jpg` -> `farcity/r1_overview_ring0_v1.jpg`
- closer: `farcity/r1_close_before.jpg` -> `farcity/r1_close_v1.jpg`; near / far side by side `farcity/r1_near_far_v1.jpg`
- hand-over, mid fade: `farcity/r1_handover_live_mid.jpg` (bare tile) -> `farcity/r1_handover_live_mid_fix.jpg`,
  `farcity/r1_handover_live_after_fix.jpg`

### Left / not done

- GPU / CPU numbers vs `?farlook=old` on GREEN, a long drive through far -> full hand-overs (colour jump, popping),
  night shots, defect pass (aliasing, z-fighting, black faces).
- Far buildings are not weatherized (snow / wet), like the rest of the far tile.
- No ground fit on the far tiles (the base is UrbIS's), no doors / shops / kit detail (fine from 150 m+).
