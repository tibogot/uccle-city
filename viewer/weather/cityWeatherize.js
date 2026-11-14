// WEATHERIZE FOR THE CITY: the weather lab's weatherize() (surfaceWeather.js: wet darkening, film, puddles + ripples,
// rivulets, glass / paint beads, snow cover with sparkle, slush on salted roads, frost) as a UNIFORM-GATED layer:
//
//   wxMat(material, opts)        call in a material factory, before addLampLight(); a no-op under ?weather=old
//
// Every material is compiled ONCE, at boot, with the weather in it; switching the weather only moves uniforms (no
// pipeline is ever rebuilt). In clear weather (wx.uOn = 0) the whole layer sits behind one `if` on a uniform: the GPU
// skips it (a uniform branch: no divergence), so a dry city costs ~nothing.
//
// How the gate stays safe in TSL (three r187): code built for the first time INSIDE an If block is emitted there,
// so a shared node (normalView, positionView, a material's own vars) first touched in the branch would be out of
// scope - or never assigned - outside it. So:
//   - every input the branch reads is SNAPSHOT at the top of the function first (the material's dry colour /
//     roughness / metalness, positionWorld, the GEOMETRY normals, caller nodes like o.edge): .toVar() at top level;
//   - the branch never reads normalView / normalWorld (the material's own normal: that would pull the NORMAL
//     sub-build into the branch); it uses normalWorldGeometry / normalViewGeometry snapshots and its own bump;
//   - colour, roughness and metalness come out of ONE function (vars declared at its top, assigned in the branch);
//     the normal has its own gated function (the NORMAL sub-build is built elsewhere), recomputing only the masks
//     the normal needs (puddles, snow, glass beads).
import * as THREE from "three/webgpu";
import { Fn, If, float, vec2, vec3, vec4, mix, smoothstep, clamp, max, min, floor, fract, abs, sqrt, dot, length, normalize, select,
  positionWorld, positionView, normalWorldGeometry, normalViewGeometry, materialNormal, cameraViewMatrix, fwidth } from "three/tsl";
import { wx } from "./weatherState.js";
import { season } from "../seasons/season.js";
import { hash2D, noise2D } from "../tslkit.js";
import { rippleSlope, glint, snowMask, SNOW_ALBEDO, wxLook } from "./surfaceWeather.js";

export const WX_ON = !/[?&]weather=old(&|$)/.test(location.search);
const H2 = (p) => hash2D(fract(p.div(1024)).mul(1024));
const toView = (n) => normalize(cameraViewMatrix.mul(vec4(n, 0)).xyz);
/** step(edge, x) as a soft 0..1 */
const step01 = (threshold, h) => { const hh = float(h); return smoothstep(hh.sub(0.0001), hh.add(0.0001), float(threshold)); };

/** the shared overhead map (exposure: dry under cars / eaves) for the ground families; set by cityWeather.start() */
let MAP = null;
export function setWeatherMap(map) { MAP = map; }
export const weatherMap = () => MAP;

/** surface-gradient bump on SNAPSHOT normals (tslkit.bumpNormal reads the global normalView: not in the branch) */
function bumpOn(h, nV, pV) {
  const dpdx = pV.dFdx(), dpdy = pV.dFdy();
  const r1 = dpdy.cross(nV), r2 = nV.cross(dpdx);
  const det = dpdx.dot(r1);
  const grad = det.sign().mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)));
  return det.abs().mul(nV).sub(grad).normalize();
}

/**
 * The weather graph on snapshot inputs. I = { P, Nw, col, rough, metal, n (view normal), nG (geometry view normal),
 * pV (position view), porosity, edge, puddleBias, ground }. Built lazily: only the nodes an output uses are emitted.
 */
