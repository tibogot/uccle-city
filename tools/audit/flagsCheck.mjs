// GATE: EVERY PLACED FLAG IS A CLOTH FLAG (claude/flags2, rule docs/rules/flags-are-cloth.md; TODO 2026-11-24: the
// police station's yard flags were the model's still sheets, not our cloth flags).
//   1. every model GLB under models/ with a flag-like material slot (flag / banner / drapeau / vlag) lists that slot in
//      its notes json's rigid_flag_slots and has flag_poles (a model's modelled flag is never what the city shows);
//   2. those poles are the model's own: each modelled flag (decoded from the GLB, every level) has its hoist within
//      0.15 m of a listed pole's axis, its top 0..0.25 m under that pole's tip, its cloth within 2 m, and every listed
//      pole carries one
//      (the data and the model agree; a re-bake that moves a pole fails here);
//   3. every notes json with flag_poles is flown by the city (a known site -> its loader flies them as cloth, the
//      loader leaves the rigid slot out) and quick mode keeps ?flags on when that hero is in the radius;
//   4. the new code adds no light and no DynamicDrawUsage.
//   node --import ./tools/christmas/hook.mjs tools/audit/flagsCheck.mjs [--quiet]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const quiet = process.argv.includes("--quiet");
const rows = [];
const check = (name, ok, info = "") => { rows.push([name, ok ? "PASS" : "FAIL", info]); };
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const FLAGLIKE = /flag|banner|drapeau|vlag|pennant/i;
// the sites whose notes carry flag_poles: the loader that flies them as cloth (a regex on its source), the one that
// leaves the model's rigid slot out (if the model has one), and the quick-mode landmark key
const SITES = {
  "models/townhall/townhall.json": { site: "townhall", flies: ["viewer/flagsCity.js", /notes\?\.flag_poles[\s\S]*flyFlags\(/], quick: "townhall" },
  "models/police_rouge/police.json": { site: "police", flies: ["viewer/policeCity.js", /flyHeroFlags\(\{ site: "police", notes: m\.notes/],
    drops: ["viewer/policeModel.js", /rigid_flag_slots[\s\S]*if \(rigid\.has\(slot\)\) continue;/], quick: "police" },
};

// ---- the GLBs and their notes
const glbs = [];
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith(".glb")) glbs.push(p); } };
walk(path.join(ROOT, "models"));
const glbJson = (p) => { const b = fs.readFileSync(p); if (b.readUInt32LE(0) !== 0x46546c67) return null; return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8")); };
const notesIn = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => { try { return { file: path.relative(ROOT, path.join(dir, f)).replace(/\\/g, "/"), j: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }; } catch { return null; } }).filter(Boolean);

const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
let rigidModels = 0;
for (const g of glbs) {
  const rel = path.relative(ROOT, g).replace(/\\/g, "/");
  const j = glbJson(g);
  const slots = [...new Set((j?.materials ?? []).map((m) => m.name).filter((n) => FLAGLIKE.test(n ?? "")))];
  if (!slots.length) continue;
  rigidModels++;
  const notes = notesIn(path.dirname(g)).find((n) => Array.isArray(n.j.rigid_flag_slots) || Array.isArray(n.j.flag_poles));
  const listed = slots.every((s) => notes?.j.rigid_flag_slots?.includes(s));
  const poles = notes?.j.flag_poles ?? [];
  check(`1. ${rel}: its flag slot(s) ${slots.join(", ")} are rigid_flag_slots, flag_poles given`, listed && poles.length > 0,
    notes ? `${notes.file}: rigid ${JSON.stringify(notes.j.rigid_flag_slots ?? [])}, ${poles.length} pole(s)` : "no notes json with rigid_flag_slots / flag_poles");
  if (!listed || !poles.length) continue;
  // 2. the poles against the modelled flags (local -> city by the notes' placement)
  const pl = notes.j.placement;
  if (!pl?.city_local_position || !Number.isFinite(pl.rotation_y_rad)) { check(`2. ${rel}: placement to compare the poles`, false, "no placement"); continue; }
  const b = fs.readFileSync(g);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), "");
  const [ox, oy, oz] = pl.city_local_position, c = Math.cos(pl.rotation_y_rad), s = Math.sin(pl.rotation_y_rad);
  const toCity = (x, y, z) => [ox + x * c + z * s, oy + y, oz - x * s + z * c];
  const bad = [], carried = new Set();
  let flags = 0;
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !slots.includes(o.material?.name)) return;
    const p = o.geometry.attributes.position, uv = o.geometry.attributes.uv;
    // the cloth's vertices clustered by the nearest pole; the hoist = the cluster's vertices within 0.15 m of that axis
    // (the hems carry metre UVs, so the edge is found by place, not by u = 0)
    const byPole = new Map();
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = toCity(p.getX(i), p.getY(i), p.getZ(i));
      let best = -1, bd = Infinity;
      poles.forEach((q, k) => { const d = Math.hypot(x - q.tip_city_xyz[0], z - q.tip_city_xyz[2]); if (d < bd) { bd = d; best = k; } });
      const e = byPole.get(best) ?? { d: Infinity, top: -Infinity, n: 0, far: 0 };
      e.d = Math.min(e.d, bd); e.n++; e.far = Math.max(e.far, bd);
      if (bd <= 0.15) e.top = Math.max(e.top, y);
      byPole.set(best, e);
    }
    for (const [k, e] of byPole) {
      flags++;
      const q = poles[k], under = q.tip_city_xyz[1] - e.top;
      if (e.d > 0.15 || !(under >= 0 && under <= 0.25) || e.far > 2.0) bad.push(`${o.parent?.name ?? "?"} ${q.name}: hoist ${e.d.toFixed(2)} m off the axis, top ${under.toFixed(2)} m under the tip, cloth reaches ${e.far.toFixed(2)} m`);
      else carried.add(`${o.parent?.name ?? "?"}|${k}`);
    }
  });
  const levels = new Set([...carried].map((x) => x.split("|")[0]));
  const allPoles = [...levels].every((lv) => poles.every((_, k) => carried.has(`${lv}|${k}`)));
  check(`2. ${rel}: every modelled flag hangs on a listed pole (axis <= 0.15 m, tip - 0..0.25 m), every pole carries one, each level`,
    !bad.length && flags > 0 && allPoles, bad.length ? bad.slice(0, 4).join("; ") : `${flags} modelled flags over ${levels.size} level(s) on ${poles.length} poles`);
}
check("1. the models with a modelled (rigid) flag were found", rigidModels >= 1, `${rigidModels} model(s) (police_rouge today)`);

