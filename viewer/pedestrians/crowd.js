// The banded crowd (docs/PEDESTRIANS.md): Mr.doob's skinned people (vendor/slop-ped, his bodies, his clothes shader,
// his rigid-pair skinning) drawn in three mesh LODs, with the animation from two sources:
//   live    < 18 m (at most MAX_LIVE): his PersonRig (planted feet, two-bone IK, real ground heights), pose from the CPU;
//   baked   18-250 m: the bone table (boneTable.js), turned into world poses by a compute pass on the GPU from 4 vec4
//           per person (position + yaw, two clip slices + mix + height, the appearance, the head glance);
// mesh LOD0 (his near rings) < 35 m, LOD1 (his far rings) 35-60 m, LOD2 (meshopt, lod2.js) 60-250 m, nothing beyond:
// every switch is a dithered cross-fade (viewer/lodFade.js keepBand, per-person bands from the CPU), shadows fade out
// over 36-46 m (only LOD0 / LOD1 cast). The live <-> baked hand-over is a pose blend over 0.4 s on the CPU, at a
// different distance from the mesh switches, so the two never happen together.
// One pose buffer per mesh LOD (the vendored PersonCrowd's layout: 31 vec4 per person); in each, the live people come
// first (CPU-written range), the baked ones after (written by the compute pass): the two ranges never overlap.
import * as THREE from "three/webgpu";
import { Fn, If, int, float, vec3, vec4, instanceIndex, attributeArray, storage, uniform, cross, dot, normalize, mix, select,
  floor, fract, sin, cos, vertexStage } from "three/tsl";
import { PersonRig } from "../../vendor/slop-ped/pedestrians.js";
import { createPersonMaterial } from "./personMaterial.js";
import { buildBody } from "./bodies.js";
import { keepBand } from "../lodFade.js";
import { BONES, STRIDE, BIND, blendPose, rot } from "./boneTable.js";
import { buildLod2 } from "./lod2.js";

export const BANDS = {
  live: 18, liveOut: 20, liveWarm: 21.5, maxLive: 16, blend: 0.4,  // m, m, m, people, s
  lod01: 35, lod01w: 3,            // LOD0 -> LOD1 cross-fade centre and half-width (m)
  lod12: 60, lod12w: 4,            // LOD1 -> LOD2
  end: 250, endw: 25,              // LOD2 fades out over 225-250 m
  shadow: 41, shadoww: 5,          // shadows fade out over 36-46 m
  farRate: 4,                      // beyond lod12 + w: sim / clip state refreshed every 4th frame (15 Hz at 60 fps)
};
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------------------------------- GPU helpers (TSL)
const qmul = (a, b) => vec4(b.xyz.mul(a.w).add(a.xyz.mul(b.w)).add(cross(a.xyz, b.xyz)), a.w.mul(b.w).sub(dot(a.xyz, b.xyz)));
const qrot = (q, v) => v.add(cross(q.xyz, cross(q.xyz, v).add(v.mul(q.w))).mul(2.0));
const nlerp = (a, b, t) => normalize(mix(a, b.mul(select(dot(a, b).lessThan(0), float(-1), float(1))), t));
const yawQ = (a) => vec4(0, sin(a.mul(0.5)), 0, cos(a.mul(0.5)));

