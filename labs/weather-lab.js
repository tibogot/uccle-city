// THE WEATHER + SEASONS LAB (docs/WEATHER.md): a test street of Uccle under the city's sky (Firmament, viewer/lighting.js)
// and post chain (viewer/post.js: SSR reflects the puddles), with the new modules:
//   viewer/weather/weatherState.js   inputs (rain, snow, temperature, wind, cloud, visibility) + simulated surface state
//   viewer/weather/surfaceWeather.js weatherize(): wet / puddles / ripples / streaks / snow cover / litter / flowers
//   viewer/weather/overheadMap.js    the top-down height bake (collision, exposure, the snow layer's base + shape)
//   viewer/weather/precipitation.js  GPU rain + splashes, snow flakes, autumn leaves
//   viewer/weather/snowLayer.js      volumetric snow with depth, footprints and tyre tracks
//   viewer/weather/weatherFog.js     height fog + ground mist
//   viewer/weather/liveWeather.js    Open-Meteo for Uccle -> the inputs
//   viewer/seasons/season.js         the date -> leaves, grass, flowers, sun path
// The street: five terraced houses (gable 45 deg with eaves, mansard, flat roof with parapet, shallow 25 deg gable, a
// steep gable end to the street), window sills, a road with a camber and gutters, a parking strip in setts (the city's
// cobbleMaterial), sidewalks (the city's concreteMaterial) with blue-stone kerbs, a lawn with trees, two swan-neck lamps
// (the city's lamp model) and parked cars (the city's faceted car family). Read-only imports of the city's modules.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Fn, instanceIndex, float, vec2, vec3, mix, smoothstep, positionWorld, normalWorld, attribute, fwidth, abs, floor, fract, max, min, select, dot, normalize, uv, clamp } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, env } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { cobbleMaterial } from "../viewer/cobbles.js";
import { concreteMaterial } from "../viewer/roadPaint.js";
import { loadLampModel } from "../viewer/lampModel.js";
import { hash2D, noise2D, bumpNormal, filteredPulse } from "../viewer/tslkit.js";
import { Weather, WEATHER_PRESETS, wx } from "../viewer/weather/weatherState.js";
import { weatherize, wxLook } from "../viewer/weather/surfaceWeather.js";
import { createOverheadMap, markSolid, markCanopy, markRoad } from "../viewer/weather/overheadMap.js";
import { createPrecipitation } from "../viewer/weather/precipitation.js";
import { createSnowLayer, createTrackField, trackSampler } from "../viewer/weather/snowLayer.js";
import { createWeatherFog } from "../viewer/weather/weatherFog.js";
import { snowOnBranches, snowOnFoliage, createLedgeCaps, createEaveIce } from "../viewer/weather/snowExtras.js";
import { fetchLive, mapLive } from "../viewer/weather/liveWeather.js";
import { season, setDay, dayLabel, seasonName, dayOfYear } from "../viewer/seasons/season.js";
import { flickerTest, showHeat } from "./flickerTest.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $credit = document.getElementById("credit");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 6000);
camera.position.set(-14, 4.5, 14);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, -4);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
const lighting = new Lighting(scene, renderer, "overcast");
const weather = new Weather();
const fogW = createWeatherFog({ colorNode: lighting.uFogColor });
scene.fogNode = fogW.node;

// ================================================================================================ materials
const reg = [];   // { mesh, dry, wet } for the "weather on materials" A/B
const P = positionWorld;
const fwN = () => fwidth(P.x).add(fwidth(P.y)).add(fwidth(P.z)).mul(0.5).add(0.0002);
const H2 = (p) => hash2D(fract(p.div(1024)).mul(1024));
function wallTangent() { const n = normalize(normalWorld); return normalize(vec2(n.z.negate(), n.x).add(vec2(1e-4, 0))); }

/** Asphalt: dark aggregate, a little polish in the wheel paths, patched. */
function asphaltMat() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const fw = fwN();
  const g1 = noise2D(P.xz.mul(31.0)), g2 = noise2D(P.xz.mul(7.0)), g3 = noise2D(P.xz.mul(0.4));
  const fine = mix(g1, float(0.5), smoothstep(0.004, 0.02, fw));
  m.colorNode = vec3(0.055, 0.056, 0.058).mul(fine.mul(0.35).add(0.82)).mul(g2.mul(0.15).add(0.92)).mul(g3.mul(0.18).add(0.91));
  m.roughnessNode = float(0.88).sub(g2.mul(0.06));
  m.normalNode = bumpNormal(g1.mul(0.0012).mul(float(1).sub(smoothstep(0.003, 0.012, fw))));
  return m;
}
/** Brick (Brussels red-brown or yellow), 21 x 6.5 cm courses + mortar, AA joints. */
function brickMat(tint = [0.3, 0.12, 0.07], mortar = [0.28, 0.27, 0.25]) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const fw = fwN(), t = wallTangent();
  const a = dot(P.xz, t), y = P.y;
  const row = floor(y.div(0.065));
  const ax = a.div(0.22).add(row.mod(2).mul(0.5));
  const jy = float(1).sub(filteredPulse(y.div(0.065), 0.0, 0.85, fw.div(0.065)));
  const jx = float(1).sub(filteredPulse(ax, 0.0, 0.955, fw.div(0.22)));
  const joint = max(jx, jy).toVar();
  const id = H2(vec2(floor(ax), row));
  const far = smoothstep(0.006, 0.03, fw);
  const tone = mix(id, float(0.5), far);
  const brick = vec3(...tint).mul(tone.mul(0.45).add(0.78)).mul(noise2D(vec2(a, y).mul(1.3)).mul(0.12).add(0.94));
  m.colorNode = mix(brick, vec3(...mortar), mix(joint, float(0.16), far));
  m.roughnessNode = mix(float(0.86), float(0.95), joint);
  m.normalNode = bumpNormal(joint.mul(-0.003).mul(float(1).sub(far)));
  return m;
}
/** Roof: slate (blue-grey) or clay tiles (orange-red), rows down the slope (world y). */
function roofMat(kind = "slate") {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const fw = fwN();
  const rowH = kind === "slate" ? 0.11 : 0.16, colW = kind === "slate" ? 0.25 : 0.21;
  const row = floor(P.y.div(rowH));
  const ax = P.x.add(P.z.mul(0.0)).div(colW).add(row.mod(2).mul(0.5));
  const jy = float(1).sub(filteredPulse(P.y.div(rowH), 0.0, 0.88, fw.div(rowH)));
  const jx = float(1).sub(filteredPulse(ax, 0.0, 0.94, fw.div(colW)));
  const far = smoothstep(0.008, 0.04, fw);
  const id = mix(H2(vec2(floor(ax), row)), float(0.5), far);
  const base = kind === "slate" ? vec3(0.06, 0.068, 0.08) : vec3(0.32, 0.11, 0.05);
  const c = base.mul(id.mul(0.4).add(0.8)).mul(noise2D(P.xz.mul(0.7)).mul(0.2).add(0.9));
  const j = mix(max(jx, jy.mul(1.0)), float(0.12), far);
  m.colorNode = c.mul(float(1).sub(j.mul(0.5)));
  m.roughnessNode = float(kind === "slate" ? 0.62 : 0.8).add(j.mul(0.2));
  m.normalNode = bumpNormal(jy.mul(-0.006).mul(float(1).sub(far)));
  return m;
}
function plainMat(col, rough, metal = 0) { return new THREE.MeshStandardNodeMaterial({ color: col, roughness: rough, metalness: metal }); }
function grassMat() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 1 });
  const fw = fwN();
  const a = noise2D(P.xz.mul(0.35)), b = noise2D(P.xz.mul(4.0)), c = noise2D(P.xz.mul(23.0));
  const g = vec3(season.uGrass);
  m.colorNode = g.mul(a.mul(0.35).add(0.8)).mul(mix(b.mul(0.2).add(0.9), float(1), smoothstep(0.01, 0.05, fw))).mul(mix(c.mul(0.3).add(0.85), float(1), smoothstep(0.003, 0.015, fw)));
  m.normalNode = bumpNormal(c.mul(0.004).mul(float(1).sub(smoothstep(0.003, 0.012, fw))));
  return m;
}
/** Thin snow on a lawn: it sits in the hollows between tufts first (the grass material's own tuft / blade noise). */
function grassGround() {
  const fw = fwN();
  const tuft = noise2D(P.xz.mul(4.0)), blade = noise2D(P.xz.mul(23.0)), tip = noise2D(P.xz.mul(67.0).add(5.3));
  // tufts (25 cm) set the patches, blades (4 cm) and tips (1.5 cm) rag their edges; each fades to its mean when sub-pixel
  const g = float(1).sub(tuft.mul(0.4).add(mix(blade, float(0.5), smoothstep(0.003, 0.015, fw)).mul(0.35)).add(mix(tip, float(0.5), smoothstep(0.0015, 0.006, fw)).mul(0.25)));
  return smoothstep(0.2, 0.8, g);
}
function barkMat() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.92 });
  const n = noise2D(vec2(P.y.mul(3.0), P.x.add(P.z).mul(18.0)));
  m.colorNode = vec3(0.075, 0.062, 0.05).mul(n.mul(0.4).add(0.8));
  return m;
}
const WEATHER_OPTS = new Map();
/** Build a mesh with a dry and a weatherized version of the same material (A/B). */
function mesh(geo, mk, opts, { cast = true, receive = true, solid = true, post = null } = {}) {
  const dry = mk(), wet = weatherize(mk(), { map: omap, ...opts }), lite = weatherize(mk(), { map: omap, ...opts, lite: true });
  if (post) { post(wet); post(lite); }
  const me = new THREE.Mesh(geo, wet);
  me.castShadow = cast; me.receiveShadow = receive;
  if (solid) markSolid(me);
  reg.push({ mesh: me, dry, wet, lite });
  return me;
}
const ledges = [];   // narrow up-facing ledges for the snow caps: { x, y, z, len, width, axis }

