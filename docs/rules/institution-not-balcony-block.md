---
status: provisional
added: 2026-11-26
check: `montjoie` (tools/audit/montjoieCheck.mjs: A the Montjoie look, yards and front strip; B every curated set wired to its switch; `--census` the class)
---
**Rule.** A named institution (school, convent, hospital, college) is checked on Street View and curated as what it is:
its UrbIS solid gets a look (data/overrides.json buildingLooks: the real wall `style`, a `type` that draws no balcony
when the building has none, its roof colour, a `_name` saying what Street View shows, a `set` with its `?<set>=old`
switch); its playgrounds are hard grounds (grounds, on the same switch), and a front built straight on the sidewalk
gets a plantsClear strip so the front-garden kit draws no wall or piers along it. Every curated `set` must be wired to
its switch (tileData.js lookSet for looks, main.js for plantsClear): a set nobody filters is a fix the A/B cannot show.

**Why.** Owner 2026-11-26: "around Montjoie, the Montjoie school buildings are not at all like this in real life".
Institut Montjoie (Avenue Montjoie, OSM way 30996013, UrbIS solid 506834) is a late-19th-century neo-Gothic school: a
~62 m red-brick front on the sidewalk, ground + 3 storeys of tall paired windows between full-height pilaster strips,
corbel friezes, a grey stone plinth, crow-step gable dormers on steep red clay-tile roofs. The classifier only sees form
(a big, tall footprint: "block") and drew it as a post-war apartment block in white render with continuous balcony
slabs, a front-garden wall and two lawns where the asphalt playgrounds are. The class is wide: `--census` counts 194
buildings drawn as the balcony block under a steep pitched roof (>= 70 % of the roof at >= 35 deg), a shape post-war
balcony blocks almost never have; a later generator job (steep pitched roof => no TYPE.BLOCK) starts from that list.
