// GPU A/B of the building types' WALL SHADER in one page (docs/STYLES.md): the generic wall material of before
// (facades.js with STYLES_OLD forced, a second module instance) swapped live with today's on every plain wall mesh.
// The geometry (balconies, canopies, the kit's choices) stays today's: this measures the shader alone.
//   const S = await import("/debug/stylesAB.js"); await S.ab({ rounds: 4 })   (camera held by debug/featureAB.js at())
import * as A from "/debug/featureAB.js";
let oldMat = null;
const walls = () => { const out = []; window.viewer.scene.traverse((o) => { if (o.isMesh && o.name === "buildings-walls") out.push(o); }); return out; };
export async function prepare() {
  if (oldMat) return oldMat;
  globalThis.__stylesOldForce = true;
  const F = await import("/viewer/facades.js?stylesold");
  globalThis.__stylesOldForce = false;
  oldMat = F.wallMaterial(); oldMat.userData.shared = true;
  return oldMat;
}
export async function ab({ rounds = 4, settle = 1.5, seconds = 3 } = {}) {
  const om = await prepare(), W = walls(), newMat = W[0].material;
  const setM = (m) => async () => { for (const w of walls()) w.material = m; };
  await setM(om)(); await new Promise((r) => setTimeout(r, 4000));      // compile the old one
  const r = await A.live(setM(om), setM(newMat), { rounds, settle, seconds });
  return { ...r, note: "A = old wall shader, B = styles wall shader", meshes: W.length };
}
