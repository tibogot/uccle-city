// FRONT GARDENS IN THE CITY (docs/assets/GARDENS.md): low brick walls with copings, railings, pillars with caps, gates,
// clipped hedges, between each house and the measured sidewalk. ON by default (round 2, 2026-11-14): ?gardens=0 = the
// city without them; ?gardenhedges=0 = without the hedges.
//
//   - data: data/gardens/<T>.json (tools/gardens/build_gardens.py): runs on the DRAWN sidewalk's back edge (the street
//     surfaces as viewer/surfaces.js draws them, tools/gardens/drawnSurfaces.mjs) in front of every street face with a
//     gap >= 1 m, openings at the real doors and driveways
//   - drawing: the kit (viewer/gardens/gardenKit.js) as ONE pool per piece for the whole city (LOD0-2), streamed by
//     viewer/instanceStream.js (a gather every 2 m of travel, time-sliced over frames with a 0.35 ms budget, 6 m of
//     margin round every LOD band; the tile fade is a uniform per tile slot: a fading tile never re-gathers; docs/perf/
//     AUDIT.md "instance pools"); the hedges are the kit's instanced modules
//     (viewer/gardens/gardenHedge.js: 3 body LODs + the near leaf cards, the same pools)
//   - collisions: per tile, InstancedMeshes of unit boxes named furniture-gardenwall / -gardenpillar / -gardengate (wall +
//     coping + railing as one sheared box, each hedge module, the pillars, the closed driveway gates), never drawn
//     (visible = false): the car (viewer/drive featureColliders), the walker / third person (viewer/character/cityHook)
//     and the collision test read them like the furniture kits' stand-ins. The pedestrian gates are drawn OPEN: the
//     walker gets in at the door
import * as THREE from "three/webgpu";
import { loadGardenKit, GardenPool, PIECES, gardenInstances, gardenSources, gardenFades, standinGeometries } from "./gardenKit.js";
import { Streamer, MARGIN } from "../instanceStream.js";
import { wind } from "../foliage/wind.js";

const qs = new URLSearchParams(location.search);
const GARDEN_ROAD_OLD = qs.get("gardenroad") === "old";
/** ?hedgecol=old: the hedge modules' collision boxes in furniture-gardenwall (solid for the car, as a brick wall); now
 *  their own stand-in mesh furniture-gardenhedge: the car drives through a hedge, slowed (viewer/drive/carEnv.js, police
 *  feel), the walker still stops at it (viewer/character/cityHook.js) */
const HEDGE_COL_OLD = qs.get("hedgecol") === "old";

/** the doc without the pieces standing on a carriageway (blocked(x, z) -> true): segments by their ends and middle,
 *  pillars / gates by their base, hedges split round the blocked points. { doc, segs, pillars, gates, hedgePts } */
function clearRoads(doc, blocked) {
  const out = { ...doc }, n = { segs: 0, pillars: 0, gates: 0, hedgePts: 0 };
  out.segs = (doc.segs || []).filter((g) => { const bad = blocked(g[0], g[2]) || blocked(g[3], g[5]) || blocked((g[0] + g[3]) / 2, (g[2] + g[5]) / 2); if (bad) n.segs++; return !bad; });
  out.pillars = (doc.pillars || []).filter((p) => { const bad = blocked(p[0], p[2]); if (bad) n.pillars++; return !bad; });
  out.gates = (doc.gates || []).filter((g) => { const bad = blocked(g[0], g[2]); if (bad) n.gates++; return !bad; });
  out.hedges = [];
  for (const h of doc.hedges || []) {
    let run = [];
    const flush = () => { if (run.length >= 2) out.hedges.push({ ...h, points: run }); run = []; };
    for (const q of h.points) { if (blocked(q[0], q[1])) { n.hedgePts++; flush(); } else run.push(q); }
    flush();
  }
  const total = n.segs + n.pillars + n.gates + n.hedgePts;
  return total ? { doc: out, ...n } : 0;
}
/** (cortenbosch) data/overrides.json gardenRestyle: inside each polygon the walls / railings become clipped hedges of the
 *  polygon's species (consecutive segments chained into one run, set back half the hedge's width + 5 cm from the street:
 *  the side where blocked(x, z) answers, else the run's left), the pillars and gates go (the driveways stay open), the
 *  kit's own hedges there take the species. -> { doc, segs, hedges } | 0 */
