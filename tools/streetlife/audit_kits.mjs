// Mesh audit of the street-life prop kits (viewer/streetlife/kits.js), LOD0 and the meshoptimizer LOD1 the lab makes:
//   node tools/streetlife/audit_kits.mjs [--out docs/streetlife/audit]
// Exit 1 while any blocking item remains (tools/mesh_audit/README.md). Also prints triangle counts per LOD.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, "../..");
const { auditParts, toMarkdown } = await import(pathToFileURL(resolve(root, "tools/mesh_audit/audit.js")).href);
// the kit modules are browser ES modules (.js without "type": "module"): load them as module data URLs
const load = async (rel, rewrite = (s) => s) => import("data:text/javascript;base64," + Buffer.from(rewrite(readFileSync(resolve(root, rel), "utf8"))).toString("base64"));
const geoMod = await load("viewer/streetlife/kitGeom.js");
const geoURL = "data:text/javascript;base64," + Buffer.from(readFileSync(resolve(root, "viewer/streetlife/kitGeom.js"), "utf8")).toString("base64");
const kits = await load("viewer/streetlife/kits.js", (s) => s.replace('"./kitGeom.js"', JSON.stringify(geoURL)));
const lodMod = await load("viewer/streetlife/kitLod.js", (s) => s.replace(/from "meshoptimizer\/simplifier"/, `from ${JSON.stringify(pathToFileURL(resolve(root, "tools/worker/node_modules/meshoptimizer/meshopt_simplifier.js")).href)}`));
void geoMod;

const out = process.argv.includes("--out") ? resolve(root, process.argv[process.argv.indexOf("--out") + 1]) : resolve(root, "docs/streetlife/audit");
mkdirSync(out, { recursive: true });
let blocking = 0;
const rows = [];
for (const [kind, k] of Object.entries(kits.KITS)) {
  const a0 = k.build().arrays();
  const a1 = await lodMod.simplifyKit(k.build(1).arrays(), kind);
  for (const [lod, a] of [["lod0", a0], ["lod1", a1]]) {
    const part = { name: `${kind}.${lod}`, slot: "", positions: a.position, normals: a.normal, index: a.index, maxDistance: lod === "lod0" ? k.lod[0] : k.lod[1] };
    const rep = auditParts([part], { ignoreBelow: -0.01 });
    const block = rep.summary.blocking;
    blocking += block;
    rows.push(`${kind} ${lod}: ${a.index.length / 3} tris, blocking ${block}, ${JSON.stringify(rep.summary.counts)}`);
    writeFileSync(resolve(out, `${kind}.${lod}.audit.md`), toMarkdown(rep, { title: `Mesh audit: ${kind} ${lod}` }));
  }
}
console.log(rows.join("\n"));
console.log(blocking ? `BLOCKING ITEMS: ${blocking}` : "0 blocking");
process.exit(blocking ? 1 : 0);
