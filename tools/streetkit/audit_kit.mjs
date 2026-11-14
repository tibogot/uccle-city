#!/usr/bin/env node
// MESH AUDIT of the street kit (tools/mesh_audit, the owner's rule): every piece of models/streetkit/streetkit.glb on
// its own (the pieces sit on top of each other in the file; only one piece is drawn at a spot), its range = its LOD
// band's end (viewer/streetkit/streetKit.js BANDS). Reports in models/streetkit/audit/<piece>/.
//     node tools/streetkit/audit_kit.mjs
import path from "path";
import { auditGlb } from "../mesh_audit/cli.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const GLB = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "models/streetkit/streetkit.glb");
const END = { sign_pole: 320, sign_pole_tall: 320, plate_post: 260, villo_totem: 320, villo_dock: 200, villo_bike: 180 };
const PIECES = ["sign_pole", "sign_pole_tall", "plate_post", ...["circle", "tri_down", "tri_up", "octagon", "diamond", "square", "rect"].map((s) => "plate_" + s), "villo_totem", "villo_dock", "villo_bike"];
let blocking = 0;
const rows = [];
for (const p of PIECES) {
  const r = await auditGlb(GLB, { nodes: [p], range: { [p]: END[p] ?? 320 }, out: path.join(ROOT, "models/streetkit/audit", p), quiet: true, title: `Mesh audit: streetkit ${p}`, set: p.startsWith("plate_") && p !== "plate_post" ? {} : { ignoreBelow: -0.001 } });
  const c = r.summary.counts;
  blocking += r.summary.blocking;
  rows.push(`${p.padEnd(16)} blocking ${r.summary.blocking}  ${Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ")}`);
}
console.log(rows.join("\n"));
console.log(`total blocking: ${blocking}`);
process.exit(blocking ? 1 : 0);
