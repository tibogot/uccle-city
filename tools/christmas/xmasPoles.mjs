// GARLANDS ON POLES AT SAINT-JOB (claude/xmas4, plan job 5, docs/CHRISTMAS.md 7.4, rule xmas-pole-garlands).
// Place de Saint-Job had 13 garlands across the street (tools/christmas/build_site.py): a garland hangs from the two
// facades at 6.8 m, and the square's two-storey houses rarely reach that. Brussels hangs them from poles too. This
// places LED garlands across the decorated Saint-Job streets where no wall garland hangs, hooked on
//   - the street lamps and tram poles the city DRAWS (viewer/streets/lampPlace.js placedLampSites, tramPoles.js
//     tramPoleSites: the same functions, the same data), where they stand at the station;
//   - otherwise a slim Christmas pole placed here, by data: on the measured sidewalk 0.55 m behind the kerb, off the
//     carriageway and its parking (>= POLE_ROAD m), clear of the traffic's lanes / junction turns (the car body), the
//     zebra crossings, tree trunks, walls / doors, tram tracks, bollards and the other poles.
// A garland: the street garlands' catenary (viewer/christmas/xmasCity.js buildSpans: warm LEDs every 33 cm, a hanging
// double star at the middle when not over a tram line), its sag 0.3 + 0.02 x width (as the wall garlands), less where
// the lowest point would come under the clearance (>= CLEAR m over the road, >= TRAM_CLEAR m over a tram track).
//
//   node --import ./tools/road_audit/register.mjs tools/christmas/xmasPoles.mjs [--write] [--quiet] [--plot FILE.json]
//     default: re-derive from the CURRENT city data and CHECK models/christmas/poles.json against it + every rule below
//     (gate row `xmaspoles`); --write: write models/christmas/poles.json
// The city (xmasCity.js) shows a lamp / tram-pole garland only once its pole is DRAWN there (lampSiteSets / the
// tram-poles instances, within HOOK_TOL): a pole the city moves or drops takes its garland with it, never a garland in
// the air.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadTile, ROOT } from "../road_audit/tile.mjs";

const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetFit } = await imp("viewer/streets/fitCore.js");
const { carriageway } = await imp("viewer/streets/carriageway.js");
const { tramPoleSites } = await imp("viewer/streets/tramPoles.js");
const { placedLampSites } = await imp("viewer/streets/lampPlace.js");
const { widthParking } = await imp("viewer/streets/parkPlace.js");
const { tileTrafficGraph } = await imp("viewer/traffic/tileTraffic.js");

const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const WRITE = flag("--write"), QUIET = flag("--quiet"), PLOT = opt("--plot", null), WHY = opt("--why", null)?.split(",").map(Number);
const OUT = join(ROOT, "models/christmas/poles.json");

// ---------------------------------------------------------------- the numbers (rule xmas-pole-garlands)
export const P = {
  area: "stjob", tiles: ["H5", "I5", "H6", "I6"],
  step: 16, offset0: 6,          // a station every 16 m along each street line (the square's lines are short: 20-50 m)
  // the decorated Saint-Job lines (site.json streets) + the square's north edge, Avenue du Prince de Ligne between the
  // square's two corners (1086, 519) - (1218, 495): it borders the square (no wall garland there: the square's side has no facade)
  extra: [{ name: "Avenue du Prince de Ligne", box: [1080, 1222, 485, 525] }],
  wallGap: 11, poleGap: 14,      // m: no garland within 11 m of a wall garland, 14 m of another pole garland (mid to mid)
  width: [7, 24],                // m: hook to hook
  lampHook: 5.5,                 // m over the lamp's foot: on the shaft, 0.3 m under the lantern (the Blender lamp: 6.6 m, glass 5.81-6.12 m)
  tramHook: 6.85,                // m over the tram pole's foot (the pole is 7.0 m: viewer/tram.js)
  tramPoleHook: 7.2,             // m: a Christmas pole's hook on a garland over a tram line (a 7.45 m pole)
  poleHook: 6.6, poleTop: 0.25,  // a Christmas pole: its hook (6.6 m, or the other side's hook) and 0.25 m of pole above it
  star: 0.75 * 1.76, starClear: 4.6,  // the hanging double star (spanmotif at 0.75: 1.32 m under the wire's middle) only where its foot clears 4.6 m
  hookAlong: 4.0,                // m: an existing pole within 4 m along the street of the station's line
  clear: 4.8,                    // m: the garland's lowest point over the road (rule 19: >= 4.4; 0.4 m of margin)
  tramClear: 6.4,                // m: over a tram track (the contact wire at 5.8 m, viewer/tram.js WIRE_H, + 0.6)
  sagMin: 0.15, sagRatio: [0.012, 0.07],
  kerbBack: 0.55,                // m behind the kerb (the lamps stand 0.5 m behind it)
  poleRoad: 0.45,                // m: the pole's centre from the carriageway incl. parking (radius 0.075 + 0.375)
  carBody: 1.25,                 // m: from every traffic lane / junction turn (the car's half width 0.9 + 0.35)
  trunk: 1.6, crossing: 1.5, wall: 1.0, other: 1.2, tram: 2.2, chalet: 2.0, fir: 4.5,
  wireTrunk: 1.2,                // m: the wire's line (plan) from any trunk at its ends' 3 m (the hooks' own surroundings)
};
export const HOOK_TOL = 0.25;    // m: the city's drawn pole vs the listed hook (xmasCity.js confirms each hook)

