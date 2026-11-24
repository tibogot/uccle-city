// BIG ADVERTISING BILLBOARDS: placement + the gate row `billboards` (claude/billboards, rule billboards).
// Each board in data/billboards/billboards.json says WHAT Street View shows (look only, our own words): the building
// (UrbIS solid), the wall it hangs on (its outward facing) or the roof it stands on, its size and kind. This snaps it
// to the wall face / roof the city DRAWS (tools/billboards/walls.mjs: viewer/facadeGeom.js analyseBuildings' faces)
// and writes the result into each board's `at`; the viewer (viewer/billboards.js) draws exactly `at`.
//
//   node tools/billboards/billboards.mjs [--write] [--quiet] [--why ID]
//     default: re-derive every board from the CURRENT city data and CHECK the file against it + every rule below
//     --write: write the derived `at` into the file (then re-check)
//
// The rules (rule billboards):
//   street  seen from the street it faces: from at least one eye 15-60 m in front (+-60 deg), on open ground by a road,
//           1.7 m up, the rays to its 4 corners pass over every building of the whole city (seenFromStreet)
//   wall    the board's whole outline (poster + border) lies on ONE drawn face of its building: inside its width, over
//           its foot, >= TOP_GAP under its top (the gable's chimney and coping stay free); the face is blind where the
//           board is (no window, door or garage the painted facade draws there: faceOpenings), nothing built in front
//           of it (a neighbour's roof under its foot), its plane within PLANE_TOL of the face's;
//   roof    every leg and brace foot on the SAME building's roof, the roof flat under them (<= FLAT m), the board's
//           foot ROOF.legClear over the highest foot; inside the roof's outline by EDGE m;
//   sizes   the real ranges per kind (SIZES), readable (h >= 1.8 m), the poster's aspect = the board's (12 %);
//   posters invented only: no real brand / company word (BRANDS) in any poster text; every board has its posters
//           (a trivision three); no board on a building a scripted model hides (placement.hides_*).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tileWalls, cityRoofOf, ROOT } from "./walls.mjs";

const argv = process.argv.slice(2);
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const WRITE = flag("--write"), QUIET = flag("--quiet"), WHY = opt("--why", null);
const FILE = join(ROOT, "data/billboards/billboards.json");

export const TOL = { plane: 0.05, at: 0.05, edge: 0.25, topGap: 0.3, footGap: 0.3, front: 0.8, flat: 0.45, open: 0.1 };   // (front: m out of the wall probed for a roof under the board, with 0.4 and 1.4)
/** the real ranges per kind (m): [w min, w max, h min, h max] */
export const SIZES = {
  panel: [3.0, 12.5, 1.8, 4.5],        // 4 x 3 m (12 m2) up to the 10 x 3.3 m "36 m2" boards
  backlit: [3.0, 9.0, 1.8, 3.5],
  trivision: [2.5, 8.0, 1.8, 3.4],     // prism boards: 3 x 2 m street ones to 8 x 3 m gable ones
  gable: [3.0, 14.0, 3.0, 16.0],       // canvas / painted ads on a blind gable
  roof: [4.0, 14.0, 2.5, 5.0],
};
/** real brands / companies / advertisers that must never appear on a poster (word match, case-insensitive) */
export const BRANDS = ["coca", "cola", "pepsi", "mcdonald", "burger king", "kfc", "quick", "nike", "adidas", "puma", "samsung", "apple", "iphone", "huawei", "sony",
  "proximus", "telenet", "orange", "base", "voo", "scarlet", "mobile vikings", "delhaize", "colruyt", "carrefour", "aldi", "lidl", "intermarche", "cora", "match",
  "jupiler", "stella", "artois", "heineken", "leffe", "duvel", "chimay", "maes", "ikea", "toyota", "bmw", "mercedes", "renault", "peugeot", "citroen", "volkswagen",
  "audi", "tesla", "ford", "opel", "kia", "hyundai", "ing", "bnp", "fortis", "belfius", "kbc", "argenta", "axa", "ethias", "jcdecaux", "clear channel", "netflix",
  "amazon", "google", "facebook", "h&m", "zara", "primark", "mediamarkt", "media markt", "coolblue", "fnac", "spotify", "red bull", "lotto", "loterie nationale",
  "q8", "total", "totalenergies", "shell", "esso", "texaco", "lukoil", "gulf", "dats", "stib", "mivb", "sncb", "nmbs", "uber", "deliveroo", "bpost", "kinepolis",
  "ugc", "forest national", "ancienne belgique", "dh", "le soir", "rtbf", "vrt", "rtl", "nrj", "bel rtl", "lego", "haribo", "cote d'or", "côte d'or", "galler", "neuhaus",
  "leonidas", "godiva", "spa", "chaudfontaine", "evian", "vittel", "nespresso", "starbucks", "exki", "panos", "pizza hut", "domino", "di", "kruidvat", "hema", "action",
  "brico", "gamma", "hubo", "decathlon", "torfs", "c&a", "zalando", "bol.com", "vinted", "immoweb", "2dehands", "bru", "brussels airlines", "ryanair", "tui", "engie", "luminus"];

