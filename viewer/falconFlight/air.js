// THE AIR over Saint-Job (Falcon Flight Lab): the wind with height and gusts, thermals over sunny open ground, and the
// updrafts where the wind meets façades and slopes. Pure JS; sample(x, y, z, t, out) is what the flight model feels.
//
//   wind      a uniform wind (speed at 10 m, FROM direction like a weather report), a log profile with the city's
//             roughness (z0 = 1 m: twice the 10 m speed at 100 m, capped at 2.4x), gusts: three incommensurate sines on
//             the speed and the direction with a spatial phase (a bird crossing the town feels bumps, not one global
//             pulse). setWeatherWind(uWind) takes the weather lab's uniform (branch claude/weather,
//             viewer/weather/weatherState.js: a Vector2, world xz, the direction the air MOVES to).
//   thermals  sources = the open, sunny ground the lab gives (the Place de Saint-Job's setts, parks, pitches, grass,
//             a playground), each cycling (a column builds over ~40 s, lives 3-6 min, rests 1-2 min); the core speed from
//             the sun's elevation, the cloud and the surface; the core radius grows with height, a weak ring of sink
//             around it, the column leans downwind (a bubble rising at w drifts U h / w), fading toward the top of the
//             mixed layer (Allen 2006, NASA Dryden: docs/FALCON_FLIGHT_RESEARCH.md).
//   updrafts  w = k U . grad(h) on the city's obstacle field (max(DTM, roofs), smoothed over ~12 m: a row of façades
//             across the wind is a ridge), strongest just above the windward edge, fading over ~25 m of height; the
//             lee side sinks (40 % of it).
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class AirField {
  /**
   * grid: { data: Float32Array (smoothed obstacle height, m TAW), nx, nz, x0, z0, step } (cityWorld.js liftGrid)
   * floor(x, z): the solid under a point (for the wind's height above ground)
   * sources: [{ x, z, ground, heat (0..1 surface factor), name }]
   */
  constructor({ grid = null, floor = () => 0, sources = [] } = {}) {
    this.grid = grid; this.floor = floor;
    this.params = { wind: 4, windFrom: 240, gust: 0.35, turbulence: 0.5, thermals: 1, ridge: 1, sunElev: 45, cloud: 0.2, zi: 900 };
    this.U = { x: 0, z: 0 };                       // the 10 m wind (moving to), m/s
    this.thermals = sources.map((s, i) => ({ ...s, i, phase: (i * 0.37) % 1, life: 240 + ((i * 97) % 180), rest: 60 + ((i * 53) % 60), w: 0, env: 0, R0: s.radius ?? 18 }));
    this.weather = null;
    this.setWind();
  }

  /** the wind from the params (FROM direction, deg: 0 = from the north, i.e. blowing toward +z) */
  setWind(speed = this.params.wind, from = this.params.windFrom) {
    this.params.wind = speed; this.params.windFrom = from;
    const a = from * Math.PI / 180;
    this.U.x = -Math.sin(a) * speed; this.U.z = Math.cos(a) * speed;
  }
  /** hook for the weather lab: its uWind uniform (or any {x, y} = world x, z, moving to); null = our own wind */
  setWeatherWind(uWind) { this.weather = uWind; }

  /** the sun's heating, 0..1 (elevation in degrees, cloud 0..1) */
  get sun() { const e = this.params.sunElev; return clamp(Math.sin(Math.max(0, e) * Math.PI / 180), 0, 1) ** 1.3 * (1 - 0.75 * this.params.cloud); }

  /** advance the thermals' life cycles (t: seconds) */
  update(t) {
    if (this.weather) { const v = this.weather.value ?? this.weather; this.U.x = v.x; this.U.z = v.y; }
    const sun = this.sun, P = this.params;
    for (const th of this.thermals) {
      const period = th.life + th.rest, s = ((t / period + th.phase) % 1) * period;
      th.env = s < th.life ? smooth(s, 0, 40) * (1 - smooth(s, th.life - 45, th.life)) : 0;
      th.w = 3.4 * th.heat * sun * th.env * P.thermals;          // core updraft, m/s
      th.top = P.zi * (0.45 + 0.55 * sun);
      th.climb = Math.max(th.w, 0.8);
    }
    this._t = t;
  }

  /** centre of a thermal column at height y (leaning downwind), and its radius there */
  thermalCentre(th, y, out = { x: 0, z: 0, R: 0 }) {
    const h = Math.max(0, y - th.ground);
    const lean = Math.min(h / th.climb, 120);               // seconds a bubble took to rise this far (capped)
    out.x = th.x + this.U.x * lean * this.windFactor(h); out.z = th.z + this.U.z * lean * this.windFactor(h);
    out.R = th.R0 + 0.07 * h;
    return out;
  }

  /** the log wind profile: speed factor at h m above the ground (1 at 10 m, z0 = 1 m) */
  windFactor(h) { return clamp(Math.log(Math.max(h, 1.5)) / Math.log(10), 0.25, 2.4); }

  /** smoothed obstacle height (bilinear) */
  hs(x, z) {
    const g = this.grid; if (!g) return 0;
    const fx = clamp((x - g.x0) / g.step, 0, g.nx - 1.001), fz = clamp((z - g.z0) / g.step, 0, g.nz - 1.001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, d = g.data, k = j * g.nx + i;
    return (d[k] * (1 - u) + d[k + 1] * u) * (1 - v) + (d[k + g.nx] * (1 - u) + d[k + g.nx + 1] * u) * v;
  }

  /** the vertical air from the wind against the obstacles here (m/s; < 0 in the lee) */
  ridgeLift(x, y, z, Ux, Uz) {
    if (!this.grid || !this.params.ridge) return 0;
    const e = this.grid.step;
    const gx = (this.hs(x + e, z) - this.hs(x - e, z)) / (2 * e), gz = (this.hs(x, z + e) - this.hs(x, z - e)) / (2 * e);
    const dz = y - this.hs(x, z);
    if (dz < -2) return 0;                                   // inside / below the smoothed obstacle: no lift
    let w = 0.85 * (Ux * gx + Uz * gz);
    if (w < 0) w *= 0.4;
    return w * Math.exp(-Math.max(0, dz) / 25) * this.params.ridge;
  }

  sample(x, y, z, t, out) {
    const P = this.params, fl = this.floor(x, z), h = Math.max(0, y - fl);
    // gusts: speed and direction wobble with time and place
    const ph = x * 0.011 + z * 0.017;
    const g = P.gust * (0.55 * Math.sin(0.29 * t + ph) + 0.3 * Math.sin(0.71 * t + 1.7 * ph + 1.3) + 0.15 * Math.sin(1.93 * t + 3.1 * ph + 0.4));
    const turn = P.gust * 0.25 * Math.sin(0.17 * t + 0.7 * ph + 2.1);
    const k = this.windFactor(h) * (1 + g), c = Math.cos(turn), s = Math.sin(turn);
    const Ux = this.U.x * k, Uz = this.U.z * k;
    out.x = Ux * c - Uz * s; out.z = Ux * s + Uz * c;
    // turbulence: a little vertical churn near the roofs (fades with height)
    let wy = P.turbulence * (0.6 * Math.sin(1.3 * t + 2.3 * ph) + 0.4 * Math.sin(2.9 * t - 1.9 * ph)) * (0.3 + 0.7 * Math.exp(-h / 60)) * (Math.hypot(this.U.x, this.U.z) / 5);
    // updrafts off façades and slopes
    wy += this.ridgeLift(x, y, z, out.x, out.z);
    // thermals
    if (P.thermals > 0) for (const th of this.thermals) {
      if (th.w <= 0.02 || y > th.top || y < th.ground) continue;
      const C = this.thermalCentre(th, y, _c);
      const r = Math.hypot(x - C.x, z - C.z);
      if (r > 3.2 * C.R) continue;
      const q = r / C.R, prof = smooth(y - th.ground, 0, 35) * (1 - smooth(y, th.top * 0.75, th.top));
      wy += th.w * prof * (Math.exp(-q * q) - 0.22 * Math.exp(-((q - 1.9) ** 2) / 0.5));
    }
    out.y = wy;
    return out;
  }

  /** the strongest thermal core near a point (for the HUD / the circling birds) */
  nearestThermal(x, y, z) {
    let best = null, bd = Infinity;
    for (const th of this.thermals) {
      if (th.w < 0.3) continue;
      const C = this.thermalCentre(th, Math.max(y, th.ground + 40), _c2), d = Math.hypot(x - C.x, z - C.z);
      if (d < bd) { bd = d; best = th; }
    }
    return best ? { th: best, d: bd } : null;
  }
}
const _c = { x: 0, z: 0, R: 0 }, _c2 = { x: 0, z: 0, R: 0 };
