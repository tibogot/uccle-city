// THE CITY'S VIEW OF THE MATERIAL LIBRARY (2026-11-13, owner: "the best-looking version of each material by default"):
// only the materials with a SHIPPED baked set (textures/scans.json: a CC0 scan or a texture-factory set, loaded by
// loadScans() at boot) come from the library; for every other name createMaterial() returns null, so the consumer keeps
// its own look (its temporary material), because the library's live procedural versions were judged worse than the
// consumers' own (docs/TODO.md 2026-11-12). The Material Lab keeps using library.js directly (every variant).
// Consumers: the landmarks' SOURCE (THE ONE LINE), the hero bridges; the façade kit uses scanLook (shipped only).
import { createMaterial as libCreate, DEFS as LIB_DEFS, scanLook, MATERIAL_NAMES, weatherOpts, meanColour } from "./library.js";
import { SCANS } from "./scans.js";

/** the library material when `name` has a shipped set, else null (the caller falls back to its own) */
export function createMaterial(name, opts = {}) {
  if (!SCANS[name] || !LIB_DEFS[name]) return null;
  return libCreate(name, opts);
}

/** DEFS limited to the shipped names (checked at use time: the sets load asynchronously at boot) */
export const DEFS = new Proxy(LIB_DEFS, { get: (t, k) => (typeof k === "string" && SCANS[k] ? t[k] : undefined), has: (t, k) => !!SCANS[k] && k in t });

export { scanLook, MATERIAL_NAMES, weatherOpts, meanColour, SCANS };
