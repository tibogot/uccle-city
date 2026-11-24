// THE CHRISTMAS DATE SWITCH (docs/CHRISTMAS.md): one function for every part of the layer, three-free, so the facade
// shader (viewer/facades.js, the December windows: xmasWindows.js) can ask it without importing the layer's city code.
// xmasCity.js re-exports it (main.js, tools/christmas/xmasTest.mjs).
/** on from 1 Dec to 6 Jan: ?xmas=1 / ?xmas=0 force it; a simulated ?day= (day of the year) decides when given; else today */
export function xmasActive(params = new URLSearchParams(typeof location !== "undefined" ? location.search : ""), now = new Date()) {
  const q = params.get("xmas");
  if (q === "1") return true;
  if (q === "0") return false;
  if (params.has("day")) { const d = +params.get("day"); return d >= 335 || d <= 6; }
  const m = now.getMonth(), d = now.getDate();
  return (m === 11 && d >= 1) || (m === 0 && d <= 6);
}