// the overhead map: 64 m around the street (12.5 cm cells)
const omap = createOverheadMap({ renderer, centre: new THREE.Vector3(0, 0, 0), size: 64, res: 512 });
const trackField = createTrackField(omap);
const trackAt = trackSampler(trackField, omap);

// ================================================================================================ the street
const root = new THREE.Group(); scene.add(root);
const KERB = 0.13;
// road: z -3.5 .. 1.5, parking setts z 1.5 .. 3.5 (south side), sidewalks z 3.5..6 and -6..-3.5, houses z < -6.4
// road with a camber (5 cm crown) and gutters at the kerbs
{
  const g = new THREE.PlaneGeometry(140, 5, 280, 20).rotateX(-Math.PI / 2).translate(0, 0, -1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), u = (z + 1) / 2.5; p.setY(i, 0.05 * (1 - u * u) + 0.002 * Math.sin(p.getX(i) * 0.7) * Math.sin(z * 3.1)); }
  g.computeVertexNormals();
  const gutter = smoothstep(1.0, 0.0, min(abs(P.z.add(3.5)), abs(P.z.sub(1.5))));
  root.add(markRoad(mesh(g, asphaltMat, { porosity: 0.75, puddles: true, puddleBias: gutter.mul(0.22), slush: true, road: true, edge: smoothstep(0.55, 0.15, min(abs(P.z.add(3.5)), abs(P.z.sub(1.5)))) })));
}
{ // parking strip in setts (the city's cobble material: uv in metres along / across the strip)
  const g = new THREE.PlaneGeometry(140, 2, 280, 8).rotateX(-Math.PI / 2).translate(0, 0.0, 2.5);
  const uvA = g.attributes.uv; const p = g.attributes.position;
  for (let i = 0; i < uvA.count; i++) uvA.setXY(i, p.getX(i) + 70, p.getZ(i) - 1.5);
  // thin snow lingers in the sett joints first (dark joints: o.ground from the dry colour)
  root.add(mesh(g, cobbleMaterial, { porosity: 0.55, puddles: true, puddleBias: float(0.06), slush: true, ground: { lum: [0.065, 0.11] } }));
}
// sidewalks (the city's concrete tiles) + blue-stone kerbs
function sidewalk(z0, z1) {
  // the slabs stop where the 15 cm kerb stone starts (no coplanar faces: they z-fought in the flicker test)
  const s0 = z0 < 0 ? z0 : z0 + 0.15, s1 = z0 < 0 ? z1 - 0.15 : z1;
  const g = new THREE.BoxGeometry(140, KERB, s1 - s0, 1, 1, 1).translate(0, KERB / 2, (s0 + s1) / 2);
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(0), 1));
  root.add(mesh(g, () => concreteMaterial(), { porosity: 0.55, puddles: true, puddleBias: float(-0.2), litter: true, slush: true }));
  const kz = z0 < 0 ? z1 - 0.15 : z0;
  const k = new THREE.BoxGeometry(140, KERB + 0.004, 0.15).translate(0, (KERB + 0.004) / 2, kz + 0.075);
  k.setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(k.attributes.position.count).fill(1), 1));
  root.add(mesh(k, () => concreteMaterial(), { porosity: 0.25, slush: true }));
}
sidewalk(3.5, 6); sidewalk(-6.4, -3.5);
{ // lawn (park) south of the sidewalk, and far ground
  const g = new THREE.PlaneGeometry(140, 60, 1, 1).rotateX(-Math.PI / 2).translate(0, KERB - 0.01, 36);
  root.add(mesh(g, grassMat, { porosity: 0.9, flowers: true, litter: true, frost: true, ground: grassGround() }));
  const back = new THREE.PlaneGeometry(140, 60, 1, 1).rotateX(-Math.PI / 2).translate(0, KERB - 0.01, -36);
  root.add(mesh(back, grassMat, { porosity: 0.9, litter: true, frost: true, ground: grassGround() }));
  const far = mesh(new THREE.CircleGeometry(3000, 48).rotateX(-Math.PI / 2).translate(0, -0.05, 0), () => plainMat(0x2f3a28, 1), { porosity: 0.9, frost: true }, { cast: false, solid: false });
  scene.add(far);
}

