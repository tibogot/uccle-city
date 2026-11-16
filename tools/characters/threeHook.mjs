// Node resolve hook: the browser's import map for three.js (viewer/index.html) mapped onto the local three package
// (tools/worker/node_modules/three, r187), so viewer/ modules run in node for offline tests:
//   node --import ./tools/characters/threeHook.mjs tools/characters/ualSim.mjs
// Also a few browser globals the viewer's character code touches (event listeners, document, file:// fetch).
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const THREE = path.join(ROOT, "tools/worker/node_modules/three");
const map = {
  three: "build/three.webgpu.js", "three/webgpu": "build/three.webgpu.js", "three/tsl": "build/three.tsl.js",
};
const code = `
const MAP = ${JSON.stringify(Object.fromEntries(Object.entries(map).map(([k, v]) => [k, pathToFileURL(path.join(THREE, v)).href])))};
const ADDONS = ${JSON.stringify(pathToFileURL(path.join(THREE, "examples/jsm")).href + "/")};
export async function resolve(spec, ctx, next) {
  if (MAP[spec]) return { url: MAP[spec], shortCircuit: true };
  if (spec.startsWith("three/addons/")) return { url: ADDONS + spec.slice(13), shortCircuit: true };
  return next(spec, ctx);
}`;
register("data:text/javascript," + encodeURIComponent(code));

globalThis.self ??= globalThis;
globalThis.window ??= globalThis;
globalThis.addEventListener ??= () => {};
globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, o = {}) { this.type = type; Object.assign(this, o); } };
globalThis.removeEventListener ??= () => {};
globalThis.document ??= { pointerLockElement: null, exitPointerLock() {}, createElement: () => ({ getContext: () => null, style: {} }) };
const nodeFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = typeof url === "object" && url.url ? url.url : String(url);
  if (u.startsWith("file:")) {
    const p = fileURLToPath(u);
    if (!fs.existsSync(p)) return new Response(null, { status: 404 });
    return new Response(fs.readFileSync(p), { status: 200 });
  }
  return nodeFetch(url, opts);
};
