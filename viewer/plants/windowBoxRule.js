// WHICH SILLS GET A WINDOW BOX (viewer/plants/cityPlants.js, the façade kit's `sill` pieces: STRIDE 14 floats each):
// the rule alone, pure JS, so others can read it without building the plants: the falcon's perches (viewer/falconFlight/
// cityGymWorld.js) leave those sills out (a falcon stood hidden in the geraniums, browser 2026-11-25).
export const h01 = (x, z, salt = 0) => {
  let h = Math.imul(Math.floor(x * 100) | 0, 73856093) ^ Math.imul(Math.floor(z * 100) | 0, 19349663) ^ Math.imul(salt + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** the sill at offset o of the kit's sill array S gets a window box */
export function sillHasBox(S, o) {
  const x = S[o], y = S[o + 1], z = S[o + 2], seed = S[o + 8], base = S[o + 12], F3 = S[o + 13];
  const maitre = F3 >= 1023.5, floor = Math.round((y - base) / 3.1);
  if (h01(seed * 1000, 0.5, 61) > (maitre ? 0.3 : 0.09) || floor > 2) return false;
  return h01(x, z, 62) <= (floor === 0 ? 0.6 : 0.85);
}
