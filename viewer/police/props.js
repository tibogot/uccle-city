// POLICE GAME PROPS (docs/POLICE_GAME.md): what a job puts in the street, scripted in JS (boxy / simple: the owner's rule)
//   standing cars    the faceted pack's cars, our own materials (paint per car), DAMAGED ones with a crumpled corner
//                    (a vertex push in the shader, by the body's own local position: no new mesh) and hazard lights
//   cones            traffic cones (a lathe: base plate, cone, two white retro-reflective bands), one InstancedMesh
// Each standing car is solid for the player (a drive collider, driver.addStatic) and for the traffic (an obstacle of
// the simulation, sim.extraObs). A standing car can DRIVE OFF into the traffic (sim.joinFrom: the same type and paint,
// a pull-out maneuver), so nothing pops: the static car hides the same frame the traffic car appears in its place.
// Pipelines: Props.compile() renders each material once under the "On your way" card (renderer.compileAsync), so the
// first accident does not stall a frame.
import * as THREE from "three/webgpu";
import { uniform, select, positionLocal, normalLocal, attribute, float, vec3, smoothstep, sin, color, max } from "three/tsl";
import { loadPack, packMaterial, FLEET_SOURCE } from "../drive/carPacks.js";
import { KIND } from "../drive/colliders.js";

export const hazard = uniform(0);                   // the damaged cars' hazard lights 0 / 1 (blinks, set by the game)
const CONES = 8;

/** a crumple: the corner (sx: +1 left / -1 right, sz: +1 front / -1 back) pushed in by up to `depth` m */
function damagedMaterial(paint, rich, { sx = 1, sz = 1, depth = 0.16 } = {}) {
  const m = packMaterial({ paint, rich, clearcoat: true, seeThrough: true });
  const p = positionLocal, kind = attribute("_kind", "float").add(0.5).floor();
  // weight: near the chosen end and side, falling off over ~0.9 m; a wavy push (sheet metal folds)
  // (sx, sz, depth as uniforms: every damaged car has the same node graph, so one pipeline serves them all)
  const uSx = uniform(sx), uSz = uniform(sz), uDepth = uniform(depth);
  const along = p.z.mul(uSz), side = p.x.mul(uSx);
  const w = smoothstep(1.2, 2.2, along).mul(smoothstep(-0.2, 0.75, side));
  const fold = sin(p.y.mul(23)).mul(0.35).add(sin(p.z.mul(17).add(p.x.mul(9))).mul(0.25)).add(0.7);
  m.positionNode = p.sub(normalLocal.mul(w.mul(fold).mul(uDepth))).sub(vec3(0, w.mul(0.04), w.mul(uDepth.mul(uSz).mul(0.6))));
  // hazard lights: head + tail lamps (kinds 2, 3) blink amber
  const lamp = kind.equal(2).or(kind.equal(3));
  m.emissiveNode = select(lamp, color(0xff8a1a).mul(hazard.mul(2.2)), vec3(0));
  m.name = "police prop (damaged)";
  return m;
}

