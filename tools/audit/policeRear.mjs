// GATE: THE PLAYER'S CAR REAR IN THE CHASE VIEW (claude/policerear, TODO 8c, docs/POLICEREAR.md; QUALITY_RULES row 22).
// Rule: a detail of the player's car (big and close in the chase view, moving with the camera) is never a high-contrast
// feature thinner than the TAAU can hold unless it is pre-filtered (a texture, or its contrast by its pixel footprint);
// its glossy sub-pixel bevels get specular anti-aliasing; it takes no screen-space reflection.
//   1. the player material (carPacks.js packMaterial({ player: true })) builds with its three fixes (specular AA on the
//      paint + clear coat, the no-SSR metalRough MRT, the shut-line pre-filter) and WITHOUT them under ?carspec=old /
//      ?carssr=old / ?carseam=old (the material exactly as before);
//   2. the rear plate is found on every police body the game can draw (cars2 estate + police, faceted estate) and has
//      the plate's size / orientation (plateDecal.js findRearPlate), and policeCar.js draws it as the texture;
//   3. the rear's thin-feature budget (tools/cars/rearThin.mjs, the chase camera at H 864 = the owner's 1080p x 0.8): the
//      clamp-miss total of the unmarked estate with the textured plate <= 3.0 (1.78 now; 18.8 with the modelled plate),
//      the marked police estate <= 9 (7.6): a new sub-pixel detail on the rear fails here;
//   4. the switches are features.js rows; no light, no DynamicDrawUsage in the new code.
//   node --import ./tools/christmas/hook.mjs tools/audit/policeRear.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); };

// ---- 1. the material (a child process per URL: carPacks.js reads location.search at load)
if (process.env.POLICEREAR_CHILD) {
  globalThis.location = { search: process.env.POLICEREAR_CHILD === "new" ? "" : "?carspec=old&carssr=old&carseam=old", pathname: "/viewer/index.html" };
  const { packMaterial } = await import(pathToFileURL(path.join(ROOT, "viewer/drive/carPacks.js")).href);
  const { uniform } = await import("three/tsl");
  const THREE = await import("three/webgpu");
  const L = { head: uniform(0), tail: uniform(0), brake: uniform(0) };
  const m = packMaterial({ paint: new THREE.Color(0x1c232c), lights: L, rich: true, seeThrough: false, player: true });
  const plain = packMaterial({ paint: new THREE.Color(0x1c232c), lights: L, rich: true, seeThrough: false });
  const ccFloat = (x) => x?.isConstNode === true || (x?.value !== undefined && typeof x.value === "number" && !x.isUniformNode);
  console.log(JSON.stringify({
    mrt: !!m.mrtNode, plainMrt: !!plain.mrtNode,
    ccRoughConst: ccFloat(m.clearcoatRoughnessNode), plainCcRoughConst: ccFloat(plain.clearcoatRoughnessNode),
  }));
  process.exit(0);
}
const child = (mode) => {
  const r = spawnSync(process.execPath, ["--import", "./tools/christmas/hook.mjs", fileURLToPath(import.meta.url)], { cwd: ROOT, encoding: "utf8", env: { ...process.env, POLICEREAR_CHILD: mode } });
  const line = (r.stdout || "").trim().split("\n").filter((l) => l.startsWith("{")).pop();
  if (!line) return { err: ((r.stderr || "") + (r.stdout || "")).trim().split("\n").slice(-3).join(" / ") };
  return JSON.parse(line);
};
const NEW = child("new"), OLD = child("old");
check("player material: no-SSR MRT (default)", NEW.mrt === true && NEW.plainMrt === false, NEW.err || `player ${NEW.mrt}, fleet ${NEW.plainMrt}`);
check("player material: specular AA on the clear coat (default)", NEW.ccRoughConst === false && NEW.plainCcRoughConst === true, NEW.err || "");
check("?carssr=old&carspec=old&carseam=old: the material as before", OLD.mrt === false && OLD.ccRoughConst === true, OLD.err || `mrt ${OLD.mrt}, cc const ${OLD.ccRoughConst}`);

