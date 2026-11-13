// THE GARDENS LAB: the front-garden kit (viewer/gardens/gardenKit.js: the city's own loader, LODs, materials and pools;
// docs/assets/GARDENS.md) on a lab street of eight houses, each front in one of the styles the placement draws
// (tools/gardens/build_gardens.py make_style): low wall + wrought-iron railing, the same with a hedge behind
// (viewer/foliage/hedges.js, the foliage system's own hedges), a brick wall, a hedge with gate pillars, the modern flat-bar
// railing on a rendered wall, the Art Deco rings railing; pedestrian gates OPEN at the doors, a closed double driveway
// gate and an open driveway. The street can slope (the pieces shear with it: level courses, vertical bars, no floating
// edge). "LOD row": the styles repeated down 400 m to watch the dithered hand-over and count draws. Day / night.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Panel as GUI } from "../viewer/panelUI.js";
import { loadGardenKit, GardenPool, PIECES, gardenInstances, bandOf } from "../viewer/gardens/gardenKit.js";
import { CAP_T } from "../viewer/gardens/gardenGeom.js";
import { buildHedges } from "../viewer/foliage/hedges.js";
import { wind } from "../viewer/foliage/wind.js";
import { lodEye } from "../viewer/lodFade.js";
import { env } from "../viewer/lighting.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info");
const renderer = new THREE.WebGPURenderer({ antialias: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(-8, 10, 9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 0.5, far: 90 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const P = { layout: "street", slope: 0.0, night: false, wireframe: false, shadows: true, hedges: true, houses: true };
// the lab street, along +x: the road z > 0, a 13 cm kerb at z = 0, the sidewalk to z = -2.4 (the property line), the
// gardens behind; the ground rises along x by `slope` (a hill street)
const PL = -2.4, SW = 0.13;
const ground = (x, z) => x * P.slope + (z > PL && z <= 0 ? SW : 0);
const world = new THREE.Group(); scene.add(world);
function buildGround() {
  world.clear();
  const strip = (x0, x1, z0, z1, y, col) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 64, 1).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getX(i) * P.slope + y);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardNodeMaterial({ color: col, roughness: 0.9 })); m.receiveShadow = true; world.add(m);
  };
  strip(-60, 460, 0, 9, 0, 0x3a3b3e);           // road
  strip(-60, 460, PL, 0, SW, 0x8b8984);         // sidewalk top
  strip(-60, 460, -40, PL, -0.002, 0x4f6b35);   // gardens (lawn)
  // the kerb face and the sidewalk's back step (13 cm) as thin walls
  const face = (z, col) => { const g = new THREE.PlaneGeometry(520, SW, 64, 1).translate(200, SW / 2, z); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + p.getX(i) * P.slope); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardNodeMaterial({ color: col, roughness: 0.8, side: THREE.DoubleSide })); m.receiveShadow = true; world.add(m); };
  face(0, 0xb5b1a7); face(PL, 0x7d7b76);
  if (P.houses && P.layout === "street") {
    // eight houses (simple boxes): 7 m plots, the fronts 3.5 - 6 m behind the property line
    for (let i = 0; i < HOUSES.length; i++) {
      const h = HOUSES[i], x0 = i * 7, gap = h.gap;
      const g = new THREE.BoxGeometry(6.6, 8, 9).translate(x0 + 3.5, 4 + x0 * P.slope - 0.5, PL - gap - 4.5);
      const m = new THREE.Mesh(g, new THREE.MeshStandardNodeMaterial({ color: [0x8a5a48, 0xd8d2c6, 0x6e4a3c, 0xc4a77c][i % 4], roughness: 0.85 }));
      m.castShadow = m.receiveShadow = true; world.add(m);
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.1).translate(x0 + h.door, 1.15 + x0 * P.slope, PL - gap + 0.02), new THREE.MeshStandardNodeMaterial({ color: 0x3a2618, roughness: 0.6 }));
      world.add(d);
    }
  }
}
// the eight fronts: style (as make_style writes it), the gap, the door (x in the plot), a driveway
const S = (o) => ({ kind: "rail", brick: 0, cap: 0, rail: 0, paint: 0, wallH: 0.45, railH: 0.9, pillar: 1, hedge: null, hedgeH: 0, ...o });
const HOUSES = [
  { st: S({ gilded: 1 }), gap: 4, door: 2.0 },
  { st: S({ brick: 1, hedge: "privet", hedgeH: 1.5, railH: 0.85 }), gap: 5, door: 5.0 },
  { st: S({ kind: "wall", brick: 2, rail: -1, wallH: 0.75, railH: 0 }), gap: 4, door: 1.6, drive: [3.6, 6.6, true] },
  { st: S({ kind: "hedge", brick: 0, rail: -1, wallH: 0, railH: 0, hedge: "beech", hedgeH: 1.4 }), gap: 6, door: 3.5 },
  { st: S({ brick: 4, cap: 1, rail: 1, paint: 1, wallH: 0.4, railH: 0.95, pillar: 2 }), gap: 4.5, door: 1.8, drive: [3.4, 6.4, false] },
  { st: S({ brick: 3, rail: 2, paint: 2, wallH: 0.5, railH: 0.85 }), gap: 3.5, door: 2.4 },
  { st: S({ brick: 1, rail: 0, wallH: 0.35, railH: 1.0, hedge: "laurel", hedgeH: 1.6 }), gap: 5, door: 4.5 },
  { st: S({ kind: "wall", brick: 1, cap: 1, rail: -1, wallH: 1.4, railH: 0 }), gap: 4, door: 2.0 },
];
/** the lab's doc, in the city's format (data/gardens/<T>.json), from the eight fronts (the placement's rules: pillars at
 *  the plot ends and the openings, bays <= 3.2 m, the ped gate open into the garden) */
