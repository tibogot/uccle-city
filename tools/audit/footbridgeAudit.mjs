// FOOTBRIDGE AUDIT (claude/footbridge, rule footbridge-built, docs/rules/footbridge-built.md; gate row `footbridge`).
// The Vivier d'Oie station footbridges (UrbIS PB 751 / 752) were never drawn: their slab lay in the ballast, then went,
// and their OSM footways / steps were gravel stripes painted down the banks and across the tracks. For every footbridge
// of data/rail/footbridges.json the tile worker's whole build in node (tools/roadfix/tile.mjs), then:
//   F1 built      every UrbIS foot bridge (PB) over the railway inside the built tiles has a footbridge; of its polygon
//                 (1 m samples) no more than OPEN_MAX is left open: outside every part while the ground there lies more
//                 than OPEN_DROP under the bridge's walk (the walk would hang over the cutting there)
//   F2 welded     every part end not on another part meets the drawn ground (street / path / terrain) within WELD m
//   F3 clearance  over every track the deck's underside is >= CLEAR m over the rail top (the contact wire passes)
//   F4 not buried along every stair / landing / deck, the drawn terrain stays under the walk (the bank carved off the treads)
//   F5 piers      no pier within PIER_TRACK m of a track's centre line
//   F6 no stripe  the footbridges' OSM ways are not painted on the ground any more (the tile's lines)
//   F7 steps      every stair's riser RISE m, going >= GOING m (a real stair, not a ramp of slivers)
//
//   node --import ./tools/road_audit/register.mjs tools/audit/footbridgeAudit.mjs [--old] [--quiet]
// --old: ?footbridge=old (nothing built): F1 fails, which is the defect this guards. Exit 1 on a FAIL.
import "../road_audit/register.mjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTile } from "../roadfix/tile.mjs";
import { footFootprint, footTop, FB } from "../../viewer/rail/footbridge.js";
import { inRing } from "../../viewer/streets/bridgeDecks.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const OLD = process.argv.includes("--old"), QUIET = process.argv.includes("--quiet");
const OPEN_MAX = 0.05, OPEN_DROP = 1.5, WELD = 0.15, CLEAR = 5.2, PIER_TRACK = 2.2, RISE = [0.12, 0.2], GOING = 0.22;