// ---- 2. the rear plate on every police body
{
  const THREE = await import("three/webgpu");
  const { parseCarGlb } = await import(pathToFileURL(path.join(ROOT, "viewer/drive/carLod.js")).href);
  globalThis.location ??= { search: "" };
  const { findRearPlate } = await import(pathToFileURL(path.join(ROOT, "viewer/police/plateDecal.js")).href);
  for (const [file, ids] of [["models/cars/cars2.glb", ["estate", "police"]], ["models/cars/faceted.glb", ["estate"]]]) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) { check(`plate: ${file}`, false, "missing GLB"); continue; }
    const b = fs.readFileSync(fp);
    let cars;
    try { cars = parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); } catch (e) { check(`plate: ${file}`, false, e.message); continue; }
    for (const id of ids) {
      const car = cars.find((c) => c.id === id), body = car?.parts.find((p) => p.name === "Body");
      if (!body) { check(`plate: ${file} ${id}`, false, "no Body"); continue; }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(body.mesh.P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(body.mesh.N, 3));
      g.setAttribute("_kind", new THREE.BufferAttribute(body.mesh.K, 1));
      const f = findRearPlate(g);
      const ok = !!f && f.w > 0.44 && f.w < 0.6 && f.h > 0.09 && f.h < 0.15 && f.normal.z < -0.9 && f.up.y > 0.9;
      check(`plate found: ${path.basename(file)} ${id}`, ok, f ? `${f.w.toFixed(3)} x ${f.h.toFixed(3)} m, normal z ${f.normal.z.toFixed(2)}` : "not found");
    }
  }
  const pc = fs.readFileSync(path.join(ROOT, "viewer/police/policeCar.js"), "utf8");
  check("policeCar.js: textured plate + player material", /addRearPlate\(car\.chassis/.test(pc) && /player: true/.test(pc));
}

// ---- 3. the thin-feature budget of the rear
{
  const { analyse } = await import(pathToFileURL(path.join(ROOT, "tools/cars/rearThin.mjs")).href);
  const file = path.join(ROOT, "models/cars/cars2.glb");
  const tex = analyse({ file, cars: ["estate", "police"], H: 864, plateTexture: true }).report;
  const mod = analyse({ file, cars: ["estate"], H: 864, plateTexture: false }).report;
  check("rear thin features, unmarked estate (textured plate) <= 3.0", tex.estate.missTotal <= 3.0, `clamp miss ${tex.estate.missTotal} (modelled plate ${mod.estate.missTotal})`);
  check("rear thin features, marked police estate <= 9", tex.police.missTotal <= 9, `clamp miss ${tex.police.missTotal}`);
}

// ---- 4. switches + code rules
{
  const feat = fs.readFileSync(path.join(ROOT, "viewer/features.js"), "utf8");
  const miss = ["carplate", "carspec", "carssr", "carseam"].filter((k) => !new RegExp(`old\\("${k}"`).test(feat));
  check("switches are features.js rows", !miss.length, miss.length ? `missing ${miss.join(", ")}` : "carplate, carspec, carssr, carseam");
  const bad = [];
  for (const f of ["viewer/police/plateDecal.js", "viewer/drive/carPacks.js", "debug/rearCheck.js"]) {
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    if (/DynamicDrawUsage/.test(t)) bad.push(`${f}: DynamicDrawUsage`);
    if (/new THREE\.\w*Light\(/.test(t)) bad.push(`${f}: a light`);
  }
  check("no light, no DynamicDrawUsage", !bad.length, bad.join(", "));
}

const failed = rows.filter((r) => r[1] !== "PASS");
if (!quiet || failed.length) for (const r of rows) console.log(`${r[1]}  ${r[0]}${r[2] ? `  (${r[2]})` : ""}`);
console.log(failed.length ? `policeRear: ${failed.length} FAIL` : `policeRear: all ${rows.length} pass`);
process.exitCode = failed.length ? 1 : 0;
