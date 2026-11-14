// THE NIGHT SOURCES: every kind of light the street has, each with its own fixed pool range, written into the
// LightPool each frame (nightLighting.js draws them). Static sources (lamps, lit windows, shop fronts, signs) are
// queried through a grid (StaticSources); moving ones (car headlights, rear lights, the tram) are offered from flat
// arrays the lab / city fills. NearestN gives every kept source its fade weight (lightSelect.js: no popping).
//
//   lamps      omni, LANTERN profile (up share + batwing), finite globe (r 0.22 m); the K nearest also carry a
//              shadowed THREE.SpotLight, cross-faded (ShadowLamps)
//   windows    APERTURE spot from 1.2 m inside the room through the window (mullion cross): the patch on the garden
//   shops      APERTURE spot from 2 m inside through the shop front: the bright patch on the sidewalk
//   signs      a small coloured omni in front of the fascia
//   headlights one LOW BEAM spot per car (the two lamps merged: the same light on the road beyond a few metres; GTA V
//              draws "only 2 headlights" for far cars, we go one step further for the lit pool)
//   rear       one red omni per car (5 m)
//   tram       the lead cab's low beam (symmetric), a red rear omni, three saloon omnis (light through the windows)
// Volumetric cones (lightCones.js) follow the lamp and headlight slots.
// Per frame: no allocation (typed arrays, preallocated selections); cost = the grid cells / cars visited.
import * as THREE from "three/webgpu";
import { PROFILE } from "./nightLighting.js";
import { NearestN, StaticSources, ShadowLamps, smooth01 } from "./lightSelect.js";

/** Moving lights: car i at CAR.STRIDE * i (written by the owner of the cars). */
export const CAR = { HX: 0, HY: 1, HZ: 2, FX: 3, FY: 4, FZ: 5, TX: 6, TY: 7, TZ: 8, HEAD: 9, TAIL: 10, FADE: 11, GY: 12, STRIDE: 13 };   // GY: the road's y under the car (the dynamic ground layer)

export const nightParams = {
  lamps: true, windows: true, shops: true, signs: true, headlights: true, rear: true, tram: true,
  cones: 'wet only',       // the beams in damp air: 'on' / 'wet only' / 'off' (~0.3 ms when on: additive overdraw)
  lampI: 110, lampRange: 16, lampUp: 0.3, lampBatwing: 0.35,
  windowI: 14, windowRange: 9, shopI: 24, shopRange: 12, signI: 6, signRange: 5, rearRange: 4.5, headI: 1000, headRange: 34, headCone: 0.55, rearI: 1.6, tramI: 900, tramSaloon: 7,
  shadowShare: 1,         // the share of a shadowed lamp's light its SpotLight carries (the rest stays a pool light: the lantern's up light)
  near0: 40, near1: 60,       // m: static lights real up to near0, gone at near1 (the ground map + wall spill beyond)
  coneDensity: 0.025,     // dry air: a hint; x2.5 when the street is wet (damp air, spray)
};
const LAMP_RGB = [1.0, 0.78, 0.52], HEAD_RGB = [1.0, 0.97, 0.92], REAR_RGB = [1.0, 0.04, 0.02], SALOON_RGB = [0.82, 0.9, 1.0];

class Track {          // per-source weight history: the largest frame-to-frame jump (the pop detector)
  // on = false (the city, unless ?nightdebug=1): begin / end do nothing (the lamp track's fill + scan of its 16384 ids
  // was most of the city's per-frame night CPU); the per-source writes into cur stay (cheap)
  constructor(n) { this.prev = new Float32Array(n); this.cur = new Float32Array(n); this.maxJump = 0; this.frameJump = 0; this.on = true; }
  begin() { if (!this.on) return; const t = this.prev; this.prev = this.cur; this.cur = t; this.cur.fill(0); }
  end() { if (!this.on) return; let m = 0; for (let i = 0; i < this.cur.length; i++) { const d = Math.abs(this.cur[i] - this.prev[i]); if (d > m) m = d; } this.frameJump = m; if (m > this.maxJump) this.maxJump = m; }
}

