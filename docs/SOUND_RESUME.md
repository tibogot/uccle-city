# Sound: where to resume

State 2026-11-11 (branch claude/sound, not merged): the Sound Lab is complete for a first owner review.
Read `docs/SOUND.md` first (files, methods, costs, renders, weak points).

To continue:
1. Owner listens to `docs/sound/renders/*.wav` and the lab; collect what sounds wrong (TODO section 6, "Sound, owner review").
2. Re-render after a change: serve the repo, run `python tools/sound/save_server.py 8827 <dir>`, open
   `labs/sound-render.html?run=all&save=8827`, then `python tools/sound/pack_renders.py <dir> docs/sound/renders`
   and `python tools/sound/analyze_renders.py docs/sound/<sheet>.png docs/sound/renders/<files>.wav`.
3. Into the city: see "Next" in `docs/SOUND.md` (camera listener, drive-collider occluders, carFleet / tramline sources).

Gotchas learned:
- Offline renders: never use `param.value` to read automation state (it is the initial value until rendered); use
  `cancelAndHoldAtTime`. And nothing may be disconnected before rendering (it removes the node for the whole render).
- Skip-if-unchanged checks must be NaN-safe (`!(abs(a - b) <= eps)`), or the first write never happens.
- Oscillators with FM are the expensive nodes on the audio thread; keep layers lazy.
- `performance.now()` is 0.1 ms-coarse without cross-origin isolation: averages over seconds, not single frames.
