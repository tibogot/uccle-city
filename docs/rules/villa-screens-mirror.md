---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2c': reflect.ktx2 + interior.json reflect (tv / mirror, day / night), the screen and mirror codes drawn, the lookup in villaInterior.js screenAndMirror, no render target / light)
---
**Rule.** A glossy screen or a mirror in an unlit interior cell reflects the ROOM it faces: a Cycles equirectangular
panorama baked at the surface (day: sky + sun; night: the lamps), in the room's slot tints, packed into a small KTX2
array (models/villa/reflect.ktx2) streamed with the interior, and looked up once along the reflected ray (a TV: dark
glass, Fresnel F0 0.04, a faint picture at night only; a mirror: 88 % silvered). No render target, no cube camera,
no light (rule fixed-light-count), no extra draw: the existing metal_black slot by face code.

**Why.** The audit and the owner (2026-11-26): the 2.8 m TV and the bathroom mirror read as black holes. They were the
metal_black slot's near-black "screen" code: an unlit material with no reflection at all. Glass and mirrors are seen
by what they reflect.
