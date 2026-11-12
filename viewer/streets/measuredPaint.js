// Paint "v2", phase 1 of docs/ROADS_V2_RESEARCH.md: STOP INVENTING. Runs in the tile worker's road stage
// (viewer/roadBuild.js) around the vendored road engine, which stays untouched (vendor/ is read-only): everything is
// done through the engine's inputs (node.crosswalks, node.control, the lane stacks), by post-processing its output
// (node.markings, rr.markRange, the asphalt's paint attributes) and with our own decal mesh for measured paint.
//
// Where UrbIS maps the street (the tile's measured surfaces):
//   crossings     the MEASURED ones (markings.json: Brussels Mobility polygons, UrbIS Topo CR2301L pairs, OSM marked
//                 crossing nodes), drawn kerb to kerb on the measured carriageway; no engine zebra on every arm
//   stop lines    UrbIS Topo CR2302L / CR2303L as surveyed; otherwise only where a controller exists (an OSM signal
//                 junction, an OSM stop / give_way node or a Brussels Mobility B5 / B1 sign on that approach), placed
//                 1.5 m upstream of that arm's crossing (or 0.5 m past the measured junction polygon), across the
//                 INCOMING lanes only, from the road's centre to the measured kerb. No guess from road rank.
//   centre lines  none on residential streets (local / oneWay / alley) unless UrbIS Topo has a line there (owner
//                 decision 1, 2026-11-10, after the orthophoto sample: docs/roads/centreline_sample)
//   cycle lanes   only where OSM tags one; OSM shared_lane = sharrow symbols in the traffic lane, not a lane
//   parking       guessed parking lanes keep their space (the parked cars stand there) but get no paint
// Roads and junctions UrbIS does not map (Flemish side, private lanes) keep the engine's rules (owner decision 3).
// Plain JS, no three.js.
import { ROAD_TYPES, LANE_TYPES } from "../../vendor/roads/roadCrossSection.js";
import { armPoint } from "../../vendor/roads/roadJunction.js";
import { lineCode } from "../../vendor/roads/mesh/laneRoadMesh.js";
import { markingStyle } from "../../vendor/roads/roadMarkings.js";
import { hashPhase } from "../roadData.js";
import { approachSpan } from "./inventory.js";

export const PAINT_LIFT = 0.02;      // decal paint above H (the engine layer is LIFT 6 mm + tiers + DEV 12 mm at most)
const MARKABLE = new Set([0, 1, 3]);  // roadway / junction, tram-shared roadway, parking
const CARRIAGE = new Set([0, 1, 2, 3]);
const RESIDENTIAL = new Set(["local", "oneWay", "alley"]);
const OSM_ALONG = 3.5;               // m: band width of a crossing OSM tags but nobody measured (the BM polygons' median: 3.46)
const OSM_MAX_ACROSS = 14;
const PHOTO_NO = 0.4;                // orthophoto bar score under which the photo shows no zebra (pipeline/verify_crossings.mjs)
const PHOTO_OSM = 0.4;               // an OSM-only crossing needs at least this
const PHOTO_YES = 0.5;               // clear bars
const OSM_NEAR = 8;                  // m: an OSM node this close to a kept measured outline is that crossing           // m: wider than this kerb to kerb, an OSM crossing node is inside a junction
const STRIPE = 0.5, STRIPE_PERIOD = 1.0;
const TOOTH = { base: 0.5, gap: 0.25, tall: 0.7 };
const SHARROW_STEP = 40;
const PARKING_CODE = lineCode(markingStyle("parking", "eu", 1));

