// TRAM 92 ON THE FITTED TRACKS (claude/tramfit): the trams' GTFS shapes snapped onto the tracks as viewer/tramline.js
// does (3 m reach, stay on the previous track, prefer the shape's way, two [1 2 1]/4 passes), for all tiles at once,
// on the fitted tracks (data/tramfit) and on the OSM ways as before (?tramfit=old). Reports per mode: shape points
// left unsnapped (no track within 3 m), the snapped path's steps (|step - 1 m|: a jump sideways), its heading change
// per metre (the tram's yaw rate at 1 m/s) and the tightest radius over 4 m.
//
//   node --import ./tools/road_audit/register.mjs tools/tramfit/tramSnap.mjs
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const { tramTracks } = await import(pathToFileURL(join(ROOT, "viewer/track.js")).href);
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

function run(fitOn) {
  const { tracks, boxes } = tracksOf(fitOn);
  const grid = new Map(), gk = (i, j) => i * 100003 + j;
  tracks.forEach((l, li) => { for (let k = 1; k < l.length; k++) {
    const [ax, az] = l[k - 1], [cx, cz] = l[k];
    for (let i = Math.floor((Math.min(ax, cx) - 3) / 4); i <= Math.floor((Math.max(ax, cx) + 3) / 4); i++)
      for (let j = Math.floor((Math.min(az, cz) - 3) / 4); j <= Math.floor((Math.max(az, cz) + 3) / 4); j++) { const key = gk(i, j); if (!grid.has(key)) grid.set(key, []); grid.get(key).push([ax, az, cx, cz, li]); }
  } });
  const loaded = (x, z) => boxes.some((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
  const res = { points: 0, unsnapped: 0, stepDevMax: 0, stepDevP999: 0, yawRateMax: 0, yawRateP999: 0, rMin4: Infinity, rUnder18: 0, spots: [] };
  const devs = [], yaws = [];
  for (const line of Object.values(doc.shapes)) {
    const o = [];
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) o.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    let prevLine = -1, prevPt = null;
    const snap = o.map((p) => p.slice()), ok = new Uint8Array(o.length);
    for (let i = 0; i < o.length; i++) {
      const [x, z] = o[i];
      if (!loaded(x, z)) { prevLine = -1; prevPt = null; continue; }
      res.points++;
      const a0 = o[Math.max(0, i - 1)], a1 = o[Math.min(o.length - 1, i + 1)];
      const sx = a1[0] - a0[0], sz = a1[1] - a0[1], sl = Math.hypot(sx, sz) || 1;
      let best = Infinity, bx = x, bz = z, bl = -1;
      for (const [ax, az, cx, cz, li] of grid.get(gk(Math.floor(x / 4), Math.floor(z / 4))) || []) {
        const dx = cx - ax, dz = cz - az, L2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t;
        const d2 = (px - x) ** 2 + (pz - z) ** 2;
        if (d2 > 9) continue;
        const back = (dx * sx + dz * sz) / (Math.sqrt(L2) * sl) < 0 ? 1 : 0;
        const cont = li === prevLine || (prevPt && (px - prevPt[0]) ** 2 + (pz - prevPt[1]) ** 2 < 2.25 && Math.abs(Math.hypot(px - prevPt[0], pz - prevPt[1]) - Math.hypot(x - o[Math.max(0, i - 1)][0], z - o[Math.max(0, i - 1)][1])) < 0.5);
        const cost = d2 + (prevLine >= 0 && !cont ? 100 : 0) + back;
        if (cost < best) { best = cost; bx = px; bz = pz; bl = li; }
      }
      if (bl < 0) res.unsnapped++; else ok[i] = 1;
      snap[i] = [bx, bz]; prevLine = bl; prevPt = [bx, bz];
    }
    let p = snap;
    for (let pass = 0; pass < 2; pass++) {
      const q = p.map((v) => v.slice());
      for (let i = 1; i + 1 < p.length; i++) { q[i][0] = (p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4; q[i][1] = (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4; }
      p = q;
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
const old = run(false), fit = run(true);
const show = (r) => JSON.stringify({ ...r, spots: [...new Set(r.spots)].length ? [...new Set(r.spots)] : undefined });
console.log("old (?tramfit=old):", show(old));
console.log("fit              :", show(fit));
// gate (--max k=v,...): the fitted run's ceilings; and never more unsnapped shape points than on the OSM ways
const ai = process.argv.indexOf("--max");
if (ai >= 0) {
  const MAX = Object.fromEntries(process.argv[ai + 1].split(",").map((kv) => kv.split("=")).map(([k, v]) => [k, +v]));
  const fails = Object.entries(MAX).filter(([k, v]) => fit[k] > v).map(([k, v]) => `${k} ${fit[k]} > ${v}`);
  if (fit.unsnapped > old.unsnapped) fails.push(`unsnapped ${fit.unsnapped} > old ${old.unsnapped}`);
  console.log(fails.length ? `FAIL: ${fails.join("; ")}` : "PASS");
  process.exit(fails.length ? 1 : 0);
}
export { old, fit };
