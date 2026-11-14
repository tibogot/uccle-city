// Is tile `name`'s far (lite) version in the scene? The heroes' updaters ask it every 30 frames for their home tiles;
// scene.getObjectByName(`${name}-lite`) walked the WHOLE scene graph each time a home tile was not loaded (~0.5-1 ms,
// 11 heroes: a > 0.5 ms frame every ~4 frames while driving, docs/perf/AUDIT.md "instance pools"). The viewer's own
// map of lite tiles (main.js `lite`, exposed as window.viewer.lite) answers at once; the walk stays as the fallback
// before the viewer is up.
export function liteShown(scene, name) {
  const L = typeof window !== "undefined" ? window.viewer?.lite : null;
  if (L && typeof L.has === "function") return L.has(name);
  return !!scene.getObjectByName(`${name}-lite`);
}
