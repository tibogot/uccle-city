---
status: provisional
added: 2026-11-26
check: `xmastest` (tools/christmas/xmasTest.mjs "LED glow" rows: the slots that take it, x env.uNight, the switch)
---
**Rule.** An emissive-only light source (no light added: the fixed light count) still shows what it lights: the
Christmas fir's foliage (every level: the needle cards, the middle shell, the far fronds), the baubles and the garlands'
greenery take an emissive term = their own albedo x the LEDs' warm white (2700 K) x a gain (`xmas.look.glow` 0.35,
`.glint` 0.6) x the night (env.uNight: 0 by day). Proportional to the albedo, so every LOD switch keeps its match.
`?firglow=0`: the shader of before.

**Why.** The game review (2026-11-26, Place Saint-Job and Parvis Saint-Pierre at night) saw each fir at night as LED
dots floating in a black void: the crown, the baubles and the planter vanished, the tree read fake. The 654 bulbs only
lit themselves; the light they throw on the needles round them (what makes a real lit fir read as a tree) was missing.
