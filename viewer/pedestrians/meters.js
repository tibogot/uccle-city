// The Pedestrian Lab's meters (docs/PEDESTRIANS.md "Meters"), on the poses the crowd actually draws (the live rig's
// CPU pose, or the bone table sampled on the CPU with the compute pass's maths):
//   foot slide  world speed of a PLANTED foot (ankle joint, horizontal), m/s, per band (live / mid / far): p50 p95 max;
//               planted = the live rig's stance flag, or the bake's per-frame stance flag (both frames planted);
//   ground gap  planted sole vs the measured ground: the lowest of heel / ball points minus ground(x, z) (+ floats,
//               - sinks), per band;
//   pops        (a) a person's drawn share (sum of its LOD bands' pixel shares) or its shadow share jumping by > 0.2 in
//               one frame while in view (an unfaded appear / vanish / LOD or shadow switch); (b) a joint's second
//               difference (per 60 Hz frame) > 5 cm (a pose snap: a hand-over or clip switch gone wrong);
//   spawns      spawned / removed in view without a fade (the sim's counters).
// Cost: only while on; they sample at most `budget` people a frame round-robin (the crowd's CPU numbers are taken
// with the meters off).
import { BONE, BIND, ANKLE_H, jointOf, rot } from "./boneTable.js";

const pct = (a, q) => (a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0);
export class Meters {
  constructor(crowd, ground) {
    this.crowd = crowd; this.ground = ground; this.on = false; this.budget = 80;
    this.reset();
    this._pose = new Float32Array(124);
    this._j = [0, 0, 0]; this._k = [0, 0, 0];
  }
  reset() {
    this.slide = { live: [], handover: [], mid: [], far: [] };
    this.gap = { live: [], handover: [], mid: [], far: [] };
    this.pops = { coverage: 0, shadow: 0, pose: 0, events: [] };
    this.worst = [];
    this.frames = 0; this.cursor = 0; this.movingFrames = 0;
    this.state = new Map();
  }
  band(d) { return d < 18 ? "live" : d < 60 ? "mid" : "far"; }

