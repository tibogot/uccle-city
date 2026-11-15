// Runs debug/drawnAudit.js over a list of tiles, moving the orbit camera tile to tile (as debug/cityAudit.js).
//   const R = await import("/debug/drawnAuditRun.js"); R.start(["E4", "D6", "F5"]); R.status(); R.results()
import { audit } from "./drawnAudit.js";
const S = { running: false, done: 0, total: 0, current: null, out: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const status = () => ({ running: S.running, done: S.done, total: S.total, current: S.current });
export const results = () => S.out;
export async function start(names, { settleS = 4, timeoutS = 120 } = {}) {
  const man = await (await fetch("/data/tiles/manifest.json")).json();
  Object.assign(S, { running: true, done: 0, total: names.length, out: [] });
  (async () => {
    for (const name of names) {
      S.current = name;
      const t = man.tiles.find((q) => q.name === name);
      if (!t) { S.out.push({ tile: name, error: "no such tile" }); S.done++; continue; }
      const cx = (t.bounds.x[0] + t.bounds.x[1]) / 2, cz = (t.bounds.z[0] + t.bounds.z[1]) / 2;
      const y = viewer.hm?.surface ? viewer.hm.surface(cx, cz) : 80;
      viewer.controls.target.set(cx, y, cz); viewer.camera.position.set(cx + 40, y + 120, cz + 60); viewer.controls.update();
      const t0 = performance.now();
      while (performance.now() - t0 < timeoutS * 1000 && !viewer.world.tiles.some((q) => q.name === name && q.drive)) await sleep(500);
      await sleep(settleS * 1000);
      try { const r = audit([name]); S.out.push({ ...r.tiles[0], missingBy: r.missing, ghostBy: r.ghost, items: r.items.slice(0, 25) }); }
      catch (e) { S.out.push({ tile: name, error: String(e?.message || e) }); }
      S.done++;
    }
    S.running = false; S.current = null;
  })();
  return status();
}