function labDoc(x0 = 0, out = { styles: [], segs: [], pillars: [], gates: [], hedges: [] }) {
  HOUSES.forEach((h, i) => {
    const sid = out.styles.length; out.styles.push(h.st);
    const px = x0 + i * 7, st = h.st, y = (x) => ground(x, PL + 0.01) - SW;      // the base: the lower side (the garden, at 0)
    const ops = [[h.door - 0.55, h.door + 0.55, "ped"]];
    if (h.drive) ops.push([h.drive[0], h.drive[1], "car", h.drive[2]]);
    ops.sort((a, b) => a[0] - b[0]);
    const pil = new Set([0, 7]);
    const solid = []; let s = 0;
    for (const o of ops) { pil.add(o[0]); pil.add(o[1]); if (o[0] > s) solid.push([s, o[0]]); s = o[1]; }
    if (s < 7) solid.push([s, 7]);
    const hasPil = st.kind !== "hedge";
    if (hasPil) for (const [a, b] of solid) { const n = Math.ceil((b - a) / (st.kind === "rail" ? 3.2 : 6) - 1e-6); for (let k = 1; k < n; k++) pil.add(a + (b - a) * k / n); }
    for (const [a, b] of solid) {
      if (st.kind === "hedge") { out.hedges.push({ points: Array.from({ length: Math.ceil((b - a) / 0.5) + 1 }, (_, k) => [px + Math.min(b, a + k * 0.5), PL - 0.45]), species: st.hedge, height: st.hedgeH, width: 0.7 }); continue; }
      const cuts = [...new Set([a, b, ...[...pil].filter((p) => p > a && p < b)])].sort((p, q) => p - q);
      for (let k = 1; k < cuts.length; k++) {
        const sa = cuts[k - 1] + 0.16, sb = cuts[k] - 0.16;
        for (let q = 0; q < Math.ceil((sb - sa) / 1.5); q++) {
          const xa = px + sa + (sb - sa) * q / Math.ceil((sb - sa) / 1.5), xb = px + sa + (sb - sa) * (q + 1) / Math.ceil((sb - sa) / 1.5);
          out.segs.push([xa, y(xa), PL, xb, y(xb), PL, sid, st.wallH]);
        }
        if (st.hedge) out.hedges.push({ points: Array.from({ length: Math.ceil((sb - sa) / 0.5) + 1 }, (_, j) => [px + Math.min(sb, sa + j * 0.5), PL - 0.5]), species: st.hedge, height: Math.max(st.hedgeH, st.wallH + CAP_T + st.railH * 0.8), width: 0.6 });
      }
    }
    for (const p of pil) {
      if (!hasPil && !ops.some((o) => Math.abs(o[0] - p) < 1e-6 || Math.abs(o[1] - p) < 1e-6)) continue;
      const x = px + p, h0 = st.kind === "rail" ? st.wallH + CAP_T + st.railH + 0.12 : st.kind === "wall" ? st.wallH + CAP_T + 0.15 : 1.1;
      out.pillars.push([x, y(x), PL, 0, h0, sid]);
    }
    for (const o of ops) {
      const w = o[1] - o[0] - 0.32, xa = px + o[0] + 0.16;
      const yy = Math.max(ground(xa, PL - 0.3), ground(xa + w, PL - 0.3));
      if (o[2] === "ped") out.gates.push([xa, yy, PL, 0, w, 0, 1.35, sid]);
      else if (o[3]) out.gates.push([xa, yy, PL, 0, w, 1, 0, sid]);
    }
  });
  return out;
}

