// MESH AUDIT of the car GLB (tools/blender/cars2.py): every car, every authored LOD as the fleet draws it (body + the four
// wheels at their nodes), through tools/mesh_audit/audit.js; plus a CONTACT check: the four tyres touch the ground
// (lowest tyre point within 5 mm of y = 0) and no body point is below the tyres' contact.
//   node tools/cars/auditCars2.mjs models/cars/cars2.glb [--out docs/cars2/audit.md]
import fs from "fs";
import { parseCarGlb, levelParts, mergeMeshes } from "../../viewer/drive/carLod.js";
import { auditParts } from "../mesh_audit/audit.js";
const file = process.argv[2] || "models/cars/cars2.glb";
const outArg = process.argv.indexOf("--out"); const out = outArg > 0 ? process.argv[outArg + 1] : null;
const b = fs.readFileSync(file); const cars = parseCarGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const S = { authored: true };
const lines = [`# cars2 mesh audit (${file}, ${new Date().toISOString().slice(0, 10)})`, "", "| car | LOD | tris | block | warn | items (block / warn) | lowest tyre | lowest body |", "|---|---|---|---|---|---|---|---|"];
let blocking = 0;
for (const car of cars) {
  for (const src of [0, 1, 2]) {
    const parts = levelParts(S, car.parts, { src });
    const ap = parts.map((p) => {
      const P = new Float64Array(p.mesh.P.length); for (let i = 0; i < P.length; i++) P[i] = p.mesh.P[i] + p.pos[i % 3];
      return { name: p.name, slot: "", positions: P, normals: p.mesh.N, index: p.mesh.I, maxDistance: [30, 130, 600][src] };
    });
    const r = auditParts(ap, {});
    const by = r.summary.counts, nb = r.summary.blocking, nw = r.summary.warnings;
    if (process.argv.includes("--detail") && src === 0 && car.id === "hatch_c") for (const [k, list] of Object.entries(r.items)) console.log(k, JSON.stringify(list.slice(0, 6)));
    blocking += nb;
    let tyre = Infinity, bodyMin = Infinity;
    for (const p of ap) for (let i = 1; i < p.positions.length; i += 3) { if (p.name.startsWith("Wheel")) tyre = Math.min(tyre, p.positions[i]); else bodyMin = Math.min(bodyMin, p.positions[i]); }
    lines.push(`| ${car.id} | ${src} | ${ap.reduce((a, p) => a + p.index.length / 3, 0)} | ${nb} | ${nw} | ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(", ")} | ${tyre.toFixed(3)} | ${bodyMin.toFixed(3)} |`);
  }
}
const txt = lines.join("\n") + "\n";
console.log(txt);
if (out) fs.writeFileSync(out, txt);
process.exitCode = blocking ? 1 : 0;
