// BRIDGE AUDIT (vivier 2026-11-17, owner playtest: "there is a bridge at Vivier d'Oie, Chaussee de Waterloo, that is
// missing"). Every road-rail crossing of Uccle must resolve to ONE built structure: a road over the railway stands on a
// drawn deck (an OSM bridge deck of viewer/streets/bridgeDecks.js, band or measured plan, or a hero bridge model) that
// covers the whole measured bridge (UrbIS Land cover "Bridges" ROB / PB), with no slab left in the cutting under it; a
// road under the railway passes under a rail bridge (UrbIS RAB / hero) or through a tunnel. No browser: the tiles' data
// (roads.json, terrain), data/rail/rail.json, data/overrides.json bridgePlans, the hero bridges' notes.
//
//   node --import ./tools/road_audit/register.mjs tools/audit/bridgeAudit.mjs [--out FILE] [--old] [--quiet]
//
// --old: the checks with the code's switches off (?vivier=old: no plan decks from UrbIS, the UrbIS slabs at the DTM).
// Exit code 1 when a check FAILS (tools/audit/mergeGate.mjs).
//
// Checks
//   U  every UrbIS road / foot bridge over a railway (ROB / PB):
//      U1 covered: >= 85 % of its polygon (1 m samples) under a drawn deck (OSM deck footprint or hero) - else the road
//         beside the deck band hangs over the open cutting (Vivier d'Oie: 51 % before)
//      U3 a foot bridge (PB) is built too (a drawn deck over >= 85 % of it)
//      U2 no slab in the cutting: if railData.js still draws the UrbIS slab, its underside clears the rail top by 4.8 m
//         (catenary) - the slab used to be drawn at the DTM of its centroid = the cutting floor (all 9 of them)
//   C  (bridge=yes) every road tagged bridge crossing a track is on a drawn deck (an OSM deck owned by a tile, or a hero);
//      foot bridges are not in roads.json: their UrbIS PB polygons are checked under U
//   C  every road (roads.json, not a bridge / tunnel) crossing a track: its ground 10 m both sides of the crossing vs the
//      rail top: over (> rail + 3 m both sides) -> the crossing point must be on a drawn deck (else: open cutting under a
//      road); under (< rail - 3 m both sides) -> under a rail bridge (UrbIS RAB / hero) or a tunnel; else level crossing
//   W  catenary under every drawn deck: the contact wire 0.3 m under the soffit (railData.js wireCap / deckCap)
import "../road_audit/register.mjs";        // (the viewer's bare "three" imports; mergeGate.mjs runs plain node)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);
const { bridgeDescriptors, deckHeight, inRing, ringPlans, deckSoffitCap, deckFootprint } = await imp("viewer/streets/bridgeDecks.js");
const { heroFrame, heroBridgeNames, prepRail } = await imp("viewer/rail/railData.js");
const { applyRoadOverrides } = await imp("viewer/roadBuild.js");
const { resolveFootbridge, footFootprint } = await imp("viewer/rail/footbridge.js");   // (claude/footbridge) the station footbridges   // (claude/chenaie) the roads as the worker has them: bridgeWidths

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(k); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const OUT = opt("--out", null), OLD = flag("--old"), QUIET = flag("--quiet");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

