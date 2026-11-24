// MEASURED BAND-DECK WIDTHS (claude/chenaie, 2026-11-24; rule deck-width-drawn, docs/rules/deck-width-drawn.md).
//
// A band deck (an OSM road bridge with no measured plan, viewer/streets/bridgeDecks.js) took its width from the road's
// lane stack, and a road with no lanes from its road TYPE's default (claude/places2): Avenue de la Chênaie over L26, an
// alley, came out 8.2 m wide (a 5.2 m carriageway + 1.2 m strips + parapets) where the real bridge is ~5 m (UrbIS road
// bridge 899) and the street on both approaches is measured at 3.4-3.5 m kerb to kerb. Cause: the bridge stretch has no
// UrbIS street surface of its own (the surfaces stop at the abutments), so nothing measured reached it: the road engine
// drew the type's 7.6 m strip there and the deck followed it.
//
// Here, per OSM road bridge way (every tile's roads.json, meta.bridge not "no"; band decks only: no bridgePlans entry):
//   deck  the deck's outer width from the UrbIS road-bridge outline (data/rail/rail.json bridges, type ROB) the way
//         runs along: the median of the outline's width across the way's line, 1 m steps, 2 m in from its ends
//   carr  the carriageway kerb to kerb from the street model (viewer/street/model.js): the median of the M / D stations
//         on the bridge road itself, or where it has fewer than 3, of those within APPROACH m past its ends (the
//         measured approaches)
// Either may be missing; a way with neither is not written (it keeps the drawn width). The viewer
// (viewer/roadBuild.js applyRoadOverrides) gives such a bridge road a lane stack of these widths, so the road engine
// draws the street on the deck at its measured width and the deck (bridgeDecks.js widths) follows that stack.
//
// Writes data/overrides.json "bridgeWidths": { "<osm way>": { name, deck?, carr?, src } } (spliced in as one block
// after "bridgeProfiles", one line per bridge; the rest of the file untouched).
//
//   node --import ./tools/road_audit/register.mjs tools/bridges/deckWidths.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRY = process.argv.includes("--dry");
const json = (p) => { try { return JSON.parse(readFileSync(join(ROOT, p), "utf8")); } catch { return null; } };
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { streetModelInputsSync } = await imp("viewer/street/inputs.js");
const { buildStreetModel, CONF } = await imp("viewer/street/model.js");

export const APPROACH = 12;        // m past a bridge road's ends whose measured kerbs stand for it
const MIN_IN = 5;                  // m of the way's line inside a ROB outline for the outline to be this deck's
const SHIFT_MAX = 0.5;             // m: the outline's middle off the line at most (else it is not this band's deck)

const inRing = (ring, x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
/** the ring's extent along the ray p + n t: [tMin, tMax] of its edge crossings, or null */
function across(ring, x, z, nx, nz) {
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < ring.length; k++) {
    const [ax, az] = ring[k], [bx, bz] = ring[(k + 1) % ring.length], ex = bx - ax, ez = bz - az, den = nx * ez - nz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - x) * ez - (az - z) * ex) / den, u = ((ax - x) * nz - (az - z) * nx) / den;
    if (u < 0 || u > 1 || Math.abs(t) > 30) continue;
    if (t < 0) lo = Math.min(lo, -t); else hi = Math.max(hi, t);
  }
  return lo < Infinity && hi > -Infinity ? [lo, hi] : null;
}
const median = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const r2 = (v) => Math.round(v * 100) / 100;

/** the outer width of the ROB outline the line runs along (median across it), its centre's offset off the line, or null */
export function robWidth(line, robs) {
  let best = null;
  for (const b of robs) {
    const W = [], O = [];
    let inside = 0;
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.01) continue;
      const tx = (bx - ax) / L, tz = (bz - az) / L, nx = tz, nz = -tx;
      for (let s = 0.5; s < L; s += 1) {
        const x = ax + tx * s, z = az + tz * s;
        if (!inRing(b.ring, x, z)) continue;
        inside++;
        // 2 m in from the outline's ends along the line (its abutment corners are skewed)
        if (!inRing(b.ring, x + tx * 2, z + tz * 2) || !inRing(b.ring, x - tx * 2, z - tz * 2)) continue;
        const a = across(b.ring, x, z, nx, nz);
        if (a) { W.push(a[0] + a[1]); O.push((a[1] - a[0]) / 2); }
      }
    }
    if (inside >= MIN_IN && W.length >= 3 && (!best || inside > best.inside)) best = { id: b.id, inside, deck: median(W), shift: median(O) };
  }
  return best;
}

/** the measured carriageway width of bridge road `rid` (street model segments), or null */
export function measuredCarriageway(segments, rid) {
  for (const e of segments) {
    const pi = (e.sources.roads || []).indexOf(rid);
    if (pi < 0) continue;
    const ok = (i) => (e.kerbL.conf[i] === CONF.M || e.kerbL.conf[i] === CONF.D) && (e.kerbR.conf[i] === CONF.M || e.kerbR.conf[i] === CONF.D);
    const w = (i) => e.kerbL.off[i] - e.kerbR.off[i];
    let s0 = Infinity, s1 = -Infinity;
    for (let i = 0; i < e.n; i++) if (e.part[i] === pi) { s0 = Math.min(s0, e.s[i]); s1 = Math.max(s1, e.s[i]); }
    if (!(s1 > s0)) continue;
    const on = [], near = [];
    for (let i = 0; i < e.n; i++) {
      if (!ok(i)) continue;
      if (e.part[i] === pi) on.push(w(i));
      else if (e.s[i] >= s0 - APPROACH && e.s[i] <= s1 + APPROACH) near.push(w(i));
    }
    if (on.length >= 3) return { carr: median(on), from: "on", n: on.length, seg: e.id };
    if (near.length >= 3) return { carr: median(near), from: "approaches", n: near.length, seg: e.id };
    return null;
  }
  return null;
}

