// SQUARE DES HEROS: the fixed views of docs/landmarks/HEROS.md (before / after shots, the reference comparison).
//   const h = await import("/debug/herosViews.js"); await h.shot("steps")   -> PNG data URL (debug/shots.js: HUD hidden)
// p / t: city x, height over the drawn ground (world.ground), z.
export const VIEWS = {
  aerial: { p: [-490, 55, -548], t: [-533, 0, -487], fov: 50 },                 // from the north-east, over the Square des Heros street
  top: { p: [-532, 150, -487.9], t: [-532, 0, -488], fov: 45 },
  steps: { p: [-530.0, 1.7, -467.2], t: [-533.0, 6.5, -484], fov: 55 },          // Commons "Square Heros Bxl 01": the foot of the 12 steps
  defre: { p: [-505, 1.7, -452], t: [-533, 3.5, -484], fov: 60 },               // Commons 2025-11-05: Avenue De Fre, the south-east corner
  brugmann: { p: [-566.5, 1.7, -497], t: [-533, 3.5, -484], fov: 55 },            // the Avenue Brugmann side (west), by the tram platforms
  herosst: { p: [-512, 1.7, -509], t: [-533, 3.5, -484], fov: 55 },              // the Square des Heros street (north-east), under the limes
  tram: { p: [-548, 1.7, -530], t: [-565, 1.0, -488], fov: 60 },                 // the tram stop Heros, along the platforms
  enclosure: { p: [-528.5, 1.6, -479.0], t: [-533, 1.5, -484], fov: 60 },         // heritage.uccle.be IMG_0040: the benches
};
export async function shot(name) {
  const s = await import("/debug/shots.js");
  viewer.controls.maxPolarAngle = Math.PI;          // a view from below (the foot of the steps) must not be lifted by the orbit limit
  const v = VIEWS[name], g = (x, z) => viewer.world.ground(x, z);
  return await s.shot({ pos: [v.p[0], g(v.p[0], v.p[2]) + v.p[1], v.p[2]], target: [v.t[0], g(v.t[0], v.t[2]) + v.t[1], v.t[2]], fov: v.fov });
}
