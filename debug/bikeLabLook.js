// THE BIKE LAB'S LOOK (owner round 2, 2026-11-26: "it's still a lab but even a lab should look good"). Every obstacle
// kept; the lab's test ground drawn with the CITY's looks:
//   - the city's lighting, sky, sun shadows and post chain (viewer/lighting.js Lighting + viewer/post.js; Lighting owns
//     the fixed light set: nothing here adds a light);
//   - the ground as ONE geometry with a group per material (one draw each, shared materials): asphalt / concrete /
//     setts from the material library's scans (world mapped, anti-tiled), the city's textured lawn ground for grass,
//     procedural TSL for packed BMX dirt, roots, sand, MUD (wet, glossy puddles), SNOW and the WOODEN ramps (planks,
//     seams, screws); the feature borders' skirts in the same groups;
//   - the city's grass blades (viewer/grass) on the grass cells, pushed by the wheels;
//   - the city's stylised trees (viewer/treesStylized.js) round the lab, one instanced field.
// Never coplanar: the base ground is a 1 m grid with exactly the cells under a feature cut out (every feature sits on whole
// metres: bikeGround.js feature()); a triangle's material is its centroid's surface.
import * as THREE from "three/webgpu";
import { positionWorld, mx_noise_float, vec3, float, mix, smoothstep, fract, floor, abs, min, max, hash, color, sin, normalWorld } from "three/tsl";
import { Lighting } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { groundMaterial, setGroundTextures } from "../viewer/ground.js";
import { loadGroundTextures } from "../viewer/materials/groundTex.js";
import { loadScans } from "../viewer/materials/scans.js";
import { createMaterial } from "../viewer/materials/library.js";
import { Grass } from "../viewer/grass/grass.js";
import { STREET, setTreeRenderer, setTreeLighting } from "../viewer/treesStylized.js";
import { lodEye } from "../viewer/lodFade.js";
import { wind } from "../viewer/foliage/wind.js";
import { createOverheadMap, markSolid } from "../viewer/weather/overheadMap.js";
import { createSnowLayer, createTrackField } from "../viewer/weather/snowLayer.js";
import { wx } from "../viewer/weather/weatherState.js";

const n2 = (s, o = 0) => mx_noise_float(vec3(positionWorld.x.mul(s).add(o), float(o * 0.37), positionWorld.z.mul(s)));   // -1..1
/** packed BMX dirt (base colour, darker grains, pale dust on the tops) */
function dirtMat(base = 0x8a6a48, dark = 0x5c4530, rough = 0.95) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: rough });
  const a = n2(0.35).mul(0.5).add(0.5), b = n2(2.2, 7).mul(0.5).add(0.5), grit = smoothstep(0.62, 0.8, n2(14, 3).mul(0.5).add(0.5));
  m.colorNode = mix(color(base), color(dark), a.mul(0.55).add(b.mul(0.25))).mul(float(1).sub(grit.mul(0.18))).mul(mix(float(1.06), float(0.94), normalWorld.y.oneMinus().mul(3).clamp(0, 1)));
  return m;
}
function mudMat() {
  const m = new THREE.MeshStandardNodeMaterial();
  const a = n2(0.5).mul(0.5).add(0.5), wet = smoothstep(0.45, 0.7, n2(0.8, 11).mul(0.5).add(0.5));
  m.colorNode = mix(color(0x5a4330), color(0x2f2318), a.mul(0.6).add(wet.mul(0.4)));
  m.roughnessNode = mix(float(0.85), float(0.18), wet);            // the puddles shine
  m.metalnessNode = float(0);
  return m;
}
function sandMat() { const m = dirtMat(0xd8c492, 0xb79e6c, 0.98); return m; }
function snowMat() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.62 });
  const a = n2(0.6).mul(0.5).add(0.5), spark = smoothstep(0.93, 0.97, n2(60, 5).mul(0.5).add(0.5));
  m.colorNode = mix(color(0xe9eef4), color(0xffffff), a).add(spark.mul(0.25));
  return m;
}
/** wooden ramp: planks 14 cm across the riding direction (+z), a seam between, the grain along them, a plank's own tint,
 *  two screws a plank every 0.6 m */
