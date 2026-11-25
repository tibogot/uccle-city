// THE SKY FLOCKS AS PREY (docs/FALCON_GAME.md "The catch"): the GPU flocks of viewer/birds/skyFlocks.js live only on the
// GPU; the falcon's strike (viewer/falconFlight/falconGame.js) needs positions and velocities on the CPU. This adapter
// reads the bird buffer back (one reusable THREE.ReadbackBuffer: no allocation per read) a few times a second while the
// falcon is near a catchable flock (starlings, the murmuration, ring-necked parakeets, jackdaws), extrapolates each bird
// between reads (pos + vel x age: the read is 1-3 frames old) and exposes the pigeons.js prey interface the strike uses:
//   state[i] (1 flying, 3 gone), target(fx, fy, fz, dx, dy, dz, maxD, cone), pos(i, out), vel(i, out), take(i)
// take(i) sets the GPU DEAD FLAG (skyFlocks.kill: the bird flies on with its flock, never drawn again this epoch).
// Cost: nothing while no catchable flock is within 450 m of the falcon; else a 169 KB read every 220 ms (every 90 ms
// within 80 m of a bird), a copy of the slots in use (~0.1-0.3 ms), target() over <= 3.5k birds when the strike asks.
import { ReadbackBuffer } from "three/webgpu";
import { SLOTS, TOTAL } from "../birds/skyFlocks.js";

// (falcon fun round 3: EVERY sky bird the falcon meets is prey: the gulls high over the city and the sky pigeons
// (cityBirds.js birds2, a party left over from before the flight came on flies off for up to 40 s) were drawn and
// never targetable: "I cross some birds in the sky and those were not targetable, that's nonsense")
const KIND = { murmuration: "starling", starlings: "starling", parakeets: "ring-necked parakeet", jackdaws: "jackdaw", jackdaws2: "jackdaw", gulls: "gull", pigeons: "feral pigeon" };
const FLY = 1, GONE = 3;
const FUN_OLD = typeof location !== "undefined" && /[?&]falconfun=old(&|$)/.test(location.search);
/** the prey slots: ?falconfun=old as before (no gulls, no sky pigeons) */
export const PREY_KEYS = Object.keys(KIND).filter((k) => !FUN_OLD || (k !== "gulls" && k !== "pigeons"));

export class GpuPrey {
  /** birds: viewer/birds/cityBirds.js (its .sky); keys: the slots that are prey */
  constructor(birds, keys = PREY_KEYS) {
    this.birds = birds;
    this.slots = keys.map((k) => SLOTS.findIndex((s) => s.key === k)).filter((k) => k >= 0);
    this.p = new Float32Array(TOTAL * 3); this.v = new Float32Array(TOTAL * 3);
    this.state = new Uint8Array(TOTAL).fill(GONE);
    this.slotOf = new Uint8Array(TOTAL);
    this.killed = new Float32Array(TOTAL).fill(-1);       // the epoch a bird was caught in (the read-back may still be older)
    this.rb = null; this.pending = false; this.readT = 0; this.nextT = 0; this.cleared = true;
    this.closeD = Infinity; this.near = null;               // the nearest prey slot's target distance (m), its key
    this.stats = { reads: 0, readMs: 0, copyMs: 0, alive: 0 };
    this.enabled = true;
  }
  get sky() { return this.birds?.sky ?? null; }
  slotKey(i) { return SLOTS[this.slotOf[i]].key; }
  kind(i) { return KIND[this.slotKey(i)] || "bird"; }

  /** per frame (cheap): decide whether to read back; f = the falcon's position */
  update(now, fx, fy, fz) {
    const sky = this.sky;
    if (!this.enabled || !sky) return this.clear();
    // the nearest prey flock (its target point: the flock is within ~100 m of it)
    let best = Infinity, key = null;
    for (const k of this.slots) {
      if (!sky.slotOn(k)) continue;
      const r = sky.row(k, 0), d = Math.hypot(r.x - fx, r.y - fy, r.z - fz);
      if (d < best) { best = d; key = SLOTS[k].key; }
    }
    this.near = key; this.flockD = best;
    if (best > 450) return this.clear();
    this.cleared = false;
    if (!this.pending && now >= this.nextT) this.read(now);
  }
  clear() { if (!this.cleared) { this.state.fill(GONE); this.cleared = true; this.stats.alive = 0; } }

