---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2g: <= 3 texture lookups in viewer/villa/villaPool.js, models/villa/caustics.ktx2 < 0.5 MB; the night glow's tone range)
---
**Rule.** Pool caustics are a BAKED, tileable, looping light-through-waves pattern (tools/villa/caustics_bake.py: a
periodic wave surface refracting a sun bundle onto a floor, photons splatted; R / G / B at three refractive indices
for the rainbow edges; 12 frames, 256 px, ETC1S: 162 KB), sampled twice in the water's shader (two scales, scroll
directions and frame phases, the MIN kept), projected along the refracted sun onto the floor, treads and walls,
fading with depth, none where the coping shades the entry point; <= 3 lookups, no extra pass. At night the same
web ripples in the LED glow, whose luminance stays inside a checked range (peak <= 0.9, mean >= 0.12, deep end
>= 0.02: the first night pass blew the basin out to white, the second read black-blue).

**Why.** The owner (2026-11-26): "I've seen way better caustics in games". The procedural ones (two value-noise
layers, abs difference) were soft blobs; real caustics are sharp, bright, web-like lines, which games get from a
baked pattern sampled twice with a min.
