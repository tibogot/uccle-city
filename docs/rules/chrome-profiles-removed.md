---
status: provisional
added: 2026-11-28
check: `profiles` (tools/audit/profileCheck.mjs P1-P5: removed on exit / a throw / process.exit, a hard-killed maker's swept, the sweep keeps live and young ones and non-profiles, allocSample with a stand-in Chrome leaves none and releases its lock, killed hard the sweep leaves none; every own-Chrome profile from makeProfile, allocBudget's cleanup sweeps)
---
**Rule.** A tool that starts its own Chrome makes its `--user-data-dir` with `tools/gate/chromeProfile.mjs` `makeProfile(tag)` (%TEMP%/uccle-<tag>-*, with a marker naming the maker's pid) and removes it when Chrome is killed (on exit, a throw and Ctrl-C too). Every such tool sweeps at start-up (`sweepProfiles()`): a uccle-* Chrome profile whose maker is dead (any age), or without a marker and older than 2 h, is deleted, unless a running Chrome still holds it (Windows refuses the rename). A parent that hard-kills such a tool (allocBudget's timeout, mergeGate's tree kill) sweeps in its finally.

**Why.** 2026-11-28: allocSample's profile was removed only by its own exit handler, which a tree kill (`taskkill /T /F` by allocBudget or mergeGate on a timeout) skips; 28 left-over profiles (uccle-alloc-*, uccle-ab-*, ~1 GB each) filled ~17 GB of the laptop's disk.