const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const rows = [];
const row = (ok, msg) => { rows.push({ ok, msg }); if (!QUIET || !ok) console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };

/** the scripted models' hide lists (models/<name>/*.json placement.hides_bu_ids / hides_solids) -> Set of solid ids */
function hiddenSolids() {
  const out = new Set();
  for (const d of readdirSync(join(ROOT, "models"))) {
    const dir = join(ROOT, "models", d);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      let p; try { p = J(join(dir, f)).placement; } catch { continue; }
      for (const id of [...(p?.hides_bu_ids ?? []), ...(p?.hides_solids ?? [])]) out.add(String(id).split("/").pop());
    }
  }
  return out;
}

// the kit's own numbers (viewer/billboardsKit.js: the pure half of viewer/billboards.js, no three.js)
const KIT = await import(pathToFileURL(join(ROOT, "viewer/billboardsKit.js")).href);
const FRAME_BORDER = Object.fromEntries(Object.entries(KIT.FRAME).map(([k, v]) => [k, v.border]));
const ROOF_LEG = KIT.ROOF.legClear, ROOF_BRACE = KIT.ROOF.brace;

/** the face of the board's building it hangs on: the face of that solid whose outward normal is closest to `facing` */
function pickFace(W, b) {
  const [fx, fz] = b.facing, L = Math.hypot(fx, fz);
  let best = null;
  for (const f of W.faces) {
    if (f.solid !== String(b.solid)) continue;
    const c = (f.nx * fx + f.nz * fz) / L;
    if (c < 0.94) continue;
    // several faces of one facing (a stepped wall): the one nearest the hint point, else the widest
    const [cx, cz] = f.at(f.width / 2);
    const d = b.near ? Math.hypot(cx - b.near[0], cz - b.near[1]) : -f.width;
    if (!best || d < best.d) best = { f, d };
  }
  return best?.f || null;
}

