// FRESH TAB PER PAGE LOAD (rule docs/rules/perf-fresh-tab.md, claude/perf5): how many page loads this TAB has had,
// counted in sessionStorage (it survives a reload in the same tab; a new tab starts empty). Each perf harness calls
// tabLoad() when it is imported and puts the answer in its report: a timing taken on a reused tab (loads > 1) is
// flagged, because ~20 reloads in one tab filled the GPU's memory (5.66 of 6.14 GB) and the next police drive hit
// 0.6-6.9 s stalls (docs/perf/QUIET_2026-11-26.md). Open a new tab, close the old one, then load the page.
export function tabLoad() {
  if (window.__tabLoads) return window.__tabLoads;
  let n = 1;
  try { n = (+sessionStorage.getItem("perf.tabLoads") || 0) + 1; sessionStorage.setItem("perf.tabLoads", String(n)); } catch { /* no storage: unknown, 1 */ }
  window.__tabLoads = n;
  if (n > 1) console.warn(`[perf] this tab has had ${n} page loads: timings are not comparable (rule perf-fresh-tab: open a new tab, close this one)`);
  return n;
}
/** the fields every perf report carries */
export const tabInfo = () => { const n = tabLoad(); return { tabLoads: n, freshTab: n === 1 }; };
