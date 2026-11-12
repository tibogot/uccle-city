// Load vendor/slop-ped/pedestrians.js in Node (no WebGPU, no browser): its PersonRig only needs three's math classes.
// The vendored file is read as text, its three imports are pointed at three.core.js (tools/worker/node_modules, npm ci
// there first) and at stubs for the TSL / addon names it imports (only used by the material and geometry code, which
// the bake never calls), then imported from a temp file. The vendored file itself is not modified.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

export async function loadPedestrians() {
  const core = resolve(repo, "tools/worker/node_modules/three/build/three.core.js");
  let src = readFileSync(resolve(repo, "vendor/slop-ped/pedestrians.js"), "utf8");
  const dir = mkdtempSync(join(tmpdir(), "slop-ped-"));
  // the names imported from three/tsl and the addon, exported as inert stubs
  const tslNames = src.match(/import\s*\{([^}]*)\}\s*from\s*'three\/tsl'/)[1].split(",").map((s) => s.trim()).filter(Boolean);
  writeFileSync(join(dir, "tsl-stub.mjs"), tslNames.map((n) => `export const ${n} = () => { throw new Error("TSL stub: ${n}"); };`).join("\n"));
  writeFileSync(join(dir, "bgu-stub.mjs"), `export const mergeGeometries = () => { throw new Error("stub"); };`);
  src = src
    .replace("from 'three/webgpu'", `from '${pathToFileURL(core).href}'`)
    .replace("from 'three/tsl'", `from './tsl-stub.mjs'`)
    .replace("from 'three/addons/utils/BufferGeometryUtils.js'", `from './bgu-stub.mjs'`);
  const file = join(dir, "pedestrians.mjs");
  writeFileSync(file, src);
  const mod = await import(pathToFileURL(file).href);
  const THREE = await import(pathToFileURL(core).href);
  return { ...mod, THREE };
}
