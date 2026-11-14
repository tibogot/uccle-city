// DRIVE MODE: the Car Lab's car and driving model in the city (?car=scripted | kenney:<id> | quaternius:<id>, or
// __driver.setCar(spec); carModel.js loadCarModel is the one loader).
//   W / S (↑ ↓) throttle, brake, reverse   A / D (← →) steer   Space handbrake
//   R back to the start   C camera (chase / far / bumper / orbit)   G draw colliders   Esc back to orbit
// Collisions: each loaded tile carries its drive data from the tile worker (colliders.js buildDriveData: building
// footprints, kerb islands, tree trunks, in 48 m cells) plus its lamp posts (added here, from lamps.js lampSites).
// The car only looks at the cells round it (carEnv.js). Ground = the drivable surface grid (road deck, sidewalks).
import * as THREE from "three/webgpu";
import { loadCarModel, createCar, carLights, fitBody } from "./carModel.js";
import { HANDLING, createCarState, stepCar } from "./carPhysics.js";
import { addCircles, buildColliders, driveHeight, extendColliders, gather, pointInBuilding, setBox, KIND } from "./colliders.js";
import { carFleet } from "../carFleet.js";
import { createCarEnv } from "./carEnv.js";
import { ChaseCamera } from "./chaseCamera.js";
import { ColliderDebug } from "./debugDraw.js";
import { auditTile } from "./colliderAudit.js";
import { DriveKeys } from "./input.js";
import { lampSites } from "../lamps.js";
import { carBlockersSync } from "../heroColliders.js";
import { env as lightEnv } from "../lighting.js";

/** Main thread, once per loaded tile: the worker's drive data + the tile's lamp posts and bollards, from the lists the
 *  city DRAWS (drawn = { lamps: lamps.js placedLampSites, bollards: [{x, z}] }: the lamps moved onto the measured
 *  sidewalk, the surveyed bollards). Before 2026-11-12 the posts came from lampSites, where the lamps stood BEFORE
 *  they were moved onto the sidewalk: ~90 % of them were invisible posts, many in the carriageway
 *  (docs/CITY_TREES.md §3). No drawn list (or a legacy drive set): the old lampSites posts. */
export function tileDrive(drive, roads, bounds, drawn = null, features = null) {
  if (!drive) return null;
  const old = !drawn || drive.legacy;
  const lamps = (old ? lampSites(roads, bounds) : drawn.lamps).map((p) => ({ x: p.x, z: p.z, r: 0.2, kind: KIND.lamp }));
  const posts = old ? [] : (drawn.bollards || []).map((p) => ({ x: p.x, z: p.z, r: 0.1, kind: KIND.post }));
  addCircles(drive.col, [...lamps, ...posts]);
  drive.counts.lamps = lamps.length; drive.counts.posts = posts.length;
  if (features && !old) {
    const f = featureColliders(features, bounds);
    drive.col = extendColliders(drive.col, f.polys, f.circles);
    Object.assign(drive.counts, f.counts);
    // each parked car knows its box in this set: off while it drives (colliders.js gather skips a hidden ref), its new
    // type's size when another car parks into the slot (road fix round 3: the G view's "invisible cars")
    const P = drive.col.pref;
    if (P) for (let id = 0; id < P.length; id++) if (P[id]) (P[id].driveBox = { col: drive.col, id });
  }
  return drive;
}

/** The box of a parked car (viewer/carFleet.js car object: x, z, heading, type), as its 4 plan corners. */
export function parkedCarRing(c) {
  const [w, , l] = carFleet.sizeOf(c.type), s = Math.sin(c.heading), k = Math.cos(c.heading), hw = w / 2, hl = l / 2;
  // the fleet's matrix: rotation about y by heading, scale (w, h, l): local x across the car, local z along it
  return [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([u, v]) => [c.x + u * k + v * s, c.z - u * s + v * k]);
}
carFleet.onChange((c) => { if (c.driveBox && !c.hidden) setBox(c.driveBox.col, c.driveBox.id, parkedCarRing(c)); });

/**
 * What else the tile DRAWS at car height (docs/collisions/README.md: until 2026-11-13 the car went through them): the
 * parked cars (their oriented boxes, the ones the fleet draws), the street furniture (signals and stop poles as posts,
 * benches / bike racks / bus and tram shelters as oriented boxes), the tram poles and the rail masts (posts at their
 * foot). From the features group's instanced meshes, by name (the same ones viewer/character/cityHook.js uses).
 */
