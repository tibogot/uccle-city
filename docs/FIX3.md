# Fix batch 3 (claude/fix3, 2026-11-15)

Every change is behind a switch with a row in `viewer/features.js`. Images: `docs/fix3/`.

**Machine:** `tools/perf/preflight.ps1` **RED** all session: CPU 27-29 % busy at rest (other agents), free memory 0.5-4.4 GB,
GPU 71-85 C with a power cap while a city tab rendered; with my tab parked the GPU was 3 % at rest. All GPU numbers are
interleaved A/B in one page with my tab in front; read the live ones as about +-1 ms per round. For the grass I wrote an
isolated bench (`debug/grassBench.js`) whose medians repeat within about 0.1 ms.

## 1. JOINS2 regression: surfaces floating over the terrain

**Cause.** The weld was not the cause; joins2's `clampUnder` (`viewer/heightmap.js`) was. Tested with each joins2 worker
change off, F9 / B7: weld + clamp off 53 / 9, nearest weld only 54 / 9, clamp on 415 / 222. Two things went wrong in it:

1. **Stacked surfaces.** Where two near-flat surfaces lie over the same grid vertex (a stair or ramp path over a
   sidewalk, a garage ramp under a slab, a folded junction pad), the vertex was held under the LOWEST one. The top one is
   the one you see, and it floated by up to the 1.2 m `maxDrop`. On F9 (-373, 2291), the garage ramp next to Place du
   Chat Botte, 396 of the tile's 415 floating samples were on such a stack (`tools/fix3/stacked.mjs`).
2. **A vertex beside two surfaces at different heights** took the lowest edge within 1.5 cells. J6 (1744, 820): a
   sidewalk 0.9 m below the road edge pulled the vertex under the road down, and 81 road samples floated there.

The first spot named in the TODO, F4 (-160, -267), had only 18 floating samples. F9, B7 and N5 held most of the increase.

**Fix** (`?clamptop=old` = joins2 as merged). In `clampUnder`:

- A vertex under stacked surfaces more than 30 cm apart is held under the TOP one. Terrain that pokes through the lower
  surface there is hidden, because the top surface draws over it.
- A vertex beside surfaces whose caps differ by more than 30 cm follows its NEAREST edge, as the weld does.
- Slivers narrower than 2 cm are ignored. This is only a guard; no case was found where it changed the counts.

The tile worker was rebuilt.

**City scan, all 120 tiles** (`node --import ./tools/road_audit/register.mjs tools/joins2/cityScan.mjs`; JSON in
`docs/fix3/cityscan_before.json` = joins2 as merged, `cityscan_after.json` = fix3). The scan now also splits buried
samples into VISIBLE ones and HIDDEN ones (under a higher surface, which draws over them):

| | before joins2 | joins2 merged | **fix3** |
|---|---|---|---|
| surface samples > 50 cm over the terrain | 11,241 | 12,730 | **11,490** (+2.2 % over the old count; was +13 %) |
| ... of them over another surface (stacked) | | 1,388 | 430 |
| terrain over surfaces > 2 cm (all samples) | 358,513 | 23,601 | 27,687 (**-92.3 %** vs before joins2) |
| ... visible (not under a higher surface) | | 14,439 | 15,093 |
| ... > 10 cm | 88,025 | 10,498 | 12,172 |
| ... > 25 cm | 29,851 | 8,774 | 9,795 |

The float count is not fully back under the old count. The 329 samples left over the old count are spread over D6,
E10, E6, H6, N5, D4 and G9 (+10..+53 each). They are 0.5-1.3 m steps on 60-100 % slopes and terraces, where a 1 m grid
cannot both stay under the surface and follow the wall. Two things were tried and dropped:

- Limiting the drop of beside vertices to 0.5 / 0.8 m: no change in floats, buried +45-150 %.
- Raising the edge cells to 3 cm under the surface (instead of 12 cm) to close the slit under open edges: buried x3.

