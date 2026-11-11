// The crowd's bone table (docs/PEDESTRIANS.md): clips baked from Mr.doob's procedural gait (tools/peds/bakeGait.mjs ->
// models/pedestrians/clips.bin + clips.json). Layout: [sex][frame][bone 15][q.xyzw, t.xyz, s] in the person's own
// frame (root at the origin facing +Z, scale 1, ground y = 0). Each person plays two slices (clip A at phase A, clip B
// at phase B, mixed by w) plus a head glance; the GPU turns that into the person's world pose (crowd.js, compute) and
// the CPU can do the same for one person (samplePose: the live <-> baked hand-over blend and the meters).
// Mirrors vendor/slop-ped/pedestrians.js: 15 bones, 31 vec4 per person (2 per bone + seed/female/girth/hair).
export const BONES = 15;
export const STRIDE = BONES * 2 + 1;          // vec4 per person in a pose buffer (as the vendored PersonCrowd)
export const FPB = 8;                          // floats per bone in the table
export const BONE = { PELVIS: 0, CHEST: 1, HEAD: 2, FOOT_L: 9, TOE_L: 10, FOOT_R: 13, TOE_R: 14 };
export const ANKLE_H = 0.08;
// bind joints the meters and the head glance need (same for both sexes in the vendored skeleton)
export const BIND = { head: [0, 1.52, -0.012], footL: [0.09, 0.08, 0], footR: [-0.09, 0.08, 0] };

export class BoneTable {
  static async load(base = new URL("../../models/pedestrians/", import.meta.url)) {
    const [meta, bin] = await Promise.all([
      fetch(new URL("clips.json", base)).then((r) => r.json()),
      fetch(new URL("clips.bin", base)).then((r) => r.arrayBuffer()),
    ]);
    return new BoneTable(meta, new Float32Array(bin));
  }
  constructor(meta, data) {
    this.meta = meta; this.data = data;
    this.clips = meta.clips;
    this.total = meta.totalFrames;
    this.byName = Object.fromEntries(this.clips.map((c, i) => [c.name, i]));
    // families (base + scripted overlays: pram, umbrella, phone, old, cane): each its own idle and walk speeds
    this.families = {};
    this.clips.forEach((c, i) => {
      const f = (this.families[c.family || "base"] ||= { walks: [], idle: -1 });
      if (c.kind === "walk") f.walks.push({ i, speed: c.speed, stride: c.stride });
      if (c.kind === "idle") f.idle = i;
    });
    for (const f of Object.values(this.families)) f.walks.sort((a, b) => a.speed - b.speed);
    this.walks = this.families.base.walks;
    this.idle = this.byName.idle;
    this.turnL = this.byName.turnL; this.turnR = this.byName.turnR;
    // clip info for the GPU: (first frame, frame count, 0, 0) per clip
    this.clipInfo = new Float32Array(this.clips.length * 4);
    this.clips.forEach((c, i) => this.clipInfo.set([c.start, c.frames, 0, 0], i * 4));
  }

  /** Locomotion slices for a ground speed v (m/s): { a, b, w } with a, b clip indices (walk / jog / run bakes; all
   *  share one phase, heel strike at 0) and the stride per cycle at scale 1 for the mix. v < first walk speed: the
   *  slowest walk with w toward idle handled by the caller. */
  fam(name) { return this.families[name] || this.families.base; }
  loco(v, sex, out, family = "base") {
    const W = this.fam(family).walks;
    if (v <= W[0].speed) { out.a = W[0].i; out.b = W[0].i; out.w = 0; out.stride = W[0].stride[sex]; return out; }
    for (let k = 0; k < W.length - 1; k++) {
      if (v <= W[k + 1].speed || k === W.length - 2) {
        const w = Math.min(1, (v - W[k].speed) / (W[k + 1].speed - W[k].speed));
        out.a = W[k].i; out.b = W[k + 1].i; out.w = w;
        out.stride = W[k].stride[sex] + (W[k + 1].stride[sex] - W[k].stride[sex]) * w;
        return out;
      }
    }
    return out;
  }

  /** Is the foot (0 left, 1 right) planted at this clip phase (the bake's stance flag)? */
  planted(clip, phase, sex, foot) {
    const c = this.clips[clip], f = Math.floor(phase * c.frames) % c.frames;
    return (c.plant[sex][f] >> foot) & 1;
  }

