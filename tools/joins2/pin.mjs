import { buildTile } from "../roadfix/tile.mjs";
import { heroFrame, roadDeckPins, roadDeckGround } from "../../viewer/rail/railData.js";
import { readFileSync, readdirSync } from "node:fs";
const hs = readdirSync("models/rail").filter((f) => f.endsWith(".json")).map((f) => ({ f, ...JSON.parse(readFileSync("models/rail/" + f, "utf8")) })).filter((h) => h.kind);
const [x, z] = [+process.argv[2], +process.argv[3]];
for (const h of hs) { if (h.kind !== "road_over_rail") continue; const fr = heroFrame(h); const [X, Y] = fr.toLocal(x, z); console.log(h.f, h.kind, X.toFixed(1), Y.toFixed(1), JSON.stringify(h.deck && { x0: h.deck.x0, x1: h.deck.x1, ks: h.deck.kerb_sw, kn: h.deck.kerb_ne, ends: h.deck.road_ends })); }