const site = JSON.parse(readFileSync(join(ROOT, "models/christmas/site.json"), "utf8"));
const area = site.select.areas.find((a) => a.id === P.area);

// ---------------------------------------------------------------- the city's data, per tile
const tiles = P.tiles.map((T) => {
  const t = loadTile(T);
  const { roads, feats, bounds, rd } = t;
  const inB = (x, z) => x >= bounds.x0 && x < bounds.x1 && z >= bounds.z0 && z < bounds.z1;
  const fit = rd.surfaceData ? streetFit(rd.surfaceData) : null;
  const driven = carriageway(roads, { classAt: fit?.classAt });
  const lanes = carriageway(roads, { classAt: fit?.classAt, lanesOnly: true });
  const tram = (feats.lines || []).filter((l) => l.kind === "tram");
  const lamps = placedLampSites(roads, bounds, fit?.placeLamp).filter((p) => inB(p.x, p.z));
  const poles = tramPoleSites(tram, inB, { fit, driven });
  const wp = widthParking(roads, feats, bounds, fit);
  const graph = tileTrafficGraph(rd.net, roads, feats, bounds, rd.surfaceData?.grid, { parked: wp.sites, roofs: t.roofs });
  const paths = [];
  for (let p = 0; p + 1 < graph.off.length; p++) { if (graph.tram?.[p]) continue; const l = [];   // (the tram's own paths: the track clearance below)
    for (let i = graph.off[p]; i < graph.off[p + 1]; i++) l.push([graph.xy[i * 2], graph.xy[i * 2 + 1]]); paths.push(l); }
  const crossings = (rd.inventory?.crossings || []).filter((c) => c.poly).map((c) => c.poly);
  const bx = rd.surfaceData?.bollards || [];
  const bollards = Array.from({ length: bx.length / 3 }, (_, i) => [bx[i * 3], bx[i * 3 + 2]]);
  const bld = JSON.parse(readFileSync(join(ROOT, "data/tiles", T, "buildings.json"), "utf8")).buildings.flatMap((b) => b.footprint);
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  const lines = roads.roads.map((r) => ({ name: (r.meta?.name || "").split(" - ")[0], pts: [N.get(r.a), ...(r.pts || []), N.get(r.b)].filter(Boolean).map((p) => [p.x, p.z]) }));
  return { T, bounds, inB, hm: t.hm, fit, driven, lanes, tram, lamps, poles, paths, crossings, bollards, trees: feats.trees || [], bld, lines };
});
const tileAt = (x, z) => tiles.find((t) => t.inB(x, z)) || null;
const all = (k) => tiles.flatMap((t) => t[k]);
const LAMPS = all("lamps").map((p) => ({ kind: "lamp", x: p.x, z: p.z }));
const TRAMP = all("poles").map((p) => ({ kind: "tram", x: p.x, z: p.z }));
const TRAM_LINES = all("tram").map((l) => l.line);
const CROSS = all("crossings"), TREES = all("trees"), BOLL = all("bollards"), PATHS = all("paths"), BLD = all("bld");

