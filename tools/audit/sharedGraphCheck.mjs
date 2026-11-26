// SHARED NODE GRAPH GATE (claude/perf5, rule docs/rules/shared-node-graph.md, docs/perf/QUIET_2026-11-26.md).
//   node --import ./tools/christmas/hook.mjs tools/audit/sharedGraphCheck.mjs [--quiet]      exit 1 on a failure
// WHY: three r187 keys its main-thread node builds by node ids. A material made from FRESH nodes for each tile / mesh
// builds the same shader again the first time that tile / mesh draws, inside a frame: the police drive's worst frames
// (117-164 ms: the Chenaie timber playground's three fading pieces, 26-31 ms each; 52-66 ms at each tile landing: the
// tile's own asphalt graph, 26-32 ms). RULE: a material made per tile / per mesh / per instance batch is a clone of ONE
// template graph (or the same node objects); what differs per tile goes through the material (an object-update node
// reading material.userData, a material property) or a geometry attribute, never a node bound to that tile's object.
// Checks:
//   1. parkKit KitField: the fading meshes of pieces that share a slot material share ONE fading material (one mask
//      node), their geometry shares the piece's buffers and carries the field's own fade buffer (kitFade); the solid
//      meshes keep the piece geometry; three's program cache key is the same for all of them
//   2. roadPaint asphaltMaterial: two tiles' materials are clones of one graph (same colour node, same program cache
//      key), each with its OWN atlas texture / scale / range in userData (and atlas.texture for the unload dispose);
//      the no-atlas (deck) material is its own template
//   3. (round 2) groundMaterial: two tiles' textured grounds are clones of one graph (same colour node, same program
//      cache key) with their own mask / orthophoto / origin / 1 / size / ortho switch read per object (a tile without an
//      orthophoto: the stand-in, switch 0); a different contour function = its own template
//   4. (round 2) viewer/pinBuilds.js: a render object of a shared material (or the fading copy of one, or a template
//      clone, or the shadow pass of one) pins its pipeline, programs and cached node build ONCE (one extra use); a
//      tile's own material does not; the rail stand-in (railWarmData) builds every rail part; the flush's defaults
//   5. the old paths (?kitfadeshare=old, ?asphaltshare=old, ?groundshare=old, run in a child process) still give a
//      graph per mesh / tile (the check would catch a regression to them)
//   6. text: the switches' features rows and main.js wiring
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), OLD = process.argv.includes("--old");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
globalThis.window = globalThis;
globalThis.location = { search: OLD ? "?kitfadeshare=old&asphaltshare=old&groundshare=old" : "", href: "http://localhost/viewer/" };
const THREE = await import("three/webgpu");
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const PK = await imp("viewer/parkKit.js");
const RP = await imp("viewer/roadPaint.js");
const GR = await imp("viewer/ground.js");
const key = (m) => m.customProgramCacheKey();

