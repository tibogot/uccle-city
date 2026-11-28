import { buildTile } from "../roadfix/tile.mjs";
for (const T of process.argv.slice(2)) {
  const t0 = Date.now();
  const d = await buildTile(T, {});
  console.log(T, "built", Date.now() - t0, "ms; walk graph", d.times["walk graph"], "ms", JSON.stringify(d.peds?.stats));
}