function graph(I, o, wantNormal) {
  // STAGED: each effect is its own UNIFORM-gated block (rain-only weather skips the snow maths, snow skips the puddles,
  // ripples and rivulets...), writing into vars declared here; what blocks share is a var computed before them (code
  // first built inside a block stays inside it). The gates read uniforms only: uniform control flow (fwidth allowed).
  const { P, Nw } = I, up = Nw.y;
  const fw = fwidth(P.x).add(fwidth(P.y)).add(fwidth(P.z)).mul(0.5).add(0.0002).toVar();
  let exposed = float(1), shelter = float(0);
  if (o.map && MAP) {
    const s = MAP.sample(P.xz), inside = MAP.inside(P.xz);
    const gap = s.x.sub(P.y);
    // (city tolerance 0.25-0.6 m, the lab's 0.06-0.3: the bake's smoothed heights sit a few cm over real lawns / mounds and
    // grass, and a lawn came out half "sheltered": blotchy thin snow at 15 cm depth. A car or an eave is > 1 m over)
    exposed = select(inside, max(smoothstep(s.x.sub(0.6), s.x.sub(0.25), P.y), smoothstep(1.2, 4.0, gap).mul(0.65)), float(1)).toVar();
    shelter = select(inside, s.y, float(0)).mul(season.uLeafDensity.mul(0.75).add(0.25)).toVar();
  }
  const t = wx.uTime;
  const horiz = smoothstep(0.7, 0.95, up).toVar();
  const vert = float(1).sub(smoothstep(0.3, 0.6, abs(up))).toVar();
  const porosity = I.porosity;
  const lite = !!o.lite;
  const on = (u) => u.greaterThan(0.0005);

  // ---- wet film (always: a few ALU)
  const reach = mix(mix(float(0.15), float(1), exposed).mul(float(1).sub(shelter.mul(0.4))), float(0.6), vert);
  let wetN = clamp(wx.uWet.mul(reach), 0, 1);
  let roadKeep = float(1);
  if (o.road) {
    const edge = I.edge ?? float(0);
    // o.saltMask (node 0..1): how much of the salting reaches this road (sett lanes, gravel: little)
    const salt = wx.uSalt.mul(I.saltMask ?? float(1));
    roadKeep = float(1).sub(salt.mul(float(1).sub(edge.mul(0.85)))).toVar();
    wetN = max(wetN, salt.mul(smoothstep(0.0, 0.3, wx.uSnowCover)).mul(0.6).mul(float(1).sub(edge.mul(0.5))));
  }
  const wet = wetN.toVar();
  const col = (wantNormal ? vec3(0) : vec3(I.col.mul(float(1).sub(wet.mul(porosity).mul(wxLook.uDarken))))).toVar();
  const rough = (wantNormal ? float(0) : float(mix(I.rough, I.rough.mul(0.3).add(0.06), wet.mul(mix(float(0.55), float(1), horiz))))).toVar();
  const metal = (wantNormal ? float(0) : float(mix(I.metal, max(I.metal, float(0.12)), wet.mul(horiz)))).toVar();
  if (o.road && !wantNormal) {
    const sc = wx.uSalt.mul(I.saltMask ?? float(1)).mul(wx.uSnowCover.min(1));
    rough.assign(mix(rough, max(rough, float(0.55)), sc)); metal.assign(metal.mul(float(1).sub(sc.mul(0.6))));
  }
  const nView = vec3(wantNormal ? I.n : vec3(0, 0, 1)).toVar();

  // ---- puddles (+ ripples while it rains)
  if (o.puddles && !lite) If(on(wx.uPuddle), () => {
    const low = noise2D(P.xz.mul(0.31)).mul(0.55).add(noise2D(P.xz.mul(1.17).add(3.1)).mul(0.3)).add(noise2D(P.xz.mul(4.3).add(7.7)).mul(0.15)).toVar();
    const level = wx.uPuddle.mul(0.42).add(I.puddleBias ?? float(0)).toVar();   // (the lab 0.5: a full level flooded half the city's streets)
    const e = fw.mul(1.2).add(0.004);                       // (analytic: the noise's slope x the footprint)
    const puddle = smoothstep(level.add(e), level.sub(e), low).mul(horiz).mul(exposed).toVar();
    if (!wantNormal) {
      const rim = smoothstep(level.add(0.07), level, low).mul(horiz).mul(exposed).mul(wx.uPuddle.mul(4).min(1)).toVar();
      col.assign(col.mul(float(1).sub(rim.mul(0.25))));
      rough.assign(mix(rough, rough.mul(0.6), rim));
      col.assign(mix(col, col.mul(0.42), puddle));
      metal.assign(mix(metal, float(0.55), puddle));
      rough.assign(mix(rough, float(0.025), puddle));
    }
    // ripples: only in a puddle and while the 11 cm rings are over ~3 px (a per-pixel branch: the derivatives come from
    // the footprint, not fwidth, which WGSL forbids there), filtered by their own footprint (the lab's polish: no SSR blink)
    If(on(wx.uRain).and(puddle.greaterThan(0.002)).and(fw.lessThan(0.025)), () => {
      const rs0 = vec2(rippleSlope(P.xz, t, fw)).toVar();
      const dv = fw.mul(7.0).mul(wx.uRain.mul(1.5).min(1)).toVar();
      if (!wantNormal) rough.assign(mix(rough, min(sqrt(float(0.025 * 0.025).add(dv.mul(dv).mul(16.0)).add(rs0.dot(rs0).mul(0.1))), float(0.22)), puddle));
      else {
        const rs = rs0.mul(float(1).div(float(1).add(dv.mul(30.0).pow(2))));
        nView.assign(normalize(mix(nView, toView(normalize(vec3(rs.x.negate(), 1, rs.y.negate()))), puddle)));
      }
    });
  });

  // ---- rivulets on walls (o.streaks, 3 cm columns, a third of them running) and beads + trails on glass (o.glass,
  // 1.2 cm columns): both on one material (the facade: its wall and its painted glass, by streakMask / glassMask)
  const runs = (a, colWm, speedY, share) => {
    const colW = float(colWm);
    const ci = floor(a.div(colW)), cf = fract(a.div(colW)).sub(0.5);
    const hr = H2(vec2(ci, 3.0)), hs = H2(vec2(ci, 11.0));
    const run = fract(P.y.mul(speedY).add(t.mul(hr.mul(0.4).add(0.15))).add(hs.mul(10.0)));
    const line = smoothstep(0.32, 0.08, abs(cf)).mul(smoothstep(0.0, 0.5, run)).mul(smoothstep(1.0, 0.85, run)).mul(step01(hr, share));
    const fade = float(1).sub(smoothstep(colW.mul(0.25), colW.mul(0.6), fw));
    return line.mul(vert).mul(wx.uRain.mul(2).min(1)).mul(fade);
  };
  const along = () => { const tang = normalize(vec2(Nw.z.negate(), Nw.x).add(vec2(1e-4, 0))).toVar(); return { tang, a: dot(P.xz, tang).toVar() }; };
  if (o.streaks && !lite && !wantNormal) If(on(wx.uRain).and(vert.greaterThan(0.01)).and(fw.lessThan(0.02)).and(I.streakMask ? I.streakMask.greaterThan(0.01) : float(1).greaterThan(0)), () => {
    const { a } = along();
    const streak = runs(a, 0.03, 0.6, 0.3).mul(I.streakMask ?? float(1)).toVar();
    col.assign(col.mul(float(1).sub(streak.mul(0.14))));
    rough.assign(mix(rough, float(0.18), streak));
    metal.assign(mix(metal, float(0.1), streak));
  });
  if (o.glass && !lite) If(on(wx.uWet).and(fw.lessThan(0.008)).and(I.glassMask ? I.glassMask.greaterThan(0.01) : float(1).greaterThan(0)), () => {
    const { tang, a } = along();
    const g = vec2(a, P.y).div(0.012), c = floor(g), f = fract(g).sub(0.5).toVar();
    const hb = H2(c.add(vec2(5.0, 9.0))), present = smoothstep(0.75, 0.74, hb.sub(wx.uWet.mul(0.4)).add(0.3));
    const rr = hb.mul(0.25).add(0.15);
    const bead = smoothstep(rr, rr.sub(0.08), length(f)).mul(present).mul(wx.uWet).mul(float(1).sub(smoothstep(0.003, 0.008, fw)));
    const drop = max(bead, runs(a, 0.012, 2.2, 0.55)).mul(I.glassMask ?? float(1)).toVar();
    if (!wantNormal) col.assign(mix(col, col.mul(0.6).add(0.02), drop));
    else {
      const bulge = vec3(f.x.mul(-1.6), 0, f.y.mul(-1.6)).mul(drop);
      // (the offset unnormalised: where there is no drop it is 0, and normalize(0) is NaN: black walls)
      nView.assign(normalize(nView.add(cameraViewMatrix.mul(vec4(tang.x.mul(bulge.x), bulge.z, tang.y.mul(bulge.x), 0)).xyz)));
    }
  });
  if (o.beads && !lite && !wantNormal) If(on(wx.uWet).and(fw.lessThan(0.006)), () => {
    const g = P.xz.mul(1 / 0.01).add(P.y.mul(37.0)), c = floor(g), f = fract(g).sub(0.5);
    const bead = smoothstep(0.32, 0.22, length(f)).mul(smoothstep(0.62, 0.6, H2(c))).mul(wet).mul(float(1).sub(smoothstep(0.0025, 0.006, fw)));
    rough.assign(mix(rough, float(0.04), bead));
  });
  if (o.frost && !wantNormal) If(on(wx.uFrost), () => {
    const fr = wx.uFrost.mul(smoothstep(0.2, 0.8, up)).mul(exposed).mul(float(1).sub(wx.uSnowCover)).toVar();
    col.assign(mix(col, vec3(0.55, 0.58, 0.62), fr.mul(0.55)));
    rough.assign(mix(rough, float(0.7), fr));
  });

  // ---- snow cover
  if (o.snow !== false) If(on(wx.uSnowCover), () => {
    const slush = (o.slush ? max(wx.uSlush, o.road ? wx.uSalt.mul(I.saltMask ?? float(1)).mul(0.85) : float(0)) : wx.uSlush.mul(0.35)).toVar();
    if (lite) {
      const cov = smoothstep(0.42, 0.78, up).mul(exposed).mul(wx.uSnowCover);
      const sm = smoothstep(0.32, 0.5, cov.mul(1.45).sub(noise2D(P.xz.mul(0.6)).mul(0.45))).mul(roadKeep).mul(I.snowMask ?? float(1)).toVar();
      if (!wantNormal) {
        col.assign(mix(col, mix(SNOW_ALBEDO, vec3(0.42, 0.43, 0.44), slush.mul(0.8)), sm));
        rough.assign(mix(rough, float(0.72), sm));
        metal.assign(mix(metal, float(0), sm));
      } else nView.assign(normalize(mix(nView, I.nG, sm)));
      return;
    }
    let ground = null;
    if (I.ground) ground = I.ground;
    else if (o.ground?.lum) {
      const Lc = dot(I.col, vec3(0.2126, 0.7152, 0.0722));
      ground = mix(smoothstep(float(o.ground.lum[1]), float(o.ground.lum[0]), Lc), float(0.5), smoothstep(0.01, 0.06, fw));
    }
    let smN = snowMask(P, up, exposed.mul(float(1).sub(shelter.mul(0.6))), wx.uSnowCover, ...(o.snowUp ?? [0.42, 0.78]), ground);
    if (o.plaster) {
      const wn = wx.uWind.length();
      const windward = smoothstep(0.25, 0.75, dot(normalize(Nw.xz.add(vec2(1e-4, 0))), wx.uWind.div(max(wn, 0.01)).negate()));
      const pl = windward.mul(smoothstep(2.0, 8.0, wn)).mul(wx.uSnowCover).mul(vert);
      smN = max(smN, smoothstep(0.35, 0.6, pl.mul(1.3).sub(noise2D(vec2(P.y.mul(3.0), dot(P.xz, vec2(7.0, 5.0)))).mul(0.5))));
    }
    const sm = smN.mul(roadKeep).mul(I.snowMask ?? float(1)).toVar();
    // sparkle: only where its 1.8 cm facets are over ~1.6 px (per-pixel branch, no derivatives in it)
    const gl = vec4(0, 1, 0, 0).toVar();
    If(fw.lessThan(0.0115), () => { gl.assign(glint(P, fw)); });
    if (!wantNormal) {
      const sCol = mix(SNOW_ALBEDO, vec3(0.36, 0.35, 0.33), slush.mul(0.85));
      const sRough = mix(mix(float(0.72), float(0.12), gl.w), float(0.22), slush);
      col.assign(mix(col, sCol, sm));
      rough.assign(mix(rough, sRough, sm));
      metal.assign(mix(metal, mix(float(0), float(0.25), slush), sm));
    } else {
      const bumpH = noise2D(P.xz.mul(9.0)).mul(0.006).mul(float(1).sub(smoothstep(0.004, 0.02, fw))).toVar();
      const sN = normalize(mix(bumpOn(bumpH, I.nG, I.pV), toView(gl.xyz), gl.w));
      nView.assign(normalize(mix(nView, sN, sm)));
    }
  });
  return { col, rough: clamp(rough, 0.02, 1), metal: clamp(metal, 0, 1), n: nView };
}

