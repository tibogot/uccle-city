#!/usr/bin/env node
// MESH AUDIT of the motorbike (tools/blender/motorbike.py -> models/moto/moto.raw.glb), every LOD as the viewer makes it
// (viewer/moto/motoLod.js: weld + meshoptimizer), with the shared checker (tools/mesh_audit/audit.js).
// Groups = what is drawn together: the bike + rider at rest (LOD k of every piece) and the arm segments alone (the viewer
// poses them by IK, so their rest pose overlaps nothing real). Reports: models/moto/audit/<group>.lod<k>.audit.md
//     node tools/moto/audit.mjs            exit 1 while blocking items remain
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, "../..");
const imp = (p) => import(pathToFileURL(resolve(root, p)).href);
const { readGlb } = await imp("tools/mesh_audit/glb.mjs");
const { auditParts, toMarkdown } = await imp("tools/mesh_audit/audit.js");
const { MeshoptSimplifier } = await imp("tools/worker/node_modules/meshoptimizer/meshopt_simplifier.js");
const { MOTO_LODS, weld, lodPart } = await imp("viewer/moto/motoLod.js");
await MeshoptSimplifier.ready;

const { parts } = await readGlb(resolve(root, "models/moto/moto.raw.glb"));
const ARMS = /^Arm/;
// (the arm segments: one upper + one forearm; L and R are the same mesh at the same rest place)
const groups = { bike: parts.filter((p) => !ARMS.test(p.node)), armU: parts.filter((p) => p.node === "ArmU_L"), armF: parts.filter((p) => p.node === "ArmF_L") };
const ONLY0 = process.argv.includes("--lod0");
const out = resolve(root, "models/moto/audit"); mkdirSync(out, { recursive: true });
let blocking = 0;
const tris = {};
for (const [g, ps] of Object.entries(groups)) {
  for (let k = 0; k < (ONLY0 ? 1 : MOTO_LODS.length); k++) {
    const L = MOTO_LODS[k];
    const aps = ps.map((p) => {
      const w = weld({ P: p.positions, N: p.normals, U: p.uv1, I: p.index });
      const q = lodPart(w, L.error, MeshoptSimplifier);
      tris[`${p.node}`] ??= [0, 0, 0]; tris[p.node][k] += q.I.length / 3;
      return { name: `${p.node}/${p.slot}`, slot: p.slot, positions: q.P, normals: q.N, index: q.I, maxDistance: Math.min(L.until, 250) };
    });
    // (the ground is at y = 0: the tyres' contact patches meet it, nothing to check under it)
    const rep = auditParts(aps, { ignoreBelow: 0.002, maxItemsPerCheck: 6000 });
    blocking += rep.summary.blocking;
    const c = Object.entries(rep.summary.counts).filter(([, v]) => v).map(([n, v]) => `${n} ${v}`).join(", ");
    console.log(`${g} lod${k}: ${aps.reduce((s, p) => s + p.index.length / 3, 0)} tris, blocking ${rep.summary.blocking}  ${c}`);
    // blocking items by check and parts (the Markdown tables stop at 40 rows)
    const agg = {};
    for (const it of Object.values(rep.items).flat()) { const sev = { coplanar: 1, depth: 1, crossing: 1, leak: 1, flipped: 1, streak: 1, bentflat: 1 }[it.check]; if (!sev) continue; const key = `${it.check}: ${it.parts || it.part}`; agg[key] = (agg[key] || 0) + 1; }
    const at = {}; for (const it of Object.values(rep.items).flat()) { const key = `${it.check}: ${it.parts || it.part}`; if (agg[key] && !(at[key]?.length >= 3)) (at[key] ??= []).push(it.at.map((v) => +v.toFixed(3)).join(",") + (it.angle_deg ? `@${it.angle_deg}` : "") + (it.spread ? ` s${it.spread} a${it.aspect} L${it.longest}` : "")); }
    for (const [k2, v] of Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`    ${v}  ${k2}   ${at[k2].join(" | ")}`);
    writeFileSync(resolve(out, `${g}.lod${k}.audit.md`), toMarkdown(rep, { title: `Mesh audit: motorbike ${g} LOD${k} (error ${L.error} m)` }));
  }
}
console.log("tris per node [lod0, lod1, lod2]:", JSON.stringify(tris));
console.log(`total blocking: ${blocking}`);
process.exitCode = blocking ? 1 : 0;
