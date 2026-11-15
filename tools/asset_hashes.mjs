// The service worker's list (sw.js, docs/BOOT.md): every city data file the viewer fetches -> a short content hash,
// written to /asset_hashes.json. Run by the Vercel build (vercel.json buildCommand) on every deploy; locally only to
// test return visits (the file is .gitignored: without it the service worker caches nothing).
//   node tools/asset_hashes.mjs
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
// the folders the viewer reads data from, and the file types worth caching (the code stays on the network: it changes
// with every deploy and is small)
const DIRS = ["data", "models", "textures", "clouds", "viewer"];
const EXT = /\.(glb|gltf|bin|ktx2|png|jpg|jpeg|avif|webp|json|hdr|exr|ogg|mp3|wav|f32|u16|u8|i16|dat|pbf|geojson|svg)$/i;
const SKIP = /(^|\/)(raw|_before|audit|src|node_modules|__pycache__)(\/|$)/;
const MAX = 40 * 1048576;                  // (no single file this big is fetched by the viewer)

const files = {};
let n = 0, bytes = 0;
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name), rel = relative(ROOT, p).split(sep).join("/");
    if (SKIP.test(rel)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (EXT.test(name) && st.size <= MAX && !(rel.startsWith("viewer/") && /\.js$/.test(name))) {
      files["/" + rel] = createHash("sha1").update(readFileSync(p)).digest("hex").slice(0, 12);
      n++; bytes += st.size;
    }
  }
};
for (const d of DIRS) { try { walk(join(ROOT, d)); } catch { /* missing folder */ } }
writeFileSync(join(ROOT, "asset_hashes.json"), JSON.stringify({ made: new Date().toISOString(), files }));
console.log(`asset_hashes.json: ${n} files, ${(bytes / 1048576).toFixed(0)} MB hashed`);