/** every band bridge way: { way: { name, rid, tile, line, L } } (the longest copy across the built tiles) */
export function bridgeWays(manifest, ov) {
  const ways = new Map();
  for (const t of manifest.tiles.filter((q) => q.status === "built")) {
    const roads = json(`data/tiles/${t.name}/roads.json`), N = new Map((roads?.nodes || []).map((n) => [n.id, n]));
    for (const r of roads?.roads || []) {
      const br = r.meta?.bridge;
      if (!br || br === "no" || !r.meta?.osm || ov.bridgePlans?.[String(r.meta.osm)]) continue;
      const a = N.get(r.a), b = N.get(r.b);
      if (!a || !b) continue;
      const line = [[a.x, a.z], ...(r.pts || []).map((p) => [p.x, p.z]), [b.x, b.z]];
      let L = 0; for (let i = 1; i < line.length; i++) L += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      const k = String(r.meta.osm);
      if (!ways.has(k) || L > ways.get(k).L) ways.set(k, { name: r.meta.name || "", rid: r.id, tile: t.name, bounds: t.bounds, line, L });
    }
  }
  return ways;
}

/** the measurements of every band bridge way: Map way -> { name, deck?, carr?, src, rob?, shift? } */
export function measureAll() {
  const manifest = json("data/tiles/manifest.json"), ov = json("data/overrides.json"), rail = json("data/rail/rail.json");
  const robs = (rail?.bridges || []).filter((b) => b.type === "ROB" && b.ring?.length >= 3);
  const out = new Map();
  for (const [k, w] of bridgeWays(manifest, ov)) {
    const bounds = { x0: w.bounds.x[0], x1: w.bounds.x[1], z0: w.bounds.z[0], z1: w.bounds.z[1] };
    const inp = streetModelInputsSync({ readJson: json, name: w.tile, bounds, overrides: ov });
    const M = inp ? buildStreetModel({ ...inp, bounds }) : null;
    const c = M ? measuredCarriageway(M.segments, w.rid) : null;
    let rb = robWidth(w.line, robs), why = null;
    // an outline whose middle is off the band's line is another deck's or a wider structure's (the band cannot follow it)
    if (rb && Math.abs(rb.shift) > SHIFT_MAX) { why = `UrbIS road bridge ${rb.id}: its middle ${Math.abs(rb.shift).toFixed(2)} m off the line`; rb = null; }
    // a measured carriageway wider than the outline's inside: one of the two is not this deck's; neither is used
    if (rb && c && c.carr + 2 * 0.3 > rb.deck) { out.set(k, { name: w.name, none: true, L: w.L, why: `UrbIS road bridge ${rb.id} ${rb.deck.toFixed(2)} m outside vs ${c.carr.toFixed(2)} m measured carriageway: contradictory` }); continue; }
    if (!c && !rb) { out.set(k, { name: w.name, none: true, L: w.L, why }); continue; }
    const src = [rb ? `deck: UrbIS road bridge ${rb.id} outline, median width across the line` : null, c ? `carr: street model kerbs (M/D), ${c.from === "on" ? "on the bridge road" : `the approaches within ${APPROACH} m of its ends`}, median of ${c.n}` : null].filter(Boolean).join("; ");
    out.set(k, { name: w.name, ...(rb ? { deck: r2(rb.deck) } : {}), ...(c ? { carr: r2(c.carr) } : {}), src, rob: rb?.id, shift: rb ? r2(rb.shift) : undefined, L: w.L });
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const all = measureAll();
  const lines = ['  "bridgeWidths": {', '    "_doc": "band decks\' measured widths (tools/bridges/deckWidths.mjs, rule deck-width-drawn): deck = the outer width from the UrbIS road-bridge outline, carr = the carriageway kerb to kerb from the street model (on the bridge road, else its measured approaches), m. viewer/roadBuild.js applyRoadOverrides gives the bridge road a lane stack of these widths; the deck follows it (?deckwidth=old: the 12 m lane-less deck)",'];
  for (const [k, v] of [...all].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    console.log(`${k.padEnd(11)} ${v.name.slice(0, 40).padEnd(40)} L ${v.L.toFixed(0).padStart(4)}  ${v.none ? `no measurement (keeps the drawn width)${v.why ? ": " + v.why : ""}` : `deck ${v.deck ?? "-"}  carr ${v.carr ?? "-"}${v.rob ? `  (ROB ${v.rob}, centre ${v.shift} m off the line)` : ""}`}`);
    if (v.none) continue;
    lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify({ name: v.name, ...(v.deck != null ? { deck: v.deck } : {}), ...(v.carr != null ? { carr: v.carr } : {}), src: v.src })},`);
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
  lines.push("  },");
  if (DRY) process.exit(0);
  const path = join(ROOT, "data/overrides.json");
  const raw = readFileSync(path, "utf8"), crlf = raw.includes("\r\n");
  let text = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  const block = lines.join("\n") + "\n";
  const old = /^ {2}"bridgeWidths": \{\n(?: {4}.*\n)* {2}\},\n/m;
  if (old.test(text)) text = text.replace(old, block);
  else {
    const m = /^ {2}"bridgeProfiles": \{\n(?: {4}.*\n)* {2}\},\n/m.exec(text);
    if (!m) throw new Error("no bridgeProfiles block to put bridgeWidths after");
    text = text.slice(0, m.index + m[0].length) + block + text.slice(m.index + m[0].length);
  }
  JSON.parse(text);
  writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text);
  console.log(`data/overrides.json bridgeWidths: ${lines.length - 3} bridge(s)`);
}
