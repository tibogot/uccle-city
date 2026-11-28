---
status: provisional
added: 2026-11-26
check: `pedssim` (S1: Saint-Job 08:30 weekday 60-260 alive within 230 m, 03:00 <= 30, Wolvendael busier at 15:00 than 08:30) + the browser check in docs/PEDESTRIANS.md "City" (people in view at Saint-Job)
---
**Rule.** How many people the city shows comes from data, not from a fixed count: the walk graph's length within 230 m of the focus, each edge weighted by its place (shop: an OSM shop / café within 35 m; transit: a stop within 40 m or a platform; park: paths and park areas; square; home) times that place's hour curve (viewer/pedestrians/citySim.js DENSITY, H_*), the weekday and the rain. A person is placed out of view, or in view only past 140 m (dithered in), or on a tile that has just come in (it fades in with its tile). People leave out of view only. The tram 92 clock is the hour (the city's one clock). Changing the curves or the constants means re-checking S1 and the in-view count at Saint-Job.

**Why.** The owner's numbers: ~40-60 visible at Place de Saint-Job on a weekday morning, busier round shops, schools, tram stops and parks, few at night. A fixed pool would fill a residential cul-de-sac like the square. Spawning in view is a pop, and the lab's meters count 0 unfaded spawns in view.