export class NightSources {
  constructor(pool, street, { cars = 64, shadowLights = [], cones = null, sizes = {}, ground = null, baked = {} } = {}) {
    // round 2: the static kinds only near the camera (the ground light map has them all), the 12 nearest cars' lights
    // real (the others' pools in the map's dynamic layer)
    const N = { lamps: 24, windows: 40, shops: 8, signs: 6, heads: 12, rear: 12, ...sizes };
    this.pool = pool; this.cones = cones; this.N = N; this.ground = ground;
    // which kinds the ground light map holds (ground materials then skip them in the loop): all with a map (the lab);
    // the city's map has the lamps only (cityNight.js passes { shops: false, signs: false })
    this.bakedK = { lamps: !!ground, windows: !!ground, shops: !!ground, signs: !!ground, ...baked };
    this.realHead = new Float32Array(cars); this.realRear = new Float32Array(cars);
    const S = street.sources;
    this.src = S;
    this.grid = {};
    // a kind may come with its own query (the city's lamp registry, cityNight.js: tiles added / removed, a fade per source)
    for (const k of ["lamps", "windows", "shops", "signs"]) this.grid[k] = S[k].query ? S[k] : new StaticSources(S[k].x, S[k].y, S[k].z, 32);
    this.sel = {
      lamps: new NearestN(N.lamps, 70), windows: new NearestN(N.windows, 70), shops: new NearestN(N.shops, 70),
      signs: new NearestN(N.signs, 70), heads: new NearestN(N.heads, 230), rear: new NearestN(N.rear, 120),
    };
    this.base = {};
    for (const k of ["lamps", "windows", "shops", "signs", "heads", "rear"]) this.base[k] = pool.reserve(N[k]);
    this.base.tram = pool.reserve(5);
    this.carData = new Float32Array(cars * CAR.STRIDE); this.carCount = 0;
    this.shadow = new ShadowLamps(shadowLights, S.lamps.x.length);
    this.tram = { on: false, hx: 0, hy: 0, hz: 0, fx: 1, fz: 0, rx: 0, rz: 0, len: 32 };
    this.track = { lamps: new Track(S.lamps.x.length), windows: new Track(S.windows.x.length), heads: new Track(cars), rear: new Track(cars) };
    this.stats = { lamps: 0, windows: 0, shops: 0, signs: 0, heads: 0, rear: 0, tram: 0, total: 0 };
    this.ms = 0;
  }

