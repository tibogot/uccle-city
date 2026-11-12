// THE MATERIAL REVIEW LAB (labs/material-lab.html; the first lab stays at ?old=1). Built for the owner's review:
//   LEFT    every library material with badges: which versions exist (P procedural, S scans, M Megascans dropped in /
//           on the shopping list), the measured cost, and the owner's verdict.
//   CENTRE  the selected material's candidates SIDE BY SIDE (2-4 columns) on the SAME wall (roof slope / ground for
//           roof and ground materials), the SAME light and the SAME camera; one row per DISTANCE stop (1 / 10 / 50 /
//           200 m, any two or three at once: near and far together). STRAFE moves every camera sideways a little
//           (shimmer shows as crawling); SHIMMER measures it per tile (the flicker test: blinking pixels per million).
//   VERDICT under each tile ("choose this"), "needs work" + a note per material; saved in this browser and as
//           verdicts.json (download; commit it as viewer/materials/verdicts.json).
//   BUILDING the town hall with its temporary materials (A) vs the library's chosen candidates per slot (B), and a
//           street of façades (the city's shaders today vs the library): how the choice reads on a real building.
// Only redraws when something changed (or while strafing): the lab costs nothing while you read.
// URL: ?mat=<name>&view=wall|townhall|street&light=sun|shade|overcast|night&d=1,50
import * as THREE from "three/webgpu";
import { float, vec3, mix, smoothstep, positionWorld, normalize, cameraPosition, uniform, Fn, vec4 } from "three/tsl";
import { Panel } from "../viewer/panelUI.js";
import { env } from "../viewer/lighting.js";
import { DEFS, MATERIAL_NAMES, createMaterial, createLook, paramSpec, readParams } from "../viewer/materials/library.js";
import { loadScans, loadManifest, loadCandidate, SCANS, CANDS } from "../viewer/materials/scans.js";
import { flickerTest } from "./flickerTest.js";

const qp = new URLSearchParams(location.search);
const SIDEBAR = 300, TOP = 96;

// ------------------------------------------------------------------------------------------------ DOM
const css = `
#rv-side { position: fixed; left: 0; top: 0; bottom: 0; width: ${SIDEBAR}px; overflow-y: auto; background: #14171c; border-right: 1px solid #2a2f37; z-index: 3; }
#rv-side h1 { font-size: 15px; margin: 10px 12px 2px; } #rv-side .sub { margin: 0 12px 8px; color: #8d98a6; font-size: 12px; }
#rv-side .sub a { color: #9cc4ff; }
.rv-mat { padding: 6px 12px; cursor: pointer; border-top: 1px solid #22262d; }
.rv-mat:hover { background: #1d2128; } .rv-mat.on { background: #243046; }
.rv-mat .nm { font-weight: 600; } .rv-mat .lb { color: #8d98a6; font-size: 11px; }
.rv-b { display: inline-block; padding: 0 5px; margin: 2px 3px 0 0; border-radius: 3px; font: 600 10.5px/16px system-ui; background: #2d333c; color: #c9d1db; }
.rv-b.p { background: #3a3550; } .rv-b.s { background: #24486b; } .rv-b.m { background: #6b4a12; color: #ffe2a8; } .rv-b.mq { background: #3b3220; color: #c9b58a; }
.rv-b.ok { background: #1f6b3a; color: #d8ffe4; } .rv-b.nw { background: #7a2a2a; color: #ffd9d9; } .rv-b.ms { background: #1d2a33; color: #9fc3d9; }
#rv-top { position: fixed; left: ${SIDEBAR}px; right: 0; top: 0; height: ${TOP}px; background: #14171c; border-bottom: 1px solid #2a2f37; z-index: 3; padding: 6px 10px; box-sizing: border-box; }
#rv-top .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 4px; }
#rv-top button, #rv-verdict button { background: #2b313b; color: #e6e9ee; border: 1px solid #3c4450; border-radius: 5px; padding: 3px 9px; font: inherit; cursor: pointer; }
#rv-top button.on { background: #2f5d9a; border-color: #4f86cf; } #rv-top button:hover { background: #36404d; }
#rv-top .lab { color: #8d98a6; margin: 0 2px 0 8px; } #rv-help { color: #b9c3cf; font-size: 11.5px; line-height: 1.3; }
#rv-tiles { position: fixed; left: ${SIDEBAR}px; right: 0; top: ${TOP}px; bottom: 0; pointer-events: none; z-index: 2; }
.rv-tile { position: absolute; box-sizing: border-box; border: 1px solid rgba(0,0,0,.6); }
.rv-tile.chosen { border: 3px solid #3ddc84; }
.rv-tl { position: absolute; left: 6px; top: 6px; right: 6px; display: flex; justify-content: space-between; gap: 6px; pointer-events: none; }
.rv-tl .t { background: rgba(14,16,20,.82); padding: 3px 7px; border-radius: 4px; font-size: 12px; }
.rv-tl .t b { font-size: 13px; } .rv-tl .t .d { color: #9aa5b3; font-size: 11px; }
.rv-tb { position: absolute; left: 6px; bottom: 6px; pointer-events: auto; display: flex; gap: 6px; align-items: center; }
.rv-tb button { background: rgba(20,24,30,.85); color: #e6e9ee; border: 1px solid #4b5563; border-radius: 5px; padding: 3px 9px; cursor: pointer; font: 600 12px system-ui; }
.rv-tb button.on { background: #1f7a45; border-color: #3ddc84; }
.rv-tb .sh { background: rgba(14,16,20,.82); padding: 2px 6px; border-radius: 4px; font: 11px ui-monospace, monospace; }
.rv-dist { position: absolute; right: 6px; bottom: 6px; background: rgba(14,16,20,.82); padding: 2px 6px; border-radius: 4px; font: 600 12px system-ui; }
#rv-verdict { margin: 8px 12px 12px; padding: 8px; background: #1b1f26; border-radius: 6px; }
#rv-verdict textarea { width: 100%; box-sizing: border-box; height: 54px; background: #262b33; color: #e6e9ee; border: 1px solid #3c4450; border-radius: 4px; font: 12px system-ui; }
#rv-verdict .chosen { color: #3ddc84; font-weight: 600; }
#rv-status { position: fixed; right: 10px; top: 46px; z-index: 3; background: rgba(14,16,20,.85); padding: 3px 8px; border-radius: 4px; font: 11px ui-monospace, monospace; color: #b9c3cf; pointer-events: none; }
.upanel { top: auto !important; bottom: 0 !important; left: 0 !important; right: auto !important; border-radius: 0 !important; max-height: calc(100vh - 120px) !important; width: ${SIDEBAR}px !important; z-index: 4 !important; }
#rv-list { padding-bottom: 44px; }
`;
document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
document.body.insertAdjacentHTML("beforeend", `
<div id="rv-side"><h1>Material Lab</h1>
  <div class="sub">review: candidates side by side · <a href="?old=1">old lab</a> · <a href="./">all labs</a> · <a href="../docs/MATERIALS.md">docs</a></div>
  <div id="rv-verdict"></div><div id="rv-list"></div></div>
<div id="rv-top">
  <div class="row" id="rv-row1"></div>
  <div class="row"><span id="rv-help">How to review: pick a material on the left · compare the tiles (same wall, light, camera; one column per version) · switch distances (two rows = near + far) · STRAFE / SHIMMER to see and count crawling · click <b>choose this</b> under the best one · note what's wrong · download verdicts.json when done.</span></div>
</div>
<div id="rv-tiles"></div><div id="rv-status">loading…</div>`);
const $list = document.getElementById("rv-list"), $verdict = document.getElementById("rv-verdict"), $row1 = document.getElementById("rv-row1");
const $tiles = document.getElementById("rv-tiles"), $status = document.getElementById("rv-status");

