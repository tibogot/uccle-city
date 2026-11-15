// SNOW CAPS IN THE CITY (snowCaps.js does the bake + the material): who carries a cap, gathered round the camera.
//   cars        the parked fleet (carFleet: per type, LOD0 geometry), the moving traffic (its drawn poses, every frame),
//               the player's car (its type from the fleet when it is a faceted pack car)
//   furniture2  benches, bike boxes, bins, glass banks          stops   the shelters (roof glass included), ad panels
//   gardens     coping stones, pillar caps (stretched pieces: directional edge distance), hedge tops (lumpy)
//   plants      the shrubs' far shells (box balls, laurels, rhododendrons, hydrangeas: lumpy, viewer/plants/)
// Baked lazily when snow first lies (one model per frame), drawn only while there is snow; the static families are
// re-gathered every 0.4 s / 3 m of camera travel, the moving cars every frame.
import * as THREE from "three/webgpu";
import { wx } from "./weatherState.js";
import { bakeCap, capMaterial, CapSet, CAPS_ON } from "./snowCaps.js";
import { carFleet } from "../carFleet.js";

const R_CARS = 62, R_KIT = 52;
const FAMILY = {
  cars: { k: 0.9, maxT: 0.22, fade: [45, 60], cell: 0.04, yMin: 0.7, minHalf: 0.06, minNy: 0.62 },
  kit: { k: 0.85, maxT: 0.18, fade: [36, 50], cell: 0.025, yMin: 0.12, minHalf: 0.012 },
  wall: { k: 0.8, maxT: 0.16, fade: [36, 50], cell: 0.02, yMin: -Infinity, minHalf: 0.02 },
  hedge: { k: 0.75, maxT: 0.14, fade: [36, 50], cell: 0.05, yMin: -Infinity, minHalf: 0.05, lumpy: 0.5 },
};
const FURN = ["bench_street", "bench_park", "bench_backless", "bikebox", "bin_round", "bin_column", "glassbank"];
const STOPS = ["shelter", "adpanel"];
const GARDEN = { cap: "wall", pcap: "wall", hedge: "hedge" };
const PLANT_CAPS = ["box_ball", "laurel", "rhododendron", "hydrangea"], R_PLANT = 40;     // (the small bed plants: their own white crown is enough)

