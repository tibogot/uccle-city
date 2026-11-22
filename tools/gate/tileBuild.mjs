// The tile worker's build in node through the gate's tile cache (tools/gate/tileCache.mjs, rule tile-cache):
//   const { tileData } = await import(<the repo>/tools/gate/tileBuild.mjs);
//   const d = await tileData(entry, base);          // in place of viewer/tileData.js buildTileData(entry, base)
// The key holds the code hash of the worker bundle's inputs (viewer/tileWorker.js's import closure), the canonical
// entry (without keepNet), the base folder (as a repo path) and every file the build fetched.
// What comes back is the build as the worker would post it (plain data). keepNet (the node checks' live objects) is NOT
// cacheable as it is (net holds closures, hm is a Heightmap); what the rows use of it is kept as plain data:
//   d.deckRings                    (deckRails, deckJoins)
//   d.net.streetModel.segments     (driveCheck)
//   d.hm                           a Heightmap rebuilt from d.hdr / d.y / d.orig (Heightmap.from, as the rows do)
// Any other d.net.* is a loud error ("not kept by the tile cache"), never a silent undefined: a row that needs more of
// the network adds it to pack / unpack below (plain data only) or runs with --no-tile-cache.
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { cached, ROOT, mode } from "./tileCache.mjs";

const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
export const CODE = ["viewer/tileWorker.js", "tools/gate/tileBuild.mjs", "tools/gate/tileCache.mjs"];
let mods = null;
const load = async () => (mods ??= { ...(await imp("viewer/tileData.js")), ...(await imp("viewer/heightmap.js")) });

/** an object that answers only the listed keys and throws on any other (a cached keepNet `net`) */
function guarded(obj, where) {
  return new Proxy(obj, {
    get(t, k) {
      if (typeof k === "symbol" || k === "then" || k === "toJSON") return t[k];
      if (k in t) return t[k];
      throw new Error(`tile cache: ${where}.${String(k)} is not kept by the tile cache (tools/gate/tileBuild.mjs pack / unpack; or run with --no-tile-cache)`);
    },
  });
}
const relBase = (base) => { const p = base.startsWith("file:") ? fileURLToPath(base) : base; return path.relative(ROOT, p).replace(/\\/g, "/") + "/"; };

/** viewer/tileData.js buildTileData(entry, base), cached; { hit } of the last call in lastInfo */
export let lastInfo = null;
export async function tileData(entry, base) {
  const { buildTileData, Heightmap } = await load();
  if (mode() === "off") return buildTileData(entry, base);
  const wantNet = !!entry.keepNet;
  const { keepNet, ...key } = entry;
  const r = await cached({
    kind: "worker", tile: entry.name, code: CODE, opts: { entry: key, base: relBase(base) },
    // (always built with keepNet: it only ADDS net / hm / deckRings to the result, so one entry serves both callers)
    build: () => buildTileData({ ...entry, keepNet: true }, base),
    pack: (d) => {
      const { net, hm, deckRings, ...plain } = d;
      return { plain, kept: { deckRings: deckRings ?? null, segments: net?.streetModel?.segments ?? null, streetModel: !!net?.streetModel } };
    },
    unpack: (p) => {
      if (!wantNet) return p.plain;
      const k = p.kept, d = p.plain;
      return { ...d, deckRings: k.deckRings,
        net: guarded(k.streetModel ? { streetModel: guarded({ segments: k.segments }, "d.net.streetModel") } : { streetModel: null }, "d.net"),
        hm: Heightmap.from(d.hdr, d.y, d.orig) };
    },
  });
  lastInfo = { hit: r.hit, ms: r.ms, stored: r.stored };
  return r.value;
}
