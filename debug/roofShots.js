// roofs (docs/assets/ROOFS.md): fixed before / after views of building tops. In the city tab:
//   const R = await import("/debug/roofShots.js"); await R.view("stjob_air")   -> then take a screenshot of the page
// Views: aerial (falcon height, ~60-120 m) and street level over the districts the owner flew over.
export const VIEWS = {
  // Saint-Job (I6): the square and its terraces from the falcon's height; the terraces along Montagne de Saint-Job; the
  // square at eye height
  stjob_air: { tile: "I6", pos: [1110, 45, 600], target: [1150, 0, 550] },
  stjob_terr: { tile: "I6", pos: [1020, 55, 700], target: [1075, 0, 640] },
  stjob_street: { tile: "I6", pos: [1150, 1.7, 548], target: [1105, 1.6, 505] },
  // Avenue Montjoie / Brugmann (H2): the 1950s blocks
  brugmann_air: { tile: "H2", pos: [690, 60, -1130], target: [750, 0, -1210] },
  brugmann_close: { tile: "H2", pos: [715, 58, -1170], target: [745, 28, -1200] },
  // De Fre (I3): the tall blocks
  defre_air: { tile: "I3", pos: [1320, 80, -640], target: [1384, 0, -709] },
  // Vanderkindere (H1): terraces
  vdk_air: { tile: "H1", pos: [470, 55, -1560], target: [529, 0, -1612] },
  // Uccle-Centre (F5)
  centre_air: { tile: "F5", pos: [-410, 55, 300], target: [-353, 0, 245] },
  // Calevoet (D6): the flat-roofed blocks off the Chaussee d'Alsemberg
  calevoet_air: { tile: "D6", pos: [-1150, 70, 960], target: [-1091, 0, 899] },
  // Fort-Jaco (L8): villas
  fortjaco_air: { tile: "K7", pos: [2100, 55, 1080], target: [2150, 0, 1010] },
};

const hud = (on) => document.querySelectorAll("body > div, body > details, #panel").forEach((d) => { if (!d.querySelector("canvas")) d.style.visibility = on ? "" : "hidden"; });

/** put the orbit camera at a named view (or { pos, target } with pos[1] / target[1] metres above the ground) */
export async function view(v, { frames = 40, hideHud = true } = {}) {
  const V = typeof v === "string" ? VIEWS[v] : v;
  const viewer = window.viewer, hm = viewer.hm, c = viewer.controls, cam = viewer.camera;
  const gy = (x, z) => { try { const t = viewer.world?.at?.(x, z); return (t?.hm || hm).surface(x, z); } catch { return 0; } };
  const pos = [V.pos[0], gy(V.pos[0], V.pos[2]) + V.pos[1], V.pos[2]];
  const tgt = [V.target[0], gy(V.target[0], V.target[2]) + V.target[1], V.target[2]];
  viewer.setView("overview");
  c.target.set(...tgt); cam.position.set(...pos); c.update(); cam.lookAt(...tgt); cam.updateMatrixWorld(true);
  if (hideHud) hud(false);
  for (let i = 0; i < frames; i++) await new Promise((r) => requestAnimationFrame(r));
  return { pos, tgt };
}
export const showHud = () => hud(true);
