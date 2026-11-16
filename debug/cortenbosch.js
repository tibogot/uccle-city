// The Cortenbosch / Lycée Français views for the before / after shots (docs/CORTENBOSCH.md):
//   const c = await import("/debug/cortenbosch.js"); await c.go("lane")      (then a screenshot)
//   c.audit()   the grounds' and the lane hedges' contact numbers (JOINS)
// Views: [camera x, z, height above the drawn ground, target x, z, target height above ground].
export const VIEWS = {
  campus: [-180, 1100, 140, -280, 1200, 0],
  front: [-291, 1120, 1.7, -306, 1160, 5],
  lane: [-104, 1010, 1.7, -146, 1036, 1.5],
  laneBack: [-150, 1036, 1.7, -95, 1004, 1.5],
  oldLane: [-256, 936, 1.7, -269, 920.6, 2.0],
  laneAir: [-60, 1090, 70, -150, 1000, 0],
  courts: [-272, 1180, 14, -232, 1202, 0],
  track: [-298, 1214, 26, -350, 1258, 0],
  entrance: [-300, 1135, 6, -318, 1170, 4],
};

export async function go(name, settle = 3500) {
  const v = window.viewer, hm = v.hm, c = v.camera, p = VIEWS[name];
  if (!p) throw new Error(`no view ${name}: ${Object.keys(VIEWS).join(", ")}`);
  for (const el of document.querySelectorAll("#hud, #umap-mini, #umap-toggle, #sound-toggle, #gplay, .play-btn")) el.style.display = "none";
  c.position.set(p[0], hm.surface(p[0], p[1]) + p[2], p[1]);
  v.controls.target.set(p[3], hm.surface(p[3], p[4]) + p[5], p[4]);
  c.lookAt(v.controls.target); v.controls.update();
  await new Promise((r) => setTimeout(r, settle));
  return { name, at: p };
}

/** the grounds mesh's lowest top vertex above the drawn ground, and the lane hedges' contact (cityGardens.contact) */
export function audit() {
  const out = {};
  for (const t of ["F6", "F7"]) out[t] = window.__gardens?.contact(t) ?? null;
  let g = null;
  window.viewer.scene.traverse((o) => { if (o.name === "grounds") g = g || []; if (o.name === "grounds") g.push(o); });
  out.grounds = (g || []).map((m) => ({ tris: m.geometry.index.count / 3, visible: m.visible }));
  return out;
}
