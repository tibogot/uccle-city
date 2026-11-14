// roofs (docs/assets/ROOFS.md): fixed before / after views of building tops. In the city tab:
//   const R = await import("/debug/roofShots.js"); await R.view("stjob_air")   -> then take a screenshot of the page
// Views: aerial (falcon height, ~60-120 m) and street level over the districts the owner flew over.
export const VIEWS = {
  // Saint-Job (I6): the terraces round the square, from the falcon's height
  stjob_air: { pos: [1080, 75, 610], target: [1150, 0, 540] },
  stjob_street: { pos: [1118, 1.7, 566], target: [1160, 10, 520] },
  // Uccle-Centre / Globe (J6 Ch. d'Alsemberg / Ch. de Waterloo): flat-roofed blocks
  globe_air: { pos: [1650, 80, 820], target: [1720, 0, 760] },
  // Vanderkindere / Brugmann (H1 / G2): apartment blocks
  brugmann_air: { pos: [700, 90, -1300], target: [780, 0, -1380] },
  // De Fre (I3)
  defre_air: { pos: [1200, 90, -650], target: [1280, 0, -720] },
  // Calevoet (D6 / D7)
  calevoet_air: { pos: [-1150, 80, 900], target: [-1220, 0, 820] },
};

const hud = (on) => document.querySelectorAll("body > div, body > details, #panel").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = on ? "" : "hidden"; });

/** put the orbit camera at a named view (or { pos, target } with pos[1] / target[1] metres above the ground) */
export async function view(v, { frames = 40, hideHud = true } = {}) {
  const V = typeof v === "string" ? VIEWS[v] : v;
  const viewer = window.viewer, hm = viewer.hm, c = viewer.controls, cam = viewer.camera;
  const gy = (x, z) => { try { return hm.surface(x, z); } catch { return 0; } };
  const pos = [V.pos[0], gy(V.pos[0], V.pos[2]) + V.pos[1], V.pos[2]];
  const tgt = [V.target[0], gy(V.target[0], V.target[2]) + V.target[1], V.target[2]];
  viewer.setView("overview");
  c.target.set(...tgt); cam.position.set(...pos); c.update(); cam.lookAt(...tgt); cam.updateMatrixWorld(true);
  if (hideHud) hud(false);
  for (let i = 0; i < frames; i++) await new Promise((r) => requestAnimationFrame(r));
  return { pos, tgt };
}
export const showHud = () => hud(true);
