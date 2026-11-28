---
status: provisional
added: 2026-11-24
check: `tourbundle` text check (tools/audit/tourBundleCheck.mjs: debug/tour.js measures its rAF rate before each view and stops with "page throttled" under 30 fps)
---
**Rule.** A browser check that renders the city (a tour, a quick view, a perf A/B) runs in a page that is in FRONT: `select_page` with `bringToFront: true` first, and rAF at about 60 fps before any wait or measurement. `debug/tour.js` checks its own rAF rate before each view and stops the tour with "page throttled" (the real cause) when it stays under 30 fps for 20 s. When the owner is away, a keep-display-on helper (SetThreadExecutionState) runs so the screen does not turn off.

**Why.** On 2026-11-24 the DevTools Chrome restarted (its cache was cleared) and its window came back behind the editor. Chrome throttled it to about 1 fps while the page still read `visibilityState "visible"` and focus true. The GPU idled at 270 MHz, frames read 56 ms, and every tour view failed "not ready: limit": a defects tour, then a two-view foundation check. About an hour went into chasing a code fault that did not exist. `select_page` with `bringToFront` gave 60 fps at once.
