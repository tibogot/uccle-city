// DECK PROFILES + DECK OWNERS (claude/places1, 2026-11-23; rules deck-profile-measured, deck-owner-checks).
// No browser: every built tile's roads.json, the terrain grids, data/overrides.json bridgeProfiles.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/deckProfileCheck.mjs [--quiet]
//
// P  every OSM road bridge way (roads.json, meta.bridge not "no") is either measured (bridgeProfiles.<osm>) or listed
//    in SKIPPED below with the reason tools/bridges/deckProfiles.py gave (a new / changed bridge must be measured)
// P  a measured profile is FRESH: its line starts and ends within 2 m of the way's ends (the longest copy across tiles)
// P  every band deck drawn from a measured profile (bridgeDescriptors): its top within TOL m of the measured line over
//    the span, PROF_BLEND m in from each end (where it blends into the street it meets), except where the ground is
//    higher (the deck never dips under the ground on its centre line); no step > STEP m between 1 m profile samples
// T  Avenue des Tilleuls over the L26/5 chord (-1003.4, 2138.0): the deck at >= 82.0 m TAW (DSM 82.12; it was 81.16 with
//    the straight line: the catenary was pulled down to 3.6 m over the rails)
// O  deck owners: a deck whose drawn span crosses a tile it is not drawn by (its middle is in a neighbour) is in that
//    tile's node build as neighbourDecks (tileData.js keepNet) and driveCheck.mjs walks on it (the E9 Tilleuls false
//    "missing deck", drivecheck place 158): checked on the code's text, the decks concerned listed
import "../road_audit/register.mjs";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUIET = process.argv.includes("--quiet");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const { bridgeDescriptors, deckHeight, measuredTop } = await import(pathToFileURL(join(ROOT, "viewer/streets/bridgeDecks.js")).href);

const TOL = 0.15, STEP = 0.35, BLEND = 8;
// the ways the DSM gives no clean deck top for (tools/bridges/deckProfiles.py report, 2026-11-23): they keep the
// straight line; remove an entry when the tool measures it
const SKIPPED = {
  "1002735650": "Kasteelstraat service road beside the Avenue des Hospices deck: the DSM is the Hospices deck (85 m) at its ends, the service road (78 m) in the middle (not one surface)",
  "1342926162": "Avenue Carsoel over Saint-Job station: a hand-measured plan deck (bridgePlans), the DSM sees the station roofs and the cutting",
  "1504468709": "Broekweg: 10.7 m, no DSM samples over it (a footbridge-sized crossing under trees)",
  "28031040": "Kleiveld: no DSM samples over the carriageway (under trees)",
};

let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };
const say = (m) => { if (!QUIET) console.log(m); };

const manifest = json("data/tiles/manifest.json");
const tiles = manifest.tiles.filter((t) => t.status === "built");
const grids = new Map();
for (const t of tiles) {
  const h = json(`data/tiles/${t.name}/terrain.json`), b = readFileSync(join(ROOT, `data/tiles/${t.name}/terrain.u16`));
  grids.set(`${Math.round(h.x0 / 500)},${Math.round(h.z0 / 500)}`, { h, u: new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2) });
}
const ground = (x, z) => {
  const g = grids.get(`${Math.floor(x / 500)},${Math.floor(z / 500)}`);
  if (!g) return NaN;
  const { h, u } = g, c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1.001), r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, v = (cc, rr) => { const q = u[rr * h.cols + cc]; return q === h.nodata ? NaN : q / 100; };
  return (v(c0, r0) * (1 - fc) + v(c0 + 1, r0) * fc) * (1 - fr) + (v(c0, r0 + 1) * (1 - fc) + v(c0 + 1, r0 + 1) * fc) * fr;
};
const tileOf = (x, z) => tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name ?? null;
const ov = json("data/overrides.json"), P = ov.bridgeProfiles || {};

// ---- the ways (longest copy) and every tile's descriptors
const ways = new Map(), perTile = [];
for (const t of tiles) {
  const roads = json(`data/tiles/${t.name}/roads.json`), N = new Map((roads.nodes || []).map((n) => [n.id, n]));
  for (const r of roads.roads || []) {
    const br = r.meta?.bridge;
    if (!br || br === "no" || !r.meta?.osm) continue;
    const a = N.get(r.a), b = N.get(r.b);
    if (!a || !b) continue;
    const pts = [[a.x, a.z], ...(r.pts || []).map((p) => [p.x, p.z]), [b.x, b.z]];
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const k = String(r.meta.osm);
    if (!ways.has(k) || L > ways.get(k).L) ways.set(k, { name: r.meta.name || "", pts, L });
  }
  perTile.push({ t, descs: bridgeDescriptors(roads, ground, ov.bridgePlans, P) });
}

