// FADE SHADOW WARM GATE (claude/perf7, rule docs/rules/fade-shadow-warm.md).
//   node --import ./tools/christmas/hook.mjs tools/audit/fadeShadowCheck.mjs [--quiet]      exit 1 on a failure
// WHY: a fading copy (lodFade.js fadeVariant: the tile fade's dithered copy of a material) has its own shader in the
// sun's shadow pass (its maskNode keeps it off the shared shadow material, warmup.js shareShadowNodes). Its shadow pass
// was warmed only through fadeProxies(), which makes a stand-in only for a copy that does NOT exist yet; and the play
// loader's tiles (main.js holdFast) compiled their copies for the scene pass only. So a SHARED material's copy made under
// a cover (the plain walls' "walls:fade") never had its shadow pass built: the first tile fade while driving built it in
// that frame (29-38 ms, police drives 2026-11-26, docs/perf/QUIET_2026-11-26.md round 3).
// RULE: every (fading copy, geometry layout) that casts a shadow gets its shadow pass warmed once, whether the copy is
// new or not (lodFade.js fadeShadowProxies, warmed by warmup.js warmShadows in preCompile and in the holdFast path).
// Checks:
//   1. a shared material whose fading copy already exists: fadeProxies gives nothing, fadeShadowProxies gives a stand-in
//      drawn with that copy, casting; a second call nothing; another layout (instanced) one more; the kit walls'
//      cutMat / plainMat copies too; a mesh that casts no shadow none
//   2. ?fadeshadowwarm=old (child process): none, as before
//   3. text: main.js warms them in preCompile and on the play loader's (holdFast) tiles; the features row
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUIET = process.argv.includes("--quiet"), OLD = process.argv.includes("--old");
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else if (!QUIET) console.log("ok  ", m); return c; };
globalThis.window = globalThis;
globalThis.location = { search: OLD ? "?fadeshadowwarm=old" : "", href: "http://localhost/viewer/" };
const THREE = await import("three/webgpu");
const L = await import(pathToFileURL(path.join(ROOT, "viewer/lodFade.js")).href);

const wall = new THREE.MeshStandardNodeMaterial(); wall.name = "walls"; wall.userData.shared = true;
const geo = () => { const g = new THREE.BoxGeometry(1, 1, 1); g.setAttribute("aWall", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 4), 4)); return g; };
const mesh = (m, cast = true) => { const o = new THREE.Mesh(geo(), m); o.castShadow = cast; o.name = "buildings-walls"; return o; };

if (OLD) {
  L.fadeVariant(wall);
  const g = new THREE.Group(); g.add(mesh(wall));
  console.log(JSON.stringify({ old: L.fadeShadowProxies(g) === null }));
  process.exit(0);
}

// 1. the cover case: the copy exists already (made by the boot's held fade)
const v = L.fadeVariant(wall);
const t1 = new THREE.Group(); t1.add(mesh(wall));
ok(L.fadeProxies(t1) === null, "fadeProxies: nothing for a copy that exists (the old path's gap)");
const sp = L.fadeShadowProxies(t1);
ok(sp && sp.children.length === 1 && sp.children[0].material === v && sp.children[0].castShadow, `fadeShadowProxies: one casting stand-in drawn with the existing "walls:fade" (${sp?.children.length})`);
ok(L.fadeShadowWarmed(v, t1.children[0]), "... marked warmed for its layout");
const t2 = new THREE.Group(); t2.add(mesh(wall));
ok(L.fadeShadowProxies(t2) === null, "a second tile of the same layout: nothing (warmed once)");
const inst = new THREE.InstancedMesh(geo(), wall, 4); inst.castShadow = true;
const t3 = new THREE.Group(); t3.add(inst);
ok(L.fadeShadowProxies(t3)?.children[0]?.isInstancedMesh === true, "another layout (instanced): its own stand-in");
const cut = new THREE.MeshStandardNodeMaterial(), plain = new THREE.MeshStandardNodeMaterial();
const kw = mesh(cut); kw.userData.cutMat = cut; kw.userData.plainMat = plain;
const t4 = new THREE.Group(); t4.add(kw);
const k4 = L.fadeShadowProxies(t4);
ok(k4 && new Set(k4.children.map((c) => c.material)).size === 2 && k4.children.some((c) => c.material === L.fadeVariant(plain)), "the kit walls: both the cut and the far material's copies");
const t5 = new THREE.Group(); t5.add(mesh(new THREE.MeshStandardNodeMaterial(), false));
ok(L.fadeShadowProxies(t5) === null, "a mesh that casts no shadow: none");
const fading = mesh(wall); fading.userData.fadeOrig = wall; fading.material = v;
const t6 = new THREE.Group(); t6.add(fading);
ok(L.fadeShadowProxies(t6) === null, "a mesh fading right now (its copy swapped in): reads its own material, no copy of a copy");

// 2. the old path
const r = spawnSync(process.execPath, ["--import", "./tools/christmas/hook.mjs", fileURLToPath(import.meta.url), "--old"], { cwd: ROOT, encoding: "utf8" });
let old = null; try { old = JSON.parse(r.stdout.trim().split("\n").pop()); } catch { /* */ }
ok(old?.old === true, `?fadeshadowwarm=old: no stand-ins, as before (${r.stdout.trim().slice(-80)} ${r.stderr.slice(-200)})`);

// 3. text
const M = fs.readFileSync(path.join(ROOT, "viewer/main.js"), "utf8"), F = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
ok(/const sp = FADE_SHADOW_WARM \? \[\]\.concat\(roots\)\.map\(fadeShadowProxies\)/.test(M) && M.includes("if (shadowWarm) await shadowWarm([...[].concat(roots), ...sp]);"), "main.js preCompile warms every fading copy's shadow pass (not only new copies)");
ok(/holdFast && compileFor && TILE_FADE\) \{[\s\S]{0,900}Object\.values\(own\)\.map\(fadeShadowProxies\)[\s\S]{0,80}shadowWarm\(sp\)/.test(M), "main.js: the play loader's (holdFast) tiles warm their fading copies' shadow pass");
ok(/old\("fadeshadowwarm"/.test(F), "viewer/features.js has the ?fadeshadowwarm=old row");
ok(fs.existsSync(path.join(ROOT, "docs/rules/fade-shadow-warm.md")), "docs/rules/fade-shadow-warm.md exists");

console.log(fails ? `fadeshadow: ${fails} FAIL` : "fadeshadow: all ok");
process.exit(fails ? 1 : 0);