  /** cam: Vector3; dt: s; scale: master x night */
  update(cam, dt, scale = 1, wetNow = false) {
    this.conesOn = nightParams.cones === "on" || (nightParams.cones === "wet only" && wetNow);
    const t0 = performance.now();
    const P = this.pool, p = nightParams, cx = cam.x, cy = cam.y, cz = cam.z;
    P.scale = scale;
    this.cx = cx; this.cy = cy; this.cz = cz;
    let cone = 0;
    const C = this.cones;
    // ---- street lamps
    {
      const sel = this.sel.lamps, S = this.src.lamps, b = this.base.lamps, tr = this.track.lamps;
      sel.begin(); if (p.lamps) this.grid.lamps.query(cx, cy, cz, sel.maxDist, sel); sel.end();
      this.shadow.update(sel, dt);
      tr.begin();
      const I = p.lampI, F = S.fade;              // F: per source fade (a streamed tile's lamps fade in), or none
      for (let k = 0; k < this.N.lamps; k++) {
        if (k >= sel.count) { P.weight(b + k, 0); continue; }
        const id = sel.i[k], w = sel.weight(k) * this.nearFade(sel.d[k]) * (F ? F[id] : 1);
        tr.cur[id] = w;
        P.set(b + k, S.x[id], S.y[id], S.z[id], p.lampRange, LAMP_RGB[0] * I, LAMP_RGB[1] * I, LAMP_RGB[2] * I, w * (1 - this.shadow.blend(id) * p.shadowShare), 0.22);
        P.omni(b + k); P.profile(b + k, PROFILE.LANTERN, p.lampUp, p.lampBatwing); P.baked(b + k, this.bakedK.lamps);
        if (C && this.conesOn && w > 0.01) C.write(cone++, S.x[id], S.y[id] - 0.1, S.z[id], 0, -1, 0, S.y[id] - 0.1, 3.4, LAMP_RGB[0] * w, LAMP_RGB[1] * w, LAMP_RGB[2] * w);
      }
      tr.end();
      this.stats.lamps = sel.count;
      // the shadowed share of the nearest lamps: real spot lights (three's path, soft PCF shadows)
      const SH = this.shadow;
      for (let s = 0; s < SH.K; s++) {
        const L = SH.lights[s], id = SH.lamp[s];
        if (id < 0 || !p.lamps || !P.enabled) { L.intensity = 0; continue; }
        L.position.set(S.x[id], S.y[id], S.z[id]);
        L.target.position.set(S.x[id], S.y[id] - 6, S.z[id]);
        L.target.updateMatrixWorld();
        L.intensity = I * scale * SH.blend(id) * p.shadowShare * (F ? F[id] : 1);
        L.distance = p.lampRange;
      }
    }
    // ---- windows and shop fronts (APERTURE): outward = the facade's normal (+z for the north side)
    this.aperture("windows", p.windows, p.windowI, 1.2, p.windowRange, 0.8);
    this.aperture("shops", p.shops, p.shopI, 2.0, p.shopRange, 0.0);
    // ---- signs
    {
      const sel = this.sel.signs, S = this.src.signs, L = S.list, b = this.base.signs, F = S.fade;
      sel.begin(); if (p.signs) this.grid.signs.query(cx, cy, cz, sel.maxDist, sel); sel.end();
      for (let k = 0; k < this.N.signs; k++) {
        if (k >= sel.count) { P.weight(b + k, 0); continue; }
        // (a sign with its facade normal, the city's: its position is already in front of the fascia; the lab's
        // street: the side's +-z offset)
        const id = sel.i[k], s = L[id], out = s.nx !== undefined ? 0 : s.side < 0 ? 1 : -1, I = p.signI;
        P.set(b + k, S.x[id], S.y[id] - 0.1, S.z[id] + out * 0.7, p.signRange, s.col[0] * I, s.col[1] * I, s.col[2] * I, sel.weight(k) * this.nearFade(sel.d[k]) * (F ? F[id] : 1), 0.4);
        P.omni(b + k); P.profile(b + k, PROFILE.PLAIN); P.diffuseOnly(b + k, true); P.baked(b + k, this.bakedK.signs);
      }
      this.stats.signs = sel.count;
    }
    // ---- cars: headlights, rear lights
    {
      const D = this.carData, n = this.carCount, sh = this.sel.heads, sr = this.sel.rear, th = this.track.heads, trr = this.track.rear;
      sh.begin(); sr.begin();
      for (let i = 0; i < n; i++) {
        const o = i * CAR.STRIDE;
        if (D[o + CAR.FADE] <= 0) continue;
        // a car fading in / out is offered FARTHER by (1 - fade) x 40 m: it joins / leaves the nearest set through the
        // cut-off's own fade, and never moves the cut-off of the others at a stroke (a weight-0 car taking a slot did)
        const far = (1 - D[o + CAR.FADE]) * 40;
        if (p.headlights && D[o + CAR.HEAD] > 0) { const dx = D[o] - cx, dy = D[o + 1] - cy, dz = D[o + 2] - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + far; sh.offer(i, d * d); }
        if (p.rear && D[o + CAR.TAIL] > 0) { const dx = D[o + 6] - cx, dy = D[o + 7] - cy, dz = D[o + 8] - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + far; sr.offer(i, d * d); }
      }
      sh.end(); sr.end();
      th.begin(); trr.begin();
      const bh = this.base.heads, br = this.base.rear, RH = this.realHead, RR = this.realRear;
      RH.fill(0); RR.fill(0);
      for (let k = 0; k < this.N.heads; k++) {
        if (k >= sh.count) { P.weight(bh + k, 0); continue; }
        const i = sh.i[k], o = i * CAR.STRIDE, w = sh.weight(k) * D[o + CAR.FADE] * D[o + CAR.HEAD], I = p.headI;
        th.cur[i] = w; RH[i] = sh.weight(k);
        P.set(bh + k, D[o], D[o + 1], D[o + 2], p.headRange, HEAD_RGB[0] * I, HEAD_RGB[1] * I, HEAD_RGB[2] * I, w, 0.15);
        P.spot(bh + k, D[o + 3], D[o + 4], D[o + 5], p.headCone, p.headCone * 0.3);
        P.profile(bh + k, PROFILE.LOWBEAM, -0.012, 0.268);
        if (C && this.conesOn && w > 0.01) C.write(cone++, D[o], D[o + 1], D[o + 2], D[o + 3], D[o + 4] - 0.02, D[o + 5], 16, 3.2, 0.45 * w, 0.44 * w, 0.42 * w);
      }
      for (let k = 0; k < this.N.rear; k++) {
        if (k >= sr.count) { P.weight(br + k, 0); continue; }
        const i = sr.i[k], o = i * CAR.STRIDE, w = sr.weight(k) * D[o + CAR.FADE] * D[o + CAR.TAIL], I = p.rearI * D[o + CAR.TAIL];
        trr.cur[i] = w; RR[i] = sr.weight(k);
        P.set(br + k, D[o + 6], D[o + 7], D[o + 8], p.rearRange, REAR_RGB[0] * I, REAR_RGB[1] * I, REAR_RGB[2] * I, w, 0.35);
        P.omni(br + k); P.profile(br + k, PROFILE.PLAIN); P.diffuseOnly(br + k, true);
      }
      th.end(); trr.end();
      this.stats.heads = sh.count; this.stats.rear = sr.count;
      // the far cars: their road pools in the ground map's dynamic layer, with the complement of the real weight
      let q = 0;
      const G = this.ground;
      if (G?.dyn) {
        const max = G.dyn.max;
        for (let i = 0; i < n && q < max - 1; i++) {
          const o = i * CAR.STRIDE, f = D[o + CAR.FADE] * scale;
          if (f <= 0) continue;
          const wh = (1 - RH[i]) * f * D[o + CAR.HEAD] * (p.headlights ? 1 : 0), wr = (1 - RR[i]) * f * D[o + CAR.TAIL] * (p.rear ? 1 : 0);
          if (wh > 0.001) { const I = p.headI * wh; G.writeDyn(q++, 0, D[o], D[o + 1] - D[o + CAR.GY], D[o + 2], D[o + 3], D[o + 4], D[o + 5], p.headRange, HEAD_RGB[0] * I, HEAD_RGB[1] * I, HEAD_RGB[2] * I); }
          if (wr > 0.001) { const I = p.rearI * D[o + CAR.TAIL] * wr; G.writeDyn(q++, 1, D[o + 6], D[o + 7] - D[o + CAR.GY], D[o + 8], 0, -1, 0, p.rearRange, REAR_RGB[0] * I, REAR_RGB[1] * I, REAR_RGB[2] * I); }
        }
      }
      this.dynCount = q;
    }
    // ---- the tram: fixed slots, faded with the distance
    {
      const T = this.tram, b = this.base.tram;
      const dx = T.hx - cx, dz = T.hz - cz, w = T.on && p.tram ? smooth01((200 - Math.hypot(dx, dz)) / 60) : 0;
      if (w <= 0) for (let k = 0; k < 5; k++) P.weight(b + k, 0);
      else {
        const I = p.tramI, pitch = 0.03, fx = T.fx * Math.cos(pitch), fz = T.fz * Math.cos(pitch), fy = -Math.sin(pitch);
        P.set(b, T.hx, 1.1, T.hz, p.headRange, HEAD_RGB[0] * I, HEAD_RGB[1] * I, HEAD_RGB[2] * I, w, 0.3);
        P.spot(b, fx, fy, fz, 0.7, 0.4); P.profile(b, PROFILE.LOWBEAM, -0.01, 0);
        if (C && this.conesOn) C.write(cone++, T.hx, 1.1, T.hz, fx, fy - 0.02, fz, 18, 3.6, 0.45 * w, 0.44 * w, 0.42 * w);
        P.set(b + 1, T.rx, 1.2, T.rz, 6, REAR_RGB[0] * p.rearI * 1.5, REAR_RGB[1] * p.rearI * 1.5, REAR_RGB[2] * p.rearI * 1.5, w, 0.15);
        P.omni(b + 1); P.profile(b + 1, PROFILE.PLAIN); P.diffuseOnly(b + 1, true);
        for (let k = 0; k < 3; k++) {
          const f = (k + 1) / 4, x = T.hx + (T.rx - T.hx) * f, z = T.hz + (T.rz - T.hz) * f, I2 = p.tramSaloon;
          P.set(b + 2 + k, x, 2.1, z, 8, SALOON_RGB[0] * I2, SALOON_RGB[1] * I2, SALOON_RGB[2] * I2, w, 1.0);
          P.omni(b + 2 + k); P.profile(b + 2 + k, PROFILE.PLAIN); P.diffuseOnly(b + 2 + k, true);
        }
      }
      this.stats.tram = w > 0 ? 5 : 0;
    }
    if (C) C.commit(cone);
    const st = this.stats;
    st.total = st.lamps + st.windows + st.shops + st.signs + st.heads + st.rear + st.tram;
    this.ms = performance.now() - t0;
  }

