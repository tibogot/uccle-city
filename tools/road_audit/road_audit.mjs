// ROAD CHECKER v0 (docs/ROADS_V2_RESEARCH.md §5, checks C1-C13): runs the tile worker's road stage headless on a
// tile (tools/road_audit/tile.mjs -> viewer/roadBuild.js, the same code the city runs) and checks the paint it draws
// against the measured street (UrbIS surfaces, markings.json, the orthophoto, OSM tags).
//
//   node --import ./tools/road_audit/register.mjs tools/road_audit/road_audit.mjs [--paint v1|v2] [--label NAME]
//        [--out DIR] [--roads-from DIR] [--no-ortho] [--quiet] T [T ...] | --all
//
// Writes DIR/NAME/<T>.json (every finding with its world position x, z, the element id and source, a one-line
// reason) and DIR/NAME/summary.{json,md}. Exit code 1 when any BLOCKING finding exists (level "error" in a blocking
// check: C1 C2 C3 C4 C5 C8 C9), so it can gate a build. Positions are local metres (CONTRACT: x east, z south).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, allTiles, ROOT } from "./tile.mjs";
import { orthoSampler } from "./ortho.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { paintInventory } = await imp("viewer/streets/inventory.js");
const { evalAlignment } = await imp("vendor/roads/roadAlignment.js");
const { layoutEdges } = await imp("vendor/roads/roadCrossSection.js");
const { polylineAt } = await imp("vendor/roads/roadMath.js");

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const PAINT = opt("--paint", "v2"), LABEL = opt("--label", PAINT), OUT = opt("--out", join(ROOT, "docs/roads/audit"));
const ROADS_FROM = opt("--roads-from", null);     // another set of roads.json (<DIR>/<T>.json): the "before" network
const NO_ORTHO = flag("--no-ortho"), QUIET = flag("--quiet"), ALL = flag("--all");
const TILES = ALL ? allTiles() : argv.map((t) => t.toUpperCase());
if (!TILES.length) { console.error("usage: road_audit.mjs [--paint v1|v2] [--label L] T... | --all"); process.exit(2); }
const BLOCKING = new Set(["C1", "C2", "C3", "C4", "C5", "C8", "C9"]);
const CHECKS = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13"];
const TITLE = {
  C1: "zebra on one arm", C2: "zebra square and full", C3: "stop line before the junction", C4: "paint on the carriageway",
  C5: "paint = evidence", C6: "lanes on the street", C7: "hold points = painted lines", C8: "curve continuity",
  C9: "no coplanar overlaps", C10: "tile seams", C11: "levels", C12: "orthophoto agreement (soft)", C13: "inventory by source",
};

// ---------------------------------------------------------------- OSM tags of the ways (evidence for C5)
const osmWays = new Map();
{
  const p = join(ROOT, "data/raw/osm/area.json");
  if (existsSync(p)) for (const el of JSON.parse(readFileSync(p, "utf8")).elements) if (el.type === "way") osmWays.set(el.id, el.tags || {});
}
const tagsOf = (r) => [r.meta?.osm, ...(r.meta?.osmWays || [])].filter(Boolean).map((id) => osmWays.get(+id) || {});
const anyTag = (tags, re, vals) => tags.some((t) => Object.entries(t).some(([k, v]) => re.test(k) && vals.test(String(v))));
const bikeEvidence = (tags) => anyTag(tags, /^cycleway(:(both|left|right))?$/, /^(lane|track|opposite_lane|opposite_track)$/);
const sharrowTag = (tags) => anyTag(tags, /^cycleway(:(both|left|right))?$/, /^(shared_lane|opposite_share_busway|share_busway)$/);
const parkingEvidence = (tags) => anyTag(tags, /^parking(:lane)?(:(both|left|right))?(:markings)?$/, /^(lane|marked|yes|parallel|diagonal|perpendicular|street_side|on_street|half_on_kerb|on_kerb)$/);

