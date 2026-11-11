// WINTER EXTRAS: snow on branches and evergreen foliage (hooks for the city's trees and claude/foliage), snow caps with
// real thickness on narrow ledges (sills, cornices, parapets, plinths: one overhead cell or less, the volumetric layer
// cuts them), icicles under eaves on cold days and drips from eaves when it melts. All GPU: instanced meshes whose
// size / visibility come from the weather uniforms (wx); CPU work only at build time.
import * as THREE from "three/webgpu";
import { float, vec2, vec3, vec4, mix, smoothstep, clamp, max, min, abs, sin, cos, fract, sqrt, normalize, length, select, uv,
  positionLocal, normalLocal, normalWorld, positionWorld, positionGeometry, instanceIndex, attribute, cameraPosition, cameraViewMatrix,
  fwidth, uniform, hash } from "three/tsl";
import { wx } from "./weatherState.js";
import { glint, snowMask, SNOW_ALBEDO } from "./surfaceWeather.js";
import { noise2D, hash2D } from "../tslkit.js";

const toView = (n) => normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);
/** how much snow can sit on a thin, up-facing surface right now (0..1): a dusting whitens, 5 cm fills */
const thinCover = () => wx.uSnowCover.mul(smoothstep(0.0, 0.05, wx.uSnowDepth));

/**
 * SNOW ON BRANCHES: call on a branch / bark material that weatherize() already processed (its colour carries the
 * up-facing white cover). Adds THICKNESS: the up-facing half of each branch is pushed out along its normal by up to
 * `max` metres (a ridge of snow on top of the limb), less on thin twigs if `radiusAttr` is given. Works for instanced
 * trees (the push is in local space; trees only turn about y).
 */
export function snowOnBranches(m, { max: mx = 0.045, radiusAttr = null } = {}) {
  // (r187 applies instancing BEFORE positionNode, which replaces positionLocal: build on the instanced positionLocal /
  // normalLocal so instanced trees keep their transforms)
  const up = smoothstep(0.15, 0.85, normalLocal.y);
  let t = min(wx.uSnowDepth.mul(0.35), float(mx)).mul(thinCover()).mul(up);
  if (radiusAttr) t = t.mul(clamp(attribute(radiusAttr, "float").mul(12), 0.3, 1));
  m.positionNode = (m.positionNode ?? positionLocal).add(normalLocal.mul(t));
  return m;
}

/**
 * SNOW ON EVERGREEN FOLIAGE (hedges, conifers, ivy; the hook for claude/foliage): leaf cards face every way, so the
 * card normal says little. The cover comes from how high the point sits in its plant (`heightNode` 0 base .. 1 top,
 * or world up of the normal when omitted), the overhead exposure is not used (the plant is its own roof), and a
 * clumpy noise so it collects in clumps on the outer, upper leaves.
 */
export function snowOnFoliage(m, { heightNode = null } = {}) {
  const base = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
  const P = positionWorld;
  const up = heightNode ? smoothstep(0.35, 0.95, heightNode) : smoothstep(0.1, 0.8, abs(normalWorld.y));
  const clump = noise2D(P.xz.mul(4.0).add(P.y.mul(3.0))).mul(0.6).add(noise2D(P.xz.mul(13.0)).mul(0.4));
  const cov = smoothstep(0.35, 0.6, up.mul(1.3).mul(wx.uSnowCover).sub(clump.mul(0.5)));
  m.colorNode = mix(base, SNOW_ALBEDO.mul(0.95), cov);
  m.roughnessNode = mix(m.roughnessNode ?? float(m.roughness), float(0.75), cov);
  return m;
}

/** A rounded snow cap: unit box footprint (x along the ledge -0.5..0.5, z across -0.5..0.5), height 0..1, a
 *  superellipse profile across (full in the middle, round to the edges) and rounded ends. */