// ---------------------------------------------------------------- houses
const front = -6.4, depthH = 9;
const triPrism = (w, d, h) => {          // attic: triangle (depth d, height h) extruded along x by w, at y = 0
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).rotateY(Math.PI / 2);
};
function roofSlabs(x0, w, zc, d, yTop, pitchDeg, over, mk, opts) {
  const th = pitchDeg * Math.PI / 180, hd = d / 2 + over, L = hd / Math.cos(th), t = 0.14;
  const out = [];
  for (const s of [1, -1]) {
    const g = new THREE.BoxGeometry(w + 2 * over * 0.5, t, L);
    g.rotateX(s * th);
    const nrm = new THREE.Vector3(0, Math.cos(th), s * Math.sin(th));
    const c = new THREE.Vector3(x0 + w / 2, yTop - hd * Math.tan(th) / 2, zc + s * hd / 2).addScaledVector(nrm, -t / 2 + 0.01);
    g.translate(c.x, c.y, c.z);
    out.push(mesh(g, mk, opts));
  }
  return out;
}
/** A roof slab along x (x0 .. x0 + w) whose TOP surface runs from edge a = [z, y] to edge b = [z, y]; sg: the side it faces. */
function slabBetween(x0, w, a, b, mk, opts, sg) {
  const t = 0.12, dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy);
  const g = new THREE.BoxGeometry(w, t, L + 0.02);
  // local z along the slope (from a to b), local y = the outward normal
  const dir = new THREE.Vector3(0, dy, dz).normalize();
  let n = new THREE.Vector3(0, -dir.z, dir.y); if (n.y < 0) n.negate();
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), n, new THREE.Vector3(1, 0, 0).cross(n));   // right-handed
  g.applyMatrix4(m);
  const c = new THREE.Vector3(x0 + w / 2, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2).addScaledVector(n, -t / 2);
  g.translate(c.x, c.y, c.z);
  return mesh(g, mk, opts);
}
function windows(x0, w, floors, h0, fh, mats) {
  const n = Math.max(2, Math.round(w / 2.2));
  for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * w / n, y = h0 + f * fh + 0.9;
    const glass = new THREE.BoxGeometry(1.0, 1.55, 0.02).translate(cx, y + 0.78, front + 0.012);
    root.add(mesh(glass, mats.glass, { porosity: 0.0, glass: true, snow: false }));
    for (const [w, h, dx, dy] of [[1.16, 0.08, 0, 1.59], [1.16, 0.08, 0, -0.04], [0.08, 1.6, -0.54, 0.78], [0.08, 1.6, 0.54, 0.78], [0.05, 1.55, 0, 0.78]]) {
      root.add(mesh(new THREE.BoxGeometry(w, h, 0.07).translate(cx + dx, y + dy, front + 0.035), mats.frame, { porosity: 0.1 }));
    }
    const sill = new THREE.BoxGeometry(1.3, 0.07, 0.16).translate(cx, y - 0.035, front + 0.08);
    ledges.push({ x: cx, y, z: front + 0.08, len: 1.3, width: 0.16, axis: "x" });
    root.add(mesh(sill, mats.stone, { porosity: 0.35 }));
  }
}
const mats = {
  glass: () => plainMat(0x6a737a, 0.04, 0.9),
  frame: () => plainMat(0xd8d6cf, 0.45),
  stone: () => plainMat(0x9a9890, 0.75),
  door: () => plainMat(0x2a1a12, 0.5),
};
const WALL_OPTS = { porosity: 0.55, streaks: true };
const ROOF_OPTS = { porosity: 0.25 };
const houses = [
  { w: 6.5, floors: 3, roof: "gable", pitch: 45, over: 0.38, brick: [0.3, 0.12, 0.07], tile: "slate" },
  { w: 6.0, floors: 3, roof: "mansard", brick: [0.36, 0.27, 0.16], tile: "slate" },
  { w: 7.0, floors: 3, roof: "flat", brick: [0.24, 0.1, 0.06] },
  { w: 6.2, floors: 2, roof: "gable", pitch: 25, over: 0.45, brick: [0.42, 0.33, 0.22], tile: "tile" },
  { w: 6.0, floors: 3, roof: "end", pitch: 55, over: 0.3, brick: [0.28, 0.13, 0.08], tile: "tile" },
];
{
  let x = -16;
  const zc = front - depthH / 2;
  for (const h of houses) {
    const fh = 3.0, wallH = 0.5 + h.floors * fh;
    const mkB = () => brickMat(h.brick);
    const body = new THREE.BoxGeometry(h.w, wallH, depthH).translate(x + h.w / 2, wallH / 2, zc);
    root.add(mesh(body, mkB, WALL_OPTS));
    // blue-stone plinth
    root.add(mesh(new THREE.BoxGeometry(h.w, 0.5, 0.06).translate(x + h.w / 2, 0.25 + KERB, front + 0.03), mats.stone, { porosity: 0.3 }));
    // door
    root.add(mesh(new THREE.BoxGeometry(1.1, 2.3, 0.06).translate(x + h.w - 1.0, KERB + 1.15 + 0.1, front + 0.01), mats.door, { porosity: 0.1 }));
    windows(x, h.w - 1.6, h.floors, KERB + 0.4, fh, mats);
    const mkR = () => roofMat(h.tile);
    if (h.roof === "gable") {
      const rh = (depthH / 2) * Math.tan(h.pitch * Math.PI / 180);
      const at = triPrism(h.w, depthH, rh).translate(x, wallH, zc);
      root.add(mesh(at, mkB, WALL_OPTS));
      for (const s of roofSlabs(x, h.w, zc, depthH, wallH + rh + 0.08, h.pitch, h.over, mkR, ROOF_OPTS)) root.add(s);
      // chimney on the ridge
      root.add(mesh(new THREE.BoxGeometry(0.6, 1.2, 0.9).translate(x + 0.8, wallH + rh + 0.3, zc), mkB, WALL_OPTS));
    } else if (h.roof === "mansard") {
      const a = 1.1, h1 = 2.6, h2 = 1.0;
      const s = new THREE.Shape(); s.moveTo(-depthH / 2, 0); s.lineTo(depthH / 2, 0); s.lineTo(depthH / 2 - a, h1); s.lineTo(0, h1 + h2); s.lineTo(-depthH / 2 + a, h1); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: h.w, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x, wallH, zc);
      root.add(mesh(g, mkB, WALL_OPTS));                              // the attic volume (hidden under the slabs)
      // roof planes as slabs (their own normals): steep lower faces, shallow top
      for (const sg of [1, -1]) {
        root.add(slabBetween(x, h.w, [zc + sg * (depthH / 2 + 0.06), wallH - 0.05], [zc + sg * (depthH / 2 - a), wallH + h1], mkR, ROOF_OPTS, sg));
        root.add(slabBetween(x, h.w, [zc + sg * (depthH / 2 - a + 0.08), wallH + h1 - 0.03], [zc, wallH + h1 + h2], mkR, ROOF_OPTS, sg));
      }
      // a cornice at the foot of the mansard (a ledge for snow)
      root.add(mesh(new THREE.BoxGeometry(h.w, 0.18, 0.35).translate(x + h.w / 2, wallH - 0.05, front + 0.12), mats.stone, { porosity: 0.35 }));
      // the cornice is cut out of the volumetric layer (a mansard wall behind, a drop in front): a cap
      ledges.push({ x: x + h.w / 2, y: wallH + 0.04, z: front + 0.12 + 0.03, len: h.w, width: 0.28, axis: "x" });
    } else if (h.roof === "flat") {
      // (inset 3 cm from the facade: its front face was coplanar with the parapet's and z-fought in the flicker test)
      root.add(mesh(new THREE.BoxGeometry(h.w - 0.06, 0.12, depthH - 0.06).translate(x + h.w / 2, wallH + 0.06, zc), () => plainMat(0x33302c, 0.9), { porosity: 0.4, puddles: true }));
      for (const [dx, dz, sx, sz] of [[0, -depthH / 2 + 0.15, h.w, 0.3], [0, depthH / 2 - 0.15, h.w, 0.3]]) {
        root.add(mesh(new THREE.BoxGeometry(sx, 0.6, sz).translate(x + h.w / 2 + dx, wallH + 0.3, zc + dz), mkB, WALL_OPTS));
      }
      // a skylight box on the roof
      root.add(mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4).translate(x + h.w / 2, wallH + 0.37, zc - 1), () => plainMat(0x777a7d, 0.5), { porosity: 0.1 }));
    } else if (h.roof === "end") {
      // a steep gable END to the street: ridge along z
      const rh = (h.w / 2) * Math.tan(h.pitch * Math.PI / 180);
      const s = new THREE.Shape(); s.moveTo(-h.w / 2, 0); s.lineTo(h.w / 2, 0); s.lineTo(0, rh); s.closePath();
      const at = new THREE.ExtrudeGeometry(s, { depth: depthH, bevelEnabled: false }).translate(x + h.w / 2, wallH, front - depthH);
      root.add(mesh(at, mkB, WALL_OPTS));
      const th = h.pitch * Math.PI / 180, hw = h.w / 2 + h.over, L = hw / Math.cos(th), t = 0.14;
      for (const sg of [1, -1]) {
        const g = new THREE.BoxGeometry(L, t, depthH + 0.4);
        g.rotateZ(-sg * th);
        const nrm = new THREE.Vector3(sg * Math.sin(th), Math.cos(th), 0);
        const c = new THREE.Vector3(x + h.w / 2 + sg * hw / 2, wallH + rh + 0.08 - hw * Math.tan(th) / 2, zc).addScaledVector(nrm, -t / 2 + 0.01);
        g.translate(c.x, c.y, c.z);
        root.add(mesh(g, mkR, ROOF_OPTS));
      }
    }
    x += h.w;
  }
  // the party walls at both ends of the row (a neighbour's blank wall)
  root.add(mesh(new THREE.BoxGeometry(0.4, 14, depthH).translate(-16.2, 7, zc), () => brickMat([0.26, 0.14, 0.09]), WALL_OPTS));
}