// ---- the DTM of every built tile (bilinear, NaN off the tiles)
const manifest = json("data/tiles/manifest.json");
const tiles = manifest.tiles.filter((t) => t.status === "built");
const grids = new Map();
for (const t of tiles) {
  const h = json(`data/tiles/${t.name}/terrain.json`), b = readFileSync(join(ROOT, `data/tiles/${t.name}/terrain.u16`));
  const u = new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2);
  grids.set(`${Math.round(h.x0 / 500)},${Math.round(h.z0 / 500)}`, { h, u });
}
const ground = (x, z) => {
  const g = grids.get(`${Math.floor(x / 500)},${Math.floor(z / 500)}`);
  if (!g) return NaN;
  const { h, u } = g, c = Math.min(Math.max((x - h.x0) / h.step, 0), h.cols - 1.001), r = Math.min(Math.max((z - h.z0) / h.step, 0), h.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, v = (cc, rr) => { const q = u[rr * h.cols + cc]; return q === h.nodata ? NaN : q / 100; };
  return (v(c0, r0) * (1 - fc) + v(c0 + 1, r0) * fc) * (1 - fr) + (v(c0, r0 + 1) * (1 - fc) + v(c0 + 1, r0 + 1) * fc) * fr;
};
const tileOf = (x, z) => tiles.find((t) => x >= t.bounds.x[0] && x < t.bounds.x[1] && z >= t.bounds.z[0] && z < t.bounds.z[1])?.name ?? null;

// ---- rail, heroes, plans
const rail = prepRail(json("data/rail/rail.json"));
const heroes = heroBridgeNames(true).map((n) => (existsSync(join(ROOT, `models/rail/${n}.json`)) ? heroFrame(json(`models/rail/${n}.json`)) : null)).filter(Boolean);
const inHero = (x, z) => heroes.some((h) => inRing(h.ring, x, z));
const ov = json("data/overrides.json");
// the plans the tile worker uses (viewer/tileData.js): the hand-measured ones + (vivier) one per UrbIS ROB an OSM bridge
// road crosses (ringPlans); --old: the hand-measured ones only, as before
const plansOf = (roads, T) => (OLD ? ov.bridgePlans : ringPlans(ov.bridgePlans, roads, rail, ground, existsSync(join(ROOT, `data/tiles/${T}/surfaces.json`)) ? json(`data/tiles/${T}/surfaces.json`) : null));

// ---- every OSM road deck, once (the tile holding its middle draws it, as tileData.js ownDeck)
const decks = new Map();
for (const t of tiles) {
  const roads = json(`data/tiles/${t.name}/roads.json`);
  applyRoadOverrides(roads, ov);
  for (const d of bridgeDescriptors(roads, ground, plansOf(roads, t.name), OLD ? null : ov.bridgeProfiles)) {
    if (decks.has(d.id)) continue;
    // the tile holding the deck's middle draws it (tileData.js ownDeck: a road clipped by another tile's buffer, Avenue
    // des Tilleuls in D8 / E8, is a shorter copy under the same id)
    const L = d.cum[d.cum.length - 1] / 2; let k = 1; while (k < d.pts.length - 1 && d.cum[k] < L) k++;
    const f = (L - d.cum[k - 1]) / ((d.cum[k] - d.cum[k - 1]) || 1), mx = d.pts[k - 1][0] + (d.pts[k][0] - d.pts[k - 1][0]) * f, mz = d.pts[k - 1][1] + (d.pts[k][1] - d.pts[k - 1][1]) * f;
    if (tileOf(mx, mz) !== t.name) continue;
    const m = d.pts[Math.floor(d.pts.length / 2)];
    if (inHero(m[0], m[1])) continue;                              // the hero bridge's deck wins (tileData.js heroDeck)
    if (d.pts.some((p) => Number.isNaN(ground(p[0], p[1])))) continue;   // an end off the built tiles: not drawn
    d.drawn = deckHeight(d, ground, { drawn: true });
    d.foot = deckFootprint(d);
    decks.set(d.id, d);
  }
}
const deckList = [...decks.values()];
const onDeck = (x, z) => deckList.find((d) => d.foot(x, z)) ?? null;
const covered = (x, z) => inHero(x, z) || !!onDeck(x, z);

const railTopAt = (x, z) => {
  let best = Infinity, y = NaN;
  for (const t of rail.tracks) {
    if (x < t.box.x0 - 30 || x > t.box.x1 + 30 || z < t.box.z0 - 30 || z > t.box.z1 + 30) continue;
    for (const p of t.pts) { const d = Math.hypot(p[0] - x, p[2] - z); if (d < best) { best = d; y = p[1]; } }
  }
  return best < 30 ? y : NaN;
};

// (claude/footbridge, rule footbridge-built) the station footbridges (data/rail/footbridges.json, viewer/rail/footbridge.js;
// ?footbridge=old: none): a PB they carry is built; how much of its polygon is left open over the drop is footbridgeAudit F1
const foots = OLD ? [] : (json("data/rail/footbridges.json").bridges || []).map((b) => ({ urbis: b.urbis, foot: footFootprint(resolveFootbridge(b, ground)) }));
const fails = [], R = { mode: OLD ? "old" : "default", urbis: [], crossings: [], wires: [] };
// known open items (tools/audit/bridgeAudit.allow.json: { "<check> <what>": "why, and what fixes it" }): reported, not failed
const allow = existsSync(join(ROOT, "tools/audit/bridgeAudit.allow.json")) ? json("tools/audit/bridgeAudit.allow.json") : {};
const warns = [], allowed = [];
const fail = (check, what, msg) => { const why = allow[`${check} ${what}`]; (why ? allowed : fails).push({ check, what, msg, ...(why ? { why } : {}) }); };
const warn = (check, what, msg) => { if (!warns.some((w) => w.check === check && w.what === what)) warns.push({ check, what, msg }); };

// ---- U: the UrbIS ROB / PB polygons over the line
// railData.js (vivier): no UrbIS slab where an OSM deck is drawn over its centroid, nor one in the cutting
const FOOT_MIN = 0.4;        // (a footbridge: its deck and stairs cover the polygon's span; the rest is its at-grade ramps, footbridgeAudit F1)
const slabSkipped = (b) => !OLD && (deckList.some((d) => d.foot(b.centre[0], b.centre[1])) || (b.railTop != null && b.ground - 0.92 - b.railTop < 4.8));
for (const b of rail.decks) {
  const ring = b.ring;
  let n = 0, cov = 0;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of ring) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  const fb = foots.find((f) => f.urbis === b.id);
  let fcov = 0;
  for (let x = Math.floor(x0) + 0.5; x < x1; x++) for (let z = Math.floor(z0) + 0.5; z < z1; z++) if (inRing(ring, x, z)) { n++; if (covered(x, z)) cov++; if (fb?.foot(x, z)) fcov++; }
  const frac = n ? cov / n : 0, hero = inHero(b.centre[0], b.centre[1]), ffrac = n ? fcov / n : 0;
  const slab = !hero && !slabSkipped(b), slabClear = slab ? b.ground - 0.02 - 0.9 - (b.railTop ?? -Infinity) : null;
  const rec = { footbridge: fb ? +ffrac.toFixed(2) : null, id: b.id, type: b.type, roads: b.roads, lines: b.lines, centre: b.centre, tile: tileOf(...b.centre), covered: +frac.toFixed(2), hero, slab, slabClear: slabClear == null ? null : +slabClear.toFixed(2) };
  R.urbis.push(rec);
  const named = b.roads.some((r) => r && !["footway", "service", "platform", "path", "steps", "cycleway"].includes(r));
  if (b.type === "ROB" && named && frac < 0.85) fail("U1", `UrbIS ${b.type} ${b.id} (${b.roads.join(" / ")})`, `only ${(frac * 100).toFixed(0)} % of the bridge under a drawn deck: the rest hangs over the cutting`);
  if (b.type === "PB" && !hero && frac < 0.85 && ffrac < FOOT_MIN) fail("U3", `UrbIS ${b.type} ${b.id} (${b.roads.join(" / ")})`, `foot bridge over ${b.lines.join(" / ")} not built (${(frac * 100).toFixed(0)} % under a drawn deck)`);
  if (slab && slabClear < 4.8) fail("U2", `UrbIS ${b.type} ${b.id} (${b.roads.join(" / ")})`, `slab drawn ${slabClear.toFixed(1)} m over the rail top (in the cutting; needs >= 4.8)`);
}

