// THE FALCON LAB: the Saint-Job peregrine family (viewer/falcons.js, the code the city runs) at the real church
// (viewer/stjobModel.js) on the real ground (UrbIS DTM + orthophoto), under the city's lighting and post chain.
// Views: the scrape inside the belfry, the louvre ledge, the spire cross, from the street, following a bird; behaviour
// triggers (the food pass, a stoop, circling, perching, feeding); the look (chamber light, down sheen, time of day);
// reference photos from Wikimedia Commons side by side (data/raw/refs/falcons/, git-ignored, licences in SOURCES.json);
// cost: the family's CPU ms, birds animated / on screen / on the LOD mesh / casting shadows, GPU ms, an A/B benchmark.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { texture, vec3, mix, smoothstep, positionWorld } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { Lighting, PRESETS } from "../viewer/lighting.js";
import { createPipeline } from "../viewer/post.js";
import { loadStJob, STJOB_LODS } from "../viewer/stjobModel.js";
import { createFalcons, falconLook, FALCON_SIZES } from "../viewer/falcons.js";

const qp = new URLSearchParams(location.search);
const $info = document.getElementById("info"), $ref = document.getElementById("ref"), $refcap = document.getElementById("refcap");
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: qp.get("gpu") !== "0" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();
const backend = renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL2 (fallback)";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const preset = PRESETS[qp.get("time")] ? qp.get("time") : "midday";
const lighting = new Lighting(scene, renderer, preset);

// ------------------------------------------------------------------------------------------------ the church
const church = await loadStJob();
const P0 = church.placement.position, ROT = church.placement.rotationY;
const root = new THREE.Group();
root.position.copy(P0); root.rotation.y = ROT;
scene.add(root);
const levels = STJOB_LODS.map((_, k) => { const g = church.make(k); g.visible = k === 0; root.add(g); return g; });
root.updateMatrixWorld(true);
const toWorld = (v) => v.clone().applyMatrix4(root.matrixWorld);

// ------------------------------------------------------------------------------------------------ ground: DTM + orthophoto (as the Church Lab)
const site = await fetch("../models/stjob/site_dtm.json").then((r) => r.json());
const dtm = new Uint16Array(await fetch("../models/stjob/site_dtm.bin").then((r) => r.arrayBuffer()));
const groundAt = (x, z) => {
  const c = THREE.MathUtils.clamp((x - site.x0) / site.step, 0, site.cols - 1.001), r = THREE.MathUtils.clamp((z - site.z0) / site.step, 0, site.rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, H = (i, j) => dtm[j * site.cols + i] / 100 + 60;
  return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr;
};
{
  const n = (site.cols - 1) / 2 + 1, size = (site.cols - 1) * site.step;
  const g = new THREE.PlaneGeometry(size, size, n - 1, n - 1).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + site.x0 + size / 2, z = p.getZ(i) + site.z0 + size / 2; p.setXYZ(i, x, groundAt(x, z) - 0.02, z); }
  g.computeVertexNormals();
  const ortho = await new THREE.TextureLoader().loadAsync("../data/tiles/G4/ortho.jpg").catch(() => null);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.92 });
  if (ortho) {
    ortho.colorSpace = THREE.SRGBColorSpace; ortho.anisotropy = 8;
    const ouv = positionWorld.xz.sub(vec3(1000, 0, 500).xz).div(500);
    const edge = smoothstep(70, 60, positionWorld.xz.sub(vec3(P0.x, 0, P0.z).xz).length());
    m.colorNode = mix(vec3(0.16, 0.16, 0.15), texture(ortho, ouv).rgb.mul(0.92), edge);
  } else m.color.set(0x55575c);
  const ground = new THREE.Mesh(g, m); ground.receiveShadow = true; scene.add(ground);
  const farG = new THREE.Mesh(new THREE.CircleGeometry(4000, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x3b3d36, roughness: 1 }));
  farG.position.set(P0.x, 69.5, P0.z); farG.receiveShadow = true; scene.add(farG);
}

// ------------------------------------------------------------------------------------------------ the falcons
const fam = await createFalcons({ church, heightAt: groundAt, params: { pace: +(qp.get("pace") ?? 1) } });
scene.add(fam.group);
const perchMarks = new THREE.Group(); perchMarks.visible = false; fam.group.add(perchMarks);
for (const [k, p] of Object.entries(fam.perch)) {
  const m = new THREE.ArrowHelper(p.facing, p.pos, 0.6, 0xffb020, 0.15, 0.08); m.name = k; perchMarks.add(m);
}

