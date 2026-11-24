// CHRISTMAS BOOT REQUESTS (docs/CHRISTMAS.md "Boot with the layer on", plan job 3): a FUNCTION for chrome-devtools
// evaluate_script({ function }) after a navigation with debug/bootTimeline.js as the init script (it raises the resource
// timing buffer). Waits for the cover (and for window.xmas when the layer is on, up to 60 s after it), then lists from
// resource timing (NO timing claims: request counts, bytes, and the ORDER of the Christmas fetches against the boot's
// milestones; bytes are decoded body sizes, so a 304 revalidation still counts its file):
//   requests / MB started before the cover lifted, all, the Christmas files (models/christmas/, data/shops/terraces.json
//   when the layer fetched it), each with its start and end in ms from navigation and whether it ended before the cover.
// Run it with ?xmas=1 and ?xmas=0 (same spawn, same server): the difference before the cover is what the layer adds to
// the boot. Fetch priority is not in resource timing: the offline gate row `xmas` checks it in the code.
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 360 && !(window.__boot && __boot.cover); i++) await sleep(500);
  const cover = window.__boot?.cover ?? null;
  const on = new URLSearchParams(location.search).get("xmas");
  for (let i = 0; i < 120 && on !== "0" && !window.xmas; i++) await sleep(500);
  await sleep(1500);
  const res = performance.getEntriesByType("resource");
  const MB = (l) => +(l.reduce((s, e) => s + (e.decodedBodySize || e.encodedBodySize || 0), 0) / 1048576).toFixed(2);
  const pre = res.filter((e) => cover != null && e.startTime < cover);
  const isX = (e) => /\/models\/christmas\//.test(e.name);
  const xm = res.filter(isX);
  const tile0 = res.filter((e) => /\/data\/tiles?\//.test(e.name) || /tile/i.test(e.name.split("/").pop())).sort((a, b) => a.startTime - b.startTime)[0];
  return {
    url: location.pathname + location.search, cover, firstTile: window.__boot?.report?.().milestones?.firstTile ?? null,
    xmasReady: !!window.xmas, xmasLoadMs: window.xmas ? Math.round(window.xmas.tLoad) : null,
    all: { n: res.length, MB: MB(res) }, beforeCover: { n: pre.length, MB: MB(pre) },
    christmas: { n: xm.length, MB: MB(xm), beforeCover: xm.filter((e) => e.startTime < cover).length },
    firstTileRequest: tile0 ? { file: tile0.name.split("/").slice(-2).join("/"), start: Math.round(tile0.startTime) } : null,
    files: xm.map((e) => ({ file: e.name.split("/").pop().split("?")[0], start: Math.round(e.startTime), end: Math.round(e.responseEnd), MB: +((e.decodedBodySize || 0) / 1048576).toFixed(2), endedBeforeCover: cover != null && e.responseEnd < cover })),
    terraces: res.filter((e) => /terraces\.json/.test(e.name)).map((e) => ({ start: Math.round(e.startTime), end: Math.round(e.responseEnd) })),
  };
}
