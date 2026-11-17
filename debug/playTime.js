// TIME TO PLAY (perf8, docs/PERF_GAME.md round 8): after a page load (?game=police / falcon / the free-roam hold), wait
// for the play loader to fade, then record the first `seconds` of frames as the player gets them.
//   const P = await import("/debug/playTime.js"); await P.run({ seconds: 15 })
// -> { cover, play, area, gameTimes, frames: { n, avg, worst, over50, over100 }, heapMB (at the end), ro (debug/roAudit.js) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function run({ seconds = 15, maxWait = 150000, heapAfter = 0 } = {}) {
  const t0 = performance.now();
  while (!globalThis.__playAt && performance.now() - t0 < maxWait) await sleep(250);
  const play = globalThis.__playAt;
  const ft = [];
  let last = performance.now();
  const end = last + seconds * 1000;
  await new Promise((res) => { const f = (t) => { ft.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  ft.shift();
  const s = [...ft].sort((a, b) => a - b);
  if (heapAfter) await sleep(heapAfter);
  let ro = null;
  try { ro = (await import("./roAudit.js")).run(); } catch (e) { ro = String(e); }
  return {
    cover: Math.round(window.__coverAt ?? 0), play: play ? Math.round(play) : null, area: window.__areaReady ?? null,
    gameTimes: globalThis.__gameTimes ?? null,
    frames: { n: ft.length, avg: +(ft.reduce((a, b) => a + b, 0) / Math.max(1, ft.length)).toFixed(1), p99: +(s[Math.floor(0.99 * s.length)] ?? 0).toFixed(0), worst: Math.round(s[s.length - 1] ?? 0), over50: ft.filter((x) => x > 50).length, over100: ft.filter((x) => x > 100).length },
    heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576), ro,
  };
}
