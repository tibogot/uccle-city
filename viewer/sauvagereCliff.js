// THE SAUVAGERE CLIFF, built by RULES on the measured ground (round 3, after the owner's photo o01):
// the mound of the pond's east shore from the UrbIS DTM 2021 (models/parkkit/sauvagere_site.json, lab frame: the
// water at y 0, the pond toward -z, screen-right = south when looking east from the pond like o01), covered with
// rock-kit pieces placed row by row up the face, and plants on the up-facing ledges.
//
// Rules (o01): a MOUND rising from the water to the exedra; blocks of many sizes, tilted (up to +-25 deg), stacked,
// some pushed out (overhangs), broken tops, no two neighbours alike; vertical pillars only right of centre; the
// grotto mouth at the water line left of centre; low ledges along the water; smaller blocks and broken tops on the
// upper edge; the exedra's footprint kept clear on the top. Deterministic (seeded).
import * as THREE from "three/webgpu";

export async function loadSauvagereSite() {
  return fetch(new URL("../models/parkkit/sauvagere_site.json", import.meta.url)).then((r) => r.json());
}

/** bilinear height and gradient of the site grid */
export function siteSampler(site) {
  const { x0, z0, step, cols, rows, heights } = site;
  const H = (i, j) => heights[Math.min(rows - 1, Math.max(0, j)) * cols + Math.min(cols - 1, Math.max(0, i))];
  const h = (x, z) => {
    const c = (x - x0) / step, r = (z - z0) / step, i = Math.floor(c), j = Math.floor(r), fc = c - i, fr = r - j;
    return (H(i, j) * (1 - fc) + H(i + 1, j) * fc) * (1 - fr) + (H(i, j + 1) * (1 - fc) + H(i + 1, j + 1) * fc) * fr;
  };
  const grad = (x, z) => [(h(x + 0.5, z) - h(x - 0.5, z)), (h(x, z + 0.5) - h(x, z - 0.5))];
  return { h, grad };
}

/** the terrain mesh of the site (soil under the rocks; the pond is drawn separately) */
export function siteTerrain(site, material) {
  const { x0, z0, step, cols, rows, heights } = site;
  const g = new THREE.PlaneGeometry((cols - 1) * step, (rows - 1) * step, cols - 1, rows - 1).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    p.setXYZ(i, x0 + c * step, heights[r * cols + c] - 0.12, z0 + r * step);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true; m.name = "sauvagere terrain";
  return m;
}