// ------------------------------------------------------------------------------------------------ renderer + scene
const renderer = new THREE.WebGPURenderer({ antialias: true, powerPreference: "high-performance", reversedDepthBuffer: true, trackTimestamp: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);
await renderer.init();

const scene = new THREE.Scene();
// sky: a gradient dome (drawn per tile; the tiles don't clear each other)
const uSkyTop = uniform(new THREE.Color(0x3d6aa8)), uSkyHor = uniform(new THREE.Color(0xc9d6e3)), uSkyGround = uniform(new THREE.Color(0x4a4640));
const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
skyMat.colorNode = Fn(() => {
  const d = normalize(positionWorld.sub(cameraPosition)).y;
  return vec4(mix(mix(vec3(uSkyHor), vec3(uSkyTop), smoothstep(0.0, 0.6, d)), vec3(uSkyGround), smoothstep(0.0, -0.05, d)), float(1));
})();
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbcd0e8, 0x6b6156, 1.2); scene.add(hemi);
const lamp = new THREE.PointLight(0xffc27a, 0, 30, 2); scene.add(lamp);
// environment for reflections (metals, glass): a PMREM of the gradient sky
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function bakeEnv() {
  const s = new THREE.Scene(); const m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat); s.add(m);
  envRT = pmrem.fromScene(s, 0, 0.1, 100, envRT ? { renderTarget: envRT } : undefined);
  scene.environment = envRT.texture;
}
// light presets: the same for every tile. Sun = low raking sun across the wall (shows relief and shimmer worst).
const LIGHTS = {
  sun: { dir: [-0.75, 0.45, 0.5], sun: 0xfff1dc, si: 3.2, hs: 0xa9c4e6, hg: 0x7d6e5e, hi: 1.0, top: 0x2f5f9e, hor: 0xc7d8ea, gr: 0x5a5249, exp: 1.0, envI: 0.6, night: 0 },
  shade: { dir: [0.5, 0.55, -0.66], sun: 0xfff1dc, si: 3.2, hs: 0xb2cbe8, hg: 0x7d6e5e, hi: 1.6, top: 0x2f5f9e, hor: 0xc7d8ea, gr: 0x5a5249, exp: 1.25, envI: 0.8, night: 0 },
  overcast: { dir: [-0.2, 0.9, 0.35], sun: 0xe9eef3, si: 0.6, hs: 0xd4dbe3, hg: 0x7a746c, hi: 2.2, top: 0x9aa4b0, hor: 0xd0d4d8, gr: 0x625d56, exp: 1.1, envI: 0.9, night: 0 },
  night: { dir: [0.4, 0.7, 0.6], sun: 0x7d9bd6, si: 0.12, hs: 0x22324f, hg: 0x2a2428, hi: 0.25, top: 0x050a16, hor: 0x142036, gr: 0x0d0c0c, exp: 1.6, envI: 0.25, night: 0.86, lamp: 60 },
};

