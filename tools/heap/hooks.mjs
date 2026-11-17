// node --import ./tools/heap/register.mjs: `three/webgpu` / `three/tsl` -> tools/worker/node_modules/three/build (the
// page's import map), for the node checks of viewer/heapDrop.js
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
const B = join(dirname(fileURLToPath(import.meta.url)), "..", "worker", "node_modules", "three", "build");
export async function resolve(spec, ctx, next) {
  if (spec === "three/webgpu" || spec === "three") return { url: pathToFileURL(join(B, "three.webgpu.js")).href, shortCircuit: true };
  if (spec === "three/tsl") return { url: pathToFileURL(join(B, "three.tsl.js")).href, shortCircuit: true };
  return next(spec, ctx);
}