// ---- 1. the park kit's fading copies
const slotMats = new Map();
const kit = {
  name: "testkit", ranges: [10, 30, 80],
  slotMaterial(slot, vertexAo) { const k = `${slot}|${vertexAo}`; if (!slotMats.has(k)) { const m = new THREE.MeshStandardNodeMaterial(); m.name = `kit ${slot}`; slotMats.set(k, m); } return slotMats.get(k); },
  pieces: {},
};
for (const p of ["tl_beam", "tl_tower", "tl_climb"]) {
  const g = new THREE.BoxGeometry(1, 1, 1); g.setAttribute("uv1", g.attributes.uv); g.name = p;
  kit.pieces[p] = { size: [1, 1, 1], lods: [[{ slot: "playground", geometry: g }], [{ slot: "playground", geometry: g }]] };
}
const field = new PK.KitField(kit, { castShadow: true });
for (const p of Object.keys(kit.pieces)) for (let i = 0; i < 3; i++) field.add(p, new THREE.Matrix4().makeTranslation(i * 5, 0, 0));
field.commit();
const fades = field.meshes.filter((m) => m.name.endsWith(" fade")), solids = field.meshes.filter((m) => !m.name.endsWith(" fade") && !m.name.endsWith("shadow proxy"));
const fadeMats = new Set(fades.map((m) => m.material)), fadeKeys = new Set(fades.map((m) => key(m.material)));
if (!OLD) {
  ok(fades.length === 6 && fadeMats.size === 1, `the 6 fading meshes (3 pieces x 2 LODs, one slot) share ONE fading material (${fadeMats.size})`);
  ok(fadeKeys.size === 1, `... one program cache key: one node build (${fadeKeys.size})`);
  ok(fades.every((m) => m.geometry.attributes[PK.KIT_FADE_ATTR]?.isInstancedBufferAttribute), "each fading mesh's geometry carries an instanced fade buffer (kitFade)");
  const lod0 = fades.filter((m) => m.geometry.name.startsWith("tl_beam"));
  ok(lod0.length === 2 && lod0[0].geometry.attributes[PK.KIT_FADE_ATTR] !== lod0[1].geometry.attributes[PK.KIT_FADE_ATTR], "each LOD's fading mesh has its OWN fade buffer (per-instance values per field / LOD)");
  ok(fades.every((m) => { const src = kit.pieces[m.geometry.name.replace(/ fade$/, "")]?.lods[0][0].geometry; return src && m.geometry.attributes.position === src.attributes.position && m.geometry.index === src.index; }), "the fading geometry shares the piece's own buffers (no copy, no second upload)");
  ok(solids.every((m) => !m.geometry.attributes[PK.KIT_FADE_ATTR] && Object.values(kit.pieces).some((P) => P.lods.some((L) => L[0].geometry === m.geometry))), "the solid meshes keep the piece geometry (no fade attribute added to it)");
  ok(fades.every((m) => m.material.maskNode && m.material.maskNode === fades[0].material.maskNode), "one mask node for every fading copy");
  // the fade values written by update() land in the geometry's buffer
  field.update(new THREE.Vector3(0, 0, 9.6));
  const anyFade = fades.some((m) => m.count > 0 && Array.from(m.geometry.attributes[PK.KIT_FADE_ATTR].array.slice(0, m.count)).every((v) => v > 0));
  ok(anyFade, "update(): an instance in a band's last 8 % draws in the fading mesh with its fade value in that mesh's kitFade buffer");
  // a palette change (setSlot) keeps one shared fading copy
  const other = kit.slotMaterial("timber", false);
  field.setSlot("playground", "timber");
  ok(new Set(fades.map((m) => m.material)).size === 1 && fades[0].material !== [...fadeMats][0] && fades[0].material.name === `${other.name} (fading)`, "setSlot: the fading meshes move to ONE fading copy of the new slot material");
} else {
  ok(fadeMats.size === fades.length && fadeKeys.size === fades.length, `(old path) a fading material and node graph per mesh (${fadeMats.size} materials, ${fadeKeys.size} keys)`);
}

// ---- 2. the asphalt: one graph for every tile
const atlas = (scale, range) => ({ format: "R8", data: new Uint8Array(16).fill(100), width: 4, height: 4, scale: [scale, scale], range });
const A1 = atlas(0.5, 0.6), A2 = atlas(0.25, 0.9);
const m1 = RP.asphaltMaterial(A1), m2 = RP.asphaltMaterial(A2), m0 = RP.asphaltMaterial(null);
if (!OLD) {
  ok(m1 !== m2 && m1.colorNode === m2.colorNode && m1.emissiveNode === m2.emissiveNode, "two tiles' asphalt materials are clones of one graph (the same colour / emissive node objects)");
  ok(key(m1) === key(m2), "... one program cache key: one node build for every tile");
  ok(m1.userData.markTex && m1.userData.markTex !== m2.userData.markTex && m1.userData.markTex === A1.texture && m2.userData.markTex === A2.texture, "each tile reads its OWN atlas texture (userData.markTex = atlas.texture, disposed with the tile)");
  ok(m1.userData.markTex.image.data === A1.data && m2.userData.markTex.image.data === A2.data, "... made from that tile's atlas data");
  ok(m1.userData.markScale.x === 0.5 && m2.userData.markScale.x === 0.25 && m1.userData.markRange === 1.2 && m2.userData.markRange === 1.8, "each tile's atlas scale / range (2 x range) in its material");
  ok(m1.userData.atlas === A1 && m2.userData.atlas === A2, "userData.atlas kept (debug/pavingShots.js rebuilds from it)");
  ok(m0.colorNode !== m1.colorNode && !m0.userData.markTex, "the no-atlas asphalt (decks) is its own template, no atlas");
  // the object-update nodes read the drawn material
  const MN = m1.userData.markNodes || {};
  ok(MN.scale?.updateType === "object" && MN.range?.updateType === "object", "the atlas scale / range are object-update uniforms");
  MN.scale?.update?.({ material: m2, object: null }); const s2 = MN.scale?.value; MN.scale?.update?.({ material: m1, object: null });
  ok(s2 === m2.userData.markScale && MN.scale?.value === m1.userData.markScale, "... they take the values of the material being drawn");
  const tex = MN.tex?.isTextureNode && MN.tex.updateType === "object" ? MN.tex : null;
  if (ok(!!tex, "the marking texture node is an object-update node")) {
    tex.update({ material: m2, object: null }); const t2 = tex.value; tex.update({ material: m1, object: null });
    ok(t2 === A2.texture && tex.value === A1.texture, "... it takes the texture of the material being drawn");
  }
} else {
  ok(m1.colorNode !== m2.colorNode && key(m1) !== key(m2), "(old path) a new asphalt graph per tile");
}

