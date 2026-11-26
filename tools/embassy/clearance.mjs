// THE EMBASSY POLES AGAINST THE DRAWN CITY (rule embassy-flags; tools/audit/embassyFlagsCheck.mjs part 6): each tile with
// a pole built as the city builds it (tools/audit/census/lib_mesh.mjs buildTile: walls, the façade kit's walls, the
// building details (balconies, porches ...), roofs) and, per pole:
//   pole     the pole's axis (from 10 cm over its foot to its tip) meets no drawn triangle;
//   cloth    from three points down the hoist (the top, the middle, the foot of the flag), 16 horizontal rays as long as
//            the flag's fly (+ 10 cm): a free pole's cloth swings round the pole with the wind, so every direction must
//            be clear; a pole near a wall (its half-space) or a bracket: every direction that does not go into the wall
//            (d . n > -0.2).
//   node --import ./tools/christmas/hook.mjs --import ./tools/road_audit/register.mjs tools/embassy/clearance.mjs [--json]   -> { pole id: { pole, cloth } }
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./geo.mjs";

const { buildTile, Bvh, concatSoups } = await import("../audit/census/lib_mesh.mjs");
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "data/places/embassy_flags.json"), "utf8"));
globalThis.location ??= { search: "" };
const { poleGeometry, bracketAxis, POLE_H, BRACKET_LEN } = await import("../../viewer/embassyFlags.js");

export async function clearance() {
  const out = {}, byTile = new Map();
  for (const p of doc.poles ?? []) { if (!byTile.has(p.tile)) byTile.set(p.tile, []); byTile.get(p.tile).push(p); }
  for (const [T, list] of byTile) {
    const { d } = await buildTile(T, { keepNet: true });                        // (keepNet: d.hm, the drawn ground)
    const B = d.buildings;
    const soup = concatSoups([{ name: "walls", pos: B.walls?.position }, { name: "kitWalls", pos: B.walls?.kit?.position }, { name: "details", pos: B.details?.position }, { name: "roofs", pos: B.roofs?.position }]);
    const bvh = new Bvh(soup.pos);
    if (!d.hm?.surface) throw new Error(`clearance: tile ${T} built without its heightmap (d.hm)`);
    const ground = (x, z) => d.hm.surface(x, z);                                // = main.js: the poles stand on hm.surface
    for (const p of list) {
      const G = poleGeometry({ pos: [], nrm: [], col: [], idx: [] }, p, ground);
      const [bx, by, bz] = G.base, [tx, ty, tz] = G.tip;
      const L = Math.hypot(tx - bx, ty - by, tz - bz), ax = [(tx - bx) / L, (ty - by) / L, (tz - bz) / L];
      const o0 = p.type === "bracket" ? 0.15 : 0.1;
      const ph = bvh.hit(bx + ax[0] * o0, by + ax[1] * o0, bz + ax[2] * o0, ax[0], ax[1], ax[2], L - o0);
      const pole = ph ? `meets ${soup.names[soup.src[ph.tri]]} ${(o0 + ph.t).toFixed(2)} m up the pole` : null;
      const fly = p.type === "bracket" ? 1.2 : 1.5, hoist = p.type === "bracket" ? 0.8 : 1.0;
      const wn = p.type === "bracket" ? p.n : p.wall?.n ?? null;
      const top = [tx - ax[0] * 0.12, ty - ax[1] * 0.12, tz - ax[2] * 0.12], blocked = [];
      for (const s of [0, 0.5, 1]) {
        const ox = top[0] - ax[0] * hoist * s, oy = top[1] - ax[1] * hoist * s, oz = top[2] - ax[2] * hoist * s;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
          if (wn && dx * wn[0] + dz * wn[1] < -0.2) continue;                 // into the wall: the half-space keeps it out
          const h = bvh.hit(ox, oy, oz, dx, 0, dz, fly + 0.1);
          if (h) blocked.push(`${soup.names[soup.src[h.tri]]} ${h.t.toFixed(2)} m at ${Math.round((a * 180) / Math.PI)} deg, ${s ? `${(hoist * s).toFixed(1)} m down` : "top"}`);
        }
      }
      out[p.id] = { pole, cloth: blocked.length ? `${blocked.length} ray(s) blocked: ${blocked.slice(0, 3).join("; ")}` : null, tile: T };
    }
  }
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const r = await clearance();
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 1));
  else for (const [id, v] of Object.entries(r)) console.log(`${v.pole || v.cloth ? "BAD " : "ok  "} ${id} (${v.tile})${v.pole ? `  pole ${v.pole}` : ""}${v.cloth ? `  cloth ${v.cloth}` : ""}`);
}