**Contact audit** (`viewer.contactAudit("roads:F4")`, in the browser): floating 1,768 / 3,397 m with `?clamptop=old`,
1,757 / 3,404 m now. It is unchanged, so the +8-12 % floating length from joins2 is NOT this cause. It is the 2-12 cm slit
under open sidewalk edges between the vertex under the surface (weld depth 12 cm) and the bank vertex outside it, which
the highest-edge weld used to cover. That is left as a weak spot.

**Tile seams** (I6|I7 up to 0.98 m): not done. Fixing them needs the neighbour tile's surfaces near the border in each
tile's weld / clamp.

Image: `joins_f9_ramp_old_vs_fix3.jpg` (left `?clamptop=old`, right fix3; trees hidden). The bank under the ramp slab now
comes up to the slab. Worker time: weld + clamp 11.5 -> 9.4 s summed over the 120 tiles (node; it was 4.7 s before joins2).

Tools in `tools/fix3/`:

- `variants.mjs`: which worker flag moves the counts.
- `stacked.mjs`: the visible / hidden split.
- `floatdiff.mjs`: floating cells, now vs the weld off.
- `near.mjs` / `cover.mjs`: the triangles around a point.

## 2. AO maps as KTX2 (`?aoktx2=0` = the PNGs)

`tools/textures/ao_ktx2.py` turns the **31 AO PNGs over 300 KB** into `<name>_ao.ktx2` beside each PNG. The petrol kit
is left out because its loader reads the AO pixels on the CPU. The script also writes `viewer/aoKtx2List.js`, which holds
the ?v= stamp, i.e. the source PNG's hash.

**Format: BC4, not Basis.** On desktop, UASTC and ETC1S both transcode to BC7, which is 1 byte / texel: the same GPU
memory as the R8 texture the loaders make now. BC4 is one channel at 0.5 byte / texel and needs no transcoder. The KTX
CLI (`C:/Program Files/KTX-Software/bin/ktx.exe` 4.4.2) has no BC encoder, so the script does the rest itself:

- encodes the blocks with numpy (min / max endpoints plus a 4x4 endpoint search);
- bakes every mip level with a box filter, as the GPU's mip generation does;
- writes the KTX2 file;
- supercompresses it with `ktx deflate --zstd 19` and checks it with `ktx validate`.

Level-0 error: mean 0.5-0.8 / 255, max 18 / 255 (blocks across UV island borders).

**Loader.** `viewer/aoTexture.js withAOKtx2(url, pngLoader)`:

- A module worker fetches the file and inflates the levels with three's zstddec.
- The main thread wraps them in a `CompressedTexture` (RED_RGTC1 = bc4-r-unorm, sampled as (r, 0, 0, 1) like the R8 map,
  so the shaders are unchanged).
- It falls back to the PNG without the WebGPU feature `texture-compression-bc`, for a map not in the list, or on any
  error.

Wired into the 15 `loadAO` copies (landmarks, bridges and tunnels, kits) and the tram's TextureLoader. `main.js` calls
`setAORenderer(renderer)` after `init()`.

