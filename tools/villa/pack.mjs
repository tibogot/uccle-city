// PACK THE VILLA (claude/villa1): the mesh audit on the raw GLBs (tools/mesh_audit: z-fighting, leaks, bad normals;
// it stops the pack on a blocking item), then tools/hero_pack.mjs (COLOR_0 -> uint8, the baked light _LSKY / _LSUN /
// _LNIGHT -> RGBM uint8, meshopt on every buffer view; the exterior's LOD1 = LOD0 simplified, LOD2 = the far variant
// trimmed), then the packed files audited again (report only).
//   node tools/villa/pack.mjs [--force-audit] [--no-audit]
import { spawnSync } from "node:child_process";
import { auditGroups } from "../mesh_audit/hook.mjs";

const OY = 100, GROUND_MIN = 115.0 - OY - 0.5;
const ARGV = process.argv.slice(2);
const EXT = {
  name: "villa",
  groups: [{ name: "lod0", nodes: ["Villa", "Villa_gateL", "Villa_gateR", "Villa_door", "Villa_water"] }, { name: "far", nodes: ["Villa_far"] }],
  range: { Villa: 80, Villa_gateL: 80, Villa_gateR: 80, Villa_door: 80, Villa_water: 400, Villa_far: 2000, Villa_lod1: 260, Villa_lod2: 2000 },
  ignoreBelow: GROUND_MIN, offset: [0, OY, 0], reportDir: "models/villa/audit", allowFile: "models/villa/audit/villa.allow.json",
};
const INT = {
  name: "interior", groups: [{ name: "cell", nodes: ["Cell", "Glass"] }], range: { "*": 35 }, offset: [0, OY, 0],
  reportDir: "models/villa/audit", allowFile: "models/villa/audit/interior.allow.json", set: { maxItemsPerCheck: 1e6 },
};
if (!ARGV.includes("--no-audit")) {
  process.argv.push(...(ARGV.includes("--force-audit") ? [] : []));
  await auditGroups("models/villa/villa.raw.glb", EXT);
  await auditGroups("models/villa/interior.raw.glb", INT);
  // the soft furnishings (smooth by design): every check but streak / bentflat (they guard flat architecture)
  await auditGroups("models/villa/interior.raw.glb", { ...INT, name: "soft", groups: [{ name: "soft", nodes: ["Soft"] }], skip: ["streak", "bentflat", "sliver"], set: { maxItemsPerCheck: 1e6 } });
}
const run = (args) => {
  const r = spawnSync(process.execPath, ["tools/hero_pack.mjs", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`hero_pack ${args.join(" ")} failed`);
};
run(["models/villa/villa.raw.glb", "models/villa/villa.glb", "16000", "400", "--name", "Villa"]);
run(["models/villa/interior.raw.glb", "models/villa/interior.glb", "--nolod", "--name", "Cell"]);
if (!ARGV.includes("--no-audit")) {
  await auditGroups("models/villa/villa.glb", { ...EXT, groups: [{ name: "lod0", nodes: EXT.groups[0].nodes }, { name: "lod1", nodes: ["Villa_lod1"] }, { name: "lod2", nodes: ["Villa_lod2"] }] }, true);
}
