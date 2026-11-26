// PACK THE CALEVOET UNDERPASS U1 (claude/underpass1): after tools/blender/underpass.py.
//   1. the mesh audit on the raw GLBs (tools/mesh_audit: z-fighting, leaks, bad normals); the pack STOPS on a blocking item
//      (--force-audit to pack anyway); LOD groups = what is drawn together (lod0 + the throat; lod1; lod2; the inside);
//   2. tools/hero_pack.mjs --nolod on both (the LODs are scripted): COLOR_0 -> uint8, _LSKY / _LNIGHT -> RGBM uint8,
//      meshopt on every buffer view;
//   3. the mural atlas -> KTX2 (UASTC + RDO lambda 1 + Zstandard, mipmaps: the KTX-Software CLI; round 2: the painted
//      mural's grain made plain UASTC 4.3 MB, RDO brings it to 2.7 MB), the PNG kept as the fallback;
//   4. the packed files audited again (report only).
//   node tools/underpass/pack.mjs [--force-audit] [--no-audit]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { auditGroups } from "../mesh_audit/hook.mjs";

const OY = 40;
const ARGV = process.argv.slice(2);
const D = "models/underpass";
const notes = JSON.parse(fs.readFileSync(`${D}/calevoet.json`, "utf8"));
const groundMin = Math.min(...Object.values(notes.kiosks).map((k) => k.skirt)) - OY - 0.2;
const SURF = {
  name: "calevoet",
  groups: [{ name: "lod0", nodes: ["Underpass_lod0", "Underpass_throat"] }, { name: "lod1", nodes: ["Underpass_lod1"] }, { name: "lod2", nodes: ["Underpass_lod2"] }],
  range: { Underpass_lod0: 70, Underpass_throat: 70, Underpass_lod1: 230, Underpass_lod2: 2000 },
  ignoreBelow: groundMin, offset: [0, OY, 0], reportDir: `${D}/audit`, allowFile: `${D}/audit/calevoet.allow.json`,
};
const IN = { name: "inside", groups: [{ name: "inside", nodes: ["Inside"] }], range: { "*": 55 }, offset: [0, OY, 0], reportDir: `${D}/audit`, allowFile: `${D}/audit/inside.allow.json`, set: { maxItemsPerCheck: 1e6 } };
fs.mkdirSync(`${D}/audit`, { recursive: true });
if (!ARGV.includes("--no-audit")) {
  await auditGroups(`${D}/calevoet.raw.glb`, SURF);
  await auditGroups(`${D}/calevoet_in.raw.glb`, IN);
}
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
};
run(process.execPath, ["tools/hero_pack.mjs", `${D}/calevoet.raw.glb`, `${D}/calevoet.glb`, "--nolod", "--name", "Underpass"]);
run(process.execPath, ["tools/hero_pack.mjs", `${D}/calevoet_in.raw.glb`, `${D}/calevoet_in.glb`, "--nolod", "--name", "Inside"]);
const KTX = process.env.KTX_EXE || "C:/Program Files/KTX-Software/bin/ktx.exe";
if (fs.existsSync(KTX)) {
  run(KTX, ["create", "--format", "R8G8B8A8_SRGB", "--assign-tf", "srgb", "--encode", "uastc", "--uastc-quality", "2", "--uastc-rdo", "--uastc-rdo-l", "1.0", "--zstd", "18", "--generate-mipmap", `${D}/mural.png`, `${D}/mural.ktx2`]);
} else console.warn("[underpass pack] no KTX-Software CLI: the mural ships as PNG only");
if (!ARGV.includes("--no-audit")) {
  await auditGroups(`${D}/calevoet.glb`, SURF, true);
  await auditGroups(`${D}/calevoet_in.glb`, IN, true);
}
for (const f of ["calevoet.glb", "calevoet_in.glb", "calevoet_ao.png", "mural.ktx2", "mural.png"]) if (fs.existsSync(`${D}/${f}`)) console.log(`${f}: ${(fs.statSync(`${D}/${f}`).size / 1024).toFixed(0)} KB`);