// ---------------------------------------------------------------- geometry helpers
const deg = (r) => (r * 180) / Math.PI;
const axisDiff = (a, b) => { let d = Math.abs(a - b) % Math.PI; return Math.min(d, Math.PI - d); };
const pip = (x, z, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const ringDist = (x, z, ring) => { let d = Infinity; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) d = Math.min(d, segD(x, z, ring[j][0], ring[j][1], ring[i][0], ring[i][1])); return d; };
const lineDist = (x, z, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segD(x, z, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
const r2 = (v) => Math.round(v * 100) / 100;
const median = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return r2(s[s.length >> 1]); };
const MARKABLE = new Set([0, 1, 3]);           // roadway (and junctions), tram-shared roadway, parking
const CARRIAGE = new Set([0, 1, 2, 3]);        // + tram site
const RAISED = new Set([4, 5, 6, 7, 8, 9]);    // square, sidewalk, median, path, ramp, pit
const CLASS_NAME = ["roadway", "tram road", "tram site", "parking", "square", "sidewalk", "median", "path", "ramp", "pit"];

/** Distance from (x, z) along unit (dx, dz) to the first non-carriage cell (a kerb), max 30 m; null if none. */
function kerbRay(prep, x, z, dx, dz, max = 30) {
  for (let d = 0.1; d < max; d += 0.1) { const c = prep.classAt(x + dx * d, z + dz * d); if (!CARRIAGE.has(c)) return d; }
  return null;
}

// ---------------------------------------------------------------- one tile
function auditTile(T, ortho) {
  const tile = loadTile(T, { paint: PAINT, roadsFile: ROADS_FROM ? join(ROADS_FROM, `${T}.json`) : undefined });
  const { rd, bounds, surf, markings, roads } = tile;
  const { net, prep } = rd;
  const inTile = (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1;
  const F = [];
  const add = (check, level, x, z, msg, extra = {}) => F.push({ check, level, x: r2(x), z: r2(z), msg, ...extra });
  const cls = (x, z) => (prep ? prep.classAt(x, z) : -1);
  const inv = paintInventory(rd);
  const junctionPolys = (surf?.surfaces || []).filter((s) => s.type === "I" || s.type === "IC").map((s) => s.rings[0]);
  const coreOf = (x, z) => { for (const r of junctionPolys) if (pip(x, z, r)) return ringDist(x, z, r); return 0; };   // depth inside a junction
  const measuredX = (markings?.crossings || []).filter((c) => c.src !== "osm" || true);
  const nearestMeasured = (x, z) => { let b = null; for (const m of measuredX) { const d = Math.hypot(m.c[0] - x, m.c[1] - z); if (!b || d < b.d) b = { d, m }; } return b; };
  const junctions = net.nodes.filter((n) => (n.kind === "junction" || n.kind === "roundabout") && n.arms.length >= 3);
  const roadById = new Map(net.roads.map((r) => [r.id, r]));
  const srcRoad = new Map(roads.roads.map((r) => [r.id, r]));
  /** The road axis at (x, z): the nearest engine road's heading there. */
  const axisAt = (x, z) => {
    const L = net.locate(x, z);
    if (L?.kind === "road") { const rr = roadById.get(L.roadId); return { th: evalAlignment(rr.al, L.s).th, road: L.roadId, s: L.s, t: L.t }; }
    return null;
  };
  /** The junction arm a point sits on: { node, arm, sigma, t } or null. */
  const armOf = (x, z, reach = 25) => {
    let best = null;
    for (const n of junctions) {
      if (Math.hypot(n.x - x, n.z - z) > 80) continue;
      for (const a of n.arms) {
        const ox = x - a.ox, oz = z - a.oz, sg = ox * a.dx + oz * a.dz, t = ox * a.nx + oz * a.nz;
        if (sg < -1 || sg > a.trim + reach || t < a.edges.curbR - 1.5 || t > a.edges.curbL + 1.5) continue;
        const sc = Math.abs(t) + Math.max(0, -sg) * 3;
        if (!best || sc < best.sc) best = { node: n, arm: a, sigma: sg, t, sc };
      }
    }
    return best;
  };

  // ---- C1, C2, C12: crossings
  const xIn = inv.crossings.filter((c) => inTile(c.c[0], c.c[1]));
  const xArm = new Map();
  for (const c of xIn) {
    const [x, z] = c.c, tag = { id: c.id, src: c.src };
    const nm = nearestMeasured(x, z);
    const measured = c.src !== "rule";
    if (!measured && (!nm || nm.d > 8)) add("C1", "error", x, z, `invented crossing: no measured or OSM crossing within 8 m${nm ? ` (nearest ${nm.d.toFixed(1)} m)` : ""}`, tag);
    const am = armOf(x, z);
    const ax = axisAt(x, z);
    if (am) xArm.set(c.id, am);
    if (!am && !ax) add("C1", "error", x, z, "crossing on no junction arm and no road", tag);
    const depth = coreOf(x, z);
    if (depth > 4) add("C1", measured ? "warn" : "error", x, z, `crossing centre ${depth.toFixed(1)} m deep inside the measured junction (the junction core)`, tag);
    if (am && Math.hypot(am.node.x - x, am.node.z - z) < 3) add("C1", "error", x, z, "crossing on the junction node itself", tag);
    // C2: stripes along the road, band square, kerb to kerb, at the real crossing
    if (ax) {
      const dA = deg(axisDiff(ax.th, c.axis));
      if (dA > 15) add("C2", measured ? "warn" : "error", x, z, `stripes ${dA.toFixed(0)}° off the road axis`, tag);
      else if (dA > 5) add("C2", "warn", x, z, `stripes ${dA.toFixed(0)}° off the road axis`, tag);
    }
    if (prep && c.poly) {
      const bx = -Math.sin(c.axis), bz = Math.cos(c.axis);
      let lo = Infinity, hi = -Infinity;
      for (const p of c.poly) { const v = (p[0] - x) * bx + (p[1] - z) * bz; lo = Math.min(lo, v); hi = Math.max(hi, v); }
      if (c.vSpan) [lo, hi] = c.vSpan;              // decal zebras: the stripes as drawn (cut at the measured kerb)
      const kp = kerbRay(prep, x, z, bx, bz), km = kerbRay(prep, x, z, -bx, -bz);
      if (CARRIAGE.has(cls(x, z)) && kp != null && km != null) {
        const short = Math.max(kp - hi, km + lo), over = Math.max(hi - kp, -lo - km);
        if (over > 0.3) add("C2", "error", x, z, `zebra runs ${over.toFixed(1)} m past the measured kerb`, tag);
        else if (short > 0.8) add("C2", "warn", x, z, `zebra stops ${short.toFixed(1)} m short of the measured kerb`, tag);
      }
    }
    if (nm && nm.d <= 8 && nm.m.id !== c.id) {
      if (nm.d > 1) add("C2", measured ? "warn" : "error", x, z, `${nm.d.toFixed(1)} m from the measured crossing ${nm.m.id}`, tag);
      const dA = deg(axisDiff(nm.m.axis, c.axis));
      if (dA > 5) add("C2", "warn", x, z, `${dA.toFixed(0)}° off the measured crossing's angle`, tag);
    }
    if (ortho && c.poly) {
      const sc = ortho.zebraScore(c);
      c.ortho = sc;
      if (sc != null && sc < 0.25) add("C12", "review", x, z, `orthophoto shows no stripe pattern here (score ${sc.toFixed(2)})`, tag);
    }
  }
  // measured crossings nobody draws
  for (const m of markings?.crossings || []) {
    if (!inTile(m.c[0], m.c[1])) continue;
    const drawn = xIn.some((c) => Math.hypot(c.c[0] - m.c[0], c.c[1] - m.c[1]) < 3);
    if (!drawn) add("C1", "warn", m.c[0], m.c[1], `measured crossing ${m.id} (${m.src}) is not drawn`, { id: m.id, src: m.src });
  }

  // ---- C3: stop and give-way lines
  const sIn = inv.stops.filter((s) => { const [p, q] = s.line; return inTile((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); });
  const perApproach = new Map();
  for (const s of sIn) {
    const [p, q] = s.line, x = (p[0] + q[0]) / 2, z = (p[1] + q[1]) / 2, tag = { id: s.id, src: s.src, kind: s.kind };
    if (s.ring) continue;                         // roundabout entry teeth: the ring is the controller
    if (s.src === "rule" && String(s.controller).startsWith("guess")) add("C3", "error", x, z, `${s.kind} line with a guessed controller (${s.controller}): no signal, sign or OSM control`, tag);
    const depth = coreOf(x, z);
    if (depth > 3) add("C3", s.src === "topo" ? "warn" : "error", x, z, `${s.kind} line ${depth.toFixed(1)} m deep inside the measured junction`, tag);
    const am = armOf(x, z, 30);
    if (am) {
      const a = am.arm, th = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const dP = deg(axisDiff(th, a.th + Math.PI / 2));
      if (dP > 10) add("C3", "warn", x, z, `${s.kind} line ${dP.toFixed(0)}° off square to its lanes`, tag);
      const ts = [p, q].map((P) => (P[0] - a.ox) * a.nx + (P[1] - a.oz) * a.nz);
      const twoWay = (a.lanesR || []).some((l) => l.drive && l.w > 0.3) && (a.lanesL || []).some((l) => l.drive && l.w > 0.3);
      if (twoWay && Math.min(...ts) < -0.5) add("C3", s.src === "topo" ? "warn" : "error", x, z, `${s.kind} line runs ${(-Math.min(...ts)).toFixed(1)} m over the departing lanes`, tag);
      const key = `${am.node.id}|${a.road.id}|${a.end}`;
      perApproach.set(key, (perApproach.get(key) || 0) + 1);
      if (perApproach.get(key) === 2) add("C3", "warn", x, z, "two stop / give-way lines on one approach", tag);
      // the crossing on the same arm: the stop line must be upstream of it (farther from the junction)
      for (const c of xIn) {
        const ca = xArm.get(c.id);
        if (!ca || ca.arm !== a) continue;
        const half = (c.along ?? 3) / 2;
        const lv = s.src === "topo" ? "warn" : "error";     // a surveyed line is the truth: report, don't fail
        if (am.sigma < ca.sigma - half - 0.2) add("C3", lv, x, z, `${s.kind} line on the junction side of crossing ${c.id}`, tag);
        else if (am.sigma <= ca.sigma + half + 0.3) add("C3", lv, x, z, `${s.kind} line on crossing ${c.id}`, tag);
      }
    } else add("C3", "warn", x, z, `${s.kind} line on no junction approach`, tag);
  }

  // ---- C4: paint on the carriageway (sampled 0.1 m inside every shape)
  const paintSamples = (pts, closed) => {
    const out = [];
    const n = pts.length;
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cz += p[1]; }
    cx /= n; cz /= n;
    if (closed) {
      for (const p of pts) { const dx = cx - p[0], dz = cz - p[1], L = Math.hypot(dx, dz) || 1; out.push([p[0] + (dx / L) * 0.1, p[1] + (dz / L) * 0.1]); }
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; out.push([(a[0] + b[0]) / 2 * 0.9 + cx * 0.1, (a[1] + b[1]) / 2 * 0.9 + cz * 0.1]); }
      out.push([cx, cz]);
    } else {
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let d = 0; d < L; d += 1) out.push([a[0] + (b[0] - a[0]) * (d / L), a[1] + (b[1] - a[1]) * (d / L)]);
      }
      out.push(pts[n - 1]);
    }
    return out;
  };
  const c4 = (item, pts, closed, label) => {
    if (!prep) return;
    const S = paintSamples(pts, closed).filter(([x, z]) => inTile(x, z));
    if (!S.length) return;
    let bad = 0, raised = 0, off = 0, first = null, what = new Map();
    for (const [x, z] of S) {
      const c = cls(x, z);
      if (MARKABLE.has(c)) continue;
      bad++; first ??= [x, z];
      if (RAISED.has(c)) raised++; else if (c < 0) off++;
      const nm = c < 0 ? "off the street" : CLASS_NAME[c];
      what.set(nm, (what.get(nm) || 0) + 1);
    }
    const f = bad / S.length;
    if (f > 0.1) {
      const desc = [...what].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((100 * v) / S.length)}%`).join(", ");
      add("C4", raised || off ? "error" : "warn", first[0], first[1], `${label}: ${Math.round(100 * f)}% of it not on the carriageway (${desc})`, { id: item.id ?? item.road, src: item.src ?? "rule" });
    }
  };
  for (const c of xIn) if (c.poly && c.drawn !== "decal") c4(c, c.poly, true, `crossing ${c.id}`);
  // the decal mesh (paint v2): every drawn triangle's centroid must lie in a measured markable base triangle (exact
  // polygons, not the 0.5 m class raster, whose cells blur the kerb line)
  const mgrid = new Map();
  if (rd.parts.paint && prep) prep.base.forEach((b, i) => {
    if (!MARKABLE.has(b.cls)) return;
    const xs = [b.a[0], b.b[0], b.c[0]], zs = [b.a[1], b.b[1], b.c[1]];
    for (let gi = Math.floor(Math.min(...xs) / 4); gi <= Math.floor(Math.max(...xs) / 4); gi++)
      for (let gj = Math.floor(Math.min(...zs) / 4); gj <= Math.floor(Math.max(...zs) / 4); gj++) { const k = gi * 65536 + gj; let l = mgrid.get(k); if (!l) mgrid.set(k, (l = [])); l.push(b); }
  });
  const onMarkable = (x, z) => (mgrid.get(Math.floor(x / 4) * 65536 + Math.floor(z / 4)) || []).some((b) => {
    const d = (b.b[1] - b.c[1]) * (b.a[0] - b.c[0]) + (b.c[0] - b.b[0]) * (b.a[1] - b.c[1]);
    const w0 = ((b.b[1] - b.c[1]) * (x - b.c[0]) + (b.c[0] - b.b[0]) * (z - b.c[1])) / d, w1 = ((b.c[1] - b.a[1]) * (x - b.c[0]) + (b.a[0] - b.c[0]) * (z - b.c[1])) / d;
    return w0 >= -1e-6 && w1 >= -1e-6 && 1 - w0 - w1 >= -1e-6;
  });
  if (rd.parts.paint && prep) {
    const P = rd.parts.paint.position, I = rd.parts.paint.index;
    let bad = 0, n = 0, at = null;
    for (let t = 0; t < I.length; t += 3) {
      const x = (P[I[t] * 3] + P[I[t + 1] * 3] + P[I[t + 2] * 3]) / 3, z = (P[I[t] * 3 + 2] + P[I[t + 1] * 3 + 2] + P[I[t + 2] * 3 + 2]) / 3;
      n++; if (!onMarkable(x, z)) { bad++; at ??= [x, z]; }
    }
    if (bad) add("C4", bad / n > 0.01 ? "error" : "warn", at[0], at[1], `${bad} of ${n} paint decal triangles not on the markable carriageway`, { id: "paint-decal" });
  }
  for (const s of sIn) c4(s, s.line, false, `${s.kind} line`);
  const laneIn = inv.lanes.filter((l) => l.pts.some(([x, z]) => inTile(x, z)));
  // lane paint per road and kind (a parking lane's ticks are one item)
  const laneGroups = new Map();
  for (const l of laneIn) { const k = `${l.road}|${l.kind}`; const g = laneGroups.get(k) || { road: l.road, kind: l.kind, parts: [] }; g.parts.push(l.pts); laneGroups.set(k, g); }
  for (const g of laneGroups.values()) {
    const pts = g.kind === "parkingTick" ? g.parts.flat() : g.parts.flat();
    c4({ road: g.road, src: "rule" }, pts, false, `${g.kind} paint of ${g.road}`);
  }

  // ---- C5: lane paint must have evidence (measured line / OSM tag); residential centre lines need a measured line
  const topoLines = (markings?.lines || []).filter((l) => l.kind === "solid" || l.kind === "dashed");
  const measuredAlong = (pts) => {
    let hit = 0, n = 0;
    for (const [x, z] of paintSamples(pts, false)) { n++; if (topoLines.some((l) => lineDist(x, z, l.line) < 1.0)) hit++; }
    return n ? hit / n : 0;
  };
  const RESIDENTIAL = new Set(["local", "oneWay", "alley"]);
  const c5seen = new Set();
  for (const l of laneIn) {
    const r = srcRoad.get(l.road), tags = r ? tagsOf(r) : [];
    const p = l.pts.find(([x, z]) => inTile(x, z)) || l.pts[0];
    const key = `${l.road}|${l.kind}`;
    if (c5seen.has(key)) continue;
    let why = null;
    if ((l.kind === "center" || l.kind === "leftEdge") && RESIDENTIAL.has(l.type) && measuredAlong(l.pts) < 0.5) why = `${l.kind === "center" ? "centre" : "left edge"} line on a residential street with no measured line`;
    else if ((l.kind === "bike" || l.kind === "solidThin") && !bikeEvidence(tags)) why = sharrowTag(tags) ? "OSM shared_lane (sharrows) drawn as a separate cycle lane" : "cycle lane with no OSM cycle lane tag";
    else if ((l.kind === "parking" || l.kind === "parkingTick") && !parkingEvidence(tags)) why = "parking line / bay ticks with no OSM parking tag";
    if (why) { c5seen.add(key); add("C5", "error", p[0], p[1], `${why} (${l.road})`, { id: l.road, src: "rule", kind: l.kind }); }
  }

  // ---- C6: engine lane paths on the street
  let lp = 0, lOff = 0;
  const offPaths = [];
  for (const path of net.graph.paths) {
    let n = 0, o = 0, at = null;
    for (const q of path.pts) {
      const x = q[0] ?? q.x, z = q[1] ?? q.z;
      if (!inTile(x, z) || !prep) continue;
      n++;
      const ok = [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].some(([dx, dz]) => CARRIAGE.has(cls(x + dx, z + dz)));
      if (!ok) { o++; at ??= [x, z]; }
    }
    lp += n; lOff += o;
    if (n >= 3 && o / n > 0.2) offPaths.push({ path, at, f: o / n });
  }
  for (const { path, at, f } of offPaths) add("C6", "warn", at[0], at[1], `lane path ${path.id} (${path.kind || "lane"}) ${Math.round(100 * f)}% off the measured carriageway`, { id: path.id });

  // ---- C7: the engine's hold points vs the painted stop lines (traffic, phase 3, reads this)
  const holdD = [];
  for (const path of net.graph.paths) {
    if (!path.stop) continue;
    const P = polylineAt(path.pts.map((q) => [q[0] ?? q.x, q[1] ?? q.z]), path.cum, path.stop.at);
    if (!inTile(P.x, P.z)) continue;
    let d = Infinity;
    for (const s of inv.stops) d = Math.min(d, segD(P.x, P.z, s.line[0][0], s.line[0][1], s.line[1][0], s.line[1][1]));
    holdD.push(d);
    if (d > 2) add("C7", "warn", P.x, P.z, `lane ${path.id} holds ${isFinite(d) ? d.toFixed(1) + " m from" : "with no"} painted stop / give-way line`, { id: path.id });
  }

  // ---- C8: curve continuity, folds, curves that leave the measured street
  let drifted = 0;
  for (const rr of net.roads) {
    const S = rr.smp;
    if (!S) continue;
    let kinks = 0, fold = null, n = 0, bad = 0, firstBad = null;
    for (let i = 0; i < S.s.length; i++) {
      const x = S.x[i], z = S.z[i];
      if (!inTile(x, z)) continue;
      const e = layoutEdges(rr.lays[i]), k = S.k[i];
      if (!fold && (1 + k * e.curbL < 0.2 || 1 + k * e.curbR < 0.2)) fold = [x, z, 1 / Math.abs(k)];
      if (i > 0) {
        const ds = S.s[i] - S.s[i - 1], dth = Math.abs(Math.atan2(Math.sin(S.th[i] - S.th[i - 1]), Math.cos(S.th[i] - S.th[i - 1])));
        const nearEnd = S.s[i] < rr.s0 + 2 || S.s[i] > rr.s1 - 2;
        if (ds > 0.05 && !nearEnd && deg(dth) / Math.max(ds, 1) > 3 && deg(dth) > 3) kinks++;
      }
      if (!prep) continue;
      const c = cls(x, z);
      if (c < 0 && cls(x + 3, z) < 0 && cls(x - 3, z) < 0) continue;    // not surveyed here
      n++;
      const nx = Math.sin(S.th[i]), nz = -Math.cos(S.th[i]);
      let off = !CARRIAGE.has(c);
      if (!off) {
        const wl = kerbRay(prep, x, z, nx, nz), wr = kerbRay(prep, x, z, -nx, -nz);
        if (wl != null && wr != null && (Math.abs(e.curbL - wl) > 1.5 || Math.abs(-e.curbR - wr) > 1.5)) off = true;
      }
      if (off) { bad++; firstBad ??= [x, z]; }
    }
    if (fold) add("C8", "error", fold[0], fold[1], `fold: bend radius ${fold[2].toFixed(1)} m is tighter than the carriageway half-width (${rr.id})`, { id: rr.id });
    if (kinks) add("C8", "warn", S.x[0], S.z[0], `${kinks} heading kink(s) > 3°/m (${rr.id})`, { id: rr.id });
    if (n >= 5 && bad / n > 0.3) { drifted++; add("C8", "error", firstBad[0], firstBad[1], `road leaves the measured street: ${Math.round((100 * bad) / n)}% of its centreline / kerbs are > 1.5 m off (${rr.id}, a chord or a guessed width)`, { id: rr.id }); }
  }

  // ---- C9: coplanar overlaps in the drawn asphalt part
  const z9 = coplanar(rd.parts.asphalt, bounds);
  for (const o of z9.clusters) add("C9", "error", o.x, o.z, `${o.n} overlapping coplanar triangle pair(s), ${(o.area * 1e4).toFixed(0)} cm² within 2 mm in height: z-fighting`, {});

  // ---- C11: levels (bridges / tunnels drawn at ground level)
  for (const r of roads.roads) {
    const m = r.meta || {};
    if (!(m.bridge && m.bridge !== "no") && !(m.tunnel && m.tunnel !== "no" && m.tunnel !== "building_passage")) continue;
    const rr = roadById.get(r.id);
    if (!rr?.smp) continue;
    const i = rr.smp.s.length >> 1;
    if (!inTile(rr.smp.x[i], rr.smp.z[i])) continue;
    add("C11", "warn", rr.smp.x[i], rr.smp.z[i], `${m.bridge ? "bridge" : "tunnel"} ${m.name || r.id} drawn at ground level (levels: phase 4)`, { id: r.id });
  }

  // ---- C13: inventory by source
  const bySrc = (arr) => arr.reduce((o, c) => ((o[c.src] = (o[c.src] || 0) + 1), o), {});
  const laneKinds = {};
  for (const l of laneIn) laneKinds[l.kind] = (laneKinds[l.kind] || 0) + 1;
  const inventory = {
    crossings: bySrc(xIn), stops: bySrc(sIn.filter((s) => !s.ring)), ringGiveway: sIn.filter((s) => s.ring).length,
    laneMarks: laneKinds, symbols: inv.symbols.filter((s) => inTile(s.x, s.z)).length,
    measuredCrossingsInTile: (markings?.crossings || []).filter((m) => inTile(m.c[0], m.c[1])).reduce((o, c) => ((o[c.src] = (o[c.src] || 0) + 1), o), {}),
  };
  // C10: road data to compare across tiles
  const seam = {};
  for (const r of roads.roads) {
    const rr = roadById.get(r.id);
    if (!rr?.smp) continue;
    const xs = rr.smp.x, zs = rr.smp.z;
    let inside = 0;
    for (let i = 0; i < xs.length; i++) if (inTile(xs[i], zs[i])) inside++;
    if (inside && inside < xs.length) seam[r.id] = JSON.stringify(r.lanes ?? null);
  }

  // Roads UrbIS does not map (Flemish side, private lanes) keep the engine's rules (owner decision 3): a finding with
  // no measured surface within 3 m is reported as "outside UrbIS" (level info), in both runs alike.
  if (prep) for (const f of F) {
    if (f.level !== "error" && f.level !== "warn") continue;
    if (!["C1", "C2", "C3", "C4", "C5", "C8"].includes(f.check)) continue;
    const any = [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dz]) => cls(f.x + dx, f.z + dz) >= 0);
    if (!any) { f.level = "info"; f.msg = `outside UrbIS: ${f.msg}`; }
  }
  const counts = {};
  for (const c of CHECKS) counts[c] = { error: 0, warn: 0, review: 0, info: 0 };
  for (const f of F) counts[f.check][f.level] = (counts[f.check][f.level] || 0) + 1;
  return {
    tile: T, paint: PAINT, findings: F, counts, inventory, seam,
    stats: {
      laneGraphPointsOff: `${lOff}/${lp} (${((100 * lOff) / Math.max(1, lp)).toFixed(1)}%)`, holdPointToPaintMedianM: median(holdD.filter(isFinite)),
      roadsLeavingStreet: drifted, coplanarPairs: z9.pairs, coplanarAreaM2: r2(z9.area), triangles: rd.triangles, buildMs: rd.totalMs, times: rd.times,
      widthFit: rd.surfaceStats?.widthFit ?? null, engineErrors: rd.netInfo.byCode, atlas: rd.atlas ? `${rd.atlas.width}x${rd.atlas.height}` : null,
      paintTriangles: rd.parts.paint ? rd.parts.paint.index.length / 3 : 0,
    },
  };
}

/** Overlapping triangle pairs of one part within 2 mm in height, overlap > 1 cm², clustered on a 4 m grid. */
function coplanar(part, bounds) {
  const out = { pairs: 0, area: 0, clusters: [] };
  if (!part) return out;
  const P = part.position, I = part.index, CELLS = 2;
  const grid = new Map();
  const T = I.length / 3;
  const tri = (t) => [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
  for (let t = 0; t < T; t++) {
    const [a, b, c] = tri(t);
    const xs = [P[a * 3], P[b * 3], P[c * 3]], zs = [P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]];
    const cx = (xs[0] + xs[1] + xs[2]) / 3, cz = (zs[0] + zs[1] + zs[2]) / 3;
    if (!(cx >= bounds.x0 && cx < bounds.x1 && cz >= bounds.z0 && cz < bounds.z1)) continue;
    for (let i = Math.floor(Math.min(...xs) / CELLS); i <= Math.floor(Math.max(...xs) / CELLS); i++)
      for (let j = Math.floor(Math.min(...zs) / CELLS); j <= Math.floor(Math.max(...zs) / CELLS); j++) {
        const k = i * 100003 + j;
        let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(t);
      }
  }
  const seen = new Set(), cl = new Map();
  const poly = (t) => tri(t).map((v) => [P[v * 3], P[v * 3 + 2], P[v * 3 + 1]]);
  for (const l of grid.values()) {
    for (let p = 0; p < l.length; p++) for (let q = p + 1; q < l.length; q++) {
      const ta = l[p], tb = l[q];
      const key = ta < tb ? ta * 4194304 + tb : tb * 4194304 + ta;
      if (seen.has(key)) continue;
      seen.add(key);
      const A = tri(ta), B = tri(tb);
      if (A.some((v) => B.includes(v))) continue;            // neighbours share a vertex
      const pa = poly(ta), pb = poly(tb);
      const ov = clipConvex(pa, pb);
      if (ov.length < 3) continue;
      const ar = Math.abs(area(ov));
      if (ar < 1e-4) continue;
      let cx = 0, cz = 0; for (const v of ov) { cx += v[0]; cz += v[1]; } cx /= ov.length; cz /= ov.length;
      const ya = yAt(pa, cx, cz), yb = yAt(pb, cx, cz);
      if (ya == null || yb == null || Math.abs(ya - yb) > 0.002) continue;
      out.pairs++; out.area += ar;
      const ck = `${Math.floor(cx / 4)}|${Math.floor(cz / 4)}`;
      const c = cl.get(ck) || { x: cx, z: cz, n: 0, area: 0 }; c.n++; c.area += ar; cl.set(ck, c);
    }
  }
  out.clusters = [...cl.values()];
  return out;
}
const area = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] * p[i][1] - p[i][0] * p[j][1]); return a / 2; };
function clipConvex(subject, clip) {
  let out = subject.map((p) => [p[0], p[1]]);
  const ccw = area(clip) > 0 ? 1 : -1;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const side = (p) => ccw * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const inp = out; out = [];
    for (let k = 0; k < inp.length; k++) {
      const P = inp[k], Q = inp[(k + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out;
}
function yAt(tri, x, z) {
  const [a, b, c] = tri, d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(d) < 1e-12) return null;
  const w0 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (z - c[1])) / d, w1 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (z - c[1])) / d;
  return w0 * a[2] + w1 * b[2] + (1 - w0 - w1) * c[2];
}

// ---------------------------------------------------------------- run
const dir = join(OUT, LABEL);
mkdirSync(dir, { recursive: true });
const results = [];
for (const T of TILES) {
  const t0 = performance.now();
  let r;
  try {
    const ortho = NO_ORTHO ? null : orthoSampler(T);
    r = auditTile(T, ortho);
  } catch (e) { console.error(`${T}: ${e.stack || e}`); continue; }
  const { seam, ...keep } = r;
  writeFileSync(join(dir, `${T}.json`), JSON.stringify(keep));
  results.push(r);
  if (!QUIET) console.log(`${T} ${Math.round(performance.now() - t0)} ms  ` + CHECKS.map((c) => `${c}:${r.counts[c].error}/${r.counts[c].warn}`).join(" "));
}
// C10 seams across tiles
const seamBy = new Map();
for (const r of results) for (const [id, h] of Object.entries(r.seam)) { const l = seamBy.get(id) || []; l.push([r.tile, h]); seamBy.set(id, l); }
let seamPairs = 0, seamDiff = 0;
const seamList = [];
for (const [id, l] of seamBy) {
  if (l.length < 2) continue;
  seamPairs++;
  if (new Set(l.map((x) => x[1])).size > 1) { seamDiff++; if (seamList.length < 200) seamList.push({ road: id, tiles: l.map((x) => x[0]) }); }
}
const tot = {};
for (const c of CHECKS) tot[c] = { error: 0, warn: 0, review: 0, info: 0 };
for (const r of results) for (const c of CHECKS) for (const k of ["error", "warn", "review", "info"]) tot[c][k] += r.counts[c][k] || 0;
tot.C10.warn = seamDiff;
const inventory = {};
for (const r of results) for (const [k, v] of Object.entries(r.inventory)) {
  if (typeof v === "number") inventory[k] = (inventory[k] || 0) + v;
  else { inventory[k] ??= {}; for (const [kk, vv] of Object.entries(v)) inventory[k][kk] = (inventory[k][kk] || 0) + vv; }
}
const blocking = CHECKS.filter((c) => BLOCKING.has(c)).reduce((s, c) => s + tot[c].error, 0);
const summary = { label: LABEL, paint: PAINT, tiles: results.map((r) => r.tile), totals: tot, blocking, inventory,
  seams: { roadsInTwoTiles: seamPairs, differ: seamDiff, examples: seamList.slice(0, 30) },
  perTile: Object.fromEntries(results.map((r) => [r.tile, { counts: r.counts, stats: r.stats }])), generated: new Date().toISOString() };
writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 1));
const md = [`# Road Checker v0: ${LABEL} (paint ${PAINT})`, "", `${results.length} tile(s): ${summary.tiles.join(" ")}. Generated ${summary.generated}.`,
  `Blocking errors (C1 C2 C3 C4 C5 C8 C9): **${blocking}**. Positions are local metres (x east, z south); per-tile findings in \`<T>.json\`.`, "",
  "| Check | | errors | warnings | review | outside UrbIS (info) |", "|---|---|---|---|---|---|",
  ...CHECKS.map((c) => `| ${c} | ${TITLE[c]}${BLOCKING.has(c) ? " (blocking)" : ""} | ${tot[c].error} | ${tot[c].warn} | ${tot[c].review} | ${tot[c].info} |`), "",
  `C10: ${seamPairs} roads cross a tile seam; ${seamDiff} have different lane data in their two tiles.`, "",
  "Inventory (C13): " + "`" + JSON.stringify(inventory) + "`", "",
  "| Tile | " + CHECKS.join(" | ") + " | lane pts off | roads off street | coplanar pairs | build ms |", "|" + "---|".repeat(CHECKS.length + 5),
  ...results.map((r) => `| ${r.tile} | ` + CHECKS.map((c) => `${r.counts[c].error}/${r.counts[c].warn}`).join(" | ") + ` | ${r.stats.laneGraphPointsOff} | ${r.stats.roadsLeavingStreet} | ${r.stats.coplanarPairs} | ${r.stats.buildMs} |`), "",
  "Cells are errors/warnings.", ""];
writeFileSync(join(dir, "summary.md"), md.join("\n"));
console.log(`\n${LABEL}: ${results.length} tiles, blocking errors ${blocking}. ` + CHECKS.map((c) => `${c} ${tot[c].error}/${tot[c].warn}${tot[c].review ? "/" + tot[c].review : ""}`).join(", "));
console.log(`report: ${join(dir, "summary.md")}`);
process.exit(blocking ? 1 : 0);
