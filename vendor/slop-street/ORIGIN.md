# vendor/slop-street: what comes from Mr.doob's slop-newyork

Source: https://github.com/mrdoob/slop-newyork at `536a907c605964421563f12f15c5e00d735fc94f` (2026-11-06), MIT licence,
"Copyright (c) 2026 Mr.doob" (`LICENSE` here, copied unchanged). Cloned as data into a scratch folder and read; never run.

| file here | from | what was changed |
|---|---|---|
| `shopInterior.js` | `js/tsl-materials.js` `createStorefront()` interior block (lines 567-625), `hash2D` (84-86), `filteredPulse` (148-156), `boxCoverage` (158-162) | his storefront is part of the façade shader on a 7.5 m bay grid; ours is the material of one window quad per real OSM shop: local metres from the quad's uv x size, room width = the shop's width, the glass normal = the quad's world normal, his city uniforms (sky horizon, interior glow) replaced by parameters. The room / shelves / goods / counter / lamps / fresnel logic is his. |

Ideas taken without code (written fresh in `viewer/streetlife/`):
- the storefront sign atlas technique (`js/tsl-materials.js:511-565`): text drawn by the canvas into one texture, rows
  per label, sampled with a footprint-driven fade (`signLod` -> `smoothstep(4, 6, signLod)`) so letters fade before they
  turn sub-pixel. Ours stores a signed distance (crisp when magnified), one row per label from REAL names (his are 8
  fixed fake names), mipmapped, and fades by distance (65-85 m) as well as by footprint.
- instanced awnings and lit fascia signs (`js/buildings.js:598-647`): ours are instances of one textured box, in ONE
  draw with all the other signs, plates and numbers (his are one InstancedMesh per sign theme).
- the "where am I" street-sign HUD (`js/main.js:443-482`) is not done yet (TODO).

Do not edit the copied file without logging the reason in a `CHANGES.md` here.