// ---- 3. the terrain: one graph for every tile
const LAYERS = ["lawn", "rough", "dry", "forest", "sand", "gravel", "soil"].map((cover, layer) => ({ cover, layer, size_m: 2, mean_albedo_linear: [0.2, 0.2, 0.2] }));
const arr = () => { const t = new THREE.DataArrayTexture(new Uint8Array(4 * 7), 1, 1, 7); t.needsUpdate = true; return t; };
GR.setGroundTextures({ albedo: arr(), nra: arr(), layers: LAYERS });
const coverOf = (k, ortho) => {
  const t = new THREE.DataTexture(new Uint8Array([k, 0, 0, 0]), 1, 1, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter;
  return { tex: t, sdf: { range: 4 }, ortho: ortho ? Object.assign(new THREE.Texture(), { colorSpace: THREE.SRGBColorSpace }) : null };
};
const contourA = (col) => col.mul(1), contourB = (col) => col.mul(1);
const cA = coverOf(1, true), cB = coverOf(2, false);
const bA = { x0: 0, z0: 0, x1: 500, z1: 500 }, bB = { x0: 500, z0: 0, x1: 1000, z1: 400 };
const g1 = GR.groundMaterial(cA, bA, contourA), g2 = GR.groundMaterial(cB, bB, contourA), g3 = GR.groundMaterial(coverOf(3, true), bA, contourB);
if (!OLD) {
  ok(g1 !== g2 && g1.colorNode === g2.colorNode && g1.normalNode === g2.normalNode, "two tiles' terrain materials are clones of one graph (the same colour / normal node objects)");
  ok(key(g1) === key(g2), "... one program cache key: one node build for every tile");
  ok(g3.colorNode !== g1.colorNode, "another contour function: its own template");
  const u1 = g1.userData, u2 = g2.userData;
  ok(u1.gCover === cA.tex && u2.gCover === cB.tex && u1.gOrtho === cA.ortho && u1.gOrthoOn === 1, "each tile reads its OWN mask and orthophoto (gCover / gOrtho), ortho switch on");
  ok(u2.gOrtho && u2.gOrtho !== cA.ortho && u2.gOrthoOn === 0, "a tile without an orthophoto: the stand-in, ortho switch 0");
  ok(u1.gOrigin.x === 0 && u2.gOrigin.x === 500 && Math.abs(u2.gInvSize.y - 1 / 400) < 1e-12 && Math.abs(u1.gInvSize.x - 1 / 500) < 1e-12, "each tile's own origin and 1 / size");
  ok(u1.sharedGraph === true, "the clones are marked sharedGraph (their builds pinned)");
  const GN = u1.groundNodes || {};
  ok(GN.origin?.updateType === "object" && GN.invSize?.updateType === "object" && GN.orthoOn?.updateType === "object", "origin / 1 / size / ortho switch are object-update uniforms");
  GN.origin?.update?.({ material: g2, object: null }); const o2 = GN.origin?.value; GN.origin?.update?.({ material: g1, object: null });
  ok(o2 === u2.gOrigin && GN.origin?.value === u1.gOrigin, "... they take the values of the material being drawn");
} else {
  ok(g1.colorNode !== g2.colorNode && key(g1) !== key(g2), "(old path) a new terrain graph per tile");
}

// ---- 4. the pins, the rail stand-in, the flush defaults
if (!OLD) {
  const PB = await imp("viewer/pinBuilds.js");
  const cache = new Map();
  const R = { _currentSourceMaterial: null, _pipelines: { _getRenderPipeline: (ro) => ro.pipe }, _nodes: { get: (ro) => ({ nodeBuilderState: ro.st }), nodeBuilderCache: cache, getForRenderCacheKey: (ro) => ro.key } };
  const stats = PB.installPinBuilds(R);
  const mk = (mat, k) => { const st = { usedTimes: 1 }; cache.set(k, st); return { material: mat, key: k, st, pipe: { usedTimes: 1, vertexProgram: { usedTimes: 1 }, fragmentProgram: { usedTimes: 1 } } }; };
  const shared = new THREE.MeshStandardNodeMaterial(); shared.userData.shared = true;
  const fadeOfShared = new THREE.MeshStandardNodeMaterial(); fadeOfShared.userData.fadeOf = shared;
  const own = new THREE.MeshStandardNodeMaterial();
  const r1 = mk(shared, "a"), r2 = mk(fadeOfShared, "b"), r3 = mk(own, "c"), r4 = mk(m1, "d");
  for (const r of [r1, r1, r2, r3, r4]) R._pipelines._getRenderPipeline(r);
  ok(r1.pipe.usedTimes === 2 && r1.pipe.vertexProgram.usedTimes === 2 && r1.st.usedTimes === 2, "a shared material's pipeline, programs and node build get ONE extra use (asked twice: still one)");
  ok(r2.pipe.usedTimes === 2 && r2.st.usedTimes === 2, "the fading copy of a shared material: pinned too");
  ok(r4.pipe.usedTimes === 2, "an asphalt template clone (sharedGraph): pinned");
  ok(r3.pipe.usedTimes === 1 && r3.st.usedTimes === 1, "a tile's own material: not pinned (released with its tile)");
  const r5 = mk({ isShadowPassMaterial: true, userData: {} }, "e");
  R._currentSourceMaterial = shared; R._pipelines._getRenderPipeline(r5); R._currentSourceMaterial = null;
  ok(r5.pipe.usedTimes === 2, "the shadow pass of a shared material (the source material decides): pinned");
  const r6 = mk(shared, "f"); cache.set("f", { usedTimes: 1 }); R._pipelines._getRenderPipeline(r6);
  ok(r6.st.usedTimes === 1 && r6.pipe.usedTimes === 2, "an object-specific build (not the cached one): left alone, its pipeline pinned");
  ok(stats.pipes === 5, `the pins count each pipeline once (${stats.pipes})`);
  const RW = await imp("viewer/rail/railway.js");
  const rw = RW.railTileMeshes(RW.railWarmData());
  const names = new Set(); rw.group.traverse((o) => { if (o.isMesh) names.add(o.name); });
  ok(["rail-ballast", "rail-rails", "rail-sleepers", "rail-masts", "rail-wires", "rail-fences", "rail-platforms", "rail-shelters", "rail-decks"].every((n) => names.has(n)), `the rail stand-in has every rail part (${[...names].join(", ")})`);
  ok(Object.values(RW.railMaterials()).every((m) => m.userData.shared), "the rail materials are shared (their builds pinned once warmed)");
  const W = fs.readFileSync(path.join(ROOT, "viewer/warmup.js"), "utf8");
  ok(W.includes('const FLUSH_SPLIT = QS_F.get("flushsplit") !== "old";') && W.includes("FLUSH_ALONE ? 40 : 1500"), "the compile flush is split by default, ~40 ms chunks (?flushsplit=old / ?flushalone=old: before)");
  ok(W.includes('for (const c of scene.children) if (!keep.has(c) && !c.isLight) set(c, "visible", false);') && W.includes("if (t?.parent === scene) keep.add(t);"), "a flush chunk draws only its own objects (the lights and the roots' own ancestors kept)");
}

// ---- 5. the old paths (child process)
if (!OLD) {
  const r = spawnSync(process.execPath, ["--import", "./tools/christmas/hook.mjs", path.relative(ROOT, fileURLToPath(import.meta.url)), "--old", "--quiet"], { cwd: ROOT, encoding: "utf8" });
  ok(r.status === 0, `the old paths (?kitfadeshare=old&asphaltshare=old&groundshare=old) still build a graph per mesh / tile${r.status ? ": " + (r.stdout + r.stderr).trim().slice(0, 300) : ""}`);
  // ---- 6. text: the features rows, main.js
  const F = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
  for (const k of ["kitfadeshare", "asphaltshare", "groundshare", "pinbuilds", "railwarm", "flushsplit", "flushalone"]) ok(new RegExp(`old\\("${k}"`).test(F), `viewer/features.js has the ?${k}=old row`);
  const M = fs.readFileSync(path.join(ROOT, "viewer/main.js"), "utf8");
  ok(M.includes('if (params.get("pinbuilds") !== "old") window.__pinBuilds = installPinBuilds(renderer);'), "main.js installs the pins (?pinbuilds=old: off)");
  ok(M.includes("const contour = contourFn(contourOn);"), "main.js: one contour graph per switch (the terrain template's key)");
  ok(M.includes("railTileMeshes(rail.m.railWarmData())") && M.includes('RAIL_WARM = GAME_START && params.get("railwarm") !== "old"'), "main.js compiles the rail stand-in at a game start (?railwarm=old: not)");
  ok(M.includes("shadowDirty: (objs) => markSunShadowDirty(objs)"), "main.js gives the flush the sun cache's dirty mark");
}
if (!QUIET || fails) console.log(fails ? `${fails} FAIL` : "sharedgraph: all ok");
process.exit(fails ? 1 : 0);
