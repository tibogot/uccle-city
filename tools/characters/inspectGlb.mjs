// Print a GLB's skeleton (joint hierarchy, rest translations) and its animation names + durations. Reads the file as
// data only.   node tools/characters/inspectGlb.mjs <file.glb> [--clips]
import fs from "node:fs";

const file = process.argv[2];
const buf = fs.readFileSync(file);
let o = 12, json = null;
while (o < buf.length) {
  const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4);
  if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(o + 8, o + 8 + len).toString("utf8"));
  o += 8 + len;
}
const nodes = json.nodes || [];
const parent = new Map();
nodes.forEach((n, i) => (n.children || []).forEach((c) => parent.set(c, i)));
for (const [si, skin] of (json.skins || []).entries()) {
  console.log(`skin ${si}: ${skin.joints.length} joints`);
  const joints = new Set(skin.joints);
  const depth = (i) => { let d = 0; while (parent.has(i) && joints.has(parent.get(i))) { i = parent.get(i); d++; } return d; };
  for (const j of skin.joints) {
    const n = nodes[j], t = (n.translation || [0, 0, 0]).map((v) => v.toFixed(3)).join(",");
    console.log(`${"  ".repeat(depth(j))}${n.name}  t(${t})${n.rotation ? "  r(" + n.rotation.map((v) => v.toFixed(3)).join(",") + ")" : ""}${n.scale ? "  s(" + n.scale.map((v) => v.toFixed(3)).join(",") + ")" : ""}`);
  }
}
const acc = json.accessors || [];
if (process.argv.includes("--clips")) {
  for (const a of json.animations || []) {
    let dur = 0;
    for (const s of a.samplers) dur = Math.max(dur, acc[s.input].max?.[0] ?? 0);
    console.log(`clip ${a.name}  ${dur.toFixed(2)} s  ${a.channels.length} ch`);
  }
} else console.log(`${(json.animations || []).length} clips`);
const roots = nodes.map((n, i) => i).filter((i) => !parent.has(i));
console.log("scene roots:", roots.map((i) => `${nodes[i].name}${nodes[i].scale ? " s" + nodes[i].scale : ""}${nodes[i].rotation ? " r" + nodes[i].rotation.map((v) => v.toFixed(2)) : ""}`).join(" | "));
