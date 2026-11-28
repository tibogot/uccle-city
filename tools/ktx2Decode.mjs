// tools/ktx2Decode.mjs: a KTX2 (Basis UASTC / ETC1S, zstd) file -> RGBA8 pixels in Node, with three's own Basis
// transcoder (tools/worker/node_modules/three/examples/jsm/libs/basis/: the one the browser's KTX2Loader runs).
// For the gate's texture checks (tools/falconV2pose.mjs: the folded wing's colours on the shipped plumage).
//   import { decodeKTX2 } from "./ktx2Decode.mjs"; const { width, height, data } = await decodeKTX2(buf)  // top row first
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "worker/node_modules/three/examples/jsm/libs/basis");
let M = null;
async function basis() {
  if (M) return M;
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(DIR, "basis_transcoder.js"), "utf8") + "\n;globalThis.BASIS = BASIS;", ctx);
  M = await ctx.BASIS({ wasmBinary: fs.readFileSync(path.join(DIR, "basis_transcoder.wasm")) });
  M.initializeBasis();
  return M;
}
export async function decodeKTX2(buf) {
  const B = await basis(), f = new B.KTX2File(new Uint8Array(buf));
  try {
    if (!f.isValid() || !f.startTranscoding()) throw new Error("KTX2: not a valid / transcodable file");
    const RGBA32 = 13, width = f.getWidth(), height = f.getHeight(), data = new Uint8Array(f.getImageTranscodedSizeInBytes(0, 0, 0, RGBA32));
    if (!f.transcodeImage(data, 0, 0, 0, RGBA32, 0, -1, -1)) throw new Error("KTX2: transcode failed");
    return { width, height, data };
  } finally { f.close(); f.delete(); }
}