export function featureColliders(features, bounds) {
  const polys = [], circles = [], counts = { cars: 0, furniture: 0, poles: 0 };
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), v = new THREE.Vector3(), o = new THREE.Vector3();
  const inT = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  features.updateMatrixWorld(true);
  features.traverse((m) => {
    if (!m.isInstancedMesh) return;
    const n = m.name || "", p = m.parent?.name || "";
    const kind = n === "parked-cars" ? "car" : /^furniture-(stopPole|signal)$/.test(n) || n === "tram-poles" || n === "rail-masts" ? "pole"
      : /^furniture-(bench|bikes|shelter|adpanel|bikebox|bin|glassbank|gardenwall|gardenpillar|gardengate|fuel)$/.test(n) || (p === "tram" && !n) ? "box" : null;
    if (!kind) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    for (let i = 0; i < m.count; i++) {
      m.getMatrixAt(i, M); W.multiplyMatrices(m.matrixWorld, M);
      o.set(0, 0, 0).applyMatrix4(W);
      if (!inT(o.x, o.z)) continue;
      if (kind === "pole") { circles.push({ x: o.x, z: o.z, r: n === "tram-poles" || n === "rail-masts" ? 0.15 : 0.08, kind: KIND.furniture }); counts.poles++; continue; }
      if (kind === "car") {
        // the car as it is NOW (its type may have changed since the box mesh was made: the traffic parks other cars in)
        const car = m.userData.cars?.[i] || null;
        const ring = car ? parkedCarRing(car) : [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.max.x, bb.max.z], [bb.min.x, bb.max.z]].map(([x, z]) => { v.set(x, bb.min.y, z).applyMatrix4(W); return [v.x, v.z]; });
        polys.push({ rings: [ring], kind: KIND.car, ref: car }); counts.cars++;
        continue;
      }
      // benches, bike racks, shelters: what they draw at car height (a shelter's roof overhangs its posts and glass;
      // a bike rack is hoops, not a box), sliced like the landmarks (viewer/heroColliders.js)
      const P = m.geometry.attributes.position, I = m.geometry.index, cnt = I ? I.count : P.count, T = new Float32Array(cnt * 3);
      for (let q = 0; q < cnt; q++) { v.fromBufferAttribute(P, I ? I.getX(q) : q).applyMatrix4(W); T[q * 3] = v.x; T[q * 3 + 1] = v.y; T[q * 3 + 2] = v.z; }
      v.set(0, bb.min.y, 0).applyMatrix4(W);
      const base = v.y;
      for (const pq of carBlockersSync(T, () => base, { kind: KIND.furniture })) polys.push(pq);
      counts.furniture++;
    }
  });
  return { polys, circles, counts };
}

export class Driver {
  /** world: { tiles: [{ bounds, hm, drive }], at(x, z) } */
  constructor(camera, dom, scene, world) {
    Object.assign(this, { camera, dom, scene, world, on: false });
    this.chase = new ChaseCamera(camera, dom);
    this.debug = new ColliderDebug(scene);
    this.debug.visible = /[?&]drivedebug=1/.test(location.search);
    this.keys = new DriveKeys({ active: () => this.on, onKey: (k) => {
      if (k === "KeyR") this.reset(); else if (k === "KeyC") this.chase.next();
      else if (k === "KeyG") this.debug.visible = !this.debug.visible; else if (k === "Escape") this.onExit?.();
    } });
    this.ground = (x, z) => {
      let dk = null, osm = false;                                                    // a road bridge's deck (hero or OSM)
      for (const f of this.world.decks || []) { const y = f(x, z); if (y != null) { dk = y; osm = !!f.osm; break; } }
      const near = this.groundHint ?? (this.on && this.state ? this.state.y : null);
      const t = this.world.at(x, z);
      const g = t.drive ? driveHeight(t.hm, t.drive.ground, x, z, near) : t.hm.surface(x, z) + 0.12;
      // an OSM deck and the road drawn with it (the OSM decks' road runs on or just through the slab, e.g. 0.3 m under it
      // on the Chaussée de Waterloo, 0.4 m over it on Avenue des Hospices): the higher of the two is the surface; a
      // surface far under the deck (a street passing under the bridge) when the car is on it: the layer nearest the
      // car, as driveHeight does for the grid's two layers (before 2026-11-13 the deck always won)
      if (dk == null) return g;
      if (osm && Math.abs(g - dk) < 1.5) return Math.max(g, dk);                    // (a hero deck: its own surface)
      return Number.isFinite(near) && Math.abs(g - near) + 1 < Math.abs(dk - near) ? g : dk;
    };
    this.sets = (x, z, r) => {
      const out = this._sets ||= [];
      out.length = 0;
      for (const t of this.world.tiles) {
        const b = t.bounds;
        if (t.drive && x + r >= b.x0 && x - r <= b.x1 && z + r >= b.z0 && z - r <= b.z1) out.push(t.drive.col);
      }
      for (const col of this.extra) {
        const b = col.bounds;
        if (x + r >= b.x0 && x - r <= b.x1 && z + r >= b.z0 && z - r <= b.z1) out.push(col);
      }
      return out;
    };
    // the debug view's "no visible object" flags: the audit of the collider's tile, once per tile (colliderAudit.js)
    this.flagsOf = (col) => {
      if (col.flags !== undefined) return col.flags;
      const t = this.world.tiles.find((w) => w.drive?.col === col);
      col.flags = t?.drawn ? auditTile(t).ids : null;
      return col.flags;
    };
    this.extra = [];   // collider sets no tile carries (hero models: the Saint-Job front steps)
    this.ledges = !/[?&]colfix=0/.test(location.search);       // ?colfix=0: the car climbs any step (as before the audit)
    this.env = createCarEnv({ sets: this.sets, ground: this.ground, handling: HANDLING, waters: () => this.world.waters, ledges: this.ledges });
    this.camNear = [];
    this.insideWall = (x, z) => pointInBuilding(this.camNear, x, z);
    this.hud = document.createElement("div");
    Object.assign(this.hud.style, { position: "fixed", left: "50%", bottom: "14px", transform: "translateX(-50%)", padding: "6px 14px",
      borderRadius: "8px", background: "rgba(20,24,30,.7)", color: "#fff", font: "600 22px/1 ui-monospace, monospace", display: "none", zIndex: 2 });
    document.body.append(this.hud);
    this.ms = 0;
  }