/** derive one board's `at` from the city data; -> { at, issues: [string] } */
export function derive(b, opt = {}) {
  const issues = [];
  const W = tileWalls(b.tile);
  const bd = FRAME_BORDER[b.kind] ?? 0.14, hw = b.w / 2 + bd;
  if (b.mount === "roof") {
    const bi = W.buildings.findIndex((q) => W.solidId(q) === String(b.solid));
    if (bi < 0) return { at: null, issues: [`solid ${b.solid} not in tile ${b.tile}`] };
    const [nx0, nz0] = b.facing, L = Math.hypot(nx0, nz0), nx = nx0 / L, nz = nz0 / L, tx = nz, tz = -nx;   // t: the viewer's right (= viewer/billboards.js)
    const [px, pz] = b.near;
    const feet = [];
    const nLeg = Math.max(2, Math.round(b.w / 3.2) + 1);
    for (let i = 0; i < nLeg; i++) {
      const a = -b.w / 2 + (b.w * i) / (nLeg - 1);
      feet.push([px + tx * a, pz + tz * a], [px + tx * a - nx * ROOF_BRACE, pz + tz * a - nz * ROOF_BRACE]);
    }
    // the walkway's front edge and the frame's ends must stay over the roof too
    for (const a of [-hw, hw]) for (const c of [0.9, -ROOF_BRACE - 0.1]) feet.push([px + tx * a + nx * c, pz + tz * a + nz * c]);
    const ys = feet.map(([x, z]) => W.roofAt(bi, x, z));
    if (ys.some((y) => !Number.isFinite(y))) issues.push(`a leg / brace / walkway corner off the roof of solid ${b.solid}`);
    const fin = ys.filter(Number.isFinite), hi = Math.max(...fin), lo = Math.min(...fin);
    if (fin.length && hi - lo > TOL.flat) issues.push(`roof not flat under the legs (${(hi - lo).toFixed(2)} m > ${TOL.flat})`);
    // inside the roof outline by EDGE: probe EDGE further out round the frame
    const ring = W.buildings[bi].footprint[0];
    const inRing = (x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
    for (const [x, z] of feet) for (const [ex, ez] of [[TOL.edge, 0], [-TOL.edge, 0], [0, TOL.edge], [0, -TOL.edge]]) if (!inRing(x + ex, z + ez)) { issues.push(`a foot within ${TOL.edge} m of the roof's edge`); break; }
    const y = (fin.length ? hi : 0) + ROOF_LEG;
    // the roof kit's stacks / flat-roof items (their collision tops) clear of the board, its legs, braces and walkway
    const inQuad = (x, z) => { const a = (x - px) * tx + (z - pz) * tz, c = (x - px) * nx + (z - pz) * nz; return Math.abs(a) <= hw + 0.3 && c >= -ROOF_BRACE - 0.3 && c <= 1.2; };
    for (const [x0, z0, x1, z1, top] of W.cols) {
      if (top < hi + 0.05) continue;
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, (z0 + z1) / 2]];
      if (pts.some(([x, z]) => inQuad(x, z))) { issues.push(`a roof-kit item (stack / vent, top ${top.toFixed(1)}) under the board's footprint`); break; }
    }
    // nothing taller right in front of / behind the board (a neighbour's wall through it)
    for (let a = -hw; a <= hw + 1e-6; a += 0.5) for (const c of [0.3, 1.2]) { const q = cityRoofOf(px + tx * a + nx * c, pz + tz * a + nz * c); if (q && q.solid !== String(b.solid) && q.y > y) { issues.push(`a neighbour's roof (${q.y.toFixed(1)}) over the board's foot in front of it`); a = 1e9; break; } }
    return { at: { p: [+px.toFixed(3), +y.toFixed(3), +pz.toFixed(3)], n: [+nx.toFixed(5), +nz.toFixed(5)], leg: ROOF_LEG, roof: +hi.toFixed(3), mount: "roof" }, issues };
  }
  if (b.mount === "ground") return deriveGround(b, W, bd, hw);
  const f = pickFace(W, b);
  if (!f) return { at: null, issues: [`no face of solid ${b.solid} (tile ${b.tile}) faces ${b.facing}`] };
  // u: the board's centre along the face (m from its left end, seen from outside); `u` in the data, else the middle of
  // the face; y0: its poster's foot (m over the face's base line), else the lowest blind spot
  // (u in the data: from the face's left end SEEN FROM OUTSIDE; the face's own u runs along its t = the viewer's left)
  const u = f.width - (b.u ?? f.width / 2);
  const lo = u - hw, hi2 = u + hw;
  if (lo < TOL.edge || hi2 > f.width - TOL.edge) issues.push(`outside the face's width (${lo.toFixed(2)}..${hi2.toFixed(2)} of ${f.width.toFixed(2)})`);
  // the neighbour's roof in front of the wall (a party wall: blind up to there, built against below it)
  let front = -Infinity, top = Infinity, foot = -Infinity;
  for (let a = Math.max(lo, 0.05); a <= Math.min(hi2, f.width - 0.05) + 1e-6; a += 0.25) {
    // the roofs built in front, 0.4 m out (the party wall's neighbour) and over the frame's / lamp arms' reach
    for (const out of [0.4, TOL.front, 1.4]) { const [x, z] = f.at(a, out), q = cityRoofOf(x, z); if (q && q.solid !== f.solid) front = Math.max(front, q.y); }
    top = Math.min(top, f.wallTop(a)); foot = Math.max(foot, f.wallFoot(a));
  }
  const yMin = Math.max(front + TOL.footGap, foot + (b.minH ?? 0));
  const y0 = b.y0 != null ? f.base + b.y0 : yMin + bd;
  const yb = y0 - bd, yt = y0 + b.h + bd;
  if (yb < front + TOL.footGap - 1e-6) issues.push(`its foot (${(yb - f.base).toFixed(2)}) under the roof built in front of it (${(front - f.base).toFixed(2)} + ${TOL.footGap})`);
  if (yb < foot - 1e-6) issues.push(`its foot under the wall's foot`);
  if (yt > top - TOL.topGap + 1e-6) issues.push(`its top (${(yt - f.base).toFixed(2)}) within ${TOL.topGap} m of the wall's top (${(top - f.base).toFixed(2)})`);
  // the openings the painted facade draws on that face (the board covers none, by TOL.open)
  for (const o of W.openings(f)) {
    const ou0 = o.u0 - TOL.open, ou1 = o.u1 + TOL.open, oh0 = f.base + o.h0 - TOL.open, oh1 = f.base + o.h1 + TOL.open;
    if (ou1 > lo && ou0 < hi2 && oh1 > yb && oh0 < yt) { issues.push(`covers a ${o.kind} (floor ${o.floor}, bay ${o.bay})`); break; }
  }
  // the roof kit's chimney stacks: a party-wall stack straddles the wall and runs down it to the lower roof in front
  for (const st of W.stacks) {
    const du = (st.x * f.tx + st.z * f.tz) - (f.u0 + u), dn = st.x * f.nx + st.z * f.nz - f.plane;
    const half = Math.abs(st.tx * f.tx + st.tz * f.tz) * st.w / 2 + Math.abs(st.tx * f.tz - st.tz * f.tx) * st.d / 2;
    if (Math.abs(du) < hw + half + 0.1 && dn > -0.8 && dn < 1.2 && st.y1 > yb && st.y0 < yt) { issues.push(`a chimney stack across it (${du.toFixed(2)} m along, ${st.y0.toFixed(1)}-${st.y1.toFixed(1)})`); break; }
  }
  const [x, z] = f.at(u, 0);
  return { at: { p: [+x.toFixed(3), +y0.toFixed(3), +z.toFixed(3)], n: [+f.nx.toFixed(5), +f.nz.toFixed(5)], face: f.key, u: +u.toFixed(3), base: +f.base.toFixed(3),
    width: +f.width.toFixed(3), party: f.partyH >= 999, mount: "wall" }, issues, face: f };
}