function capGeometry(nx = 16, nz = 8) {
  const pos = [], idx = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const u = i / nx - 0.5, v = j / nz - 0.5;
    const ex = Math.min(1, (0.5 - Math.abs(u)) / 0.08), ez = 1 - Math.pow(Math.abs(v) * 2, 3);
    const h = Math.sqrt(Math.max(0, ez)) * Math.sqrt(Math.max(0, ex));
    pos.push(u, h, v * 1.04);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = i * (nz + 1) + j, b = a + nz + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/**
 * SNOW CAPS on ledges: ledges = [{ x, y, z, len, width, axis: "x" | "z" }] (top-centre of the ledge's upper face).
 * One instanced draw; height = min(0.8 x depth, 0.55 x width) (snow on a ledge stands about as tall as it is wide
 * before it slumps), hidden below 5 mm.
 */
export function createLedgeCaps(ledges) {
  const geo = capGeometry();
  const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
  const n = ledges.length;
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  // per-instance placement in our own attributes: r187 applies instanceMatrix BEFORE positionNode, which replaces it
  const A = new Float32Array(Math.max(1, n) * 4), B = new Float32Array(Math.max(1, n) * 2);
  ledges.forEach((L, k) => { A.set([L.x, L.y, L.z, L.len], k * 4); B.set([L.width, L.axis === "z" ? 1 : 0], k * 2); });
  geo.setAttribute("aCap", new THREE.InstancedBufferAttribute(A, 4));
  geo.setAttribute("aCapW", new THREE.InstancedBufferAttribute(B, 2));
  const cap = attribute("aCap", "vec4"), cw = attribute("aCapW", "vec2"), w = cw.x;
  const h = min(wx.uSnowDepth.mul(0.8), w.mul(0.55)).mul(thinCover());
  const g = positionGeometry;
  const along = g.x.mul(cap.w), across = g.z.mul(w);
  mat.positionNode = vec3(cap.x, cap.y.add(0.002), cap.z).add(select(cw.y.greaterThan(0.5), vec3(across, g.y.mul(h), along), vec3(along, g.y.mul(h), across)));
  const P = positionWorld;
  const fw = fwidth(P.x).add(fwidth(P.z)).mul(0.5).add(0.0002);
  const gl = glint(P, fw);
  mat.colorNode = SNOW_ALBEDO.mul(noise2D(P.xz.mul(9.0)).mul(0.05).add(0.97));
  mat.roughnessNode = mix(float(0.74), float(0.15), gl.w);
  mat.normalNode = normalize(mix(toView(normalize(normalWorld)), toView(gl.xyz), gl.w));
  mesh.count = n; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.name = "ledge-caps";
  return { mesh, update() { mesh.visible = n > 0 && wx.uSnowDepth.value > 0.005 && wx.uSnowCover.value > 0.2; } };
}

/**
 * ICICLES + DRIPS at the eave sites the overhead map found (map.eaves: x, y, z, dx, dz, drop per site).
 * Icicles: tapered cones hanging just inside the eave, length = wx.uIcicle x (0.15 .. 0.7 m per site), a few
 * clustered per site; ice material (pale blue, glossy, a little see-through).
 * Drips: tiny streaks falling from the same sites while it melts (wx.uDrip), vertex-animated (no compute): each drop
 * has its own phase and falls the site's real drop height with gravity, fading as it reaches the ground.
 */
export function createEaveIce(map, { perSite = 2, maxSites = 700 } = {}) {
  const E = map.eaves ?? new Float32Array(0);
  const sites = Math.min(maxSites, E.length / 6);
  const step = Math.max(1, Math.floor(E.length / 6 / Math.max(1, sites)));
  const list = [];
  for (let k = 0; k < E.length / 6 && list.length < sites; k += step) list.push([E[k * 6], E[k * 6 + 1], E[k * 6 + 2], E[k * 6 + 3], E[k * 6 + 4], E[k * 6 + 5]]);
  // ---- icicles
  const cone = new THREE.ConeGeometry(1, 1, 7, 1, true).rotateX(Math.PI).translate(0, -0.5, 0);   // apex down, top at y = 0
  const im = new THREE.MeshStandardNodeMaterial({ roughness: 0.08, metalness: 0, transparent: true, opacity: 0.88 });
  const n = list.length * perSite;
  const ice = new THREE.InstancedMesh(cone, im, Math.max(1, n));
  const R = new Float32Array(Math.max(1, n));
  const S4 = new Float32Array(Math.max(1, n) * 4);
  let k = 0, seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [x, y, z, dx, dz] of list) for (let c = 0; c < perSite; c++) {
    const off = (rnd() - 0.5) * 0.11;
    // 6 cm inside the edge, under the roof slab / gutter (~13 cm below the top at the edge)
    S4.set([x - dx * 0.06 + (dz ? off : 0), y - 0.13, z - dz * 0.06 + (dx ? off : 0), rnd()], k * 4); k++;
  }
  cone.setAttribute("aIce", new THREE.InstancedBufferAttribute(S4, 4));
  const ic = attribute("aIce", "vec4"), r = ic.w;
  const len = wx.uIcicle.mul(r.mul(r).mul(0.55).add(0.15)).mul(smoothstep(0.25, 0.35, r));   // a third of the sites stay bare
  const rad = len.mul(0.06).add(0.004);
  im.positionNode = ic.xyz.add(vec3(positionGeometry.x.mul(rad), positionGeometry.y.mul(len), positionGeometry.z.mul(rad)));
  im.colorNode = mix(vec3(0.55, 0.68, 0.78), vec3(0.85, 0.9, 0.95), positionGeometry.y.negate());
  // (normals: the cone's own, unscaled: fine for a thin cone)
  ice.count = n; ice.castShadow = false; ice.frustumCulled = false; ice.name = "icicles";
  // ---- drips
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const dm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const drips = new THREE.InstancedMesh(quad, dm, Math.max(1, list.length));
  const D = new Float32Array(Math.max(1, list.length) * 4);
  list.forEach(([x, y, z, dx, dz, drop], i) => { D.set([x - dx * 0.05, y - 0.13, z - dz * 0.05, Math.min(drop, 12)], i * 4); });
  quad.setAttribute("aSite", new THREE.InstancedBufferAttribute(D, 4));
  const site = attribute("aSite", "vec4");
  const ph = hash(instanceIndex.add(7));
  const T = sqrt(site.w.mul(2 / 9.81));                                   // fall time for this drop height
  const period = T.add(ph.mul(2.5).add(0.6)).div(max(wx.uDrip, 0.05));     // a drop every 1-3 s per site when melting fast
  const t = fract(wx.uTime.div(period).add(ph)).mul(period);
  const fall = min(t, T);
  const yDrop = site.y.sub(fall.mul(fall).mul(4.905));
  const C = vec3(site.x, yDrop, site.z);
  const dist = length(cameraPosition.sub(C));
  const toCam = normalize(cameraPosition.sub(C));
  const side = normalize(vec3(toCam.z.negate(), 0, toCam.x).add(vec3(1e-4, 0, 0)));
  const L = min(fall.mul(9.81).mul(0.03), float(0.25)).add(0.02);        // motion streak grows with speed
  const wPx = max(float(0.004), dist.mul(0.0012).mul(1.4));
  dm.positionNode = C.add(vec3(0, positionGeometry.y.mul(L).negate(), 0)).add(side.mul(positionGeometry.x.mul(wPx)));
  const f = uv();
  dm.colorNode = vec3(0.75, 0.8, 0.85);
  dm.opacityNode = smoothstep(1.0, 0.0, abs(f.x.mul(2).sub(1))).mul(float(0.004).div(wPx)).mul(t.lessThan(T).select(1, 0))
    .mul(smoothstep(0.0, 0.3, wx.uDrip)).mul(0.8);
  dm.fog = false;
  drips.count = list.length; drips.frustumCulled = false; drips.renderOrder = 11; drips.name = "drips";
  const group = new THREE.Group(); group.add(ice, drips);
  return {
    group, sites: list.length,
    update() { ice.visible = wx.uIcicle.value > 0.02; drips.visible = wx.uDrip.value > 0.02; },
  };
}