class Band {
  constructor(name, geometry, detail, max, table, tableNode, clipNode, { castShadow }) {
    this.name = name; this.max = max;
    this.pose = attributeArray(max * STRIDE, "vec4");
    const poseRO = storage(this.pose.value, "vec4", this.pose.value.count).toReadOnly();
    this.params = attributeArray(max * 4, "vec4");
    this.fade = attributeArray(max, "vec4");
    const fadeRO = storage(this.fade.value, "vec4", this.fade.value.count).toReadOnly();
    const mat = createPersonMaterial(poseRO, detail);
    const f = vertexStage(fadeRO.element(instanceIndex));
    mat.maskNode = keepBand(f.x, f.y);
    mat.maskShadowNode = keepBand(f.z, f.w);
    this.mesh = new THREE.Mesh(geometry, mat);
    this.mesh.name = `People${name}`;
    this.mesh.frustumCulled = false; this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = castShadow; this.mesh.receiveShadow = true;
    this.mesh.count = 1;                                  // one degenerate person while the pipelines compile
    this.count = 0; this.live = 0; this.frames = 0;
    this.countU = uniform(0, "int");
    // the compute pass: one thread per (person, bone)
    const total = table.total, params = this.params, pose = this.pose;
    this.compute = Fn(() => {
      const i = int(instanceIndex);
      const person = i.div(BONES), bone = i.sub(person.mul(BONES));
      If(person.lessThan(this.countU), () => {
        const P0 = params.element(person.mul(4)), P1 = params.element(person.mul(4).add(1));
        const P2 = params.element(person.mul(4).add(2)), P3 = params.element(person.mul(4).add(3));
        If(P1.x.greaterThanEqual(0.0), () => {
          const sexBase = int(P2.y).mul(total);
          const slice = (code) => {
            const ci = clipNode.element(int(floor(code)));
            const frames = ci.y, f = fract(code).mul(frames), f0 = int(floor(f)), t = fract(f);
            const f1 = f0.add(1).mod(int(frames));
            const o0 = sexBase.add(int(ci.x)).add(f0).mul(BONES).add(bone).mul(2);
            const o1 = sexBase.add(int(ci.x)).add(f1).mul(BONES).add(bone).mul(2);
            return [nlerp(tableNode.element(o0), tableNode.element(o1), t), mix(tableNode.element(o0.add(1)), tableNode.element(o1.add(1)), t)];
          };
          const [qa, ta] = slice(P1.x), [qb, tb] = slice(P1.y);
          const q = nlerp(qa, qb, P1.z).toVar(), tl = mix(ta.xyz, tb.xyz, P1.z).toVar();
          // head glance (P3.x rad about the vertical through the head joint; 0 for every other bone)
          const look = select(bone.equal(2), P3.x, float(0));
          const hj = vec3(...BIND.head), pj = tl.add(qrot(q, hj));
          const q2 = qmul(yawQ(look), q).toVar();
          const t2 = pj.sub(qrot(q2, hj));
          const qy = yawQ(P0.w), S = P1.w;
          const base = person.mul(STRIDE).add(bone.mul(2));
          pose.element(base).assign(qmul(qy, q2));
          // per-foot ground: the left leg (bones 7-10) lifted by P3.y, the right (11-14) by P3.z, the thighs by half
          const lift = select(bone.greaterThanEqual(11), P3.z, select(bone.greaterThanEqual(7), P3.y, float(0)))
            .mul(select(bone.equal(7).or(bone.equal(11)), float(0.5), float(1)));
          pose.element(base.add(1)).assign(vec4(qrot(qy, t2.mul(S)).add(P0.xyz).add(vec3(0, lift, 0)), S));
          If(bone.equal(0), () => { pose.element(person.mul(STRIDE).add(STRIDE - 1)).assign(P2); });
        });
      });
    })().compute(max * BONES, [64]);
  }
}