/** the tile's drawn-ground heightmap (viewer/heightmap.js, the DTM the terrain mesh is built from) */
const hmCache = new Map();
async function heightmap(T) {
  if (hmCache.has(T)) return hmCache.get(T);
  const { Heightmap } = await import(pathToFileURL(join(ROOT, "viewer/heightmap.js")).href);
  const d = join(ROOT, "data/tiles", T), hdr = J(join(d, "terrain.json")), buf = readFileSync(join(d, "terrain.u16"));
  const hm = new Heightmap(hdr, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  hmCache.set(T, hm);
  return hm;
}
const { ROAD_TYPES } = await import(pathToFileURL(join(ROOT, "vendor/roads/roadCrossSection.js")).href);
const roadHalf = (type) => { const R = ROAD_TYPES[type] || ROAD_TYPES.local; return Math.max(...[R.left, R.right].map((s) => s.reduce((a, l) => a + l.width, 0))) + (R.center?.width || 0) / 2; };
/** legs of a free-standing board: along t (m from its centre) */
export const groundLegs = (w) => (w <= 6 ? [-(w / 2 - 0.55), w / 2 - 0.55] : [-(w / 2 - 0.6), 0, w / 2 - 0.6]);
const GROUND = { sink: 0.5, clearMin: 1.6, slope: 1.6, trunk: 1.2, road: 1.5, bridge: 3.0 };
let railBridges = null;

/** a free-standing board on legs (mount "ground"): every foot on open ground (no building, off every road's whole
 *  cross-section by GROUND.road m, GROUND.trunk m from tree trunks), the legs' feet within GROUND.slope m of each other */
function deriveGround(b, W, bd, hw) {
  const issues = [], hm = hmCache.get(b.tile);
  const [nx0, nz0] = b.facing, L = Math.hypot(nx0, nz0), nx = nx0 / L, nz = nz0 / L, tx = nz, tz = -nx;
  const [px, pz] = b.near;
  const legs = groundLegs(b.w).map((a) => { const x = px + tx * a, z = pz + tz * a; return [a, +hm.ground(x, z).toFixed(3), x, z]; });
  const ys = legs.map((q) => q[1]), hi = Math.max(...ys), lo = Math.min(...ys);
  if (hi - lo > GROUND.slope) issues.push(`the legs' feet ${(hi - lo).toFixed(2)} m apart in height (> ${GROUND.slope})`);
  const clear = b.clear ?? 2.0;
  if (clear < GROUND.clearMin) issues.push(`the board's foot ${clear} m over the ground (< ${GROUND.clearMin}: walked into)`);
  const feats = J(join(ROOT, "data/tiles", b.tile, "features.json")), roads = J(join(ROOT, "data/tiles", b.tile, "roads.json")).roads;
  // the rail bridges' footprints (data/rail/rail.json: the hero viaducts' masonry and decks) + GROUND.bridge m
  railBridges ??= J(join(ROOT, "data/rail/rail.json")).bridges.map((q) => q.ring);
  const inRing = (ring, x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const nearRing = (ring, x, z) => inRing(ring, x, z) || ring.some((p, i) => { const q = ring[(i + 1) % ring.length], dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz || 1e-9, k = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / l2)); return Math.hypot(p[0] + k * dx - x, p[1] + k * dz - z) < GROUND.bridge; });
  // the whole footprint (the frame's ends, the legs) on open ground
  const pts = [...legs.map((q) => [q[2], q[3]]), [px + tx * -hw, pz + tz * -hw], [px + tx * hw, pz + tz * hw]];
  for (const [x, z] of pts) {
    if (cityRoofOf(x, z)) { issues.push(`a foot / end inside a building (${x.toFixed(1)}, ${z.toFixed(1)})`); break; }
    if (railBridges.some((r) => nearRing(r, x, z))) { issues.push(`a foot / end within ${GROUND.bridge} m of a rail bridge`); break; }
    const t = feats.trees.find((q) => Math.hypot(q.x - x, q.z - z) < GROUND.trunk);
    if (t) { issues.push(`a foot / end ${Math.hypot(t.x - x, t.z - z).toFixed(2)} m from a tree trunk`); break; }
    for (const r of roads) {
      if (/footway|path|steps|cycleway/.test(r.meta?.highway || "")) continue;
      const half = roadHalf(r.type) + GROUND.road;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], c = r.pts[i + 1], dx = c.x - a.x, dz = c.z - a.z, l2 = dx * dx + dz * dz || 1e-9;
        const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)), d = Math.hypot(a.x + k * dx - x, a.z + k * dz - z);
        if (d < half) { issues.push(`a foot / end ${d.toFixed(1)} m from ${r.meta?.name || r.type}'s centre line (its street ${half.toFixed(1)} m)`); break; }
      }
    }
  }
  const y = hi + clear + bd;
  return { at: { p: [+px.toFixed(3), +y.toFixed(3), +pz.toFixed(3)], n: [+nx.toFixed(5), +nz.toFixed(5)], legs: legs.map((q) => [q[0], +(q[1] - GROUND.sink).toFixed(3)]), mount: "ground" }, issues };
}


