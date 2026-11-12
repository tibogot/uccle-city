// impostorKit / contact.js: a cheap contact shadow under ground objects (parked cars), ONE instanced draw for all.
// Mr.doob's slop-newyork does this for every car and bus (his js/tsl-materials.js createContactShadowMaterial, a soft
// rounded-box SDF on a quad flat on the asphalt, js/traffic.js: footprint + 0.33 m wide, + 0.55 m long, 1.8 cm up);
// docs/SLOP_NEWYORK_AUDIT.md item 10. It grounds objects beyond the sun's shadow range, where the mesh LODs stop
// casting and impostors never cast. Transparent (multiplied darkening by alpha blending), no depth write, drawn after
// the opaque scene. Instance data: csPos (centre on the ground, world), csData (yaw, half width, half length, band:
// the lab's jitter-meter groups, hidden through `hideMask` like the impostor field).
import * as THREE from "three/webgpu";
import { Fn, attribute, uniform, vec2, vec3, float, abs, max, min, length, smoothstep, clamp, floor, mod, pow, select, positionGeometry, uv, color } from "three/tsl";

/** items: [{ x, y, z (the footprint's centre on the ground), yaw, hw, hl (half width / length of the body), band }];
 *  maxDist / eye: TSL nodes (cull past maxDist from eye). */
export function contactShadows(items, { strength = 1, hideMask = uniform(0), lift = 0.018, maxDist = null, eye = null } = {}) {
  const n = items.length, cap = Math.max(n, 1);
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3), data = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
  items.forEach((c, i) => { pos.array.set([c.x, c.y + lift, c.z], i * 3); data.array.set([c.yaw, c.hw + 0.165, c.hl + 0.275, c.band ?? 0], i * 4); });
  geo.setAttribute("csPos", pos); geo.setAttribute("csData", data);
  const P = attribute("csPos", "vec3"), D = attribute("csData", "vec4");
  const cy = D.x.cos(), sy = D.x.sin();
  const q = vec3(positionGeometry.x.mul(D.y.mul(2)), 0, positionGeometry.z.mul(D.z.mul(2)));
  const hidden = mod(floor(hideMask.div(pow(2, D.w))), 2).greaterThan(0.5);
  let wpos = P.add(vec3(cy.mul(q.x).add(sy.mul(q.z)), 0, cy.mul(q.z).sub(sy.mul(q.x))));
  const U = { strength: uniform(strength) };
  if (maxDist && eye) wpos = select(P.sub(eye).length().greaterThan(maxDist), P, wpos);
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  m.positionNode = select(hidden, P, wpos);
  m.colorNode = color(0x020305);
  m.opacityNode = Fn(() => {
    const p = abs(uv().sub(0.5).mul(2));
    const qq = p.sub(vec2(0.64, 0.70));
    const d = length(max(qq, vec2(0))).add(min(max(qq.x, qq.y), 0));
    const chassis = smoothstep(0.30, -0.14, d);
    const core = smoothstep(0.76, 0.12, p.x).mul(smoothstep(0.82, 0.16, p.y));
    const wheels = smoothstep(0.22, 0.0, length(p.sub(vec2(0.68, 0.56)).mul(vec2(1.4, 1.0))));
    return clamp(chassis.mul(0.72).add(core.mul(0.18)).add(wheels.mul(0.18)), 0, 0.88).mul(U.strength);
  })();
  m.userData.shared = true;
  const mesh = new THREE.InstancedMesh(geo, m, cap);
  mesh.count = n; mesh.frustumCulled = false; mesh.renderOrder = 998; mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = "contact-shadows";
  return { mesh, U, dispose() { geo.dispose(); m.dispose(); } };
}