// ---------------------------------------------------------------- geometry helpers
const dSeg = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-12, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
const dLine = (x, z, pts) => { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, dSeg(x, z, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; };
const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const dRing = (x, z, r) => (pip(x, z, r) ? 0 : dLine(x, z, [...r, r[0]]));
const near = (x, z, list, d) => list.some((q) => Math.hypot((q.x ?? q[0]) - x, (q.z ?? q[1]) - z) < d);
const inside = (x, z, m) => { const t = tileAt(x, z); return t ? t.driven.inside(x, z, m) : true; };
const ground = (x, z) => tileAt(x, z)?.hm.ground(x, z) ?? NaN;
const liftAt = (x, z) => tileAt(x, z)?.fit?.lift(x, z) ?? 0;
const onTrack = (x, z, r = 1.5) => TRAM_LINES.some((l) => dLine(x, z, l) < r);
const wallD = (x, z, r = 3) => { let d = Infinity; for (const ring of BLD) { if (Math.abs(ring[0][0] - x) > 80 || Math.abs(ring[0][1] - z) > 80) continue; d = Math.min(d, dRing(x, z, ring)); if (d <= 0) return 0; } return d; };
const pathD = (x, z) => { let d = Infinity; for (const l of PATHS) { if (Math.abs(l[0][0] - x) > 200 && Math.abs(l[l.length - 1][0] - x) > 200) continue; d = Math.min(d, dLine(x, z, l)); } return d; };

/** why a Christmas pole cannot stand at (x, z): null = it can */
export function poleBlocked(x, z, taken = []) {
  if (!tileAt(x, z)) return "outside the tiles";
  if (inside(x, z, P.poleRoad)) return "carriageway / parking";
  if (!(liftAt(x, z) > 0)) return "not on a measured sidewalk";
  if (pathD(x, z) < P.carBody) return "a traffic lane / turn";
  if (onTrack(x, z, P.tram)) return "a tram track";
  if (CROSS.some((r) => dRing(x, z, r) < P.crossing)) return "a zebra crossing";
  if (near(x, z, TREES, P.trunk)) return "a tree trunk";
  if (near(x, z, BOLL, P.other)) return "a bollard";
  if (near(x, z, [...LAMPS, ...TRAMP, ...taken], P.other)) return "another pole";
  if (wallD(x, z) < P.wall) return "a wall / door";
  if (near(x, z, site.chalets, P.chalet + 1.8)) return "a market chalet";
  if (near(x, z, site.trees, P.fir)) return "the fir";
  return null;
}

/** the garland's line (n + 1 points): its sag, the lowest clearance over the road, over a tram track */
export function catenary(a, b, sag, n = 40) {
  const pts = [];
  let minRoad = Infinity, minTram = Infinity;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t);
    pts.push([x, y, z]);
    const g = ground(x, z), over = y - 0.04 - 0.026 * 1.3 - g;       // (the bulbs hang 4 cm under the wire, 3.4 cm tall)
    if (inside(x, z, 0)) minRoad = Math.min(minRoad, over);
    if (onTrack(x, z, 1.6)) minTram = Math.min(minTram, over);
  }
  return { pts, minRoad, minTram };
}

