---
status: provisional
added: 2026-11-25
check: `meta` (tools/audit/metaGate.mjs section 6 = tools/audit/undefRefs.mjs: no viewer/ debug/ tools/ module calls a name it never declares, imports or has as a global); `tramsnap` (tools/tramfit/tramSnap.mjs: runs the city's own snap, viewer/tramSched.js createTrackSnap, a self-test on a made-up line first: both paths finish, every snapped point < 0.2 m from its track, pts / cum / tan swapped in together)
---
**Rule.** A refactor that renames or moves a helper leaves no caller of the old name: every call is changed in the same
commit (grep the old name across viewer/ debug/ tools/), and the meta row's static scan finds no bare call to a name its
module never declares, imports or has as a global. A gate row checks the city's own code, imported from viewer/, never a
copy of it pasted into the audit: a copy keeps passing while the original breaks.

**Why.** claude/missions (028dc7ce, 2026-11-24) moved tramline.js's `finish()` (a shape's arc length and tangents) into
viewer/tramSched.js as `finishShape`, imported it, and missed one call: `finish(t)` in the tram-line snap. The module
parsed and its imports linked (meta row 3: esbuild takes an unknown bare name for a global), and the `tramsnap` row ran
its own copy of the snap loop, so the gate passed while the city threw `tram snap: ReferenceError: finish is not defined`
on every tile with tram tracks for a day: the trams ran on the raw GTFS shape, ~0.6-1.5 m off the drawn rails, without
the [1 2 1]/4 smoothing. claude/tramfix: the snap moved into tramSched.js (createTrackSnap, no three.js), tramline.js
and the audit both run it, and tools/audit/undefRefs.mjs (a cheap text scan, no parser dependency) flags the old
`finish(t)` and passes the 962 modules of the tree today.