export class Props {
  constructor({ scene, driver, getTraffic, renderer, camera }) {
    Object.assign(this, { scene, driver, getTraffic, renderer, camera });
    this.cars = [];                                 // { group, x, z, heading, type, rgb, colSet, obs }
    this.group = new THREE.Group(); this.group.name = "police-props";
    scene.add(this.group);
    this.pack = null;
    // cones
    this.cones = null; this.coneN = 0; this.coneObs = [];
  }
  async ready() {
    if (this.pack) return this.pack;
    this.pack = await loadPack(FLEET_SOURCE);
    if (!this.cones) this.cones = this.makeCones();
    return this.pack;
  }
  makeCones() {
    // profile (r, y): base plate 0.38 m square-ish (a lathe with 4 segments, rotated 45 deg), the cone 0.5 m
    const base = new THREE.CylinderGeometry(0.27, 0.27, 0.03, 4, 1); base.rotateY(Math.PI / 4); base.translate(0, 0.015, 0);
    const pts = [[0.155, 0.03], [0.15, 0.06], [0.03, 0.5], [0.022, 0.52], [0, 0.52]].map(([r, y]) => new THREE.Vector2(r, y));
    const cone = new THREE.LatheGeometry(pts, 24);
    const merge = (geos) => {
      const g = new THREE.BufferGeometry(), P = [], N = [], C = [], I = [];
      let o = 0;
      for (const [geo, band] of geos) {
        const gi = geo.index ? geo : geo;
        const pa = gi.attributes.position, na = gi.attributes.normal;
        for (let i = 0; i < pa.count; i++) {
          const y = pa.getY(i);
          P.push(pa.getX(i), y, pa.getZ(i)); N.push(na.getX(i), na.getY(i), na.getZ(i));
          const white = band && ((y > 0.24 && y < 0.31) || (y > 0.36 && y < 0.41));
          const c = band ? (white ? [0.85, 0.85, 0.82] : [0.95, 0.22, 0.02]) : [0.03, 0.03, 0.03];
          C.push(...c);
        }
        if (gi.index) for (let i = 0; i < gi.index.count; i++) I.push(gi.index.getX(i) + o);
        else for (let i = 0; i < pa.count; i++) I.push(i + o);
        o += pa.count;
      }
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
      return g;
    };
    // the bands as real rings: subdivide the cone's lathe enough for sharp-ish band edges (24 x 12 rows)
    const fine = new THREE.LatheGeometry([...Array(13)].map((_, k) => { const y = 0.06 + (0.44 * k) / 12; return new THREE.Vector2(0.15 - (0.12 * k) / 12, y); }).concat([new THREE.Vector2(0.022, 0.52), new THREE.Vector2(0, 0.52)]), 24);
    void cone;
    const g = merge([[base, false], [fine, true]]);
    const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.55 });
    m.name = "police cone";
    const mesh = new THREE.InstancedMesh(g, m, CONES);
    mesh.count = 0; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = "police-cones";
    this.group.add(mesh);
    return mesh;
  }
  /** (the warm-up, warm.js) one plain and one damaged car + a cone, to build their pipelines out of sight */
  warmSet() {
    const a = this.addCar({ x: 0, z: 0, heading: 0, type: "hatch_c", paint: 0x777777, damage: { sx: 1, sz: 1 }, solid: false, compileOnly: true });
    const b = this.addCar({ x: 0, z: 0, heading: 0, type: "hatch_c", paint: 0x777777, solid: false, compileOnly: true });
    this.cones.count = 1;
    return [a, b];
  }
  unwarm(list) { for (const c of list) this.removeCar(c); this.cones.count = this.coneN; }
  ground(x, z) { const d = this.driver; try { const y = d.ground(x, z); return Number.isFinite(y) ? y : 0; } catch { return 0; } }

  /** a standing car: { x, z, heading (forward = (sin, cos)), type, paint hex, damage: { sx, sz, depth } | null, solid } */
  addCar({ x, z, heading, type = "hatch_c", paint = 0x8a1414, damage = null, solid = true, tilt = 0, compileOnly = false }) {
    const car = this.pack.cars.find((c) => c.id === type) || this.pack.cars[0];
    const col = new THREE.Color(paint);
    const mat = damage ? damagedMaterial(col, this.pack.rich, damage) : packMaterial({ paint: col, rich: this.pack.rich, clearcoat: true, seeThrough: true });
    const L = car.lods[Math.min(1, car.lods.length - 1)];
    const g = new THREE.Group(); g.name = `police-prop-${type}`;
    const body = new THREE.Mesh(L.Body, mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
    for (const k of ["FL", "FR", "RL", "RR"]) {
      if (!L[`Wheel_${k}`]) continue;
      const w = new THREE.Mesh(L[`Wheel_${k}`], mat); w.position.fromArray(car.parts[`Wheel_${k}`].pos); w.castShadow = true;
      if (damage && k[0] === (damage.sz > 0 ? "F" : "R")) w.rotation.y = 0.35 * (damage.sx || 1);
      g.add(w);
    }
    const y = compileOnly ? -500 : this.ground(x, z);
    g.position.set(x, y, z); g.rotation.set(0, heading, tilt, "YXZ");
    this.group.add(g);
    const c = { group: g, x, z, heading, type, rgb: [col.r, col.g, col.b], mat, colSet: null, obs: null, size: car.size };
    if (solid) this.solid(c);
    this.cars.push(c);
    return c;
  }
  /** (10 Hz) a car placed before its tile streamed in stands on the right ground once the tile is there */
  update(px, pz) {
    for (const c of this.cars) {
      if (Math.abs(c.x - px) > 400 || Math.abs(c.z - pz) > 400) continue;
      const y = this.ground(c.x, c.z);
      if (Math.abs(y - c.group.position.y) > 0.01) c.group.position.y = y;
    }
  }
  /** a car's footprint: a drive collider (the player) + 2 obstacle circles (the traffic) */
  solid(c) {
    const [w, , l] = c.size, s = Math.sin(c.heading), k = Math.cos(c.heading), hw = w / 2 + 0.05, hl = l / 2 + 0.05;
    const ring = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]].map(([u, v]) => [c.x + u * k + v * s, c.z - u * s + v * k]);
    c.colSet = this.driver.addStatic([{ rings: [ring], kind: KIND.car }]);
    const sim = this.getTraffic()?.sim;
    c.obs = [{ x: c.x + s * l * 0.25, z: c.z + k * l * 0.25, r: 1.2 }, { x: c.x - s * l * 0.25, z: c.z - k * l * 0.25, r: 1.2 }];
    if (sim) sim.extraObs.push(...c.obs);
  }
  unsolid(c) {
    if (c.colSet) { this.driver.removeStatic(c.colSet); c.colSet = null; }
    const sim = this.getTraffic()?.sim;
    if (sim && c.obs) for (const o of c.obs) { const i = sim.extraObs.indexOf(o); if (i >= 0) sim.extraObs.splice(i, 1); }
    c.obs = null;
  }
  removeCar(c) {
    if (!c) return;
    this.unsolid(c);
    c.group.removeFromParent();
    // (the material is not disposed: its pipeline stays cached for the next prop of the same kind)
    const i = this.cars.indexOf(c); if (i >= 0) this.cars.splice(i, 1);
  }
  /** the standing car drives off into the traffic (same type and paint): -> the traffic index, or -1 (then it stays) */
  driveOff(c) {
    const T = this.getTraffic(), sim = T?.sim;
    if (!sim) return -1;
    const ti = T.types.findIndex((t) => t.name === c.type);
    this.unsolid(c);
    const i = sim.joinFrom(c.x, c.z, c.heading, Math.max(0, ti), c.rgb);
    if (i < 0) { this.solid(c); return -1; }
    sim.keep[i] = 0;
    this.removeCar(c);
    return i;
  }
  // ---- cones: a fixed pool of 8 instances (static usage, written on change only)
  setCones(list) {
    const m = this.cones, M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const sim = this.getTraffic()?.sim;
    if (sim) for (const o of this.coneObs) { const i = sim.extraObs.indexOf(o); if (i >= 0) sim.extraObs.splice(i, 1); }
    this.coneObs = [];
    this.coneN = Math.min(CONES, list.length);
    for (let k = 0; k < this.coneN; k++) {
      const [x, z] = list[k];
      q.setFromAxisAngle(up, k * 0.7);
      M.compose(v.set(x, this.ground(x, z), z), q, one);
      m.setMatrixAt(k, M);
      const o = { x, z, r: 0.4 }; this.coneObs.push(o);
    }
    if (sim) sim.extraObs.push(...this.coneObs);
    m.count = this.coneN;
    m.instanceMatrix.needsUpdate = true;
  }
  clear() {
    for (const c of [...this.cars]) this.removeCar(c);
    if (this.cones) this.setCones([]);
    hazard.value = 0;
  }
}
void max; void float;