const clone = (o) => JSON.parse(JSON.stringify(o));
const pip = (x, z, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const lineDist = (x, z, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segD(x, z, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
const area2 = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1]; return a / 2; };
function hull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** subject ∩ convex clip (Sutherland-Hodgman) */
function clipConvex(subject, clip) {
  let out = subject;
  const s = area2(clip) > 0 ? 1 : -1;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const side = (p) => s * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const inp = out; out = [];
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out;
}

/** The stack the engine would use for road r (its own lanes, else the type default), deep-copied. */
function stackOf(r) {
  if (r.lanes) return clone(r.lanes);
  const t = ROAD_TYPES[r.type] || ROAD_TYPES.local;
  const mark = (side) => side.map((l) => ({ ...l, ...(l.type === "bike" || l.type === "parking" ? { guess: true } : {}) }));
  return { center: { ...t.center, ...(t.center.kind === "line" ? { guess: true } : {}) }, left: mark(t.left), right: mark(t.right), _default: true };
}

/** Before fitRoadWidths and the engine: decide what is mapped, edit the inputs. Returns the paint context. */
export function preparePaintV2(roads, prep, markings, bounds) {
  const ctx = { prep, markings, bounds, mapped: new Set(), mappedNodes: new Set(), suppressed: new Set(), sharrow: new Map(),
    stats: { centreRemoved: 0, centreKept: 0, bikeRemoved: 0, sharrowRoads: 0, parkingUnpainted: 0, nodesMapped: 0, nodesEngine: 0, engineStopsStripped: 0 } };
  if (!prep) return ctx;
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const topo = (markings?.lines || []).filter((l) => l.kind === "solid" || l.kind === "dashed");
  const near = (x, z) => [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dz]) => prep.classAt(x + dx, z + dz) >= 0);
  for (const r of roads.roads) {
    const pts = [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean);
    let n = 0, on = 0, cl = 0, cn = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.z - a.z);
      for (let d = 0; d < L; d += 4) {
        const x = a.x + (b.x - a.x) * (d / L), z = a.z + (b.z - a.z) * (d / L);
        if (!prep.inside(x, z)) continue;
        n++; if (near(x, z)) on++;
        cn++; if (topo.some((l) => lineDist(x, z, l.line) < 1.5)) cl++;
      }
    }
    if (!n || on < 0.2 * n) continue;              // UrbIS does not map it here: the engine's rules (owner decision 3)
    ctx.mapped.add(r.id);
    const st = stackOf(r);
    const residential = RESIDENTIAL.has(r.type);
    // centre line: residential streets only with a measured line along them
    if (residential && st.center?.kind === "line" && (st.center.guess || st._default)) {
      if (cn && cl >= 0.4 * cn) ctx.stats.centreKept++;
      else { st.center.kind = "none"; ctx.stats.centreRemoved++; }
    }
    // cycle lanes: only tagged ones; shared_lane -> sharrows in the traffic lane
    const sh = { left: false, right: false };
    for (const side of ["left", "right"]) {
      const keep = [];
      for (const l of st[side] || []) {
        if (l.type === "bike" && (l.guess || l.sharrow)) { if (l.sharrow) sh[side] = true; ctx.stats.bikeRemoved++; continue; }
        if (l.type === "parking" && l.guess) { ctx.suppressed.add(`${r.id}|parking`); ctx.suppressed.add(`${r.id}|parkingTick`); }
        keep.push(l);
      }
      st[side] = keep;
    }
    if (ctx.suppressed.has(`${r.id}|parking`)) ctx.stats.parkingUnpainted++;
    if (sh.left || sh.right) { ctx.sharrow.set(r.id, sh); ctx.stats.sharrowRoads++; }
    delete st._default;
    r.lanes = st;
  }
  // a node is mapped when the measured street is under it, or (outside the tile, where this tile's raster says
  // nothing) when one of its roads is mapped
  const touches = new Map();
  for (const r of roads.roads) if (ctx.mapped.has(r.id)) for (const id of [r.a, r.b]) touches.set(id, true);
  for (const n of roads.nodes) {
    if (n.meta?.cut) continue;
    if (prep.inside(n.x, n.z) ? !near(n.x, n.z) : !touches.get(n.id)) continue;
    ctx.mappedNodes.add(n.id);
    n.crosswalks = false;                          // measured crossings instead (drawn by paintMeshV2)
    if (n.kind !== "roundabout" && n.control !== "signal") n.control = "priority";   // no stop / yield from road rank
  }
  return ctx;
}

const rect = (arm, s0, s1, t0, t1) => [armPoint(arm, s0, t0), armPoint(arm, s1, t0), armPoint(arm, s1, t1), armPoint(arm, s0, t1)];
const same = (P, Q) => P.length === Q.length && P.every((p, i) => Math.abs(p[0] - Q[i][0]) < 0.01 && Math.abs(p[1] - Q[i][1]) < 0.01);

/** After the engine: strip its stop lines on mapped junctions, place the measured / derived paint, end the lane lines
 *  before the crossings. Returns { items, inventory }. */
