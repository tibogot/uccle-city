// WEATHERIZE: one material function every material calls (Ultra Dynamic Weather's idea; the physics from Lagarde's
// "Water drop" series, game-engine-v1's wetRoad.js and slop-newyork's road masks: docs/WEATHER_RESEARCH.md §1-2).
//
//   weatherize(material, { porosity, puddles, streaks, glass, beads, slush, litter, flowers, frost, snow, map })
//
// Takes a MeshStandardNodeMaterial whose colorNode / roughnessNode / normalNode / metalnessNode describe the DRY
// surface (or its plain color / roughness / metalness) and rewrites them for the weather in `wx` (weatherState.js):
//   WET       albedo darkens by porosity (pores fill with water: up to -60 %), roughness drops (a water film), a little
//             metalness so the city's SSR (viewer/post.js reads metalness) reflects; walls get less film than floors.
//             Dry where something is above (the overhead map: under parked cars, eaves) - the dry patch under a car.
//   PUDDLES   standing water where a "low spot" noise field is under the water level uPuddle (they grow and merge as
//             it rains, shrink as it dries): dark, mirror-smooth, flat normal + RIPPLES while it rains (rings in
//             jittered cells, after wetRoad.js), SSR via metalness.
//   STREAKS   rivulets running down vertical faces while it rains; GLASS: beads + running trails; BEADS: car paint.
//   SNOW      white cover on up-facing, exposed surfaces (normal.y + the overhead map + less under tree crowns), broken
//             up by noise as it starts (the crevices first, then the tops), sparkle as low-roughness facets in sparse
//             world-size cells that fade out before they get smaller than ~2 px (no dots, no crawling: the flicker
//             test), slush on roads when it melts.
//   SEASON    leaf litter (autumn, more under crowns), spring flowers in lawns, frost.
// Everything that has detail fades with the pixel footprint (fwidth of the world position) to its mean.
import { Fn, float, vec2, vec3, vec4, mix, smoothstep, clamp, max, min, floor, fract, sin, cos, abs, sqrt, dot, length, normalize, select,
  positionWorld, normalWorld, normalView, cameraViewMatrix, fwidth, uniform } from "three/tsl";
import { wx } from "./weatherState.js";
import { season } from "../seasons/season.js";
import { hash2D, noise2D, bumpNormal } from "../tslkit.js";

const H2 = (p) => hash2D(fract(p.div(1024)).mul(1024));        // cell hash, safe for big cell numbers
export const SNOW_ALBEDO = vec3(0.82, 0.85, 0.9);
export const wxLook = {
  uDarken: uniform(0.6),     // max albedo loss of a fully porous surface when soaked
  uSparkle: uniform(1.0),
  uRipple: uniform(1.0),
};

/** world-space direction -> view space */
const toView = (n) => normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);

/** Raindrop rings on still water, as a world xz slope (wetRoad.js idea: jittered cells, 3 x 3 neighbourhood). */
export const rippleSlope = Fn(([xz, t, fw]) => {
  const s = float(0.32);                                   // cell size (m)
  const g = xz.div(s), c0 = floor(g);
  const acc = vec2(0, 0).toVar();
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const c = c0.add(vec2(di, dj));
    const h = H2(c), h2 = H2(c.add(37.0));
    const ctr = c.add(vec2(h, h2).mul(0.8).add(0.1));
    const ph = fract(t.mul(h.mul(0.6).add(0.9)).add(h2.mul(7.0)));   // 0..1 life of this cell's ring
    const d = g.sub(ctr), r = length(d).mul(s);                         // metres from the impact
    const front = ph.mul(0.24);                                          // ring radius (m)
    const k = float(55.0);                                               // rad per metre (~11 cm wavelength)
    const env = float(1).sub(ph).pow(2).mul(smoothstep(0.0, 0.03, front.sub(r).add(0.03))).mul(smoothstep(front.add(0.05), front, r));
    const w = cos(r.sub(front).mul(k)).mul(env);
    acc.addAssign(d.div(max(length(d), 0.001)).mul(w));
  }
  // rings ~11 cm wavelength: gone before a ring is 3 px across (no crawl)
  return acc.mul(0.13).mul(float(1).sub(smoothstep(0.008, 0.025, fw))).mul(wx.uRain.mul(1.5).min(1)).mul(wxLook.uRipple);
});