export class Crowd {
  static async create(renderer, table, opts = {}) {
    const lod2 = await buildLod2(buildBody(0, table), opts.lod2);
    return new Crowd(renderer, table, lod2, opts);
  }
  constructor(renderer, table, lod2Geo, { max = 640 } = {}) {
    this.renderer = renderer; this.table = table;
    this.tableNode = attributeArray(table.data, "vec4").toReadOnly();
    this.clipNode = attributeArray(table.clipInfo, "vec4").toReadOnly();
    const g0 = buildBody(1, table), g1 = buildBody(0, table);
    this.tris = [g0, g1, lod2Geo].map((g) => g.index.count / 3);
    this.bands = [
      new Band("LOD0", g0, 1, Math.min(max, 160), table, this.tableNode, this.clipNode, { castShadow: true }),
      new Band("LOD1", g1, 0, Math.min(max, 320), table, this.tableNode, this.clipNode, { castShadow: true }),
      new Band("LOD2", lod2Geo, 0, max, table, this.tableNode, this.clipNode, { castShadow: false }),
    ];
    this.meshes = this.bands.map((b) => b.mesh);
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4();
    this.rigPool = []; this.rigs = new Set();
    // the vendored skeleton's bind joints per sex (PersonRig keeps them as .bind)
    this.bind = [new PersonRig({ female: false }).bind, new PersonRig({ female: true }).bind];
    this.frame = 0;
    this.stats = { drawn: 0, perBand: [0, 0, 0], live: 0, blending: 0, culled: 0, beyond: 0, cpuMs: 0, rigMs: 0 };
    this.mode = "banded";        // "banded" | "live-all" (every drawn person runs the live rig: Mr.doob's way, P0 baseline)
    this.ground = (x, z) => 0;
    this._tmp = new Float32Array(124); this._tmp2 = new Float32Array(124);
    this._sp = { sex: 0, clipA: 0, phaseA: 0, clipB: 0, phaseB: 0, w: 0, x: 0, y: 0, z: 0, yaw: 0, scale: 1, look: 0, seed: 0, girth: 1, hair: 0 };
    this._loco = { a: 0, b: 0, w: 0, stride: 1 };
    this._feet = new Float32Array(12);
  }

  // ------------------------------------------------------------------------------------- clip state per person
  /** Advance a person's clip slices from their motion this frame (distance walked, yaw turned, time): the
   *  locomotion phase moves by distance / stride, so a planted foot stays planted whatever the speed. */
  advance(p, dt) {
    const T = this.table, a = (p.anim ||= { loco: 0, idle: (p.seed * 7.31) % 1, turn: 0, codeA: 0, codeB: 0, w: 0, live: null, liveW: 0, liveTarget: 0 });
    const v = p.speed, S = p.scale;
    const fam = T.fam(p.family), famName = T.families[p.family] ? p.family : "base";
    T.loco(Math.max(v, 0.7), p.sex, this._loco, famName);
    const L = this._loco;
    a.loco = (a.loco + (v * dt) / (S * L.stride)) % 1;
    a.idle = (a.idle + dt / T.clips[fam.idle].cycleSeconds[p.sex]) % 1;
    const actClip = p.action != null ? T.byName[p.action] : undefined;
    if (actClip !== undefined) a.act = ((a.act || 0) + dt / T.clips[actClip].cycleSeconds[p.sex]) % 1;
    const turn = Math.abs(p.turnRate || 0);
    // slow (< 0.7 m/s): idle mixed with ONE second slice (walking off, or turning on the spot). The second slice changes
    // only once its weight has faded to ~0, and weights move at <= 3 / s: no clip switch ever jumps a pose
    const fast = v >= 0.7 && actClip === undefined && (a.wasFast || (a.slowB === "walk" && a.w > 0.95));
    if (!fast) {
      if (a.wasFast) { a.slowB = "walk"; a.w = 1; }          // (walk070, walk100, ~0) == (idle, walk070, 1)
      // an action (sit, talk: the UAL clips) only once standing at its spot; else walking off or turning on the spot
      const wantB = actClip !== undefined && v < 0.2 ? "act:" + actClip : turn > 0.25 && v < 0.3 ? (p.turnRate > 0 ? "turnL" : "turnR") : "walk";
      if (!a.slowB) a.slowB = wantB;
      let target;
      if (wantB !== a.slowB) { target = 0; if (a.w < 0.03) a.slowB = wantB; }
      else target = a.slowB === "walk" ? smooth(0.08, 0.7, v) : a.slowB.startsWith("act:") ? 1 : smooth(0.25, 0.7, turn);
      const rate = a.slowB.startsWith("act:") ? 1.6 : 3;               // sitting down / standing up over ~0.6 s
      a.w += Math.max(-rate * dt, Math.min(rate * dt, target - a.w));
      const fi = fam.idle;
      if (a.slowB.startsWith("act:")) {
        a.codeA = fi + a.idle * 0.9999; a.codeB = +a.slowB.slice(4) + (a.act || 0) * 0.9999;
      } else if (a.slowB !== "walk") {
        const tc = a.slowB === "turnL" ? T.turnL : T.turnR, tpc = Math.abs(T.clips[tc].turnPerCycle[p.sex]);
        a.turn = (a.turn + (turn * dt) / tpc) % 1;
        a.codeA = fi + a.idle * 0.9999; a.codeB = tc + a.turn * 0.9999;
      } else {
        a.codeA = fi + a.idle * 0.9999; a.codeB = fam.walks[0].i + a.loco * 0.9999;
      }
    } else {
      a.codeA = L.a + a.loco * 0.9999; a.codeB = L.b + a.loco * 0.9999; a.w = L.w;
    }
    a.wasFast = fast;
    return a;
  }

