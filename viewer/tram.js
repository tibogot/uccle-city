// Tram infrastructure from OSM (features.json, CONTRACT 0.7):
//   - overhead line: a contact wire 5.8 m above every `tram` line, hung from steel poles every ~32 m
//     standing 3.4 m to the side of the track with a cantilever arm; poles shared by close tracks;
//   - platforms: `platform` lines (railway=platform / public_transport=platform, tram=yes) become a
//     raised island 2.6 m wide, 25 cm high, with a light kerb edge; a STIB glass shelter at its middle
//     where OSM says shelter=yes, its back turned to the nearest track.
// Pole spacing, heights and widths are typical STIB values, not surveyed. Everything is instanced or
// merged: 4 draw calls for the whole tile.
import * as THREE from "three/webgpu";
import { attribute } from "three/tsl";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MODELS } from "./furniture.js";

const WIRE_H = 5.8, POLE_STEP = 32, POLE_OFF = 3.4;

function densify(line, step) {
  const out = [];
  for (let k = 1; k < line.length; k++) {
    const [ax, az] = line[k - 1], [bx, bz] = line[k];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let s = k === 1 ? 0 : 1; s <= n; s++) out.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
  }
  return out;
}

export function buildTram(feats, surface, bounds) {
  const group = new THREE.Group();
  group.name = "tram";
  const inB = (x, z) => x >= bounds.x0 && x <= bounds.x1 && z >= bounds.z0 && z <= bounds.z1;
  const tram = (feats.lines || []).filter((l) => l.kind === "tram");
  const steel = new THREE.MeshStandardNodeMaterial({ color: 0x3b4044, roughness: 0.5, metalness: 0.7 });

  // ---- contact wire: thin instanced cylinders, one per 4 m segment
  const segs = [], poles = [];
  for (const l of tram) {
    const d = densify(l.line, 4);
    let acc = 0;
    for (let i = 1; i < d.length; i++) {
      const [ax, az] = d[i - 1], [bx, bz] = d[i];
      const L = Math.hypot(bx - ax, bz - az);
      if (inB((ax + bx) / 2, (az + bz) / 2)) segs.push([ax, surface(ax, az) + WIRE_H, az, bx, surface(bx, bz) + WIRE_H, bz]);
      acc += L;
      if (acc >= POLE_STEP) {
        acc = 0;
        const nx = -(bz - az) / L, nz = (bx - ax) / L;
        const px = bx + nx * POLE_OFF, pz = bz + nz * POLE_OFF;
        if (inB(px, pz) && !poles.some((p) => (p.x - px) ** 2 + (p.z - pz) ** 2 < 64)) poles.push({ x: px, z: pz, yaw: Math.atan2(nx, nz) });
      }
    }
  }
  const up = new THREE.Vector3(0, 1, 0), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  if (segs.length) {
    const wire = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), steel, segs.length);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3(), mid = new THREE.Vector3();
    segs.forEach(([ax, ay, az, bx, by, bz], i) => {
      a.set(ax, ay, az); b.set(bx, by, bz); dir.subVectors(b, a);
      const L = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      M.compose(mid.addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, L, 1));
      wire.setMatrixAt(i, M);
    });
    wire.computeBoundingSphere();
    wire.name = "tram-wire";
    group.add(wire);
  }
  if (poles.length) {
    // pole + cantilever arm reaching back over the track (local -z points to the track)
    const parts = [
      new THREE.CylinderGeometry(0.11, 0.14, 7.0, 8).translate(0, 3.5, 0),
      new THREE.CylinderGeometry(0.035, 0.035, POLE_OFF + 0.4, 6).rotateX(Math.PI / 2).translate(0, WIRE_H + 0.35, -(POLE_OFF + 0.4) / 2),
      new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(POLE_OFF, 0.9), 5).rotateX(Math.PI / 2 - Math.atan2(0.9, POLE_OFF)).translate(0, WIRE_H + 0.8, -POLE_OFF / 2),   // stay
      new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4).translate(0, WIRE_H + 0.15, -POLE_OFF),                                            // dropper
      new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8).translate(0, 7.0, 0),
    ].map((g) => { const n = g.toNonIndexed(); n.deleteAttribute("uv"); return n; });
    const pm = new THREE.InstancedMesh(mergeGeometries(parts), steel, poles.length);
    poles.forEach((p, i) => {
      // turn the arm toward the track: yaw makes local -z point along (-nx, -nz)
      q.setFromAxisAngle(up, p.yaw);
      M.compose(new THREE.Vector3(p.x, surface(p.x, p.z), p.z), q, new THREE.Vector3(1, 1, 1));
      pm.setMatrixAt(i, M);
    });
    pm.castShadow = true;
    pm.computeBoundingSphere();
    pm.name = "tram-poles";
    group.add(pm);
  }

  // ---- platforms
  const plat = (feats.lines || []).filter((l) => l.kind === "platform" && (l.tags?.tram === "yes" || l.tags?.railway === "platform"));   // bus platforms are the sidewalk
  const slab = [], edge = [], shelters = [];
  const W = 2.6, H = 0.25;
  const nearestTrackSide = (x, z, nx, nz) => {
    let best = Infinity, side = 1;
    for (const l of tram) for (const [tx, tz] of densify(l.line, 3)) {
      const d = (tx - x) ** 2 + (tz - z) ** 2;
      if (d < best) { best = d; side = (tx - x) * nx + (tz - z) * nz >= 0 ? 1 : -1; }
    }
    return side;
  };
  const quad = (out, p0, p1, p2, p3) => out.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  for (const l of plat) {
    const d = densify(l.line, 2);
    if (d.length < 2) continue;
    let total = 0;
    for (let i = 1; i < d.length; i++) total += Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]);
    for (let i = 1; i < d.length; i++) {
      const [ax, az] = d[i - 1], [bx, bz] = d[i], L = Math.hypot(bx - ax, bz - az) || 1;
      if (!inB((ax + bx) / 2, (az + bz) / 2)) continue;
      const nx = -(bz - az) / L * W / 2, nz = (bx - ax) / L * W / 2;
      const ya = surface(ax, az) + H, yb = surface(bx, bz) + H, ya0 = ya - H - 0.1, yb0 = yb - H - 0.1;
      quad(slab, [ax - nx, ya, az - nz], [ax + nx, ya, az + nz], [bx + nx, yb, bz + nz], [bx - nx, yb, bz - nz]);
      for (const s of [1, -1]) {
        quad(edge, [ax + nx * s, ya0, az + nz * s], [bx + nx * s, yb0, bz + nz * s], [bx + nx * s, yb + 0.01, bz + nz * s], [ax + nx * s, ya + 0.01, az + nz * s]);
        // 30 cm light kerb strip on top of each edge (tactile / white line)
        const k = 0.88;
        quad(edge, [ax + nx * s * k, ya + 0.004, az + nz * s * k], [bx + nx * s * k, yb + 0.004, bz + nz * s * k], [bx + nx * s, yb + 0.004, bz + nz * s], [ax + nx * s, ya + 0.004, az + nz * s]);
      }
    }
    if (l.tags?.shelter === "yes") {
      const m = d[Math.floor(d.length / 2)], m2 = d[Math.min(d.length - 1, Math.floor(d.length / 2) + 1)];
      const L = Math.hypot(m2[0] - m[0], m2[1] - m[1]) || 1, nx = -(m2[1] - m[1]) / L, nz = (m2[0] - m[0]) / L;
      const side = nearestTrackSide(m[0], m[1], nx, nz);                          // the track is on this side
      if (inB(m[0], m[1])) shelters.push({ x: m[0], z: m[1], y: surface(m[0], m[1]) + H, yaw: Math.atan2(nx * side, nz * side) + Math.PI });
    }
  }
  const mkMesh = (arr, mat, name) => {
    if (!arr.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.castShadow = true; m.name = name;
    group.add(m);
  };
  mkMesh(slab, new THREE.MeshStandardNodeMaterial({ color: 0x8d8c88, roughness: 0.85, side: THREE.DoubleSide }), "tram-platforms");
  mkMesh(edge, new THREE.MeshStandardNodeMaterial({ color: 0xc9c6bd, roughness: 0.7, side: THREE.DoubleSide }), "tram-platform-edges");
  if (shelters.length) {
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4, metalness: 0.2 });
    mat.colorNode = attribute("aCol", "vec3");
    const sm = new THREE.InstancedMesh(MODELS.shelter(), mat, shelters.length);
    shelters.forEach((s, i) => { q.setFromAxisAngle(up, s.yaw); M.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(1, 1, 1)); sm.setMatrixAt(i, M); });
    sm.castShadow = sm.receiveShadow = true;
    sm.computeBoundingSphere();
    group.add(sm);
  }
  return { group, counts: { wireSegments: segs.length, poles: poles.length, platforms: plat.length, shelters: shelters.length } };
}