export function afterNetworkV2(net, ctx, surf) {
  const { prep, markings, bounds } = ctx;
  const inv = { crossings: [], stops: [], symbols: [], engineNodes: [], suppressed: [...ctx.suppressed], stats: ctx.stats };
  if (!prep) { inv.engineNodes = net.nodes.map((n) => n.id); return { items: [], inventory: inv }; }
  const cls = (x, z) => prep.classAt(x, z);
  const margin = 30;
  const near = (x, z) => x >= bounds.x0 - margin && x < bounds.x1 + margin && z >= bounds.z0 - margin && z < bounds.z1 + margin;
  const junctionPolys = (surf?.surfaces || []).filter((s) => s.type === "I" || s.type === "IC").map((s) => s.rings[0]);
  const inJunction = (x, z) => junctionPolys.some((r) => pip(x, z, r));
  const junctions = [];
  for (const n of net.nodes) {
    if (!ctx.mappedNodes.has(n.id)) { inv.engineNodes.push(n.id); ctx.stats.nodesEngine++; continue; }
    ctx.stats.nodesMapped++;
    if ((n.kind === "junction" || n.kind === "roundabout") && n.arms.length >= 3) junctions.push(n);
    if (n.kind !== "junction") continue;
    // round 2: on a mapped junction the engine's own glyphs are guesses (turn arrows from its lane stack, drawn
    // half-cut by the measured clip: the owner's "broken turn arrows"); UrbIS Topo has the arrows it surveyed
    // (CR2401P / 2402P / 2410P) but no legend of their kinds yet: none are drawn rather than wrong ones
    const nm = (n.markings || []).filter((m) => m.tag !== "zebra").length;
    if (nm) { ctx.stats.engineGlyphsStripped = (ctx.stats.engineGlyphsStripped || 0) + nm; n.markings = (n.markings || []).filter((m) => m.tag === "zebra"); }
    // the engine's signal stop lines: our own placement replaces them
    const drop = [];
    for (const a of n.arms) {
      if (a.control !== "signal" && a.control !== "stop" || a.stopStation == null || !a.approach?.length) continue;
      const [tIn, tOut] = approachSpan(a), w = a.control === "stop" ? 0.5 : 0.35;
      drop.push(rect(a, a.stopStation, a.stopStation + w, tIn, tOut));
    }
    if (drop.length) {
      const before = n.markings.length;
      n.markings = n.markings.filter((m) => !(m.kind === "poly" && !m.tag && drop.some((d) => same(m.pts, d))));
      ctx.stats.engineStopsStripped += before - n.markings.length;
    }
  }
  const items = [];
  /** the arm of a mapped junction a point lies on */
  const armOf = (x, z, reach = 25) => {
    let best = null;
    for (const n of junctions) {
      if (Math.hypot(n.x - x, n.z - z) > 90) continue;
      for (const a of n.arms) {
        const ox = x - a.ox, oz = z - a.oz, sg = ox * a.dx + oz * a.dz, t = ox * a.nx + oz * a.nz;
        if (sg < -1 || sg > a.trim + reach || t < a.edges.curbR - 2 || t > a.edges.curbL + 2) continue;
        const sc = Math.abs(t) + Math.max(0, -sg) * 3;
        if (!best || sc < best.sc) best = { node: n, arm: a, sigma: sg, t, sc };
      }
    }
    return best;
  };
  const ray = (x, z, dx, dz, max = 25) => { for (let d = 0.1; d < max; d += 0.1) if (!CARRIAGE.has(cls(x + dx * d, z + dz * d))) return d; return null; };

  // ---- crossings
  const xArms = [];
  // Round 2: ONE crossing per real crossing, and only where the 2024 orthophoto does not contradict it
  // (pipeline/verify_crossings.mjs wrote `photo` into each record: s = the zebra-bar score of the photo there).
  //  - a measured outline (BM / Topo) the photo clearly shows WITHOUT bars on open asphalt is gone (re-designed
  //    junctions: Place de Saint-Job's bm:13395 was moved; the photo is the latest survey). Under trees the photo
  //    cannot tell: kept.
  //  - an OSM-only node needs the photo's bars (s >= PHOTO_OSM) and must not sit within OSM_NEAR m of a kept measured
  //    outline unless the bars are clear (s >= PHOTO_YES): the OSM nodes on every way a long diagonal crossing passes
  //    (tram tracks, both carriageways) are that crossing, not more crossings.
  //  - a band overlapping one already drawn (bm, then topo, then osm) is the same crossing.
  const photoNo = (c) => !!c.photo && c.photo.s < PHOTO_NO && (c.photo.veg ?? 0) < 0.15;
  const keptMeasured = (markings?.crossings || []).filter((c) => c.poly && near(c.c[0], c.c[1]) && !photoNo(c));
  const measuredPolys = keptMeasured.map((c) => hull(c.poly));
  const ringD = (x, z, ring) => { if (pip(x, z, ring)) return 0; let d = Infinity; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) d = Math.min(d, segD(x, z, ring[j][0], ring[j][1], ring[i][0], ring[i][1])); return d; };
  const drawnPolys = [];
  inv.stats.crossingsPhotoDropped = 0; inv.stats.crossingsOsmNear = 0; inv.stats.crossingsOverlap = 0;
  const ORDER = { bm: 0, topo: 1, osm: 2 };
  const xlist = [...(markings?.crossings || [])].sort((a, b) => (ORDER[a.src] ?? 3) - (ORDER[b.src] ?? 3));
  for (const c of xlist) {
    if (!near(c.c[0], c.c[1])) continue;
    if (photoNo(c) && (c.poly || c.photo.s < PHOTO_OSM)) { inv.stats.crossingsPhotoDropped++; continue; }
    if (!c.poly && c.photo && c.photo.s < PHOTO_OSM && (c.photo.veg ?? 0) < 0.15) { inv.stats.crossingsPhotoDropped++; continue; }
    if (!c.poly && !(c.photo && c.photo.s >= PHOTO_YES) && measuredPolys.some((m) => ringD(c.c[0], c.c[1], m) < OSM_NEAR)) { inv.stats.crossingsOsmNear++; continue; }
    let poly = c.poly, along = c.along, axis = c.axis;
    const ax = Math.cos(axis), az = Math.sin(axis), bx = -az, bz = ax;
    if (!poly) {
      // an OSM crossing node: a band OSM_ALONG wide across the measured carriageway at the node
      const [x, z] = c.c;
      if (!CARRIAGE.has(cls(x, z))) continue;
      const kp = ray(x, z, bx, bz), km = ray(x, z, -bx, -bz);
      if (kp == null || km == null || kp + km > OSM_MAX_ACROSS) continue;     // inside a wide junction: no derived band
      along = OSM_ALONG;
      let ulo = -along / 2, uhi = along / 2;
      // keep clear of a surveyed stop line inside the band (signalised crossings have one on each side)
      for (const st of markings?.stops || []) {
        const m = st.line[Math.floor(st.line.length / 2)], mu = (m[0] - x) * ax + (m[1] - z) * az, mv = (m[0] - x) * bx + (m[1] - z) * bz;
        if (Math.abs(mv) > Math.max(kp, km) + 1 || Math.abs(mu) > along / 2 + 0.6) continue;
        if (mu > 0) uhi = Math.min(uhi, mu - 0.6); else ulo = Math.max(ulo, mu + 0.6);
      }
      if (uhi - ulo < 2.0) { ulo = -along / 2; uhi = along / 2; }
      poly = [[x + ax * ulo - bx * km, z + az * ulo - bz * km], [x + ax * uhi - bx * km, z + az * uhi - bz * km], [x + ax * uhi + bx * kp, z + az * uhi + bz * kp], [x + ax * ulo + bx * kp, z + az * ulo + bz * kp]];
    }
    poly = hull(poly);
    // a band that overlaps one already drawn is the same crossing
    if (drawnPolys.some((m) => { const o = clipConvex(poly, m); return o.length >= 3 && Math.abs(area2(o)) > 0.5; })) { inv.stats.crossingsOverlap++; continue; }
    drawnPolys.push(poly);
    // the band's frame: u along the road (the stripes' length), v across (kerb to kerb)
    const [cx, cz] = c.c;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of poly) {
      const u = (p[0] - cx) * ax + (p[1] - cz) * az, v = (p[0] - cx) * bx + (p[1] - cz) * bz;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    // stripes kerb to kerb on the MEASURED carriageway (not past it), centred so the leftover splits evenly
    const kp = ray(cx, cz, bx, bz, 30), km = ray(cx, cz, -bx, -bz, 30);
    const lo = km != null ? Math.max(v0, -km + 0.15) : v0, hi = kp != null ? Math.min(v1, kp - 0.15) : v1;
    const width = hi - lo, n = Math.max(1, Math.floor((width + STRIPE) / STRIPE_PERIOD));
    const start = lo + (width - ((2 * n - 1) * STRIPE)) / 2;
    const am = armOf(cx, cz);
    items.push({ kind: "zebra", poly, frame: { o: [cx, cz], a: [ax, az], b: [bx, bz], u0, u1, v0: start, n } });
    const rec = { id: c.id, src: c.src, poly, c: [cx, cz], axis, along: u1 - u0, across: hi - lo, vSpan: [lo, hi], drawn: "decal", confirm: c.confirm, rule: c.rule || false,
      node: am?.node.id ?? null, road: am?.arm.road.id ?? null, end: am?.arm.end ?? null, sigma: am ? Math.round(am.sigma * 100) / 100 : null };
    inv.crossings.push(rec);
    if (am) xArms.push({ am, rec });
  }
  // lane lines end before a crossing on a junction arm (they used to stop at the engine's zebra)
  for (const { am, rec } of xArms) {
    const rr = am.arm.road;
    if (!rr.markRange) continue;
    const s = am.sigma + rec.along / 2 + 0.5;
    if (s > rr.L / 2) continue;
    if (am.arm.end === "a") { rr.markRange[0] = Math.max(rr.markRange[0], s); if (rr.walkRange) rr.walkRange[0] = Math.max(rr.walkRange[0], s); }
    else { rr.markRange[1] = Math.min(rr.markRange[1], rr.L - s); if (rr.walkRange) rr.walkRange[1] = Math.min(rr.walkRange[1], rr.L - s); }
  }

  // ---- stop and give-way lines: measured first
  const measuredOn = new Set();
  for (const s of markings?.stops || []) {
    const L0 = s.line;
    if (L0.length < 2 || !near(L0[0][0], L0[0][1])) continue;
    // round 2: one straight line per surveyed record (Topo digitises some as 2-3 pieces at slightly different angles:
    // the owner's crooked, misaligned dashes), its kerb end carried on to the measured kerb (0.3 m short) when the
    // survey stops less than 3.5 m before it: a stop line spans its approach
    let p = L0[0], q = L0[L0.length - 1];
    {
      const len0 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len0 > 0.3) {
        const ux = (q[0] - p[0]) / len0, uz = (q[1] - p[1]) / len0;
        const kq = ray(q[0], q[1], ux, uz, 6), kp = ray(p[0], p[1], -ux, -uz, 6);
        if (kq != null && kq > 0.35 && kq < 3.5 && (kp == null || kq <= kp)) q = [q[0] + ux * (kq - 0.3), q[1] + uz * (kq - 0.3)];
        else if (kp != null && kp > 0.35 && kp < 3.5) p = [p[0] - ux * (kp - 0.3), p[1] - uz * (kp - 0.3)];
        if (kq != null && kp != null && kq < 3.5 && kp < 3.5 && kq + kp + len0 < 7.5) {      // a one-way approach: kerb to kerb
          if (Math.hypot(q[0] - L0[L0.length - 1][0], q[1] - L0[L0.length - 1][1]) < 0.01 && kq > 0.35) q = [q[0] + ux * (kq - 0.3), q[1] + uz * (kq - 0.3)];
          if (Math.hypot(p[0] - L0[0][0], p[1] - L0[0][1]) < 0.01 && kp > 0.35) p = [p[0] - ux * (kp - 0.3), p[1] - uz * (kp - 0.3)];
        }
      }
    }
    const L = [p, q];
    for (let i = 1; i < L.length; i++) {
      const [p, q] = [L[i - 1], L[i]], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 0.3) continue;
      const ux = (q[0] - p[0]) / len, uz = (q[1] - p[1]) / len;
      let nx = -uz, nz = ux;                         // the line's normal; teeth point upstream (away from the junction)
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const am = armOf(m[0], m[1], 30);
      if (am) { const dot = nx * am.arm.dx + nz * am.arm.dz; if (dot < 0) { nx = -nx; nz = -nz; } if (s.kind === "stop") measuredOn.add(`${am.node.id}|${am.arm.road.id}|${am.arm.end}`); else measuredOn.add(`${am.node.id}|${am.arm.road.id}|${am.arm.end}`); }
      items.push(lineItem(s.kind, p, q, nx, nz, s.kind === "stop" ? 0.5 : TOOTH.tall));
      inv.stops.push({ id: s.id, src: "topo", kind: s.kind, line: [p, q], node: am?.node.id ?? null, road: am?.arm.road.id ?? null, end: am?.arm.end ?? null, controller: `topo:${s.type}` });
    }
  }
  // then derived, only where a controller exists
  const ctrls = (markings?.osm?.control || []).filter((c) => c.kind === "give_way" || c.kind === "stop");
  const signs = markings?.signs || [];
  for (const n of junctions) {
    if (n.kind !== "junction") continue;
    for (const a of n.arms) {
      if (!a.approach?.length) continue;
      const key = `${n.id}|${a.road.id}|${a.end}`;
      if (measuredOn.has(key)) continue;
      // an internal link of one junction (a short road between two mapped junction nodes, e.g. the merged node of
      // Place de Saint-Job): its "approach" is inside the junction, a stop line there floats in the middle of it
      const far = a.end === "a" ? a.road.armB : a.road.armA;
      if (a.road.L < 30 && far?.node && far.node.kind === "junction" && ctx.mappedNodes.has(far.node.id)) { ctx.stats.stopsInternalLink = (ctx.stats.stopsInternalLink || 0) + 1; continue; }
      const inCorr = (x, z, latMax) => { const ox = x - a.ox, oz = z - a.oz, sg = ox * a.dx + oz * a.dz, t = ox * a.nx + oz * a.nz; return sg >= -2 && sg <= a.trim + 30 && t >= a.edges.curbR - 1 && t <= a.edges.curbL + latMax ? { sg, t } : null; };
      let kind = null, controller = null;
      if (n.control === "signal") { kind = "stop"; controller = "osm:traffic_signals"; }
      for (const c of ctrls) {
        const h = inCorr(c.x, c.z, 3);
        if (!h) continue;
        // a direction-tagged sign only for traffic toward the node: the way's direction vs the arm (away from the node)
        if (c.dir) { const wd = [Math.cos(c.th) * c.dir, Math.sin(c.th) * c.dir]; if (wd[0] * a.dx + wd[1] * a.dz > 0.3) continue; }
        kind = c.kind === "stop" ? "stop" : kind === "stop" ? "stop" : "giveway"; controller = `${c.id}:${c.kind}`;
      }
      if (!kind) for (const s of signs) {
        const h = inCorr(s.x, s.z, 7);
        if (!h || h.t < 0) continue;                 // the approaching driver's right is +t
        kind = s.code === "B5" ? "stop" : "giveway"; controller = `${s.id}:${s.code}`;
      }
      if (!kind) continue;
      // station: upstream of this arm's crossing, else just past the measured junction polygon
      const [tIn0, tOut0] = approachSpan(a);
      const tMid = (tIn0 + tOut0) / 2;
      // the outer edge of the crossings on this arm, from their outlines projected on the arm (not their own axis,
      // which at a junction mouth may be the neighbouring street's)
      let sg = null;
      const polys = inv.crossings.map((c) => c.poly);
      for (const c of inv.crossings) {
        const oc = [c.c[0] - a.ox, c.c[1] - a.oz], sc = oc[0] * a.dx + oc[1] * a.dz, tc = oc[0] * a.nx + oc[1] * a.nz;
        if (sc < 0 || sc > a.trim + 30 || tc < a.edges.curbR - 1 || tc > a.edges.curbL + 1) continue;
        let outer = -Infinity;
        for (const p of c.poly) outer = Math.max(outer, (p[0] - a.ox) * a.dx + (p[1] - a.oz) * a.dz);
        sg = Math.max(sg ?? -Infinity, outer + 1.0);
      }
      if (sg == null) {
        let exit = null;
        for (let s = 0; s <= a.trim + 15; s += 0.25) {
          const [x, z] = armPoint(a, s, tMid);
          if (inJunction(x, z)) exit = null; else if (exit == null && s > 0) exit = s;
          if (exit != null && s - exit > 1.5) break;
        }
        sg = exit != null ? exit + 0.5 : a.trim + 1.0;
      }
      const w = kind === "stop" ? (n.control === "signal" ? 0.4 : 0.5) : TOOTH.tall;
      // lateral: from the road's centre to the measured kerb on the incoming side (both kerbs on a one-way approach)
      const twoWay = (a.lanesR || []).some((l) => l.drive && l.w > 0.3);
      const [cx, cz] = armPoint(a, sg + w / 2, twoWay ? tIn0 + 0.3 : tMid);
      if (!CARRIAGE.has(cls(cx, cz))) continue;
      const kL = ray(cx, cz, a.nx, a.nz, 20);
      if (kL == null) continue;
      const t1 = (twoWay ? tIn0 + 0.3 : tMid) + kL - 0.3;
      let t0 = twoWay ? tIn0 + 0.1 : tMid - ((ray(cx, cz, -a.nx, -a.nz, 20) ?? 0.3) - 0.3);
      if (t1 - t0 < 1.5) continue;
      // never on a crossing: step outward until the line's band clears every crossing outline
      const hits = (s0) => { const band = [armPoint(a, s0, t0), armPoint(a, s0, t1), armPoint(a, s0 + w, t1), armPoint(a, s0 + w, t0)];
        return polys.some((P) => clipConvex(band, P).length >= 3 && Math.abs(area2(clipConvex(band, P))) > 0.01); };
      let tries = 0;
      while (hits(sg) && tries++ < 40) sg += 0.25;
      if (tries > 40) continue;
      const p = armPoint(a, sg, t0), q = armPoint(a, sg, t1);
      // never inside the measured junction polygon, never a stray dash
      const mid = armPoint(a, sg + w / 2, (t0 + t1) / 2);
      if (inJunction(mid[0], mid[1]) || t1 - t0 < 2.5) { ctx.stats.stopsDropped = (ctx.stats.stopsDropped || 0) + 1; continue; }
      items.push(lineItem(kind, p, q, a.dx, a.dz, w));
      inv.stops.push({ id: `v2:${key}`, src: controller.startsWith("osm") ? "osm" : "bm", kind, line: [armPoint(a, sg + w / 2, t0), armPoint(a, sg + w / 2, t1)],
        node: n.id, road: a.road.id, end: a.end, controller });
    }
  }

  // ---- sharrows: a bike symbol + chevrons in the outer traffic lane every SHARROW_STEP m
  for (const rr of net.roads) {
    const sh = ctx.sharrow.get(rr.id);
    if (!sh || !rr.smp) continue;
    for (const side of ["left", "right"]) {
      if (!sh[side]) continue;
      for (let s = rr.s0 + 12; s < rr.s1 - 12; s += SHARROW_STEP) {
        let i = 1; while (i < rr.smp.s.length - 1 && rr.smp.s[i] < s) i++;
        const lay = rr.lays[i];
        const lanes = (lay[side] || []).filter((l) => l.present && LANE_TYPES[l.type]?.drive);
        if (!lanes.length) continue;
        const l = lanes[lanes.length - 1], t = (l.tIn + l.tOut) / 2;
        const th = rr.smp.th[i], nx = Math.sin(th), nz = -Math.cos(th);
        const x = rr.smp.x[i] + nx * t, z = rr.smp.z[i] + nz * t;
        if (!MARKABLE.has(cls(x, z))) continue;
        const dir = side === "right" ? th : th + Math.PI;
        items.push(...sharrow(x, z, dir));
        inv.symbols.push({ id: `v2:sharrow:${rr.id}:${side}:${Math.round(s)}`, src: "osm", kind: "sharrow", x, z, dir, road: rr.id });
      }
    }
  }
  return { items, inventory: inv };
}