// ---------------------------------------------------------------- trees (procedural, season-driven leaves)
const treeSites = [{ x: -9, z: 9.5 }, { x: 3, z: 10.5 }, { x: 14, z: 9 }, { x: -20, z: 12 }];
const leafGeoms = [], branchGeoms = [];
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function cyl(a, b, r0, r1) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, 7, 1, false).translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).translate(a.x, a.y, a.z);
  for (const k of ["uv"]) g.deleteAttribute(k);
  const ng = g.toNonIndexed();
  ng.setAttribute("aRad", new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count).fill(r0), 1));
  return ng;
}
function grow(a, dir, len, r, depth, out) {
  const b = a.clone().addScaledVector(dir, len);
  out.br.push(cyl(a, b, r, r * 0.7));
  if (depth === 0) {
    // a leaf cluster: ~40 cards around the tip
    for (let k = 0; k < 70; k++) {
      const c = b.clone().add(new THREE.Vector3((rand() - 0.5) * 1.4, (rand() - 0.5) * 1.0, (rand() - 0.5) * 1.4));
      const q = new THREE.PlaneGeometry(0.26, 0.26);
      q.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28))).translate(c.x, c.y, c.z);
      const n = q.attributes.position.count, r1 = rand(), r2 = rand(), r3 = rand();
      q.setAttribute("aR", new THREE.Float32BufferAttribute(new Float32Array(n * 3).map((_, i) => [r1, r2, r3][i % 3]), 3));
      out.lf.push(q);
    }
    return;
  }
  const kids = depth > 2 ? 3 : 2 + (rand() < 0.5 ? 1 : 0);
  for (let k = 0; k < kids; k++) {
    const nd = dir.clone().multiplyScalar(0.6).add(new THREE.Vector3((rand() - 0.5) * 1.6, 0.1 + rand() * 0.35, (rand() - 0.5) * 1.6)).normalize();
    grow(b, nd, len * (0.7 + rand() * 0.12), r * 0.58, depth - 1, out);
  }
}
const { mergeGeometries } = await import("three/addons/utils/BufferGeometryUtils.js");
const treesG = new THREE.Group(); scene.add(treesG);
const leafMat = (() => {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.7, metalness: 0, alphaTest: 0.5 });
  const R = attribute("aR", "vec3");
  const autumnC = mix(mix(vec3(0.42, 0.3, 0.02), vec3(0.45, 0.14, 0.02), R.y), vec3(0.32, 0.05, 0.02), smoothstep(0.75, 1.0, R.y));
  const green = vec3(season.uLeafColor).mul(R.y.mul(0.4).add(0.8));
  const fresh = mix(green, vec3(0.13, 0.23, 0.04), season.uSpringGreen.mul(0.6));
  const turned = smoothstep(R.x.sub(0.02), R.x.add(0.02), season.uLeafAutumn);
  m.colorNode = mix(fresh, autumnC, turned);
  const f = uv().sub(0.5);
  const shape = smoothstep(0.5, 0.4, f.mul(vec2(1.6, 1)).length().add(abs(f.x).mul(0.25)));
  const present = smoothstep(R.z.sub(0.01), R.z.add(0.01), season.uLeafDensity);
  m.opacityNode = shape.mul(present);
  m.maskNode = shape.mul(present).greaterThan(0.5);      // also in the shadow pass (bare trees cast bare shadows)
  return m;
})();
for (const s of treeSites) {
  const out = { br: [], lf: [] };
  const base = new THREE.Vector3(s.x, KERB, s.z);
  grow(base, new THREE.Vector3(0, 1, 0), 3.2, 0.2, 4, out);
  const bg = mergeGeometries(out.br); const lg = mergeGeometries(out.lf);
  const bm = mesh(bg, barkMat, { porosity: 0.7, streaks: false, snowUp: [0.12, 0.45], plaster: true }, { solid: false, post: (m) => snowOnBranches(m, { radiusAttr: "aRad" }) });
  treesG.add(bm);
  const lm = new THREE.Mesh(lg, leafMat); lm.castShadow = true; lm.receiveShadow = true; lm.name = "leaves";
  markCanopy(lm); treesG.add(lm);
  lg.computeBoundingBox();
  s.r = Math.max(lg.boundingBox.max.x - lg.boundingBox.min.x, lg.boundingBox.max.z - lg.boundingBox.min.z) / 2;
  s.y = (lg.boundingBox.max.y + lg.boundingBox.min.y) / 2;
  s.top = lg.boundingBox.max.y;
}

