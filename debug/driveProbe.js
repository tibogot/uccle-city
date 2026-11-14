// DRIVE PROBE (docs/collisions/DRIVE_FIX.md): what is drawn under a point against what the car stands on.
//   const P = await import("/debug/driveProbe.js"); P.probe(x, z)  -> { drive, drive2, deck, terrain, hits: [{ y, name, up }] }
// hits = every mesh triangle under (x, z) (a vertical ray through the scene, both faces), highest first.
import * as THREE from "three/webgpu";

export function probe(x, z, { from = 400 } = {}) {
  const v = window.viewer, d = window.__driver, w = v.world, t = w.at(x, z);
  const rc = new THREE.Raycaster(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0), 0, 1000);
  rc.firstHitOnly = false;
  const hits = [];
  const sides = new Map(), list = [];
  // the ground-like meshes only (no instanced trees / props: a ray through thousands of instances is slow)
  v.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.visible && o.material && !Array.isArray(o.material)) { sides.set(o, o.material.side); list.push(o); } });
  // both faces (the test's own rasteriser ignores the material side)
  for (const [o] of sides) o.material.side = THREE.DoubleSide;
  try {
    for (const h of rc.intersectObjects(list, false)) {
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null;
      hits.push({ y: +h.point.y.toFixed(2), name: `${h.object.parent?.name || ""}/${h.object.name}`, up: n ? +n.y.toFixed(2) : null });
    }
  } finally { for (const [o, s] of sides) o.material.side = s; }
  const hm = t.hm;
  return { tile: t.name, drive: +d.ground(x, z).toFixed(2), deck: w.deckY(x, z), terrain: +hm.surface(x, z).toFixed(2), ground: +hm.ground(x, z).toFixed(2), hits: hits.slice(0, 12) };
}

/** The drive grid's two layers at the 1 m nodes round (x, z): [[x, z, top, low|null, terrain]] (m TAW). */
export function grid(x, z, r = 2) {
  const t = window.viewer.world.at(x, z), h = t.hm.h, Y = t.hm.y, g = t.drive.ground, out = [];
  const c0 = Math.round((x - h.x0) / h.step), r0 = Math.round((z - h.z0) / h.step);
  for (let rr = r0 - r; rr <= r0 + r; rr++) for (let c = c0 - r; c <= c0 + r; c++) {
    const k = rr * h.cols + c;
    out.push([h.x0 + c * h.step, h.z0 + rr * h.step, +(Y[k] + g.delta[k] / 100).toFixed(2), g.delta2[k] === 65535 ? null : +(Y[k] + g.delta2[k] / 100).toFixed(2), +Y[k].toFixed(2)]);
  }
  return out;
}