// ---------------------------------------------------------------- the stations
function derive() {
  const streets = site.streets.filter((s) => s.area === P.area);
  for (const e of P.extra) for (const t of tiles) for (const l of t.lines) {
    if (l.name !== e.name) continue;
    const pts = l.pts.filter(([x, z]) => x >= e.box[0] && x <= e.box[1] && z >= e.box[2] && z <= e.box[3]);
    const key = JSON.stringify(pts);
    if (pts.length >= 2 && !streets.some((s) => JSON.stringify(s.pts) === key)) streets.push({ name: e.name, pts });
  }
  const wallMids = site.spans.filter((s) => s.area === P.area).map((s) => [(s.a[0] + s.b[0]) / 2, (s.a[2] + s.b[2]) / 2]);
  const spans = [], poles = [], used = new Set(), rejected = {};
  const rejAt = []; let here = null;
  const rej = (k) => { rejected[k] = (rejected[k] || 0) + 1; if (here) rejAt.push([...here, k]); };
  for (const st of streets) {
    const pts = st.pts, L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    for (let s = P.offset0; s < L[L.length - 1] - P.offset0 + 1e-6; s += P.step) {
      const i = Math.max(1, L.findIndex((v) => v >= s)), f = (s - L[i - 1]) / Math.max(L[i] - L[i - 1], 1e-9);
      const ox = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, oz = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
      let tx = pts[i][0] - pts[i - 1][0], tz = pts[i][1] - pts[i - 1][1]; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
      const nx = -tz, nz = tx; here = [+ox.toFixed(1), +oz.toFixed(1)];
      if (Math.hypot(ox - area.centre[0], oz - area.centre[1]) > area.radius) { rej("outside the area"); continue; }
      // the station on the DRAWN carriageway: the OSM line is not its middle (Avenue du Prince de Ligne runs on the
      // square's paving edge): the drawn band across the line within 8 m, nearest first; the station = its middle
      const band = (u) => inside(ox + nx * u, oz + nz * u, 0);
      let u0 = null; for (let k = 0; k <= 32 && u0 == null; k++) for (const u of k ? [k * 0.25, -k * 0.25] : [0]) if (band(u)) { u0 = u; break; }
      if (u0 == null) { rej("station off the carriageway"); continue; }
      let lo = u0, hi = u0; while (lo > -20 && band(lo - 0.25)) lo -= 0.25; while (hi < 20 && band(hi + 0.25)) hi += 0.25;
      const cx = ox + nx * (lo + hi) / 2, cz = oz + nz * (lo + hi) / 2;
      if (wallMids.some(([x, z]) => Math.hypot(x - cx, z - cz) < P.wallGap)) { rej("a wall garland there"); continue; }
      if (spans.some((q) => Math.hypot(q.mid[0] - cx, q.mid[1] - cz) < P.poleGap)) { rej("a pole garland there"); continue; }
      // each side: the kerb (the carriageway's edge along the normal), then an existing pole near the line, else a new one
      const side = (sg) => {
        let d = 0.25; while (d < 16 && inside(cx + nx * sg * d, cz + nz * sg * d, 0)) d += 0.25;
        if (d >= 16) return { why: "no kerb within 16 m" };
        let best = null;
        for (const p of [...TRAMP, ...LAMPS]) {
          const ox = p.x - cx, oz = p.z - cz, along = ox * tx + oz * tz, across = (ox * nx + oz * nz) * sg;
          if (Math.abs(along) > P.hookAlong || across < d - 0.3 || across > d + 3.5) continue;
          const key = `${p.kind} ${p.x.toFixed(2)},${p.z.toFixed(2)}`;
          if (used.has(key)) continue;
          const score = Math.abs(along) + (p.kind === "tram" ? 0 : 0.5);      // (a tram pole first: taller)
          if (!best || score < best.score) best = { ...p, key, score, kerb: d };
        }
        if (best) return { hook: { kind: best.kind, x: +best.x.toFixed(3), z: +best.z.toFixed(3) }, key: best.key, kerb: d };
        for (const [sh, back] of [0, 1, -1, 2, -2, 3, -3, 4, -4].flatMap((q) => [[q, P.kerbBack], [q, P.kerbBack + 0.4]])) {
          // (the kerb at this shift: the same walk out from the street line)
          let dd = 0.25; const sx = cx + tx * sh, sz = cz + tz * sh;
          while (dd < 16 && inside(sx + nx * sg * dd, sz + nz * sg * dd, 0)) dd += 0.25;
          const px = sx + nx * sg * (dd + back), pz = sz + nz * sg * (dd + back);
          const why = poleBlocked(px, pz, poles);
          if (!why) return { hook: { kind: "pole", x: +px.toFixed(3), z: +pz.toFixed(3) }, kerb: dd };
          if (sh === 0) best = why;
          if (WHY && Math.hypot(cx - WHY[0], cz - WHY[1]) < 4) console.log(`  station ${cx.toFixed(1)},${cz.toFixed(1)} side ${sg} shift ${sh} back ${back}: ${px.toFixed(1)},${pz.toFixed(1)} kerb ${dd} ${why} lift ${liftAt(px, pz).toFixed(2)} path ${pathD(px, pz).toFixed(2)}`);
        }
        return { why: `no pole spot (${best})` };
      };
      const A = side(1), B = side(-1);
      if (!A.hook || !B.hook) { rej(A.why || B.why); continue; }
      const w = Math.hypot(B.hook.x - A.hook.x, B.hook.z - A.hook.z);
      if (w < P.width[0] || w > P.width[1]) { rej("width"); continue; }
      const tram = TRAM_LINES.some((l) => { for (let k = 1; k < 20; k++) { const x = A.hook.x + (B.hook.x - A.hook.x) * k / 20, z = A.hook.z + (B.hook.z - A.hook.z) * k / 20; if (dLine(x, z, l) < 1.6) return true; } return false; });
      if (tram && (A.hook.kind === "lamp" || B.hook.kind === "lamp")) { rej("a lamp hook over a tram line"); continue; }
      // hook heights: the existing pole's own; a Christmas pole matches the other side (or poleHook; tramHook over a tram)
      const own = (h) => (h.kind === "lamp" ? P.lampHook : h.kind === "tram" ? P.tramHook : null);
      const hA = own(A.hook), hB = own(B.hook);
      const def = tram ? P.tramPoleHook : P.poleHook;
      A.hook.h = hA ?? hB ?? def; B.hook.h = hB ?? hA ?? def;
      // the wire's plan line clear of the trunks near its hooks (a pole is chosen clear; a lamp may stand under a crown)
      const nearTrunk = TREES.some((t) => { const d = dSeg(t.x, t.z, A.hook.x, A.hook.z, B.hook.x, B.hook.z); return d < P.wireTrunk && Math.min(Math.hypot(t.x - A.hook.x, t.z - A.hook.z), Math.hypot(t.x - B.hook.x, t.z - B.hook.z)) > 0.5; });
      if (nearTrunk) { rej("a tree on the wire's line"); continue; }
      const a = { ...A.hook, y: ground(A.hook.x, A.hook.z) + liftAt(A.hook.x, A.hook.z) + A.hook.h };
      const b = { ...B.hook, y: ground(B.hook.x, B.hook.z) + liftAt(B.hook.x, B.hook.z) + B.hook.h };
      let sag = +(0.3 + 0.02 * w).toFixed(2);
      for (let k = 0; k < 40; k++) {
        const c = catenary(a, b, sag);
        if (c.minRoad >= P.clear && c.minTram >= P.tramClear) break;
        sag = +(sag - 0.02).toFixed(2);
      }
      const c = catenary(a, b, sag);
      if (sag < P.sagMin || c.minRoad < P.clear || c.minTram < P.tramClear) { rej("clearance"); continue; }
      const midY = (a.y + b.y) / 2 - sag, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, starFoot = +(midY - P.star - ground(mx, mz)).toFixed(2);
      for (const H of [A, B]) { if (H.key) used.add(H.key); if (H.hook.kind === "pole") poles.push({ x: H.hook.x, z: H.hook.z }); }
      spans.push({ id: `pg${spans.length}`, street: st.name, a: A.hook, b: B.hook, width: +w.toFixed(2), sag, motif: !tram && starFoot >= P.starClear, tram,
        mid: [+(cx).toFixed(2), +(cz).toFixed(2)], clear: +c.minRoad.toFixed(2), ...(tram ? { tramClear: +c.minTram.toFixed(2) } : {}) });
    }
  }
  return { spans, rejected, rejAt };
}