// ---------------------------------------------------------------- evergreens: a privet hedge and two yews (foliage hook)
function evergreenMat() {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.85 });
  const n1 = noise2D(P.xz.mul(6.0).add(P.y.mul(5.0))), n2 = noise2D(P.xz.mul(19.0).add(P.y.mul(17.0)));
  m.colorNode = vec3(0.025, 0.055, 0.022).mul(n1.mul(0.6).add(0.6)).mul(n2.mul(0.5).add(0.75));
  m.normalNode = bumpNormal(n1.mul(0.03).add(n2.mul(0.012)));
  return m;
}
{
  // hedge: solid (the volumetric layer caps its top with rounded edges), its sides take the foliage snow
  const g = new THREE.BoxGeometry(14, 1.2, 0.8, 28, 4, 2).translate(1, KERB + 0.6, 7.0);
  const pp = g.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setY(i, pp.getY(i) + 0.05 * Math.sin(pp.getX(i) * 2.3) * (pp.getY(i) > KERB + 1 ? 1 : 0));
  g.computeVertexNormals();
  root.add(mesh(g, evergreenMat, { porosity: 0.3, snow: false }, { post: (m) => snowOnFoliage(m) }));
  // yews: stacked cones (canopy: shelter beneath, foliage snow on the tiers)
  for (const [x, z, hh] of [[11, 15, 4.2], [-15, 16.5, 3.4]]) {
    const parts = [];
    for (let k = 0; k < 3; k++) parts.push(new THREE.ConeGeometry(1.5 - k * 0.38, hh * 0.5, 14, 2).translate(x, KERB + 0.6 + k * hh * 0.25 + hh * 0.25, z));
    const cg = mergeGeometries(parts.map((q) => q.toNonIndexed()));
    const me = mesh(cg, evergreenMat, { porosity: 0.3, snow: false }, { solid: false, post: (m) => snowOnFoliage(m) });
    markCanopy(me); root.add(me);
  }
}

// ---------------------------------------------------------------- lamps (the city's model)
const lampModel = await loadLampModel().catch(() => null);
const pools = [];
if (lampModel) for (const x of [-6, 12]) {
  const l = lampModel.lods[0];
  for (const [g, m] of [[l.iron, lampModel.iron], [l.glass, lampModel.glass]]) {
    const me = new THREE.Mesh(g, m); me.position.set(x, KERB, -4.0); me.rotation.y = Math.PI; me.castShadow = true; root.add(me);
  }
  const pl = new THREE.PointLight(0xffc27a, 0, 22, 2); pl.position.set(x, KERB + 5.9, -4.0 + 1.05); scene.add(pl); pools.push(pl);
}

// ---------------------------------------------------------------- cars (the city's faceted family)
const carRoot = new THREE.Group(); root.add(carRoot);
let driveCar = null;
try {
  const gltf = await new GLTFLoader().loadAsync("../models/cars/faceted.glb");
  const types = gltf.scene.children.filter((c) => c.isObject3D);
  const pick = (k) => types[k % types.length];
  const paints = [0x1b2a4a, 0x8a8c8e, 0x6b1a14, 0x202224, 0xe2e2df];
  const makeCar = (k, paint) => {
    const src = pick(k).clone(true);
    src.position.set(0, 0, 0); src.rotation.set(0, 0, 0);
    src.traverse((o) => {
      if (!o.isMesh) return;
      // the faceted family's vertex kinds (viewer/drive/carPacks.js): 1 paint, 2 head, 3 tail, 4 glass, 5 chrome, 6 rubber
      const mk = () => {
        const m = new THREE.MeshStandardNodeMaterial();
        const kind = attribute("_kind", "float").add(0.5).floor(), vc = attribute("color", "vec3");
        const isPaint = kind.equal(1), isGlass = kind.equal(4), isChrome = kind.equal(5), isRubber = kind.equal(6);
        const pc = new THREE.Color(paint);
        m.colorNode = select(isPaint, vec3(pc.r, pc.g, pc.b), select(isGlass, vec3(0.02, 0.025, 0.03), vc));
        m.roughnessNode = select(isPaint, float(0.32), select(isGlass, float(0.05), select(isChrome, float(0.25), select(isRubber, float(0.9), float(0.6)))));
        m.metalnessNode = select(isPaint, float(0.35), select(isGlass, float(0.5), select(isChrome, float(0.9), float(0))));
        return m;
      };
      const me = mesh(o.geometry, mk, { porosity: 0.05, beads: true, frost: true });
      o.parent.add(me); me.position.copy(o.position); me.quaternion.copy(o.quaternion); me.scale.copy(o.scale);
      o.visible = false;
    });
    const b = new THREE.Box3().setFromObject(src);
    return { obj: src, size: b.getSize(new THREE.Vector3()) };
  };
  [[-11, 0], [-4.5, 1], [5.5, 2], [17, 3]].forEach(([x, k], i) => {
    const c = makeCar(k, paints[i]);
    // along x, on the setts strip, nose east
    if (c.size.z > c.size.x) c.obj.rotation.y = Math.PI / 2;
    c.obj.position.set(x, 0.0, 2.45);
    carRoot.add(c.obj);
  });
  const d = makeCar(4, paints[4]);
  if (d.size.z > d.size.x) d.obj.rotation.y = Math.PI / 2;
  d.obj.position.set(-30, 0.05, -1.8);
  d.obj.traverse((o) => { if (o.isMesh) o.layers.disable(20); });   // the moving car is not in the (static) bake
  carRoot.add(d.obj);
  driveCar = d;
} catch (e) { console.warn("cars", e); }

// ================================================================================================ weather systems
$info.textContent = "baking the overhead map…";
scene.updateMatrixWorld(true);
await omap.bake(scene);
const rain = createPrecipitation({ renderer, kind: "rain", map: omap });
const snowP = createPrecipitation({ renderer, kind: "snow", map: omap });
const leaves = createPrecipitation({ renderer, kind: "leaves", map: omap, trees: treeSites.map((t) => ({ x: t.x, z: t.z, r: t.r * 0.8, y: t.y })) });
scene.add(rain.mesh, rain.splashes, snowP.mesh, leaves.mesh);
const snowLayer = createSnowLayer({ renderer, map: omap, track: trackField });
scene.add(snowLayer.mesh);
const caps = createLedgeCaps(ledges);
scene.add(caps.mesh);
const eaveIce = createEaveIce(omap);
scene.add(eaveIce.group);

// ================================================================================================ pipeline
await lighting.attach(camera);
const pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look("overcast");
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);

