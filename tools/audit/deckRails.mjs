// DECK RAILS (claude/deckrail 2026-11-18, the collisions browser turn: at Kasteelstraat (E10) two road decks meet at a
// junction and their concrete parapets were drawn across it; on the Carsoel deck (H6) a railing + upstand stood across
// the tram road at the deck's west end, the rails passing under it; the car stopped at both). Rule 17 (+ the JOINS
// rule 9): a deck edge that CONTINUES into a street, another deck, a tram road or a junction carries no parapet /
// railing and no collider; a real drop keeps its railing.
//
// For every OSM road deck (band and plan) of every tile that owns one, the tile worker's whole build in node
// (tools/roadfix/tile.mjs), then:
//   rings   every parapet / railing collider piece (the drive walls of viewer/streets/bridgeDecks.js parapetRings) is
//           sampled along its outer face every 0.5 m: the deck's walked top just inside it vs what is DRIVABLE outside
//           it (the drawn streets of the drive raster, any other deck's top, a tram track on ground at that level): at
//           the deck's level 1 m out (+-0.5 m: the car's step) AND 2 m out (+-0.8 m) = the traffic surface goes on
//           there = a railing ACROSS a street (FAIL, runs >= 1.5 m); or a driven lane / junction turn / tram track crosses
//           the rail there (within 1.6 m, across it) and the surface 1 m out is within 0.6 m of the edge's level. (1 m alone is not enough: a measured street drawn
//           past a deck's edge hangs a 1 m lip over the cutting, Avenue de la Chenaie G7)
//   mesh    every raised triangle of the drawn deck (parapet copings / faces, upstands, rails, posts: > 0.2 m over the deck
//           top) lies on a collider piece (what is drawn is what stops the car, and the other way round)
// --old: the build with ?deckrail=old (entry.deckRail = false: the railings as before).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/deckRails.mjs [--old] [--quiet] [--jobs N] [--out F] [T ...]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const OLD_REF = "docs/deckrail/rails_old.json";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const CHILD = flag("--child"), OLD = flag("--old"), QUIET = flag("--quiet"), OUT = opt("--out", null), JOBS = +opt("--jobs", 4);
export const OUT1 = [1.0, 0.5], OUT2 = [2.0, 0.8], RAISED = 0.2, ON_RING = 0.45;     // [m out, level tolerance m]
// a run counts from 1.5 m: the band decks' parapets come in 2 m pieces, a piece half over the street at the end of a run
// (<= 1 m) is the piece grain, reported as "edge" (not failed)
export const MIN_RUN = 1.5, DROP = 0.8;

// the tiles whose roads.json has a bridge road (a deck is drawn by the tile holding its middle: tileData.js ownDeck)
const manifest = JSON.parse(readFileSync(join(ROOT, "data/tiles/manifest.json"), "utf8"));
const deckTiles = () => manifest.tiles.filter((t) => t.status === "built").map((t) => t.name).filter((T) => {
  const r = JSON.parse(readFileSync(join(ROOT, `data/tiles/${T}/roads.json`), "utf8"));
  return (r.roads || []).some((x) => x.meta?.bridge && x.meta.bridge !== "no");
});

