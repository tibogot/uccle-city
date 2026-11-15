// WHO LEAVES TRACKS IN THE SNOW (snowTrails.js brushes), gathered once per frame from the city's movers:
//   walker (first person)   a boot print every stride, left / right of the walking line
//   third person            each foot when it plants (foot IK's ankle bones), else the walker's stride rule
//   the player's car        4 tyres, a capsule from each wheel's last position (motorbike: 2 thin tyres)
//   traffic                 the 32 nearest live cars in the window, 4 tyres each (sim poses as drawn)
//   extras                  hook for pedestrians / animals: movers.extra = [fn(out, ctx)] pushing brushes
// A brush only where the mover touches the snow: its height near the drawn ground (not in the air, not on a bridge
// over the street).
const STRIDE = 0.74, BOOT_R = 0.055, BOOT_HALF = 0.085;

export function createSnowMovers({ ground = null, getMovers }) {
  const out = [];
  const st = { walker: null, third: [null, null], thirdStride: null, car: null, traffic: new Map() };
  // (the world's drawn ground, not the overhead map: the map's top surface over a car is its roof)
  const touches = (x, y, z, tol = 0.6) => {
    if (!ground || y == null) return true;
    const h = ground(x, z);
    return !(h > -500) || Math.abs(y - h) < tol;
  };
  const boot = (x, z, fx, fz, s = 0.9) => {
    out.push({ px: x - fx * BOOT_HALF, pz: z - fz * BOOT_HALF, x: x + fx * BOOT_HALF, z: z + fz * BOOT_HALF, r: BOOT_R, s, kind: 0, dx: fx, dz: fz });
  };
  /** a body walking on (x, z): a boot print every stride, alternating sides; S keeps its state */
  function strider(S, x, z, y) {
    if (!S.p) { S.p = { x, z }; S.acc = 0; S.side = 1; S.fx = 0; S.fz = 1; return S; }
    const dx = x - S.p.x, dz = z - S.p.z, d = Math.hypot(dx, dz);
    if (d > 3) { S.p = { x, z }; S.acc = 0; return S; }            // a jump / teleport
    if (d < 1e-4) return S;
    S.fx = dx / d; S.fz = dz / d; S.acc += d; S.p = { x, z };
    if (S.acc >= STRIDE) {
      S.acc -= STRIDE; S.side = -S.side;
      const rx = S.fz, rz = -S.fx;                                // right of the walking line
      if (y == null || touches(x, y, z, 2.2)) boot(x + rx * 0.1 * S.side, z + rz * 0.1 * S.side, S.fx, S.fz);
    }
    return S;
  }
  function wheels(key, c, list, r, ctx, y) {
    const prev = st[key];
    const s = Math.sin(c.heading), k = Math.cos(c.heading);
    const now = list.map(([f, rr]) => [c.x + s * f + k * rr, c.z + k * f - s * rr]);
    if (prev && touches(c.x, y, c.z)) {
      for (let i = 0; i < now.length; i++) {
        const d = Math.hypot(now[i][0] - prev[i][0], now[i][1] - prev[i][1]);
        if (d > 3 || d < 0.002) continue;
        out.push({ px: prev[i][0], pz: prev[i][1], x: now[i][0], z: now[i][1], r, s: 1, kind: 1, dx: s, dz: k });
      }
    }
    st[key] = now;
  }

  return {
    stats: { n: 0, traffic: 0 },
    gather(camPos, dt) {
      out.length = 0;
      const M = getMovers?.();
      if (!M) return out;
      // ---- the player's car / motorbike
      const D = M.driver;
      if (D?.on && D.state) {
        const c = D.state, bike = D.vehicle === "moto";
        wheels("car", c, bike ? [[0.725, 0], [-0.725, 0]] : [[1.3, 0.78], [1.3, -0.78], [-1.25, 0.78], [-1.25, -0.78]], bike ? 0.06 : 0.105, null, c.y ?? 0);
      } else st.car = null;
      // ---- on foot: first person
      const W = M.walker;
      if (W?.on) st.walker = strider(st.walker ?? {}, W.x, W.z, null); else st.walker = null;
      // ---- third person: planted ankles (foot IK), else strides
      const T = M.third?.();
      if (T?.on) {
        const legs = T.tp?.body?.footIK?.ok ? T.tp.body.footIK.legs : null, ctl = T.tp?.ctl;
        if (legs && ctl) {
          const y0 = ctl.pos[1];
          const vx = ctl.vel?.[0] ?? 0, vz = ctl.vel?.[2] ?? 0, sp = Math.hypot(vx, vz);
          if (sp > 0.2) { st.tfx = vx / sp; st.tfz = vz / sp; }
          for (let i = 0; i < 2; i++) {
            const e = legs[i].foot.matrixWorld.elements, x = e[12], y = e[13], z = e[14];
            const L = (st.third[i] ??= { lo: y, x: 1e9, z: 1e9 });
            L.lo = Math.min(y, L.lo + dt * 0.05);                   // the lowest the ankle gets (slowly forgets)
            const planted = y < L.lo + 0.035 && ctl.grounded !== false && Math.abs(y - y0) < 0.4;
            if (planted && sp > 0.2 && Math.hypot(x - L.x, z - L.z) > 0.3) {
              const fx = st.tfx ?? 0, fz = st.tfz ?? 1;
              boot(x + fx * 0.05, z + fz * 0.05, fx, fz);
              L.x = x; L.z = z;
            }
          }
        } else if (ctl) st.thirdStride = strider(st.thirdStride ?? {}, ctl.pos[0], ctl.pos[2], null);
      } else { st.third = [null, null]; st.thirdStride = null; }
      // ---- traffic: the nearest live cars in the window
      const TT = M.traffic?.()?.T, sim = TT?.sim;
      let nt = 0;
      if (sim && TT.types) {
        const a = TT.alpha ?? 1, b1 = 1 - a, R2 = 30 * 30, seen = st.seen ??= new Set();
        seen.clear();
        for (let i = 0; i < sim.cap && nt < 32; i++) {
          if (!sim.alive[i]) continue;
          const x = sim.px[i] * b1 + sim.x[i] * a, z = sim.pz[i] * b1 + sim.z[i] * a;
          const dx = x - camPos.x, dz = z - camPos.z;
          if (dx * dx + dz * dz > R2) continue;
          let yaw = sim.yaw[i]; const py = sim.pyaw[i]; let dy = yaw - py;
          if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
          yaw = py + dy * a;
          const y = sim.py[i] * b1 + sim.y[i] * a;
          const ty = TT.types[sim.type[i]], hw = (ty?.w ?? 1.8) / 2 - 0.12, hb = (sim.wb[i] || 2.6) / 2;
          const key = i, g = sim.gen[i];
          let S = st.traffic.get(key);
          if (S && S.g !== g) S = null;
          const s = Math.sin(yaw), k = Math.cos(yaw);
          const now = [[hb, hw], [hb, -hw], [-hb, hw], [-hb, -hw]].map(([f, rr]) => [x + s * f + k * rr, z + k * f - s * rr]);
          if (S && touches(x, y, z)) {
            for (let w = 0; w < 4; w++) {
              const d = Math.hypot(now[w][0] - S.w[w][0], now[w][1] - S.w[w][1]);
              if (d > 3 || d < 0.002) continue;
              out.push({ px: S.w[w][0], pz: S.w[w][1], x: now[w][0], z: now[w][1], r: 0.1, s: 1, kind: 1, dx: s, dz: k });
            }
          }
          st.traffic.set(key, { g, w: now });
          seen.add(key); nt++;
        }
        for (const k of st.traffic.keys()) if (!seen.has(k)) st.traffic.delete(k);
      }
      // ---- the hook: pedestrians, animals (later)
      for (const f of M.extra ?? []) f(out, { camPos, dt, touches, boot });
      this.stats.n = out.length; this.stats.traffic = nt;
      return out;
    },
  };
}