// ================================================================================================ state + panel
const today = new Date();
const S = {
  preset: qp.get("preset") && WEATHER_PRESETS[qp.get("preset")] ? qp.get("preset") : "overcast, after rain",
  day: +(qp.get("day") ?? dayOfYear(today)), hour: +(qp.get("hour") ?? 11.5), night: false,
  live: false, liveInfo: "—", mist: 0, fogScale: 1,
  rainOn: true, splashOn: true, snowOn: true, layerOn: true, iceOn: true, skyGlow: 0.25, matMode: "full", leavesOn: true, matOn: true, fogOn: true, post: true,
  view: "orbit", gpu: "—", stats: "", bench: "—", flicker: "—", dateLabel: "", seasonLabel: "", sunLabel: "",
};
const ui = new Panel({ title: "Weather Lab" });
const fW = ui.addFolder("Weather");
fW.add(S, "preset", Object.keys(WEATHER_PRESETS)).name("preset").onChange((v) => { S.live = false; weather.setPreset(v, 3); applyMist(v); });
fW.add(weather.input, "rain", 0, 15, 0.1).name("rain (mm/h)").listen();
fW.add(weather.input, "snow", 0, 5, 0.05).name("snowfall (cm/h)").listen();
fW.add(weather.input, "temp", -10, 25, 0.1).name("temperature (C)").listen();
fW.add(weather.input, "wind", 0, 15, 0.1).name("wind (m/s)").listen();
fW.add(weather.input, "windDir", 0, 359, 1).name("wind from (deg)").listen();
fW.add(weather.input, "cloud", 0, 1, 0.01).name("cloud cover").listen();
fW.add(weather.input, "vis", 100, 40000, 50).name("visibility (m)").listen();
fW.add(S, "mist", 0, 0.05, 0.001).name("ground mist").listen();
fW.add(weather, "timeScale", 1, 900, 1).name("time x (sim s / s)");
fW.add(S, "live").name("use live weather (Uccle)").onChange((v) => { if (v) goLive(); });
fW.add(S, "liveInfo").name("live").listen();
const fS = ui.addFolder("Surface state (simulated)");
fS.add(weather.state, "wet", 0, 1, 0.01).name("wet film").listen();
fS.add(weather.state, "puddle", 0, 1, 0.01).name("puddle level").listen();
fS.add(weather.state, "depth", 0, 0.35, 0.005).name("snow depth (m)").listen();
fS.add(weather.state, "slush", 0, 1, 0.01).name("slush (melt)").listen();
fS.add(weather.state, "frost", 0, 1, 0.01).name("frost").listen();
fS.add({ f: () => { snowLayer.track && renderer.compute(clearTracks); } }, "f").name("clear tracks");
const fD = ui.addFolder("Season + sun (Uccle 50.8 N)");
fD.add(S, "day", 1, 365, 1).name("day of year").onChange(applyDay).listen();
fD.add(S, "dateLabel").name("date");
fD.add(S, "seasonLabel").name("season");
fD.add(S, "sunLabel").name("sun");
fD.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fD.add(S, "night").name("night (22:30)").onChange((v) => { S.hour = v ? 22.5 : 11.5; lighting.hourOverride = S.hour; });
for (const [lab, d] of [["15 Jan", 15], ["10 Apr", 100], ["5 May", 125], ["20 Jul", 201], ["15 Oct", 288], ["2 Nov", 306], ["20 Nov", 324], ["15 Dec", 349]]) fD.add({ f: () => { S.day = d; applyDay(d); } }, "f").name(`go to ${lab}`);
const fV = ui.addFolder("View");
fV.add(S, "view", ["orbit", "walk (footprints)", "drive (tyre tracks)", "fly over roofs"]).name("camera").onChange(setView);
for (const [n, f] of Object.entries(VIEWS())) fV.add({ f }, "f").name(n);
const fX = ui.addFolder("Systems (A/B)");
fX.add(S, "rainOn").name("rain drops");
fX.add(S, "splashOn").name("splashes");
fX.add(S, "snowOn").name("snow flakes");
fX.add(S, "layerOn").name("volumetric snow layer");
fX.add(S, "leavesOn").name("falling leaves");
fX.add(S, "matOn").name("weather on materials").onChange(swapMaterials);
fX.add(S, "matMode", ["full", "lite (far tiles)"]).name("weatherize path").onChange(() => swapMaterials(S.matOn));
fX.add(S, "iceOn").name("icicles + drips");
fX.add(wx.uSalt, "value", 0, 1, 0.01).name("roads salted / ploughed");
fX.add(S, "skyGlow", 0, 2, 0.01).name("urban sky glow (night)");
fX.add(S, "fogOn").name("weather fog");
fX.add(S, "post").name("post (AO, SSR, bloom)");
fX.add(wxLook.uSparkle, "value", 0, 2, 0.01).name("snow sparkle");
fX.add(wxLook.uDarken, "value", 0, 0.9, 0.01).name("wet darkening");
const fP = ui.addFolder("Perf + tests");
fP.add(S, "gpu").name("GPU ms").listen();
fP.add(S, "stats").name("draws / tris").listen();
fP.add(S, "bench").name("bench").listen();
fP.add(S, "flicker").name("flicker").listen();
fP.add({ f: () => bench().then((r) => console.log(r)) }, "f").name("run A/B bench (40 s)");

// Firmament's own overcast look (vendor/firmament CLOUD presets "overcast": a low stratus deck), blended in by cloud cover
let SKY0 = null, deck = 0;
function skyFromWeather() {
  const p = lighting.sky?.params; if (!p) return;
  SKY0 ??= { weatherBias: p.weatherBias, cloudBase: p.cloudBase, cloudThickness: p.cloudThickness, stratusThickness: p.stratusThickness, typeVariation: p.typeVariation, haze: p.haze, cirrus: p.cirrus };
  const c = weather.input.cloud, k = THREE.MathUtils.smoothstep(c, 0.55, 0.95);
  deck = k;
  const wetAir = Math.min(1, wx.uRain.value + wx.uSnowFall.value);
  const L = THREE.MathUtils.lerp;
  p.weatherBias = L(SKY0.weatherBias, 0.92, k);
  p.cloudBase = L(SKY0.cloudBase, 900 - 300 * wetAir, k);
  p.cloudThickness = L(SKY0.cloudThickness, 3000, k);
  p.stratusThickness = L(SKY0.stratusThickness, 0.16, k);
  p.typeVariation = L(SKY0.typeVariation, 0.12, k);
  p.cirrus = L(SKY0.cirrus, 0.1, k);
  p.wetness = 0.5 * wetAir;
  p.haze = SKY0.haze * (1 + 1.5 * wetAir + 2 * Math.min(1, 2000 / Math.max(200, weather.input.vis)));
}
function applyMist(name) { S.mist = name === "morning mist" ? 0.03 : 0; }
function applyDay(d) {
  const p = setDay(d);
  lighting.day = season.day;
  S.dateLabel = dayLabel(season.day);
  S.seasonLabel = `${seasonName(season.day)} · leaves ${(p.density * 100).toFixed(0)} % · autumn ${(p.autumn * 100).toFixed(0)} %`;
  const hm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  S.sunLabel = `rise ${hm(p.sunrise)} set ${hm(p.sunset)} (solar) · day ${p.dayLength.toFixed(1)} h · noon ${p.noonElevation.toFixed(1)} deg · snow chance ${(p.snowChance * 100).toFixed(0)} %/day`;
  ui.controllersRecursive().forEach((c) => c.updateDisplay());
}
function swapMaterials(on) { for (const r of reg) r.mesh.material = on ? (S.matMode === "full" ? r.wet : r.lite) : r.dry; }
async function goLive() {
  S.liveInfo = "fetching…";
  try {
    const m = mapLive(await fetchLive({ force: true }));
    weather.fade = null;
    Object.assign(weather.input, m.input);
    weather.state.depth = m.state.depth;
    if (m.state.wetHint != null) weather.state.wet = Math.max(weather.state.wet, m.state.wetHint);
    S.liveInfo = m.label; S.preset = "live";
    S.day = dayOfYear(new Date()); applyDay(S.day);
    S.mist = m.input.vis < 1000 ? 0.02 : 0;
    $credit.innerHTML = `Live: ${m.label} · <a href="https://open-meteo.com/" target="_blank">Weather data by Open-Meteo.com</a> (CC BY 4.0)`;
  } catch (e) { S.liveInfo = "failed: " + e.message; S.live = false; }
}
const clearTracks = Fn(() => { snowLayer.track.element(instanceIndex).assign(0); })().compute(omap.res * omap.res);
weather.setPreset(S.preset, 0); applyMist(S.preset);
applyDay(S.day);
lighting.hourOverride = S.hour;