// ------------------------------------------------------------------------------------------------ test surfaces
// one big plane per surface kind, at the origin; cameras look at it from the distance stops
const WALL = new THREE.Mesh(new THREE.PlaneGeometry(800, 300).translate(0, 150, 0), null);
const FLOOR = new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), null);
const ROOF = new THREE.Mesh(new THREE.PlaneGeometry(800, 400).translate(0, 200, 0).rotateX(-Math.PI / 2 + THREE.MathUtils.degToRad(40)), null);
const GROUND_PLAIN = new THREE.Mesh(new THREE.PlaneGeometry(800, 400).rotateX(-Math.PI / 2).translate(0, 0, 200), new THREE.MeshStandardNodeMaterial({ color: 0x55524c, roughness: 0.95 }));
// (buildings) a plain ground around the town hall (its own forecourt / steps sit on it)
const BLD_GROUND = new THREE.Mesh(new THREE.CircleGeometry(1500, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardNodeMaterial({ color: 0x5d5a52, roughness: 0.95 }));
for (const m of [WALL, FLOOR, ROOF, GROUND_PLAIN, BLD_GROUND]) { m.receiveShadow = true; m.visible = false; scene.add(m); }
const surfOf = (name) => {
  const k = DEFS[name].kind;
  return k === "ground" ? "floor" : k === "roof" || k === "metalroof" ? "roof" : "wall";
};
const STOPS = [1, 10, 50, 200];
/** the camera of a distance stop for a surface kind (x offset s: strafe). Slightly oblique (18 deg): one tile shows a
 *  range of distances and the grazing side. */
function poseCam(cam, kind, d, s = 0) {
  const yaw = THREE.MathUtils.degToRad(18);
  if (kind === "wall") {
    const h = Math.max(1.5, d * 0.25);
    cam.position.set(Math.sin(yaw) * d + s, h, Math.cos(yaw) * d);
    cam.lookAt(s, h * 0.92, 0);
  } else if (kind === "floor") {
    const el = THREE.MathUtils.degToRad(d <= 1 ? 50 : 32);
    cam.position.set(Math.sin(yaw) * d * Math.cos(el) + s, d * Math.sin(el), Math.cos(yaw) * d * Math.cos(el));
    cam.lookAt(s, 0, 0);
  } else {
    // the roof plane rises 40 deg away from the camera; look at a point on it from below / in front
    const a = THREE.MathUtils.degToRad(40), py = Math.sin(a) * 20, pz = -Math.cos(a) * 20;
    const n = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
    const p = new THREE.Vector3(s, py, pz), dir = n.clone().multiplyScalar(0.8).add(new THREE.Vector3(Math.sin(yaw), 0, 0.6)).normalize();
    cam.position.copy(p).addScaledVector(dir, d); cam.lookAt(p);
  }
  cam.updateMatrixWorld(true);
}

// ------------------------------------------------------------------------------------------------ data
$status.textContent = "loading scans…";
await loadScans(renderer).catch((e) => console.warn("[review] shipped scans failed:", e));
const manifest = await loadManifest();
// ?before=1: the procedural materials as they were before the 2026-11-12 shimmer fix (viewer/materials/_before/, a
// local copy of 0dd5655, not committed): for the before / after shimmer numbers
const BEFORE = qp.get("before") === "1" ? await import("../viewer/materials/_before/library.js").catch(() => null) : null;
const getJSON = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const costs = (await getJSON("../viewer/materials/costs.json")) ?? { materials: {} };
const shopping = (await getJSON("../tools/textures/megascans.json")) ?? {};
const LS = "uccle.materialReview.verdicts";
let verdicts = (await getJSON("../viewer/materials/verdicts.json"))?.materials ?? {};
try { Object.assign(verdicts, JSON.parse(localStorage.getItem(LS) || "{}")); } catch { /* private mode */ }
const saveVerdicts = () => { try { localStorage.setItem(LS, JSON.stringify(verdicts)); } catch { /* private mode */ } };
/** the versions of a material: procedural first, then its candidates (shipped scan, CC0, Megascans) */
function versions(name) {
  const out = [{ id: "proc", kind: "proc", name: "Procedural", source: "library (TSL)", licence: "ours" }];
  if (BEFORE) out.push({ id: "proc_before", kind: "proc", name: "Procedural BEFORE the fix", source: "0dd5655", licence: "ours" });
  for (const c of manifest.materials?.[name] ?? []) out.push(c);
  if (!(manifest.materials?.[name] ?? []).some((c) => c.current) && SCANS[name]) out.splice(1, 0, { ...SCANS[name].meta, id: "shipped", kind: "cc0", name: SCANS[name].meta.id, current: true });
  return out;
}
const megaWanted = (name) => Object.entries(shopping).filter(([, v]) => v.material === name);

// ------------------------------------------------------------------------------------------------ state
const S = {
  material: MATERIAL_NAMES.includes(qp.get("mat")) ? qp.get("mat") : "brick_red_brussels",
  view: qp.get("view") || "wall", light: LIGHTS[qp.get("light")] ? qp.get("light") : "sun",
  stops: (qp.get("d") || "1,50").split(",").map(Number).filter((d) => STOPS.includes(d)),
  shown: {}, strafe: false, focus: 0, tint: 0.35,
};
if (!S.stops.length) S.stops = [1, 50];
const shimmer = {};                     // `${mat}|${id}|${d}` -> ppm
let dirty = true;
const markDirty = () => { dirty = true; };

// materials: one per (material, version); a look per version (scans keep their own tint)
const looks = {}, mats = {};
function lookFor(name, id) {
  const k = `${name}|${id}`;
  if (!looks[k]) {
    looks[k] = createLook(name);
    if (id !== "proc") looks[k].scanTint.value = S.tint;
  }
  return looks[k];
}
async function materialFor(name, v) {
  const k = `${name}|${v.id}`;
  if (mats[k]) return mats[k];
  if (v.id === "proc_before") return (mats[k] = BEFORE.createMaterial(name, { mapping: "world" }));
  let opts = { mapping: "world", look: lookFor(name, v.id) };
  if (v.id !== "proc") {
    const scan = v.id === "shipped" ? SCANS[name] : await loadCandidate(renderer, v.id).catch((e) => { console.warn(e); return null; });
    if (!scan) return null;
    opts = { ...opts, variant: "scan", scan };
  }
  return (mats[k] = createMaterial(name, opts));
}

// ------------------------------------------------------------------------------------------------ list
function badges(name) {
  const vs = versions(name), sc = vs.filter((v) => v.kind === "cc0").length, mg = vs.filter((v) => v.kind === "megascans").length;
  const want = megaWanted(name).length, vd = verdicts[name];
  const c = costs.materials?.[name];
  let h = `<span class="rv-b p" title="procedural version">P</span>`;
  if (sc) h += `<span class="rv-b s" title="CC0 scans (Poly Haven / ambientCG)">S ${sc}</span>`;
  if (mg) h += `<span class="rv-b m" title="Megascans dropped in: licence check before public">M ${mg}</span>`;
  else if (want) h += `<span class="rv-b mq" title="Megascans on the shopping list, not downloaded yet">M? ${want}</span>`;
  if (c?.proc?.gpu_ms != null) h += `<span class="rv-b ms" title="GPU ms per full-screen wall over a plain material (procedural / best scan)">${c.proc.gpu_ms.toFixed(2)}${bestScanMs(c)}</span>`;
  if (vd?.choice) h += `<span class="rv-b ok" title="your choice">✓ ${shortName(name, vd.choice)}</span>`;
  if (vd?.needsWork) h += `<span class="rv-b nw">needs work</span>`;
  return h;
}
const bestScanMs = (c) => { const v = Object.entries(c).filter(([k]) => k !== "proc").map(([, x]) => x.gpu_ms).filter((x) => x != null); return v.length ? ` / ${Math.min(...v).toFixed(2)} ms` : " ms"; };
const shortName = (name, id) => (id === "proc" ? "procedural" : (versions(name).find((v) => v.id === id)?.name ?? id));
function drawList() {
  $list.innerHTML = MATERIAL_NAMES.map((n) => `<div class="rv-mat${n === S.material ? " on" : ""}" data-n="${n}"><div class="nm">${n}</div><div class="lb">${DEFS[n].label}</div><div>${badges(n)}</div></div>`).join("");
  for (const el of $list.children) el.onclick = () => selectMaterial(el.dataset.n);
}
function drawVerdict() {
  const n = S.material, vd = verdicts[n] ?? {};
  $verdict.innerHTML = `<div><b>${DEFS[n].label}</b></div>
    <div style="margin:4px 0">${vd.choice ? `chosen: <span class="chosen">${shortName(n, vd.choice)}</span>` : `<span style="color:#8d98a6">no choice yet: click "choose this" under a tile</span>`}</div>
    <label><input type="checkbox" id="rv-nw" ${vd.needsWork ? "checked" : ""}> needs work</label>
    <textarea id="rv-note" placeholder="what's wrong / what to change (saved as you type)">${vd.note ?? ""}</textarea>
    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button id="rv-dl">download verdicts.json</button><button id="rv-clear">clear this verdict</button></div>
    <div style="color:#8d98a6;font-size:11px;margin-top:4px">${Object.keys(verdicts).length} material(s) with a verdict · saved in this browser</div>`;
  const upd = (f) => { verdicts[n] = { ...(verdicts[n] ?? {}), ...f, date: new Date().toISOString() }; saveVerdicts(); drawList(); };
  document.getElementById("rv-nw").onchange = (e) => upd({ needsWork: e.target.checked });
  document.getElementById("rv-note").oninput = (e) => upd({ note: e.target.value });
  document.getElementById("rv-dl").onclick = downloadVerdicts;
  document.getElementById("rv-clear").onclick = () => { delete verdicts[n]; saveVerdicts(); drawList(); drawVerdict(); layoutTiles(); };
}
function downloadVerdicts() {
  const out = { about: "Owner verdicts from labs/material-lab.html (review). choice: 'proc' or a candidate id of viewer/materials/candidates.json; commit as viewer/materials/verdicts.json.", date: new Date().toISOString(),
    materials: Object.fromEntries(Object.entries(verdicts).map(([k, v]) => [k, { ...v, params: v.choice && looks[`${k}|${v.choice}`] ? paramsOf(k, v.choice) : v.params }])) };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
  a.download = "verdicts.json"; a.click();
}
const paramsOf = (name, id) => readParams({ userData: { look: lookFor(name, id) } });

// ------------------------------------------------------------------------------------------------ toolbar
function drawToolbar() {
  const b = (label, on, fn, title = "") => { const e = document.createElement("button"); e.textContent = label; e.title = title; if (on) e.classList.add("on"); e.onclick = fn; return e; };
  const lab = (t) => Object.assign(document.createElement("span"), { className: "lab", textContent: t });
  $row1.replaceChildren(
    lab("view"), ...["wall", "townhall", "street"].map((v) => b(v === "wall" ? "test surface" : v === "townhall" ? "town hall" : "street", S.view === v, () => { S.view = v; refresh(); }, "where the candidates are shown")),
    lab("distance"), ...STOPS.map((d) => b(`${d} m`, S.stops.includes(d), () => {
      S.stops = S.stops.includes(d) ? S.stops.filter((x) => x !== d) : [...S.stops, d].sort((a, c) => a - c).slice(-3);
      if (!S.stops.length) S.stops = [d];
      refresh();
    }, "toggle a row: up to three distances at once (near + far)")),
    lab("light"), ...Object.keys(LIGHTS).map((l) => b(l, S.light === l, () => { setLight(l); drawToolbar(); }, "the same light on every tile")),
    lab(""), b(S.strafe ? "■ STRAFE" : "▶ STRAFE", S.strafe, () => { S.strafe = !S.strafe; strafeT0 = performance.now(); drawToolbar(); markDirty(); }, "a slow sideways camera move: shimmer and crawling show"),
    b("SHIMMER ⟳", false, () => measureShimmer(), "measure blinking pixels per tile (24 frames, sub-pixel strafe)"),
    b("cost ⟳", false, () => benchMaterial(S.material), "GPU ms per full-screen wall for each version (noisy: other tabs, the owner's GPU)"),
  );
}

// ------------------------------------------------------------------------------------------------ tiles
let tiles = [];                         // { x, y, w, h, ver, d, cam, el, group }
function shownVersions() {
  const vs = versions(S.material);
  let ids = S.shown[S.material];
  if (!ids) {
    const chosen = verdicts[S.material]?.choice;
    ids = [...new Set([chosen, ...vs.map((v) => v.id)].filter(Boolean))].slice(0, 4);
    S.shown[S.material] = ids;
  }
  return ids.map((id) => vs.find((v) => v.id === id)).filter(Boolean);
}
function layoutTiles() {
  const W = innerWidth - SIDEBAR, H = innerHeight - TOP;
  const isBld = S.view !== "wall";
  const cols = isBld ? [{ id: "A" }, { id: "B" }] : shownVersions();
  const rows = isBld ? S.stops.slice(0, 2) : S.stops;
  const tw = Math.floor(W / cols.length), th = Math.floor(H / rows.length);
  $tiles.replaceChildren();
  tiles = [];
  rows.forEach((d, r) => cols.forEach((v, c) => {
    const el = document.createElement("div"); el.className = "rv-tile";
    Object.assign(el.style, { left: `${c * tw}px`, top: `${r * th}px`, width: `${tw}px`, height: `${th}px` });
    const cam = new THREE.PerspectiveCamera(isBld ? 35 : 40, tw / th, 0.05, 6000);
    const t = { x: SIDEBAR + c * tw, y: TOP + r * th, w: tw, h: th, ver: v, d, cam, el, row: r, col: c };
    tiles.push(t);
    if (isBld) el.innerHTML = `<div class="rv-tl"><div class="t"><b>${v.id === "A" ? (S.view === "townhall" ? "A · today's temporary materials" : "A · the city's shaders today") : "B · library: chosen versions"}</b>${r === 0 ? `<div class="d">${v.id === "B" ? chosenSummary() : ""}</div>` : ""}</div></div><div class="rv-dist">${d} m</div>`;
    else {
      const chosen = verdicts[S.material]?.choice === v.id;
      if (chosen) el.classList.add("chosen");
      const cst = costs.materials?.[S.material]?.[v.id];
      const sz = v.kind === "proc" ? "0 MB textures" : `${v.albedo_ktx2_bytes ? mb(v.albedo_ktx2_bytes, v.nra_ktx2_bytes) : mb(v.albedo_webp_bytes, v.nra_webp_bytes) + " (WebP)"} MB download${v.size_m ? ` · ${v.size_m} m/repeat` : ""}`;
      const lic = v.kind === "megascans" ? `<span class="rv-b m">Megascans: licence check before public</span>` : v.kind === "cc0" ? `<span class="rv-b s">CC0 ${v.source ?? ""}</span>` : `<span class="rv-b p">procedural</span>`;
      el.innerHTML = `<div class="rv-tl"><div class="t"><b>${String.fromCharCode(65 + t.col)} · ${v.name ?? v.id}</b>${v.current ? " (shipped)" : ""}<div class="d">${lic} ${r === 0 ? `${sz}${cst?.gpu_ms != null ? ` · ${cst.gpu_ms.toFixed(2)} ms` : ""}${v.note ? ` · ${v.note}` : ""}` : ""}</div></div></div>
        <div class="rv-tb">${r === rows.length - 1 ? `<button class="${chosen ? "on" : ""}" data-choose="${v.id}">${chosen ? "✓ chosen" : "choose this"}</button>` : ""}<span class="sh" data-sh>${shText(v.id, d)}</span></div><div class="rv-dist">${d} m</div>`;
      const btn = el.querySelector("[data-choose]");
      if (btn) btn.onclick = () => { verdicts[S.material] = { ...(verdicts[S.material] ?? {}), choice: v.id, params: paramsOf(S.material, v.id), date: new Date().toISOString() }; saveVerdicts(); drawList(); drawVerdict(); layoutTiles(); };
    }
    $tiles.append(el);
  }));
  markDirty();
}
const mb = (...b) => (b.reduce((s, x) => s + (x || 0), 0) / 1048576).toFixed(1);
const shText = (id, d) => { const p = shimmer[`${S.material}|${id}|${d}`]; return p == null ? "shimmer: —" : `shimmer ${p} ppm`; };
const chosenSummary = () => (S.view === "townhall" ? TH_SLOTS_LIB : STREET_MATS).map((n) => `${n}: ${shortName(n, verdicts[n]?.choice ?? defaultPick(n))}`).join(" · ");
/** the version the building view uses for a material: the owner's choice, else the shipped scan, else procedural */
const defaultPick = (n) => verdicts[n]?.choice ?? (versions(n).find((v) => v.current)?.id ?? "proc");

// ------------------------------------------------------------------------------------------------ building views
const TH_SLOTS_LIB = ["brick_red_brussels", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white", "wood_frame_dark", "cast_iron_green", "cobbles"];
const STREET_MATS = ["brick_red_brussels", "brick_dark", "brick_yellow", "render_white", "render_painted", "stone_blue", "stone_white", "slate", "roof_tiles_red", "asphalt", "paving_concrete", "cobbles"];
let th = null, street = null;
async function buildTownhall() {
  if (th) return th;
  $status.textContent = "loading the town hall…";
  const { loadTownHall } = await import("../viewer/townhallModel.js");
  const model = await loadTownHall();
  const mk = () => { const root = new THREE.Group(); root.position.copy(model.placement.position); root.rotation.y = model.placement.rotationY; root.add(model.make(0)); scene.add(root); root.visible = false; return root; };
  const A = mk(), B = mk();
  const FRM = model.notes.measured.frame, RC = Math.cos(FRM.rotation_rad), RS = Math.sin(FRM.rotation_rad);
  const box = model.boundsWorld;
  th = { model, A, B, centre: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()), east: new THREE.Vector3(RC, 0, RS) };
  await applyTownhallLibrary();
  return th;
}
async function applyTownhallLibrary() {
  if (!th) return;
  const lib = {};
  for (const slot of TH_SLOTS_LIB) {
    const n = th.model.lods[0].some((l) => l.slot === slot) ? slot : null; if (!n) continue;
    const v = versions(n).find((x) => x.id === defaultPick(n)) ?? versions(n)[0];
    let opts = { mapping: "uv", look: lookFor(n, v.id) };
    if (v.id !== "proc") { const scan = v.id === "shipped" ? SCANS[n] : await loadCandidate(renderer, v.id).catch(() => null); if (scan) opts = { ...opts, variant: "scan", scan }; }
    lib[slot] = th.model.setSlotMaterial(slot, createMaterial(n, opts), { dryRun: true });
  }
  th.B.traverse((o) => { if (o.isMesh && lib[o.userData.slot]) o.material = lib[o.userData.slot]; });
}
async function buildStreet() {
  if (street) return street;
  const { buildCitySample } = await import("./material-lab-city.js");
  const cache = {};
  street = buildCitySample((n, mapping) => {
    const v = versions(n).find((x) => x.id === defaultPick(n)) ?? versions(n)[0];
    const k = `${n}|${mapping}|${v.id}`;
    if (!cache[k]) {
      const scan = v.id === "proc" ? null : v.id === "shipped" ? SCANS[n] : CANDS[v.id];
      cache[k] = createMaterial(n, scan ? { mapping, variant: "scan", scan, look: lookFor(n, v.id), varAttr: undefined } : { mapping, look: lookFor(n, "proc") });
    }
    return cache[k];
  });
  // the city's shaders write an extra MRT target for the post chain (facades.js metalRough); this lab renders without
  // the post chain, so drop it (it only feeds SSR)
  street.group.traverse((o) => { if (o.isMesh && o.material?.mrtNode) { o.material.mrtNode = null; o.material.needsUpdate = true; } });
  scene.add(street.group); street.group.visible = false;
  return street;
}
function poseBuilding(cam, d, s = 0) {
  if (S.view === "townhall") {
    // in front of the east façade (the main front, photo 3557's side), d m from it, slightly to the south
    const c = th.centre, ground = th.model.placement.position.y, dist = Math.max(d, 10);
    const side = new THREE.Vector3(-th.east.z, 0, th.east.x);
    const facadeX = th.size.x / 2;                                  // the box's half-depth along east (roughly)
    cam.position.copy(c).addScaledVector(th.east, Math.abs(facadeX) * 0.5 + dist).addScaledVector(side, dist * 0.3 + s);
    cam.position.y = ground + 1.7 + dist * 0.12;
    const look = c.clone().addScaledVector(side, s); look.y = ground + 6 + dist * 0.08;
    cam.lookAt(look);
  } else {
    const dist = Math.max(d, 8);
    cam.position.set(-1 + s + dist * 0.15, 1.7 + dist * 0.25, 4 + dist); cam.lookAt(-1.5 + s, 3.5, 0);
  }
  cam.updateMatrixWorld(true);
}

// ------------------------------------------------------------------------------------------------ light
function setLight(l) {
  S.light = l; const p = LIGHTS[l];
  sun.position.set(...p.dir).normalize().multiplyScalar(300); sun.target.position.set(0, 0, 0);
  sun.color.setHex(p.sun); sun.intensity = p.si;
  hemi.color.setHex(p.hs); hemi.groundColor.setHex(p.hg); hemi.intensity = p.hi;
  uSkyTop.value.setHex(p.top); uSkyHor.value.setHex(p.hor); uSkyGround.value.setHex(p.gr);
  renderer.toneMappingExposure = p.exp; scene.environmentIntensity = p.envI;
  env.uNight.value = p.night; env.uSkyTop.value.setHex(p.top); env.uSkyHorizon.value.setHex(p.hor); env.uSunColor.value.setHex(p.sun);
  env.uSunDir.value.set(...p.dir).normalize();
  lamp.intensity = p.lamp ?? 0;
  bakeEnv(); shadowDirty = true; markDirty();
}
let shadowDirty = true;   // eslint-disable-line no-unused-vars

// ------------------------------------------------------------------------------------------------ render
let strafeT0 = performance.now();
const tileMats = new Map();
async function prepareTiles() {
  if (S.view !== "wall") return;
  for (const t of tiles) tileMats.set(`${S.material}|${t.ver.id}`, await materialFor(S.material, t.ver));
  markDirty();
}
function drawTile(t, s) {
  const dpr = renderer.getPixelRatio();
  const y = t.y;                                          // WebGPU: viewport / scissor y from the top
  renderer.setViewport(t.x, y, t.w, t.h); renderer.setScissor(t.x, y, t.w, t.h);
  for (const m of [WALL, FLOOR, ROOF, GROUND_PLAIN, BLD_GROUND]) m.visible = false;
  if (th) { th.A.visible = th.B.visible = false; }
  if (street) street.group.visible = false;
  if (S.view === "wall") {
    const kind = surfOf(S.material), mesh = kind === "wall" ? WALL : kind === "floor" ? FLOOR : ROOF;
    const m = tileMats.get(`${S.material}|${t.ver.id}`); if (!m) return;
    mesh.material = m; mesh.visible = true; if (kind === "wall") GROUND_PLAIN.visible = true;
    poseCam(t.cam, kind, t.d, s * t.d);
    lamp.position.set(t.cam.position.x, kind === "wall" ? Math.max(4, t.d * 0.3) : 4, kind === "wall" ? Math.min(3, t.d) : 2);
  } else if (S.view === "townhall" && th) {
    (t.ver.id === "A" ? th.A : th.B).visible = true;
    BLD_GROUND.position.set(th.centre.x, th.model.placement.position.y - 0.3, th.centre.z); BLD_GROUND.visible = true;
    poseBuilding(t.cam, t.d, s * t.d);
  } else if (S.view === "street" && street) {
    street.group.visible = true; street.show(t.ver.id === "A" ? "city today" : "library");
    poseBuilding(t.cam, t.d, s * t.d);
  }
  if (S.view !== "wall") {
    // buildings: the shadow box around what this tile looks at (re-rendered per tile: only while redrawing)
    const c = t.cam.position;
    sun.position.copy(c).add(new THREE.Vector3(...LIGHTS[S.light].dir).normalize().multiplyScalar(400)); sun.target.position.copy(c); sun.target.updateMatrixWorld();
    const half = Math.min(400, Math.max(30, t.d * 1.5));
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 1200 }); sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.autoUpdate = true;
  }
  void dpr;
  renderer.render(scene, t.cam);
}
function frame(sOverride = null) {
  renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.clear();
  renderer.setScissorTest(true);
  const s = sOverride ?? (S.strafe ? ((performance.now() - strafeT0) / 1000) * 0.004 : 0);
  for (const t of tiles) drawTile(t, s);
  renderer.setScissorTest(false);
}
renderer.setAnimationLoop(() => {
  if (!dirty && !S.strafe && !benching) return;
  dirty = false;
  if (!benching) frame();
  sampleGpu();
});