// ---- P: measured or listed, fresh
let measured = 0;
for (const [k, w] of ways) {
  const p = P[k];
  if (!p) { if (!SKIPPED[k]) fail(`P way ${k} "${w.name}" (${w.L.toFixed(0)} m): no measured profile (data/overrides.json bridgeProfiles) and not in SKIPPED: run tools/bridges/deckProfiles.py`); continue; }
  measured++;
  const L = p.line, n = L.length / 3, s = [L[0], L[1]], e = [L[(n - 1) * 3], L[(n - 1) * 3 + 1]], a = w.pts[0], b = w.pts[w.pts.length - 1];
  const d = Math.min(Math.max(Math.hypot(s[0] - a[0], s[1] - a[1]), Math.hypot(e[0] - b[0], e[1] - b[1])), Math.max(Math.hypot(s[0] - b[0], s[1] - b[1]), Math.hypot(e[0] - a[0], e[1] - a[1])));
  if (d > 2) fail(`P way ${k} "${w.name}": its measured profile's ends are ${d.toFixed(1)} m off the way's ends (stale: run tools/bridges/deckProfiles.py)`);
}
for (const k of Object.keys(P)) if (!k.startsWith("_") && !ways.has(k)) fail(`P bridgeProfiles.${k}: no such bridge way in the tiles' roads (stale)`);

// ---- P: the drawn profile follows the measured line
let checked = 0, worst = 0;
for (const { descs } of perTile) for (const d of descs) {
  if (d.plan || !d.measured) continue;
  const osm = d.id.replace(/^r(\d+)_\d+$/, "$1"), f = measuredTop(P[osm]?.line), top = deckHeight(d, () => -Infinity);
  const L = d.cum[d.cum.length - 1];
  let prev = null;
  for (let s = d.span[0] + BLEND; s <= d.span[1] - BLEND; s += 1) {
    let i = 1; while (i < d.pts.length - 1 && d.cum[i] < s) i++;
    const t = (s - d.cum[i - 1]) / ((d.cum[i] - d.cum[i - 1]) || 1), x = d.pts[i - 1][0] + (d.pts[i][0] - d.pts[i - 1][0]) * t, z = d.pts[i - 1][1] + (d.pts[i][1] - d.pts[i - 1][1]) * t;
    const m = f(x, z), y = top(x, z), g = ground(x, z);
    if (m == null || y == null) continue;
    checked++;
    const off = Math.abs(y - m);
    if (off > worst && !(g > m)) worst = off;
    if (off > TOL && !(g > m)) { fail(`P deck ${d.id} "${d.name}": drawn top ${y.toFixed(2)} vs measured ${m.toFixed(2)} at (${x.toFixed(0)}, ${z.toFixed(0)})`); break; }
    if (prev != null && Math.abs(y - prev) > STEP) { fail(`P deck ${d.id} "${d.name}": a ${Math.abs(y - prev).toFixed(2)} m step in the profile at (${x.toFixed(0)}, ${z.toFixed(0)})`); break; }
    prev = y;
  }
  void L;
}

// ---- T: Tilleuls over the chord
{
  const d = perTile.flatMap((p) => p.descs).find((q) => q.id === "r185310974_0");
  const y = d ? deckHeight(d, ground)(-1003.4, 2138.0) : null;
  if (y == null || y < 82.0) fail(`T Avenue des Tilleuls over the L26/5 chord: deck ${y?.toFixed(2) ?? "none"} m (>= 82.0 wanted, DSM 82.12)`);
  else say(`ok   T Avenue des Tilleuls over the L26/5 chord: ${y.toFixed(2)} m`);
}

// ---- O: decks a neighbour draws, and the code that lets one tile's node check see them
const foreign = [];
for (const { t, descs } of perTile) for (const d of descs) {
  if (d.plan) continue;
  const Lh = d.cum[d.cum.length - 1] / 2; let i = 1; while (i < d.pts.length - 1 && d.cum[i] < Lh) i++;
  const f = (Lh - d.cum[i - 1]) / ((d.cum[i] - d.cum[i - 1]) || 1), mx = d.pts[i - 1][0] + (d.pts[i][0] - d.pts[i - 1][0]) * f, mz = d.pts[i - 1][1] + (d.pts[i][1] - d.pts[i - 1][1]) * f;
  const owner = tileOf(mx, mz);
  if (owner === t.name) continue;
  const [x0, x1] = t.bounds.x, [z0, z1] = t.bounds.z;
  const inside = d.pts.some(([x, z], k) => k > 0 && k < d.pts.length - 1 && x >= x0 && x < x1 && z >= z0 && z < z1);
  if (inside) foreign.push(`${t.name}: ${d.id} "${d.name}" (drawn by ${owner})`);
}
const td = readFileSync(join(ROOT, "viewer/tileData.js"), "utf8"), dc = readFileSync(join(ROOT, "tools/audit/driveCheck.mjs"), "utf8");
if (!/neighbourDecks: osmBridges\.decks\.filter\(\(d\) => !ownDeck\(d\)\)/.test(td)) fail("O viewer/tileData.js: the keepNet build no longer lists neighbourDecks (the decks a neighbour draws over this tile)");
if (!/for \(const dk of d\.neighbourDecks \|\| \[\]\) decks\.push/.test(dc)) fail("O tools/audit/driveCheck.mjs: the drive walk no longer stands on the neighbours' decks (world.decks holds them in the city)");
say(`     O decks a tile's roads carry but a neighbour draws: ${foreign.length}${foreign.length ? " (" + foreign.join("; ") + ")" : ""}`);

console.log(`deck profiles: ${measured} measured of ${ways.size} bridge ways (${Object.keys(SKIPPED).length} listed as not measurable), ${checked} samples checked, worst ${worst.toFixed(2)} m off the measured top; ${foreign.length} neighbour-drawn deck(s) seen by their other tiles' node checks`);
console.log(fails ? `DECK PROFILES: FAIL (${fails})` : "DECK PROFILES: PASS");
process.exit(fails ? 1 : 0);
