// TRAM 92 ON THE FITTED TRACKS (claude/tramfit): the trams' GTFS shapes snapped onto the tracks by the city's own code
// (viewer/tramSched.js createTrackSnap, which viewer/tramline.js runs per loaded tile; claude/tramfix: this audit had its
// own copy of the loop, so the city's snap threw `finish is not defined` for a day with the row green, rule
// no-undefined-refs): 3 m reach, stay on the previous track, prefer the shape's way, two [1 2 1]/4 passes, for all tiles at once,
// on the fitted tracks (data/tramfit) and on the OSM ways as before (?tramfit=old). Reports per mode: shape points
// left unsnapped (no track within 3 m), the snapped path's steps (|step - 1 m|: a jump sideways), its heading change
// per metre (the tram's yaw rate at 1 m/s) and the tightest radius over 4 m.
//
// First a SELF-TEST on a made-up line (two parallel tracks over two tiles, a shape 0.8 m off one): both snap paths
// (default and ?tramalloc=old) finish, every snapped point sits on its track (< 0.2 m), pts / cum / tan swapped in.
//
//   node --import ./tools/road_audit/register.mjs tools/tramfit/tramSnap.mjs
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const { tramTracks } = await import(pathToFileURL(join(ROOT, "viewer/track.js")).href);
const { densifyShapes, createTrackSnap } = await import(pathToFileURL(join(ROOT, "viewer/tramSched.js")).href);
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const doc = JSON.parse(readFileSync(join(ROOT, "data/transit/stib-92.json"), "utf8"));

function tracksOf(fitOn) {
  const out = [], boxes = [];
  for (const t of manifest.tiles) {
    const fp = join(ROOT, "data/tiles", t.name, "features.json");
    if (!existsSync(fp)) continue;
    const feats = JSON.parse(readFileSync(fp, "utf8"));
    const fit = fitOn && existsSync(join(ROOT, "data/tramfit", `${t.name}.json`)) ? JSON.parse(readFileSync(join(ROOT, "data/tramfit", `${t.name}.json`), "utf8")) : null;
    if (!tramTracks(feats, fit)) continue;
    boxes.push({ x0: t.bounds.x[0], x1: t.bounds.x[1], z0: t.bounds.z[0], z1: t.bounds.z[1] });
    for (const l of feats.lines) if (l.kind === "tram") out.push(l.line);
  }
  return { tracks: out, boxes };
}

// ------------------------------------------------------------------ self-test (claude/tramfix)
const segDist = (x, z, l) => { let m = Infinity; for (let k = 1; k < l.length; k++) { const [ax, az] = l[k - 1], [cx, cz] = l[k], dx = cx - ax, dz = cz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1e-9))); m = Math.min(m, Math.hypot(ax + dx * t - x, az + dz * t - z)); } return m; };
async function selfTest() {
  const fails = [];
  for (const alloc of [true, false]) {
    const tag = alloc ? "default" : "?tramalloc=old";
    // a 200 m line along x with a gentle bend, two tracks 3 m apart; the shape 0.8 m off the near one; two tiles
    const yOf = (x) => 5 * Math.sin(x / 60);
    const trackA = [], trackB = [];
    for (let x = 0; x <= 200; x += 5) { trackA.push([x, yOf(x)]); trackB.push([x, yOf(x) + 3]); }
    const shapes = densifyShapes({ shapes: { a: [[0, yOf(0) + 0.8], [50, yOf(50) + 0.8], [100, yOf(100) + 0.8], [150, yOf(150) + 0.8], [200, yOf(200) + 0.8]] } });
    const sn = createTrackSnap(shapes, { alloc, slice: async () => {}, hits: true });
    const cut = (l, x0, x1) => l.filter(([x]) => x >= x0 && x <= x1);
    sn.addTracks([cut(trackA, 0, 100), cut(trackB, 0, 100)], { x0: 0, x1: 100, z0: -20, z1: 20 });
    sn.addTracks([cut(trackA, 100, 200), cut(trackB, 100, 200)], { x0: 100, x1: 200, z0: -20, z1: 20 });
    const s = shapes.a, before = s.pts;
    let err = null;
    try { await sn.snapAll(); } catch (e) { err = e; }
    if (err) { fails.push(`${tag}: snapAll threw: ${err.message}`); continue; }
    if (s.pts === before || s.cum?.length !== s.pts.length || s.tan?.length !== 2 * s.pts.length) fails.push(`${tag}: pts / cum / tan not swapped in together (${s.pts.length} pts, ${s.cum?.length} cum, ${s.tan?.length} tan)`);
    if (s.snapNext || s.hitNext) fails.push(`${tag}: a half-swapped shape left behind`);
    let worst = 0, off = 0;
    for (const [x, z] of s.pts) { const d = segDist(x, z, trackA); worst = Math.max(worst, d); if (segDist(x, z, trackB) < d) off++; }
    if (!(worst < 0.2)) fails.push(`${tag}: a snapped point ${worst.toFixed(3)} m off the track (>= 0.2)`);
    if (off) fails.push(`${tag}: ${off} points on the far track`);
    if (s.hit.some((h) => !h)) fails.push(`${tag}: ${s.hit.filter((h) => !h).length} points unsnapped`);
    const L = s.cum[s.cum.length - 1];
    if (!(Math.abs(L - 200) < 2)) fails.push(`${tag}: arc length ${L.toFixed(2)} m, not ~200`);
    console.log(`self-test ${tag}: ${s.pts.length} pts, worst ${worst.toFixed(3)} m off the track, length ${L.toFixed(1)} m`);
  }
  return fails;
}
const selfFails = await selfTest();
if (selfFails.length) console.log("FAIL self-test:", selfFails.join("; "));