| | PNG | KTX2 BC4 |
|---|---|---|
| download, the 31 maps | 56.5 MB | **36.0 MB** (-36 %) |
| download before the cover (cold I6 boot: Saint-Job, the Observatory, public art, the tram, the Saint-Job bridge) | 9.20 MB | **5.71 MB** |
| GPU memory, the 31 maps | 166.7 MB (R8 + GPU mips; the tram's PNG as RGBA8) | **67.3 MB** (BC4 + baked mips) |
| per-map work | PNG decode in a worker, R8 upload, GPU mip generation (render passes) | zstd in a worker, compressed upload of the baked mips, no mip generation |
| cold boot, one run each (`?tilecache=0`, RED) | cover 17.5 s, long tasks before the cover 9.2 s | cover 14.6 s, 6.4 s (one run each: noise, not claimed) |

`aoKtx2Stats` (window) logs each map, its format and its time. 0 fallbacks.

Visual check: Saint-Job church, the same view in two loads, mean |diff| over the church 3 / 255 (TAA and noise):
`ao_stjob_png.jpg` / `ao_stjob_ktx2.jpg`.

**The street-life atlas** was NOT converted. It is not a downloaded file: the street-life worker builds it at runtime
per tile, as an R8 signed-distance text atlas of 2048 x 1024 x 16 layers (not RGBA), with layer sub-uploads. BC4 in the
worker would halve its 32 MB, but SDF text through BC4 needs its own quality check. Left.

## 3. Grass cost

**Measured first** (`debug/grassBench.js`: the city's loop paused; the grass + the loaded terrain rendered 40 times off
screen per sample from the lawn view; the GPU timestamps; 8 alternated rounds; medians). Wolvendael lawn, F4
(-385, 1.7, -60) looking at (-402, 1, -90), golden hour, 1600 x 828:

| variant | grass ms |
|---|---|
| all | 0.78 |
| compute only (no draws) | 0.00 |
| draws without the compute | 0.71 |
| LOD0 / LOD1 / LOD2 draws alone | 0.28 / 0.37 / 0.08 |
| blades at zero width (vertex work, no fragments) | 0.10 |
| unlit `MeshBasicNodeMaterial`, same position and colour | 0.30 |
| scene environment replaced by a constant | -0.10 |
| no sun shadow on the blades | -0.02 |
| depth pre-pass (an unlit depth twin, then EQUAL) | **+0.16** (dropped) |
| blades drawn before the terrain (renderOrder -1) | 0.00 |

So the cost is the FRAGMENTS: about 0.4 ms of Standard lighting (sun + hemisphere + environment + fog) and about 0.3 ms
of rasterising a field of 1-2 px blades. The compute is free, and the vertex work is about 0.1 ms.

**Change** (`?grasslod=old` = before): the blade LOD now also depends on the blade's height ON SCREEN. A 6 cm lawn blade
is about 15 px at 4 m and 6 px at 10 m, so the 5 / 3 segments it used to get drew a curve nobody can see. A blade takes
the fewer segments of the two rules: 5 over 24 px, 3 over 9 px, else 1. It never gets more than before, and long grass
keeps its segments. These are uniforms (`grassU.lodPx / lodPx0 / lodPx1`), so they change live with no rebuild.

- Blades per LOD at the lawn: 12.0k / 31.3k / 11.8k -> **1.0k / 17.5k / 36.7k**.
- Grass GPU: **0.86 -> 0.74 ms** (same bench, 8 rounds).
- No visible change: `grass_lod_old_vs_px.jpg`, live toggle at the same camera, mean |diff| 1.7 / 255 in the lower half
  (wind motion).

**Not reached: ~0.2-0.3 ms.** The unlit blades alone cost 0.30 ms, so the target needs the lighting moved out of the
fragment stage. The next lever is per-vertex (Gouraud) lighting for the blades. Their normals are already a varying,
mostly "up", and constant along a blade, so a per-vertex sun + sky + environment term with the shadow kept per fragment
should look the same for about -0.3 ms. That means re-implementing the Standard terms in the blade's vertex stage; it
was not done in this batch. Lambert (`?grasslambert=1`) is a visible change: it loses the low-sun sheen.

## 4. Night default: NOT flipped

Two of round 3's next steps, both `?night=1` only:

- **Foliage takes a cheap path** (`?nightfoliage=old` = the full loop). The tree crowns' leaf cards (`userData.nightFoliage`
  in `treesStylized.js`) loop over only the first 8 lights of their cluster. The cluster list is sorted by view depth,
  so these are the nearest. They take the lights' diffuse only (`nightLighting.js`).