/** A transverse line from p to q, `w` deep toward (dx, dz) (upstream). kind stop: a solid band; giveway: teeth. */
function lineItem(kind, p, q, dx, dz, w) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1]), bx = (q[0] - p[0]) / len, bz = (q[1] - p[1]) / len;
  const poly = [p, q, [q[0] + dx * w, q[1] + dz * w], [p[0] + dx * w, p[1] + dz * w]];
  return { kind: kind === "stop" ? "solid" : "teeth", poly: hull(poly), frame: { o: p, a: [dx, dz], b: [bx, bz], u0: 0, u1: w, v0: 0, vLen: len } };
}

/** The Belgian shared-lane symbol: a bicycle (two wheels, a frame) and two chevrons ahead, ~1.0 x 2.6 m. */
function sharrow(x, z, dir) {
  const fx = Math.cos(dir), fz = Math.sin(dir), lx = -fz, lz = fx;
  const P = (u, v) => [x + fx * u + lx * v, z + fz * u + lz * v];
  const bar = (u0, v0, u1, v1, w) => {
    const du = u1 - u0, dv = v1 - v0, L = Math.hypot(du, dv) || 1, nu = (-dv / L) * w / 2, nv = (du / L) * w / 2;
    const poly = [P(u0 + nu, v0 + nv), P(u1 + nu, v1 + nv), P(u1 - nu, v1 - nv), P(u0 - nu, v0 - nv)];
    return { kind: "solid", poly, frame: null };
  };
  const out = [];
  const ring = (cu, cv, r, w) => { const K = 14; for (let k = 0; k < K; k++) { const a0 = (k / K) * Math.PI * 2, a1 = ((k + 1) / K) * Math.PI * 2; out.push(bar(cu + Math.cos(a0) * r, cv + Math.sin(a0) * r, cu + Math.cos(a1) * r, cv + Math.sin(a1) * r, w)); } };
  ring(-0.9, 0, 0.32, 0.07); ring(0.3, 0, 0.32, 0.07);           // wheels (u along the travel direction)
  out.push(bar(-0.9, 0, -0.45, 0.02, 0.07), bar(-0.45, 0.02, 0.3, 0, 0.07), bar(-0.9, 0, -0.25, -0.02, 0.07), bar(-0.25, -0.02, -0.45, 0.02, 0.07));
  out.push(bar(-0.25, -0.02, 0.3, 0, 0.07), bar(-0.5, 0.02, -0.55, 0.12, 0.07), bar(0.25, 0, 0.12, 0.2, 0.07));
  for (const u of [0.95, 1.35]) out.push(bar(u, -0.45, u + 0.35, 0, 0.12), bar(u + 0.35, 0, u, 0.45, 0.12));   // chevrons
  return out;
}