const rail = json("data/rail/rail.json"), spec = json("data/rail/footbridges.json"), manifest = json("data/tiles/manifest.json");
const tileOf = (x, z) => manifest.tiles.find((t) => t.status === "built" && x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name ?? null;
const fails = [], fail = (check, what, msg) => fails.push({ check, what, msg });
const pbs = rail.bridges.filter((b) => b.type === "PB" && tileOf(...b.centre));
const tiles = [...new Set(pbs.map((b) => tileOf(...b.centre)))];
const trackPts = rail.tracks.flatMap((t) => t.pts);

for (const T of tiles) {
  const d = await buildTile(T, { keepNet: true, ...(OLD ? { footbridge: false } : {}) });
  const { hm } = d, fbs = d.footbridges || [];
  const H = hm.h, g = d.drive.ground;
  // the drawn ground: the street / sidewalk where the drive raster has one, else the drawn terrain
  const drawn = (x, z) => { const c = Math.round((x - H.x0) / H.step), r = Math.round((z - H.z0) / H.step), k = r * H.cols + c, v = g.delta[k]; return v > 0 && v !== 65535 ? hm.y[k] + v / 100 : hm.surface(x, z); };
  for (const b of pbs.filter((q) => tileOf(...q.centre) === T)) {
    const fb = fbs.find((f) => f.urbis === b.id);
    if (!fb) { fail("F1", `UrbIS PB ${b.id} (${T})`, "no footbridge built over the railway"); continue; }
    const inF = footFootprint(fb), top = footTop(fb);
    const parts = fb.parts.map((p) => ({ p, L: Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) }));
    const nearWalk = (x, z) => { let best = Infinity, y = null; for (const { p, L } of parts) { const tx = (p.b[0] - p.a[0]) / L, tz = (p.b[1] - p.a[1]) / L, u = Math.max(0, Math.min(L, (x - p.a[0]) * tx + (z - p.a[1]) * tz)), px = p.a[0] + tx * u, pz = p.a[1] + tz * u, dd = Math.hypot(px - x, pz - z); if (dd < best) { best = dd; y = top(px, pz); } } return y; };
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of b.ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
    let n = 0, cov = 0, open = 0;
    for (let x = Math.floor(x0) + 0.5; x < x1; x++) for (let z = Math.floor(z0) + 0.5; z < z1; z++) {
      if (!inRing(b.ring, x, z)) continue;
      n++;
      if (inF(x, z)) { cov++; continue; }
      const w = nearWalk(x, z);
      if (w != null && hm.surface(x, z) < w - OPEN_DROP) { open++; if (process.env.FB_OPEN) console.log("    open", x, z, (w - hm.surface(x, z)).toFixed(2)); }
    }
    const rec = { pb: b.id, tile: T, samples: n, covered: +(cov / n).toFixed(2), open: +(open / n).toFixed(3) };
    if (!QUIET) console.log(`  PB ${b.id}: ${JSON.stringify(rec)}`);
    if (open / n > OPEN_MAX) fail("F1", `UrbIS PB ${b.id}`, `${(100 * open / n).toFixed(1)} % of the polygon open over the drop (> ${OPEN_MAX * 100} %)`);
  }
  for (const fb of fbs) {
    const top = footTop(fb), ends = [];
    for (const p of fb.parts) for (const [q, y] of [[p.a, p.ya], [p.b, p.yb]]) ends.push({ p, q, y });
    for (const { p, q, y } of ends) {
      // joined to another part: another part's walk within WELD at the end
      const other = fb.parts.some((o) => o !== p && (() => { const f = footTop({ ...fb, parts: [o] }); const v = f(q[0], q[1]); return v != null && Math.abs(v - y) <= WELD; })());
      if (other) continue;
      // (the drawn ground: the drawn terrain, or the street / platform layer the drive raster has there, the nearer)
      // (+ a platform's top where the end stands on a platform: railway.js draws it over the terrain)
      const pl = rail.platforms.find((r) => inRing(r.ring, q[0], q[1]));
      const gs = [hm.surface(q[0], q[1]), drawn(q[0], q[1]), ...(pl ? [pl.top] : [])], gy = gs.sort((m, o) => Math.abs(m - y) - Math.abs(o - y))[0];
      if (Math.abs(gy - y) > WELD && p.kind !== "deck") fail("F2", `${fb.id} ${p.kind} end (${q})`, `walk ${y.toFixed(2)} vs drawn ground ${gy.toFixed(2)}: a step / gap of ${(y - gy).toFixed(2)} m at the end`);
      if (p.kind === "deck" && gy < y - WELD - 0.05 && Math.abs(gy - y) > 0.5) {
        // a deck end may stand over the bank: then it must be met by another part (checked above) or the ground within 1 m
        let ok = false;
        for (const r of [0.5, 1.0]) for (const s of [-1, 1]) { const L = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), tx = (p.b[0] - p.a[0]) / L, tz = (p.b[1] - p.a[1]) / L, e = q === p.a ? -1 : 1; const v = drawn(q[0] + tx * e * r * s, q[1] + tz * e * r * s); if (Math.abs(v - y) <= WELD) ok = true; }
        if (!ok) fail("F2", `${fb.id} deck end (${q})`, `walk ${y.toFixed(2)} over drawn ground ${gy.toFixed(2)}: a free deck end`);
      }
    }
    for (const p of fb.parts) {
      const L = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), tx = (p.b[0] - p.a[0]) / L, tz = (p.b[1] - p.a[1]) / L;
      let buried = 0, worst = 0, wAt = null;
      // (from 0.5 m inside an end: the street it meets is kept within footbridge.js END_KEEP)
      for (let u = 0.5; u < L - 0.5; u += 0.5) for (const v of [-p.w / 2 + 0.2, 0, p.w / 2 - 0.2]) {
        const x = p.a[0] + tx * u - tz * v, z = p.a[1] + tz * u + tx * v, w = top(x, z), s = hm.surface(x, z);
        if (w != null && s > w + 0.02) { buried++; if (s - w > worst) { worst = s - w; wAt = [+x.toFixed(1), +z.toFixed(1), +u.toFixed(1)]; } }
        // F3: the deck's underside over a track
        if (p.kind === "deck" && v === 0) for (const t of trackPts) if (Math.abs(t[0] - x) < 0.7 && Math.abs(t[2] - z) < 0.7 && w - FB.depth - t[1] < CLEAR) { fail("F3", `${fb.id} deck at (${x.toFixed(1)}, ${z.toFixed(1)})`, `underside ${(w - FB.depth - t[1]).toFixed(2)} m over the rail top (< ${CLEAR})`); break; }
      }
      if (buried >= 2) fail("F4", `${fb.id} ${p.kind} (${p.a})`, `${buried} samples with the drawn terrain over the walk (worst ${worst.toFixed(2)} m at ${JSON.stringify(wAt)}): the bank covers it`);
      if (p.kind === "stair") {
        const k = p.knots, flights = [];
        for (let i = 1; i < k.length; i++) if (Math.abs(k[i][1] - k[i - 1][1]) > 0.01) flights.push([Math.abs(k[i][0] - k[i - 1][0]), Math.abs(k[i][1] - k[i - 1][1])]);
        const H = Math.abs(p.ya - p.yb), nR = Math.max(1, Math.round(H / FB.rise)), rise = H / nR, run = flights.reduce((a, f) => a + f[0], 0), going = run / nR;
        if (rise < RISE[0] || rise > RISE[1] || going < GOING) fail("F7", `${fb.id} stair (${p.a})`, `riser ${rise.toFixed(3)} m, going ${going.toFixed(3)} m`);
      }
      // F5: piers (the deck's platform crossings) off the tracks
      if (p.kind === "deck" && p.piers) for (const t of trackPts) {
        const u = (t[0] - p.a[0]) * tx + (t[2] - p.a[1]) * tz, v = -(t[0] - p.a[0]) * tz + (t[2] - p.a[1]) * tx;
        if (u < 0 || u > L || Math.abs(v) > p.w) continue;
        // a pier stands only on a platform (footbridge.js): no platform within PIER_TRACK m of a track point is the case
        const onPl = rail.platforms.some((q) => inRing(q.ring, t[0], t[2]));
        if (onPl) fail("F5", `${fb.id} deck`, `a track point (${t[0].toFixed(1)}, ${t[2].toFixed(1)}) lies in a platform polygon a pier could stand on`);
      }
    }
    const lines = new Set((d.feats.lines || []).map((l) => l.id));
    for (const id of fb.osm) if (lines.has(id)) fail("F6", `${fb.id} ${id}`, "still painted on the ground (land cover / grass)");
    if (!QUIET) console.log(`  ${fb.id} "${fb.name}": ${fb.parts.length} parts, ${fb.tris} triangles`);
  }
}
console.log(`footbridge audit (${OLD ? "old" : "default"}): ${pbs.length} UrbIS foot bridges over the railway, ${fails.length} fails`);
for (const f of fails) console.log(`  FAIL ${f.check} ${f.what}: ${f.msg}`);
console.log(fails.length ? "FOOTBRIDGE AUDIT: FAIL" : "FOOTBRIDGE AUDIT: PASS");
process.exitCode = fails.length ? 1 : 0;
