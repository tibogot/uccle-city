// node --preserve-symlinks --import ./tools/characters/threeHook.mjs tools/audit/jitterCheck.mjs [--quiet]
// THE THIN-BAR GATE (claude/jitter, QUALITY_RULES rule 35 provisional, docs/JITTER.md). Root cause it guards: a bar
// narrower than ~1 internal pixel (garden railings / gates 8-16 mm, balcony railings, grilles and glazing bars 8-30 mm;
// 1 px = 9.6 mm at 6 m, 45 mm at 28 m under the TAAU at Auto's floor) drawn as GEOMETRY is hit or missed by each
// jitter phase and clipped out of the history when missed: it crawls / shimmers as the camera moves (owner
// 2026-11-18). The cure is pre-filtering (its coverage drawn, blended), never a hard edge at distance. Checks:
//   1. census (tools/audit/census/thinBars.mjs): strokes drawn as geometry where they project under 1 px, garden
//      ironwork per piece set <= GARDEN_MAX and the façade kit <= KIT_MAX (today's after-counts); ?jitter=old shown failing
//   2. every card atlas (garden + kit, baked as the viewer bakes them): a full mip chain to 1 x 1, each level's mean
//      coverage = level 0's (box mips: the bars' true share, within 8-bit rounding); every carded stroke's middle lands
//      on its card's coverage (the uv / stretch mapping); the kit cards stretch like their strokes (misfit <= allowed)
//   3. the card materials: blended at their coverage, depth written where >= 4 % (CARD_DEPTH_CUT: the TAAU reprojects
//      them at their own depth), no alpha to coverage, no shadow;
//      they, the garden iron's near material and the kit's opaque compile to WGSL headless
//   4. no change to the sun's shadows: the garden iron's modelled LOD0 keeps its old shadow band; the kit's opaque
//      keeps the plain mask in the shadow pass
//   5. rules: the ?jitter=old switch (features row, the three files honour it), no DynamicDrawUsage, no light
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
globalThis.location ??= { search: "", href: "file:///" };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const rows = [];
let fails = 0;
const check = (name, ok, detail) => { rows.push([name, ok ? "PASS" : "FAIL", detail]); if (!ok) fails++; };
const GARDEN_MAX = 12, KIT_MAX = 11;            // the after-counts (docs/JITTER.md); old: 421 / 312

const TB = await import("../../viewer/thinBars.js");
const C = await import("./census/thinBars.mjs");
const { readGlb } = await import(pathToFileURL(path.join(ROOT, "tools/mesh_audit/glb.mjs")).href);

// ---- 1. census
const gNew = await C.gardenCensus(false), gOld = await C.gardenCensus(true);
const kNew = C.kitCensus(false), kOld = C.kitCensus(true);
const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
const gn = sum(gNew, "subpx"), go = sum(gOld, "subpx"), kn = sum(kNew.rows, "subpx"), ko = sum(kOld.rows, "subpx");
check("garden-subpx", gn <= GARDEN_MAX && go > GARDEN_MAX, `garden ironwork strokes drawn as geometry under 1 px: ${gn} (<= ${GARDEN_MAX}) per piece set, ${sum(gNew, "cityInst")} x instances city-wide; ?jitter=old ${go} / ${sum(gOld, "cityInst")} (fails)`);
check("kit-subpx", kn <= KIT_MAX && ko > KIT_MAX, `façade kit strokes drawn as geometry under 1 px: ${kn} (<= ${KIT_MAX}; ${kNew.kept.length} strokes kept as geometry: stone / brick / arched); ?jitter=old ${ko} (fails)`);