  /** Extra polygons ({ rings, kind }) that no tile carries, e.g. a hero model's steps (stjobModel.js stjobColliders). */
  addStatic(polys) {
    if (!polys?.length) return;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const p of polys) for (const r of p.rings) for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const set = buildColliders(polys, [], { x0, x1, z0, z1 });
    this.extra.push(set);
    return set;
  }
  removeStatic(set) { const i = this.extra.indexOf(set); if (i >= 0) this.extra.splice(i, 1); }

  /** Swap the car model (carModel.js loadCarModel spec: "scripted", "kenney:sedan", "quaternius:car_a" ...). */
  async setCar(spec) {
    const model = await loadCarModel(spec);
    if (this.car) this.scene.remove(this.car.root);
    this.spec = spec; this.model = model;
    fitBody(model);
    this.car = createCar(model);
    this.car.root.visible = this.on;
    this.scene.add(this.car.root);
    if (this.state) this.car.update(this.state);
  }

  async start(x, z, heading) {
    if (!this.car) await this.setCar(new URLSearchParams(location.search).get("car") || "faceted:hatch_c").catch(() => this.setCar("scripted"));   // our faceted family is the default (owner, 2026-11-05)
    this.startPose = { x, z, heading };
    this.on = true;
    this.car.root.visible = true;
    this.hud.style.display = "";
    this.reset();
  }
  reset() {
    const s = this.startPose;
    this.state = createCarState(s.x, s.z, s.heading);
    this.state.y = NaN;                                   // (no layer hint yet: the top surface)
    this.state.y = this.ground(s.x, s.z);
    this.chase.reset();
  }
  stop() {
    this.on = false; this.chase.active = false;
    if (this.car) this.car.root.visible = false;
    this.debug.visible = false;
    this.hud.style.display = "none";
  }
  get x() { return this.state?.x ?? 0; }
  get z() { return this.state?.z ?? 0; }

  update(dt) {
    if (!this.on || !this.state) return;
    this.chase.active = true;
    const t0 = performance.now();
    const c = this.state;
    stepCar(c, this.keys.read(), dt, this.env, HANDLING);
    carLights.brake.value = c.braking ? 1 : 0;
    carLights.head.value = carLights.tail.value = lightEnv.uNight?.value > 0.5 ? 1 : 0;
    this.car.update(c);
    this.camNear.length = 0;
    for (const col of this.sets(c.x, c.z, 14)) gather(col, c.x, c.z, 14, this.camNear);
    this.chase.update(c, dt, this.ground, this.insideWall);
    this.debug.update(this.sets, this.ground, c, this.env.contacts > 0, 40, this.flagsOf);
    this.ms = this.ms * 0.95 + (performance.now() - t0) * 0.05;
    if ((this._hudN = (this._hudN || 0) + 1) % 6 === 0)
      this.hud.innerHTML = `${(Math.abs(c.speed) * 3.6).toFixed(0)} <small style="font-size:12px;color:#b8c2cc;font-weight:400">km/h${c.speed < -0.2 ? " R" : ""} · C camera · G colliders · R reset</small>`;
  }
  info() {
    const c = this.state;
    return c ? { x: +c.x.toFixed(1), z: +c.z.toFixed(1), y: +c.y.toFixed(2), kmh: +(c.speed * 3.6).toFixed(1), hits: c.hits, near: this.env.tested, ms: +this.ms.toFixed(3), cam: this.chase.mode } : null;
  }
}