  /**
   * Where the baked person is drawn: the sim position plus an offset that PINS the planted foot (the bake's stance
   * flag of the dominant slice; the pivot is whichever of heel / ball moved less, as a rolling foot pivots on one):
   * whatever the body does (turning, side-stepping, mixing clips), a planted foot does not move. The offset is then
   * released toward the sim at <= 4 cm/s (orientation / stride warping in its cheapest form: the error becomes a slow
   * drift instead of a skate). Then the ground under EACH foot: the root sits between the two foot grounds and each
   * leg is lifted by its own (kerbs, slopes, the platform ramp).
   */
  place(p, dt) {
    const a = p.anim, T = this.table, s = this._sp, F = this._feet;
    if (p.dist > BANDS.lod12 + BANDS.lod12w && dt > 0) {
      // far band (7-30 px tall, 15 Hz): no pin, one ground sample; the offset left from the mid band fades out
      const r = Math.hypot(a.ox || 0, a.oz || 0), k = r > 1e-6 ? Math.max(0, r - 0.2 * dt) / r : 0;
      a.ox = (a.ox || 0) * k; a.oz = (a.oz || 0) * k; a.dx = p.x + a.ox; a.dz = p.z + a.oz; a.dyaw = p.yaw;
      a.dy = p.y; a.offL = a.offR = 0; a.gL = a.gR = undefined; a.fprev = null;
      return;
    }
    let ox = a.ox || 0, oz = a.oz || 0;
    s.sex = p.sex; s.clipA = Math.floor(a.codeA); s.phaseA = a.codeA % 1; s.clipB = Math.floor(a.codeB); s.phaseB = a.codeB % 1; s.w = a.w;
    s.x = p.x + ox; s.y = 0; s.z = p.z + oz; s.yaw = p.yaw; s.scale = p.scale;
    T.feet(s, F);
    const pc = a.w < 0.5 ? a.codeA : a.codeB, c = T.clips[Math.floor(pc)];
    const bits = c.plant[p.sex][Math.floor((pc % 1) * c.frames) % c.frames];
    const pl0 = bits & 1, pl1 = (bits >> 1) & 1;
    let n = 0, ex = 0, ez = 0;
    if (a.fprev && dt > 0 && dt < 0.25) {
      for (let k = 0; k < 2; k++) {
        if (!(k ? pl1 && a.fpl1 : pl0 && a.fpl0)) continue;
        const o = k * 6;
        const hx = a.fprev[o] - F[o], hz = a.fprev[o + 2] - F[o + 2], bx = a.fprev[o + 3] - F[o + 3], bz = a.fprev[o + 5] - F[o + 5];
        if (hx * hx + hz * hz < bx * bx + bz * bz) { ex += hx; ez += hz; } else { ex += bx; ez += bz; }
        n++;
      }
      if (n) { ox += ex / n; oz += ez / n; }
    }
    const r = Math.hypot(ox, oz);
    if (r > 1e-6) { const rel = (n ? Math.min(0.025, 0.12 * r) : 0.4) * dt + Math.max(0, r - 0.45); const k = Math.max(0, r - rel) / r; ox *= k; oz *= k; }
    const dxo = ox - (a.ox || 0), dzo = oz - (a.oz || 0);
    for (let k = 0; k < 12; k += 3) { F[k] += dxo; F[k + 2] += dzo; }
    a.ox = ox; a.oz = oz; a.dx = p.x + ox; a.dz = p.z + oz; a.dyaw = p.yaw;
    (a.fprev ||= new Float32Array(12)).set(F); a.fpl0 = pl0; a.fpl1 = pl1;
    // per-foot ground: planted feet take their ground at once (they do not move), swinging ones ease over 60 ms
    // a foot across a kerb edge rests on the higher side (heel or ball): it may float a little, it never sinks
    const gl = pl0 ? Math.max(this.ground(F[0], F[2]), this.ground(F[3], F[5])) : this.ground((F[0] + F[3]) * 0.5, (F[2] + F[5]) * 0.5);
    const gr = pl1 ? Math.max(this.ground(F[6], F[8]), this.ground(F[9], F[11])) : this.ground((F[6] + F[9]) * 0.5, (F[8] + F[11]) * 0.5);
    const e = Math.min(1, dt / 0.06);
    a.gL = a.gL === undefined || pl0 ? gl : a.gL + (gl - a.gL) * e;
    a.gR = a.gR === undefined || pl1 ? gr : a.gR + (gr - a.gR) * e;
    const root = (a.gL + a.gR) * 0.5;
    a.dy = a.dy === undefined ? root : a.dy + (root - a.dy) * Math.min(1, dt / 0.05);
    a.offL = Math.max(-0.25, Math.min(0.25, a.gL - a.dy)); a.offR = Math.max(-0.25, Math.min(0.25, a.gR - a.dy));
  }