/** Snow sparkle: a sparse set of cells whose facet is tilted at random; returns vec4(view normal tilt xyz, mask). */
export const glint = Fn(([p, fw]) => {
  const cs = float(0.018);                                  // 1.8 cm cells
  const g = p.div(cs), c = floor(g), f = fract(g).sub(0.5);
  const h = H2(c.xz.add(c.y.mul(17.0))), h2 = H2(c.xz.add(c.y.mul(5.0)).add(91.0)), h3 = H2(c.xz.add(c.y.mul(11.0)).add(13.0));
  const on = smoothstep(0.955, 0.965, h);                  // ~4 % of cells
  const disk = smoothstep(0.42, 0.18, length(f));          // soft round facet inside the cell (no hard square edge)
  // fade: full while a cell is >= 3 px, gone at <= 1.6 px
  const px = cs.div(max(fw, 1e-5));
  const fade = smoothstep(1.6, 3.0, px);
  const a = h2.mul(6.2832), tilt = h3.mul(0.18);   // small tilts: a facet that flashes the sun, not a dark speck in the diffuse
  const n = normalize(vec3(cos(a).mul(tilt), 1, sin(a).mul(tilt)));
  return vec4(n, on.mul(disk).mul(fade).mul(wxLook.uSparkle));
});

/** The snow cover mask at a world point for a given up-facing share / exposure (shared with the snow layer). */
// `ground` (optional, 0..1): where the surface's own texture holds snow longest (sett joints, the hollows between grass
// blades: 1) or loses it first (stone tops, blade tips: 0). While the snow is thin (< ~2.5 cm, cover < 1) the holes
// follow it instead of one blobby noise: the big noise drops to a gentle drift and the texture decides the edge.
export function snowMask(P, up, exposure, cover = wx.uSnowCover, upLo = 0.42, upHi = 0.78, ground = null) {
  const n = noise2D(P.xz.mul(2.7)).mul(0.6).add(noise2D(P.xz.mul(0.6)).mul(0.4));
  const cov = smoothstep(upLo, upHi, up).mul(exposure).mul(cover);
  if (!ground) return smoothstep(0.32, 0.5, cov.mul(1.45).sub(n.mul(0.45)));
  const thin = float(1).sub(smoothstep(0.75, 1.0, cover));
  const drift = noise2D(P.xz.mul(0.45)).mul(0.7).add(noise2D(P.xz.mul(1.9)).mul(0.3));    // large, soft drifts only
  const v = cov.mul(mix(float(1.45), float(1.3), thin)).sub(mix(n, drift, thin).mul(0.45)).add(float(ground).sub(0.5).mul(thin).mul(0.55));
  return smoothstep(mix(float(0.32), float(0.38), thin), mix(float(0.5), float(0.44), thin), v);
}

