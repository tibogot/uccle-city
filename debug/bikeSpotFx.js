// THE SKID'S MARKS AND DUST (bike lab 2, round 2: "that brutal BMX drift"). Fixed pools, made once (no light, no mesh
// added at runtime, no DynamicDrawUsage: the instance buffers are static and only the instances written this frame are
// uploaded on the frames they change):
//   marks  400 dark rubber / scraped-dirt streaks laid behind the locked rear wheel (a ring buffer: the oldest goes),
//          1.2 cm over the ground with a polygon offset (decals, never coplanar with it), lighter scrapes on dirt
//   dust   48 puffs thrown up from the rear wheel while it slides (gravel-brown on loose ground, a thin grey smoke on
//          asphalt), growing, rising and FADING out (round 3, owner: "too solid": a per-puff opacity, faint and soft-edged,
//          0.3-0.8 s)
// (round 3, owner: "skid marks lying flat on slopes") each streak is laid IN the ground's plane: its along axis from the
// two ends' heights, its across axis from the ground either side, 1.2 cm off along the normal (streakBasis, tested by
// tools/bike/spotTest.mjs)
// The skid's sound is the bike's own (viewer/bike/bikeAudio.js reads s.skid; off by default, the speaker button).
import * as THREE from "three/webgpu";
import { float, normalView, pow, abs, instancedBufferAttribute } from "three/tsl";

const MARKS = 400, PUFFS = 48;
/** a streak's frame on the ground from (ax, az) to (bx, bz): fills X (across), Y (the normal), Z (along, with its
 *  slope), P (the centre, 1.2 cm off the ground along the normal); returns the streak's length in 3D */
export function streakBasis(groundAt, ax, az, bx, bz, X, Y, Z, P) {
  const ay = groundAt(ax, az), by = groundAt(bx, bz), cx = (ax + bx) / 2, cz = (az + bz) / 2;
  Z.set(bx - ax, by - ay, bz - az); const L = Z.length(); Z.multiplyScalar(1 / (L || 1));
  // across: the ground 6 cm either side of the centre, square to the streak in plan
  const hx = Z.z, hz = -Z.x, hl = Math.hypot(hx, hz) || 1, ux = hx / hl * 0.06, uz = hz / hl * 0.06;
  X.set(ux * 2, groundAt(cx + ux, cz + uz) - groundAt(cx - ux, cz - uz), uz * 2).normalize();
  Y.crossVectors(Z, X).normalize(); if (Y.y < 0) Y.negate();
  X.crossVectors(Y, Z).normalize();
  P.set(cx, (ay + by) / 2, cz).addScaledVector(Y, 0.012);
  return L;
}
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
  // (round 3: a little emissive - dust scatters the sky: in a shadow a puff is a pale haze, not a dark disc)
  const dm = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false, roughness: 1, emissive: 0x3a3630 });
  // (a soft puff: see-through at its rim, thicker at its middle - no hard silhouette; round 3: fainter (0.14 at its
  // thickest), the rim falls off faster, and each puff fades in and out with its own opacity - a static instance
  // attribute re-sent on the frames puffs live, 48 floats)
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS), 1);
  dm.opacityNode = float(0.2).mul(pow(abs(normalView.z), float(2.8))).mul(instancedBufferAttribute(alpha));
  const dust = new THREE.InstancedMesh(dg, dm, PUFFS);
  dust.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  dust.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS * 3), 3);
  for (let i = 0; i < PUFFS; i++) dust.setMatrixAt(i, hide);
  dust.frustumCulled = false; dust.castShadow = false; dust.name = "skid-dust";
  scene.add(dust);
  const P = Array.from({ length: PUFFS }, () => ({ t: 9, life: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0.2 }));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Vp = new THREE.Vector3(), Vs = new THREE.Vector3(), C = new THREE.Color();
  const BX = new THREE.Vector3(), BY = new THREE.Vector3(), BZ = new THREE.Vector3();
  let mi = 0, pi = 0, last = null, acc = 0;
  const S = { on: true, marks: 0, puffs: 0 };
  return {
    S, marks, dust, alpha,
    update(s, dt) {
      if (!S.on) return;
      // ---- marks: behind the locked rear wheel, every 12 cm
      const rx = s.wheelPos[2], rz = s.wheelPos[3], down = s.contact[1] && s.skid && !s.crashed;
      const loose = s.surf[1] >= 2;
      if (down) {
        if (last) {
          const dx = rx - last.x, dz = rz - last.z, L = Math.hypot(dx, dz);
          // (a jump of more than 1 m in a frame is a reset / a spot change, not a slide: start the streak over)
          if (L > 1) last = { x: rx, z: rz };
          else if (L > 0.12) {
            // (round 3: in the ground's plane - on a ramp, a roller, the hill - not flat)
            const L3 = streakBasis(groundAt, last.x, last.z, rx, rz, BX, BY, BZ, Vp), w = loose ? 0.09 : 0.055;
            M.makeBasis(BX.multiplyScalar(w), BY, BZ.multiplyScalar(L3 + 0.03)).setPosition(Vp);
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
          p.t = 0; p.life = loose ? 0.5 + Math.random() * 0.3 : 0.3 + Math.random() * 0.2;
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
        if (p.t >= p.life) { if (alpha.array[i] !== 0) { alpha.array[i] = 0; any = true; } continue; }
        p.t += dt; any = true;
        const k = p.t / p.life, drag = Math.exp(-2.5 * dt);
        p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag + 0.15 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const r = p.t >= p.life ? 0 : p.r * (0.7 + 1.6 * k);
        // (in over the first 12 %, out over the rest: a puff never pops in or out)
        alpha.array[i] = p.t >= p.life ? 0 : Math.min(1, k / 0.12) * Math.pow(1 - Math.min(1, k), 1.5);
        M.compose(Vp.set(p.x, p.y, p.z), Q.identity(), Vs.set(r, r * 0.75, r));
        dust.setMatrixAt(i, M);
      }
      if (any) { dust.instanceMatrix.needsUpdate = true; alpha.needsUpdate = true; }
    },
    clear() { for (let i = 0; i < MARKS; i++) marks.setMatrixAt(i, hide); marks.instanceMatrix.needsUpdate = true; },
  };
}