  /** After crowd.update: people as given to it; dt the frame's dt; cameraMoving: count pops only while moving too. */
  sample(people, dt, cameraMoving = true) {
    if (!this.on || dt <= 0) return;
    this.frames++; if (cameraMoving) this.movingFrames++;
    this.clock = (this.clock || 0) + dt;
    const c = this.crowd, T = c.table;
    // (a) coverage pops on every drawn / in-view person (cheap)
    for (const p of people) {
      let s = this.state.get(p.id);
      if (!s) this.state.set(p.id, (s = { cov: -1, sh: -1, j: null, j1: null, alive: p.alive, inView: false }));
      const cov = p.alive && p.dist <= 250 && p.drawn ? (p.lodMix ? p.lodMix[0] + p.lodMix[1] + p.lodMix[2] : 0) : 0;
      const sh = p.alive && p.drawn ? p.shadowMix ?? 0 : 0;
      const seen = p.alive && p.inView;
      if (!p.alive || (s.cgen !== undefined && s.cgen !== p.gen)) { s.respawned = true;  if (s.cgen !== p.gen && s.cgen !== undefined) { s.cov = -1; s.sh = -1; } }
      s.cgen = p.gen;
      if (s.cov >= 0 && seen && s.inView && p.alive && Math.abs(cov - s.cov) / (60 * dt) > 0.2) { this.pops.coverage++; this._ev("coverage", p, s.cov, cov); }
      if (s.sh >= 0 && seen && s.inView && p.alive && Math.abs(sh - s.sh) / (60 * dt) > 0.2 && p.dist < 60) { this.pops.shadow++; this._ev("shadow", p, s.sh, sh); }
      s.cov = cov; s.sh = sh; s.inView = seen;
    }
    // (b) poses: round-robin a budget of drawn people
    const drawn = people.filter((p) => p.alive && p.drawn && p.anim && p.dist <= 250);
    const n = Math.min(this.budget, drawn.length);
    for (let i = 0; i < n; i++) {
      const p = drawn[(this.cursor + i) % drawn.length];
      const s = this.state.get(p.id), a = p.anim;
      // far people step at 15 Hz (their pose is held in between): sample them when they step, over the time since
      if (a.pend > 0) continue;
      // the pose the crowd DREW this frame: the live rig's, the live <-> baked blend, or the bone table's
      const live = a.live && a.liveW > 0;
      const pose = live ? (a.drawnPose || a.live.pose) : c.bakedPose(p, this._pose);
      const band = a.live && a.liveW >= 1 ? "live" : a.live && a.liveW > 0 ? "handover" : this.band(p.dist);
      const feet = [[BONE.FOOT_L, BIND.footL], [BONE.FOOT_R, BIND.footR]];
      const ank = feet.map(([b, bj]) => jointOf(pose, b, bj, [0, 0, 0]));
      const head = jointOf(pose, BONE.HEAD, BIND.head, [0, 0, 0]);
      // sole points: heel and ball of each foot (a rolling foot pivots on one of them: that one must not move)
      const sole = ank.map((j, f) => {
        const o = (f ? BONE.FOOT_R : BONE.FOOT_L) * 8, S = pose[o + 7];
        const h = rot(pose[o], pose[o + 1], pose[o + 2], pose[o + 3], 0, -ANKLE_H * S, -0.07 * S, [0, 0, 0]);
        const b = rot(pose[o], pose[o + 1], pose[o + 2], pose[o + 3], 0, -ANKLE_H * S, 0.135 * S, [0, 0, 0]);
        return [[j[0] + h[0], j[1] + h[1], j[2] + h[2]], [j[0] + b[0], j[1] + b[1], j[2] + b[2]]];
      });
      const pc = a.w < 0.5 ? a.codeA : a.codeB;
      const planted = [0, 1].map((f) => (a.live && a.liveW >= 1 ? !a.live.feet[f].swing : T.planted(Math.floor(pc), pc % 1, p.sex, f) === 1));
      const fresh = this.frames - s.frame <= 4 && p.gen === s.gen && !s.respawned;
      const dts = Math.max(1e-4, this.clock - (s.t ?? this.clock - dt));
      for (let f = 0; f < 2; f++) {
        if (fresh && planted[f] && s.planted?.[f]) {
          const v = Math.min(...[0, 1].map((k) => Math.hypot(sole[f][k][0] - s.sole[f][k][0], sole[f][k][2] - s.sole[f][k][2]))) / dts;
          this.slide[band].push(v);
          if (v > 0.15) this.worst.push({ id: p.id, v: +v.toFixed(3), band, d: +p.dist.toFixed(1), speed: +p.speed.toFixed(2), w: +a.w.toFixed(2), clip: Math.floor(a.codeA) + "/" + Math.floor(a.codeB), x: +p.x.toFixed(1), z: +p.z.toFixed(1) });
        }
        if (planted[f]) {
          const [h, b] = sole[f];
          this.gap[band].push(Math.min(h[1] - this.ground(h[0], h[2]), b[1] - this.ground(b[0], b[2])));
        }
      }
      // pose snaps: change of velocity of the ankles and the head between consecutive frames (dt-aware), expressed per
      // 60 Hz frame; > 5 cm: a snap
      const pts = [ank[0], ank[1], head];
      if (fresh && s.v) {
        const vel = pts.map((q, k) => [0, 1, 2].map((c2) => (q[c2] - s.pts[k][c2]) / dts));
        if (this.frames - s.velFrame <= 4) {
          for (let q = 0; q < 3; q++) {
            const jerk = Math.hypot(vel[q][0] - s.v[q][0], vel[q][1] - s.v[q][1], vel[q][2] - s.v[q][2]) / 60;
            if (jerk > 0.05 && this.frames > 10 && p.dist < 64) { this.pops.pose++; this._ev("pose", p, jerk, band); break; }
          }
        }
        s.v = vel; s.velFrame = this.frames;
      } else if (fresh) { s.v = pts.map((q, k) => [0, 1, 2].map((c2) => (q[c2] - s.pts[k][c2]) / dts)); s.velFrame = this.frames; }
      s.pts = pts; s.sole = sole; s.planted = planted; s.frame = this.frames; s.t = this.clock; s.gen = p.gen; s.respawned = false;
    }
    // the sampled window holds for 30 frames (speeds and second differences need consecutive frames), then moves on
    if (this.frames % 30 === 0) this.cursor = (this.cursor + n) % Math.max(1, drawn.length);
  }
  _ev(kind, p, a, b) { if (this.pops.events.length < 200) this.pops.events.push({ kind, id: p.id, d: +p.dist.toFixed(1), a: +(+a).toFixed(3), b: typeof b === "number" ? +b.toFixed(3) : b, t: this.frames }); }

  summary() {
    const out = { frames: this.frames, slide: {}, gap: {}, pops: { coverage: this.pops.coverage, shadow: this.pops.shadow, pose: this.pops.pose } };
    for (const b of ["live", "handover", "mid", "far"]) {
      const s = [...this.slide[b]].sort((x, y) => x - y), g = [...this.gap[b]].sort((x, y) => x - y);
      out.slide[b] = { n: s.length, p50: +pct(s, 0.5).toFixed(4), p95: +pct(s, 0.95).toFixed(4), max: +(s[s.length - 1] ?? 0).toFixed(3) };
      out.gap[b] = { n: g.length, p05: +pct(g, 0.05).toFixed(4), p50: +pct(g, 0.5).toFixed(4), p95: +pct(g, 0.95).toFixed(4), min: +(g[0] ?? 0).toFixed(3), max: +(g[g.length - 1] ?? 0).toFixed(3) };
    }
    out.worst = [...this.worst].sort((a, b) => b.v - a.v).slice(0, 8);
    return out;
  }
}
