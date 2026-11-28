---
status: provisional
added: 2026-11-26
check: `bikepark` (tools/bike/parkTest.mjs: "lab ground" - every feature on whole metres, none overlapping; "lab: the debug overlays" - off by default, depth tested) + `bikefall` (tools/bike/forgivingTest.mjs: the surfaces are slower in mud / snow, the casual rider rides grass / mud / snow / the descents with no soft crash; the coasting terminal speed = the physics within 10 %)
---
**Rule.** The bike lab looks like the city and never shows its plumbing: the test ground is drawn with the city's lighting / sky / post, library materials, grass and trees, as ONE grouped geometry whose triangles never overlap (every feature rectangle on whole metres, the 1 m base grid cut out exactly under it: no coplanar faces, no z-fighting); debug overlays (the edge layer's grind lines) are off by default, behind a panel toggle, and depth tested; every drawn surface has a physics row in SURFACES (grip, rolling, sink) that matches its look (mud and snow slow and slippery), and downhill speed is physical (gravity along the slope against rolling + air drag, no cap).

**Why.** owner 2026-11-26 in the BMX lab: z-fighting between the ground and the ramps / decks (feature rectangles with fractional edges: the base grid's cell under the edge overlapped the feature's own mesh, both at height 0), "the coloured lines through the kid at the rail" (the edge layer drawn on top of everything, on by default), "even a lab should look good", "can't he stand up to push more?", "on a steep descent we are supposed to go way faster" (claude/kid)
