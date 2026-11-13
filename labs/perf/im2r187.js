// InstancedMesh2 1.0.0-beta.1 (@three.ez/instanced-mesh, agargaro, MIT) on three r187: the Perf Lab only, NOT the city.
//
// The beta is pinned to three r186. Its one hard incompatibility with r187 (read 2026-11-13, docs/perf/AUDIT_PLAN.md
// 3.3b): prepareInstancedRenderer() throws unless `renderer._isPreCompiling` is a boolean, and it reads that flag each
// draw (skip the motion history while compileAsync pre-builds). r187 replaced the flag with `_precompilationState`
// (null outside pre-compilation); r187's own code changed `_isPreCompiling === true` into `_precompilationState !== null`
// at the same place, so this getter is the exact mapping. Every other patch point of the beta exists in r187 and is
// wrapped, not replaced. Still to PROVE in the lab before any number is trusted: shadows, shadow LOD, compileAsync
// warm-up, colour / opacity, culling with our camera paths.
//
//   import { prepareIM2 } from "./im2r187.js";
//   const IM2 = await prepareIM2(renderer);   // the module namespace (InstancedMesh2, ...), or null if it failed

export const IM2_URL = "https://cdn.jsdelivr.net/npm/@three.ez/instanced-mesh@1.0.0-beta.1/build/index.js";

export function shimR187(renderer) {
  if (typeof renderer._isPreCompiling === "boolean") return false;            // r186: nothing to do
  if (!("_precompilationState" in renderer)) throw new Error("neither _isPreCompiling nor _precompilationState: unknown three version");
  Object.defineProperty(renderer, "_isPreCompiling", { configurable: true, get() { return this._precompilationState != null; } });
  return true;
}

/** Load the beta (it imports "three" / "three/webgpu" / "three/tsl" through the page's import map; it also needs
 *  "bvh.js" mapped), shim r187, prepare the renderer once. */
export async function prepareIM2(renderer, { url = IM2_URL, log = console.log } = {}) {
  try {
    const shimmed = shimR187(renderer);
    const IM2 = await import(url);
    await IM2.prepareInstancedRenderer(renderer);
    log(`InstancedMesh2 beta ready${shimmed ? " (r187 shim)" : ""}`);
    return IM2;
  } catch (e) {
    log(`InstancedMesh2 beta failed: ${e.message}`);
    return null;
  }
}
