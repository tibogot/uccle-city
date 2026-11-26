// gate row `shopfill` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "shopfill",
  script: "tools/audit/shopFillCheck.mjs",
  args: ["--quiet"],
  guards: "(claude/reality1 round 3, rules shop-street-fill + shop-front-real, classes C2 + C3) every fill front (data/streetlife pois fill: true) on a street with >= 3 real shops of that street within 45 m, on a wall <= 5 m from the kerb, clear of every real shop, named with a trade word (no invented brand); fronts per 100 m on Rue Xavier De Bue / Parvis Saint-Pierre >= 4 and on the Chaussees d'Alsemberg / de Waterloo >= 1.2 (whole length); the round's curated fronts (Bleus d'Encre, Kruidvat x 2, TUI, Pearle, Vapshop, IMMO DUGO, traKKs) with sign text and board colour, placed; the chain fronts listed for the owner",
  timeout: 60,
  deps: ["data/streetlife/", "data/shops/terraces.json", "tools/streetlife/build_streetlife.py", "tools/streetlife/extra_pois.json"],
};
