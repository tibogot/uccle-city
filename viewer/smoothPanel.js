// Dev panel folder "Smoothness" (docs/SMOOTH_LOD.md): the smooth-LOD tunables, live. Kept in its own file so the
// dev panel (viewer/devPanel.js) only calls addSmoothnessFolder(gui, ctx).
import { SMOOTH } from "./lodFade.js";
import { IMP } from "./impostors.js";
import { shadowFade } from "./lighting.js";

export function addSmoothnessFolder(gui, { lighting, fader }) {
  const f = gui.addFolder("Smoothness");
  if (!SMOOTH) { f.add({ s: "off (?smooth=0)" }, "s").name("smooth LOD"); f.close(); return f; }
  const trees = () => window.__stylizedTrees || [];
  const P0 = trees()[0]?.params || {};
  const S = {
    lodDist: P0.lodDist ?? 40, morph1: P0.morph1 ?? 14, farDist: P0.farDist ?? 120, morph2: P0.morph2 ?? 40,
    impStart: IMP.start.value, impBand: IMP.band.value, impEnd: IMP.end.value, impEndBand: IMP.endBand.value,
    shBand: shadowFade.uBand.value, shTau: shadowFade.tau, tileFade: fader?.seconds ?? 0.9,
    shadowBox: "", treeStats: "",
  };
  const setTrees = (k, v) => { for (const t of trees()) t.params[k] = v; };
  f.add(S, "lodDist", 15, 120, 1).name("trees LOD 0→1 (m)").onChange((v) => setTrees("lodDist", v));
  f.add(S, "morph1", 0, 40, 1).name("  morph band (m)").onChange((v) => setTrees("morph1", v));
  f.add(S, "farDist", 60, 300, 1).name("trees LOD 1→2 (m)").onChange((v) => setTrees("farDist", v));
  f.add(S, "morph2", 0, 100, 1).name("  morph band (m)").onChange((v) => setTrees("morph2", v));
  f.add(S, "impStart", 150, 900, 5).name("LOD 2 → impostors (m)").onChange((v) => { IMP.start.value = v; });
  f.add(S, "impBand", 0, 150, 1).name("  cross-fade band (m)").onChange((v) => { IMP.band.value = v; });
  f.add(S, "impEnd", 800, 3000, 10).name("impostors end (m)").onChange((v) => { IMP.end.value = v; });
  f.add(S, "impEndBand", 0, 800, 10).name("  fade-out band (m)").onChange((v) => { IMP.endBand.value = v; });
  f.add(S, "shBand", 0, 0.6, 0.01).name("shadow edge fade (share)").onChange((v) => { shadowFade.uBand.value = v; });
  f.add(S, "shTau", 0, 2, 0.05).name("shadow range lag (s)").onChange((v) => { shadowFade.tau = v; });
  f.add(S, "tileFade", 0, 3, 0.05).name("tile cross-fade (s)").onChange((v) => { if (fader) fader.seconds = v; });
  f.add(S, "shadowBox").name("shadow box / fade").listen();
  f.add(S, "treeStats").name("trees drawn").listen();
  setInterval(() => {
    S.shadowBox = lighting.boxHalf ? `±${lighting.boxHalf} m, fade ${lighting.fadeHalf.toFixed(0)} m, texel ${(2 * lighting.boxHalf / 4096 * 100).toFixed(1)} cm` : "-";
    let n = 0, tris = 0;
    for (const t of trees()) { if (!t.group.parent) continue; const s = t.stats(); n += s.trees; tris += s.tris; }
    S.treeStats = `${(tris / 1000).toFixed(0)}k triangles (${n} trees loaded)`;
  }, 500);
  f.close();
  return f;
}
