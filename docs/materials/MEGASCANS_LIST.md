# Quixel Megascans shopping list (Fab)

For the owner: **free** Quixel Megascans listings on Fab, picked by looking at their Fab previews (look-only; the
preview screenshots stayed in a temp folder, nothing of Epic's is in the repo). **Licence: Fab Standard License
(Personal / Professional tiers), NOT CC0.** Open question before anything ships publicly: the web build serves the
texture files to every visitor (downloadable); check the Fab terms for that case. Until then CC0 stays the default
for the public site; Megascans only appear in the lab with a "licence check before public" badge.

## How to add one

1. Fab: *Add to My Library* (free), then *Download* the **texture set** (zip; 2K is enough, 4K only for close-up heroes).
2. Unzip into `data/raw/megascans/<folder>/` (git-ignored), with the folder name given below (or put a `material.txt`
   holding the library material name in the folder).
3. `python -E -P tools/textures/candidates.py megascans`, then `cd tools/textures && node encode_ktx2.mjs --cand`.
4. Reload the Material Lab: the material gets an **M** badge and a new column ("Megascans: licence check before public").

Scan area / texel density from each listing's description (checked 2026-11-12). **must** = needed for the comparison
now; **nice** = alternative / later. M? badges in the lab = listed here, not downloaded yet.

## Materials of the library

| Material | Fab asset | Folder name | Scan area | Why | Priority |
|---|---|---|---|---|---|
| `brick_red_brussels` | [Red Brick Facade](https://www.fab.com/listings/e7b91cca-bd0c-4fc4-98cb-b0e4281b9687) | `brick_red_brussels__red_brick_facade_e7b91cca` | 2x2 m, 4096 px/m | mixed red-brown bricks with darker headers: the closest to Uccle's 1900s terraces | must |
| `brick_red_brussels` | [Red Brick Wall](https://www.fab.com/listings/7d5b8684-bd22-44a6-892d-b2c2d872a248) | `brick_red_brussels__red_brick_wall_7d5b8684` | 2x2 m, 4096 px/m | even red-orange running bond, pale mortar; clean reference | must |
| `brick_red_brussels` | [Red Brick Facade](https://www.fab.com/listings/b26f585b-bfff-4a76-acec-fbc1b9e3f0d5) | `brick_red_brussels__red_brick_facade_b26f585b` | 2x2 m, 4096 px/m | darker, soiled red-brown: older facades | nice |
| `brick_red_brussels` | [Red Brick Wall](https://www.fab.com/listings/cf487eca-f17a-4538-a3f9-b5bc16e5219f) | `brick_red_brussels__red_brick_wall_cf487eca` | 2x2 m, 4096 px/m | varied red / pink bricks, lighter | nice |
| `brick_yellow` | [Yellow Brick Wall](https://www.fab.com/listings/dc21cb59-5b7d-4cca-b3f5-486d127682de) | `brick_yellow__yellow_brick_wall_dc21cb59` | 1x1 m, 8192 px/m | pale yellow-buff bricks, the Flemish yellow brick (no CC0 scan matches it) | must |
| `brick_yellow` | [Building Wall Brick Yellow](https://www.fab.com/listings/ed3fa86b-712b-480a-9e03-f2973fb54ff4) | `brick_yellow__building_wall_brick_yellow_ed3fa86b` | 2x2 m, 4096 px/m | greyish-yellow mixed bricks: weathered yellow facades | must |
| `brick_yellow` | [Brick Wall](https://www.fab.com/listings/435e5222-e8a3-4da8-9de0-3137f272e448) | `brick_yellow__brick_wall_435e5222` | 4096 px/m | light cream bricks, fine joints | nice |
| `brick_dark` | [Dark Brick Wall](https://www.fab.com/listings/07e361af-ee6d-45fd-9d33-1dc70cabf152) | `brick_dark__dark_brick_wall_07e361af` | 2x2 m, 4096 px/m | dark brown-purple clinker, pale joints: the Brussels dark brick | must |
| `brick_dark` | [Dark Brick Wall](https://www.fab.com/listings/6c322b51-b1ea-4ab9-b8d3-06467ac85e62) | `brick_dark__dark_brick_wall_6c322b51` | 2x2 m, 4096 px/m | near-black glazed clinker | must |
| `brick_dark` | [Dark Brick Facade](https://www.fab.com/listings/0c35a43d-0283-4632-a168-88d41eaf3bd6) | `brick_dark__dark_brick_facade_0c35a43d` | 2x2 m, 4096 px/m | dark brown, slightly mottled | nice |
| `mortar` | [Brick Mortar](https://www.fab.com/listings/3e3e9381-54e2-4f14-bf18-35d491136cea) | `mortar__brick_mortar_3e3e9381` | 0.25x0.25 m, 16384 px/m | close-up lime mortar grain (joints as their own slot) | nice |
| `stone_white` | [Roman Limestone Wall](https://www.fab.com/listings/d8e4cf18-01f7-4e5c-bc6a-be51f317905c) | `stone_white__roman_limestone_wall_d8e4cf18` | 4096 px/m | pale limestone ashlar with tool marks: bands, dressings, the town hall's stone | must |
| `stone_blue` | [Granite Paving Slabs](https://www.fab.com/listings/d60b7f69-775b-4f96-bef1-911a895d7bd3) | `stone_blue__granite_paving_slabs_d60b7f69` | 2x2 m, 4096 px/m | blue-grey slabs: closest to Belgian petit granit (no 'bluestone' listing): kerbs, plinths, sills | must |
| `stone_blue` | [Rough Granite Tiles](https://www.fab.com/listings/ec8fad77-de80-4025-aad0-bda45d1cfbff) | `stone_blue__rough_granite_tiles_ec8fad77` | 2x2 m, 4096 px/m | dark rough blocks: bush-hammered plinths | nice |
| `render_white` | [Stucco Facade](https://www.fab.com/listings/a78c4b5c-d316-49e1-85d7-172695270472) | `render_white__stucco_facade_a78c4b5c` | 2x2 m, 4096 px/m | clean white facade render, fine grain | must |
| `render_white` | [Plaster Facade](https://www.fab.com/listings/ab53a9c0-01c2-4464-a7c8-c9016881a02a) | `render_white__plaster_facade_ab53a9c0` | 2x1 m, 4096 px/m | light grey-white facade plaster | nice |
| `render_painted` | [Plaster Wall](https://www.fab.com/listings/c8abaad6-05d4-4351-b537-7318df677968) | `render_painted__plaster_wall_c8abaad6` | 2x2 m, 4096 px/m | neutral pale plaster: takes the per-building colour (tint) | must |
| `render_painted` | [Worn Painted Plaster Wall](https://www.fab.com/listings/f4517fee-1586-43e4-ac83-cb0a7e8ed054) | `render_painted__worn_painted_plaster_wall_f4517fee` | 1x1 m, 8192 px/m | peeling paint over plaster: worn facades | nice |
| `slate` | [Slate Roof](https://www.fab.com/listings/8f0ee5ce-6d6c-4b41-8bcd-73d31a4a32f7) | `slate__slate_roof_8f0ee5ce` | 2x2 m, 4096 px/m | blue-grey regular slates: the Belgian / Ardennes slate look | must |
| `slate` | [Slate Roof](https://www.fab.com/listings/80f621a1-5f42-40e0-9f66-59e48e3aed92) | `slate__slate_roof_80f621a1` | 2x2 m, 4096 px/m | dark blue, long slates | nice |
| `roof_tiles_red` | [Red Roof Tiles](https://www.fab.com/listings/9303c8fc-27ac-4681-ba19-8538254c09ec) | `roof_tiles_red__red_roof_tiles_9303c8fc` | 4x2 m, 4096 px/m | red-brown pantile-like tiles, aged | must |
| `roof_tiles_red` | [Roof Tiles](https://www.fab.com/listings/00bb3bd0-a789-4e51-a034-20f3a494e7be) | `roof_tiles_red__roof_tiles_00bb3bd0` | 1x1 m, 8192 px/m | brown S tiles | nice |
| `roof_tiles_flat_dark` | [Roof Tiles](https://www.fab.com/listings/96b8ae5a-3ab7-4055-80c9-fc358f428996) | `roof_tiles_flat_dark__roof_tiles_96b8ae5a` | 1x1 m, 8192 px/m | black flat tiles | must |
| `roof_tiles_flat_dark` | [Roof Tiles](https://www.fab.com/listings/72d4f34a-9623-4791-bafd-2acea8d0d645) | `roof_tiles_flat_dark__roof_tiles_72d4f34a` | 1x1 m, 8192 px/m | dark interlocking tiles | nice |
| `zinc_roof` | [Zinc Oxide](https://www.fab.com/listings/4e4c84b7-f8bf-482d-828e-c44ea35bcf41) | `zinc_roof__zinc_oxide_4e4c84b7` | 0.5x0.5 m, 8192 px/m | pre-weathered zinc surface (the seams stay procedural) | must |
| `lead_roof` | [Metal Sheet](https://www.fab.com/listings/b76003d4-eb35-43fc-8d3d-ffa43d2dce7a) | `lead_roof__metal_sheet_b76003d4` | 2x2 m, 4096 px/m | dark matte sheet (no 'lead' listing; tint to lead grey) | nice |
| `copper_patina` | [Oxidized Copper Sheet](https://www.fab.com/listings/64bc6f0d-cdd7-4579-aef2-a4b4a6f08146) | `copper_patina__oxidized_copper_sheet_64bc6f0d` | 1x1 m, 8192 px/m | turquoise verdigris over copper: domes, cupolas | must |
| `painted_metal_white` | [Scratched Painted Metal Sheet](https://www.fab.com/listings/0afb84e6-4ac4-4580-a617-23804b98b3aa) | `painted_metal_white__scratched_painted_metal_sheet_0afb84e6` | 2x1 m, 4096 px/m | white paint, fine scratches: observatory domes, railings | must |
| `cast_iron_green` | [Painted Metal Sheet](https://www.fab.com/listings/0d9c3130-a796-4e2f-a444-706f69420663) | `cast_iron_green__painted_metal_sheet_0d9c3130` | 2x2 m, 4096 px/m | green paint over metal (tint to the Uccle bollard green) | nice |
| `wood_frame_white` | [Painted Wooden Planks](https://www.fab.com/listings/f2da81a8-1b76-41b2-88d0-966c350204d2) | `wood_frame_white__painted_wooden_planks_f2da81a8` | 2x2 m, 4096 px/m | white paint over grain (plank joints: doors / panels; frames stay procedural) | nice |
| `wood_frame_dark` | [Wooden Planks](https://www.fab.com/listings/f5e6aefd-6be5-4941-9fe0-720f0265897e) | `wood_frame_dark__wooden_planks_f5e6aefd` | 2x2 m, 4096 px/m | dark stained hardwood | nice |
| `cobbles` | [Cobblestone](https://www.fab.com/listings/9cd1d969-e039-4f26-81bb-6314980d5476) | `cobbles__cobblestone_9cd1d969` | 1x1 m, 8192 px/m | grey square setts in rows: Place de Saint-Job | must |
| `cobbles` | [Cobblestone](https://www.fab.com/listings/c156689a-7686-4a90-9433-a18267a136bd) | `cobbles__cobblestone_c156689a` | 2x2 m, 4096 px/m | pale setts, sandy joints | nice |
| `paving_concrete` | [Grey Concrete Tiles](https://www.fab.com/listings/8f5d9f11-8552-487f-be01-f94881695136) | `paving_concrete__grey_concrete_tiles_8f5d9f11` | 2x2 m, 8192 px/m | grey square sidewalk tiles: the Brussels 30 x 30 | must |
| `paving_concrete` | [Grey Concrete Tiles](https://www.fab.com/listings/8b618f18-ca0b-430e-81b9-5b0f12b54539) | `paving_concrete__grey_concrete_tiles_8b618f18` | 2x2 m, 8192 px/m | variant, lighter | nice |
| `asphalt` | [Asphalt Road](https://www.fab.com/listings/fc52e5d3-8c95-4e0e-af45-0763cbd3ffd9) | `asphalt__asphalt_road_fc52e5d3` | 2x2 m, 4096 px/m | worn grey road asphalt with aggregate (+ procedural patches / cracks / wet layers) | must |
| `asphalt` | [Asphalt Road](https://www.fab.com/listings/673d4ee4-db90-47a6-8520-38bcb8a43b24) | `asphalt__asphalt_road_673d4ee4` | 2x2 m, 4096 px/m | darker, smoother | nice |
| `concrete_white` | [Concrete Wall](https://www.fab.com/listings/5fc74d73-8736-4cb6-9715-9337a171afac) | `concrete_white__concrete_wall_5fc74d73` | 1x1 m, 8192 px/m | light cast concrete with pores: Van Buuren's white concrete | must |
| `rockwork_concrete` | [Rock Cliff](https://www.fab.com/listings/6ae483ea-1395-452a-8cbe-a75591a24583) | `rockwork_concrete__rock_cliff_6ae483ea` | 1x1 m, 4096 px/m | cream rock: the Sauvagere rocaille's colour | must |
| `rockwork_concrete` | [Rock Cliff](https://www.fab.com/listings/b027a87b-e230-4a69-a44e-5ecd50e7e4e2) | `rockwork_concrete__rock_cliff_b027a87b` | 1x1 m, 4096 px/m | pale yellow rock | nice |

Not found on Fab (keep CC0 / procedural): a true Belgian **blue stone** (petit granit) surface (Granite Paving
Slabs is the stand-in), **lead** roofing, white-painted **window joinery** (scans are planks; frames stay procedural),
**glass** (procedural by design).

## Soon: decals, surfaces for the other labs, 3D assets

| For | Fab asset | Why | Priority |
|---|---|---|---|
| decal: leaks | [Tileable Leakage](https://www.fab.com/listings/85ea60fc-f408-4cdc-bb35-422a0a00af0b) | rain run-off under sills / cornices (tileable strip) | must |
| decal: leaks | [Leakage](https://www.fab.com/listings/043c0398-d268-4c4b-ad9b-6eb8f3bb20a7) | vertical streak decal | nice |
| decal: moss | [Tileable Moss Patches](https://www.fab.com/listings/a9a94514-dfba-43cb-92bc-c550d79b8d5d) | moss on wall bases, kerbs, north faces | must |
| decal: moss | [Moss](https://www.fab.com/listings/5a5c5cbf-4ffa-4ac7-81a4-1bf632e6a20d) | single moss patch | nice |
| decal: cracks | [Wall Crack](https://www.fab.com/listings/47553167-f060-4903-bd60-7ec56d5eae0d) | render / plaster cracks | must |
| decal: cracks | [Asphalt Crack](https://www.fab.com/listings/faf4ac0f-c456-44e1-9d72-895c67d3a860) | road cracks | must |
| decal: cracks | [Concrete Crack](https://www.fab.com/listings/d901dc57-8461-40a1-906c-e987c494b4ce) | sidewalk cracks | nice |
| decal: chewing gum | [Chewing Gums](https://www.fab.com/listings/b36e5e80-9716-49c8-8b1f-e5eea33d419b) | the only gum decal: Brussels sidewalks | must |
| decal: manhole | [Round Manhole Cover](https://www.fab.com/listings/7a5c88a6-4d44-478c-ba36-66f3a499d7be) | roads (round cast iron) | must |
| decal: manhole | [Square Manhole Cover](https://www.fab.com/listings/cd688e21-517b-4464-90e9-fd728b357493) | sidewalks (square) | nice |
| decal: road patch | [Asphalt Patch](https://www.fab.com/listings/42d9eb30-d8d2-48d2-bf91-e941d3425925) | repair patches on roads (next to the procedural ones) | must |
| decal: worn markings | [Worn Painted Road Marking](https://www.fab.com/listings/17104c3c-8fcf-4334-a0d8-18fbdb76699b) | worn white markings (roadPaint keeps the geometry) | must |
| decal: worn markings | [Damaged Road Marking](https://www.fab.com/listings/e9ac244c-2263-4e27-9fbe-a82f434d4d4f) | damaged lines | nice |
| decal: leaves | [Fallen Leaves](https://www.fab.com/listings/b5f169f0-1b20-49aa-b363-df9c0f5d35dd) | autumn litter on sidewalks / lawns (seasons) | must |
| decal: leaves | [Dead Leaves](https://www.fab.com/listings/f10107b7-754b-4602-afcf-faaae3e174c8) | variant | nice |
| surface: lawn | [Grass Cut](https://www.fab.com/listings/25b144b3-c2a4-4720-bfc0-1f062dc71eb1) | mown lawn (foliage lab ground) | must |
| surface: lawn | [Lawn Grass](https://www.fab.com/listings/f50d1f4a-d91a-41c2-86ad-10c4ffe7f658) | park lawn, a few dry spots | nice |
| surface: gravel | [Ground Gravel](https://www.fab.com/listings/5b295907-cbfa-4c47-8a2b-83f2fd828f17) | pale dolomite park paths (gravel_path) | must |
| surface: gravel | [Gravel on Soil](https://www.fab.com/listings/d1f24f95-7093-4bb0-8aea-afeb7eec805d) | path edges | nice |
| surface: bark | [Oak Bark](https://www.fab.com/listings/68025ac3-ac2f-4166-b045-2e9e18a64038) | Uccle's oaks (tree textures) | must |
| surface: bark | [Birch Bark](https://www.fab.com/listings/0c11136e-9556-476d-8bc4-8f09d0ae4c78) | birches in gardens | nice |
| surface: wet asphalt | [Wet Destroyed Asphalt](https://www.fab.com/listings/e81bb9cf-35c4-4459-8ff9-e1ed1a07226a) | reference for the weather lab's wet roads | nice |
| surface: snow | [Fresh Snow](https://www.fab.com/listings/6b239c80-a0e3-48a4-a9bd-fdbb47ad539e) | snow cover (weather lab) | nice |
| surface: snow | [Trampled Snow](https://www.fab.com/listings/9fc0937c-dead-4ff8-8879-43c02affa3cf) | sidewalk snow | nice |
| surface: mud | [Soil Mud](https://www.fab.com/listings/594f71d6-43c3-4b09-ba18-325a92f323ff) | flower beds, park mud | nice |
| 3D: rocks | [Sandstone Rock](https://www.fab.com/listings/181fafb5-46e5-41bf-af3b-d4a5ad768682) | Sauvagere rockwork pieces (tint cream) | nice |
| 3D: rocks | [Rock Sandstone](https://www.fab.com/listings/66f241e5-43fa-47c0-a475-07b2d1391f7e) | Sauvagere rockwork pieces | nice |
| 3D: props | [Granite Bollard](https://www.fab.com/listings/f39f439f-d702-47e0-b38a-628e7a85d3b3) | stone bollards on squares | nice |
| 3D: props | [Urban Trash Dustbin Capped Metal Old](https://www.fab.com/listings/df84da7a-12c9-4138-b58b-e0cfdb07f37a) | street bins (reference only; Brussels bins are our own model) | nice |

Also wanted: **Beech Bark** (Forest of Soignes beeches): search 'beech bark' on Fab (one Quixel result, not checked).

Decals need their own path (alpha + projection / mesh decals on the facade kit and the ground): not wired in the lab
yet; the surfaces (lawn, gravel, bark, snow, mud) can go through the same candidates tool once their library
materials exist (lawn_edge, gravel_path; bark / snow / mud belong to the foliage and weather branches).