const asNode = (v, d) => (v == null ? float(d) : v.isNode ? v : float(v));

/**
 * Weatherize a city material (gated). opts: porosity (number | node), puddles, puddleBias (node), streaks,
 * streakMask (node), glass, glassMask (node), beads, slush, road, edge (node), frost, snow (false = none), snowMask
 * (node 0..1), snowUp, ground ({ lum } | node), plaster, map (true: the overhead map's exposure), lite.
 */
export function wxMat(m, o = {}) {
  if (!WX_ON || !m || m.userData?.weatherized) return m;
  const gate = () => wx.uOn.greaterThan(0.5);
  const col0 = m.colorNode ?? vec3(m.color.r, m.color.g, m.color.b);
  const rough0 = m.roughnessNode ?? float(m.roughness ?? 1);
  const metal0 = m.metalnessNode ?? float(m.metalness ?? 0);
  const n0 = m.normalNode ?? materialNormal;
  m.userData.wxDry = { color: m.colorNode, roughness: m.roughnessNode, metalness: m.metalnessNode, normal: m.normalNode };   // (debug / A/B)
  // vec3 out (other passes reuse a material's colorNode as an albedo: the impostor bake); o.keepAlpha: vec4 with the dry alpha
  const hasAlpha = !!o.keepAlpha;
  // the outputs live in vars declared at the top of the colour function; roughness / metalness read them after it
  const rV = float(rough0).toVar(), mV = float(metal0).toVar();
  const ins = (top) => {
    const I = { P: positionWorld.toVar(), Nw: normalWorldGeometry.toVar(), porosity: asNode(o.porosity, 0.5).toVar() };
    for (const k of ["edge", "puddleBias", "streakMask", "glassMask", "snowMask", "saltMask"]) if (o[k]) I[k] = float(o[k]).toVar();
    if (o.ground?.isNode) I.ground = float(o.ground).toVar();
    Object.assign(I, top);
    return I;
  };
  m.colorNode = Fn(() => {
    const c4 = vec4(col0).toVar();
    const c = c4.xyz.toVar();
    rV.toStack(); mV.toStack();
    const I = ins({ col: c, rough: rV, metal: mV, n: null });
    If(gate(), () => {
      const g = graph(I, o, false);
      const tc = vec3(g.col).toVar(), tr = float(g.rough).toVar(), tm = float(g.metal).toVar();
      c.assign(tc); rV.assign(tr); mV.assign(tm);
    });
    return hasAlpha ? vec4(c, c4.w) : c;
  })();
  m.roughnessNode = rV;
  m.metalnessNode = mV;
  // the normal: only the families whose weather bends it (puddles, snow, glass beads)
  if (o.puddles || o.glass || o.snow !== false) {
    m.normalNode = Fn(() => {
      const n = vec3(n0).toVar();
      const I = ins({ n, nG: normalViewGeometry.toVar(), pV: positionView.toVar(), col: o.ground?.lum ? vec3(col0).toVar() : vec3(0.5), rough: float(0), metal: float(0) });
      If(gate(), () => { const tn = vec3(graph(I, o, true).n).toVar(); n.assign(tn); });
      return n;
    })();
  }
  m.userData.weatherized = o.lite ? "lite" : true;
  if (o.road) m.userData.wxRoad = true;
  return m;
}