if (!CHILD) {
  const TILES = argv.length ? argv.map((t) => t.toUpperCase()) : deckTiles(), queue = TILES.slice(), res = [], t0 = Date.now();
  const run = (T) => new Promise((ok) => {
    const p = spawn(process.execPath, ["--import", "./tools/road_audit/register.mjs", fileURLToPath(import.meta.url), "--child", T, ...(OLD ? ["--old"] : [])], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (b) => { out += b; }); p.stderr.on("data", (b) => { err += b; });
    p.on("close", (code) => {
      const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop();
      if (code !== 0 || !line) { console.error(`${T}: child exit ${code}: ${err.trim().split("\n").slice(-3).join(" / ")}`); res.push({ tile: T, error: true }); }
      else res.push(JSON.parse(line));
      ok();
    });
  });
  await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => { while (queue.length) await run(queue.shift()); }));
  res.sort((a, b) => a.tile.localeCompare(b.tile));
  let across = 0, acrossM = 0, rings = 0, ringM = 0, stray = 0, decks = 0, errors = 0, grain = 0, open = 0, ghost = 0;
  for (const r of res) {
    if (r.error) { errors++; continue; }
    for (const d of r.decks) {
      decks++; grain += d.grain || 0; open += d.open || 0; ghost += d.ghost || 0; rings += d.rings; ringM += d.ringM; across += d.across.length; acrossM += d.acrossM; stray += d.stray.length;
      if (!QUIET || d.across.length || d.stray.length || d.cuts?.length) console.log(`${r.tile} ${d.id} "${d.name}" (${d.plan ? "plan" : "band"}): ${d.rings} rail pieces (${d.ringM.toFixed(0)} m), across a continuing surface ${d.across.length} (${d.acrossM.toFixed(1)} m), drawn off a collider ${d.stray.length}`);
      if (!QUIET || d.cuts?.length) for (const c of d.cuts || []) console.log(`   cut ${c.m} m (${c.edge != null ? `edge ${c.edge}` : `side ${c.side}`}) ?at=${c.at.join(",")}`);
      for (const a of d.across) console.log(`   ACROSS ?at=${a.at.join(",")} ${a.len.toFixed(1)} m: outside ${a.what} at ${a.dy >= 0 ? "+" : ""}${a.dy.toFixed(2)} m of the deck top`);
      for (const s of d.stray.slice(0, 5)) console.log(`   STRAY ?at=${s.join(",")}: a raised deck triangle with no collider piece within ${ON_RING} m`);
    }
  }
  console.log(`deckRails${OLD ? " (--old)" : ""}: ${decks} decks on ${res.length - errors} tiles, ${rings} rail pieces (${ringM.toFixed(0)} m); ACROSS a continuing street / deck / tram ${across} (${acrossM.toFixed(1)} m) (+ ${grain.toFixed(1)} m in runs under ${MIN_RUN} m: the piece grain); raised triangles off a collider ${stray} | ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // open drops: never more than the old railings left open (docs/deckrail/rails_old.json, made with --old)
  const ref = !OLD && existsSync(join(ROOT, OLD_REF)) ? JSON.parse(readFileSync(join(ROOT, OLD_REF), "utf8")) : null;
  const openOld = ref ? ref.res.flatMap((r) => (r.decks || []).map((d) => [`${r.tile} ${d.id}`, d.open || 0])) : [];
  let more = 0;
  for (const r of res) for (const d of r.decks || []) {
    const o = openOld.find(([k]) => k === `${r.tile} ${d.id}`)?.[1] ?? 0;
    if (ref && (d.open || 0) > o + 1e-6) { more++; console.log(`   OPEN DROP added on ${r.tile} ${d.id}: ${d.open} m unrailed over > ${DROP} m (old ${o} m): ${JSON.stringify(d.openAt.slice(0, 8))}`); }
  }
  console.log(`  car wall pieces with no drawn railing (info): ${ghost}`);
  // what the rule took away vs --old: the old pieces with no new piece within 1.2 m, grouped into places (< 3 m apart)
  if (ref) for (const r of res) for (const d of r.decks || []) {
    const o = ref.res.find((q) => q.tile === r.tile)?.decks.find((q) => q.id === d.id);
    if (!o?.mids) continue;
    const gone = o.mids.filter(([x, z]) => !d.mids.some(([u, v]) => Math.hypot(u - x, v - z) < 1.2)), places = [];
    for (const g of gone) { const p = places.find((q) => q.pts.some(([x, z]) => Math.hypot(x - g[0], z - g[1]) < 3)); if (p) { p.pts.push(g); p.m += g[2]; } else places.push({ pts: [g], m: g[2] }); }
    for (const p of places) { const c = p.pts[Math.floor(p.pts.length / 2)]; console.log(`   REMOVED ${r.tile} ${d.id} "${d.name}": ${p.m.toFixed(1)} m of parapet / railing ?at=${c[0].toFixed(0)},${c[1].toFixed(0)}`); }
  }
  console.log(`  unrailed edge over a drop > ${DROP} m: ${open.toFixed(1)} m${ref ? ` (--old: ${openOld.reduce((a, [, v]) => a + v, 0).toFixed(1)} m; decks with more than before: ${more})` : ""}`);
  if (OUT) writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), old: OLD, res }, null, 1));
  const fail = errors || across || stray || more;
  console.log(fail ? "DECK RAILS: FAIL" : "DECK RAILS: PASS");
  process.exit(fail ? 1 : 0);
}

// ---------------------------------------------------------------- the child: one tile
const T = argv[0];
const { buildTile } = await import("../roadfix/tile.mjs");
const { deckHeight, parapetRings } = await import("../../viewer/streets/bridgeDecks.js");
const realLog = console.log; console.log = () => {};
const d = await buildTile(T, { keepNet: true, ...(OLD ? { deckRail: false } : {}) });
console.log = realLog;
const { hm, drive } = d, h = hm.h, Y = hm.y, g = drive.ground;
// the drawn traffic surface at (x, z) (drive raster: road / sidewalk / tram tops), its height or null
const rasterY = (x, z) => {
  const c = Math.round((x - h.x0) / h.step), r = Math.round((z - h.z0) / h.step);
  if (c < 0 || r < 0 || c >= h.cols || r >= h.rows) return null;
  const k = r * h.cols + c, v = g.delta[k];
  return v > 0 && v !== 65535 ? Y[k] + v / 100 : null;
};
const decks = d.bridgeDecks, tops = decks.map((b) => deckHeight(b, () => -Infinity, { drawn: true }));
// tram tracks (OSM tram lines: the tram road the rails run on)
const tramLines = (d.feats?.lines || []).filter((l) => l.kind === "tram" || l.tags?.railway === "tram").map((l) => l.line);
const nearTram = (x, z) => tramLines.some((L) => L.some((p, i) => {
  if (!i) return false; const [ax, az] = L[i - 1], [bx, bz] = p, dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(ax + dx * t - x, az + dz * t - z) < 1.0;
}));
// the driven lanes / junction turns (the tile's traffic graph) and tram tracks: a segment within LANE m of a rail sample,
// running ACROSS the rail (|cos| > 0.5 with its normal) = traffic goes through the railing there
const LANE = 1.6, laneSegs = [];
{ const T2 = d.traffic; if (T2?.xy) for (let p = 0; p < T2.paths; p++) for (let k = T2.off[p]; k < T2.off[p + 1] - 1; k++) laneSegs.push([T2.xy[k * 2], T2.xy[k * 2 + 1], T2.xy[k * 2 + 2], T2.xy[k * 2 + 3]]);
  for (const L of tramLines) for (let i = 1; i < L.length; i++) laneSegs.push([L[i - 1][0], L[i - 1][1], L[i][0], L[i][1]]); }
const crossing = (x, z, nx, nz) => laneSegs.some(([ax, az, bx, bz]) => {
  if (Math.abs(ax - x) > 30 && Math.abs(bx - x) > 30) return false;
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; if (l2 < 1e-6) return false;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
  return Math.hypot(ax + dx * t - x, az + dz * t - z) < LANE && Math.abs(dx * nx + dz * nz) / Math.sqrt(l2) > 0.5;
});
const out = [];
for (const [di, deck] of decks.entries()) {
  const rings = d.deckRings ? d.deckRings[di] : parapetRings(deck, hm.ground);
  const own = tops[di];
  // the level traffic meets at the edge: the street drawn on the deck 0.5 m inside it (a plan deck's slab is tucked under
  // the measured streets), else the deck's walked top
  const topNear = (x, z, nx, nz) => { for (const s of [0.4, 0.8, 1.2]) { const y = own(x - nx * s, z - nz * s); if (y != null) { const r = rasterY(x - nx * 0.5, z - nz * 0.5); return r != null && Math.abs(r - y) < 0.6 ? r : y; } } return null; };
  const across = [], R = { id: deck.id, name: deck.name, plan: !!deck.plan, rings: rings.length, ringM: 0, across, acrossM: 0, stray: [] };
  let run = null;
  const flush = () => { if (run && run.len >= MIN_RUN) { across.push({ at: run.at.map((v) => +v.toFixed(1)), len: run.len, what: run.what, dy: run.dy }); R.acrossM += run.len; } else if (run) R.grain = (R.grain || 0) + run.len; run = null; };
  for (const w of rings) {
    const [a, b, , e] = w.ring, L = Math.hypot(b[0] - a[0], b[1] - a[1]); R.ringM += L;
    let nx = a[0] - e[0], nz = a[1] - e[1]; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;      // outward: inner -> outer face
    for (let s = 0.25; s < L; s += 0.5) {
      const x = a[0] + (b[0] - a[0]) * s / L, z = a[1] + (b[1] - a[1]) * s / L, yt = topNear(x, z, nx, nz);
      if (yt == null) { flush(); continue; }
      const drivable = ([o, tol]) => {
        const ox = x + nx * o, oz = z + nz * o, ry = rasterY(ox, oz);
        if (ry != null && Math.abs(ry - yt) <= tol) return { what: nearTram(ox, oz) ? "street + tram" : "street", dy: ry - yt };
        for (const [j, f] of tops.entries()) { if (j === di) continue; const y = f(ox, oz); if (y != null && Math.abs(y - yt) <= tol) return { what: `deck ${decks[j].id}`, dy: y - yt }; }
        if (nearTram(ox, oz) && Math.abs(hm.ground(ox, oz) - yt) <= tol) return { what: "tram track", dy: hm.ground(ox, oz) - yt };
        return null;
      };
      // (browser turn) the rail itself stands on another deck higher than this one: it sticks up through that carriageway
      const onOther = tops.some((f, j) => { if (j === di) return false; const y = f(x - nx * 0.15, z - nz * 0.15); return y != null && y - own(x - nx * 0.4, z - nz * 0.4) > 0.15; });
      if (onOther) { if (!run) run = { at: [x, z], len: 0, what: "inside another (higher) deck", dy: 0 }; run.len += 0.5; continue; }
      const q1 = drivable(OUT1), q2 = q1 && drivable(OUT2), ql = !q2 && crossing(x, z, nx, nz) ? drivable([1.0, 0.6]) : null;
      if (!q2 && !ql) { flush(); continue; }
      const { what, dy } = q2 ? q1 : { what: `lane / tram track across, ${ql.what}`, dy: ql.dy };
      if (!run) run = { at: [x, z], len: 0, what, dy };
      run.len += 0.5;
    }
    flush();
  }
  // the drawn raised triangles (parapet / railing parts) vs the collider pieces
  const P = deck.mesh?.position, raised = [];
  if (P) {
    const segs = rings.map((w) => [w.ring[0], w.ring[1], w.ring[2], w.ring[3]]);
    const dSeg = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
    const seen = new Set();
    for (let t = 0; t < P.length; t += 9) {
      const cx = (P[t] + P[t + 3] + P[t + 6]) / 3, cz = (P[t + 2] + P[t + 5] + P[t + 8]) / 3, lo = Math.min(P[t + 1], P[t + 4], P[t + 7]);
      let yt = null; for (const [ox, oz] of [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) { const y = own(cx + ox, cz + oz); if (y != null) yt = yt == null ? y : Math.max(yt, y); }
      if (yt == null || lo < yt + RAISED) continue;
      raised.push([cx, cz]);
      if (segs.some((q) => dSeg(cx, cz, q[0], q[1]) < ON_RING || dSeg(cx, cz, q[3], q[2]) < ON_RING)) continue;
      const key = `${Math.round(cx)},${Math.round(cz)}`;
      if (!seen.has(key)) { seen.add(key); R.stray.push([+cx.toFixed(1), +cz.toFixed(1)]); }
    }
  }
  // OPEN DROPS: along every edge (band: both sides over the span; plan: the ring), every 0.5 m, no rail piece within
  // ON_RING m and the deck top more than DROP m over the highest thing 1 m out (street, deck, terrain): a car / walker
  // can fall off there unrailed. Compared with --old by the parent (a cut must never open a drop)
  const edges = [];
  if (deck.plan) {
    const ring = deck.plan.ring; let a2 = 0; for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length]; a2 += ax * bz - bx * az; }
    const sg = a2 > 0 ? 1 : -1;
    for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az); if (L < 0.3) continue;
      for (let s = 0.25; s < L; s += 0.5) edges.push([ax + (bx - ax) * s / L, az + (bz - az) * s / L, (bz - az) / L * sg, -(bx - ax) / L * sg]); }
  } else {
    const P2 = deck.pts, C2 = deck.cum, [s0, s1] = deck.span;
    for (let s = s0 + 0.25; s < s1; s += 0.5) {
      let i = 1; while (i < P2.length - 1 && C2[i] < s) i++;
      const [ax, az] = P2[i - 1], [bx, bz] = P2[i], L = C2[i] - C2[i - 1] || 1, f = (s - C2[i - 1]) / L, tx = (bx - ax) / L, tz = (bz - az) / L, x = ax + (bx - ax) * f, z = az + (bz - az) * f;
      for (const sg of [1, -1]) edges.push([x + tz * sg * deck.half, z - tx * sg * deck.half, tz * sg, -tx * sg]);
    }
  }
  const segs2 = rings.map((w) => [w.ring[0], w.ring[1]]);
  const dS = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
  // (railed = a DRAWN railing part within 0.75 m: what the player sees; the car walls follow it, the STRAY check. --old's
  // plan-deck car walls came in 2 m pieces over the drawn railings' 1 m ones: walls where nothing is drawn, "ghost")
  R.open = 0; R.openAt = [];
  for (const [x, z, nx, nz] of edges) {
    const yt = topNear(x, z, nx, nz);
    if (yt == null || raised.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.75)) continue;
    const ox = x + nx, oz = z + nz, cand = [rasterY(ox, oz), hm.ground(ox, oz), ...tops.map((f, j) => (j === di ? null : f(ox, oz)))].filter((v) => v != null && Number.isFinite(v));
    if (!cand.length || yt - Math.max(...cand) <= DROP) continue;
    R.open += 0.5; if (R.openAt.length < 40) R.openAt.push([+x.toFixed(1), +z.toFixed(1), +(yt - Math.max(...cand)).toFixed(2)]);
  }
  // the pieces the rule cut (deck.railCut, bridgeDecks.js markRailCuts): runs, for the report (?at= the run's middle)
  R.cuts = [];
  if (deck.railCut?.plan) deck.railCut.plan.forEach((m, i) => {
    const ring = deck.plan.ring, [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    for (let k = 0; k < m.length; k++) { if (!m[k] || m[k - 1]) continue; let e = k; while (m[e + 1]) e++; const f = (k + e + 1) / 2 / m.length; R.cuts.push({ edge: i, at: [+(ax + (bx - ax) * f).toFixed(1), +(az + (bz - az) * f).toFixed(1)], m: +((e - k + 1) * Math.hypot(bx - ax, bz - az) / m.length).toFixed(1) }); }
  });
  if (deck.railCut?.band) deck.railCut.band.forEach((m, si) => {
    const sg = si ? -1 : 1, [s0, s1] = deck.span, P2 = deck.pts, C2 = deck.cum, step = (s1 - s0) / m.length;
    const pt = (s) => { let i = 1; while (i < P2.length - 1 && C2[i] < s) i++; const [ax, az] = P2[i - 1], [bx, bz] = P2[i], L = C2[i] - C2[i - 1] || 1, f = (s - C2[i - 1]) / L; return [ax + (bx - ax) * f + (bz - az) / L * sg * deck.half, az + (bz - az) * f - (bx - ax) / L * sg * deck.half]; };
    for (let k = 0; k < m.length; k++) { if (!m[k] || m[k - 1]) continue; let e = k; while (m[e + 1]) e++; const c = pt(s0 + (k + e + 1) / 2 * step); R.cuts.push({ side: sg, at: c.map((v) => +v.toFixed(1)), m: +((e - k + 1) * step).toFixed(1) }); }
  });
  R.mids = rings.map((w) => { const [a, b] = w.ring; return [+((a[0] + b[0]) / 2).toFixed(2), +((a[1] + b[1]) / 2).toFixed(2), +Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(2)]; });
  // ghost walls: a collider piece with no drawn railing part within 0.75 m of its middle (info)
  R.ghost = rings.filter((w) => { const [a, b] = w.ring, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; return !raised.some(([px, pz]) => Math.hypot(px - mx, pz - mz) < 0.75); }).length;
  out.push(R);
}
console.log(JSON.stringify({ tile: T, decks: out }));