// ================================================================================================ views and paths
function VIEWS() {
  return {
    "street, eye level": () => go([-12, 1.7, 0.6], [6, 1.6, -2]),
    "houses + roofs": () => go([-4, 7, 16], [-3, 6, -10]),
    "roof eaves close": () => go([-11.5, 13.5, -1.5], [-12, 11.5, -8]),
    "puddles low": () => go([-2, 0.6, 0.5], [8, 0.0, -1.5]),
    "parked cars": () => go([-8, 2.2, 6.5], [-4, 0.8, 2.4]),
    "lawn + trees": () => go([-2, 2.0, 18], [3, 2.5, 8]),
    "high above": () => go([18, 28, 22], [0, 0, -2]),
  };
}
function go(p, t) { S.view = "orbit"; camera.position.set(...p); controls.target.set(...t); controls.update(); }
let path = null;
function setView(v) {
  path = null; controls.enabled = true;
  if (v.startsWith("walk")) path = { kind: "walk", t: 0, speed: 1.4, lastStep: 0, side: 1, feet: [] };
  else if (v.startsWith("drive")) path = { kind: "drive", t: 0, speed: 8 };
  else if (v.startsWith("fly")) path = { kind: "fly", t: 0, speed: 0.06 };
  if (path) controls.enabled = false;
}
const stamps = [];
const footprints = [{ x: 0, z: 0, r: 0, strength: 0 }, { x: 0, z: 0, r: 0, strength: 0 }];
const wheels = [];
let carX = -30, carPrev = null;
function animate(dt) {
  stamps.length = 0;
  // the moving car: always drives (east), wraps; tyre tracks while there is snow
  if (driveCar) {
    carX += dt * (path?.kind === "drive" ? path.speed : 6);
    if (carX > 34) { carX = -34; carPrev = null; }
    driveCar.obj.position.x = carX;
    const L = Math.max(driveCar.size.x, driveCar.size.z) * 0.33, W = 0.78;
    const cur = [[carX + L, -1.8 + W], [carX + L, -1.8 - W], [carX - L, -1.8 + W], [carX - L, -1.8 - W]];
    cur.forEach(([x, z], k) => stamps.push({ x, z, px: carPrev ? carPrev[k][0] : x, pz: carPrev ? carPrev[k][1] : z, r: 0.15, strength: 0.95 }));
    carPrev = cur;
  }
  if (!path) { stamps.push(...footprints); return; }
  path.t += dt;
  if (path.kind === "walk") {
    // along the north sidewalk, west -> east, looking ahead and a little toward the houses
    const x = -26 + ((path.t * path.speed) % 50), z = -5.0;
    camera.position.set(x, KERB + 1.65 + Math.sin(path.t * 7.5) * 0.02, z);
    camera.lookAt(x + 6, 1.2, -2.6);
    if (path.t * path.speed - path.lastStep > 0.7) {
      path.lastStep = path.t * path.speed; path.side *= -1;
      footprints[path.side > 0 ? 0 : 1] = { x: x + 0.2, z: z + path.side * 0.13, px: x + 0.42, pz: z + path.side * 0.13, r: 0.15, strength: 0.85 };
    }
    stamps.push(...footprints);
  } else if (path.kind === "drive") {
    camera.position.set(carX - 7.5, 2.4, -1.8 + 0.4);
    camera.lookAt(carX + 6, 0.9, -1.8);
  } else if (path.kind === "fly") {
    const a = -0.6 + path.t * path.speed;
    camera.position.set(-1 + Math.sin(a) * 16, 17 + Math.sin(a * 2) * 2, -11 + Math.cos(a) * 16);
    camera.lookAt(-1, 9, -11);
  }
}

