// BOOT GATE (docs/BOOT.md, boot2 2026-11-15): what the first view does not need waits until the cover has lifted.
// The landmarks and the hero rail bridges used to download (25-30 MB: GLBs + AO maps), decode and compile during the
// boot wherever they stand in Uccle; only those on the start tile's ring can be on screen when the cover lifts (the
// ring is all the boot loads, as far tiles; the rest of the far LOD streams in after). The far ones now start after the
// reveal, one every STAGGER ms (their shaders still compile in the background through the precompile queue, before
// they are shown: nothing appears half-built, nothing builds on a frame).
//   ?bootdefer=1: on. OFF BY DEFAULT (measured 2026-11-15, docs/BOOT.md): 37 MB less before the cover and ~130 fewer
//   pipelines, but the cover time did not move beyond the machine's noise, and the deferred models' processing landed
//   in the first seconds after the reveal (long tasks after the cover 0.6-0.7 s -> 3.0-3.8 s, one 2.2 s): worse to play.
const params = new URLSearchParams(location.search);
// boot3 (docs/BOOT.md section 5): ON BY DEFAULT now (?bootdefer=0 = everything under the cover, as before). With the
// boot warm-up no longer waiting for the far models' compiles (warmup.js bootQuiet) and the other boot3 changes, the cover
// is 13.0-13.3 s vs 20-22 s (docs/BOOT.md section 5); the deferred models' processing after the reveal: ~1.2 s of long
// tasks in the first 20 s, the longest 0.55-0.68 s (the first model's GLB parse + build: fix in the landmark loaders).
export const BOOT_DEFER = params.get("bootdefer") !== "0";
const STAGGER = 600;

// where each gated model stands (city metres x, z: models/<name>/<name>.json placement.city_local_position)
export const GATED = {
  augustin: [-896, -1961], calevoet: [-1225, 790], heros: [-533, -484], observatory: [654, 60], police: [-514, -340],
  rosaire: [1279, -1254], sacrecoeur: [-264, -1631], saintmarc: [454, -620], russian: [-354, -468], stalle: [-1150, 57], stpierre: [-709, -493], townhall: [-1148, -506],
  vanbuuren: [303, -1230], wolvendael: [-469, -366],
  // the hero rail bridges / road tunnels (models/rail/<name>.json)
  bigarreaux: [-1106, 1636], "rail:calevoet": [-1125, 1123], engeland: [-691, 1795], engeland_chord: [-701, 1787],
  kauwberg: [273, 869], linkebeek: [-1328, 2304], ruestalle: [-1489, 276], "rail:stjob": [417, 791], verrewinkel: [-269, 1308],
  tunnel_brasserie: [-1474, 2403], tunnel_kleindal: [-662, 2867],
};

let start = null, lifted = false, liftResolve = null, queued = 0;
const liftP = new Promise((r) => { liftResolve = r; });

/** main.js, before the landmarks start: the start tile's bounds (city metres) and the ring the boot loads (tiles) */
export function setBootStart(bounds, ring) {
  const T = bounds.x1 - bounds.x0;
  start = { x0: bounds.x0 - ring * T, x1: bounds.x1 + ring * T, z0: bounds.z0 - ring * T, z1: bounds.z1 + ring * T };
}
/** main.js, when the cover lifts */
export function coverLifted() { lifted = true; liftResolve(); }
export const afterCover = () => liftP;

/** resolves at once for a model inside the boot's ring (or without the gate), else after the cover lifted, staggered;
 *  `id` is a GATED key (unknown ids are not gated) */
export function whenNeeded(id) {
  const p = GATED[id];
  if (!BOOT_DEFER || !start || lifted || !p) return Promise.resolve();
  const margin = 150;                       // a model straddling the ring's edge counts as inside
  if (p[0] > start.x0 - margin && p[0] < start.x1 + margin && p[1] > start.z0 - margin && p[1] < start.z1 + margin) return Promise.resolve();
  const k = queued++;
  return liftP.then(() => new Promise((r) => setTimeout(r, 400 + k * STAGGER)));
}

// boot3 (docs/BOOT.md section 5): which precompile jobs the FIRST VIEW needs (warmup.js warmBoot / bootQuiet): a job whose
// root is a gated model OUTSIDE the boot's ring (+ margin) cannot be on screen at the reveal (its home tile is not
// loaded); models in the ring are needed, the public art when a piece is within its drawing range of the reveal's camera
// (revealCheck); roots of other names (the
// weather's draws, the falcon mode, a bridge's fading copies, generic groups) are not (the tiles' jobs, queued `first`,
// always are: warmup.js bootQuiet).
const ROOT_KEY = (n) => (n.startsWith("bridge-") ? n.slice(7).replace(/-lod\d+$/, "") : n.startsWith("tunnel-") ? `tunnel_${n.slice(7)}` : n);
const checks = new Map();
let revealCam = null;
/** a model spread over the city (the public art) says itself whether the first view can show it: fn(x, z) of the camera */
export function revealCheck(name, fn) { checks.set(name, fn); }
/** main.js, before the boot warm-up: the camera the cover lifts on (city metres) */
export function setRevealCamera(x, z) { revealCam = [x, z]; }
export function neededAtReveal(names) {
  if (!start) return true;
  return names.some((n) => {
    if (checks.has(n)) return !revealCam || checks.get(n)(revealCam[0], revealCam[1]);
    let k = ROOT_KEY(String(n || ""));
    if ((k === "stjob" || k === "calevoet") && String(n).startsWith("bridge-")) k = `rail:${k}`;
    const p = GATED[k];
    if (!p) return false;
    const margin = 150;
    return p[0] > start.x0 - margin && p[0] < start.x1 + margin && p[1] > start.z0 - margin && p[1] < start.z1 + margin;
  });
}
