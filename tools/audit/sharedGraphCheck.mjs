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
//   3. the old paths (?kitfadeshare=old, ?asphaltshare=old, run in a child process) still give a graph per mesh / tile
//      (the check would catch a regression to them)
//   4. text: the switches' features rows
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), OLD = process.argv.includes("--old");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
globalThis.window = globalThis;
globalThis.location = { search: OLD ? "?kitfadeshare=old&asphaltshare=old" : "", href: "http://localhost/viewer/" };
const THREE = await import("three/webgpu");
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const PK = await imp("viewer/parkKit.js");
const RP = await imp("viewer/roadPaint.js");
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

// ---- 3. the old paths (child process)
if (!OLD) {
  const r = spawnSync(process.execPath, ["--import", "./tools/christmas/hook.mjs", path.relative(ROOT, fileURLToPath(import.meta.url)), "--old", "--quiet"], { cwd: ROOT, encoding: "utf8" });
  ok(r.status === 0, `the old paths (?kitfadeshare=old&asphaltshare=old) still build a graph per mesh / tile${r.status ? ": " + (r.stdout + r.stderr).trim().slice(0, 300) : ""}`);
  // ---- 4. text: the features rows
  const F = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
  for (const k of ["kitfadeshare", "asphaltshare"]) ok(new RegExp(`old\\("${k}"`).test(F), `viewer/features.js has the ?${k}=old row`);
}
if (!QUIET || fails) console.log(fails ? `${fails} FAIL` : "sharedgraph: all ok");
process.exit(fails ? 1 : 0);