/** Guessed parking lanes keep their space but lose their paint: zero the parking line code and the bay ticks on the
 *  asphalt vertices of those roads (aEdges.zw = line codes, aMark.w = parking ticks). */
export function unpaintParking(built, ctx) {
  const roads = new Set([...ctx.suppressed].filter((k) => k.endsWith("|parking")).map((k) => hashPhase(k.slice(0, -8))));
  if (!roads.size) return 0;
  const A = built.asphalt.attributes, piece = A.aPiece.array, edges = A.aEdges.array, mark = A.aMark.array;
  let n = 0;
  for (let v = 0; v < piece.length / 2; v++) {
    if (!roads.has(Math.round(piece[v * 2] * 100) / 100)) continue;
    for (const k of [2, 3]) if (Math.floor(edges[v * 4 + k] + 1e-4) === PARKING_CODE) { edges[v * 4 + k] = 0; n++; }
    if (mark[v * 4 + 3]) { mark[v * 4 + 3] = 0; n++; }
  }
  return n;
}

/**
 * The decal mesh of the measured paint: every item clipped to the measured low carriageway (roadway, junction, tram
 * roadway, parking: never a sidewalk, median, square or tram site) piece by piece on the base triangles, so each
 * piece lies on its triangle's plane of H, PAINT_LIFT above it. Attributes for viewer/roadPaint.js paintMaterial:
 *   aPaint  (u, v, kind, n)     u along the mark, v across it (m), kind 0 solid / 1 zebra / 2 teeth, n stripes
 *   aPaint2 (u1, vLen, -, -)    the mark's extent (for the antialiased edges)
 */