// ------------------------------------------------------------------------------------------------ views
const L = (name) => fam.perch[name].pos, Fo = (name) => fam.perch[name].facing;
const nestC = fam.nestPoint(0, 0.45, 0);
const VIEWS = {
  "the scrape (inside)": () => [fam.nestPoint(0.55, 1.05, 1.0), fam.nestPoint(0, 0.38, -0.05), 50],
  "the scrape from the arch": () => [fam.nestPoint(-0.25, 0.85, 1.55), fam.nestPoint(0.0, 0.4, 0.0), 45],
  "louvre ledges": () => [L("louvre").clone().addScaledVector(Fo("louvre"), 5).add(new THREE.Vector3(1.5, 1.2, 0)), L("ledge").clone().lerp(L("louvre"), 0.5).add(new THREE.Vector3(0, 0.5, 0)), 45],
  "spire cross": () => [L("cross").clone().addScaledVector(Fo("cross"), 4).add(new THREE.Vector3(1.5, 0.5, 1)), L("cross").clone().add(new THREE.Vector3(0, 0.2, 0)), 45],
  "gable cross": () => [L("gable").clone().addScaledVector(Fo("gable"), 4).add(new THREE.Vector3(-1.5, 0.6, 0)), L("gable").clone().add(new THREE.Vector3(0, 0.2, 0)), 45],
  "tower from the Place (street)": () => [L("ledge").clone().addScaledVector(Fo("ledge"), 55).setY(-1.5 + 1.7), L("ledge").clone().add(new THREE.Vector3(0, 8, 0)), 40],
  "belfry (binoculars)": () => [L("ledge").clone().addScaledVector(Fo("ledge"), 45).setY(0.2), L("ledge").clone().lerp(L("louvre"), 0.5).add(new THREE.Vector3(0, 1.5, 0)), 7],
  "the sky over Saint-Job": () => [new THREE.Vector3(-40, 0.3, -60), new THREE.Vector3(-30, 70, -30), 60],
};
const S = {
  view: qp.get("view") && VIEWS[qp.get("view")] ? qp.get("view") : "the scrape from the arch", follow: "none",
  time: preset, hour: lighting.hour, post: true, perches: false, nestLight: falconLook.nestLight.value, sheen: falconLook.downSheen.value,
  pace: fam.params.pace, ref: "none", stats: "", bench: "—", log: "", on: true,
};
function goView(name) {
  const v = VIEWS[name]; if (!v) return;
  const [pos, tgt, fov] = v();
  camera.position.copy(toWorld(pos)); controls.target.copy(toWorld(tgt)); camera.fov = fov; camera.updateProjectionMatrix();
  S.view = name; S.follow = "none";
}

// reference photos (Wikimedia Commons, only on disk where data/raw/refs/falcons/ was fetched; never shipped)
const refs = await fetch("../data/raw/refs/falcons/SOURCES.json").then((r) => (r.ok ? r.json() : [])).catch(() => []);
function showRef(file) {
  const r = refs.find((x) => x.file === file);
  if (!r) { $ref.style.display = $refcap.style.display = "none"; return; }
  $ref.src = `../data/raw/refs/falcons/${r.file}`; $ref.style.display = "block";
  $refcap.textContent = `${r.title.replace("File:", "")} — ${r.author}, ${r.licence} (Wikimedia Commons)`; $refcap.style.display = "block";
}

// ------------------------------------------------------------------------------------------------ panel
const ui = new Panel({ title: "Falcon Lab" });
const fv = ui.addFolder("View");
fv.add(S, "view", Object.keys(VIEWS)).name("viewpoint").onChange(goView).listen();
fv.add(S, "follow", ["none", "female", "male", "eyas0"]).name("follow a bird").listen();
fv.add(S, "ref", ["none", ...refs.map((r) => r.file)]).name("reference photo").onChange(showRef);
fv.add(S, "perches").name("show the perch nodes").onChange((v) => { perchMarks.visible = v; });
const fb = ui.addFolder("Behaviour");
fb.add({ go: () => fam.force("food") }, "go").name("the male brings prey: food pass, feeding");
fb.add({ go: () => fam.force("stoop") }, "go").name("the male hunts: a stoop");
fb.add({ go: () => fam.force("circle") }, "go").name("both circle on a thermal");
fb.add({ go: () => fam.force("perch") }, "go").name("both land on perches");
fb.add({ go: () => fam.force("feed") }, "go").name("the female feeds the young now");
fb.add(S, "pace", 0.25, 4, 0.05).name("pace (perch / circle times)").onChange((v) => { fam.params.pace = v; });
fb.add(S, "on").name("falcons on").onChange((v) => { fam.enabled = v; });
const fl = ui.addFolder("Look");
fl.add(S, "time", Object.keys(PRESETS)).name("light preset").onChange((v) => { lighting.apply(v); lighting.hourOverride = null; pipe?.look(v); S.hour = lighting.hour; });
fl.add(S, "hour", 4, 23.9, 0.05).name("solar hour").onChange((v) => { lighting.hourOverride = v; }).listen();
fl.add(S, "nestLight", 0.1, 1, 0.01).name("belfry chamber light").onChange((v) => { falconLook.nestLight.value = v; });
fl.add(S, "sheen", 0, 1.5, 0.01).name("down sheen (eyases)").onChange((v) => { falconLook.downSheen.value = v; });
fl.add(S, "post").name("post effects");
const fp = ui.addFolder("Performance");
fp.add(S, "stats").name("falcons");
fp.add({ go: () => bench() }, "go").name("A/B: falcons off / on (GPU + CPU ms)");
fp.add(S, "bench").name("result");
goView(S.view);