export function weatherize(m, o = {}) {
  // LITE (far tiles, ~0.1 ms): wet darkening + film roughness + SSR metalness + a one-octave snow cover; no puddles,
  // ripples, rivulets, beads, litter, flowers, sparkle or micro bump (they are sub-pixel past ~150 m anyway)
  if (o.lite) o = { porosity: o.porosity, map: o.map, snow: o.snow, slush: o.slush, road: o.road, edge: o.edge, lite: true };
  const map = o.map;
  const porosity = float(o.porosity ?? 0.5);
  const baseCol = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
  const baseRough = m.roughnessNode ?? float(m.roughness);
  const baseMetal = m.metalnessNode ?? float(m.metalness);
  const baseN = m.normalNode ?? normalView;
  const P = positionWorld, Nw = normalize(normalWorld), up = Nw.y;
  const fw = fwidth(P.x).add(fwidth(P.y)).add(fwidth(P.z)).mul(0.5).add(0.0002);
  // exposure (am I the topmost surface?) and shelter under crowns, from the overhead map
  let exposed = float(1), shelter = float(0);
  if (map) {
    const s = map.sample(P.xz);
    const inside = map.inside(P.xz);
    // topmost = fully exposed; under something HIGH above (an eave 3 m up, not a car roof 1 m up) the wind still
    // brings some snow and rain in (sills under a 40 cm overhang do whiten in photos)
    const gap = s.x.sub(P.y);
    exposed = select(inside, max(smoothstep(s.x.sub(0.3), s.x.sub(0.06), P.y), smoothstep(1.2, 4.0, gap).mul(0.65)), float(1));
    shelter = select(inside, s.y, float(0)).mul(season.uLeafDensity.mul(0.75).add(0.25));
  }
  const t = wx.uTime;
  const horiz = smoothstep(0.7, 0.95, up);                 // floors
  const vert = float(1).sub(smoothstep(0.3, 0.6, abs(up)));   // walls

  // ---- wet film: rain reaches floors that are exposed; walls take ~60 %, sheltered floors ~15 %
  const reach = mix(mix(float(0.15), float(1), exposed).mul(float(1).sub(shelter.mul(0.4))), float(0.6), vert);
  const wet = clamp(wx.uWet.mul(reach), 0, 1).toVar();
  // ROAD (o.road): salted / ploughed: the snow becomes melt water on the carriageway (wet black asphalt), kept as dirty
  // slush only along the kerbs (o.edge: 1 at the gutter) and in a thin band between the wheel paths
  let roadKeep = float(1);
  if (o.road) {
    const edge = o.edge ?? float(0);
    roadKeep = float(1).sub(wx.uSalt.mul(float(1).sub(edge.mul(0.85))));
    wet.assign(max(wet, wx.uSalt.mul(smoothstep(0.0, 0.3, wx.uSnowCover)).mul(0.6).mul(float(1).sub(edge.mul(0.5)))));
  }
  let col = baseCol.mul(float(1).sub(wet.mul(porosity).mul(wxLook.uDarken)));
  // a soaked porous surface also gets a touch more saturated (Lagarde: the water layer)
  let rough = mix(baseRough, baseRough.mul(0.3).add(0.06), wet.mul(mix(float(0.55), float(1), horiz)));
  let metal = mix(baseMetal, max(baseMetal, float(0.12)), wet.mul(horiz));
  if (o.road) { rough = mix(rough, max(rough, float(0.55)), wx.uSalt.mul(wx.uSnowCover.min(1))); metal = metal.mul(float(1).sub(wx.uSalt.mul(wx.uSnowCover.min(1)).mul(0.6))); }
  let nView = baseN;

  // ---- puddles
  let puddle = float(0);
  if (o.puddles) {
    const low = noise2D(P.xz.mul(0.31)).mul(0.55).add(noise2D(P.xz.mul(1.17).add(3.1)).mul(0.3)).add(noise2D(P.xz.mul(4.3).add(7.7)).mul(0.15));
    const level = wx.uPuddle.mul(0.5).add(o.puddleBias ?? float(0));
    const e = fwidth(low).add(0.004);
    puddle = smoothstep(level.add(e), level.sub(e), low).mul(horiz).mul(exposed).mul(wx.uPuddle.greaterThan(0.001).select(1, 0)).toVar();
    // rim: damp darker band round each puddle
    const rim = smoothstep(level.add(0.07), level, low).mul(horiz).mul(exposed).mul(wx.uPuddle.mul(4).min(1));
    col = col.mul(float(1).sub(rim.mul(0.25)));
    rough = mix(rough, rough.mul(0.6), rim);
    col = mix(col, col.mul(0.42), puddle);
    rough = mix(rough, float(0.025), puddle);
    metal = mix(metal, float(0.55), puddle);
    // ripple normals FILTERED for the reflection (polish 2026-11-11): the SSR pass traces at half resolution, so a
    // ripple slope that changes a lot between neighbouring pixels sends neighbouring rays to unrelated hits and the
    // near puddles blink under a sub-pixel move. dv = slope change per pixel (its screen footprint): where it is large
    // the slope fades to its mean (flat) and the lost variance goes into roughness (Toksvig / specular AA), so the SSR
    // blur widens instead of the rays scattering.
    const rs0 = rippleSlope(P.xz, t, fw);
    const dv = fwidth(rs0.x).add(fwidth(rs0.y));
    const keep = float(1).div(float(1).add(dv.mul(30.0).pow(2)));
    const rs = rs0.mul(keep);
    rough = mix(rough, min(sqrt(float(0.025 * 0.025).add(dv.mul(dv).mul(16.0)).add(rs0.dot(rs0).mul(0.1))), float(0.22)), puddle);
    const nW = normalize(vec3(rs.x.negate(), 1, rs.y.negate()));
    nView = normalize(mix(nView, toView(nW), puddle));
  }

  // ---- streaks down walls (rain running), glass beads + trails, car-paint beads
  if (o.streaks || o.glass) {
    const tang = normalize(vec2(Nw.z.negate(), Nw.x).add(vec2(1e-4, 0)));
    const a = dot(P.xz, tang);                              // metres along the wall
    const colW = float(o.glass ? 0.012 : 0.03);             // column width
    const ci = floor(a.div(colW)), cf = fract(a.div(colW)).sub(0.5);
    const hr = H2(vec2(ci, 3.0)), hs = H2(vec2(ci, 11.0));
    const speed = hr.mul(0.4).add(0.15);
    const run = fract(P.y.mul(o.glass ? 2.2 : 0.6).add(t.mul(speed)).add(hs.mul(10.0)));
    const line = smoothstep(0.32, 0.08, abs(cf)).mul(smoothstep(0.0, 0.5, run)).mul(smoothstep(1.0, 0.85, run)).mul(step01(hr, 0.55));
    const fade = float(1).sub(smoothstep(colW.mul(0.25), colW.mul(0.6), fw));
    const streak = line.mul(vert).mul(wx.uRain.mul(2).min(1)).mul(fade).toVar();
    if (o.glass) {
      // static beads: 1.2 cm cells, some with a drop
      const g = vec2(a, P.y).div(0.012), c = floor(g), f = fract(g).sub(0.5);
      const hb = H2(c.add(vec2(5.0, 9.0))), present = smoothstep(0.75, 0.74, hb.sub(wx.uWet.mul(0.4)).add(0.3));
      const rr = hb.mul(0.25).add(0.15);
      const bead = smoothstep(rr, rr.sub(0.08), length(f)).mul(present).mul(wx.uWet).mul(float(1).sub(smoothstep(0.003, 0.008, fw)));
      const drop = max(bead, streak);
      col = mix(col, col.mul(0.6).add(0.02), drop);
      // a bead is a little lens: its normal bulges out from its centre
      const bulge = vec3(f.x.mul(-1.6), 0, f.y.mul(-1.6)).mul(drop);
      nView = normalize(nView.add(cameraViewMatrix.mul(vec4(tang.x.mul(bulge.x), bulge.z, tang.y.mul(bulge.x), 0)).xyz));   // (unnormalised: 0 where no drop; normalize(0) = NaN)
    } else {
      col = col.mul(float(1).sub(streak.mul(0.25)));
      rough = mix(rough, float(0.12), streak);
      metal = mix(metal, float(0.1), streak);
    }
  }
  if (o.beads) {
    // car paint / non-porous: water beads up (no darkening, small dark dots that reflect)
    const g = P.xz.mul(1 / 0.01).add(P.y.mul(37.0)), c = floor(g), f = fract(g).sub(0.5);
    const hb = H2(c);
    const bead = smoothstep(0.32, 0.22, length(f)).mul(smoothstep(0.62, 0.6, hb)).mul(wet).mul(float(1).sub(smoothstep(0.0025, 0.006, fw)));
    rough = mix(rough, float(0.04), bead);
  }

  // ---- season: litter, flowers, frost (under the snow)
  if (o.litter) {
    const g = P.xz.div(0.07), c = floor(g), f = fract(g).sub(0.5);
    const h = H2(c), h2 = H2(c.add(19.0));
    const dens = season.uLitter.mul(shelter.mul(1.2).add(0.5)).mul(mix(float(0.5), float(1), noise2D(P.xz.mul(0.5))));
    const leaf = smoothstep(0.42, 0.3, length(f.mul(vec2(1, 1.6)))).mul(step01(dens, h)).mul(horiz);
    const far = smoothstep(0.004, 0.02, fw);                       // far: the leaves' mean colour
    const lc = mix(mix(vec3(0.32, 0.14, 0.02), vec3(0.42, 0.28, 0.03), h2), vec3(0.16, 0.07, 0.02), smoothstep(0.7, 1.0, h2));
    const cover = mix(leaf, dens.min(1).mul(0.55).mul(horiz), far);
    col = mix(col, lc.mul(float(1).sub(wet.mul(0.4))), cover);
    rough = mix(rough, float(0.8), cover.mul(float(1).sub(wet)));
  }
  if (o.flowers) {
    const g = P.xz.div(0.09), c = floor(g), f = fract(g).sub(0.5);
    const h = H2(c.add(41.0)), h2 = H2(c.add(77.0));
    const clump = smoothstep(0.45, 0.75, noise2D(P.xz.mul(0.9)));
    const on = step01(season.uFlowers.mul(clump).mul(0.35), h);
    const dot0 = smoothstep(0.22, 0.12, length(f)).mul(on).mul(float(1).sub(smoothstep(0.006, 0.02, fw)));
    const fc = select(h2.lessThan(0.45), vec3(0.85, 0.85, 0.8), select(h2.lessThan(0.75), vec3(0.75, 0.6, 0.05), vec3(0.35, 0.15, 0.55)));
    col = mix(col, fc, dot0.mul(horiz));
  }
  if (o.frost) {
    const fr = wx.uFrost.mul(smoothstep(0.2, 0.8, up)).mul(exposed).mul(float(1).sub(wx.uSnowCover));
    col = mix(col, vec3(0.55, 0.58, 0.62), fr.mul(0.55));
    rough = mix(rough, float(0.7), fr);
  }

  // ---- snow cover
  if (o.snow !== false) {
    if (o.lite) {
      const cov = smoothstep(0.42, 0.78, up).mul(exposed).mul(wx.uSnowCover);
      const sm = smoothstep(0.32, 0.5, cov.mul(1.45).sub(noise2D(P.xz.mul(0.6)).mul(0.45))).mul(roadKeep);
      col = mix(col, mix(SNOW_ALBEDO, vec3(0.42, 0.43, 0.44), (o.slush ? wx.uSlush : wx.uSlush.mul(0.35)).mul(0.8)), sm);
      rough = mix(rough, float(0.72), sm);
      metal = mix(metal, float(0), sm);
      m.colorNode = col; m.roughnessNode = clamp(rough, 0.02, 1); m.metalnessNode = clamp(metal, 0, 1); m.normalNode = nView;
      m.userData.weatherized = "lite";
      return m;
    }
    // snowUp: the up-facing range that holds snow (branches: a round limb holds a ridge from ~0.15 up)
    // o.ground: the texture that steers thin-snow holes: a node (1 = holds snow), or { lum: [lo, hi] } = from the dry
    // colour (dark joints / hollows hold it: luminance lo -> 1, hi -> 0), faded to 0.5 where the texture is sub-pixel
    let ground = null;
    if (o.ground?.isNode) ground = o.ground;
    else if (o.ground?.lum) {
      const Lc = dot(baseCol, vec3(0.2126, 0.7152, 0.0722));
      ground = mix(smoothstep(float(o.ground.lum[1]), float(o.ground.lum[0]), Lc), float(0.5), smoothstep(0.01, 0.06, fw));
    }
    const sm = snowMask(P, up, exposed.mul(float(1).sub(shelter.mul(0.6))), wx.uSnowCover, ...(o.snowUp ?? [0.42, 0.78]), ground).toVar();
    if (o.plaster) {
      // wind-driven snow plastered on the windward side of trunks and posts (the night photo, Av. Churchill 2024)
      const wn = wx.uWind.length();
      const windward = smoothstep(0.25, 0.75, dot(normalize(Nw.xz.add(vec2(1e-4, 0))), wx.uWind.div(max(wn, 0.01)).negate()));
      const pl = windward.mul(smoothstep(2.0, 8.0, wn)).mul(wx.uSnowCover).mul(vert);
      const n2 = noise2D(vec2(P.y.mul(3.0), dot(P.xz, vec2(7.0, 5.0))));
      sm.assign(max(sm, smoothstep(0.35, 0.6, pl.mul(1.3).sub(n2.mul(0.5)))));
    }
    // slush: melting snow on roads / pavements turns grey, wet and patchy
    sm.mulAssign(roadKeep);
    if (o.track) {   // thin snow: packed tracks show the ground (wheel lines, footprints)
      const thin = float(1).sub(smoothstep(0.02, 0.06, wx.uSnowDepth));
      sm.mulAssign(float(1).sub(smoothstep(0.35, 0.75, o.track(P.xz)).mul(thin).mul(horiz)));
    }
    // what is left on a salted road is old, dirty slush (grey-brown), whatever the melt state
    const slush = o.slush ? max(wx.uSlush, o.road ? wx.uSalt.mul(0.85) : float(0)) : wx.uSlush.mul(0.35);
    const sCol = mix(SNOW_ALBEDO, vec3(0.36, 0.35, 0.33), slush.mul(0.85));
    const gl = glint(P, fw);
    const sRough = mix(mix(float(0.72), float(0.12), gl.w), float(0.22), slush);
    const bumpH = noise2D(P.xz.mul(9.0)).mul(0.006).mul(float(1).sub(smoothstep(0.004, 0.02, fw)));
    const sN = normalize(mix(bumpNormal(bumpH), toView(gl.xyz), gl.w));
    col = mix(col, sCol, sm);
    rough = mix(rough, sRough, sm);
    metal = mix(metal, mix(float(0), float(0.25), slush), sm);
    nView = normalize(mix(nView, sN, sm));
  }
  m.colorNode = col;
  m.roughnessNode = clamp(rough, 0.02, 1);
  m.metalnessNode = clamp(metal, 0, 1);
  m.normalNode = nView;
  m.userData.weatherized = true;
  return m;
}

/** step(edge, x) as a soft 0..1 (a hash below a threshold) */
function step01(threshold, h) { const hh = float(h); return smoothstep(hh.sub(0.0001), hh.add(0.0001), float(threshold)); }