function woodMat() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.78 });
  const W = 0.14, u = positionWorld.z.div(W), v = positionWorld.x;
  const plank = floor(u), f = fract(u);
  const seam = smoothstep(0.0, 0.06, f).mul(smoothstep(1.0, 0.94, f));
  const tint = hash(plank.add(17.3)).mul(0.22).add(0.89);
  const grain = mx_noise_float(vec3(v.mul(0.8), plank.mul(3.1), f.mul(6))).mul(0.5).add(0.5);
  const sv = fract(v.div(0.6)), screw = smoothstep(0.012, 0.004, abs(sv.sub(0.5)).mul(0.6)).mul(smoothstep(0.03, 0.01, abs(f.sub(0.2)).min(abs(f.sub(0.8))).mul(W)));
  const base = mix(color(0xc29a68), color(0x9c7448), grain.mul(0.6)).mul(tint);
  m.colorNode = mix(base.mul(0.55), base, seam).mul(float(1).sub(screw.mul(0.6))).add(color(0x8a9096).mul(screw.mul(0.5)));
  m.metalnessNode = screw.mul(0.6);
  return m;
}
function steelMat() { return new THREE.MeshStandardNodeMaterial({ color: 0x9aa1a8, roughness: 0.38, metalness: 0.7 }); }

const KEYS = ["asphalt", "concrete", "setts", "grass", "dirt", "roots", "sand", "mud", "snow", "wood"];
const SURF_KEY = ["asphalt", "setts", "dirt", "grass", "sand", "roots", "mud", "snow"];

/**
 * Build the look. opts: { renderer, scene, camera, FEATURES, testHeight, testSurface, BOUNDS, PARK }
 * Returns { lighting, pipe, ground (the mesh), materials, render(), update(dt, focus, s), grass, trees }
 */