function restyleHedges(doc, restyle, blocked) {
  const polys = Object.entries(restyle || {}).filter(([k, v]) => !k.startsWith("_") && v?.ring?.length >= 3).map(([, v]) => v);
  if (!polys.length) return 0;
  const inR = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, zi] = r[i], [xj, zj] = r[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const polyAt = (x, z) => polys.find((p) => inR(p.ring, x, z));
  const out = { ...doc, segs: [], pillars: [], gates: [], hedges: [] };
  let nSeg = 0, nHedge = 0;
  // chains of consecutive segments in one polygon (end of one = start of the next within 2 cm)
  const chains = [];
  let cur = null;
  for (const g of doc.segs || []) {
    const P = polyAt((g[0] + g[3]) / 2, (g[2] + g[5]) / 2);
    if (!P) { out.segs.push(g); cur = null; continue; }
    nSeg++;
    if (cur && cur.P === P && Math.hypot(cur.pts[cur.pts.length - 1][0] - g[0], cur.pts[cur.pts.length - 1][1] - g[2]) < 0.02) cur.pts.push([g[3], g[5]]);
    else { cur = { P, pts: [[g[0], g[2]], [g[3], g[5]]] }; chains.push(cur); }
  }
  for (const { P, pts } of chains) {
    const w = P.width ?? 0.6, off = w / 2 + 0.05;
    // the street side: probe 0.8 m both ways from the chain's middle segment
    const m = Math.floor((pts.length - 1) / 2), a = pts[m], b = pts[m + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const left = blocked?.(mx + nx * 0.8, mz + nz * 0.8), right = blocked?.(mx - nx * 0.8, mz - nz * 0.8);
    const s = left && !right ? -1 : 1;                                   // away from the street
    // offset the polyline (per-vertex normal: the average of its segments')
    const q = pts.map((p, i) => {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      return [p[0] - ((p1[1] - p0[1]) / l) * off * s, p[1] + ((p1[0] - p0[0]) / l) * off * s];
    });
    out.hedges.push({ points: q, species: P.hedge || "beech", height: P.height ?? 1.4, width: w });
    nHedge++;
  }
  for (const p of doc.pillars || []) if (!polyAt(p[0], p[2])) out.pillars.push(p);
  for (const g of doc.gates || []) if (!polyAt(g[0], g[2])) out.gates.push(g);
  for (const h of doc.hedges || []) {
    const c = h.points[Math.floor(h.points.length / 2)], P = c && polyAt(c[0], c[1]);
    out.hedges.push(P ? { ...h, species: P.hedge || h.species } : h);
  }
  return { doc: out, segs: nSeg, hedges: nHedge };
}
const DATA = new URL("../../data/gardens/", import.meta.url);

export const cityGardens = {
  on: qs.get("gardens") !== "0",          // ON by default again (2026-11-14, claude/gather-perf): the pools stream time-sliced (viewer/instanceStream.js; driving: gardens on = off within noise, docs/perf/AUDIT.md "instance pools"); ?gardens=0 off
  hedges: qs.get("gardenhedges") !== "0",     // round 2: instanced hedge modules through the kit's pools (gardenHedge.js), ?gardenhedges=0 off
  kit: null, pools: [], tiles: new Map(), group: null, stand: null,
  streamer: null, tWind: 0,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadGardenKit(); } catch (e) { log(`gardens: kit failed (${e.message}), ?gardens=0`); this.on = false; return null; }
    this.stand = standinGeometries();
    this.group = new THREE.Group(); this.group.name = "gardens";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new GardenPool(this.kit.pieces[p], this.kit.mats, this.group, MARGIN));
    this.streamer = new Streamer({ name: "gardens", pools: this.pools.map((p) => p.stream), fades: gardenFades, budget: 0.35 });
    updaters.push((eye, cam) => this.update(cam));
    window.__gardens = this;
    log(`gardens: on (?gardens=0 off; ?gardenhedges=0 without the hedges), kit ${PIECES.length} pieces, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile: its instances join the pools; stand-ins (and hedges) go into `parent` (the tile's features group);
   *  groundAt(x, z) = the drawn ground the hedges stand on */
  addTile(name, doc, parent, groundAt, blocked = null, restyle = null) {
    if (!this.on || !this.kit || !doc) return null;
    const t0 = performance.now();
    // (cortenbosch) the plots a local knows closed by clipped hedges, not walls (data/overrides.json gardenRestyle)
    const rs = restyle ? restyleHedges(doc, restyle, blocked) : 0;
    if (rs) doc = rs.doc;
    // citydefects 2026-11-16: no garden piece on a carriageway (a brick-pier + railing run crossed Avenue Carsoel at the
    // Saint-Job station deck: the UrbIS street surfaces the build read predate the 2025 deck); ?gardenroad=old: as before
    const dropped = blocked && !GARDEN_ROAD_OLD ? clearRoads(doc, blocked) : 0;
    if (dropped) doc = dropped.doc;
    const g = gardenInstances(doc, groundAt, { hedgeFronts: this.hedges, hedges: this.hedges });
    const grp = new THREE.Group(); grp.name = `gardens-${name}`;
    const M = new THREE.Matrix4();
    const hf = HEDGE_COL_OLD ? g.stand.wall.length : g.stand.hedgeFrom;
    const stand = { wall: g.stand.wall.slice(0, hf), hedge: g.stand.wall.slice(hf), pillar: g.stand.pillar, gate: g.stand.gate };
    for (const [k, nm] of [["wall", "furniture-gardenwall"], ["hedge", "furniture-gardenhedge"], ["pillar", "furniture-gardenpillar"], ["gate", "furniture-gardengate"]]) {
      const a = stand[k]; if (!a.length) continue;
      const m = new THREE.InstancedMesh(this.stand[k === "hedge" ? "wall" : k], this.kit.mats.standin, a.length / 16);
      for (let i = 0; i < a.length / 16; i++) { M.fromArray(a, i * 16); m.setMatrixAt(i, M); }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = nm; m.visible = false; m.castShadow = m.receiveShadow = false;
      m.userData.collisionStandin = true;
      grp.add(m);
    }
    parent.add(grp);
    let srcs = null;
    this.streamer.addTile(name, grp, (slot) => (srcs = gardenSources(g.inst, slot)));
    // (inst: the snow caps read the copings / hedges, viewer/weather/cityCaps.js)
    this.tiles.set(name, { name, inst: g.inst, raw: g.settled, hedgeRuns: doc.hedges || [], groundAt, srcs, group: grp, counts: g.counts, doc: { segs: doc.segs.length, pillars: doc.pillars.length, gates: doc.gates.length, hedges: doc.hedges.length } });
    return { ...g.counts, offRoad: dropped ? dropped.segs + dropped.pillars + dropped.gates : 0, offRoadHedgePts: dropped ? dropped.hedgePts : 0, ms: Math.round(performance.now() - t0) };
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    t.group.traverse((o) => { if (o.isInstancedMesh) o.dispose?.(); });
    this.tiles.delete(name);
    this.streamer.removeTile(name);
  },
  update(camera) {
    if (!this.on || !this.kit) return;
    if (this.hedges && !globalThis.grass) {          // the leaf cards' flutter (with the grass on, viewer/grass/cityGrass.js steps the shared wind)
      const now = performance.now(); wind.update(Math.min(0.1, (now - (this.tWind || now)) / 1000)); this.tWind = now;
    }
    this.streamer.update(camera);
  },
  /** JOINS check (HANDOFF: no floating edge where a model meets the ground) against the drawn ground of a tile:
   *  every wall / railing segment sampled every 0.5 m on both faces, every pillar at its 4 corners; floating = the
   *  piece's bottom (footing included) above the lower side; buried = the ground above a railing's foot (the coping top)
   *  or a bare wall's top - 5 cm. groundAt defaults to the tile's own (hm.surface) */
  contact(name, groundAt = null) {
    const t = this.tiles.get(name); if (!t) return null;
    const G = groundAt || t.groundAt, doc = t.raw;              // (the settled segments: what is drawn)
    const out = { segs: doc.segs.length, samples: 0, floating: 0, maxFloat: 0, buriedRail: 0, buriedWall: 0, pillars: doc.pillars.length, pillarFloating: 0, worst: [] };
    for (const g of doc.segs) {
      const st = doc.styles[g[6]] || {}, h = g[7], rail = st.rail >= 0 ? st.railH : 0;
      const dx = g[3] - g[0], dz = g[5] - g[2], L = Math.hypot(dx, dz); if (L < 0.05) continue;
      const nx = -dz / L, nz = dx / L, n = Math.max(2, Math.ceil(L / 0.5) + 1);
      for (let k = 0; k < n; k++) {
        const f = k / (n - 1), x = g[0] + dx * f, z = g[2] + dz * f, y = g[1] + (g[4] - g[1]) * f;
        const a = G(x + nx * 0.18, z + nz * 0.18), b = G(x - nx * 0.18, z - nz * 0.18);
        const bottom = y - (h > 0.01 ? 0.6 * h : 0.03 * rail);
        out.samples++;
        const fl = bottom - Math.min(a, b);
        if (fl > 0.01) { out.floating++; out.maxFloat = Math.max(out.maxFloat, fl); if (out.worst.length < 8) out.worst.push([+x.toFixed(1), +z.toFixed(1), +fl.toFixed(2)]); }
        const hi = Math.max(a, b);
        if (rail > 0 && h > 0.01 && hi > y + h + 0.08 - 0.02) out.buriedRail++;
        if (rail === 0 && h > 0.01 && hi > y + h + 0.08 - 0.05) out.buriedWall++;
      }
    }
    for (const p of doc.pillars) {
      const [x, y, z, , h] = p, bottom = y - 0.4 * h;
      let lo = Infinity; for (const [ox, oz] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) lo = Math.min(lo, G(x + ox, z + oz));
      if (bottom - lo > 0.01) out.pillarFloating++;
    }
    // the hedge modules (gardenHedge.js): the body's foot (12 % of its height under the base line) against the lower
    // of the hedge's two faces, every 0.5 m
    const H = t.srcs?.hedge?.cols.instanceMatrix;             // (the streaming source's matrices, stride 16)
    out.hedgeModules = 0; out.hedgeFloating = 0; out.hedgeMaxFloat = 0;
    if (H) for (let o = 0; o < H.length; o += 16) {
      const x0 = H[o + 12], y0 = H[o + 13], z0 = H[o + 14], dx = H[o], dy = H[o + 1], dz = H[o + 2], h = H[o + 5];
      const wx = H[o + 8] / 2, wz = H[o + 10] / 2, L = Math.hypot(dx, dz), n = Math.max(2, Math.ceil(L / 0.5) + 1);
      out.hedgeModules++;
      let worst = 0;
      for (let k = 0; k < n; k++) {
        const f = k / (n - 1), x = x0 + dx * f, z = z0 + dz * f, y = y0 + dy * f - 0.12 * h;
        worst = Math.max(worst, y - Math.min(G(x + wx, z + wz), G(x - wx, z - wz)));
      }
      if (worst > 0.01) { out.hedgeFloating++; out.hedgeMaxFloat = Math.max(out.hedgeMaxFloat, +worst.toFixed(3)); }
    }
    out.maxFloat = +out.maxFloat.toFixed(3);
    return out;
  },
  report() {
    const n = Object.fromEntries(PIECES.map((p) => [p, 0]));
    for (const t of this.tiles.values()) for (const k of PIECES) n[k] += t.counts[k] || 0;
    // triangles drawn per pass by the kit (instances x the LOD's triangles)
    let tris = 0;
    for (const p of this.pools) p.meshes.forEach((m, k) => { if (m.visible) tris += m.count * p.piece.tris[k]; });
    return { tiles: this.tiles.size, instances: n, drawn: this.pools.reduce((s, p) => s + p.drawn, 0), tris,
      live: Object.fromEntries(this.pools.map((p) => [p.piece.name, p.instances])), stream: { ...this.streamer.stats } };
  },
};