// ------------------------------------------------------------------------------------------------ loop
await lighting.attach(camera);
let pipe = createPipeline(renderer, scene, camera);
pipe.setExposureScale(lighting.exposureScale); pipe.look(preset);
const hazeHook = (rt, d, size) => lighting.hazeHook(rt, d, size);
const gpu = { avg: 0, pending: false, samples: [] }, cpu = { samples: [] };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) { gpu.avg = gpu.avg ? gpu.avg * 0.9 + ms * 0.1 : ms; gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); } })
    .catch(() => {}).finally(() => { gpu.pending = false; });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
async function bench() {
  const res = {};
  for (const on of [false, true, false, true]) {
    fam.enabled = on; await new Promise((r) => setTimeout(r, 700));
    gpu.samples.length = 0; cpu.samples.length = 0;
    await new Promise((r) => setTimeout(r, 2500));
    (res[on ? "on" : "off"] ??= []).push([med(gpu.samples), med(cpu.samples)]);
  }
  fam.enabled = S.on;
  const avg = (k, i) => res[k].reduce((s, x) => s + x[i], 0) / res[k].length;
  S.bench = `GPU off ${avg("off", 0).toFixed(2)} on ${avg("on", 0).toFixed(2)} ms (+${(avg("on", 0) - avg("off", 0)).toFixed(2)}) · falcons CPU ${avg("on", 1).toFixed(3)} ms`;
  console.log("[falcon lab] A/B", JSON.stringify(res), S.view);
  return S.bench;
}
/** a still bird on the louvre ledge for a close look at a pose: w = clip weights, yaw = turn (rad), dist (m) */
function testPose(w = { idle: 1, flap: 0, glide: 0 }, yaw = 1.2, who = "female", dist = 1.6, h = 0.2) {
  const b = fam.birds.find((x) => x.name === who);
  // in daylight on the Place, 30 m out from the tower (the ledge is in the reveal's shade)
  const O = fam.nestPoint(0, 0, 30), gw = toWorld(O); O.y = groundAt(gw.x, gw.z) - P0.y + 0.6;
  const at = (x, y, z) => O.clone().add(fam.nestDir(x, y, z));
  b.state = "test"; b.pos.copy(at(0, 0, 0)); b.yaw = fam.nestFrame.rotation.y + yaw; b.pitch = b.bank = b.roll = 0;
  b.setWeights(w.idle, w.flap, w.glide); b.w = { ...b.tw };
  camera.position.copy(toWorld(at(-0.2, 0.05 + h, dist))); controls.target.copy(toWorld(at(0, 0.12 * FALCON_SIZES[b.kind] / 0.5, 0)));
  camera.fov = 40; camera.updateProjectionMatrix(); S.follow = "none";
}
window.lab = { testPose, renderer, scene, camera, controls, fam, church, lighting, goView, bench, gpu, S, VIEWS, toWorld, showRef, refs };

let last = performance.now(), frames = 0, fpsAcc = 0, fpsN = 0, fps = 0;
const tmp = new THREE.Vector3(), prevFollow = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  // follow: the orbit target rides with the bird (the camera keeps its offset)
  if (S.follow !== "none") {
    const b = fam.birds.find((x) => x.name === S.follow);
    if (b) { fam.toWorld(b.pos, tmp); if (prevFollow.lengthSq() > 0) camera.position.add(tmp.clone().sub(prevFollow)); controls.target.copy(tmp); prevFollow.copy(tmp); }
  } else prevFollow.set(0, 0, 0);
  controls.update();
  const dist = camera.position.distanceTo(P0);
  const k = STJOB_LODS.findIndex((l) => dist < l.until);
  levels.forEach((g, i) => { g.visible = i === k; });
  const t0 = performance.now();
  fam.update(camera, dt);
  cpu.samples.push(performance.now() - t0); if (cpu.samples.length > 600) cpu.samples.shift();
  lighting.update(camera.position.y, groundAt(camera.position.x, camera.position.z), controls.target, THREE.MathUtils.clamp(dist * 0.9, 60, 380));
  if (S.post) pipe.render(hazeHook); else renderer.render(scene, camera);
  pipe.setExposureFactor(lighting.adapt(dt));
  sampleGpu();
  if (++frames % 10 === 1) {
    const st = fam.stats, r = renderer.info.render;
    S.stats = `${st.cpuMs.toFixed(3)} ms CPU · anim ${st.animated}/${st.birds} · on screen ${st.onScreen} · LOD1 ${st.lod1} · shadows ${st.shadows}`;
    $info.textContent = `${backend} · ${fps.toFixed(0)} fps · GPU ${gpu.avg.toFixed(2)} ms · ${r.drawCalls ?? r.calls} draws · ${(r.triangles / 1000).toFixed(0)}k tris\n` +
      `falcons: ${S.stats}\nnest ${st.nest} · female ${st.female} · male ${st.male}\n` + fam.log.slice(-5).join("\n") + `\nA/B: ${S.bench}`;
  }
});
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