- **16 real pool lamps instead of 24** (`?nightlamps=24` = before). Every lamp is in the ground light map anyway.

Night GPU at street level (Place Saint-Job street view, traffic on): live interleaved A/B in one page, `__night.master`
0 / 1, 1.5 s settle + 2.5 s sample, the order alternated each round; two page loads per configuration, alternated
new / old / new / old.

| | rounds | median | mean +- s.e. |
|---|---|---|---|
| round 3 (`?nightfoliage=old&nightlamps=24`) | 26 | +1.83 ms | +1.52 +- 0.31 |
| **fix3** | 24 | **+0.92 ms** | **+1.01 +- 0.38** |

Visual check, without traffic so the views match: `night_round3_vs_fix3.jpg`, mean |diff| 0.16 / 255. The crowns are
still lit from below by the lanterns, and the walls and pools are unchanged.

**Decision: not the default.** The median is now just under the 1 ms bar, but the mean is on it, and with this machine's
noise (+-0.4 ms standard error, RED) the bar is not met with confidence. The day / switch checks (0 pipelines, no long
tasks) were therefore not run. On a GREEN machine, re-run the live A/B. If it stays under 1 ms, make the 3 edits in
NIGHT_HOOKUP.md:

- `nightMode.js NIGHT` -> `!/[?&]night=0/`;
- the `night` row in features.js -> `on`;
- keep `?night=0` = the old lamp pool.

A tighter bench (whole frames rendered in bursts with the loop paused) does not work for the night. Its lights fade and
schedule on wall-clock time (0.6 s fades, 30 Hz lamp-shadow alternation), so the bursts measured +3.6 ms. It was
dropped.

## 5. Not done

- The pond-water shader's synchronous build on first sight.
- The first deferred landmark's 0.55-0.8 s main-thread task after the reveal (GLTFLoader parse + material build in
  `stpierreModel.js` / `townhallModel.js`). It was seen again in a cold boot: 743-796 ms tasks 1-3 s after the cover.
- The street-life atlas (see 2).
- Tile seams (see 1).

## Switches (rows in `viewer/features.js`)

| switch | = before |
|---|---|
| `?clamptop=old` | joins2's clamp under the lowest stacked surface / lowest beside edge |
| `?aoktx2=0` | the AO PNGs |
| `?grasslod=old` | the grass LOD by distance only |
| `?nightfoliage=old` | `?night=1`: the full light loop on the leaf cards |
| `?nightlamps=24` | `?night=1`: 24 real pool lamps (any 4-48) |

## Files touched

New files:

- `viewer/aoTexture.js`, `viewer/aoKtx2List.js`
- `tools/textures/ao_ktx2.py`, `tools/fix3/*`
- `debug/grassBench.js`
- 31 `models/*/*_ao.ktx2`

Shared files changed:

- `viewer/heightmap.js`, `viewer/roadBuild.js`, `viewer/tileData.js`, `viewer/tileWorker.bundle.js` (rebuilt)
- `viewer/main.js` (2 lines: the clampTop entry flag, `setAORenderer`), `viewer/features.js`
- The 15 AO loaders: `calevoetModel`, `observatoryModel`, `parkKit`, `policeModel`, `stalleModel`, `stjobModel`,
  `stpierreModel`, `townhallModel`, `vanbuurenModel`, `wolvendaelModel`, `furniture2/furnitureKit`, `rail/bridgeModel`,
  `shops/shopKit`, `stops/stopKit`, `streetkit/streetKit`; plus `tram2Model`.
- `viewer/grass/grass.js`
- `viewer/nightLights/nightLighting.js`, `viewer/nightLights/cityNight.js`
- `viewer/treesStylized.js` (1 line: the `nightFoliage` flag)
- `tools/joins2/cityScan.mjs` (the visible / hidden split, `FIX3_OLD=1`)

Nothing in viewer/foliage, plants, ivy or window boxes.