// ================================================================================================ GPU timing + loop
const gpu = { samples: [], comp: [], pending: false };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  Promise.all([renderer.resolveTimestampsAsync("render"), renderer.resolveTimestampsAsync("compute")]).then(([r, c]) => {
    if (typeof r === "number" && r > 0) { gpu.samples.push(r + (c || 0)); gpu.comp.push(c || 0); if (gpu.samples.length > 900) { gpu.samples.shift(); gpu.comp.shift(); } }
  }).catch(() => {}).finally(() => { gpu.pending = false; });
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
let frozen = false;
let last = performance.now(), frames = 0;
function frame(dtOverride = null) {
  const now = performance.now();
  const dt = dtOverride ?? Math.min(0.1, (now - last) / 1000);
  last = now;
  weather.frozen = frozen;
  weather.update(frozen ? 0 : dt);
  // sky follows the weather: cloud cover; a solid deck goes stratus
  lighting.firm.coverage = 0.15 + 0.85 * weather.input.cloud;
  lighting.firm.cloudType = weather.input.cloud > 0.85 ? 0.08 : 0.5;
  skyFromWeather();
  // fog
  fogW.uBeta.value = S.fogOn ? weather.fogBeta * S.fogScale : 0;
  fogW.uMist.value = S.fogOn ? S.mist : 0;
  fogW.uGrey.value = Math.min(0.95, Math.pow(weather.input.cloud, 2) * 0.8 + 0.3 * Math.min(1, wx.uRain.value + wx.uSnowFall.value));
  // night lamps
  const night = env.uNight.value;
  for (const l of pools) l.intensity = 60 * night;
  if (!frozen) animate(dt);
  // particles: colour from the sky's horizon radiance (drops are lenses of what is behind), + lamp light at night
  const fc = lighting.uFogColor.value;
  rain.uColor.value.setRGB(fc.x * 0.95 + night * 0.25, fc.y * 0.97 + night * 0.2, fc.z + night * 0.14);
  // flakes are white grains lit by the whole sky: brighter than the horizon behind them (else a snowstorm hides its own snow)
  snowP.uColor.value.setRGB(fc.x * 2.2 + night * 0.5, fc.y * 2.25 + night * 0.45, fc.z * 2.35 + night * 0.4);
  const H = renderer.domElement.height, pdt = frozen ? 0 : dt;
  rain.mesh.visible = S.rainOn; snowP.mesh.visible = S.snowOn; leaves.mesh.visible = S.leavesOn;
  rain.update(camera, pdt, S.rainOn ? wx.uRain.value : 0, H);
  rain.splashes.visible = S.splashOn && rain.splashes.count > 0;
  snowP.update(camera, pdt, S.snowOn ? wx.uSnowFall.value : 0, H);
  leaves.update(camera, pdt, S.leavesOn ? season.uLeafFall.value * (0.4 + 0.6 * Math.min(1, weather.input.wind / 6)) : 0, H);
  treesG.traverse((o) => { if (o.name === "leaves") o.visible = season.uLeafDensity.value > 0.005; });
  snowLayer.update(pdt, stamps);
  caps.update(); eaveIce.update();
  caps.mesh.visible &&= S.layerOn; eaveIce.group.visible = S.iceOn;
  snowLayer.mesh.visible = S.layerOn && wx.uSnowDepth.value > 0.003;
  if (!path) controls.update();
  lighting.update(camera.position.y, 0, controls.target, 60, dt);
  // under a full deck the sun casts (almost) no shadow: the key light fades, the sky's environment carries the light
  lighting.uKey.value.multiplyScalar(1 - 0.88 * deck);
  // URBAN SKY GLOW (the night photos: a cloud deck over Brussels glows orange-grey from the street lights and lights
  // the snow everywhere, not only in the lamp pools): the lab's constant hemisphere light, warm, x night x cloud,
  // more with snow on the ground (its albedo sends the light back up to the clouds)
  const glow = env.uNight.value * (0.25 + 0.75 * weather.input.cloud) * (1 + 1.5 * wx.uSnowCover.value) * S.skyGlow;
  lighting.hemi.color.setRGB(1.0, 0.72, 0.48); lighting.hemi.groundColor.setRGB(0.5, 0.42, 0.36);
  lighting.hemi.intensity = glow;
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  if (!S.post) renderer.toneMappingExposure = lighting.exposureScale * 0.85 * lighting.adapt(0);
  sampleGpu();
  if (++frames % 15 === 1) {
    const r = renderer.info.render;
    S.gpu = gpu.samples.length ? `${mean(gpu.samples.slice(-60)).toFixed(2)} (compute ${mean(gpu.comp.slice(-60)).toFixed(3)})` : "—";
    S.stats = `${r.drawCalls} draws, ${(r.triangles / 1e6).toFixed(2)} M tris`;
    const st = weather.state;
    $info.textContent = `${S.preset}${S.live ? " (live)" : ""} · ${dayLabel(season.day)} ${S.hour.toFixed(1)} h · ${weather.input.temp.toFixed(1)} C\n` +
      `rain ${weather.input.rain.toFixed(1)} mm/h (level ${wx.uRain.value.toFixed(2)}) · snow ${weather.input.snow.toFixed(2)} cm/h · wind ${weather.input.wind.toFixed(1)} m/s · vis ${(weather.input.vis / 1000).toFixed(1)} km\n` +
      `wet ${st.wet.toFixed(2)} · puddles ${st.puddle.toFixed(2)} · snow ${(st.depth * 100).toFixed(1)} cm · slush ${st.slush.toFixed(2)} · frost ${st.frost.toFixed(2)} · sim x${weather.timeScale}\n` +
      `GPU ${S.gpu} ms · ${S.stats} · overhead bake ${omap.bakeMs.toFixed(0)} ms`;
  }
}
renderer.setAnimationLoop(() => frame());
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ================================================================================================ bench + tests (window.lab)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Interleaved A/B rounds: each variant `cycles` x (0.4 s settle + 1.2 s sampled). Returns mean GPU ms per variant. */
async function rounds(variants, cycles = 5) {
  const acc = Object.fromEntries(Object.keys(variants).map((k) => [k, []]));
  for (let c = 0; c < cycles; c++) for (const [k, setup] of Object.entries(variants)) {
    setup(); await wait(400); gpu.samples.length = 0; await wait(1200); acc[k].push(...gpu.samples);
  }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, { mean: +mean(a).toFixed(3), median: +(med(a) ?? NaN).toFixed(3), n: a.length }]));
}
const ALL = ["rainOn", "splashOn", "snowOn", "layerOn", "leavesOn", "matOn", "fogOn"];
function only(on) { for (const k of ALL) S[k] = on.includes(k); swapMaterials(S.matOn); }
async function bench(cycles = 5) {
  const out = {};
  const save = { ...S, input: { ...weather.input }, state: { ...weather.state } };
  // RAIN at street level: heavy rain
  VIEWS()["street, eye level"]();
  weather.setPreset("heavy rain", 0);
  out.rain = await rounds({ off: () => only(["matOn", "fogOn"]), drops: () => only(["matOn", "fogOn", "rainOn"]), dropsSplash: () => only(["matOn", "fogOn", "rainOn", "splashOn"]) }, cycles);
  const mode = (m) => () => { S.matMode = m; only(["fogOn", "matOn"]); };
  out.wet = await rounds({ dry: () => { S.matMode = "full"; only(["fogOn"]); }, wet: mode("full"), lite: mode("lite (far tiles)") }, cycles);
  S.matMode = "full";
  weather.setPreset("snowstorm", 0); weather.state.depth = 0.2;
  out.snow = await rounds({ off: () => only(["fogOn"]), flakes: () => only(["fogOn", "snowOn"]), layer: () => only(["fogOn", "layerOn"]),
    cover: () => only(["fogOn", "matOn"]), all: () => only(["fogOn", "snowOn", "layerOn", "matOn"]) }, cycles);
  Object.assign(weather.input, save.input); Object.assign(weather.state, save.state);
  for (const k of ALL) S[k] = save[k]; swapMaterials(S.matOn);
  S.bench = JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([a, b]) => [a, b.mean]))])));
  return out;
}
/** The flicker test with the lab's animation frozen. */
async function flicker({ move = "strafe", frames: n = 24, step = 0.0006, show = true } = {}) {
  frozen = true; path = null; controls.enabled = false;
  const r = await flickerTest({ renderFrame: () => frame(0), canvas: renderer.domElement, camera, controls, frames: n, move, step });
  frozen = false; controls.enabled = true;
  S.flicker = `${move}: ${r.blink} px (${r.ppm} ppm)`;
  if (show) showHeat(r);
  return r;
}
/** A strip of frames along a camera path (walk / drive / fly), composed in one image overlay for screenshots. */
async function strip({ view = "walk (footprints)", count = 6, every = 0.8, scale = 0.33 } = {}) {
  S.view = view; setView(view);
  const W = Math.round(renderer.domElement.width * scale), Hh = Math.round(renderer.domElement.height * scale);
  const cv = document.createElement("canvas"); cv.width = W * Math.min(3, count); cv.height = Hh * Math.ceil(count / 3);
  const g = cv.getContext("2d");
  await wait(600);
  for (let i = 0; i < count; i++) {
    await wait(every * 1000);
    await new Promise((res) => requestAnimationFrame(() => { frame(); g.drawImage(renderer.domElement, (i % 3) * W, Math.floor(i / 3) * Hh, W, Hh); res(); }));
  }
  let el = document.getElementById("strip");
  if (!el) { el = document.createElement("img"); el.id = "strip"; Object.assign(el.style, { position: "fixed", inset: "0", width: "100%", height: "100%", objectFit: "contain", zIndex: 60, background: "#000" }); el.onclick = () => el.remove(); document.body.append(el); }
  el.src = cv.toDataURL("image/jpeg", 0.85);
  return { w: cv.width, h: cv.height };
}
window.lab = { renderer, scene, camera, controls, lighting, weather, wx, season, S, omap, rain, snowP, leaves, snowLayer, gpu, bench, rounds, only, flicker, strip,
  views: VIEWS(), setView, setDay: (d) => { S.day = d; applyDay(d); }, preset: (p, s = 0) => { S.preset = p; weather.setPreset(p, s); applyMist(p); }, goLive, reg, frame,
  freeze: (v) => { frozen = v; } };
