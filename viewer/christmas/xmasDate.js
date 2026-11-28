// THE CHRISTMAS DATE SWITCH (docs/CHRISTMAS.md): one function for every part of the layer, three-free, so the facade
// shader (viewer/facades.js, the December windows: xmasWindows.js) and main.js can ask it without importing the layer's
// city code (main.js imports viewer/christmas/xmasCity.js only when this says on). xmasCity.js re-exports it
// (tools/christmas/xmasTest.mjs).
// (claude/xmasreview) The season follows the commune's calendar: the date in BRUSSELS (Europe/Brussels), not the
// visitor's clock: a visitor in Montreal sees the lights at midnight in Uccle on 1 December, not six hours later, and
// one in Tokyo not on 30 November. Falls back to the local date where Intl has no time zones.
export const XMAS_TZ = "Europe/Brussels";
let fmt = null;
/** { month: 0-11, day: 1-31 } of `now` in Brussels */
export function brusselsDate(now = new Date()) {
  try {
    fmt ??= new Intl.DateTimeFormat("en-GB", { timeZone: XMAS_TZ, month: "numeric", day: "numeric" });
    const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
    const m = +p.month - 1, d = +p.day;
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) return { month: m, day: d };
  } catch { /* (no time-zone data: the local date) */ }
  return { month: now.getMonth(), day: now.getDate() };
}
/** on from 1 Dec to 6 Jan (Brussels date): ?xmas=1 / ?xmas=0 force it; a simulated ?day= (day of the year) decides when
 *  given; else today */
export function xmasActive(params = new URLSearchParams(typeof location !== "undefined" ? location.search : ""), now = new Date()) {
  const q = params.get("xmas");
  if (q === "1") return true;
  if (q === "0") return false;
  if (params.has("day")) { const d = +params.get("day"); return d >= 335 || d <= 6; }
  const { month: m, day: d } = brusselsDate(now);
  return (m === 11 && d >= 1) || (m === 0 && d <= 6);
}
