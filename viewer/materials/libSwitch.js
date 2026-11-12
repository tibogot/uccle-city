// Which consumers take their named looks from the shared material library (viewer/materials/library.js, the shipped
// picks of textures/scans.json) instead of their own temporary TSL stand-ins. Every consumer's THE ONE LINE reads
//   const SOURCE = libSource("<consumer>", "<path to library.js>");
// Default (2026-11-13, owner): the library everywhere. URL for A/B and fallbacks:
//   ?libmat=0                 every consumer on its own temporary materials (the "before")
//   ?libmat=kit,townhall      only these on the library (the rest temporary)
//   ?libmat=-stalle           all on the library except these
// Consumers: kit, stalle, townhall, vanbuuren, wolvendael, police, calevoet, stpierre, observatory, bridges.
// OFF lists consumers that stay on their own materials by default (a regression found in the review: see
// docs/TEXTURE_FACTORY.md "City switch").
const OFF = [];

export function libOn(consumer) {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("libmat") : null;
  if (q == null || q === "" || q === "1") return !OFF.includes(consumer);
  if (q === "0") return false;
  const list = q.split(",").map((s) => s.trim()).filter(Boolean);
  const neg = list.filter((s) => s.startsWith("-")).map((s) => s.slice(1));
  const pos = list.filter((s) => !s.startsWith("-"));
  if (pos.length) return pos.includes(consumer);
  return !neg.includes(consumer) && !OFF.includes(consumer);
}

/** THE ONE LINE helper: the library module path when `consumer` is on the library, else "temp" */
export function libSource(consumer, path) {
  return libOn(consumer) ? path : "temp";
}