/** the star's foot over the road at the garland's middle */
const starFoot = (s) => { const ya = ground(s.a.x, s.a.z) + liftAt(s.a.x, s.a.z) + s.a.h, yb = ground(s.b.x, s.b.z) + liftAt(s.b.x, s.b.z) + s.b.h; return (ya + yb) / 2 - s.sag - P.star - ground((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2); };

// ---------------------------------------------------------------- the checks (rule xmas-pole-garlands)
export function check(doc) {
  const rows = [];
  const row = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  const spans = doc.spans || [];
  const hooks = spans.flatMap((s) => [s.a, s.b]);
  const bad = (f) => spans.filter(f).map((s) => s.id);
  const real = (h) => (h.kind === "lamp" ? LAMPS : h.kind === "tram" ? TRAMP : null)?.some((p) => Math.hypot(p.x - h.x, p.z - h.z) < 0.05);
  const b1 = hooks.filter((h) => h.kind !== "pole" && !real(h));
  row("every lamp / tram-pole hook on a pole the city draws there (placedLampSites / tramPoleSites, 5 cm)", !b1.length, `${hooks.filter((h) => h.kind !== "pole").length} hooks on existing poles${b1.length ? `; off: ${b1.map((h) => `${h.kind} ${h.x},${h.z}`).join(" ")}` : ""}`);
  const own = hooks.filter((h) => h.kind === "pole");
  const b2 = own.map((h, i) => ({ h, why: poleBlocked(h.x, h.z, own.filter((_, j) => j !== i)) })).filter((q) => q.why);
  row("every Christmas pole by the placement rules (sidewalk, off the carriageway / parking, clear of lanes, crossings, trunks, walls, tram, other poles)", !b2.length, `${own.length} poles${b2.length ? `; ${b2.map((q) => `${q.h.x},${q.h.z} (${q.why})`).join("; ")}` : ""}`);
  // rule 27 (nothing-hard-in-carriageway): the poles' 7.5 cm round body never in a driven lane, the car body passes
  const b3 = hooks.filter((h) => { const t = tileAt(h.x, h.z); return !t || t.lanes.inside(h.x, h.z, 0.3) || (h.kind === "pole" && (t.driven.inside(h.x, h.z, P.poleRoad) || pathD(h.x, h.z) < P.carBody)); });
  row("rule 27: no hooked pole in a driven lane (lanesOnly + 0.3 m); the Christmas poles >= 0.45 m off the carriageway and >= 1.25 m from every traffic lane / turn", !b3.length, b3.map((h) => `${h.kind} ${h.x},${h.z}`).join(" ") || `${hooks.length} hooks`);
  const b4 = bad((s) => s.width < P.width[0] || s.width > P.width[1] || Math.abs(Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z) - s.width) > 0.02);
  row(`garland width ${P.width[0]}-${P.width[1]} m hook to hook`, !b4.length, b4.join(" ") || `${Math.min(...spans.map((s) => s.width))}-${Math.max(...spans.map((s) => s.width))} m`);
  const b5 = bad((s) => s.sag < P.sagMin || s.sag / s.width < P.sagRatio[0] || s.sag / s.width > P.sagRatio[1] || s.sag > 0.3 + 0.02 * s.width + 0.006);
  row(`a natural sag: >= ${P.sagMin} m, ${(P.sagRatio[0] * 100).toFixed(1)}-${(P.sagRatio[1] * 100).toFixed(1)} % of the width, at most the wall garlands' 0.3 + 0.02 w`, !b5.length, b5.join(" ") || spans.map((s) => s.sag).join(" "));
  const c6 = spans.map((s) => {
    const a = { ...s.a, y: ground(s.a.x, s.a.z) + liftAt(s.a.x, s.a.z) + s.a.h }, b = { ...s.b, y: ground(s.b.x, s.b.z) + liftAt(s.b.x, s.b.z) + s.b.h };
    return { s, c: catenary(a, b, s.sag) };
  });
  const b6 = c6.filter(({ c }) => !(c.minRoad >= P.clear) || c.minTram < P.tramClear);
  row(`height over the road: the lowest LED >= ${P.clear} m over the carriageway (rule 19: 4.4), >= ${P.tramClear} m over a tram track`, !b6.length && c6.length, b6.map(({ s, c }) => `${s.id} ${c.minRoad.toFixed(2)} / ${c.minTram.toFixed(2)}`).join(" ") || `lowest ${Math.min(...c6.map(({ c }) => c.minRoad)).toFixed(2)} m over the road${c6.some(({ c }) => c.minTram < Infinity) ? `, ${Math.min(...c6.map(({ c }) => c.minTram)).toFixed(2)} m over a track` : ""}`);
  const b7 = bad((s) => [s.a, s.b].some((h) => h.h !== (h.kind === "lamp" ? P.lampHook : h.kind === "tram" ? P.tramHook : h.h) || (h.kind === "pole" && (h.h < P.lampHook || h.h > P.tramPoleHook))) || (s.tram && (s.a.kind === "lamp" || s.b.kind === "lamp")) || (s.motif && (s.tram || starFoot(s) < P.starClear)));
  row("hook heights: lamp 5.5 m (under its lantern), tram pole 6.85 m (its 7.0 m top), a Christmas pole 5.5-7.2 m; no lamp hook and no star over a tram line, a star only where its foot clears 4.6 m", !b7.length, b7.join(" ") || "ok");
  const keys = hooks.filter((h) => h.kind !== "pole").map((h) => `${h.kind} ${h.x},${h.z}`);
  const wallMids = site.spans.filter((s) => s.area === P.area).map((s) => [(s.a[0] + s.b[0]) / 2, (s.a[2] + s.b[2]) / 2]);
  const b8 = bad((s) => wallMids.some(([x, z]) => Math.hypot(x - (s.a.x + s.b.x) / 2, z - (s.a.z + s.b.z) / 2) < P.wallGap - 2));
  row("no pole used twice, no pole garland on a wall garland's spot", new Set(keys).size === keys.length && !b8.length, b8.join(" ") || `${keys.length} existing poles, ${own.length} new`);
  return rows;
}

