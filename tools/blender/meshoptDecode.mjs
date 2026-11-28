// tools/blender/meshoptDecode.mjs: an EXT_meshopt_compression glb -> a plain glb (Blender 5.0's glTF importer cannot read
// the extension; the Mesh2Motion clips are meshopt-compressed). The bufferViews are decoded into one new buffer with
// meshoptimizer's own decoder (tools/worker/node_modules), the extension dropped. Data only: nothing in the file runs.
//   node tools/blender/meshoptDecode.mjs <in.glb> <out.glb>   (or a directory in and out: every *.glb)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(here, "../worker/package.json"));
const { MeshoptDecoder } = await import(pathToFileURL(req.resolve("meshoptimizer/decoder")).href);
await MeshoptDecoder.ready;

function decode(inFile, outFile) {
  const b = fs.readFileSync(inFile);
  const jl = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + jl).toString());
  const binStart = 20 + jl + 8, binLen = b.readUInt32LE(20 + jl), bin = b.subarray(binStart, binStart + binLen);
  if (!(j.extensionsUsed || []).includes("EXT_meshopt_compression")) { fs.copyFileSync(inFile, outFile); return "plain"; }
  const parts = []; let off = 0;
  const views = j.bufferViews.map((v) => {
    const e = v.extensions?.EXT_meshopt_compression;
    let data;
    if (e) {
      const src = bin.subarray(e.byteOffset || 0, (e.byteOffset || 0) + e.byteLength);
      data = new Uint8Array(e.count * e.byteStride);
      MeshoptDecoder.decodeGltfBuffer(data, e.count, e.byteStride, new Uint8Array(src), e.mode, e.filter || "NONE");
    } else if (j.buffers[v.buffer].extensions?.EXT_meshopt_compression?.fallback) data = new Uint8Array(v.byteLength);
    else data = new Uint8Array(bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength));
    const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(new Uint8Array(pad)); off += pad; }
    const nv = { buffer: 0, byteOffset: off, byteLength: data.length };
    if (v.byteStride) nv.byteStride = v.byteStride; if (v.target) nv.target = v.target; if (v.name) nv.name = v.name;
    parts.push(data); off += data.length;
    return nv;
  });
  j.bufferViews = views; j.buffers = [{ byteLength: off }];
  j.extensionsUsed = (j.extensionsUsed || []).filter((x) => x !== "EXT_meshopt_compression");
  j.extensionsRequired = (j.extensionsRequired || []).filter((x) => x !== "EXT_meshopt_compression");
  if (!j.extensionsUsed.length) delete j.extensionsUsed; if (!j.extensionsRequired.length) delete j.extensionsRequired;
  let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  let bb = Buffer.concat(parts.map((p) => Buffer.from(p))); bb = Buffer.concat([bb, Buffer.alloc((4 - (bb.length % 4)) % 4)]);
  const h = Buffer.alloc(12); h.write("glTF", 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + js.length + 8 + bb.length, 8);
  const c0 = Buffer.alloc(8); c0.writeUInt32LE(js.length, 0); c0.write("JSON", 4);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(bb.length, 0); c1.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(outFile, Buffer.concat([h, c0, js, c1, bb]));
  return "decoded";
}
const [, , a, b] = process.argv;
if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a).filter((x) => x.endsWith(".glb"))) console.log(f, decode(path.join(a, f), path.join(b, f))); }
else console.log(decode(a, b));
