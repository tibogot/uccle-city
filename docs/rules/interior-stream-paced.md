---
status: provisional
added: 2026-11-22
check: browser row `villa` (0 frames over 33 ms in 3 stream-in runs, ?dynres=0, on a GREEN preflight) + `villa` (the budgets)
---
**Rule.** An interior cell that streams in builds its pipelines ONE material at a time, a few frames apart, while it is
hidden (never all at once), shows its meshes one per frame behind glass that starts opaque, and animates only the
glass's opacity (its transparency state is fixed: no pipeline switch); no light, no shadow caster, no envmap is made
for it. Its stream-in is measured with the dynamic resolution fixed (?dynres=0), so the city's own scale adaptation and
the machine's load are not taken for the cell's cost.

**Why.** The villa's round-2 stream-in compiled its 16 materials in one compile call: 16 async pipelines and their
shader modules in a burst stalled the GPU process (50 ms frames with no main-thread long task, reproduced with the
dynamic resolution fixed); with the dynamic resolution on, the run also mixed in its scale changes on a GPU that the
preflight showed 100 % busy before the test.
