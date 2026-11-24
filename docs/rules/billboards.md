---
status: provisional
added: 2026-11-24
check: `billboards` (tools/billboards/billboards.mjs)
---
**Rule.** A billboard stands only where the city draws something to hold it, found from the city's own data, never
placed by eye: on a wall, its whole outline (poster + frame) lies on ONE wall face the city draws (viewer/facadeGeom.js
analyseBuildings, the same faces), inside its width, over its foot and >= 0.3 m under its top, on the blind part of that
face (no window, door or garage the painted facade draws there: viewer/interior/facadeWindows.js faceOpenings), above
the roof built in front of it (read from EVERY tile: the buildings of the whole city, not only the board's own tile), clear of the roof kit's chimney stacks that run down a party wall (viewer/roofs/roofPlace.js);
on a roof, every leg, brace and walkway corner on the SAME building's roof, flat under them, inside its outline, clear of
the roof kit's stacks and flat-roof items; free-standing, every foot on open ground (no building, no rail bridge, off each
road's whole cross-section, clear of tree trunks), the legs sunk into the drawn ground. It is SEEN FROM THE STREET it faces: from at
least one eye 15-60 m in front of it (+-60 degrees), on open ground within 25 m of a street, square or footway, 1.7 m
up, the rays to its 4 outer corners pass over every building of the city (a board that can't be seen whole from any
such eye is moved, raised or dropped). Its size is in the real range of
its kind (readable: >= 1.8 m tall) and its poster's aspect is the board's. Posters are INVENTED: no real brand, company
or advertiser word (the gate's word list), no logo or copied ad art. Every board says where it comes from (Street View,
looked at only, in our own words, or PLACED: no board there today). The position in the data file is what the CURRENT
city data derives. Lit boards glow by emissive only (no light added: rule fixed-light-count); the trivision's slats turn
from a time uniform in the vertex shader (static buffers: rule no-dynamic-draw-usage). `?billboards=0`: none.

**Why.** Billboards on gables and roofs (owner 2026-11-24). A board hung by eye on a facade the city generates lands on
its painted windows, hangs off a gable whose top is lower than it looks, floats in front of a wall face that steps back,
or stands in the air over a neighbour's roof; the first round's search found that most Brussels party walls carry the
roof kit's chimney stack straight down them, through where a board would hang (5 of 7 first placements: the stacks were
not in the face data at all). A brand name typed into a poster is a real company's ad.
Round 2 (coordinator review 2026-11-24): waterloo_panel passed the row while a dark roof mass hid the lower half of
the board, and the street-level tour view from Ch. de Waterloo showed no board at all. The "nothing built in front"
check read only the buildings of the board's OWN tile and only 0.4-1.4 m out of the wall: the board stood 6 m from the
J4 / J5 edge and the J4 building 8.6 m in front of it, its roof 3 m over the board's foot, was never read; and no check
asked whether the board can be seen from the street at all. Now the front probe and every occlusion test read every
tile (tools/billboards/walls.mjs cityRoofOf) and the street-view check casts the rays; with it the Brugmann gable canvas
(its lower part hidden from every street eye) and waterloo_panel (no height on that gable clears the building in front)
were dropped and the Langeveld trivision raised to 11.5 m.
