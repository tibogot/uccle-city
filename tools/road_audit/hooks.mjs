// node --import ./tools/road_audit/register.mjs: resolve the bare `three/src/...` imports of vendor/roads and
// viewer/surfaces.js (three's earcut) to tools/worker/node_modules, as the worker bundle does.
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
const BASE = join(dirname(fileURLToPath(import.meta.url)), "..", "worker", "node_modules");
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("three/src/")) return { url: pathToFileURL(join(BASE, "three", spec.slice(6))).href, shortCircuit: true };
  if (spec === "meshoptimizer/simplifier") return { url: pathToFileURL(join(BASE, "meshoptimizer", "meshopt_simplifier.js")).href, shortCircuit: true };
  return next(spec, ctx);
}
