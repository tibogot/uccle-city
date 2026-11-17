// Cortenbosch round 2 node check (docs/CORTENBOSCH2.md): builds tiles F6 / F7 as the worker does and prints, for the
// curated buildings, the type / style / garage / roof-tile flag packed into the façade attributes, the detail strips'
// colours, and the lane's road-text decal; --old: ?cortenbosch2=old.
//   node --import ./tools/road_audit/register.mjs tools/cortenbosch2/check.mjs [F7 F6] [--old]
import { buildTile } from "../roadfix/tile.mjs";
import { readFileSync } from "node:fs";
const old = process.argv.includes("--old");
const ov = JSON.parse(readFileSync(new URL("../../data/overrides.json", import.meta.url), "utf8"));
const ids = new Set(Object.entries(ov.buildingLooks).filter(([, v]) => v && (v.set === "cortenbosch" || v.set === "cortenbosch2")).map(([k]) => k));
const tiles = process.argv.slice(2).filter((a) => !a.startsWith("--"));
for (const T of tiles.length ? tiles : ["F7", "F6"]) {
  const t0 = Date.now();
  const r = await buildTile(T, { styles: true, looks: true, cortenbosch: true, cortenbosch2: !old, paint: "v2" });
  const B = r.buildings, W = B.walls, R = B.roofs;
  console.log(T, `${Date.now() - t0} ms`, "types", JSON.stringify(B.stats.types));
  // per building id: the aBld of its first wall vertex (style, partyH, street + 2 type + 16 garage, rnd) via position match
  const seen = new Map();
  const n = W.position.length / 3;
  // the worker does not keep the building per vertex: match by the footprint (centroid inside)
  const doc = JSON.parse(readFileSync(new URL(`../../data/tiles/${T}/buildings.json`, import.meta.url), "utf8"));
  const pip = (x, z, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
  const want = doc.buildings.filter((b) => ids.has(b.id.split("/").pop()));
  for (let v = 0; v < n; v += 3) {
    const x = W.position[v * 3], z = W.position[v * 3 + 2];
    const nx = W.aFN[v * 4], nz = W.aFN[v * 4 + 1];
    for (const b of want) {
      const id = b.id.split("/").pop();
      if (seen.has(id)) continue;
      if (pip(x - nx * 0.3, z - nz * 0.3, b.footprint[0])) {
        const z4 = Math.round(W.aBld[v * 4 + 2]);
        seen.set(id, { style: +W.aBld[v * 4].toFixed(3), type: (z4 % 16) >> 1, garage: z4 >= 16 ? 1 : 0 });
      }
    }
  }
  for (const [id, s] of seen) console.log("  ", id, JSON.stringify(s));
  let conc = 0; for (let i = 3; i < R.aRoof.length; i += 4) if (R.aRoof[i] >= 1.5) conc++;
  console.log("   concrete-tile roof vertices", conc);
  const rt = r.road?.parts?.roadtext;
  console.log("   road text decal", rt ? `${rt.index.length / 3} triangles` : "none");
}