const kit = await loadGardenKit();
const group = new THREE.Group(); scene.add(group);
const pools = PIECES.map((p) => new GardenPool(kit.pieces[p], kit.mats, group));
let hedgeGroup = null, tiles = [], docNow = null;
function rebuild() {
  buildGround();
  let doc = { styles: [], segs: [], pillars: [], gates: [], hedges: [] };
  if (P.layout === "street") labDoc(0, doc);
  else for (let i = 0; i < 8; i++) labDoc(i * 60, doc);
  docNow = doc;
  const t = gardenInstances(doc);
  tiles = [{ ...t, fade: 1 }];
  if (hedgeGroup) { hedgeGroup.removeFromParent(); hedgeGroup.traverse((o) => o.geometry?.dispose?.()); hedgeGroup = null; }
  if (P.hedges && doc.hedges.length) { const h = buildHedges(doc.hedges, (x, z) => ground(x, z)); hedgeGroup = h.group; scene.add(hedgeGroup); }
  regather(true);
}
const last = new THREE.Vector3(1e9, 0, 0);
function regather(force = false) {
  if (!force && camera.position.distanceToSquared(last) < 4) return;
  for (const p of pools) p.gather(tiles, camera.position);
  last.copy(camera.position);
}
function applyNight() {
  env.uNight.value = P.night ? 1 : 0;
  sun.intensity = P.night ? 0.04 : 2.6;
  scene.environmentIntensity = P.night ? 0.05 : 1;
  scene.background = new THREE.Color(P.night ? 0x0a1020 : 0x9fb3c8);
}
const gui = new GUI({ title: "Gardens Lab" });
gui.add(P, "layout", ["street", "LOD row"]).onChange(rebuild);
const slopeCtl = gui.add(P, "slope", 0, 0.12, 0.005).name("street slope").onChange(rebuild);
gui.add(P, "hedges").name("hedges (foliage)").onChange(rebuild);
gui.add(P, "houses").onChange(rebuild);
gui.add(P, "night").onChange(applyNight);
gui.add(P, "shadows").onChange((v) => { for (const p of pools) p.lod.forEach((m, k) => { m.castShadow = v && (/^(rail|gate|cargate)_/.test(p.piece.name) ? k === 0 : k < 2); }); });
gui.add(P, "wireframe").onChange((v) => { for (const m of kit.mats.opaque) m.wireframe = v; });
const views = {
  "street view": [[18, 1.7, 9], [24, 0.6, -3]], "railing + gate": [[2.5, 1.3, -0.6], [2.0, 0.8, -3.2]], "hedge behind": [[10, 1.5, 1.2], [10.5, 0.9, -3]],
  "driveway gates": [[18, 1.5, 2.5], [19, 0.8, -3]], "modern + deco": [[33, 1.5, 2.0], [36, 0.7, -3]], "grazing light": [[-6, 0.8, -1.2], [10, 0.6, -2.6]],
  "from the garden": [[4, 1.6, -7], [4, 0.6, -1.5]], "down the street (LODs)": [[-12, 2.0, 2.8], [300, 0.6, -2.4]],
};
/** a view on the (sloping) street: heights are above the ground at that x */
const setView = (k) => { const [p, t] = views[k] || views["street view"]; camera.position.set(p[0], p[1] + p[0] * P.slope, p[2]); controls.target.set(t[0], t[1] + Math.min(t[0], 60) * P.slope, t[2]); };
for (const k of Object.keys(views)) gui.add({ f: () => setView(k) }, "f").name(k);
if (qp.get("layout") === "lod") P.layout = "LOD row";
if (qp.get("slope")) { P.slope = +qp.get("slope"); slopeCtl.updateDisplay(); }
if (qp.get("night") === "1") P.night = true;
if (qp.get("hedges") === "0") P.hedges = false;
for (const c of gui.controllersRecursive?.() || []) c.updateDisplay?.();
applyNight();
rebuild();
setView(qp.get("view") || "street view");

const gpu = { samples: [], pending: false };
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let frame = 0, tPrev = performance.now();
window.lab = { kit, pools, P, camera, controls, renderer, regather, rebuild, views, doc: () => docNow,
  gpu: () => { const s = gpu.samples.slice(-120).sort((a, b) => a - b); return s.length ? { n: s.length, avg: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(3), p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)] } : null; },
  resetGpu: () => { gpu.samples.length = 0; },
  view: setView,
  stats: () => ({ draws: renderer.info.render.drawCalls, tris: renderer.info.render.triangles, meshes: pools.reduce((s, p) => s + p.drawn, 0),
    instances: Object.fromEntries(pools.map((p) => [p.piece.name, p.instances])) }) };
renderer.setAnimationLoop(() => {
  const now = performance.now(); wind.update(Math.min(0.1, (now - tPrev) / 1000)); tPrev = now;
  controls.update();
  lodEye.value.copy(camera.position);
  regather();
  renderer.render(scene, camera);
  if (renderer.backend.trackTimestamp && !gpu.pending && frame % 4 === 0) {
    gpu.pending = true;
    renderer.resolveTimestampsAsync("render").then((ms) => { if (ms) gpu.samples.push(+ms.toFixed(3)); gpu.pending = false; }).catch(() => { gpu.pending = false; });
  }
  if (++frame % 30 === 0) {
    const g = window.lab.gpu(), info = renderer.info.render;
    $info.textContent = Object.values(kit.pieces).map((p) => `${p.name.padEnd(15)} LOD0/1/2 ${p.tris.join(" / ")} tris, bands ${bandOf(p.name).join(" / ")} m`).join("\n") +
      `\ngarden meshes drawn: ${pools.reduce((s, p) => s + p.drawn, 0)}` +
      `\nframe: ${info.drawCalls} draws, ${info.triangles} tris · GPU ${g ? `${g.avg} ms avg, p95 ${g.p95}` : "n/a"} · kit load ${kit.loadMs.toFixed(0)} ms`;
  }
});