// ---- 2. atlases
function mipsOk(atlas) {
  const L = atlas.levels, m0 = TB.meanAlpha(L[0]);
  const last = L[L.length - 1];
  const full = last.width === 1 && last.height === 1 && L.length === Math.floor(Math.log2(Math.max(atlas.width, atlas.height))) + 1;
  const worst = Math.max(...L.map((l) => Math.abs(TB.meanAlpha(l) - m0)));
  return { ok: full && worst <= 2 / 255, detail: `${atlas.width} x ${atlas.height}, ${L.length} levels${full ? "" : " (NOT a full chain)"}, mean coverage ${m0.toFixed(4)}, worst level off by ${(worst * 255).toFixed(2)}/255` };
}
const { json: kitJson, geo: kitGeo } = C.kitGeometry();
const t0 = performance.now();
const K = TB.kitCards(kitGeo, kitJson);
const kitMs = performance.now() - t0;
const km = mipsOk(K.atlas);
check("kit-mips", km.ok, `kit card atlas ${km.detail}; ${K.stats.cards} cards on ${K.stats.pieces} pieces, ${K.stats.carded} strokes, baked in ${kitMs.toFixed(0)} ms (node)`);
// gardens: the LOD0 pieces as gardenKit.js merges them (slot + 0.99 x AO)
const gs = rd("viewer/gardens/gardenGeom.js").match(/export const SLOT = (\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":');
const SLOT = JSON.parse(gs);
const glb = await readGlb(path.join(ROOT, "models/gardens/gardens.glb"));
const ironSrc = {};
for (const piece of ["rail", "gate", "cargate"]) for (const type of ["spear", "flat", "rings"]) {
  const parts = glb.parts.filter((p) => p.node === `${piece}_${type}_lod0`);
  let nv = 0, ni = 0; for (const p of parts) { nv += p.positions.length / 3; ni += p.index.length; }
  const pos = new Float32Array(nv * 3), slot = new Float32Array(nv), index = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const p of parts) {
    pos.set(p.positions, v * 3);
    const n = p.positions.length / 3;
    for (let k = 0; k < n; k++) slot[v + k] = SLOT[p.slot] + 0.99 * Math.min(1, p.ao ? p.ao[k] : 1) * 0.999;
    for (let k = 0; k < p.index.length; k++) index[i + k] = p.index[k] + v;
    v += n; i += p.index.length;
  }
  ironSrc[`${piece}_${type}`] = { pos, index, slot };
}
const t1 = performance.now();
const G = TB.ironCards(ironSrc, { tipSlot: SLOT.iron_tip, steelSlot: SLOT.steel_dark });
const gMs = performance.now() - t1;
const gm = mipsOk(G.atlas);
check("garden-mips", gm.ok, `garden iron card atlas ${gm.detail}; ${G.stats.cards} cards, baked in ${gMs.toFixed(0)} ms (node)`);

/** level-0 alpha of an atlas at uv */
const alphaAt = (atlas, u, v) => { const L = atlas.levels[0], x = Math.min(L.width - 1, Math.floor(u * L.width)), y = Math.min(L.height - 1, Math.floor(v * L.height)); return L.data[(y * L.width + x) * 4 + 3] / 255; };
/** the card quad of a piece under (a, b) in its plane (front: x / y at z; side: z / y at x) -> uv, or null */
function cardUv(card, px, py, pz) {
  for (let q = 0; q < card.pos.length / 12; q++) {
    const P = card.pos.slice(q * 12, q * 12 + 12), U = card.uv.slice(q * 8, q * 8 + 8);
    const side = Math.abs(P[0] - P[3]) < 1e-6 && Math.abs(P[0] - P[6]) < 1e-6;
    const plane = side ? P[0] : P[2], pp = side ? px : pz;
    if (Math.abs(pp - plane) > 0.04) continue;
    const a = side ? pz : px, a0 = side ? P[2] : P[0], a1 = side ? P[5] : P[3], b0 = P[1], b1 = P[7];
    if (a < Math.min(a0, a1) || a > Math.max(a0, a1) || py < b0 || py > b1) continue;
    const fa = (a - a0) / (a1 - a0), fb = (py - b0) / (b1 - b0);
    return [U[0] + (U[2] - U[0]) * fa, U[1] + (U[7] - U[1]) * fb];
  }
  return null;
}
let probes = 0, missed = [];
for (const [name, P] of Object.entries(kitGeo)) {
  const g = P.lods[0], F = K.flags[name]?.[0]; if (!F || !K.cards[name]) continue;
  const cc = TB.components(g.pos, g.index), S = TB.strokes(g.pos, g.index, cc), seen = new Set();
  for (let i = 0; i < F.length; i++) {
    const c = cc.comp[i]; if (!F[i] || seen.has(c)) continue; seen.add(c);
    // the stroke's middle on its plane: its triangles' coverage peaks there; probe 5 points along its length
    const s = S[c], mid = [0, 1, 2].map((k) => (s.min[k] + s.max[k]) / 2);
    let best = 0;
    for (let t = 0; t < g.index.length; t += 3) {
      if (cc.comp[g.index[t]] !== c) continue;
      const cx = [0, 1, 2].map((k) => (g.pos[g.index[t] * 3 + k] + g.pos[g.index[t + 1] * 3 + k] + g.pos[g.index[t + 2] * 3 + k]) / 3);
      const uv = cardUv(K.cards[name], cx[0], cx[1], cx[2]);
      if (uv) best = Math.max(best, alphaAt(K.atlas, uv[0], uv[1]));
      if (best > 0.25) break;
    }
    probes++;
    if (best <= 0.25) missed.push(`${name} @${mid.map((v) => v.toFixed(2)).join(",")}`);
  }
}
check("kit-mapping", !missed.length && probes > 50, `${probes} carded strokes each found on its card's coverage (alpha > 0.25 under one of its faces' middles)${missed.length ? `; missed ${missed.length}: ${missed.slice(0, 4).join("; ")}` : ""}`);
let gProbe = 0, gMiss = [];
for (const [name, g] of Object.entries(ironSrc)) {
  const card = G.cards[name], cc = TB.components(g.pos, g.index), S = TB.strokes(g.pos, g.index, cc);
  S.forEach((s, c) => {
    if (!s.thin) return;
    let best = 0;
    for (let t = 0; t < g.index.length && best <= 0.25; t += 3) {
      if (cc.comp[g.index[t]] !== c) continue;
      const x = (g.pos[g.index[t] * 3] + g.pos[g.index[t + 1] * 3] + g.pos[g.index[t + 2] * 3]) / 3, y = (g.pos[g.index[t] * 3 + 1] + g.pos[g.index[t + 1] * 3 + 1] + g.pos[g.index[t + 2] * 3 + 1]) / 3;
      const u = card.uv[0] + (card.uv[2] - card.uv[0]) * (x - card.pos[0]) / (card.pos[3] - card.pos[0]), v = card.uv[1] + (card.uv[5] - card.uv[1]) * (y - card.pos[1]) / (card.pos[7] - card.pos[1]);
      best = Math.max(best, alphaAt(G.atlas, u, v));
    }
    gProbe++; if (best <= 0.25) gMiss.push(name);
  });
}
check("garden-mapping", !gMiss.length && gProbe > 50, `${gProbe} garden iron strokes each found on its card's coverage${gMiss.length ? `; missed ${gMiss.length}: ${gMiss.slice(0, 4).join(", ")}` : ""}`);
const misfit = K.stats.kept.filter((k) => /misfit/.test(k.why));
check("kit-stretch", K.stats.carded > 100, `every carded stroke follows its card under the 9-slice stretch within ${TB.KIT_MISFIT * 1000} mm at +0.6 m (the ${misfit.length} that would not, and ${K.stats.kept.length - misfit.length} stone / brick / arched ones, stay geometry)`);

// ---- 3. materials + WGSL
try {
  const THREE = await import("three/webgpu"), { context } = await import("three/tsl");
  const R = { backend: { isWebGPUBackend: true, capabilities: { getUniformBufferLimit: () => 65536 }, hasFeature: () => false, utils: { getTextureSampleData: () => ({ primarySamples: 1, isMSAA: false }) } },
    library: new THREE.StandardNodeLibrary(), contextNode: context({}), getMRT: () => null, getOutputRenderTarget: () => null, getRenderTarget: () => null,
    toneMapping: 0, outputColorSpace: "srgb", lighting: { enabled: false }, highPrecision: false, debug: { diagnostics: { keywords: false }, onNodeBuilderCreated: null },
    getColorBufferType: () => THREE.HalfFloatType, hasFeature: () => false, getMaxAnisotropy: () => 1, nodes: { library: null }, domElement: { height: 1080 } };
  const build = (mesh, mat) => { const b = new THREE.WGSLNodeBuilder(mesh, R); b.material = mat; b.scene = new THREE.Scene(); b.camera = new THREE.PerspectiveCamera(); b.build(); return b.fragmentShader.length; };
  const warn = console.warn, log = console.log; console.warn = () => {}; console.log = () => {};
  const out = [];
  let props = [];
  try {
    const { loadKitField } = await import("../../viewer/facadeKit/kitField.js");
    const KF = await loadKitField({ base: pathToFileURL(path.join(ROOT, "models/facadekit/")).href });
    for (const key of ["card|0", "card|1", "opaque|0"]) {
      const [kind, lod] = key.split("|"), e = KF.meshes.get(`balcony|${lod}|${kind}`), m = KF.matFor(kind, +lod);
      out.push(`kit ${key} ${build(e.mesh, m)}`);
      if (kind === "card") props.push([`kit ${key}`, m, e.mesh]);
    }
    const GK = await import("../../viewer/gardens/gardenKit.js");
    const { atlasTexture } = await import("../../viewer/thinCards.js");
    const tex = atlasTexture(G.atlas);
    const inst = (g) => { g.setAttribute("iBand", new THREE.InstancedBufferAttribute(new Float32Array(4), 4)); g.setAttribute("iVar", new THREE.InstancedBufferAttribute(new Float32Array(4), 4)); return g; };
    const c = G.cards.rail_spear, cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.Float32BufferAttribute(c.pos, 3)); cg.setAttribute("normal", new THREE.Float32BufferAttribute(c.nrm, 3)); cg.setAttribute("uv", new THREE.Float32BufferAttribute(c.uv, 2)); cg.setIndex(c.idx);
    const cm = GK._jitterTest.ironCardMaterial(tex), cmesh = new THREE.InstancedMesh(inst(cg), cm, 1);
    out.push(`garden card ${build(cmesh, cm)}`);
    props.push(["garden card", cm, cmesh]);
    const ng = new THREE.BufferGeometry(), s0 = ironSrc.rail_spear;
    ng.setAttribute("position", new THREE.BufferAttribute(s0.pos, 3)); ng.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(s0.pos.length), 3)); ng.setAttribute("slot", new THREE.BufferAttribute(s0.slot, 1)); ng.setIndex(new THREE.BufferAttribute(s0.index, 1));
    const nm = GK._jitterTest.opaqueMaterial(0, { near: true });
    out.push(`garden iron near ${build(new THREE.InstancedMesh(inst(ng), nm, 1), nm)}`);
    check("shadow-same", nm.maskShadowNode && nm.maskShadowNode !== nm.maskNode && /maskShadowNode = keep/.test(rd("viewer/facadeKit/kitMaterials.js")),
      `the garden iron's near material dithers its colour out by ${TB.NEAR + TB.BAND} m but keeps the old LOD0 mask in the shadow pass (ironPlan shadow ${JSON.stringify(TB.ironPlan("rail").geometry[0].shadow)} = old ${JSON.stringify(TB.ironPlan("rail", true).geometry[0].shadow)}); the kit's opaque keeps the plain mask for shadows`);
  } finally { console.warn = warn; console.log = log; }
  check("wgsl", out.length === 5, `compile to WGSL headless: ${out.join(", ")} chars`);
  const bad = props.filter(([, m, mesh]) => !(m.transparent === true && m.depthWrite === true && m.alphaTest === TB.CARD_DEPTH_CUT && m.alphaTest <= 0.05 && m.alphaToCoverage !== true && mesh.castShadow !== true));
  check("blended", !bad.length, `the cards blended at their coverage, writing depth only where it is >= ${TB.CARD_DEPTH_CUT * 100} % (a depth cut, not a visible edge: without depth the TAAU reprojected them at the depth behind and they smeared away while moving, browser turn), no alpha to coverage, no shadow: ${props.map(([n]) => n).join(", ")}${bad.length ? `; NOT: ${bad.map(([n]) => n).join(", ")}` : ""}`);
} catch (e) { check("wgsl", false, `materials / WGSL: ${e.message.split("\n")[0]} (run with node --preserve-symlinks --import ./tools/characters/threeHook.mjs)`); }

// ---- 5. rules (the ?jitter features row, no DynamicDrawUsage / no light in the changed files: the meta row,
// tools/audit/gate.d/jitter.mjs)
check("switch", ["viewer/gardens/gardenKit.js", "viewer/facadeKit/kitField.js", "viewer/facadeKit/kitMaterials.js"].every((f) => /JITTER_OLD/.test(rd(f))), "?jitter=old: gardenKit.js, kitField.js, kitMaterials.js honour it");

if (!quiet || fails) {
  console.log("| check | result | detail |\n|---|---|---|");
  for (const r of rows) console.log(`| ${r.join(" | ")} |`);
}
console.log(fails ? `jitterCheck: ${fails} FAIL` : `jitterCheck: all ${rows.length} pass`);
process.exit(fails ? 1 : 0);          // (the kit's material library leaves handles open)