/** SEEN FROM THE STREET (round 2, coordinator review 2026-11-24): a board is drawn to be read from the street it faces.
 *  Eyes on a fan in front of it (+-60 degrees off its normal, 15-60 m out), each on open ground within VIS.road m (the pavements, a square's middle) of a
 *  street's, square's or footway's centre line, at VIS.eye m over the drawn ground; the board is seen when, from at least one eye, the rays to its
 *  4 outer corners pass over every building of the WHOLE city (cityRoofOf, every tile) - buildings only, trees are not
 *  volumes here. -> { ok, eye: [x, y, z] | null, why } */
export const VIS = { eye: 1.7, road: 25, dists: [15, 20, 25, 30, 35, 40, 50, 60], fan: 60, step: 7.5, near: 0.7 };
const roadTiles = new Map();
const roadsOf = (T) => { if (!roadTiles.has(T)) roadTiles.set(T, J(join(ROOT, "data/tiles", T, "roads.json")).roads.filter((r) => !/steps|track|service/.test(r.meta?.highway || ""))); return roadTiles.get(T); };   // (streets, squares and footways: people read boards from all of them)
let manifestV = null;
const tileAt = (x, z) => { manifestV ??= J(join(ROOT, "data/tiles/manifest.json")); return manifestV.tiles.find((t) => t.status !== "missing" && x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name; };
const tilesNear = (x, z, r) => { manifestV ??= J(join(ROOT, "data/tiles/manifest.json")); return manifestV.tiles.filter((t) => t.status !== "missing" && x + r >= t.bounds.x[0] && x - r <= t.bounds.x[1] && z + r >= t.bounds.z[0] && z - r <= t.bounds.z[1]).map((t) => t.name); };
const nearRoad = (x, z) => tilesNear(x, z, VIS.road).some((T) => roadsOf(T).some((r) => { for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], c = r.pts[i + 1], dx = c.x - a.x, dz = c.z - a.z, l2 = dx * dx + dz * dz || 1e-9, k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)); if (Math.hypot(a.x + k * dx - x, a.z + k * dz - z) < VIS.road) return true; } return false; }));
/** the board's 4 outer corners (world) from its `at` */
export function boardCorners(b, at) {
  const bd = FRAME_BORDER[b.kind] ?? 0.14, [x, y, z] = at.p, [nx, nz] = at.n, tx = nz, tz = -nx, hw = b.w / 2 + bd, out = at.mount === "wall" ? 0.45 : 0.3;
  return [[-hw, -bd], [hw, -bd], [hw, b.h + bd], [-hw, b.h + bd]].map(([a, h]) => [x + tx * a + nx * out, y + h, z + tz * a + nz * out]);
}
export function seenFromStreet(b, at) {
  const corners = boardCorners(b, at), [nx, nz] = at.n, own = String(b.solid ?? "");
  const cx = corners.reduce((s, c) => s + c[0], 0) / 4, cz = corners.reduce((s, c) => s + c[2], 0) / 4;
  let eyes = 0;
  for (const D of VIS.dists) for (let sd = 0; sd <= VIS.fan; sd += VIS.step) for (const sg of sd ? [1, -1] : [1]) {
    const s = (sg * sd * Math.PI) / 180, dx = nx * Math.cos(s) - nz * Math.sin(s), dz = nx * Math.sin(s) + nz * Math.cos(s);
    const ex = cx + dx * D, ez = cz + dz * D, T = tileAt(ex, ez), hm = T && hmCache.get(T);
    if (!hm || cityRoofOf(ex, ez) || !nearRoad(ex, ez)) continue;
    const ey = hm.ground(ex, ez) + VIS.eye;
    if (!Number.isFinite(ey)) continue;
    eyes++;
    const clear = corners.every(([qx, qy, qz]) => {
      const L = Math.hypot(qx - ex, qz - ez);
      for (let d = 0.5; d < L - VIS.near; d += 0.5) {
        const k = d / L, r = cityRoofOf(ex + (qx - ex) * k, ez + (qz - ez) * k);
        if (r && r.solid !== own && r.y > ey + (qy - ey) * k) return false;
      }
      return true;
    });
    if (clear) return { ok: true, eye: [+ex.toFixed(1), +ey.toFixed(1), +ez.toFixed(1)], why: `seen from (${ex.toFixed(1)}, ${ez.toFixed(1)}) ${D} m out` };
  }
  return { ok: false, eye: null, why: eyes ? `from none of ${eyes} street eyes 15-60 m in front are its 4 corners clear of the buildings` : "no street eye on open ground 15-60 m in front of it" };
}


