// node --import ./tools/christmas/hook.mjs tools/christmas/xmasTest.mjs: the three.js import map (tools/characters/threeHook.mjs)
// + meshoptimizer's simplifier (viewer/index.html maps it to a CDN; here the local package)
import "../characters/threeHook.mjs";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SIMP = pathToFileURL(path.join(ROOT, "tools/worker/node_modules/meshoptimizer/meshopt_simplifier.js")).href;
register("data:text/javascript," + encodeURIComponent(`export async function resolve(spec, ctx, next) {
  if (spec === "meshoptimizer/simplifier") return { url: ${JSON.stringify(SIMP)}, shortCircuit: true };
  return next(spec, ctx);
}`));
