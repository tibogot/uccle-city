// PAGE LOADS ALTERNATED IN ONE TAB (night default A/B, 2026-11-15): the city in a full-window iframe of a same-origin
// page; each variant's URL is loaded in turn (A, B, B, A, A, B ... order alternated per round), and in each load a job
// module (any /debug/*.js export) runs in the IFRAME's realm (its own window.viewer). Results gather in the top page.
// Used for boot flags (?night=1) that cannot be switched live. One tab, kept in front: the iframe gets the tab's rAF.
//   open any plain same-origin page (e.g. /CREDITS.md), then:
//   const L = await import("/debug/loadAB.js");
//   L.start({ variants: { D: "/viewer/index.html?ring=1&far=1", N: "/viewer/index.html?ring=1&far=1&night=1" },
//             rounds: 10, job: ["/debug/loadAB.js", "views"], args: [["stjob-street", "stjob"]] });
//   L.status()        -> { done, total, current, results: [{ variant, round, cover, out }] }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = (window.__loadAB ||= { results: [], running: false });

function frame() {
  let f = document.getElementById("__loadAB");
  if (!f) {
    document.body.innerHTML = "";
    document.body.style.cssText = "margin:0;overflow:hidden;background:#000";
    f = document.createElement("iframe");
    f.id = "__loadAB";
    f.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;border:0";
    document.body.append(f);
  }
  return f;
}

async function load(f, url, timeoutS) {
  f.src = "about:blank";
  await sleep(1500);                                   // let the previous document unload (its GPU device + heap)
  f.src = url + (url.includes("?") ? "&" : "?") + `_l=${Date.now()}`;
  await sleep(1000);
  for (let i = 0; i < timeoutS * 2; i++) {
    const w = f.contentWindow;
    if (w?.viewer && w.document.getElementById("cover")?.classList.contains("gone")) return w;
    await sleep(500);
  }
  throw new Error(`no cover lift in ${timeoutS} s: ${url}`);
}

export function start({ variants, rounds = 10, job, args = [], extra = 12, timeoutS = 150 }) {
  if (S.running) throw new Error("already running");
  const names = Object.keys(variants), f = frame();
  S.results = []; S.running = true; S.total = rounds * names.length; S.error = null;
  (async () => {
    try {
      for (let r = 0; r < rounds; r++) {
        const order = r % 2 ? [...names].reverse() : names;
        for (const v of order) {
          S.current = `${v} round ${r}`;
          const w = await load(f, variants[v], timeoutS);
          const cover = Math.round(w.__coverAt ?? 0);
          await sleep(extra * 1000);
          const mod = await w.eval(`import(${JSON.stringify(job[0])})`);
          // (copied into THIS realm as JSON: an object of the iframe's realm would keep its whole city alive after the
          // next load - 6 GB of heap after 4 loads)
          const out = JSON.parse(JSON.stringify(await mod[job[1]](...args)));
          S.results.push({ variant: v, round: r, cover, out });
          try { localStorage.setItem("__loadAB", JSON.stringify(S.results)); } catch (e) { /* (a backup only) */ }
        }
      }
    } catch (e) { S.error = String(e?.stack || e); } finally { S.running = false; S.current = null; f.src = "about:blank"; }
  })();
  return { total: S.total };
}

export function status() { return { running: S.running, done: S.results.length, total: S.total, current: S.current, error: S.error }; }
export function results() { return S.results; }

/** median / mean +- s.e. of a per-load number per variant, and the paired difference b - a by round */
export function summary(pick, a, b) {
  const R = S.results, by = (v) => R.filter((x) => x.variant === v);
  const med = (x) => { const s = [...x].sort((p, q) => p - q); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : null; };
  const ms = (x) => { const m = x.reduce((s, v) => s + v, 0) / x.length; const sd = Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, x.length - 1)); return [+m.toFixed(2), +(sd / Math.sqrt(x.length)).toFixed(2)]; };
  const A = by(a), B = by(b), d = [];
  for (const x of A) { const y = B.find((q) => q.round === x.round); const pa = pick(x), pb = y && pick(y); if (pa != null && pb != null) d.push(pb - pa); }
  const va = A.map(pick).filter((v) => v != null), vb = B.map(pick).filter((v) => v != null);
  return { [a]: { med: med(va), mean: ms(va) }, [b]: { med: med(vb), mean: ms(vb) }, diff: { n: d.length, med: med(d), mean: ms(d) } };
}

// ---- jobs (run in the iframe's realm) ----

/** a teleport streams tiles and their late content (street life, landmarks) for a while after the tile count is
 *  stable: wait until the draw count holds within 2 % for 4 s in a row (max 60 s); returns the seconds waited */
async function drawsStable(maxS = 60) {
  const r = window.viewer.renderer.info.render, t0 = performance.now();
  let last = -1, ok = 0;
  while (ok < 4 && performance.now() - t0 < maxS * 1000) {
    await sleep(1000);
    const d = r.drawCalls ?? r.calls;
    ok = last > 0 && Math.abs(d - last) <= Math.max(3, last * 0.02) ? ok + 1 : 0;
    last = d;
  }
  return Math.round((performance.now() - t0) / 1000);
}

/** at each view: GPU p50 / p95, CPU per frame (debug/featureAB.js); "overview" = the viewer's own overview camera */
export async function views(ids, { seconds = 5, settle = 5 } = {}) {
  const A = await import("/debug/featureAB.js");
  const out = {};
  for (const id of ids) {
    if (id === "overview") {
      A.release(); window.viewer.setView("overview");
      let last = -1, stable = 0;
      for (let i = 0; i < 80 && stable < 4; i++) { await sleep(500); const n = window.viewer.world.tiles.length; stable = n === last ? stable + 1 : 0; last = n; }
      await sleep(settle * 1000);
    } else await A.at(id, { settle });
    const wait = await drawsStable();
    out[id] = { ...(await A.measure({ seconds })), wait };
  }
  A.release();
  return out;
}