// ---------------------------------------------------------------- main
const { spans, rejected, rejAt } = derive();
const doc = {
  version: 1, generated_by: "tools/christmas/xmasPoles.mjs (claude/xmas4)", rule: "xmas-pole-garlands", params: P,
  spans: spans.map(({ mid, ...s }) => s),
  counts: { spans: spans.length, hooks: { lamp: 0, tram: 0, pole: 0 }, rejected },
};
for (const s of spans) for (const h of [s.a, s.b]) doc.counts.hooks[h.kind]++;
const rows = check(doc);
if (WRITE) writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
// the committed file = what the current city derives (rule xmas-fit-current-city)
const committed = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const same = committed && JSON.stringify(committed.spans) === JSON.stringify(doc.spans) && JSON.stringify(committed.params) === JSON.stringify(doc.params);
rows.unshift({ name: "models/christmas/poles.json = what the current city data derives (node tools/christmas/xmasPoles.mjs --write)", ok: !!same, info: committed ? `${committed.spans.length} spans committed, ${doc.spans.length} derived` : "missing" });
// mutation tests: the checks must catch a pole in the road, a hook off its lamp, a garland too low
{
  const m = JSON.parse(JSON.stringify(doc));
  const sp = m.spans.find((s) => s.a.kind === "pole" || s.b.kind === "pole"), lamp = m.spans.find((s) => s.a.kind !== "pole" || s.b.kind !== "pole");
  const fails = [];
  if (sp) { const h = sp.a.kind === "pole" ? sp.a : sp.b, t = tileAt(h.x, h.z), n = t.driven.nearest(h.x, h.z); const m2 = JSON.parse(JSON.stringify(m)); const h2 = m2.spans.find((s) => s.id === sp.id)[h === sp.a ? "a" : "b"]; if (n) { h2.x = n.px; h2.z = n.pz; } fails.push(["a Christmas pole moved onto the kerb line", !check(m2).every((r) => r.ok)]); }
  if (lamp) { const m3 = JSON.parse(JSON.stringify(m)); const s3 = m3.spans.find((s) => s.id === lamp.id), h3 = s3.a.kind !== "pole" ? s3.a : s3.b; h3.x += 1; fails.push(["an existing-pole hook moved 1 m", !check(m3).every((r) => r.ok)]); }
  if (m.spans[0]) { const m4 = JSON.parse(JSON.stringify(m)); m4.spans[0].sag = +(m4.spans[0].sag + 2.5).toFixed(2); fails.push(["a garland 2.5 m lower", !check(m4).every((r) => r.ok)]); }
  rows.push({ name: "mutation tests fail the checks (a pole on the kerb line, a hook off its lamp, a garland too low)", ok: fails.length === 3 && fails.every(([, f]) => f), info: fails.map(([n, f]) => `${n}: ${f ? "caught" : "NOT caught"}`).join("; ") });
}
rows.push({ name: "at least 10 pole garlands at Saint-Job (13 wall garlands before)", ok: doc.spans.length >= 10, info: `${doc.spans.length}: hooks lamp ${doc.counts.hooks.lamp}, tram pole ${doc.counts.hooks.tram}, Christmas pole ${doc.counts.hooks.pole}; stations left out: ${Object.entries(rejected).map(([k, v]) => `${k} ${v}`).join(", ")}` });
let fail = 0;
for (const r of rows) { if (!r.ok) fail++; if (!QUIET || !r.ok) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}: ${r.info}`); }
if (PLOT) writeFileSync(PLOT, JSON.stringify({ spans: doc.spans, poles: doc.spans.flatMap((s) => [s.a, s.b]).filter((h) => h.kind === "pole"), rejAt, paths: PATHS.filter((l) => l.some(([x, z]) => Math.hypot(x - area.centre[0], z - area.centre[1]) < area.radius + 50)) }));
console.log(`xmasPoles: ${doc.spans.length} pole garlands (${JSON.stringify(doc.counts.hooks)}), ${rows.length - fail}/${rows.length} checks ok${WRITE ? ", written models/christmas/poles.json" : ""}`);
process.exit(fail ? 1 : 0);
