# Plan: Blender-made assets (later)

Goal: AAA look at street level **and** 60 fps in the browser (WebGPU).

## What costs performance

| Cost | Budget (mid-range GPU, WebGPU) | What blows it |
|---|---|---|
| Draw calls | under ~1,000 per frame | one unique mesh per house (20k houses = 20k calls) |
| Triangles on screen | 2–5 M | mostly fine; unique high-poly everywhere is not |
| GPU memory | 1–2 GB | unique textures per building |
| Download | a few MB per 500 m tile | baking every house to its own .glb |
| Overdraw / shading | | alpha leaves, heavy shaders on far objects |

## Approach

1. **Modular kit made in Blender** (`bpy` scripts generate the pieces and their LODs):
   window frames with real depth (several Uccle types), doors, cornices, balconies, dormers,
   chimneys, shopfronts, gutters, street lamps, benches, bus/tram stops, signals.
   30–60 pieces, one shared trim-sheet texture set.
2. **Placement stays procedural** in the viewer, from the real data (UrbIS walls, storeys, party
   walls, street faces, OSM points), drawn with `InstancedMesh` / `BatchedMesh`: one draw
   call per piece type, however many houses. This is what `viewer/facades.js` already lays
   out in its shader (bays, storeys, doors), so the kit replaces the shader windows near the camera.
3. **Hero landmarks hand-modelled**: Saint-Job church etc., 100–300k triangles each from
   photos, replacing the UrbIS solid (matched by `attrs._landmark.osm`).
4. **Levels of detail**: kit geometry under ~150 m, shader façades (current) to ~600 m,
   plain blocks + orthophoto beyond. LODs from `gltf-transform simplify` or Blender decimate.
5. **Formats**: glTF `.glb` with meshopt (or Draco) compression, KTX2 (Basis) textures,
   loaded once and shared by every tile.

## Suggested layout

```
assets/blender/kit.blend        # source
assets/blender/build_kit.py     # bpy script: generates pieces + LODs, exports
viewer/assets/kit.glb           # export (pieces named win_A_lod0, ...)
viewer/kit.js                   # loads kit.glb, places instances from analyseBuildings()
```
Run headless: `blender -b assets/blender/kit.blend -P assets/blender/build_kit.py`.
