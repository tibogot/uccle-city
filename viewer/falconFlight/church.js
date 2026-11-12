// THE SAINT-JOB CHURCH as the falcon flight sees it: a height proxy (the tower and spire, the dome and lantern, the eight
// wings, from stjob.json's measurements) and the Place de Saint-Job. Shared by the lab's city (cityWorld.js) and the
// city's streaming adapter (cityStream.js); no imports, so the city can load it without the lab's loaders.
export const PLACE = { x: 1153.1, z: 540.1 };           // Place de Saint-Job (viewer/main.js walk start on I6)

/** Saint-Job's height (m above its floor) in the church frame: a copy of viewer/falcons.js churchTop (private there;
 *  copied read-only, keep the two in step): the tower and spire, the dome and lantern, the eight wings. */
const TOWER = [-13.456, -13.456], DOME = [[10.05, 23.2], [9.0, 25.9], [7.0, 30.1], [5.0, 32.2], [3.0, 33.3], [2.2, 33.6]];
export function churchTop(x, z) {
  let h = -100;
  const tx = x - TOWER[0], tz = z - TOWER[1];
  const tr = Math.max(Math.abs(tx + tz), Math.abs(tx - tz)) / Math.SQRT2;
  if (tr < 4.9) h = 29.4;
  const rs = Math.hypot(tx, tz);
  if (rs < 4.7) h = Math.max(h, 29.4 + 4 + (54.85 - 33.4) * (1 - rs / 4.7) + 4.6 * (rs < 0.6 ? 1 : 0));
  const r = Math.hypot(x, z);
  if (r < 10.3) {
    let d = 23.2;
    for (let i = 0; i < DOME.length - 1; i++) if (r <= DOME[i][0] && r >= DOME[i + 1][0]) d = DOME[i + 1][1] + (DOME[i][1] - DOME[i + 1][1]) * (r - DOME[i + 1][0]) / (DOME[i][0] - DOME[i + 1][0]);
    if (r < 2.2) d = 43.1;
    h = Math.max(h, d);
  }
  if (r < 25.6) {
    const a = Math.atan2(x, -z), k = Math.round(a / (Math.PI / 4)), off = Math.abs(Math.sin(a - k * Math.PI / 4)) * r;
    if (off < 4.6) h = Math.max(h, 14.7);
  }
  return h;
}
