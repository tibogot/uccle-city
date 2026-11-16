// FLAT-ROOF BANDS CHECK (citydefects 2026-11-16, owner image 59: broad diagonal light / dark stripes across a flat roof
// under a low sun). Three suspects, each testable live in the city page:
//   1. shadow acne: the sun's shadow map self-shadowing a near-horizontal surface at grazing light (bias / normalBias)
//   2. mesh topology: the flat roof's triangles carrying vertex normals that are not its face normal (smoothed across the
//      parapet / an edge: shading that varies across a flat plane), or long slivers (interpolation bands)
//   3. the roof material: a large-scale noise / tone in the flat roof's own shader
//
//   const R = await import("/debug/roofBands.js");
//   R.topology()                      -> per tile: flat-roof triangles, vertex normals off the face normal (> 1 deg), slivers
//   R.at(x, z, h = 25)                -> camera above (x, z) looking down at 45 deg (a flat roof, e.g. one from topology().worst)
//   R.bias({ bias: -0.0005, normalBias: 0.15 })  -> set the sun's shadow bias live (returns the previous values)
//   R.noShadow(true)                  -> the flat roofs stop receiving shadows (bands gone = acne)
//   R.plain(true)                     -> the flat roofs drawn with a plain grey material (bands gone = the material)
// Read the result by screenshots between the calls (low sun: the page's time control or ?hour=18.5).
const flats = () => { const out = []; window.viewer.scene.traverse((o) => { if (o.isMesh && o.name === "buildings-roofs-flat") out.push(o); }); return out; };

export function topology({ degTol = 1 } = {}) {
  const res = [];
  const cosTol = Math.cos((degTol * Math.PI) / 180);
  for (const o of flats()) {
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index;
    const n = I ? I.count : P.count;
    let tris = 0, offNormal = 0, slivers = 0, notUp = 0;
    const worst = [];
    for (let t = 0; t + 2 < n; t += 3) {
      const ids = [0, 1, 2].map((k) => (I ? I.getX(t + k) : t + k));
      const V = ids.map((i) => [P.getX(i), P.getY(i), P.getZ(i)]);
      const ux = V[1][0] - V[0][0], uy = V[1][1] - V[0][1], uz = V[1][2] - V[0][2], wx = V[2][0] - V[0][0], wy = V[2][1] - V[0][1], wz = V[2][2] - V[0][2];
      let fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
      const L = Math.hypot(fx, fy, fz);
      if (L < 1e-9) continue;
      fx /= L; fy /= L; fz /= L;
      if (fy < 0) { fx = -fx; fy = -fy; fz = -fz; }
      tris++;
      if (fy < 0.995) notUp++;
      const e = [Math.hypot(ux, uy, uz), Math.hypot(wx, wy, wz), Math.hypot(V[2][0] - V[1][0], V[2][1] - V[1][1], V[2][2] - V[1][2])];
      if (Math.max(...e) / Math.max(1e-6, (2 * (L / 2)) / Math.max(...e)) > 40) slivers++;   // longest edge / height
      if (N) {
        const dev = ids.some((i) => { const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i), l = Math.hypot(nx, ny, nz) || 1; return Math.abs((nx * fx + ny * fy + nz * fz) / l) < cosTol; });
        if (dev) { offNormal++; if (worst.length < 5) worst.push(V[0].map((v) => +v.toFixed(1))); }
      }
    }
    res.push({ mesh: o.parent?.name ?? o.name, tris, offNormal, slivers, notUp, worst });
  }
  return res;
}

export function at(x, z, h = 25) {
  const v = window.viewer, y = v.hm.surface?.(x, z) ?? v.hm.ground(x, z);
  v.camera.position.set(x - h * 0.7, y + h, z - h * 0.7); v.controls.target.set(x, y + 8, z); v.controls.update();
  return { x, z, y };
}

export function bias({ bias = null, normalBias = null } = {}) {
  const s = window.viewer.lighting.sun.shadow, prev = { bias: s.bias, normalBias: s.normalBias };
  if (bias != null) s.bias = bias;
  if (normalBias != null) s.normalBias = normalBias;
  // (the cascaded SunLight keeps one shadow per cascade: copy onto them too when it has them)
  for (const c of window.viewer.lighting.sun.shadows || window.viewer.lighting.sun.cascades || []) { const sh = c.shadow || c; if (bias != null) sh.bias = bias; if (normalBias != null) sh.normalBias = normalBias; }
  return prev;
}

export function noShadow(on = true) { for (const o of flats()) o.receiveShadow = !on; return flats().length; }

let plainMat = null;
export async function plain(on = true) {
  const THREE = await import("three/webgpu");
  plainMat ??= new THREE.MeshStandardNodeMaterial({ color: 0x6f6f6c, roughness: 0.9 });
  for (const o of flats()) { o.userData.roofMat ??= o.material; o.material = on ? plainMat : o.userData.roofMat; }
  return flats().length;
}
