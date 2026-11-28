// FEWER RENDER OBJECTS GATE (claude/perf6, docs/perf/QUIET_2026-11-26.md round 3): three r187 pays ~25-28 us of main
// thread per render object; the police drive's main pass drew ~300 a frame.
//   node --import ./tools/christmas/hook.mjs tools/audit/fewerDrawsCheck.mjs [--quiet]      exit 1 on a failure
// Checks:
//   1. park fences (?fencecards=old: one InstancedMesh per card): the iron cards are the parts of ONE multi-draw set: a
//      CardPart fills its part exactly as a Stage filled its mesh (the instances in its distance band, their matrices +
//      iVar in the part's region), the set's one view is visible while any part has instances, hidden when none
//   2. text: the switches' features rows (fencecards, propshide, propsettle), cityProps hides an empty proxy before
//      render()'s early returns, parkFence falls back to the per-card stages without the multi-draw feature
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
globalThis.window = globalThis;
globalThis.location = { search: "", href: "http://localhost/viewer/" };
const THREE = await import("three/webgpu");
const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const MD = await imp("viewer/multiDraw.js");
MD.setMultiDrawRenderer({ backend: { isWebGPUBackend: true, device: { features: new Set(["indirect-first-instance"]) } } });
const PF = await imp("viewer/parkFence.js");

// ---- 1. the cards' multi-draw set
const quad = () => { const g = new THREE.PlaneGeometry(2, 1); return g; };
const set = new MD.MultiDrawSet({ name: "test cards", parts: 3, attrs: [["instanceMatrix", 16], ["iVar", 4]], cap0: 16 });
const view = set.addView({ geoms: [quad(), quad(), quad()], material: new THREE.MeshBasicNodeMaterial(), castShadow: false, name: "cards:merged" });
const parts = [0, 1, 2].map((k) => new PF.CardPart(set, k, `card${k}`, 16, 20, 400, 2));
const item = (x, z, v) => ({ c: [x, 0, z], r: 1.5, m: new THREE.Matrix4().makeTranslation(x, 0, z).toArray(), v: [v, 0, 0, 0] });
const near = [item(5, 0, 1)], band = [item(50, 0, 2), item(80, 10, 3)], far = [item(900, 0, 4)];
const eye = { x: 0, y: 1.7, z: 0 };
const n0 = parts[0].fill([...near, ...band, ...far], eye), n1 = parts[1].fill(band, eye), n2 = parts[2].fill([], eye);
ok(n0 === 2 && n1 === 2 && n2 === 0, `each part keeps the instances in its band [20, 400] m (${n0}, ${n1}, ${n2}: the 5 m and the 900 m ones left out)`);
const P0 = set.parts[0], P1 = set.parts[1], M = set.buf.instanceMatrix.array, V = set.buf.iVar.array;
ok(P0.n === 2 && P1.n === 2 && set.parts[2].n === 0, "the set's parts hold those counts");
ok(M[P0.off * 16 + 12] === 50 && M[(P0.off + 1) * 16 + 12] === 80 && V[P0.off * 4] === 2 && V[(P0.off + 1) * 4] === 3 && V[P1.off * 4] === 2, "part 0's region has the band's matrices and iVar in order; part 1 its own region");
ok(view.mesh.visible === true && view.mesh.userData.multiDraw === set, "ONE render object (the set's view) visible for all the cards");
for (const p of parts) p.fill([], eye);
ok(view.mesh.visible === false, "no card instance: the view hidden (no empty render object)");
ok(P0.box.every((x) => Number.isFinite(x)), "an empty part's box stays finite");

// ---- 1b. (claude/perf7, rule tile-draws-merged) a tram tile's platform slabs + kerb edges: ONE mesh, one material for every
// tile, each part's normals as before, its colour / roughness per vertex (the old materials' linear values)
const TR = await imp("viewer/tram.js");
const tri = (y) => [0, y, 0, 1, y, 0, 0, y, 1];
const g1 = new THREE.Group(), g2 = new THREE.Group();
const pm1 = TR.platformMesh(g1, [...tri(0.25), ...tri(0.25)], tri(0.26)), pm2 = TR.platformMesh(g2, tri(0.3), [...tri(0.31), ...tri(0.31)]);
ok(TR.PLAT_ONE && g1.children.length === 1 && pm1.name === "tram-platforms" && pm1.castShadow && pm1.receiveShadow, "tram platforms: slabs + edges in ONE casting mesh named tram-platforms (?tramplat=old: two)");
ok(pm1.material === pm2.material && pm1.material.userData.shared === true, "... one shared material for every tile (one node build)");
const cA = pm1.geometry.attributes.aCol.array, rA = pm1.geometry.attributes.aRough.array, slabC = new THREE.Color(0x8d8c88), edgeC = new THREE.Color(0xc9c6bd);
ok(Math.abs(cA[0] - slabC.r) < 1e-6 && Math.abs(cA[6 * 3] - edgeC.r) < 1e-6 && Math.abs(rA[0] - 0.85) < 1e-6 && Math.abs(rA[6] - 0.7) < 1e-6, "... the slab's and the edge's colour (linear, as material.color) and roughness per vertex");
ok(pm1.geometry.attributes.position.count === 9 && pm1.geometry.attributes.normal.count === 9, "... both parts' triangles, their own normals");
ok(TR.platformMesh(new THREE.Group(), [], []) === null, "... no platform: no mesh");

// ---- 2. text
const src = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const F = src("viewer/features.js");
for (const k of ["fencecards", "propshide", "propsettle", "tramplat"]) ok(new RegExp(`old\\("${k}"`).test(F), `viewer/features.js has the ?${k}=old row`);
const pf = src("viewer/parkFence.js");
ok(/const CARD_MERGE = qs\.get\("fencecards"\) !== "old";/.test(pf) && /if \(CARD_MERGE && multiDrawOK\(\)\)/.test(pf) && /cardSet \? new CardPart\(cardSet, k,/.test(pf) && /: new Stage\(`parkfence-\$\{p\}-card`, cardGeo\[p\], card,/.test(pf), "parkFence: the cards merged with the feature, the per-card stages without it (or ?fencecards=old)");
const cp = src("viewer/props/cityProps.js");
const i1 = cp.indexOf("if (HIDE_EMPTY) for (const K of this.kinds.values())"), i2 = cp.indexOf("if (!any && !camMoved) return;");
ok(i1 > 0 && i2 > i1, "cityProps.render hides an empty proxy BEFORE its early returns (?propshide=old: not)");
if (!QUIET || fails) console.log(fails ? `${fails} FAIL` : "fewerdraws: all ok");
process.exit(fails ? 1 : 0);