  /** the static kinds' real lights fade out between near0 and near1 m (beyond: the ground light map only) */
  nearFade(d) { const p = nightParams; return this.ground ? 1 - smooth01((d - p.near0) / (p.near1 - p.near0)) : 1; }

  aperture(kind, on, I, depth, range, mullion) {
    const P = this.pool, sel = this.sel[kind], S = this.src[kind], L = S.list, b = this.base[kind], tr = this.track[kind], F = S.fade;
    sel.begin(); if (on) this.grid[kind].query(this.cx, this.cy, this.cz, sel.maxDist, sel); sel.end();
    tr?.begin();
    for (let k = 0; k < this.N[kind]; k++) {
      if (k >= sel.count) { P.weight(b + k, 0); continue; }
      const id = sel.i[k], s = L[id], w = sel.weight(k) * this.nearFade(sel.d[k]) * (F ? F[id] : 1), g = I * (s.b ?? 1);
      // the opening's outward axis: the facade's own normal (the city's sources carry nx, nz), else the lab street's +-z
      const ax = s.nx !== undefined ? s.nx : 0, az = s.nx !== undefined ? s.nz : s.side < 0 ? 1 : -1;
      if (tr) tr.cur[id] = w;
      P.set(b + k, S.x[id] - ax * depth, S.y[id], S.z[id] - az * depth, range + depth, s.col[0] * g, s.col[1] * g, s.col[2] * g, w, 0.35);
      P.spot(b + k, ax, 0, az, 1.25, 0.95);
      P.profile(b + k, PROFILE.APERTURE, s.hw, s.hh, depth, mullion); P.diffuseOnly(b + k, true); P.baked(b + k, this.bakedK[kind]);
    }
    tr?.end();
    this.stats[kind] = sel.count;
  }
}