export function createCityCaps({ group, getMovers, kits = {} }) {
  if (!CAPS_ON) return null;
  const mats = Object.fromEntries(Object.entries(FAMILY).map(([k, f]) => [k, capMaterial(f)]));
  const sets = new Map();               // key -> CapSet | null (no cap) ; pending keys are baked one per frame
  const queue = [];
  const stats = { sets: 0, drawn: 0, instances: 0, bakeMs: 0, verts: 0, gatherMs: 0 };
  const queued = new Set();
  const want = (key, fam, geos) => { if (sets.has(key) || queued.has(key)) return; queued.add(key); queue.push({ key, fam, geos }); };
  const last = new THREE.Vector3(1e9, 0, 0);
  let lastT = 0, snowWas = false;
  const M = new Float32Array(16);

  // a dummy cap per family so the boot precompile builds the four pipelines (the bakes come later)
  const dummy = [];
  for (const [k, m] of Object.entries(mats)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, -1e4, 0, 0.01, -1e4, 0, 0, -1e4, 0.01], 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute("aE", new THREE.Float32BufferAttribute(new Float32Array(12), 4));
    g.setAttribute("aS", new THREE.Float32BufferAttribute(new Float32Array(12), 4));
    g.setIndex([0, 2, 1]);
    const s = new CapSet({ geometry: g }, m, `warm-${k}`, 1);
    s.begin(); s.push([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); s.end(true);
    group.add(s.mesh); dummy.push(s);
  }

  function setFor(key) { return sets.get(key) || null; }
  function bakeOne() {
    const job = queue.shift(); if (!job) return;
    queued.delete(job.key);
    const t0 = performance.now(), F = FAMILY[job.fam];
    let b = null;
    try { b = bakeCap(job.geos, F); } catch (e) { console.warn("[snowcaps] bake", job.key, e); }
    stats.bakeMs = Math.max(stats.bakeMs, performance.now() - t0);
    if (!b) { sets.set(job.key, null); return; }
    const s = new CapSet(b, mats[job.fam], job.key, 16);
    group.add(s.mesh);
    sets.set(job.key, s);
    stats.sets++; stats.verts += b.verts;
  }

  /** the static families round the camera (parked cars, kits) */
  function gatherStatic(cam) {
    const t0 = performance.now();
    for (const s of sets.values()) if (s) s.begin();
    const near = (x, z, r) => { const dx = x - cam.x, dz = z - cam.z; return dx * dx + dz * dz < r * r; };
    // parked cars
    if (carFleet.ready && carFleet.types) {
      for (const r of carFleet.regs) {
        if (!r.live) continue;
        for (const c of r.cars) {
          if (c.hidden || !near(c.x, c.z, R_CARS)) continue;
          const key = `car:${c.type}`, s = setFor(key);
          if (s) s.push(c.m.elements); else if (!sets.has(key)) want(key, "cars", [carFleet.types[c.type]?.lods[0]?.geo].filter(Boolean));
        }
      }
    }
    // furniture2 / stops: x y z yaw at stride 8
    const yawKit = (kit, prefix, pieces, tiles, fam) => {
      if (!kit?.pieces || !tiles) return;
      for (const t of tiles.values()) for (const p of pieces) {
        const a = t.inst?.[p]; if (!a) continue;
        const key = `${prefix}:${p}`;
        for (let o = 0; o < a.length; o += 8) {
          if (!near(a[o], a[o + 2], R_KIT)) continue;
          const s = setFor(key);
          if (!s) { if (!sets.has(key)) { const P = kit.pieces[p]; want(key, fam, [P.lods[0], P.glass].filter(Boolean)); } break; }
          const cs = Math.cos(a[o + 3]), sn = Math.sin(a[o + 3]);
          M.set([cs, 0, -sn, 0, 0, 1, 0, 0, sn, 0, cs, 0, a[o], a[o + 1], a[o + 2], 1]);
          s.push(M);
        }
      }
    };
    const F2 = kits.furniture?.(), ST = kits.stops?.(), GA = kits.gardens?.();
    yawKit(F2?.kit, "furn", FURN, F2?.tiles, "kit");
    yawKit(ST?.kit, "stop", STOPS, ST?.tiles, "kit");
    // gardens: full matrices at stride 24 (stretched / sheared copings)
    if (GA?.kit?.pieces && GA.tiles) {
      for (const t of GA.tiles.values()) for (const [p, fam] of Object.entries(GARDEN)) {
        const a = t.inst?.[p]; if (!a) continue;
        const key = `garden:${p}`;
        for (let o = 0; o < a.length; o += 24) {
          if (!near(a[o + 12], a[o + 14], R_KIT)) continue;
          const s = setFor(key);
          if (!s) { if (!sets.has(key)) want(key, fam, [GA.kit.pieces[p].lods[0]]); break; }
          s.push(a, o);
        }
      }
    }
    // plants (viewer/plants/cityPlants.js): the shrubs' far shells carry a lumpy cap (x y z yaw scale rnd end, stride 7)
    const PL = kits.plants?.();
    if (PL?.lib && PL.tiles) {
      for (const t of PL.tiles.values()) for (const p of PLANT_CAPS) {
        const a = t.per?.[p]; if (!a) continue;
        const key = `plant:${p}`;
        for (let o = 0; o < a.length; o += 7) {
          if (!near(a[o], a[o + 2], R_PLANT)) continue;
          const s = setFor(key);
          if (!s) { if (!sets.has(key)) want(key, "hedge", [PL.lib.types[p].lods[2]]); break; }
          const c = Math.cos(a[o + 3]), sn = Math.sin(a[o + 3]), k = a[o + 4];
          M.set([c * k, 0, -sn * k, 0, 0, k, 0, 0, sn * k, 0, c * k, 0, a[o], a[o + 1], a[o + 2], 1]);
          s.push(M);
        }
      }
    }
    for (const s of sets.values()) if (s) s.ns = s.n;
    stats.gatherMs = performance.now() - t0;
  }

  /** the moving cars, every frame, after the static instances of their type */
  function gatherMoving(cam) {
    const Mv = getMovers?.();
    const TT = Mv?.traffic?.()?.T, sim = TT?.sim;
    if (sim && TT.types && carFleet.types) {
      const a = TT.alpha ?? 1, b1 = 1 - a;
      for (let i = 0; i < sim.cap; i++) {
        if (!sim.alive[i]) continue;
        const x = sim.px[i] * b1 + sim.x[i] * a, z = sim.pz[i] * b1 + sim.z[i] * a;
        const dx = x - cam.x, dz = z - cam.z;
        if (dx * dx + dz * dz > R_CARS * R_CARS) continue;
        const name = TT.types[sim.type[i]]?.name, key = `car:${name}`, s = setFor(key);
        if (!s) { if (name && !sets.has(key)) want(key, "cars", [carFleet.types[name]?.lods[0]?.geo].filter(Boolean)); continue; }
        let yaw = sim.yaw[i]; const py = sim.pyaw[i]; let dy = yaw - py;
        if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
        yaw = py + dy * a;
        const pitch = sim.ppitch[i] * b1 + sim.pitch[i] * a;
        const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
        // (trafficFleet's frame: x = model left, y = up, z = the bonnet)
        M.set([cy, 0, -sy, 0, -sy * sp, cp, -cy * sp, 0, sy * cp, sp, cy * cp, 0, x, sim.py[i] * b1 + sim.y[i] * a + 0.005, z, 1]);
        s.push(M);
      }
    }
    // the player's car (a faceted pack car: its type's cap)
    const D = Mv?.driver;
    if (D?.on && D.vehicle !== "moto" && D.car?.root && /^faceted:/.test(D.spec ?? "")) {
      const name = D.spec.replace(/^faceted:/, ""), key = `car:${name}`, s = setFor(key);
      if (s) { D.car.root.updateMatrixWorld(); s.push(D.car.root.matrixWorld.elements); }
    }
  }

  return {
    stats, sets,
    update(camPos, dt) {
      const snow = wx.uSnowDepth.value > 0.004 && wx.uSnowCover.value > 0.15;
      for (const s of dummy) s.mesh.visible = false;
      if (!snow) {
        if (snowWas) for (const s of sets.values()) if (s) { s.n = 0; s.end(false); }
        snowWas = false;
        return;
      }
      snowWas = true;
      if (queue.length) bakeOne();
      const now = performance.now();
      if (now - lastT > 400 || camPos.distanceToSquared(last) > 9) { gatherStatic(camPos); lastT = now; last.copy(camPos); }
      for (const s of sets.values()) if (s) s.n = s.ns ?? 0;
      gatherMoving(camPos);
      let drawn = 0, inst = 0;
      for (const s of sets.values()) if (s) { s.end(true); if (s.mesh.visible) { drawn++; inst += s.n; } }
      stats.drawn = drawn; stats.instances = inst;
    },
  };
}
