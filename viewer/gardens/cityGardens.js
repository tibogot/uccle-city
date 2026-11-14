// FRONT GARDENS IN THE CITY (docs/assets/GARDENS.md): low brick walls with copings, railings, pillars with caps, gates,
// hedges behind the railings, between each house and the measured sidewalk. OFF by default for now: ?gardens=1 on (the city as
// before); ?gardenhedges=1 = with the hedges (opt-in until the foliage city hookup: their cost, docs/assets/GARDENS.md).
//
//   - data: data/gardens/<T>.json (tools/gardens/build_gardens.py): runs along the property line (the measured sidewalk's
//     back edge) in front of every street face with a gap >= 1 m, openings at the real doors and driveways
//   - drawing: the kit (viewer/gardens/gardenKit.js) as ONE pool per piece for the whole city (LOD0-2), re-filled every
//     2 m of camera travel (or every frame while a tile fades); the hedges are the foliage system's own
//     (viewer/foliage/hedges.js buildHedges), one group per tile, hidden beyond HEDGE_FAR of the camera
//   - collisions: per tile, InstancedMeshes of unit boxes named furniture-gardenwall / -gardenpillar / -gardengate (wall +
//     coping + railing as one sheared box, the pillars, the closed driveway gates), never drawn (visible = false): the car
//     (viewer/drive featureColliders), the walker / third person (viewer/character/cityHook) and the collision test read
//     them like the furniture kits' stand-ins. The pedestrian gates are drawn OPEN: the walker gets in at the door
import * as THREE from "three/webgpu";
import { loadGardenKit, GardenPool, PIECES, STRIDE, gardenInstances, standinGeometries } from "./gardenKit.js";
import { wind } from "../foliage/wind.js";

const qs = new URLSearchParams(location.search);
const DATA = new URL("../../data/gardens/", import.meta.url);

export const cityGardens = {
  on: qs.get("gardens") === "1",          // OFF by default until the look check, mesh audit, the sidewalk-to-wall lawn gap and a GREEN GPU measure are done (coordinator, 2026-11-13); ?gardens=1 on
  hedges: qs.get("gardenhedges") !== "0",     // round 2: instanced hedge modules through the kit's pools (gardenHedge.js), ?gardenhedges=0 off
  kit: null, pools: [], tiles: new Map(), group: null, stand: null,
  last: new THREE.Vector3(1e9, 0, 0), dirty: true, gatherMs: 0, tWind: 0,
  async start({ scene, updaters, log = console.log }) {
    if (!this.on) return null;
    const t0 = performance.now();
    try { this.kit = await loadGardenKit(); } catch (e) { log(`gardens: kit failed (${e.message}), ?gardens=0`); this.on = false; return null; }
    this.stand = standinGeometries();
    this.group = new THREE.Group(); this.group.name = "gardens";
    scene.add(this.group);
    for (const p of PIECES) this.pools.push(new GardenPool(this.kit.pieces[p], this.kit.mats, this.group));
    updaters.push((eye, cam) => this.update(cam));
    window.__gardens = this;
    log(`gardens: on (?gardens=1; ?gardenhedges=1 with the hedges), kit ${PIECES.length} pieces x 3 LODs, ${Math.round(performance.now() - t0)} ms`);
    return this;
  },
  fetchTile(name) {
    if (!this.on) return Promise.resolve(null);
    return fetch(new URL(`${name}.json`, DATA)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  },
  /** a tile: its instances join the pools; stand-ins (and hedges) go into `parent` (the tile's features group);
   *  groundAt(x, z) = the drawn ground the hedges stand on */
  addTile(name, doc, parent, groundAt) {
    if (!this.on || !this.kit || !doc) return null;
    const t0 = performance.now();
    const g = gardenInstances(doc, groundAt, { hedgeFronts: this.hedges, hedges: this.hedges });
    const grp = new THREE.Group(); grp.name = `gardens-${name}`;
    const M = new THREE.Matrix4();
    for (const [k, nm] of [["wall", "furniture-gardenwall"], ["pillar", "furniture-gardenpillar"], ["gate", "furniture-gardengate"]]) {
      const a = g.stand[k]; if (!a.length) continue;
      const m = new THREE.InstancedMesh(this.stand[k], this.kit.mats.standin, a.length / 16);
      for (let i = 0; i < a.length / 16; i++) { M.fromArray(a, i * 16); m.setMatrixAt(i, M); }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = nm; m.visible = false; m.castShadow = m.receiveShadow = false;
      m.userData.collisionStandin = true;
      grp.add(m);
    }
    parent.add(grp);
    this.tiles.set(name, { name, raw: g.settled, hedgeRuns: doc.hedges || [], groundAt, inst: g.inst, cells: g.cells, group: grp, fade: 1, counts: g.counts, doc: { segs: doc.segs.length, pillars: doc.pillars.length, gates: doc.gates.length, hedges: doc.hedges.length } });
    this.dirty = true;
    return { ...g.counts, ms: Math.round(performance.now() - t0) };
  },
  removeTile(name) {
    const t = this.tiles.get(name);
    if (!t) return;
    t.group.removeFromParent();
    t.group.traverse((o) => { if (o.isInstancedMesh) o.dispose?.(); });
    this.tiles.delete(name);
    this.dirty = true;
  },
  update(camera) {
    if (!this.on || !this.kit) return;
    const c = camera.position;
    let fading = false;
    for (const t of this.tiles.values()) {
      const f = t.group.userData.fade ?? t.group.parent?.userData.fade ?? 1;
      if (f !== t.fade) { t.fade = f; fading = true; }
    }
    if (this.hedges && qs.get("grass") !== "1") {          // the leaf cards' flutter (?grass=1: the grass field steps the shared wind)
      const now = performance.now(); wind.update(Math.min(0.1, (now - (this.tWind || now)) / 1000)); this.tWind = now;
    }
    if (!this.dirty && !fading && c.distanceToSquared(this.last) < 4) return;
    const t0 = performance.now();
    const tiles = [];
    for (const t of this.tiles.values()) {
      if (t.group.parent && t.group.parent.visible !== false) tiles.push(t);
    }
    for (const p of this.pools) p.gather(tiles, c);
    this.last.copy(c); this.dirty = false;
    this.gatherMs = performance.now() - t0;
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
    const H = t.inst.hedge;
    out.hedgeModules = 0; out.hedgeFloating = 0; out.hedgeMaxFloat = 0;
    if (H) for (let o = 0; o < H.length; o += STRIDE) {
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
      live: Object.fromEntries(this.pools.map((p) => [p.piece.name, p.instances])), gatherMs: +(this.gatherMs || 0).toFixed(2) };
  },
};