async function run(fitOn) {
  const { tracks, boxes } = tracksOf(fitOn);
  const shapes = densifyShapes(doc);
  const sn = createTrackSnap(shapes, { alloc: true, hits: true });
  // all tiles at once (the city adds them one at a time and re-snaps: the same result once all are in)
  boxes.forEach((b, i) => sn.addTracks(i ? [] : tracks, b));
  await sn.snapAll();
  const res = { points: 0, unsnapped: 0, stepDevMax: 0, stepDevP999: 0, yawRateMax: 0, yawRateP999: 0, rMin4: Infinity, rUnder18: 0, spots: [] };
  const devs = [], yaws = [];
  for (const s of Object.values(shapes)) {
    const o = s.orig, p = s.pts, ok = new Uint8Array(o.length);
    for (let i = 0; i < o.length; i++) {
      if (!sn.loaded(o[i][0], o[i][1])) continue;
      res.points++;
      if (s.hit[i]) ok[i] = 1; else res.unsnapped++;
    }
    for (let i = 2; i + 2 < p.length; i++) {
      if (!ok[i - 2] || !ok[i + 2] || !ok[i]) continue;
      const step = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]), ostep = Math.hypot(o[i + 1][0] - o[i][0], o[i + 1][1] - o[i][1]);
      devs.push(Math.abs(step - ostep));
      const h0 = Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]), h1 = Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]);
      let dh = Math.abs(h1 - h0); if (dh > Math.PI) dh = 2 * Math.PI - dh;
      yaws.push(dh / (step || 1));
      if (dh / (step || 1) > SPOT * Math.PI / 180) res.spots.push(`${p[i][0].toFixed(0)},${p[i][1].toFixed(0)}`);
      const [ax, az] = p[i - 2], [bx, bz] = p[i], [cx, cz] = p[i + 2];
      const A2 = Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)), R = A2 < 1e-9 ? Infinity : (Math.hypot(bx - ax, bz - az) * Math.hypot(cx - bx, cz - bz) * Math.hypot(cx - ax, cz - az)) / (2 * A2);
      res.rMin4 = Math.min(res.rMin4, R); if (R < 18) res.rUnder18++;
    }
  }
  devs.sort((a, b) => a - b); yaws.sort((a, b) => a - b);
  res.stepDevMax = +devs[devs.length - 1].toFixed(3); res.stepDevP999 = +devs[Math.floor(devs.length * 0.999)].toFixed(3);
  res.yawRateMax = +(yaws[yaws.length - 1] * 180 / Math.PI).toFixed(2); res.yawRateP999 = +(yaws[Math.floor(yaws.length * 0.999)] * 180 / Math.PI).toFixed(2);
  res.rMin4 = +res.rMin4.toFixed(1);
  return res;
}
const SPOT = +(process.argv[process.argv.indexOf("--spots") + 1] || 0) || Infinity;   // --spots DEG: list where the yaw rate > DEG / m
const old = await run(false), fit = await run(true);
const show = (r) => JSON.stringify({ ...r, spots: [...new Set(r.spots)].length ? [...new Set(r.spots)] : undefined });
console.log("old (?tramfit=old):", show(old));
console.log("fit              :", show(fit));
// gate (--max k=v,...): the fitted run's ceilings; and never more unsnapped shape points than on the OSM ways
const ai = process.argv.indexOf("--max");
if (ai >= 0) {
  const MAX = Object.fromEntries(process.argv[ai + 1].split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, +v]));
  const fails = [...selfFails, ...Object.entries(MAX).filter(([k, v]) => fit[k] > v).map(([k, v]) => `${k} ${fit[k]} > ${v}`)];
  if (fit.unsnapped > old.unsnapped) fails.push(`unsnapped ${fit.unsnapped} > old ${old.unsnapped}`);
  console.log(fails.length ? `FAIL: ${fails.join("; ")}` : "PASS");
  process.exit(fails.length ? 1 : 0);
} else if (selfFails.length) process.exit(1);
export { old, fit };