// ------------------------------------------------------------------------------------------------ shimmer meter
// the meter: 24 frames, the cameras strafing ~1.4 px per frame (a slow walk), a pixel "blinks" when its luminance
// jumps up then down (or down then up) by > 0.04 twice or more: aliasing / crawling, not the smooth slide of detail
const SHIM = { step: 0.0025, threshold: 0.04, frames: 24 };
async function measureShimmer(o = {}) {
  Object.assign(SHIM, o);
  if (S.view !== "wall") { $status.textContent = "shimmer: on the test-surface view"; return; }
  $status.textContent = "measuring shimmer (24 frames)…";
  const wasStrafe = S.strafe; S.strafe = false;
  const dpr = renderer.getPixelRatio();
  const regions = tiles.map((t) => [t.x * dpr + 4, t.y * dpr + 30, (t.x + t.w) * dpr - 4, (t.y + t.h) * dpr - 30]);
  const r = await flickerTest({ renderFrame: () => frame(curS), canvas: renderer.domElement, camera: null, frames: SHIM.frames, move: "strafe", regions, noHeat: true,
    threshold: SHIM.threshold, pose: (f) => { curS = f * SHIM.step; } });
  tiles.forEach((t, i) => { shimmer[`${S.material}|${t.ver.id}|${t.d}`] = r.perRegion[i].ppm; });
  S.strafe = wasStrafe;
  layoutTiles();
  $status.textContent = `shimmer measured: ${tiles.map((t) => `${String.fromCharCode(65 + t.col)}@${t.d}m ${shimmer[`${S.material}|${t.ver.id}|${t.d}`]}`).join(" · ")} ppm`;
  console.log("[review] shimmer", S.material, JSON.stringify(Object.fromEntries(tiles.map((t) => [`${t.ver.id}@${t.d}`, shimmer[`${S.material}|${t.ver.id}|${t.d}`]]))));
  return Object.fromEntries(tiles.map((t) => [`${t.ver.id}@${t.d}`, shimmer[`${S.material}|${t.ver.id}|${t.d}`]]));
}
let curS = 0;

