// CHARACTERS -> models/characters/<name>.glb for the third-person slot (viewer/character/characterModel.js).
//
//   node tools/characters/convertCharacters.mjs
//
// Inputs (CC0, downloaded by hand, git-ignored, read as plain data: nothing in them is executed):
//   data/raw/characters/polypizza/hoodie_gKLBoRsyKe.glb    Quaternius "Hoodie Character"  https://poly.pizza/m/gKLBoRsyKe
//   data/raw/characters/polypizza/casual_kZ3DmIoGip.glb    Quaternius "Casual Character"  https://poly.pizza/m/kZ3DmIoGip
// (Quaternius' Ultimate Modular Men pack, 2022, CC0: 4 skinned parts on one 62-joint skeleton, 24 clips.)
//
// What it does (a GLB rewrite, no Blender): keeps the clips the character uses (idle, walk, run and a few spares),
// drops the gun / sword / punch / death ones, and rewrites the binary buffer with only what is still referenced
// (one buffer view per accessor). Meshes, skins, materials are kept as they are; the viewer merges the four parts
// into one skinned mesh with the material colours baked to vertex colours (one material, one draw) at load.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const RAW = path.join(ROOT, "data/raw/characters/polypizza");
const OUT = path.join(ROOT, "models/characters");
const KEEP = ["Idle", "Idle_Neutral", "Walk", "Run", "Roll", "Wave", "Interact"];
const SOURCES = [
  { name: "hoodie", file: "hoodie_gKLBoRsyKe.glb", src: "https://poly.pizza/m/gKLBoRsyKe" },
  { name: "casual", file: "casual_kZ3DmIoGip.glb", src: "https://poly.pizza/m/kZ3DmIoGip" },
];

function readGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  let o = 12, json = null, bin = null;
  while (o < buf.length) {
    const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString("utf8"));
    else if (type === 0x004e4942) bin = data;
    o += 8 + len;
  }
  return { json, bin };
}
function writeGLB(json, bin) {
  const pad = (b, c) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, c)]);
  const j = pad(Buffer.from(JSON.stringify(json), "utf8"), 0x20), b = pad(bin, 0);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + j.length + 8 + b.length, 8);
  const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.writeUInt32LE(type, 4); return h; };
  return Buffer.concat([head, ch(j.length, 0x4e4f534a), j, ch(b.length, 0x004e4942), b]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const s of SOURCES) {
  const { json, bin } = readGLB(fs.readFileSync(path.join(RAW, s.file)));
  const before = json.animations.length;
  json.animations = json.animations.filter((a) => KEEP.includes(a.name.split("|").pop()));
  for (const a of json.animations) a.name = a.name.split("|").pop();
  // the accessors still referenced
  const used = new Set();
  for (const m of json.meshes) for (const p of m.primitives) { if (p.indices !== undefined) used.add(p.indices); for (const k of Object.values(p.attributes)) used.add(k); for (const t of p.targets || []) for (const k of Object.values(t)) used.add(k); }
  for (const sk of json.skins || []) if (sk.inverseBindMatrices !== undefined) used.add(sk.inverseBindMatrices);
  for (const a of json.animations) for (const sm of a.samplers) { used.add(sm.input); used.add(sm.output); }
  const order = [...used].sort((a, b) => a - b), remap = new Map(order.map((k, i) => [k, i]));
  const views = [], accessors = [], parts = [];
  let off = 0;
  for (const k of order) {
    const acc = { ...json.accessors[k] }, bv = json.bufferViews[acc.bufferView];
    if (bv.byteStride) throw new Error("interleaved buffer views are not handled");
    const comp = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
    const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type];
    const len = acc.count * n * comp, start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const data = Buffer.from(bin.subarray(start, start + len));
    const v = { buffer: 0, byteOffset: off, byteLength: len };
    if (bv.target) v.target = bv.target;
    views.push(v); delete acc.byteOffset; acc.bufferView = views.length - 1; accessors.push(acc);
    parts.push(data, Buffer.alloc((4 - (len % 4)) % 4)); off += len + ((4 - (len % 4)) % 4);
  }
  const R = (k) => remap.get(k);
  for (const m of json.meshes) for (const p of m.primitives) { if (p.indices !== undefined) p.indices = R(p.indices); for (const k of Object.keys(p.attributes)) p.attributes[k] = R(p.attributes[k]); }
  for (const sk of json.skins || []) if (sk.inverseBindMatrices !== undefined) sk.inverseBindMatrices = R(sk.inverseBindMatrices);
  for (const a of json.animations) for (const sm of a.samplers) { sm.input = R(sm.input); sm.output = R(sm.output); }
  json.accessors = accessors; json.bufferViews = views;
  const outBin = Buffer.concat(parts);
  json.buffers = [{ byteLength: outBin.length }];
  json.asset = { version: "2.0", generator: "uccle-city tools/characters/convertCharacters.mjs (from FBX2glTF)", copyright: `Quaternius, CC0 1.0 (${s.src})` };
  const out = writeGLB(json, outBin);
  fs.writeFileSync(path.join(OUT, `${s.name}.glb`), out);
  console.log(`${s.name}: ${before} -> ${json.animations.length} clips (${json.animations.map((a) => a.name).join(", ")}), ${(fs.statSync(path.join(RAW, s.file)).size / 1024).toFixed(0)} -> ${(out.length / 1024).toFixed(0)} KB`);
}