  /** One person's world pose (31 vec4 = 124 floats, the vendored layout) from two slices, on the CPU: the same maths as
   *  the crowd's compute pass. p = { sex, clipA, phaseA, clipB, phaseB, w, x, y, z, yaw, scale, look, seed, girth, hair } */
  samplePose(out, p) {
    const A = this._slice(p.sex, p.clipA, p.phaseA, _sa), B = this._slice(p.sex, p.clipB, p.phaseB, _sb);
    const cy = Math.cos(p.yaw * 0.5), sy = Math.sin(p.yaw * 0.5), S = p.scale;
    for (let b = 0; b < BONES; b++) {
      const o = b * 8;
      // mix the slices (nlerp with a hemisphere check) and the translations
      let qx = A[o], qy = A[o + 1], qz = A[o + 2], qw = A[o + 3];
      let bx = B[o], by = B[o + 1], bz = B[o + 2], bw = B[o + 3];
      if (qx * bx + qy * by + qz * bz + qw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
      const w = p.w;
      qx += (bx - qx) * w; qy += (by - qy) * w; qz += (bz - qz) * w; qw += (bw - qw) * w;
      const n = 1 / Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw); qx *= n; qy *= n; qz *= n; qw *= n;
      let tx = A[o + 4] + (B[o + 4] - A[o + 4]) * w, ty = A[o + 5] + (B[o + 5] - A[o + 5]) * w, tz = A[o + 6] + (B[o + 6] - A[o + 6]) * w;
      if (b === BONE.HEAD && p.look) {
        // glance: turn the head about the vertical through its joint (local frame)
        const hj = BIND.head;
        rot(qx, qy, qz, qw, hj[0], hj[1], hj[2], _v); const px = tx + _v[0], py = ty + _v[1], pz = tz + _v[2];
        const ly = Math.sin(p.look * 0.5), lw = Math.cos(p.look * 0.5);
        const nx = lw * qx + ly * qz, ny = lw * qy + ly * qw, nz = lw * qz - ly * qx, nw = lw * qw - ly * qy;
        qx = nx; qy = ny; qz = nz; qw = nw;
        rot(qx, qy, qz, qw, hj[0], hj[1], hj[2], _v); tx = px - _v[0]; ty = py - _v[1]; tz = pz - _v[2];
      }
      // to the world: yaw about +Y, scale, position
      const wx = cy * qx + sy * qz, wy = cy * qy + sy * qw, wz = cy * qz - sy * qx, ww = cy * qw - sy * qy;
      rot(0, sy, 0, cy, tx * S, ty * S, tz * S, _v);
      out[o] = wx; out[o + 1] = wy; out[o + 2] = wz; out[o + 3] = ww;
      // per-foot ground: the leg's bones lifted by that foot's ground height above the root (thigh by half)
      const lift = b >= 7 && b <= 10 ? (p.offL || 0) * (b === 7 ? 0.5 : 1) : b >= 11 ? (p.offR || 0) * (b === 11 ? 0.5 : 1) : 0;
      out[o + 4] = _v[0] + p.x; out[o + 5] = _v[1] + p.y + lift; out[o + 6] = _v[2] + p.z; out[o + 7] = S;
    }
    out[120] = p.seed; out[121] = p.sex; out[122] = p.girth; out[123] = p.hair;
    return out;
  }
  /** World ankle joints of both feet only (cheap: 2 bones), for the plant correction and per-foot ground.
   *  p as samplePose; out = 12 floats: [left heel xyz, left ball xyz, right heel xyz, right ball xyz] (no per-foot lift). */
  feet(p, out) {
    const cy = Math.cos(p.yaw * 0.5), sy = Math.sin(p.yaw * 0.5), S = p.scale;
    for (let k = 0; k < 2; k++) {
      const b = k ? BONE.FOOT_R : BONE.FOOT_L, bj = k ? BIND.footR : BIND.footL;
      // (one slice only when the mix is all one way: walking at a baked speed, standing)
      if (p.w > 0.995) { bonePair(this, p.sex, p.clipB, p.phaseB, b, _bb); _ba.set(_bb); }
      else { bonePair(this, p.sex, p.clipA, p.phaseA, b, _ba); if (p.w < 0.005) _bb.set(_ba); else bonePair(this, p.sex, p.clipB, p.phaseB, b, _bb); }
      let bx = _bb[0], by = _bb[1], bz = _bb[2], bw = _bb[3];
      if (_ba[0] * bx + _ba[1] * by + _ba[2] * bz + _ba[3] * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
      const w = p.w;
      let qx = _ba[0] + (bx - _ba[0]) * w, qy = _ba[1] + (by - _ba[1]) * w, qz = _ba[2] + (bz - _ba[2]) * w, qw = _ba[3] + (bw - _ba[3]) * w;
      const n = 1 / Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw); qx *= n; qy *= n; qz *= n; qw *= n;
      rot(qx, qy, qz, qw, bj[0], bj[1], bj[2], _v);
      const lx = _ba[4] + (_bb[4] - _ba[4]) * w + _v[0], ly = _ba[5] + (_bb[5] - _ba[5]) * w + _v[1], lz = _ba[6] + (_bb[6] - _ba[6]) * w + _v[2];
      // the sole's heel and ball (a rolling foot pivots on one of them), then to the world
      for (let j = 0; j < 2; j++) {
        rot(qx, qy, qz, qw, 0, -ANKLE_H, j ? 0.135 : -0.07, _v);
        rot(0, sy, 0, cy, (lx + _v[0]) * S, (ly + _v[1]) * S, (lz + _v[2]) * S, _v);
        const o = k * 6 + j * 3;
        out[o] = _v[0] + p.x; out[o + 1] = _v[1] + p.y; out[o + 2] = _v[2] + p.z;
      }
    }
    return out;
  }
  _slice(sex, clip, phase, out) {
    const c = this.clips[clip], F = c.frames, f = (((phase % 1) + 1) % 1) * F;
    const f0 = Math.floor(f) % F, f1 = (f0 + 1) % F, t = f - Math.floor(f);
    const d = this.data, o0 = ((sex * this.total + c.start + f0) * BONES) * FPB, o1 = ((sex * this.total + c.start + f1) * BONES) * FPB;
    for (let b = 0; b < BONES; b++) {
      const a = o0 + b * 8, e = o1 + b * 8, o = b * 8;
      let bx = d[e], by = d[e + 1], bz = d[e + 2], bw = d[e + 3];
      if (d[a] * bx + d[a + 1] * by + d[a + 2] * bz + d[a + 3] * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
      let qx = d[a] + (bx - d[a]) * t, qy = d[a + 1] + (by - d[a + 1]) * t, qz = d[a + 2] + (bz - d[a + 2]) * t, qw = d[a + 3] + (bw - d[a + 3]) * t;
      const n = 1 / Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
      out[o] = qx * n; out[o + 1] = qy * n; out[o + 2] = qz * n; out[o + 3] = qw * n;
      for (let k = 4; k < 8; k++) out[o + k] = d[a + k] + (d[e + k] - d[a + k]) * t;
    }
    return out;
  }
}
const _sa = new Float32Array(BONES * 8), _sb = new Float32Array(BONES * 8), _v = [0, 0, 0], _ba = new Float32Array(8), _bb = new Float32Array(8);
/** One bone of one clip slice (frames interpolated), local frame: out = q.xyzw, t.xyz, s. */
function bonePair(T, sex, clip, phase, b, out) {
  const c = T.clips[clip], F = c.frames, f = (((phase % 1) + 1) % 1) * F;
  const f0 = Math.floor(f) % F, f1 = (f0 + 1) % F, t = f - Math.floor(f), d = T.data;
  const a = ((sex * T.total + c.start + f0) * BONES + b) * FPB, e = ((sex * T.total + c.start + f1) * BONES + b) * FPB;
  let bx = d[e], by = d[e + 1], bz = d[e + 2], bw = d[e + 3];
  if (d[a] * bx + d[a + 1] * by + d[a + 2] * bz + d[a + 3] * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
  const qx = d[a] + (bx - d[a]) * t, qy = d[a + 1] + (by - d[a + 1]) * t, qz = d[a + 2] + (bz - d[a + 2]) * t, qw = d[a + 3] + (bw - d[a + 3]) * t;
  const n = 1 / Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
  out[0] = qx * n; out[1] = qy * n; out[2] = qz * n; out[3] = qw * n;
  for (let k = 4; k < 8; k++) out[k] = d[a + k] + (d[e + k] - d[a + k]) * t;
  return out;
}
/** v rotated by the unit quaternion q (same formula as the vendored shader's qrot). */
export function rot(qx, qy, qz, qw, vx, vy, vz, out) {
  // t = 2 * cross(q.xyz, v); v' = v + w t + cross(q.xyz, t)
  const tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
  out[0] = vx + qw * tx + (qy * tz - qz * ty);
  out[1] = vy + qw * ty + (qz * tx - qx * tz);
  out[2] = vz + qw * tz + (qx * ty - qy * tx);
  return out;
}
/** World position of bone b's joint in a pose (31 vec4 layout): p = t + q * bindJoint * s. */
export function jointOf(pose, b, bind, out) {
  const o = b * 8, s = pose[o + 7];
  rot(pose[o], pose[o + 1], pose[o + 2], pose[o + 3], bind[0] * s, bind[1] * s, bind[2] * s, out);
  out[0] += pose[o + 4]; out[1] += pose[o + 5]; out[2] += pose[o + 6];
  return out;
}
/** Blend pose a toward pose b by w into out (nlerp quaternions, lerp translations; the info vec4 from b). */
export function blendPose(out, a, b, w) {
  for (let k = 0; k < BONES; k++) {
    const o = k * 8;
    let bx = b[o], by = b[o + 1], bz = b[o + 2], bw = b[o + 3];
    if (a[o] * bx + a[o + 1] * by + a[o + 2] * bz + a[o + 3] * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
    const qx = a[o] + (bx - a[o]) * w, qy = a[o + 1] + (by - a[o + 1]) * w, qz = a[o + 2] + (bz - a[o + 2]) * w, qw = a[o + 3] + (bw - a[o + 3]) * w;
    const n = 1 / Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
    out[o] = qx * n; out[o + 1] = qy * n; out[o + 2] = qz * n; out[o + 3] = qw * n;
    for (let j = 4; j < 8; j++) out[o + j] = a[o + j] + (b[o + j] - a[o + j]) * w;
  }
  for (let j = 120; j < 124; j++) out[j] = b[j];
  return out;
}
