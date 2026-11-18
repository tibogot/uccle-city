// node --import ./tools/heap/register.mjs: `three/webgpu` / `three/tsl` -> tools/worker/node_modules/three/build (the
// page's import map), for the node checks of viewer/heapDrop.js
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const HERE = dirname(fileURLToPath(import.meta.url));
const local = join(HERE, "..", "worker", "node_modules", "three", "build");
// a git worktree has no node_modules of its own: use the main checkout's (git's common dir is <main>/.git)
function mainCheckout() {
  try { return dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: HERE, encoding: "utf8" }).trim()); }
  catch { return null; }
}
const main = existsSync(local) ? null : mainCheckout();
const B = main ? join(main, "tools", "worker", "node_modules", "three", "build") : local;
export async function resolve(spec, ctx, next) {
  if (spec === "three/webgpu" || spec === "three") return { url: pathToFileURL(join(B, "three.webgpu.js")).href, shortCircuit: true };
  if (spec === "three/tsl") return { url: pathToFileURL(join(B, "three.tsl.js")).href, shortCircuit: true };
  // (three's addons: GLTFLoader for the kid's node checks, tools/kid/kidTest.mjs)
  if (spec.startsWith("three/addons/")) return { url: pathToFileURL(join(B, "..", "examples", "jsm", spec.slice(13))).href, shortCircuit: true };
  return next(spec, ctx);
}
