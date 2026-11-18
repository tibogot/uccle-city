// CENSUS street helpers (claude/census 2026-11-18): shared by streetProps.mjs (class D), tramRails.mjs (class E),
// markings.mjs (class F) and ground.mjs (class C).
//   streetTile(T)        the tile worker's road stage in node (tools/road_audit/tile.mjs -> viewer/roadBuild.js) + the
//                        measured street (viewer/streets/fitCore.js streetFit), the driven lanes / carriageway tests
//                        (viewer/streets/carriageway.js, as main.js builds them), the tram tracks as the tile worker
//                        smooths them (viewer/track.js), a street-name lookup
//   runTiles(...)        a census over many tiles: one child process per tile (<= jobs at once), each prints one JSON line
//   worstTable(...)      the report's "10 worst" rows
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import os from "node:os";
import { loadTile, allTiles, ROOT } from "../../road_audit/tile.mjs";

export { ROOT, allTiles };
export const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
export const json = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
export const SC = { roadway: 0, tramRoad: 1, tramSite: 2, parking: 3, square: 4, sidewalk: 5, median: 6, path: 7, ramp: 8, pit: 9 };
export const CLASS_NAME = Object.fromEntries(Object.entries(SC).map(([k, v]) => [v, k]));

/** point-to-polyline-set distance with a grid (lines: [[x, z], ...][]) -> { dist(x, z, reach) -> {d, line, k, ux, uz} | null } */
export function lineIndex(lines, CELL = 8) {
  const segs = [], grid = new Map(), key = (i, j) => i * 100003 + j;
  lines.forEach((pts, li) => {
    for (let k = 1; k < pts.length; k++) {
      const [ax, az] = pts[k - 1], [bx, bz] = pts[k], id = segs.push({ ax, az, bx, bz, li, k }) - 1;
      for (let i = Math.floor(Math.min(ax, bx) / CELL); i <= Math.floor(Math.max(ax, bx) / CELL); i++)
        for (let j = Math.floor(Math.min(az, bz) / CELL); j <= Math.floor(Math.max(az, bz) / CELL); j++) { const q = key(i, j); if (!grid.has(q)) grid.set(q, []); grid.get(q).push(id); }
    }
  });
  const dist = (x, z, reach = CELL) => {
    let best = null; const R = Math.ceil(reach / CELL);
    const i0 = Math.floor(x / CELL), j0 = Math.floor(z / CELL), seen = new Set();
    for (let i = i0 - R; i <= i0 + R; i++) for (let j = j0 - R; j <= j0 + R; j++) for (const id of grid.get(key(i, j)) || []) {
      if (seen.has(id)) continue; seen.add(id);
      const s = segs[id], dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz; if (L2 < 1e-9) continue;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / L2)), d = Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
      if (d <= reach && (!best || d < best.d)) { const L = Math.sqrt(L2); best = { d, li: s.li, k: s.k, ux: dx / L, uz: dz / L }; }
    }
    return best;
  };
  return { dist };
}

/** everything the street detectors need for tile T */
export async function streetTile(T, opts = {}) {
  const { streetFit } = await imp("viewer/streets/fitCore.js");
  const { carriageway } = await imp("viewer/streets/carriageway.js");
  const { tramTracks } = await imp("viewer/track.js");
  const realLog = console.log; console.log = () => {};
  let tile; try { tile = loadTile(T, opts); } finally { console.log = realLog; }
  const { roads, feats, bounds, rd } = tile;
  const fit = rd.surfaceData ? streetFit(rd.surfaceData) : null;
  const classAt = fit ? fit.classAt : () => -1;
  const driven = carriageway(roads, { classAt: fit?.classAt });
  const lanes = carriageway(roads, { classAt: fit?.classAt, lanesOnly: true });
  // the tram tracks as the tile worker makes them (tileData.js -> viewer/track.js tramTracks: rails, wire, trams follow
  // these): the fit of data/tramfit/<T>.json (claude/tramfit), or with opts.tramfit === false (?tramfit=old) each OSM
  // way smoothed as it is
  const fitDoc = opts.tramfit === false ? null : json(join(ROOT, "data/tramfit", `${T}.json`));
  const tf = { lines: (feats.lines || []).map((l) => ({ ...l, line: l.line.map((p) => p.slice()) })) };
  const tramMode = tramTracks(tf, fitDoc);
  // the tram platforms beside the tracks (viewer/streets/tramPlatforms.js fitPlatforms, as the tile worker; not with
  // opts.tramfit === false)
  const { fitPlatforms } = await imp("viewer/streets/tramPlatforms.js");
  const platFit = opts.tramfit === false ? null : fitPlatforms(tf);
  const platforms = tf.lines.filter((l) => l.kind === "platform" && l.tags?.tram === "yes" && l.line?.length >= 2);
  const tram = tf.lines.filter((l) => l.kind === "tram");
  const tramIdx = lineIndex(tram.map((l) => l.line));
  // street names: the nearest named OSM road centre line (any highway), else "?"
  const N = new Map((roads.nodes || []).map((n) => [n.id, n]));
  const named = (roads.roads || []).filter((r) => r.meta?.name).map((r) => ({ name: r.meta.name, pts: [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]) }));
  const nameIdx = lineIndex(named.map((r) => r.pts), 16);
  const nameAt = (x, z) => { const n = nameIdx.dist(x, z, 48); return n ? named[n.li].name : "?"; };
  const inB = (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1;
  return { T, tile, roads, feats, bounds, rd, fit, classAt, driven, lanes, tram, tramMode, platforms, platFit, tramIdx, nameAt, inB };
}

const r1 = (v) => Math.round(v * 10) / 10;
export const at = (x, z) => `${r1(x)}, ${r1(z)}`;

/**
 * The parent side of a tile census: runs `script --child T` over TILES (<= JOBS at once) and returns the parsed last
 * JSON line of each child ({ tile, ... }). Children run under tools/road_audit/register.mjs (bare three imports).
 */
export async function runTiles(script, TILES, { jobs = Math.max(1, Math.min(4, os.cpus().length - 2)), extra = [], log = true } = {}) {
  const results = [], queue = TILES.slice(), t0 = Date.now();
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--max-old-space-size=3072", "--import", "./tools/road_audit/register.mjs", fileURLToPath(script), "--child", T, ...extra], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { err += b; });
    p.on("close", (code) => {
      const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: child exit ${code}: ${err.trim().split("\n").slice(-3).join(" / ")}`); results.push({ tile: T, error: true }); }
      else results.push(JSON.parse(line));
      if (log) process.stderr.write(`\r${results.length}/${TILES.length} tiles, ${((Date.now() - t0) / 1000).toFixed(0)} s   `);
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  if (log) process.stderr.write("\n");
  results.sort((a, b) => a.tile.localeCompare(b.tile));
  return results;
}

/** common CLI: { CHILD, TILES, OUT, JOBS, rest } */
export function cli(argv = process.argv.slice(2)) {
  const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
  const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
  const CHILD = flag("--child"), ALL = flag("--all"), OUT = opt("--out", null), JOBS = +opt("--jobs", 0) || undefined, WORST = +opt("--worst", 10);
  const TILES = ALL ? allTiles() : argv.filter((a) => /^[A-Z]\d+$/i.test(a)).map((t) => t.toUpperCase());
  return { CHILD, ALL, OUT, JOBS, WORST, TILES, opt, flag, argv };
}
