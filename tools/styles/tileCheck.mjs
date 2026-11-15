// Builds tiles in node as the tile worker does (kit on) and prints the façade analysis' type stats:
//   node --import ./tools/road_audit/register.mjs tools/styles/tileCheck.mjs I6 [H6 ...] [--old]
import { buildTile } from "../roadfix/tile.mjs";
const old = process.argv.includes("--old");
for (const t of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const t0 = Date.now();
  const r = await buildTile(t, { kit: true, styles: !old });
  const s = r.buildings.stats, k = r.buildings.kit;
  const pieces = Object.fromEntries(Object.entries(k?.pieces || {}).map(([n, a]) => [n, a.length / k.stride]));
  console.log(t, `${Date.now() - t0} ms`, { types: s.types, steps: s.typeSteps, canopies: s.canopies, balconies: s.balconies, kitFaces: k?.faces, details: r.buildings.details.position.length / 9 });
  console.log("  kit", pieces);
}