// ------------------------------------------------------------------------------------------------ cost bench
// one version full screen (the whole canvas, one tile at 2.2 m from the wall: the wall fills it), timestamps, lowest of
// three ~1.2 s medians, minus a plain MeshStandardNodeMaterial. Read +-0.1 ms as equal (shared GPU).
const gpu = { samples: [], pending: false };
function sampleGpu() {
  if (gpu.pending || !renderer.backend.trackTimestamp) return;
  gpu.pending = true;
  renderer.resolveTimestampsAsync("render").then((ms) => { if (typeof ms === "number" && ms > 0) { gpu.samples.push(ms); if (gpu.samples.length > 600) gpu.samples.shift(); } })
    .catch(() => {}).finally(() => { gpu.pending = false; });
}
let benching = false;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const plain = new THREE.MeshStandardNodeMaterial({ color: 0x777777, roughness: 0.8 });
async function measureFull(material, kind) {
  const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 6000);
  const mesh = kind === "wall" ? WALL : kind === "floor" ? FLOOR : ROOF;
  const run = () => {
    renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); renderer.clear();
    for (const m of [WALL, FLOOR, ROOF, GROUND_PLAIN]) m.visible = false; if (th) th.A.visible = th.B.visible = false; if (street) street.group.visible = false;
    mesh.material = material; mesh.visible = true; sky.visible = false;
    if (kind === "wall") { cam.position.set(0, 15, 2.2); cam.lookAt(0, 15, 0); } else if (kind === "floor") { cam.position.set(0, 2.2, 0.01); cam.lookAt(0, 0, 0); } else poseCam(cam, kind, 2.2);
    sun.shadow.autoUpdate = false;
    renderer.render(scene, cam); sky.visible = true;
  };
  await renderer.compileAsync(scene, cam).catch(() => {});
  let best = Infinity;
  const loop = () => new Promise((res) => { let n = 0; const tick = () => { run(); sampleGpu(); if (++n < 75) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
  await loop();
  for (let k = 0; k < 3; k++) {
    gpu.samples.length = 0; await loop();
    const s = gpu.samples.slice(2).sort((a, b) => a - b);
    if (s.length >= 3) best = Math.min(best, s[Math.floor(s.length / 2)]);
  }
  return best;
}
async function benchMaterial(name, vers = versions(name)) {
  if (benching) return; benching = true;
  $status.textContent = `bench ${name}…`;
  const kind = surfOf(name), out = {};
  const base = await measureFull(plain, kind);
  for (const v of vers) {
    const m = await materialFor(name, v); if (!m) continue;
    const ms = await measureFull(m, kind);
    const scan = v.id === "proc" ? null : v.id === "shipped" ? SCANS[name] : CANDS[v.id];
    out[v.id] = { gpu_ms: +(ms - base).toFixed(3), frame_ms: +ms.toFixed(3), tex_gpu_mb: scan ? +(scan.bytesGPU / 1048576).toFixed(2) : 0, dl_mb: scan ? +(scan.bytesFile / 1048576).toFixed(2) : 0 };
  }
  out._plain_ms = +base.toFixed(3);
  costs.materials[name] = { ...(costs.materials[name] ?? {}), ...out };
  benching = false; markDirty(); drawList(); layoutTiles();
  $status.textContent = `cost ${name}: ${Object.entries(out).filter(([k]) => k !== "_plain_ms").map(([k, v]) => `${shortName(name, k)} +${v.gpu_ms.toFixed(2)} ms`).join(" · ")} (plain ${base.toFixed(2)} ms; noisy)`;
  return out;
}
async function benchAll(names = MATERIAL_NAMES) {
  const res = {};
  for (const n of names) res[n] = await benchMaterial(n);
  return { about: "GPU ms per full-screen test surface (canvas size of the run) over a plain MeshStandardNodeMaterial; tex_gpu_mb BC7/ASTC; dl_mb KTX2", date: new Date().toISOString(), canvas: [renderer.domElement.width, renderer.domElement.height], materials: costs.materials };
}

// ------------------------------------------------------------------------------------------------ panel (focused tile params)
const ui = new Panel({ title: "Tune / versions shown ▸" });
ui.domElement.classList.add("closed");                 // closed: the tiles stay clear; click to open
let pf = null;
function buildParams() {
  pf?.el.remove();
  if (S.view !== "wall") return;
  const vs = shownVersions(); const v = vs[Math.min(S.focus, vs.length - 1)]; if (!v) return;
  pf = ui.addFolder(`${String.fromCharCode(65 + Math.min(S.focus, vs.length - 1))} · ${v.name ?? v.id}`);
  const U = lookFor(S.material, v.id);
  const keys = Object.entries(paramSpec(S.material)).filter(([k]) => v.id === "proc" ? !["scanTint", "scanScale", "hybridNear"].includes(k) : k !== "hybridNear");
  for (const [k, spec] of keys) {
    if (typeof spec === "string") {
      const row = pf.row(k), inp = document.createElement("input"); inp.type = "color"; inp.value = "#" + U[k].value.getHexString();
      inp.style.cssText = "width:100%;height:20px;border:0;padding:0;background:none"; inp.oninput = () => { U[k].value.set(inp.value); markDirty(); }; row.append(inp);
    } else { const o = { [k]: U[k].value }; pf.add(o, k, spec[1], spec[2], spec[3]).onChange((x) => { U[k].value = x; markDirty(); }); }
  }
}
const fsel = ui.addFolder("Versions shown (2-4)");
function buildVersionPicker() {
  fsel.body.replaceChildren();
  const vs = versions(S.material), on = S.shown[S.material] ?? [];
  for (const v of vs) {
    const o = { [v.id]: on.includes(v.id) };
    fsel.add(o, v.id).name(`${v.kind === "proc" ? "P" : v.kind === "megascans" ? "M" : "S"} · ${v.name ?? v.id}`).onChange((x) => {
      let ids = S.shown[S.material] ?? [];
      ids = x ? [...ids, v.id].slice(-4) : ids.filter((i) => i !== v.id);
      if (!ids.length) ids = [v.id];
      S.shown[S.material] = ids; refresh();
    });
  }
  const f = { focus: S.focus };
  fsel.add(f, "focus", 0, 3, 1).name("tune tile (0 = A)").onChange((x) => { S.focus = x; buildParams(); });
  const t = { tint: S.tint };
  fsel.add(t, "tint", 0, 1, 0.01).name("scans: tint to library colour").onChange((x) => { S.tint = x; for (const [k, l] of Object.entries(looks)) if (!k.endsWith("|proc")) l.scanTint.value = x; markDirty(); });
}

// ------------------------------------------------------------------------------------------------ flow
async function selectMaterial(n) {
  S.material = n; S.focus = 0;
  const u = new URL(location.href); u.searchParams.set("mat", n); history.replaceState(null, "", u);
  drawList(); drawVerdict(); refresh();
}
async function refresh() {
  drawToolbar(); buildVersionPicker(); buildParams();
  if (S.view === "townhall") { await buildTownhall().catch((e) => { $status.textContent = "town hall failed: " + e.message; console.error(e); }); await applyTownhallLibrary(); }
  sun.castShadow = S.view !== "wall";                 // a flat test surface needs no shadow pass
  if (S.view === "street") {
    for (const n of STREET_MATS) { const id = defaultPick(n); if (id !== "proc" && id !== "shipped") await loadCandidate(renderer, id).catch(() => null); }
  }
  if (S.view === "street") await buildStreet().catch((e) => { $status.textContent = "street failed: " + e.message; console.error(e); });
  layoutTiles();
  await prepareTiles();
  shadowDirty = true;
  $status.textContent = `${S.material} · ${S.view} · ${S.light} · rows ${S.stops.join(" / ")} m`;
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); layoutTiles(); });
setLight(S.light);
drawList(); drawVerdict();
await refresh();
window.lab = { get th() { return th; }, renderer, scene, S, tiles, verdicts, costs, shimmer, measureShimmer, benchMaterial, benchAll, versions, selectMaterial, refresh, frame, setLight, looks, mats, gpu };
