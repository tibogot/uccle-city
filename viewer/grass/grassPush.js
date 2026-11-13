// THE PUSH FIELD (docs/GRASS.md "Push"): what lays the grass down, and lets it stand back up. A 64 m square around the
// camera, 25 cm cells, kept in ONE toroidal storage buffer (a world cell always uses the same slot: nothing is copied
// when the camera moves; each slot keeps the world cell it holds as a tag, a stale slot reads as untouched).
// Per frame one compute pass: every cell recovers (amount x exp(-dt / recover)), then the pushers stamp into it
// (amount = max(amount, k), direction = away from the pusher's centre, turned toward its motion).
//
// API (the city: the car's wheels, the walker's feet, the falcon landing):
//   grass.push.set(i, { x, y, z, radius, strength = 1, vx = 0, vz = 0 })   pusher i (0..MAX-1) this frame
//   grass.push.clear(i)                                                   off
// A pusher whose y is more than 0.4 m above the grass's ground does nothing (a jumping walker, a flying falcon).
import * as THREE from "three/webgpu";
import { Fn, If, uniform, float, int, uint, vec2, vec4, instanceIndex, instancedArray, floor, length, max, min, exp, normalize, smoothstep, mix, select } from "three/tsl";

export const PUSH = { N: 256, cell: 0.25, MAX: 8 };

export class GrassPush {
  constructor() {
    const { N, MAX } = PUSH;
    this.buf = instancedArray(N * N, "vec4");          // dirX, dirZ, amount, tag
    this.u = {
      base: uniform(new THREE.Vector2()),              // world cell index of the window's first cell (x, z)
      dt: uniform(0), recover: uniform(3.5),           // s: back up to ~37 % after this
      P: Array.from({ length: MAX }, () => uniform(new THREE.Vector4(0, -1e5, 0, 0))),   // x, y, z, radius
      V: Array.from({ length: MAX }, () => uniform(new THREE.Vector4(0, 0, 0, 0))),      // vx, vz, strength, ground y
    };
    this.live = new Array(MAX).fill(false);
    const { base, dt, recover, P, V } = this.u, buf = this.buf, cell = PUSH.cell;
    this.stamp = Fn(() => {
      const i = instanceIndex;
      const sx = int(i.mod(uint(N))), sz = int(i.div(uint(N)));
      // the world cell this slot holds now: base + ((slot - base) mod N)
      const bx = int(base.x), bz = int(base.y);
      const gx = bx.add(sx.sub(bx).mod(N).add(N).mod(N)), gz = bz.add(sz.sub(bz).mod(N).add(N).mod(N));
      const tag = float(gx.bitAnd(1023).mul(1024).add(gz.bitAnd(1023)));
      const v = buf.element(i).toVar();
      If(v.w.notEqual(tag), () => { v.assign(vec4(0, 0, 0, tag)); });
      v.z.assign(v.z.mul(exp(dt.negate().div(max(recover, 0.05)))));
      const c = vec2(float(gx).add(0.5), float(gz).add(0.5)).mul(cell);
      for (let k = 0; k < MAX; k++) {
        const p = P[k], q = V[k];
        const rel = c.sub(vec2(p.x, p.z)), d = length(rel);
        const contact = float(1).sub(smoothstep(0.15, 0.4, p.y.sub(q.w)));
        const amt = float(1).sub(smoothstep(p.w.mul(0.45), p.w, d)).mul(q.z).mul(contact).mul(select(p.w.greaterThan(0), float(1), float(0)));
        If(amt.greaterThan(v.z), () => {
          const away = rel.div(max(d, 0.02));
          const vel = vec2(q.x, q.y), sp = length(vel);
          const dir = normalize(mix(away, vel.div(max(sp, 1e-3)), min(sp.mul(0.25), 0.7)).add(vec2(1e-4, 0)));
          v.assign(vec4(dir.x, dir.y, amt, tag));
        });
      }
      buf.element(i).assign(v);
    })().compute(N * N, [64]);
    this.stamp.setName("grass push");
  }

  set(i, { x, y, z, radius, strength = 1, vx = 0, vz = 0, ground = y }) {
    this.u.P[i].value.set(x, y, z, radius);
    this.u.V[i].value.set(vx, vz, strength, ground);
    this.live[i] = true;
  }
  clear(i) { this.u.P[i].value.set(0, -1e5, 0, 0); this.u.V[i].value.set(0, 0, 0, 0); this.live[i] = false; }

  /** the stamp pass to run this frame, or null: nothing pushed for 4 recover times (all back up: no work at all) */
  frame(camPos, dt) {
    const { N, cell } = PUSH;
    this.idle = this.live.some((x) => x) ? 0 : (this.idle ?? 1e9) + dt;
    this.u.base.value.set(Math.floor(camPos.x / cell) - N / 2, Math.floor(camPos.z / cell) - N / 2);
    this.u.dt.value = dt;
    return this.idle > 4 * this.u.recover.value ? null : this.stamp;
  }

  /** TSL (compute): the push at world xz -> vec4(dirX, dirZ, amount, 0) (0 outside the window / stale) */
  at(xz) {
    const { N, cell } = PUSH;
    const g = floor(xz.div(cell)), gx = int(g.x), gz = int(g.y);
    const slot = gx.mod(N).add(N).mod(N).add(gz.mod(N).add(N).mod(N).mul(N));
    const v = this.buf.element(slot);
    const tag = float(gx.bitAnd(1023).mul(1024).add(gz.bitAnd(1023)));
    return select(v.w.equal(tag), vec4(v.x, v.y, v.z, 0), vec4(0));
  }
}
