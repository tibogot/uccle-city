// IVY GROWTH ON A PLANE, pure JS (no three): shared by the Foliage Lab's ivy (viewer/foliage/ivy.js growIvy) and the
// city's ivy build (tools/plants/build_ivy.mjs -> data/plants/<T>.ivy.bin, drawn by viewer/plants/cityIvy.js).
// Wall space: u along the wall (0..width, m), v up (0..height). The rules (docs/FOLIAGE.md §9 "Ivy grows like ivy"):
// a few roots at the foot; the colony is a MOUND over each root (a ragged envelope, not columns); stems climb with an
// up-pull, wander, branch often and spread sideways away from what is already covered (a 6 cm density grid); at a
// window or the envelope a stem DEFLECTS (turns 40 / 75 / 110 deg, the emptier side first) instead of dying; leaves
// patchy (a 0.8 m / 0.3 m value noise), thinning to a ragged margin, at most 2 sprays per 6 cm cell, none on glass;
// trailing stems hang from the top edge and over window heads.
//   growIvyData({ width, height }, { roots, maxHeight, avoid: [[u0, v0, u1, v1]], seed, reach })
//   -> { branches: [{ pts: [[u, v]...], w, trail }], leaves: [{ u, v, out, trail, r: [4 randoms], disc }], env(u) }

export function ivyRng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return s / 4294967296; }; }

