---
status: provisional
added: 2026-11-24
check: `flags` (tools/audit/flagsCheck.mjs); the visual tour / a quick look at the place with `?flags` on
---
**Rule.** Every flag the city shows is a cloth flag (viewer/flagsCity.js `flyFlags`: the baked loops far, the live
Verlet cloth near). A scripted model never ships a flag the city draws: a model that carries one (a material slot named
like a flag) lists that slot in its notes json `rigid_flag_slots`, which its loader leaves out of every level, and lists
its poles in `flag_poles` (`base_city_xyz`, `tip_city_xyz`, `design`, `hoist_m`, `fly_m`) written by its Blender script
from the pole it modelled; the city flies a cloth flag on each (`flyHeroFlags`), shown while the model is. Every notes
json with `flag_poles` is flown by a known loader, and `?quick=1` keeps `?flags` on when that hero is in the radius.
The gate decodes the model's GLB and checks each modelled flag hangs on a listed pole (so the data stays the model's).

**Why.** The owner saw the police station's three yard flags stand rigid (2026-11-24). Three causes stacked: the police
model (tools/blender/police_rouge.py `flags()`) baked two-sided still sheets into its GLB (slot `flag_fabric`) because
it was built before the flags kit existed; the flags kit only knew the town hall's and the Lycée Français's poles, so
nothing flew a cloth flag there; and quick mode set `flags=0` everywhere but those two sites. Nothing listed which
models carried their own flag, or checked that a pole with a flag was a cloth one.