  /** The person's baked pose on the CPU (the compute pass's maths): blends and meters. */
  bakedPose(p, out) {
    const a = p.anim, s = this._sp;
    s.sex = p.sex; s.clipA = Math.floor(a.codeA); s.phaseA = a.codeA % 1; s.clipB = Math.floor(a.codeB); s.phaseB = a.codeB % 1; s.w = a.w;
    s.x = a.dx ?? p.x; s.y = a.dy ?? p.y; s.z = a.dz ?? p.z; s.yaw = a.dyaw ?? p.yaw; s.offL = a.offL || 0; s.offR = a.offR || 0;
    s.scale = p.scale; s.look = p.look || 0; s.seed = p.seed; s.girth = p.girth; s.hair = p.hair + 2 * (p.style || 0);
    return this.table.samplePose(out, s);
  }

  _rig(p) {
    let r = this.rigPool.pop();
    if (!r) r = new PersonRig({});
    // re-dress a pooled rig for this person (the constructor's fields)
    Object.assign(r, { seed: p.seed, s: p.scale, female: p.sex, girth: p.girth, armSwing: p.armSwing ?? 1, stride: 1, bind: this.bind[p.sex], placed: false });
    r.time = p.seed * 7.3; r.leanAt = r.time + 3.5 * ((p.seed * 0.618) % 1); r.leanCount = 0; r.leanTarget = 0;
    r.pose.set([p.seed, p.sex, p.girth, p.hair + 2 * (p.style || 0)], 120);
    r.reset(p.anim?.dx ?? p.x, p.anim?.dz ?? p.z, p.yaw, this._groundFn);
    // start the rig at the bone table's phase: same gait maths (stride 1, as baked), so the two stay in step and the
    // hand-over blend mixes the same step
    if (p.anim) r.phase = p.anim.loco;
    this.rigs.add(r);
    return r;
  }
  _free(p) { const r = p.anim.live; if (!r) return; this.rigs.delete(r); this.rigPool.push(r); p.anim.live = null; p.anim.liveW = 0; }