export async function buildLabLook({ renderer, scene, camera, FEATURES, testHeight, testSurface, BOUNDS, PARK, SNOW = null, quality = "high" }) {
  const t0 = performance.now();
  const lighting = new Lighting(scene, renderer, "midday");
  await lighting.attach(camera);
  const pipe = createPipeline(renderer, scene, camera);
  pipe.setExposureScale(lighting.exposureScale); pipe.look("midday");
  const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);

  // ---- materials (shared): the library's scans for the hard ground (only the three it uses are fetched)
  let scansOK = false;
  try {
    const man = await fetch("../viewer/materials/textures/scans.json").then((r) => r.json());
    await loadScans(renderer, undefined, { skip: Object.keys(man).filter((k) => !["asphalt", "paving_concrete", "cobbles"].includes(k)) });
    scansOK = true;
  } catch (e) { console.warn("[bike lab look] scans failed, procedural:", e); }
  try { setGroundTextures(await loadGroundTextures(renderer)); } catch (e) { console.warn("[bike lab look] ground textures failed:", e); }
  const coverTex = new THREE.DataTexture(new Uint8Array(16), 2, 2, THREE.RGBAFormat); coverTex.needsUpdate = true;
  const M = {
    asphalt: createMaterial("asphalt", { mapping: "world" }),
    concrete: createMaterial("paving_concrete", { mapping: "world" }),
    setts: createMaterial("cobbles", { mapping: "world" }),
    grass: groundMaterial({ tex: coverTex, ortho: null }, BOUNDS, null),
    dirt: dirtMat(), roots: dirtMat(0x6b553c, 0x3e3022, 0.97), sand: sandMat(), mud: mudMat(), snow: snowMat(), wood: woodMat(),
  };
  const matArr = KEYS.map((k) => M[k]);
  const keyOf = (f, x, z) => {
    if (f && f.park) return f.color === PARK.colors.wood ? "wood" : f.color === PARK.colors.concrete ? "concrete" : "dirt";
    if (f && /kicker$|^stairs$|^slope$|^steep$|^hill/.test(f.name)) return f.name === "kicker" ? "wood" : "asphalt";
    return SURF_KEY[testSurface(x, z)] || "grass";
  };

  // ---- the ground: every grid into one vertex set, the triangles bucketed by material (groups)
  const pos = [], nrm = [], idx = KEYS.map(() => []);
  const inside = (f, x, z) => x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1;
  const featAt = (x, z) => { for (const f of FEATURES) if (inside(f, x, z)) return f; return null; };
  const grid = (x0, x1, z0, z1, res, f, keep) => {
    const nx = Math.max(1, Math.round((x1 - x0) / res)), nz = Math.max(1, Math.round((z1 - z0) / res)), base = pos.length / 3;
    const H = (x, z) => testHeight(Math.min(x, x1 - 1e-4), Math.min(z, z1 - 1e-4));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz, e = 0.05;
      pos.push(x, f ? H(x, z) : 0, z);
      if (f) { const gx = (H(x + e, z) - H(x - e, z)) / (2 * e), gz = (H(x, z + e) - H(x, z - e)) / (2 * e), L = Math.hypot(gx, 1, gz); nrm.push(-gx / L, 1 / L, -gz / L); } else nrm.push(0, 1, 0);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const cx = x0 + (x1 - x0) * (i + 0.5) / nx, cz = z0 + (z1 - z0) * (j + 0.5) / nz;
      if (keep && !keep(cx, cz)) continue;
      const k = KEYS.indexOf(keyOf(f, cx, cz)), a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx[k].push(a, c, b, b, c, d);
    }
  };
  grid(BOUNDS.x0, BOUNDS.x1, BOUNDS.z0, BOUNDS.z1, 1, null, (x, z) => !featAt(x, z));
  for (const f of FEATURES) grid(f.x0, f.x1, f.z0, f.z1, f.res, f, null);
  // skirts: a feature border standing over the base ground gets a vertical face (the kerb, the decks, the embankments)
  for (const f of FEATURES) {
    const edges = [[f.x0, f.z0, f.x1, f.z0, 0, -1], [f.x1, f.z0, f.x1, f.z1, 1, 0], [f.x1, f.z1, f.x0, f.z1, 0, 1], [f.x0, f.z1, f.x0, f.z0, -1, 0]];
    const k = KEYS.indexOf(f.park || /kicker$/.test(f.name) ? (f.color === PARK.colors.wood || f.name === "kicker" ? "wood" : f.color === PARK.colors.dirt ? "dirt" : "concrete") : "concrete");
    const h = (x, z) => testHeight(Math.min(Math.max(x, f.x0), f.x1 - 1e-4), Math.min(Math.max(z, f.z0), f.z1 - 1e-4));
    for (const [ax, az, bx, bz, ox, oz] of edges) {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / f.res));
      for (let q = 0; q < n; q++) {
        const xa = ax + (bx - ax) * q / n, za = az + (bz - az) * q / n, xb = ax + (bx - ax) * (q + 1) / n, zb = az + (bz - az) * (q + 1) / n;
        const ha = h(xa, za), hb = h(xb, zb);
        if (Math.max(ha, hb) < 0.005) continue;
        const v0 = pos.length / 3;
        pos.push(xa, ha, za, xa, 0, za, xb, hb, zb, xb, 0, zb);
        for (let r = 0; r < 4; r++) nrm.push(ox, 0, oz);
        idx[k].push(v0, v0 + 1, v0 + 2, v0 + 2, v0 + 1, v0 + 3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  const all = []; let start = 0;
  idx.forEach((l, k) => { if (!l.length) return; for (const v of l) all.push(v); geo.addGroup(start, l.length, k); start += l.length; });
  geo.setIndex(all);
  const ground = new THREE.Mesh(geo, matArr);
  ground.receiveShadow = true; ground.castShadow = true; ground.name = "lab-ground";
  scene.add(ground);

  // ---- grass blades on the grass cells (1 m raster over the bounds: R density, G length, B dry, A flowers)
  let grass = null;
  try {
    if (Grass.supported?.(renderer) !== false) {
      grass = new Grass(renderer, { preset: quality, lights: [lighting.sun, lighting.hemi].filter(Boolean) });
      grass.groundAt = (x, z) => testHeight(x, z);
      const GW = BOUNDS.x1 - BOUNDS.x0, GH = BOUNDS.z1 - BOUNDS.z0, data = new Uint8Array(GW * GH * 4);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const x = BOUNDS.x0 + i + 0.5, z = BOUNDS.z0 + j + 0.5, f = featAt(x, z);
        if (f || testSurface(x, z) !== 3) continue;          // grass only on the plain grass (not on the features)
        const k = (j * GW + i) * 4, w = 0.5 + 0.5 * Math.sin(x * 0.13 + Math.sin(z * 0.07) * 2);
        data[k] = 200; data[k + 1] = Math.round(70 + 90 * w); data[k + 2] = Math.round(30 + 40 * (1 - w)); data[k + 3] = w > 0.8 ? 40 : 0;
      }
      scene.add(grass.group);
      grass.field.addTile("lab", { terrain: ground, solids: [], trunks: [], cover: coverTex, types: { data, W: GW, H: GH }, bounds: { ...BOUNDS } });
    }
  } catch (e) { console.warn("[bike lab look] grass failed:", e); grass = null; }

  // ---- trees: a stylised field round the lab and along the lanes (one instanced field, 3 LODs)
  let trees = null;
  try {
    setTreeRenderer(renderer); setTreeLighting(lighting);
    const T = [], rnd = (k) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
    const free = (x, z) => !featAt(x, z) && testSurface(x, z) === 3 && !FEATURES.some((f) => x > f.x0 - 4 && x < f.x1 + 4 && z > f.z0 - 4 && z < f.z1 + 4);
    for (let k = 0; T.length < 140 && k < 4000; k++) {
      const edge = k % 3;
      const x = edge === 0 ? BOUNDS.x0 + 3 + rnd(k) * (BOUNDS.x1 - BOUNDS.x0 - 6) : edge === 1 ? (rnd(k) < 0.5 ? BOUNDS.x0 + 2 + rnd(k + 9) * 10 : BOUNDS.x1 - 12 + rnd(k + 9) * 10) : BOUNDS.x0 + rnd(k + 3) * (BOUNDS.x1 - BOUNDS.x0);
      const z = edge === 0 ? (rnd(k + 5) < 0.5 ? BOUNDS.z0 + 2 + rnd(k + 7) * 8 : BOUNDS.z1 - 10 + rnd(k + 7) * 8) : BOUNDS.z0 + rnd(k + 11) * (BOUNDS.z1 - BOUNDS.z0);
      if (!free(x, z) || T.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 64)) continue;
      T.push({ x, z, height: 8 + rnd(k + 13) * 8 });
    }
    trees = STREET.buildField(T, (x, z) => testHeight(x, z), () => true, { variantOf: (i) => i % 6 });
    scene.add(trees.group);
  } catch (e) { console.warn("[bike lab look] trees failed:", e); trees = null; }

  // ---- the SNOW patch: the city's volumetric snow layer (viewer/weather/snowLayer.js) on an overhead map round it only
  // (edgeFade: a round soft edge), the wheels writing their tracks into it; the library materials keep no snow cover
  let snow = null;
  try {
    if (SNOW) {
      const omap = createOverheadMap({ renderer, centre: new THREE.Vector3(SNOW.x, 0, SNOW.z), size: 2 * SNOW.r + 4, res: 256 });
      markSolid(ground); scene.updateMatrixWorld(true); await omap.bake(scene);
      const track = createTrackField(omap);
      snow = createSnowLayer({ renderer, map: omap, track, edgeFade: true });
      scene.add(snow.mesh);
      wx.uSnowDepth.value = 0.07; wx.uSnowCover.value = 0; wx.uOn.value = 1;
    }
  } catch (e) { console.warn("[bike lab look] snow layer failed:", e); snow = null; }
  const stamps = [{ x: 0, z: 0, px: 0, pz: 0, r: 0.045, strength: 1 }, { x: 0, z: 0, px: 0, pz: 0, r: 0.045, strength: 1 }];
  let stampPrev = null;

  console.log(`[bike lab look] ${(performance.now() - t0).toFixed(0)} ms, ground ${pos.length / 3} verts, ${all.length / 3} tris, scans ${scansOK}, grass ${!!grass}, trees ${trees ? "yes" : "no"}`);
  return {
    lighting, pipe, ground, materials: M, grass, trees, snow, steel: steelMat(), concreteWall: createMaterial("concrete_white", { mapping: "world" }),
    update(dt, focus, s) {
      lighting.update(camera.position.y, testHeight(camera.position.x, camera.position.z), focus, 60, dt);
      lodEye.value.copy(camera.position);
      trees?.update?.(camera.position);
      if (grass) {
        wind.update?.(dt);
        if (s && s.wheelPos) for (let i = 0; i < 2; i++) { const x = s.wheelPos[i * 2], z = s.wheelPos[i * 2 + 1]; grass.push.set(i, { x, y: s.wheelBot[i], z, radius: 0.25, strength: 1, vx: s.vx, vz: s.vz, ground: testHeight(x, z) }); }
        grass.update(camera, dt);
      }
      if (snow) {
        let n = 0;
        if (s && s.wheelPos && (s.contact[0] || s.contact[1])) {
          for (let i = 0; i < 2; i++) { const st = stamps[i]; st.px = stampPrev ? stampPrev[i * 2] : s.wheelPos[i * 2]; st.pz = stampPrev ? stampPrev[i * 2 + 1] : s.wheelPos[i * 2 + 1]; st.x = s.wheelPos[i * 2]; st.z = s.wheelPos[i * 2 + 1]; }
          stampPrev = Array.from(s.wheelPos); n = 2;
        } else stampPrev = null;
        snow.update(dt, n ? stamps : []);
      }
    },
    render() { pipe.render(hazeHook); pipe.setExposureFactor(lighting.adapt(1 / 60)); },
  };
}
