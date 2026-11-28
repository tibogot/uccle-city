// THE SKID'S MARKS AND DUST (bike lab 2, round 2: "that brutal BMX drift"). Fixed pools, made once (no light, no mesh
// added at runtime, no DynamicDrawUsage: the instance buffers are static and only the instances written this frame are
// uploaded on the frames they change):
//   marks  400 dark rubber / scraped-dirt streaks laid behind the locked rear wheel (a ring buffer: the oldest goes),
//          1.2 cm over the ground with a polygon offset (decals, never coplanar with it), lighter scrapes on dirt
//   dust   48 puffs thrown up from the rear wheel while it slides (gravel-brown on loose ground, a thin grey smoke on
//          asphalt), growing, rising, shrinking out over ~1 s
// The skid's sound is the bike's own (viewer/bike/bikeAudio.js reads s.skid; off by default, the speaker button).
import * as THREE from "three/webgpu";
import { float, normalView, pow, abs } from "three/tsl";

const MARKS = 400, PUFFS = 48;
export function createSkidFx(scene, groundAt) {
  // ---- marks: a unit quad on the ground (x across, z along), one instance per streak
  const mg = new THREE.PlaneGeometry(1, 1); mg.rotateX(-Math.PI / 2);
  const mm = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  // (a colour per instance: rubber black on hard ground, a darker scrape on dirt)
  // (the instance colour multiplies the material colour: three's InstanceNode)
  const marks = new THREE.InstancedMesh(mg, mm, MARKS);
  marks.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  marks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MARKS * 3), 3);
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MARKS; i++) marks.setMatrixAt(i, hide);
  marks.frustumCulled = false; marks.renderOrder = 2; marks.name = "skid-marks";
  scene.add(marks);
  // ---- dust: a low icosphere, lit, see-through
  const dg = new THREE.IcosahedronGeometry(1, 3);
  const dm = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 1 });
  // (a soft puff: see-through at its rim, thicker at its middle - no hard silhouette)
  dm.opacityNode = float(0.26).mul(pow(abs(normalView.z), float(2.2)));
  const dust = new THREE.InstancedMesh(dg, dm, PUFFS);
  dust.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  dust.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS * 3), 3);
  for (let i = 0; i < PUFFS; i++) dust.setMatrixAt(i, hide);
  dust.frustumCulled = false; dust.castShadow = false; dust.name = "skid-dust";
  scene.add(dust);
  const P = Array.from({ length: PUFFS }, () => ({ t: 9, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.2 }));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Vp = new THREE.Vector3(), Vs = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  let mi = 0, pi = 0, last = null, acc = 0;
  const S = { on: true, marks: 0, puffs: 0 };
  return {
    S, marks, dust,
    update(s, dt) {
      if (!S.on) return;
      // ---- marks: behind the locked rear wheel, every 12 cm
      const rx = s.wheelPos[2], rz = s.wheelPos[3], down = s.contact[1] && s.skid && !s.crashed;
      const loose = s.surf[1] >= 2;
      if (down) {
        if (last) {
          const dx = rx - last.x, dz = rz - last.z, L = Math.hypot(dx, dz);
          if (L > 0.12) {
            const gy = groundAt((rx + last.x) / 2, (rz + last.z) / 2) + 0.012;
            Q.setFromAxisAngle(UP, Math.atan2(dx, dz));
            M.compose(Vp.set((rx + last.x) / 2, gy, (rz + last.z) / 2), Q, Vs.set(loose ? 0.09 : 0.055, 1, L + 0.03));
            marks.setMatrixAt(mi, M);
            C.set(loose ? 0x3b2c1e : 0x141414); marks.instanceColor.setXYZ(mi, C.r, C.g, C.b);
            // (the whole small buffer re-sent on the frames a streak is laid: 25 kB; a range upload left the first
            // streaks unseen on screen)
            marks.instanceMatrix.needsUpdate = true; marks.instanceColor.needsUpdate = true;
            mi = (mi + 1) % MARKS; S.marks++;
            last = { x: rx, z: rz };
          }
        } else last = { x: rx, z: rz };
      } else last = null;
      // ---- dust: thrown while sliding (more on loose ground, with the speed)
      const v = Math.hypot(s.vx, s.vz);
      if (down && v > 1.5) {
        acc += dt * (loose ? 26 : 9) * Math.min(1.5, v / 5);
        while (acc >= 1) {
          acc -= 1;
          const p = P[pi]; pi = (pi + 1) % PUFFS;
          p.t = 0; p.life = loose ? 0.9 + Math.random() * 0.6 : 0.6 + Math.random() * 0.3;
          p.x = rx + (Math.random() - 0.5) * 0.2; p.z = rz + (Math.random() - 0.5) * 0.2; p.y = groundAt(rx, rz) + 0.1;
          p.vx = -s.vx * 0.15 + (Math.random() - 0.5) * 0.8 + s.slip * Math.cos(s.heading) * 0.2; p.vz = -s.vz * 0.15 + (Math.random() - 0.5) * 0.8 - s.slip * Math.sin(s.heading) * 0.2; p.vy = 0.4 + Math.random() * 0.5;
          p.r = loose ? 0.16 + Math.random() * 0.12 : 0.1 + Math.random() * 0.06;
          C.set(loose ? 0xc2ab88 : 0xc9c9c4); dust.instanceColor.setXYZ(P.indexOf(p), C.r, C.g, C.b);
          dust.instanceColor.needsUpdate = true;
          S.puffs++;
        }
      }
      let any = false;
      for (let i = 0; i < PUFFS; i++) {
        const p = P[i];
        if (p.t >= p.life) continue;
        p.t += dt; any = true;
        const k = p.t / p.life, drag = Math.exp(-2.5 * dt);
        p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag + 0.15 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const r = p.t >= p.life ? 0 : p.r * (0.6 + 1.8 * k) * (k > 0.7 ? (1 - k) / 0.3 : 1);
        M.compose(Vp.set(p.x, p.y, p.z), Q.identity(), Vs.set(r, r * 0.75, r));
        dust.setMatrixAt(i, M);
      }
      if (any) dust.instanceMatrix.needsUpdate = true;
    },
    clear() { for (let i = 0; i < MARKS; i++) marks.setMatrixAt(i, hide); marks.instanceMatrix.needsUpdate = true; },
  };
}