  /**
   * Draw the people this frame. people: [{ x, y, z, yaw, speed, turnRate, sex, scale, seed, girth, hair, look, fade
   * (spawn fade 0..1), alive }], positions on the ground (y). camera: the view camera. Returns stats.
   */
  update(people, camera, dt) {
    const t0 = performance.now();
    this.frame++;
    const B = BANDS, bands = this.bands;
    this._groundFn ||= (owner, x, z) => this.ground(x, z);
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    const st = this.stats; st.perBand[0] = st.perBand[1] = st.perBand[2] = 0; st.culled = 0; st.beyond = 0; st.blending = 0; st.drawn = 0;
    for (const b of bands) { b.count = 0; b.live = 0; }
    const allLive = this.mode === "live-all";

    // 1. distances, culling, who is live (nearest first)
    const cand = this._cand || (this._cand = []); cand.length = 0;
    for (const p of people) {
      if (!p.alive) { if (p.anim?.live) this._free(p); continue; }
      if (p.anim && p.anim.gen !== p.gen) { if (p.anim.live) this._free(p); p.anim = null; }     // re-placed: fresh state
      if (!p.anim) { this.advance(p, 0); p.anim.gen = p.gen; this.place(p, 0); }
      { const dx = p.x - cx, dy = p.y + 0.9 - cy, dz = p.z - cz; p.dist = Math.sqrt(dx * dx + dy * dy + dz * dz); }
      // far band (past the LOD1 -> LOD2 fade): clip state and drawn position step at 1 / farRate of the frame rate
      // (15 Hz at 60 fps), in farRate groups
      // (the drawn placement, place(), only for people drawn: a culled one restarts its pin when seen again)
      let d2 = -1;
      // (the LOD1 band, 38-64 m, steps at 30 Hz the same way: half the plant-pin work)
      const rate = p.dist > B.lod12 + B.lod12w ? B.farRate : p.dist > B.lod01 + B.lod01w ? 2 : 1;
      if (rate > 1 && !p.anim.live && (p.id + this.frame) % rate) { p.anim.pend = (p.anim.pend || 0) + dt; }
      else { d2 = dt + (p.anim.pend || 0); this.advance(p, d2); p.anim.pend = 0; }
      if (p.dist > B.end) { p.drawn = false; st.beyond++; p.anim.fprev = null; if (p.anim.live) this._free(p); continue; }
      _sph.center.set(p.x, p.y + 0.9 * p.scale, p.z); _sph.radius = 1.1 * p.scale;
      p.inView = this.frustum.intersectsSphere(_sph);
      p.drawn = p.inView || p.dist < B.shadow + B.shadoww;     // shadow casters behind the camera too
      if (!p.drawn) { st.culled++; p.anim.fprev = null; if (p.anim.live && !allLive) this._free(p); continue; }
      if (d2 >= 0 && !(p.anim.live && p.anim.liveW >= 1)) this.place(p, d2);
      else if (d2 >= 0) { const a = p.anim; a.dx = p.x + (a.ox || 0); a.dz = p.z + (a.oz || 0); a.dyaw = p.yaw; a.fprev = null; }
      cand.push(p);
    }
    const tr = performance.now();
    if (allLive) {
      for (const p of cand) {
        const a = p.anim;
        if (!a.live) a.live = this._rig(p);
        a.liveW = 1; a.liveTarget = 1;
        a.live.update(dt, p.anim.dx ?? p.x, p.anim.dz ?? p.z, p.yaw, this._groundFn, null, 0, true, p.diveTime >= 0 ? p.diveTime : -1);
        if (p.look) headGlance(a.live.pose, p.look);
      }
    } else {
      // only the near ones (warm range, or still holding a rig) compete for the live rigs: sort just those
      const near = this._near || (this._near = []); near.length = 0;
      for (const p of cand) if (p.dist < B.liveWarm || p.anim.live) near.push(p);
      near.sort((a, b) => a.dist - b.dist);
      let nLive = 0;
      for (const p of near) {
        const a = p.anim;
        // (no live rig while sitting / talking: those are UAL clips, table only)
        const diving = p.diveTime >= 0 && p.dist < B.liveWarm;
        const want = diving || p.action == null && nLive < B.maxLive && (p.dist < B.live || (a.liveTarget === 1 && p.dist < B.liveOut));
        const warm = p.action == null && nLive < B.maxLive && p.dist < B.liveWarm;
        if (want || warm || a.liveW > 0) nLive++;
        if ((want || warm) && !a.live) { a.live = this._rig(p); a.warm = 0; }
        if (!a.live) continue;
        a.warm = (a.warm || 0) + dt;
        a.live.update(dt, p.anim.dx ?? p.x, p.anim.dz ?? p.z, p.yaw, this._groundFn, null, 0, true, p.diveTime >= 0 ? p.diveTime : -1);
        if (p.look) headGlance(a.live.pose, p.look);
        // hand-over: in, after the rig has walked 0.8 s (pre-warmed out to 23 m); the table's phase is pulled toward
        // the rig's meanwhile so both show the same step when they blend
        const goIn = want && (a.warm > 0.8 || diving);
        if (goIn && a.liveTarget === 0) a.liveTarget = 1;
        if (!want && a.liveTarget === 1) { a.liveTarget = 0; a.loco = a.live.phase; }       // out: the table takes over at the rig's phase
        if (a.liveTarget === 0 && a.liveW === 0 && p.speed > 0.3) {
          let d = a.live.phase - a.loco; d -= Math.round(d);
          a.loco = (a.loco + Math.max(-0.05 * dt, Math.min(0.05 * dt, d)) + 1) % 1;
        }
        a.liveW = Math.max(0, Math.min(1, a.liveW + (a.liveTarget ? dt : -dt) / B.blend));
        if (a.liveW === 0 && !want && !warm) this._free(p);
      }
    }
    st.rigMs = performance.now() - tr;

    // 2. bands and fades, buffers
    for (const p of cand) {
      const d = p.dist, a = p.anim, sp = p.fade ?? 1;     // sp: spawn / despawn fade (dithered, 0..1)
      const t01 = smooth(B.lod01 - B.lod01w, B.lod01 + B.lod01w, d);
      const t12 = smooth(B.lod12 - B.lod12w, B.lod12 + B.lod12w, d);
      const tEnd = smooth(B.end - B.endw, B.end, d);
      const shadowKeep = 1 - smooth(B.shadow - B.shadoww, B.shadow + B.shadoww, d);
      const vis = sp * (1 - tEnd);                    // share of the person's pixels drawn at all
      // the person's pixels [0, vis) split between the LODs: LOD0 [0, a0), LOD1 [a0, a1), LOD2 [a1, vis)
      const a0 = Math.min(vis, 1 - t01), a1 = Math.min(vis, Math.max(a0, 1 - t12));
      const R = this._ranges || (this._ranges = new Float32Array(4));
      R[0] = 0; R[1] = a0; R[2] = a1; R[3] = vis;
      const live = a.live && a.liveW > 0;
      let pose = null;
      if (live) {
        if (a.liveW >= 1) pose = a.live.pose;
        else { pose = blendPose(a.drawnPose ||= new Float32Array(124), this.bakedPose(p, this._tmp), a.live.pose, smooth(0, 1, a.liveW)); st.blending++; }
        if (pose === a.live.pose) (a.drawnPose ||= new Float32Array(124)).set(pose);
        st.live++;
      }
      const mix = p.lodMix || (p.lodMix = [0, 0, 0]);
      for (let k = 0; k < 3; k++) mix[k] = Math.max(0, R[k + 1] - R[k]);
      p.shadowMix = shadowKeep * vis;
      let drew = false;
      for (let k = 0; k < 3; k++) {
        const lo = R[k], hi = R[k + 1];
        if (hi - lo <= 1e-4) continue;
        const b = bands[k];
        if (b.count >= b.max) continue;
        drew = true; st.perBand[k]++;
        // live people first: their slots hold the CPU pose (the compute pass skips them)
        let slot;
        if (live) {
          if (b.live < b.count) this._moveSlot(b, b.live, b.count);          // make room at the front
          slot = b.live++; b.count++;
          b.pose.value.array.set(pose, slot * STRIDE * 4);
        } else slot = b.count++;
        const P = b.params.value.array, o = slot * 16;
        P[o] = a.dx; P[o + 1] = a.dy; P[o + 2] = a.dz; P[o + 3] = a.dyaw;
        P[o + 4] = live ? -1 : a.codeA; P[o + 5] = a.codeB; P[o + 6] = a.w; P[o + 7] = p.scale;
        P[o + 8] = p.seed; P[o + 9] = p.sex; P[o + 10] = p.girth; P[o + 11] = p.hair + 2 * (p.style || 0);
        P[o + 12] = p.look || 0; P[o + 13] = a.offL || 0; P[o + 14] = a.offR || 0; P[o + 15] = 0;
        const F = b.fade.value.array, of = slot * 4;
        F[of] = lo; F[of + 1] = hi;
        // shadow: the same pixel split, cut at the shadow fade
        F[of + 2] = lo; F[of + 3] = Math.max(lo, Math.min(hi, shadowKeep * vis));
      }
      if (drew) st.drawn++;
    }
    st.live = 0; for (const p of cand) if (p.anim.live && p.anim.liveW > 0) st.live++;

    // 3. upload + compute
    for (const b of bands) {
      b.frames++;
      const warm = b.frames <= 3;
      if (b.count === 0 && !warm) { b.mesh.visible = false; b.mesh.count = 0; continue; }
      b.mesh.visible = true;
      b.mesh.count = Math.max(b.count, warm ? 1 : 0);
      const n = Math.max(b.count, 1);
      up(b.params.value, n * 16); up(b.fade.value, n * 4);
      if (b.live) up(b.pose.value, b.live * STRIDE * 4);
      b.countU.value = b.count;
    }
    st.cpuMs = performance.now() - t0;
    for (const b of bands) if (b.mesh.visible && b.count > b.live) this.renderer.compute(b.compute);
    return st;
  }
  _moveSlot(b, from, to) {
    // move the person at slot `from` to slot `to` (params, fade, and the pose for live slots)
    const P = b.params.value.array, F = b.fade.value.array, Q = b.pose.value.array;
    P.copyWithin(to * 16, from * 16, from * 16 + 16);
    F.copyWithin(to * 4, from * 4, from * 4 + 4);
    Q.copyWithin(to * STRIDE * 4, from * STRIDE * 4, (from + 1) * STRIDE * 4);
  }
}
const _sph = new THREE.Sphere();
function up(attr, n) { attr.clearUpdateRanges(); attr.addUpdateRange(0, n); attr.needsUpdate = true; }

/** Turn the head of a world pose by `angle` (rad) about the vertical through its joint (a glance left / right). */
const _g = [0, 0, 0];
export function headGlance(pose, angle) {
  const o = 2 * 8, s = pose[o + 7], hj = BIND.head;
  let qx = pose[o], qy = pose[o + 1], qz = pose[o + 2], qw = pose[o + 3];
  rot(qx, qy, qz, qw, hj[0] * s, hj[1] * s, hj[2] * s, _g);
  const px = pose[o + 4] + _g[0], py = pose[o + 5] + _g[1], pz = pose[o + 6] + _g[2];
  const ly = Math.sin(angle * 0.5), lw = Math.cos(angle * 0.5);
  const nx = lw * qx + ly * qz, ny = lw * qy + ly * qw, nz = lw * qz - ly * qx, nw = lw * qw - ly * qy;
  rot(nx, ny, nz, nw, hj[0] * s, hj[1] * s, hj[2] * s, _g);
  pose[o] = nx; pose[o + 1] = ny; pose[o + 2] = nz; pose[o + 3] = nw;
  pose[o + 4] = px - _g[0]; pose[o + 5] = py - _g[1]; pose[o + 6] = pz - _g[2];
}
