# Kid game (working title): a 90s summer in Uccle

Owner's direction (2026-11-18): a FULL game, built on the Uccle 3D city. The player is a kid of 10-13 in the 1990s: bikes, friends, the woods, small strange adventures, learning life. A calm "summer afternoons" tone (no guns, no score); small stakes that feel big at 11.

## Pillars
1. **Bike riding must be on point**: the heart of the game. BMX feel: pedalling, coasting, braking and skids, bunny hops, jumps and landings, manuals, pushing the bike up steep streets, falling off (no gore). Uccle is hilly: descents and forest paths must feel great.
2. **Real places, made for kids**: the Kauwberg (nature reserve: bumps, roots, branches, the old SAND QUARRIES, dens), the Wolvendael park, the Geleytsbeek valley, Saint-Job, the Observatory, the DIEWEG CEMETERY (closed since 1958, overgrown, remarkable chapels and tombs: a classic dare / mystery place), old lanes and footpaths (sentiers / voetwegen), the old railway.
3. **A bike park / ramps**: the owner remembers a natural dirt bike park with bumps near the streets toward the Dieweg (not in OSM 2026; may be gone). The game can bring it back as remembered (90s); plus kid-made ramps (planks on bricks) around the neighbourhood and the Kauwberg.
4. **Friends and calls (90s)**: a home landline and walkie-talkies, no smartphones. Friends call: "meet at the Kauwberg at 4". Each friend has a personality, favourite spots and memory of what you did.
5. **The day**: wake up, a summer day, be home before dark (or the parents worry). The time limit makes each afternoon count.
6. **Kid things**: building a hut in the woods, secret paths, dares, swapping cards, sweets at a Saint-Job shop with pocket money, races, a lost dog, rainy days at home.
7. **A strange adventure**: a light mystery through the summer (lights in the Kauwberg at night, an old map, a sound near the Observatory, the old railway line); never horror, "something's going on and grown-ups don't believe us".
8. **Learning life**: small choices with lasting effects (keep a promise or not, tell the truth, help an old neighbour); nothing preachy, friends remember.
9. **Seasons later**: summer first; then autumn (school), winter (the Christmas layer, snow).

## Privacy and realism
Real places, FICTIONAL people: no real family, house or resident is marked or named; homes stay generic. Google imagery is look-only (never stored or traced).

## First milestone: one playable summer afternoon
1. The kid walks and rides a bike: very good feel on streets, hills and forest paths (a bike lab first, own UI, no lil-gui).
2. One friend calls; you meet at the Kauwberg, race down, find one strange thing.
3. Get home before dark: the day ends.
Then: the Kauwberg made for bikes (bumps, roots, sand quarries, ground detail at bike height), the bike park, more friends and days.

## Known data (OSM 2026)
- Kauwberg nature reserve: OSM way 16396691 (landuse forest, leisure nature_reserve); the sand quarries are not tagged (to shape from the DTM + references).
- Kautergat paths (mtb:scale 0), many dirt sentiers / voetwegen in the south.
- Mapped bike park nearby: "Bike Park Interpark" (sport mtb;bmx, Watermael-Boitsfort side); nothing near the Dieweg.

## Reuse from the city
Character: claude/character2 (Y Bot / Mixamo locomotion; owner's branch, not merged without the owner). Two-wheel traffic, the drive controller, colliders (docs/COLLIDER_AUDIT.md), time of day, the Christmas layer.