// ---- track segments, crossings
const segX = (a, b, c, d) => {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t, t] : null;
};
const trackSegs = [];
for (const t of rail.tracks) for (let i = 1; i < t.pts.length; i++) {
  const p = t.pts[i - 1], q = t.pts[i];
  trackSegs.push({ a: [p[0], p[2]], b: [q[0], q[2]], y: (p[1] + q[1]) / 2, ref: t.ref, tunnel: !!t.tunnel, bridge: !!t.bridge,
    x0: Math.min(p[0], q[0]), x1: Math.max(p[0], q[0]), z0: Math.min(p[2], q[2]), z1: Math.max(p[2], q[2]) });
}
const crossingsOf = (pts) => {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], bx0 = Math.min(a[0], b[0]), bx1 = Math.max(a[0], b[0]), bz0 = Math.min(a[1], b[1]), bz1 = Math.max(a[1], b[1]);
    for (const s of trackSegs) {
      if (s.x1 < bx0 || s.x0 > bx1 || s.z1 < bz0 || s.z0 > bz1) continue;
      const p = segX(a, b, s.a, s.b);
      if (p) out.push({ x: p[0], z: p[1], seg: i, t: p[2], rail: s });
    }
  }
  return out;
};
// ---- C: every road of roads.json crossing a track
const seenRoads = new Set();
for (const t of tiles) {
  const roads = json(`data/tiles/${t.name}/roads.json`);
  const N = new Map(roads.nodes.map((n) => [n.id, n]));
  for (const r of roads.roads) {
    if (seenRoads.has(r.id)) continue;
    seenRoads.add(r.id);
    const a = N.get(r.a), b = N.get(r.b);
    if (!a || !b) continue;
    const pts = [[a.x, a.z], ...(r.pts || []).map((p) => [p.x, p.z]), [b.x, b.z]];
    const br = r.meta?.bridge && r.meta.bridge !== "no", tun = r.meta?.tunnel && r.meta.tunnel !== "no";
    for (const c of crossingsOf(pts)) {
      if (c.rail.tunnel || !tileOf(c.x, c.z)) continue;          // (outside the built city: Haveskercke, in Forest)
      const A = pts[c.seg - 1], B = pts[c.seg], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / L, uz = (B[1] - A[1]) / L;
      // the road's ground 12-30 m either side (past a bridge's abutments; the highest: a cutting slope reads low)
      const side = (sg) => { let m = -Infinity; for (let k = 12; k <= 30; k += 3) { const g = ground(c.x + sg * ux * k, c.z + sg * uz * k); if (g > m) m = g; } return m; };
      const g1 = side(-1), g2 = side(1), ry = c.rail.y;
      const kind = g1 > ry + 3 && g2 > ry + 3 ? "over" : g1 < ry - 3 && g2 < ry - 3 ? "under" : "level";
      const deck = onDeck(c.x, c.z), hero = inHero(c.x, c.z);
      const rab = rail.bridges.find((bb) => bb.type === "RAB" && inRing(bb.ring, c.x, c.z));
      let ok = true, why = "";
      if (kind === "over" && !deck && !hero) { ok = false; why = "road over the railway with no drawn deck: open cutting under the road"; }
      if (br && !deck && !hero) { ok = false; why = "OSM bridge=yes road over the railway with no drawn deck"; }
      if (kind === "under" && !rab && !hero && !tun && !c.rail.bridge) { ok = false; why = "road under the railway with no rail bridge / tunnel"; }
      R.crossings.push({ road: r.id, name: r.meta?.name ?? "", tile: t.name, at: [+c.x.toFixed(1), +c.z.toFixed(1)], line: c.rail.ref, kind, bridgeTag: !!br,
        sides: [+g1.toFixed(1), +g2.toFixed(1)], railTop: +ry.toFixed(2), deck: deck?.id ?? null, plan: !!deck?.plan, hero, rab: rab?.id ?? null, ok });
      if (!ok) fail("C", `${r.id} "${r.meta?.name ?? ""}" (${t.name})`, `${why} at (${c.x.toFixed(0)}, ${c.z.toFixed(0)}), ${c.rail.ref}`);
    }
  }
}