export function growIvyData(wall, { roots = [0.5], maxHeight = wall.height * 0.8, avoid = [], seed = 1, reach = 2.6, maxBranches = 320, leafEvery = 1, leafCell = 0.06, perCellMax = 2 } = {}) {
  const R = ivyRng(seed * 7919 + 13);
  const STEP = 0.04;
  const inAvoid = (u, v, m = 0.02) => avoid.some(([a, b, c, d]) => u > a - m && u < c + m && v > b - m && v < d + m);
  const CELL = 0.06, GW = Math.ceil(wall.width / CELL) + 1, GH = Math.ceil(wall.height / CELL) + 1;
  const dens = new Float32Array(GW * GH);
  const dAt = (u, v) => { const i = Math.floor(u / CELL), j = Math.floor(v / CELL); return i < 0 || j < 0 || i >= GW || j >= GH ? 9 : dens[j * GW + i]; };
  const mark = (u, v) => { const i0 = Math.floor(u / CELL), j0 = Math.floor(v / CELL); for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) if (i >= 0 && j >= 0 && i < GW && j < GH) dens[j * GW + i] += i === i0 && j === j0 ? 1 : 0.35; };
  const mounds = roots.map((r) => ({ r, h: maxHeight * (0.72 + 0.28 * R()), s: reach * (0.42 + 0.22 * R()) }));
  const ph1 = R() * 6.28, ph2 = R() * 6.28;
  const env = (u) => {
    let h = 0; for (const m of mounds) h = Math.max(h, m.h * Math.exp(-(((u - m.r) / m.s) ** 2)));
    return Math.min(maxHeight, h + 0.22 * Math.sin(u * 3.1 + ph1) + 0.14 * Math.sin(u * 7.3 + ph2));
  };
  const branches = [];
  const alive = roots.map((u) => ({ u, v: 0.02, du: (R() - 0.5) * 0.4, dv: 1, len: 0, max: maxHeight * 1.6, pts: [[u, 0.02]], w: 0.014, main: true }));
  const blocked = (u, v) => u < 0.04 || u > wall.width - 0.04 || v < 0.01 || v > env(u) || inAvoid(u, v);
  let guard = 0, nb = alive.length;
  while (alive.length && guard++ < 60000) {
    const b = alive[alive.length - 1];
    const side = dAt(b.u - 0.18, b.v) - dAt(b.u + 0.18, b.v);
    let du = b.du * 0.55 + (R() - 0.5) * 0.9 + Math.max(-0.6, Math.min(0.6, side * 0.12));
    let dv = b.dv * 0.5 + (b.main ? 0.3 : 0.12) + (R() - 0.5) * 0.5;
    const l = Math.hypot(du, dv) || 1; du /= l; dv /= l;
    let nu = b.u + du * STEP, nv = b.v + dv * STEP;
    if (blocked(nu, nv)) {
      const order = dAt(b.u - 0.12, b.v) < dAt(b.u + 0.12, b.v) ? [1, -1] : [-1, 1];
      let ok = false;
      for (const a of [0.7, 1.3, 1.9]) for (const sg of order) {
        if (ok) break;
        const c = Math.cos(a * sg), s2 = Math.sin(a * sg), tu = du * c - dv * s2, tv = du * s2 + dv * c;
        if (!blocked(b.u + tu * STEP, b.v + tv * STEP)) { du = tu; dv = tv; nu = b.u + tu * STEP; nv = b.v + tv * STEP; ok = true; }
      }
      if (!ok) { branches.push(alive.pop()); continue; }
    }
    if (b.len > b.max || (b.len > 0.4 && dAt(nu, nv) > 6.5)) { branches.push(alive.pop()); continue; }
    b.u = nu; b.v = nv; b.du = du; b.dv = dv; b.len += STEP; b.pts.push([nu, nv]); mark(nu, nv);
    if (R() < (b.main ? 0.075 : 0.05) && nb < maxBranches && b.len > 0.12) {
      const sd = R() < 0.5 ? -1 : 1;
      alive.unshift({ u: nu, v: nv, du: sd * (0.75 + 0.4 * R()), dv: 0.05 + 0.45 * R(), len: 0, max: reach * (0.25 + 0.55 * R()), pts: [[nu, nv]], w: Math.max(0.005, b.w * 0.72), main: R() < 0.18 });
      nb++;
    }
  }
  const trailing = [];
  const heads = avoid.map(([a, , c, d]) => [a, c, d]);
  for (const b of branches) for (let k = 4; k < b.pts.length; k += 6) {
    const [u, v] = b.pts[k];
    const top = env(u) - v < 0.25;
    const head = heads.find(([a, c, d]) => u > a + 0.05 && u < c - 0.05 && v > d + 0.02 && v < d + 0.3);
    if (!(top && R() < 0.22) && !(head && R() < 0.3)) continue;
    const L = head ? 0.08 + 0.14 * R() : 0.3 + 0.7 * R();
    const pts = [[u, v]]; let cu = u, cv = v, cd = (R() - 0.5) * 0.3;
    for (let t = 0; t < L; t += STEP) { cd = cd * 0.7 + (R() - 0.5) * 0.25; cu += cd * STEP; cv -= STEP; if (cv < 0.3) break; pts.push([cu, cv]); }
    if (pts.length > 3 && trailing.length < 40) trailing.push({ pts, w: 0.005, trail: true });
  }
  branches.push(...trailing);
  const edgeAt = (u, v) => Math.min(1, Math.max(0, (env(u) - v) / 0.9));
  const lat = new Float32Array(64 * 64).map(() => R());
  const vn = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => lat[((j & 63) << 6) | (i & 63)];
    return (g(ix, iy) * (1 - sx) + g(ix + 1, iy) * sx) * (1 - sy) + (g(ix, iy + 1) * (1 - sx) + g(ix + 1, iy + 1) * sx) * sy;
  };
  const patch = (u, v) => Math.min(1, Math.max(0, (vn(u / 0.8, v / 0.8) * 0.7 + vn(u / 0.3 + 17, v / 0.3) * 0.3 - 0.22) * 1.9));
  const onGlass = (u, v) => inAvoid(u, v, -0.06);
  const leaves = [];
  // (leafCell / perCellMax: the lab's 2 sprays per 6 cm cell; the city uses fewer, bigger sprays: overdraw)
  const LW = Math.ceil(wall.width / leafCell) + 1, LH = Math.ceil(wall.height / leafCell) + 1;
  const perCell = new Uint8Array(LW * LH);
  for (const b of branches) for (let k = 1; k < b.pts.length; k += leafEvery) {
    const [u, v] = b.pts[k];
    const e = b.trail ? 0.55 : edgeAt(u, v) * patch(u, v);
    if (v < 0.12 || R() > 0.08 + 0.62 * e || (!b.trail && onGlass(u, v))) continue;
    const ci = Math.min(LW - 1, Math.max(0, Math.floor(u / leafCell))) + Math.min(LH - 1, Math.max(0, Math.floor(v / leafCell))) * LW;
    if (perCell[ci] >= perCellMax) continue;
    perCell[ci]++;
    const lu = u + (R() - 0.5) * 0.06, lv = v + (R() - 0.5) * 0.06;
    const out = (b.trail ? 0.03 + 0.05 * k / b.pts.length : 0.04) + R() * 0.05;
    leaves.push({ u: lu, v: lv, out, trail: !!b.trail, r: [R(), R(), R(), R()], disc: 0.8 + 0.4 * R() });
  }
  return { branches, leaves, env };
}