export function placeSauvagereCliff(field, site, plants = null, { seed = 7, density = 1 } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const U = (a, b) => a + (b - a) * rnd();
  const { h, grad } = siteSampler(site);
  const kit = field.kit, have = (n) => !!kit.pieces[n];
  const ex = site.exedra.lab, exR = site.exedra.radius + 0.6;
  const placed = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const recent = [];
  const pick = (choices) => {
    const ok = choices.filter((c) => have(c) && !recent.includes(c));
    const c = (ok.length ? ok : choices.filter(have))[Math.floor(rnd() * (ok.length || choices.filter(have).length))];
    recent.push(c); if (recent.length > 2) recent.shift();
    return c;
  };
  const put = (name, x, z, { scale = 1, sink = 0.25, tilt = 0, yawJitter = 0.35, push = 0, lift = 0 } = {}) => {
    const [gx, gz] = grad(x, z);
    const down = Math.atan2(-gx, -gz);                 // the downhill direction (toward the pond, about -z)
    const y = h(x, z) - sink * scale + lift;
    const yaw = down + U(-yawJitter, yawJitter);
    // the pieces' front is +z: facing downhill means rotating +z onto the downhill vector
    e.set(U(-tilt, tilt), yaw, U(-tilt, tilt), "YXZ"); q.setFromEuler(e);
    pos.set(x + Math.sin(down) * push, y, z + Math.cos(down) * push);
    sc.set(scale * U(0.9, 1.1), scale * U(0.9, 1.15), scale * U(0.9, 1.1));
    m.compose(pos, q, sc);
    field.add(name, m); placed.push({ name, matrix: m.clone() });
  };
  const T = (deg) => (deg * Math.PI) / 180;
  // walk the shore from south (lab x -15) to north (+15); for each column find the face: the water edge and the top
  for (let x = -15; x <= 15;) {
    const right = x < -1 && x > -10;                      // right of centre in o01: the pillars
    const farRight = x <= -10;
    let zw = -6; while (h(x, zw) < 0.15 && zw < 12) zw += 0.25;
    let zt = zw; while (zt < 14) { const [gx, gz] = grad(x, zt); if (Math.hypot(gx, gz) < 0.25 && h(x, zt) > 2.5) break; zt += 0.25; }
    const top = h(x, zt);
    const w = right ? U(1.7, 2.6) : U(2.0, 3.0);
    // 1) the water line: ledges, the grotto (left of centre, o01), dark slabs
    if (Math.abs(x - 3.5) < 1.6 && !placed.some((p) => p.name === "rk2_grotto")) put("rk2_grotto", x, zw + 0.6, { scale: 1.05, sink: 0.15, tilt: T(4), yawJitter: 0.15 });
    else put(pick(["rk2_foot", "rk2_foot", "nat_slab", "rk3_block_s"]), x + U(-0.4, 0.4), zw - U(0.2, 0.6), { scale: U(0.8, 1.15), sink: 0.25, tilt: T(10) });
    // 2) up the face, rows every ~1.2-1.8 m of height
    for (let y = U(0.9, 1.4); y < top - 0.6; y += U(1.3, 1.9)) {
      let z = zw; while (h(x, z) < y && z < zt) z += 0.2;
      const xx = x + U(-0.6, 0.6);
      if (Math.hypot(xx - ex[0], z - ex[1]) < exR && y > top - 1.2) continue;
      if (right) put(pick(["rk2_pillars_tall", "rk2_pillars_low", "rk2_pillar", "rk3_broken", "rk2_pillars_low"]), xx, z + 0.8, { scale: U(0.95, 1.3), sink: 0.6 + y * 0.15, tilt: T(6), push: rnd() < 0.3 ? U(0.2, 0.5) : 0, yawJitter: 0.25 });
      else if (farRight) put(pick(["rk3_block_s", "rk3_block", "nat_boulder"]), xx, z, { scale: U(0.7, 1.1), sink: 0.35, tilt: T(20) });
      else put(pick(["rk3_block", "rk3_wedge", "rk2_slabs", "rk3_block_s", "rk3_broken", "rk3_block"]), xx, z + 0.4, { scale: U(1.0, 1.6), sink: 0.45, tilt: T(25), push: rnd() < 0.35 ? U(0.25, 0.6) : 0 });
    }
    // 3) the upper edge: smaller blocks and broken tops (clear of the exedra)
    const xe = x + U(-0.5, 0.5);
    if (Math.hypot(xe - ex[0], zt - ex[1]) > exR) put(pick(right ? ["rk3_broken", "rk2_pillar", "rk3_block_s"] : ["rk3_block_s", "rk3_broken", "rk2_cap", "rk3_block_s"]), xe, zt - 0.3, { scale: U(0.6, 1.0), sink: 0.35, tilt: T(18) });
    x += w / density;
  }
  // 4) plants on the up-facing ledges of the placed pieces (LOD2 triangles facing up), area-weighted, by height
  if (plants) {
    const out = { fern: [], grass: [], ivy: [] };
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3(), M = new THREE.Matrix4();
    for (const { name, matrix } of placed) {
      const prims = kit.pieces[name].lods[kit.pieces[name].lods.length - 1];
      for (const { geometry } of prims) {
        const P = geometry.attributes.position, I = geometry.index.array;
        for (let t = 0; t < I.length; t += 3) {
          a.fromBufferAttribute(P, I[t]).applyMatrix4(matrix); b.fromBufferAttribute(P, I[t + 1]).applyMatrix4(matrix); c.fromBufferAttribute(P, I[t + 2]).applyMatrix4(matrix);
          n.subVectors(b, a).cross(p.subVectors(c, a)); const area = n.length() / 2; n.normalize();
          if (n.y < 0.62 || a.y < 0.15) continue;
          let k = area * 1.4 * density;
          while (k > 0) {
            if (rnd() > k) break; k -= 1;
            const r1 = Math.sqrt(rnd()), r2 = rnd();
            p.copy(a).multiplyScalar(1 - r1).addScaledVector(b, r1 * (1 - r2)).addScaledVector(c, r1 * r2);
            if (Math.hypot(p.x - ex[0], p.z - ex[1]) < exR - 0.4) continue;
            const kind = p.y < 2.2 ? (rnd() < 0.7 ? "fern" : "ivy") : rnd() < 0.45 ? "grass" : rnd() < 0.6 ? "ivy" : "fern";
            M.compose(p.clone().setY(p.y - 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.283, 0)), new THREE.Vector3().setScalar(U(0.7, 1.4)));
            out[kind].push(M.clone());
          }
        }
      }
    }
    // the mound's top and gentle slopes: grass and ivy (not on the exedra, not in the water)
    for (let i = 0; i < 260 * density; i++) {
      const x = U(-16, 16), z = U(-1, 12), y = h(x, z), [gx, gz] = grad(x, z);
      if (y < 0.3 || Math.hypot(gx, gz) > 0.6 || Math.hypot(x - ex[0], z - ex[1]) < exR) continue;
      M.compose(new THREE.Vector3(x, y - 0.12, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6.283, 0)), new THREE.Vector3().setScalar(U(0.8, 1.5)));
      out[rnd() < 0.6 ? "grass" : "ivy"].push(M.clone());
    }
    for (const [k, list] of Object.entries(out)) plants.set(k, list);
    plants.commit();
  }
  return placed;
}
