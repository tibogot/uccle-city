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
    this.slide = { live: [], mid: [], far: [] };
    this.gap = { live: [], mid: [], far: [] };
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
    const c = this.crowd, T = c.table;
    // (a) coverage pops on every drawn / in-view person (cheap)
    for (const p of people) {
      let s = this.state.get(p.id);
      if (!s) this.state.set(p.id, (s = { cov: -1, sh: -1, j: null, j1: null, alive: p.alive, inView: false }));
      const cov = p.alive && p.dist <= 250 && p.drawn ? (p.lodMix ? p.lodMix[0] + p.lodMix[1] + p.lodMix[2] : 0) : 0;
      const sh = p.alive && p.drawn ? p.shadowMix ?? 0 : 0;
      const seen = p.alive && p.inView;
      if (s.cov >= 0 && (seen || s.inView) && Math.abs(cov - s.cov) > 0.2) { this.pops.coverage++; this._ev("coverage", p, s.cov, cov); }
      if (s.sh >= 0 && (seen || s.inView) && Math.abs(sh - s.sh) > 0.2 && p.dist < 60) { this.pops.shadow++; this._ev("shadow", p, s.sh, sh); }
      s.cov = cov; s.sh = sh; s.inView = seen;
    }
    // (b) poses: round-robin a budget of drawn people
    const drawn = people.filter((p) => p.alive && p.drawn && p.anim && p.dist <= 250);
    const n = Math.min(this.budget, drawn.length);
    const k60 = (1 / 60 / dt) ** 2;
    for (let i = 0; i < n; i++) {
      const p = drawn[(this.cursor + i) % drawn.length];
      const s = this.state.get(p.id), a = p.anim;
      const live = a.live && a.liveW >= 1;
      const pose = live ? a.live.pose : c.bakedPose(p, this._pose);
      const band = live ? "live" : this.band(p.dist);
      const feet = [[BONE.FOOT_L, BIND.footL], [BONE.FOOT_R, BIND.footR]];
      const now = feet.map(([b, bj]) => jointOf(pose, b, bj, [0, 0, 0]));
      const head = jointOf(pose, BONE.HEAD, BIND.head, [0, 0, 0]);
      const planted = feet.map((_, f) => (live ? !a.live.feet[f].swing : T.planted(Math.floor(a.w < 0.5 ? a.codeA : a.codeB), (a.w < 0.5 ? a.codeA : a.codeB) % 1, p.sex, f) === 1));
      // the sampled person must have been sampled the frame before (round-robin: only when budget covers everyone)
      const fresh = s.frame === this.frames - 1;
      for (let f = 0; f < 2; f++) {
        if (fresh && planted[f] && s.planted?.[f]) {
          const v = Math.hypot(now[f][0] - s.j[f][0], now[f][2] - s.j[f][2]) / dt;
          this.slide[band].push(v);
          if (v > 0.15) this.worst.push({ id: p.id, v: +v.toFixed(3), band, d: +p.dist.toFixed(1), speed: +p.speed.toFixed(2), x: +p.x.toFixed(1), z: +p.z.toFixed(1) });
        }
        if (planted[f]) {
          // sole: the lowest of the heel and the ball of the foot (foot space offsets x height)
          const o = (f ? BONE.FOOT_R : BONE.FOOT_L) * 8, S = pose[o + 7];
          rot(pose[o], pose[o + 1], pose[o + 2], pose[o + 3], 0, -ANKLE_H * S, -0.07 * S, this._j);
          rot(pose[o], pose[o + 1], pose[o + 2], pose[o + 3], 0, (0.02 - ANKLE_H) * S, 0.135 * S, this._k);
          const hy = now[f][1] + this._j[1], by = now[f][1] + this._k[1];
          const gx = now[f][0], gz = now[f][2];
          this.gap[band].push(Math.min(hy - this.ground(gx + this._j[0], gz + this._j[2]), by - this.ground(gx + this._k[0], gz + this._k[2])));
        }
      }
      // pose snaps: second difference of the feet and head (per 60 Hz frame), on top of the body's own motion
      const pts = [now[0], now[1], head];
      if (fresh && s.j1 && s.frame1 === this.frames - 2) {
        for (let q = 0; q < 3; q++) {
          const prev = q < 2 ? s.j[q] : s.h, prev2 = q < 2 ? s.j1[q] : s.h1;
          const ax = pts[q][0] - 2 * prev[0] + prev2[0], ay = pts[q][1] - 2 * prev[1] + prev2[1], az = pts[q][2] - 2 * prev[2] + prev2[2];
          const jerk = Math.hypot(ax, ay, az) * k60;
          if (jerk > 0.05) { this.pops.pose++; this._ev("pose", p, jerk, band); break; }
        }
      }
      s.j1 = s.j; s.h1 = s.h; s.frame1 = s.frame;
      s.j = now; s.h = head; s.planted = planted; s.frame = this.frames;
    }
    // the sampled window holds for 30 frames (speeds and second differences need consecutive frames), then moves on
    if (this.frames % 30 === 0) this.cursor = (this.cursor + n) % Math.max(1, drawn.length);
  }
  _ev(kind, p, a, b) { if (this.pops.events.length < 200) this.pops.events.push({ kind, id: p.id, d: +p.dist.toFixed(1), a: +(+a).toFixed(3), b: typeof b === "number" ? +b.toFixed(3) : b, t: this.frames }); }

  summary() {
    const out = { frames: this.frames, slide: {}, gap: {}, pops: { coverage: this.pops.coverage, shadow: this.pops.shadow, pose: this.pops.pose } };
    for (const b of ["live", "mid", "far"]) {
      const s = [...this.slide[b]].sort((x, y) => x - y), g = [...this.gap[b]].sort((x, y) => x - y);
      out.slide[b] = { n: s.length, p50: +pct(s, 0.5).toFixed(4), p95: +pct(s, 0.95).toFixed(4), max: +(s[s.length - 1] ?? 0).toFixed(3) };
      out.gap[b] = { n: g.length, p05: +pct(g, 0.05).toFixed(4), p50: +pct(g, 0.5).toFixed(4), p95: +pct(g, 0.95).toFixed(4), min: +(g[0] ?? 0).toFixed(3), max: +(g[g.length - 1] ?? 0).toFixed(3) };
    }
    out.worst = [...this.worst].sort((a, b) => b.v - a.v).slice(0, 8);
    return out;
  }
}