export function paintMeshV2(items, prep, bounds) {
  const pos = [], nrm = [], uv = [], a1 = [], a2 = [], idx = [];
  if (!items.length) return null;
  // base triangles of the markable classes on a 4 m grid
  const grid = new Map();
  prep.base.forEach((b, i) => {
    if (!MARKABLE.has(b.cls)) return;
    const xs = [b.a[0], b.b[0], b.c[0]], zs = [b.a[1], b.b[1], b.c[1]];
    for (let gi = Math.floor(Math.min(...xs) / 4); gi <= Math.floor(Math.max(...xs) / 4); gi++)
      for (let gj = Math.floor(Math.min(...zs) / 4); gj <= Math.floor(Math.max(...zs) / 4); gj++) {
        const k = gi * 65536 + gj; let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(i);
      }
  });
  const tile = [[bounds.x0, bounds.z0], [bounds.x1, bounds.z0], [bounds.x1, bounds.z1], [bounds.x0, bounds.z1]];
  const KIND = { solid: 0, zebra: 1, teeth: 2 };
  for (const it of items) {
    let poly = clipConvex(it.poly, tile);
    if (poly.length < 3) continue;
    const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
    const seen = new Set();
    // the frame: (u, v) local metres; null = a small solid glyph part (its own box)
    let F = it.frame;
    if (!F) {
      const [p0, p1, , p3] = it.poly, ax = p1[0] - p0[0], az = p1[1] - p0[1], La = Math.hypot(ax, az), bx = p3[0] - p0[0], bz = p3[1] - p0[1], Lb = Math.hypot(bx, bz);
      F = { o: p0, a: [ax / La, az / La], b: [bx / Lb, bz / Lb], u0: 0, u1: La, v0: 0, vLen: Lb };
    }
    const uvOf = (p) => [(p[0] - F.o[0]) * F.a[0] + (p[1] - F.o[1]) * F.a[1] - F.u0, (p[0] - F.o[0]) * F.b[0] + (p[1] - F.o[1]) * F.b[1] - F.v0];
    const kind = KIND[it.kind] ?? 0;
    const ext = [F.u1 - F.u0, F.vLen ?? (2 * F.n - 1) * STRIPE];
    for (let gi = Math.floor(Math.min(...xs) / 4); gi <= Math.floor(Math.max(...xs) / 4); gi++)
      for (let gj = Math.floor(Math.min(...zs) / 4); gj <= Math.floor(Math.max(...zs) / 4); gj++) {
        for (const bi of grid.get(gi * 65536 + gj) || []) {
          if (seen.has(bi)) continue;
          seen.add(bi);
          const b = prep.base[bi];
          const piece = clipConvex(poly, [b.a, b.b, b.c]);
          if (piece.length < 3 || Math.abs(area2(piece)) < 1e-5) continue;
          const v0 = pos.length / 3;
          // +y faces: cross(b - a, c - a).y = (c.x - a.x)(b.z - a.z) - (b.x - a.x)(c.z - a.z) must be > 0
          const [pa, pb, pc] = piece;
          const ccw = (pc[0] - pa[0]) * (pb[1] - pa[1]) - (pb[0] - pa[0]) * (pc[1] - pa[1]) < 0;
          for (const p of piece) {
            pos.push(p[0], prep.H(p[0], p[1]) + PAINT_LIFT, p[1]);
            const nn = prep.nrmAt(p[0], p[1]); nrm.push(nn[0], nn[1], nn[2]);
            const [u, v] = uvOf(p);
            uv.push(u, v);
            a1.push(u, v, kind, F.n ?? 0);
            a2.push(ext[0], ext[1], 0, 0);
          }
          for (let k = 1; k + 1 < piece.length; k++) {
            if (ccw) idx.push(v0, v0 + k + 1, v0 + k); else idx.push(v0, v0 + k, v0 + k + 1);
          }
        }
      }
  }
  if (!idx.length) return null;
  return {
    position: new Float32Array(pos), normal: new Float32Array(nrm), uv: new Float32Array(uv), index: new Uint32Array(idx),
    attributes: { aPaint: { array: new Float32Array(a1), itemSize: 4 }, aPaint2: { array: new Float32Array(a2), itemSize: 4 } },
  };
}
