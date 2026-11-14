// CITY-WIDE DRIVE / WALK AUDIT (2026-11-13): viewer/drive/collisionTest.js on every built tile, in ONE city page (no
// reload per tile: the boot's shader warm-up is paid once). The camera moves tile to tile in a snake order (neighbours
// stay loaded), waits until the tile is full (its drive data in), runs the test, keeps a compact summary.
//   const A = await import("/debug/cityAudit.js"); A.start({ walk: false });   // runs in the background
//   A.status()   -> { done, total, current, elapsedS }        A.results() -> [{ tile, drive, walk, static, items }]
// Results are also kept in localStorage "uccle-city-audit" (try/catch), so a reload does not lose them.
const S = { running: false, done: 0, total: 0, current: null, t0: 0, out: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = () => { try { localStorage.setItem("uccle-city-audit", JSON.stringify(S.out)); } catch {} };

export function status() { return { running: S.running, done: S.done, total: S.total, current: S.current, elapsedS: Math.round((performance.now() - S.t0) / 1000) }; }
export function results() { return S.out; }

function snake(tiles) {
  const rows = new Map();
  for (const t of tiles) { const j = t.j; if (!rows.has(j)) rows.set(j, []); rows.get(j).push(t); }
  const out = [];
  [...rows.keys()].sort((a, b) => a - b).forEach((j, k) => { const r = rows.get(j).sort((a, b) => a.i - b.i); out.push(...(k % 2 ? r.reverse() : r)); });
  return out;
}

/** What is under an item (debug/driveProbe.js style, cheap): the car's drive surface there and 2.5 m round it (the
 *  step a ledge stops at), the hero / OSM deck, the tile the point belongs to, the drawn meshes under it (top 4). */
function diagnose(x, z) {
  const D = window.__driver, w = viewer.world;
  if (!D) return null;
  const g = (a, b) => +D.ground(a, b).toFixed(2);
  const y = g(x, z), ring = [];
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ring.push(+(g(x + 2.5 * Math.sin(a), z + 2.5 * Math.cos(a)) - y).toFixed(2)); }
  const t = w.at(x, z);
  return { y, ring, deck: w.deckY(x, z), tile: t.name, terr: +t.hm.surface(x, z).toFixed(2), dtm: +t.hm.ground(x, z).toFixed(2), hits: probeHits(x, z) };
}
function probeHits(x, z) { return window.__probeHits ? window.__probeHits(x, z) : undefined; }

export async function start({ walk = false, only = null, maxRoads = Infinity, timeoutS = 240, maxItems = 200, diag = true } = {}) {
  if (diag && !window.__probeHits) { const P = await import("./driveProbe.js"); window.__probeHits = (x, z) => P.probe(x, z).hits.slice(0, 5).map((h) => `${h.name}@${h.y}${h.up < 0 ? "v" : ""}`); }
  if (S.running) return status();
  const man = await (await fetch("/data/tiles/manifest.json")).json();
  let tiles = man.tiles.filter((t) => t.status === "built");
  if (only) tiles = tiles.filter((t) => only.includes(t.name));
  tiles = snake(tiles);
  Object.assign(S, { running: true, done: 0, total: tiles.length, t0: performance.now(), out: [] });
  (async () => {
    for (const t of tiles) {
      S.current = t.name;
      const b = t.bounds, cx = (b.x[0] + b.x[1]) / 2, cz = (b.z[0] + b.z[1]) / 2;
      const y = viewer.hm?.surface ? viewer.hm.surface(cx, cz) : 80;
      viewer.controls.target.set(cx, y, cz);
      viewer.camera.position.set(cx + 40, y + 120, cz + 60);
      viewer.controls.update();
      const tq = performance.now();
      let tile = null;
      while (performance.now() - tq < timeoutS * 1000) {
        tile = viewer.world.tiles.find((q) => q.name === t.name && q.drive);
        if (tile) break;
        await sleep(500);
      }
      // ... and its built neighbours (the car near an edge stands on the next tile's drive surface: an unloaded one is
      // a clamp of some other tile's grid, the "17.86 m over" / "29.7 m step" artefacts of the first run)
      const nb = man.tiles.filter((q) => q.status === "built" && q.name !== t.name && Math.abs(q.i - t.i) <= 1 && Math.abs(q.j - t.j) <= 1).map((q) => q.name);
      const tn = performance.now();
      while (tile && performance.now() - tn < 90000 && !nb.every((n) => viewer.world.tiles.some((q) => q.name === n && q.drive))) await sleep(500);
      const rec = { tile: t.name, loadS: Math.round((performance.now() - tq) / 1000) };
      const missingNb = nb.filter((n) => !viewer.world.tiles.some((q) => q.name === n && q.drive));
      if (missingNb.length) rec.missingNeighbours = missingNb;
      if (!tile) { rec.error = "tile never loaded"; S.out.push(rec); S.done++; save(); continue; }
      await sleep(2500);                                                          // its furniture / heroes settle
      try {
        const r = await viewer.collisionTest(t.name, { walk, maxRoads });
        const pick = (d) => d && Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === "number"));
        rec.drive = pick(r.drive); rec.walk = pick(r.walk); rec.static = pick(r.static);
        rec.items = [...(r.drive?.items || []), ...(r.walk?.items || []).map((i) => ({ ...i, walk: true }))]
          .slice(0, maxItems).map((i) => ({ k: i.kind, x: i.x, z: i.z, by: i.by, r: i.road, c: i.collider, d: i.drawn, walk: i.walk || undefined,
            why: diag ? diagnose(i.x, i.z) : undefined }));
      } catch (e) { rec.error = String(e?.message || e); }
      S.out.push(rec); S.done++; save();
    }
    S.running = false; S.current = null;
  })();
  return status();
}