  async read(now) {
    const sky = this.sky, R = sky.renderer;
    this.pending = true;
    this.rb ??= new ReadbackBuffer(TOTAL * 48);
    const t0 = performance.now();
    try {
      await R.getArrayBufferAsync(sky.data.value, this.rb, 0, TOTAL * 48);
      const t1 = performance.now();
      this.copy(new Float32Array(this.rb.buffer));
      this.rb.release();
      this.readT = t0 + 8;                                   // (the copy was queued after this frame's compute: ~half a frame later)
      this.stats.reads++; this.stats.readMs = t1 - t0; this.stats.copyMs = performance.now() - t1;
    } catch (e) { try { this.rb.release(); } catch {} this.enabled = false; console.warn("gpuPrey: read-back off:", e.message); }
    this.pending = false;
    this.nextT = now + (this.closeD < 80 ? 90 : 220);
  }

  copy(f) {
    const sky = this.sky, P = this.p, V = this.v, S = this.state;
    S.fill(GONE);
    let alive = 0;
    for (const k of this.slots) {
      if (!sky.slotOn(k)) continue;
      const s = SLOTS[k], ep = sky.row(k, 2).w, n = Math.min(s.cap, sky.row(k, 3).y | 0);
      for (let i = s.start; i < s.start + n; i++) {
        const o = i * 12;
        if (f[o + 11] !== ep || this.killed[i] === ep) continue;
        P[i * 3] = f[o]; P[i * 3 + 1] = f[o + 1]; P[i * 3 + 2] = f[o + 2];
        V[i * 3] = f[o + 4]; V[i * 3 + 1] = f[o + 5]; V[i * 3 + 2] = f[o + 6];
        S[i] = FLY; this.slotOf[i] = k; alive++;
      }
    }
    this.stats.alive = alive;
  }

  age() { return Math.min(0.5, Math.max(0, (performance.now() - this.readT) / 1000)); }
  pos(i, out) { const a = this.age(), o = i * 3; out.x = this.p[o] + this.v[o] * a; out.y = this.p[o + 1] + this.v[o + 1] * a; out.z = this.p[o + 2] + this.v[o + 2] * a; return out; }
  vel(i, out) { const o = i * 3; out.x = this.v[o]; out.y = this.v[o + 1]; out.z = this.v[o + 2]; return out; }

  /** the best bird ahead of the falcon (pigeons.js target): returns [index, score] through this.best */
  target(fx, fy, fz, dx, dy, dz, maxD = 160, cone = 0.5, byAngle = false) {
    let best = -1, bs = Infinity, cd = Infinity;
    if (this.cleared) { this.bestScore = Infinity; return -1; }
    const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const cc = Math.cos(cone), a = this.age(), P = this.p, V = this.v;
    for (let i = 0; i < TOTAL; i++) {
      if (this.state[i] !== FLY) continue;
      const o = i * 3, ex = P[o] + V[o] * a - fx, ey = P[o + 1] + V[o + 1] * a - fy, ez = P[o + 2] + V[o + 2] * a - fz, d = Math.hypot(ex, ey, ez);
      if (d < cd) cd = d;
      if (d > maxD || d < 0.01) continue;
      const c = (ex * dx + ey * dy + ez * dz) / d;
      if (c < cc) continue;
      // (byAngle: the falcon fun lock-on, the score of pigeons.js target: nearest the view centre, a bird well above last)
      const score = byAngle ? (1 - c) * 400 + d * 0.25 + Math.max(0, ey - 6) * 4 : d * (2 - c);
      if (score < bs) { bs = score; best = i; }
    }
    this.closeD = cd;
    this.bestScore = bs;
    return best;
  }

  take(i) {
    const out = this.pos(i, {});
    const k = this.slotOf[i];
    this.killed[i] = this.sky.row(k, 2).w;
    this.state[i] = GONE;
    this.sky.kill(i);
    return out;
  }
}