// ---- 3. every flag_poles site is flown as cloth; quick mode keeps its flags
const quick = read("viewer/quick.js");
const heroes = (quick.match(/FLAG_HEROES = \[([^\]]*)\]/)?.[1] ?? "").match(/"([a-z]+)"/g)?.map((x) => x.slice(1, -1)) ?? [];
const withPoles = [];
for (const d of fs.readdirSync(path.join(ROOT, "models"), { withFileTypes: true })) if (d.isDirectory()) for (const n of notesIn(path.join(ROOT, "models", d.name))) if (n.j.flag_poles?.length) withPoles.push(n);
for (const n of withPoles) {
  const s = SITES[n.file];
  if (!s) { check(`3. ${n.file}: its flag_poles flown by a known loader`, false, "flag_poles not flown: add the site to the loader and to SITES here"); continue; }
  check(`3. ${n.file}: flown as cloth (${s.flies[0]})`, s.flies[1].test(read(s.flies[0])));
  if (n.j.rigid_flag_slots?.length) check(`3. ${n.file}: the loader leaves ${n.j.rigid_flag_slots.join(", ")} out`, !!s.drops && s.drops[1].test(read(s.drops[0])));
  for (const p of n.j.flag_poles) {
    const ok = [p.base_city_xyz, p.tip_city_xyz].every((v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)) && p.tip_city_xyz[1] > p.base_city_xyz[1] + 2;
    if (!ok) check(`3. ${n.file} pole ${p.name}: base / tip city xyz, tip above base`, false, JSON.stringify(p));
  }
  check(`3. ?quick=1 keeps ?flags on round ${s.site}`, heroes.includes(s.quick) && /FLAG_HEROES\.some\(\(k\) => lmIn\.includes\(k\)\)/.test(quick), `FLAG_HEROES = [${heroes.join(", ")}]`);
}
check("3. the flag_poles sites found", withPoles.length >= 2, withPoles.map((n) => n.file).join(", "));
const designs = read("viewer/flags/flagDesigns.js");
const unknownDesign = withPoles.flatMap((n) => n.j.flag_poles.map((p) => p.design ?? "belgium")).filter((d) => !new RegExp(`\\n\\s+${d}: \\{`).test(designs.replace(/\r/g, "")));
if (withPoles.some((n) => n.file !== "models/townhall/townhall.json")) check("3. every pole's design is a flagDesigns.js key", !unknownDesign.length, unknownDesign.join(", "));

// ---- 4. no light, no DynamicDrawUsage in the new code
const src = ["viewer/flagsCity.js", "viewer/policeCity.js"].map(read).join("\n");
check("4. no DynamicDrawUsage / new Light in the flag code", !/DynamicDrawUsage|new THREE\.\w*Light\(/.test(src));
check("4. the switch ?policeflag=old is a features.js row", /old\("policeflag"/.test(read("viewer/features.js")));

const fails = rows.filter((r) => r[1] === "FAIL");
if (!quiet || fails.length) for (const [n, r, i] of rows) console.log(`${r}  ${n}${i ? `  (${i})` : ""}`);
console.log(`flags: ${rows.length - fails.length}/${rows.length} PASS`);
process.exit(fails.length ? 1 : 0);