// ---- W: the contact wire under every drawn deck (railData.js caps it at the soffit - 0.3 m; here: the cap exists and
// leaves the pantograph >= 4.6 m over the rail top)
if (!OLD) {
  const cap = deckSoffitCap(deckList);
  for (const d of deckList) {
    for (const s of trackSegs) {
      const p = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];
      if (!d.foot(p[0], p[1])) continue;
      const c = cap(p[0], p[1]), room = c - 0.3 - s.y;
      R.wires.push({ deck: d.id, at: [+p[0].toFixed(1), +p[1].toFixed(1)], line: s.ref, wireOverRail: +room.toFixed(2) });
      if (!Number.isFinite(c)) fail("W", `deck ${d.id} "${d.name}"`, `no catenary cap under the deck at (${p[0].toFixed(0)}, ${p[1].toFixed(0)}): the wires run through the slab`);
      else if (room < 4.6) warn("W", `deck ${d.id} "${d.name}"`, `the deck's soffit leaves the contact wire only ${room.toFixed(2)} m over the rail top at (${p[0].toFixed(0)}, ${p[1].toFixed(0)}) (deck / rail heights to measure)`);
    }
  }
}

// ---- report
const sum = { urbis: R.urbis.length, roadCrossings: R.crossings.length, over: R.crossings.filter((c) => c.kind === "over").length,
  under: R.crossings.filter((c) => c.kind === "under").length, level: R.crossings.filter((c) => c.kind === "level").length, decks: deckList.length, plans: deckList.filter((d) => d.plan).length, fails: fails.length };
sum.allowed = allowed.length; sum.warnings = warns.length;
R.summary = sum; R.fails = fails; R.allowed = allowed; R.warnings = warns;
if (OUT) writeFileSync(join(ROOT, OUT), JSON.stringify(R, null, 1));
if (!QUIET) {
  console.log("UrbIS bridges over the line (ROB / PB):");
  for (const u of R.urbis) console.log(`  ${u.type} ${u.id.padEnd(4)} ${u.tile ?? "-"}  covered ${String(Math.round(u.covered * 100)).padStart(3)} %  ${u.hero ? "hero" : u.slab ? `UrbIS slab ${u.slabClear} m over rail` : "no slab"}  ${u.roads.join(" / ")}`);
  console.log("road-rail crossings (roads.json):");
  for (const c of R.crossings) if (c.kind !== "level" || !c.ok) console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.kind.padEnd(5)} ${c.line.padEnd(6)} (${c.at}) ${c.tile} ${c.name || c.road}${c.deck ? `  deck ${c.deck}${c.plan ? " (plan)" : ""}` : ""}${c.hero ? "  hero" : ""}${c.rab ? `  RAB ${c.rab}` : ""}`);
}
console.log(`bridge audit (${R.mode}): ${JSON.stringify(sum)}`);
for (const f of fails) console.log(`  FAIL ${f.check} ${f.what}: ${f.msg}`);
for (const f of allowed) console.log(`  allowed ${f.check} ${f.what}: ${f.msg} -- ${f.why}`);
for (const f of warns) console.log(`  warn ${f.check} ${f.what}: ${f.msg}`);
console.log(fails.length ? "BRIDGE AUDIT: FAIL" : "BRIDGE AUDIT: PASS");
process.exitCode = fails.length ? 1 : 0;
