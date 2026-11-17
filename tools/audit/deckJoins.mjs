// DECK JOINS (vivier 2026-11-17; the joins rule: a scripted model meets the city ground welded or skirted, never a
// floating edge / gap). For every PLAN deck (viewer/streets/bridgeDecks.js: the measured bridge outlines) the tile
// worker's whole build in node (tools/roadfix/tile.mjs), then along every edge of the deck's ring, every 0.5 m:
//   inside   the deck's walked top 0.25 m in (deckHeight, as the page's world.decks)
//   outside  what is drawn 1 m out (the 1 m grids): the road stage's surface where a street is drawn there, else the terrain grid
// An abutment edge (not free) must JOIN: |outside - inside| <= JOIN m, or fall away behind a railing (drop >= the
// railing's RAIL_DROP: the deck's own wall + upstand + rails), or rise into a bank the deck tucks under (outside over
// the deck by > JOIN: the terrain covers the slab's edge; counted as "buried", fine when the bank is ground, not a street).
// A free edge (no wall into the ground: over the tracks) is judged the same way (it may meet a bank at grade).
// An abutment edge stepping down JOIN..RAIL_DROP is SKIRTED (its wall face runs down into the ground: no gap; counted).
// FAIL: a free edge dropping by more than a kerb with no railing, or a street drawn higher than the deck by > JOIN 1 m
// out from its edge (a wall of street at the joint) - a street on both sides is the street's own continuity (skipped).
//
//   node --import ./tools/road_audit/register.mjs tools/audit/deckJoins.mjs [T...]     (default: the plan decks' tiles)
import "../road_audit/register.mjs";        // (the viewer's bare "three" imports; mergeGate.mjs runs plain node)
import { buildTile } from "../roadfix/tile.mjs";
import { deckHeight } from "../../viewer/streets/bridgeDecks.js";

const JOIN = 0.15, RAIL_DROP = 0.8, FREE_DROP = 0.15, MIN_RUN = 1.0, OUT = 1.0;     // OUT: m out (the 1 m grids: nearer, a cell straddles the edge)
const TILES = process.argv.slice(2).map((t) => t.toUpperCase());
const tiles = TILES.length ? TILES : ["H6", "J5"];      // the plan decks: Carsoel (Saint-Job station), Chaussee de Waterloo (Vivier d'Oie)
let fails = 0;
for (const T of tiles) {
  const d = await buildTile(T, { keepNet: true });
  const { hm, drive } = d, h = hm.h, Y = hm.y, g = drive.ground;
  const surf = (x, z) => {
    const c = Math.round((x - h.x0) / h.step), r = Math.round((z - h.z0) / h.step);
    if (c < 0 || r < 0 || c >= h.cols || r >= h.rows) return NaN;
    const k = r * h.cols + c; return Y[k] + (g.delta[k] || 0) / 100;
  };
  for (const deck of d.bridgeDecks.filter((b) => b.plan)) {
    const top = deckHeight(deck, (x, z) => -Infinity), ring = deck.plan.ring, free = new Set(deck.plan.free);
    let a2 = 0; for (let i = 0; i < ring.length; i++) { const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length]; a2 += ax * bz - bx * az; }
    const sgn = a2 > 0 ? 1 : -1;
    const stats = { joined: 0, railed: 0, skirted: 0, buried: 0, ledge: 0, streetOver: 0, n: 0 }, bad = [];
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.3) continue;
      const nx = (bz - az) / L * sgn, nz = -(bx - ax) / L * sgn;
      let run = [];
      const flush = () => { if (run.length * 0.5 >= MIN_RUN) bad.push({ edge: i, free: free.has(i), kind: run[0].kind, from: run[0].p, to: run[run.length - 1].p, worst: Math.max(...run.map((q) => Math.abs(q.step))).toFixed(2) }); run = []; };
      for (let s = 0.25; s < L; s += 0.5) {
        const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L;
        // (a street drawn on both sides of the edge: its own surface carries across, the slab is tucked under it)
        const ci = Math.round((x - nx * OUT - h.x0) / h.step), ri = Math.round((z - nz * OUT - h.z0) / h.step), co = Math.round((x + nx * OUT - h.x0) / h.step), ro = Math.round((z + nz * OUT - h.z0) / h.step);
        const both = (g.delta[ri * h.cols + ci] || 0) > 0 && (g.delta[ro * h.cols + co] || 0) > 0 && Math.abs(surf(x - nx * OUT, z - nz * OUT) - top(x - nx * 0.25, z - nz * 0.25)) < 0.6;
        if (both) { stats.street = (stats.street || 0) + 1; flush(); continue; }   // the street's own continuity: the road audit's
        const yin = top(x - nx * 0.25, z - nz * 0.25), yout = surf(x + nx * OUT, z + nz * OUT);
        if (yin == null || !Number.isFinite(yout)) { flush(); continue; }
        const step = yout - yin;
        stats.n++;
        let kind = null;
        if (Math.abs(step) <= JOIN) stats.joined++;
        else if (step <= -(free.has(i) ? FREE_DROP : RAIL_DROP)) stats.railed++;
        else if (step < 0) { if (free.has(i)) { kind = "free edge drop without railing"; stats.ledge++; } else stats.skirted++; }   // (an abutment's wall face closes a step under the railing's drop: skirted)
        else { // outside higher: a street (road surface drawn: delta > 0) is a step at the joint; a bank tucks the slab under
          const c = Math.round((x + nx * OUT - h.x0) / h.step), r = Math.round((z + nz * OUT - h.z0) / h.step), street = (g.delta[r * h.cols + c] || 0) > 0;
          if (street) { kind = "street over the deck at the joint"; stats.streetOver++; } else stats.buried++;
        }
        if (kind && (!run.length || run[0].kind === kind)) run.push({ kind, step, p: [+x.toFixed(1), +z.toFixed(1)] });
        else { flush(); if (kind) run.push({ kind, step, p: [+x.toFixed(1), +z.toFixed(1)] }); }
      }
      flush();
    }
    console.log(`${T} ${deck.id} "${deck.name}" (${deck.plan.urbis ? `UrbIS ${deck.plan.urbis}` : "hand plan"}): ${JSON.stringify(stats)}`);
    for (const b of bad) console.log(`   ${b.free ? "free" : "abut"} edge ${b.edge}: ${b.kind} ${JSON.stringify(b.from)}..${JSON.stringify(b.to)} worst ${b.worst} m`);
    fails += bad.length;
  }
}
console.log(fails ? `DECK JOINS: FAIL (${fails} stretches)` : "DECK JOINS: PASS");
process.exitCode = fails ? 1 : 0;