/** DRAWN WHERE THE DATA SAYS (round 3, coordinator review 2026-11-24): build the boards with the kit the city uses
 *  (viewer/billboardsKit.js buildBoards, the same function viewer/billboards.js calls) and check each board's geometry
 *  against its `at`: the poster quad's centre = at.p + n x (the box's front) + up x h / 2 (5 cm), its normal = n, its size
 *  = w x h; a trivision's slat axes on one line in front of the box, spanning its width; every frame vertex inside the
 *  board's own reach (its legs, braces, lamp arms) -> [{ id, ok, why }] */
export function drawnChecks(doc) {
  const cells = Object.fromEntries(doc.posters.map((p) => [p.id, [0, 0, 1, 1]]));
  const boards = doc.boards.filter((b) => b.at), K = KIT.buildBoards({ ...doc, boards }, cells), out = [];
  for (const b of boards) {
    const r = K.ranges.find((q) => q.id === b.id), why = [];
    if (!r) { out.push({ id: b.id, ok: false, why: "not built by the kit" }); continue; }
    const F = KIT.FRAME[b.kind] || KIT.FRAME.panel, [px, py, pz] = b.at.p, [nx, nz] = b.at.n, tx = nz, tz = -nx;
    const loc = (x, y, z) => [(x - px) * tx + (z - pz) * tz, y - py, (x - px) * nx + (z - pz) * nz];   // (along, up, out)
    const c1 = F.standoff + F.depth;
    if (b.kind !== "trivision") {
      const P = K.posters.p.slice(r.p[0], r.p[1]), N = K.posters.n.slice(r.p[0], r.p[1]);
      if (P.length !== 18) why.push(`${P.length / 3} poster vertices (6 expected)`);
      else {
        const L = [0, 1, 2, 3, 4, 5].map((i) => loc(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
        const mid = [0, 1, 2].map((k) => L.reduce((s2, v) => s2 + v[k], 0) / 6);
        const span = [0, 1].map((k) => Math.max(...L.map((v) => v[k])) - Math.min(...L.map((v) => v[k])));
        if (Math.abs(mid[0]) > 0.05 || Math.abs(mid[2] - c1) > 0.05 || Math.abs(Math.max(...L.map((v) => v[1])) - b.h) > 0.05 || Math.abs(Math.min(...L.map((v) => v[1]))) > 0.05)
          why.push(`poster off its place (along ${mid[0].toFixed(2)}, out ${mid[2].toFixed(2)} vs ${c1.toFixed(2)})`);
        if (Math.abs(span[0] - b.w) > 0.05 || Math.abs(span[1] - b.h) > 0.05) why.push(`poster ${span[0].toFixed(2)} x ${span[1].toFixed(2)} (data ${b.w} x ${b.h})`);
        if (N[0] * nx + N[2] * nz < 0.99) why.push("poster not facing the board's way");
      }
    } else {
      const S = K.slats.p.slice(r.s[0], r.s[1]);
      if (!S.length) why.push("no slats");
      const A = []; for (let i = 0; i < S.length; i += 3) A.push(loc(S[i], S[i + 1], S[i + 2]));
      const outs = A.map((v) => v[2]), alongs = A.map((v) => v[0]);
      if (A.some((v) => Math.abs(v[1]) > 0.01) || Math.max(...outs) - Math.min(...outs) > 0.01 || Math.min(...outs) < c1) why.push("slat axes not on one line in front of the box");
      if (Math.abs(Math.max(...alongs) + Math.min(...alongs)) > 0.05 || Math.max(...alongs) - Math.min(...alongs) > b.w || Math.max(...alongs) - Math.min(...alongs) < b.w * 0.85) why.push("slats not spanning the board");
    }
    const Fp = K.frames.p.slice(r.f[0], r.f[1]), bd = F.border;
    const low = b.mount === "ground" ? Math.min(...b.at.legs.map((q) => q[1])) - py - 0.01 : b.mount === "roof" ? -(b.at.leg ?? ROOF_LEG) - bd - 0.2 : -bd - 0.01;
    for (let i = 0; i < Fp.length; i += 3) {
      const [a, h, c] = loc(Fp[i], Fp[i + 1], Fp[i + 2]);
      if (Math.abs(a) > b.w / 2 + bd + 0.25 || h < low || h > b.h + bd + 0.2 || c < (b.mount === "roof" ? -ROOF_BRACE - 0.1 : b.mount === "ground" ? -0.4 : -0.01) || c > c1 + 1.3) { why.push(`a frame vertex out of the board's reach (${a.toFixed(2)}, ${h.toFixed(2)}, ${c.toFixed(2)})`); break; }
    }
    out.push({ id: b.id, ok: !why.length, why: why.join("; ") || "poster / slats / frame where `at` says" });
  }
  return out;
}

/** the poster texts' brand words */
export function brandHits(p) {
  const txt = ` ${[p.brand, ...(p.lines || []), p.small].filter(Boolean).join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")} `;
  return BRANDS.filter((w) => new RegExp(`(^|[^a-z0-9])${w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}([^a-z0-9]|$)`).test(txt));
}

export function check(doc, { quietRows = false } = {}) {
  const out = [];
  const r = (ok, msg) => out.push({ ok, msg });
  const hidden = hiddenSolids(), posters = new Map(doc.posters.map((p) => [p.id, p]));
  for (const p of doc.posters) { const h = brandHits(p); r(!h.length, `poster ${p.id}: ${h.length ? `real brand word(s) ${h.join(", ")}` : "invented"}`); }
  const drawn = new Map(drawnChecks(doc).map((q) => [q.id, q]));
  for (const b of doc.boards) {
    const tag = `board ${b.id} (${b.kind}, ${b.place})`;
    const S = SIZES[b.kind];
    r(!!S && b.w >= S[0] && b.w <= S[1] && b.h >= S[2] && b.h <= S[3], `${tag}: size ${b.w} x ${b.h} m in the ${b.kind} range ${S}`);
    r(!!b.source && b.source.length > 12, `${tag}: has a source note`);
    const ps = (b.posters || []).map((id) => posters.get(id));
    r(ps.length > 0 && ps.every(Boolean) && (b.kind !== "trivision" || ps.length === 3), `${tag}: posters ${b.posters} exist${b.kind === "trivision" ? " (three faces)" : ""}`);
    for (const p of ps.filter(Boolean)) { const [a, c] = p.aspect.split(":").map(Number); const k = (a / c) / (b.w / b.h); r(k > 0.88 && k < 1.12, `${tag}: poster ${p.id} aspect ${p.aspect} fits ${b.w} x ${b.h}`); }
    r(!hidden.has(String(b.solid)), `${tag}: solid ${b.solid} drawn by the city (no scripted model hides it)`);
    const d = derive(b);
    r(!!d.at && !d.issues.length, `${tag}: on its ${b.mount === "roof" ? "roof" : "wall"}${d.issues.length ? ": " + d.issues.join("; ") : ""}`);
    if (d.at && b.at) {
      const e = Math.hypot(d.at.p[0] - b.at.p[0], d.at.p[1] - b.at.p[1], d.at.p[2] - b.at.p[2]), en = Math.hypot(d.at.n[0] - b.at.n[0], d.at.n[1] - b.at.n[1]);
      r(e <= TOL.at && en < 0.01, `${tag}: the file's position = the current city's (${e.toFixed(3)} m)`);
    } else r(false, `${tag}: the file has its derived position (run --write)`);
    if (b.at) { const v = seenFromStreet(b, b.at); r(v.ok, `${tag}: seen from the street it faces (${v.why})`); }
    if (b.at) { const q = drawn.get(b.id); r(!!q?.ok, `${tag}: drawn where the data says (viewer/billboardsKit.js buildBoards: ${q?.why ?? "not built"})`); }
  }
  return out;
}

/** mutation tests: a board 1 m off its wall, a board over a window, a brand word: each must fail */
function mutations(doc) {
  const out = [];
  const wall = doc.boards.find((b) => b.mount !== "roof");
  if (wall) {
    const m = { ...wall, at: { ...wall.at, p: [wall.at.p[0] + wall.at.n[0], wall.at.p[1], wall.at.p[2] + wall.at.n[1]] } };
    const c = check({ posters: doc.posters, boards: [m] });
    out.push({ ok: c.some((q) => !q.ok && /position/.test(q.msg)), msg: "mutation: a board 1 m off its wall fails" });
    const low = { ...wall, y0: -0.5, at: null };
    out.push({ ok: !!derive(low).issues.length, msg: "mutation: a board pushed down to the street (through the roof in front / the openings) fails" });
  }
  out.push({ ok: brandHits({ brand: "Jupiler", lines: ["x"] }).length > 0 && brandHits({ brand: "Café Moka", lines: ["le petit noir"] }).length === 0, msg: "mutation: a brand word is found, an invented one is not" });
  const tall = doc.boards.find((b) => b.kind === "panel");
  if (tall) out.push({ ok: check({ posters: doc.posters, boards: [{ ...tall, w: 30 }] }).some((q) => !q.ok && /size/.test(q.msg)), msg: "mutation: a 30 m panel fails the size range" });
  // the planted case (coordinator review 2026-11-24): waterloo_panel as first placed, an 8 x 3 m board 10 m up the
  // north gable of UrbIS 604726 (J5), 6 m from the J4 edge: a J4 building 8.6 m in front, its roof 3 m over the board's
  // foot, hid it from Ch. de Waterloo (the street-level tour view (1857.7, -29.1) saw no board at all)
  // a board whose drawn geometry is not at `at`: the kit fed a different `at` than the one checked
  const danco = doc.boards.find((b) => b.mount === "wall" && b.kind !== "trivision");
  if (danco) {
    const cells = Object.fromEntries(doc.posters.map((p) => [p.id, [0, 0, 1, 1]]));
    const moved = { ...danco, at: { ...danco.at, p: [danco.at.p[0], danco.at.p[1] + 2, danco.at.p[2]] } };
    const K = KIT.buildBoards({ ...doc, boards: [moved] }, cells), P = K.posters.p, cy = (P[1] + P[7] + P[13] + P[4] + P[10] + P[16]) / 6;
    out.push({ ok: Math.abs(cy - (danco.at.p[1] + danco.h / 2)) > 1, msg: "mutation: a poster drawn 2 m off its `at` is seen by the drawn-geometry check" });
  }
  const planted = { id: "planted", kind: "panel", mount: "wall", tile: "J5", solid: "604726", facing: [0.044, -0.999], u: 6.5, y0: 10, w: 8, h: 3 };
  const pd = derive(planted);
  out.push({ ok: !!pd.at && !seenFromStreet(planted, pd.at).ok, msg: "mutation: the first waterloo_panel (hidden behind the J4 building in front) fails the street view" });
  return out;
}

/** preload what derive() needs asynchronously (the heightmaps of the ground boards' tiles) */
export async function prepare(doc) {
  // the ground boards' tiles and every tile a street eye can stand on (40 m + the board round each board)
  const pts = doc.boards.map((b) => b.at?.p ? [b.at.p[0], b.at.p[2]] : b.near).filter(Boolean);
  pts.push([1856.1, 5.9]);                                   // (the planted mutation's)
  const Ts = new Set(doc.boards.filter((b) => b.mount === "ground").map((b) => b.tile));
  for (const [x, z] of pts) for (const T of tilesNear(x, z, 60)) Ts.add(T);
  for (const T of Ts) await heightmap(T);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const doc = J(FILE);
  await prepare(doc);
  if (WHY) { const b = doc.boards.find((q) => q.id === WHY); const d = derive(b); console.log(JSON.stringify({ at: d.at, issues: d.issues, face: d.face && { width: d.face.width, base: d.face.base, top: d.face.top, partyH: d.face.partyH, street: d.face.street } }, null, 1)); process.exit(0); }
  if (WRITE) {
    for (const b of doc.boards) {
      const d = derive(b); b.at = d.at; if (d.issues.length) console.log(`WARN ${b.id}: ${d.issues.join("; ")}`);
      // the street eye the row found (a tour / shot from there sees the board whole; an eye inside a building's
      // footprint is never one: an UrbIS block drawn without its walls is still a building)
      const v = d.at && seenFromStreet(b, d.at);
      if (v?.ok) { const C = boardCorners(b, d.at); b.view = { eye: v.eye, look: [+(C.reduce((s2, c) => s2 + c[0], 0) / 4).toFixed(1), +(C.reduce((s2, c) => s2 + c[1], 0) / 4).toFixed(1), +(C.reduce((s2, c) => s2 + c[2], 0) / 4).toFixed(1)] }; } else delete b.view;
    }
    // one poster / board per line (diffs stay readable)
    const { posters, boards, ...head } = doc, lines = (a) => a.map((q) => "  " + JSON.stringify(q)).join(",\n");
    writeFileSync(FILE, JSON.stringify(head, null, 1).replace(/\n}$/, `,\n "posters": [\n${lines(posters)}\n ],\n "boards": [\n${lines(boards)}\n ]\n}\n`));
    console.log(`wrote ${FILE}`);
  }
  for (const q of [...check(doc), ...mutations(doc)]) row(q.ok, q.msg);
  const bad = rows.filter((q) => !q.ok).length;
  console.log(`billboards: ${doc.boards.length} boards, ${doc.posters.length} posters, ${rows.length} checks, ${bad} failed`);
  process.exit(bad ? 1 : 0);
}
