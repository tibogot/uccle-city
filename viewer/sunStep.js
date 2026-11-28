// THE SUN SHADOW'S STEPPED DIRECTION AND ITS DEPTH RANGE (claude/sunstep, rule docs/rules/sun-shadow-step.md).
// Pure maths (no three.js): lighting.js uses it every frame, tools/audit/sunShadowStepCheck.mjs tests it in node.
//
// 1. THE STEP (?sunstep=old: the shadow camera follows the live sun). The static shadow cache (lighting.js
//    CachedSunShadowNode) is valid for ONE light direction. Keyed on the live direction (6 decimals), any sun motion
//    (the dev panel's sun speed, a day cycle) redrew the whole cache every frame. The shadow camera now takes a
//    STEPPED copy of the sun's direction; the lighting (N.L, the key colour, the sky) keeps the live one.
//    How big a step: a caster of height H casts its tip H / tan(e) away; turning the light by a small angle d moves
//    the tip by H d / sin(e) in the shadow map's own texels (elevation and azimuth alike, to first order; a map texel
//    lies texel / sin(e) long on flat ground along the sun). So the tip of an H_REF = 30 m caster moves at most ONE
//    map texel per step when the step is
//        stepMax = texel x sin(e) / H_REF,         clamped to [0.002, 0.5] deg.
//    The step LEADS the sun: on a step the shadow direction is put stepMax AHEAD of the live sun along its motion,
//    so the error runs +stepMax -> 0 -> -stepMax before the next step (twice the interval for the same error). The
//    error never passes stepMax, whatever the motion does (a reversed slider re-steps at once). A sun that stops
//    leaves the shadow up to one step off: after STILL_FRAMES still frames it is put on the live sun (one redraw).
//
// 2. THE DEPTH RANGE (?sunfar=old: far = 900 + box x 1.42 + 110 m, the perfgame round 2 rule). r187's shadow test
//    checks only z <= 1 of the shadow coordinate: with the reversed depth buffer a receiver PAST the far plane reads
//    as shadowed. The old far plane assumed the receivers lie within ~box x 1.42 of the focus in depth; at a low sun
//    (golden, 9 deg) the ground under the box's square across the sun runs to box / tan(e) (~2.4 km for the 400 m
//    box): from 300 m up the foreground was past the far plane, a dark band (the tour's far-300m view).
//    A receiver within the box across the sun (|y| <= box on the light's vertical axis) and `down` metres below the
//    focus lies at most
//        depth = box / tan(e) + down / sin(e)                 past the focus along the light,
//    (exact for an orthographic light: depth = y / tan(e) - h / sin(e) for a point y across, h above the focus), so
//    far = the light's distance + that, capped at FAR_CAP. Past the cap (a sun under ~4 deg) the receivers fade to lit
//    over the last FAR_FADE of the range (lighting.js FadedShadowNode) instead of reading dark. The shadow bias is
//    a share of the depth range: it is scaled by oldFar / far, so its size in metres stays what it was per box.
export const H_REF = 30;                       // m: the tallest street-scale caster (St-Job's tower is the exception)
export const STEP_MIN = 0.002 * Math.PI / 180, STEP_MAX = 0.5 * Math.PI / 180;
export const STILL_FRAMES = 60;                // a still sun for 1 s: the shadow put on it
export const FAR_CAP = 6000;                   // m: the deepest far plane (a sun under ~4 deg)
export const FAR_FADE = 0.04;                  // the last 4 % of the depth range fades to lit
export const FAR_QUANT = 25;                   // m: the far plane rounded up (a box / step change redraws anyway)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** the largest step (rad) for a box texel (m) and the sun's sin(elevation) */
export function stepAngle(texel, sinElev, href = H_REF) {
  return clamp(texel * Math.max(0, sinElev) / href, STEP_MIN, STEP_MAX);
}
/** how many map texels the tip of an `href` caster moves for a direction error `angle` (rad) */
export function tipTexels(angle, texel, sinElev, href = H_REF) {
  return href * angle / (Math.max(1e-3, sinElev) * texel);
}
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; v.x /= l; v.y /= l; v.z /= l; return v; };
/** angle (rad) between two unit vectors */
export const angleBetween = (a, b) => 2 * Math.asin(Math.min(1, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / 2));

/** The stepped shadow direction. update(live, texel) each frame: returns true on a step (`dir` and `id` changed). */
export class SunStepper {
  constructor({ lead = true } = {}) {
    this.dir = null; this.id = 0; this.lead = lead;
    this.prev = { x: 0, y: 1, z: 0 }; this.u = null; this.still = 0; this.err = 0; this.max = 0;
  }
  update(live, texel) {
    const L = { x: live.x, y: live.y, z: live.z };
    if (!this.dir) { this.dir = { ...L }; this.prev = { ...L }; this.id++; return true; }
    // the sun's motion since the last frame, made tangent to the sphere
    const m = { x: L.x - this.prev.x, y: L.y - this.prev.y, z: L.z - this.prev.z };
    const mk = dot(m, L); m.x -= mk * L.x; m.y -= mk * L.y; m.z -= mk * L.z;
    const ml = Math.hypot(m.x, m.y, m.z);
    if (ml > 1e-9) { this.u = { x: m.x / ml, y: m.y / ml, z: m.z / ml }; this.still = 0; } else this.still++;
    this.prev = { ...L };
    const max = this.max = stepAngle(texel, L.y);
    const err = this.err = angleBetween(L, this.dir);
    let step = err > max * (1 + 1e-6);
    if (!step && this.still === STILL_FRAMES && err > 0) step = true;        // a stopped sun: the shadow put on it
    if (!step) return false;
    const u = this.u, t = this.lead && this.still === 0 && u ? Math.tan(max) : 0;
    this.dir = t ? norm({ x: L.x + u.x * t, y: L.y + u.y * t, z: L.z + u.z * t }) : { ...L };
    this.err = angleBetween(L, this.dir);
    this.id++;
    return true;
  }
}

/** the receivers' deepest point past the focus along the light (m): box half size, sin(elevation), metres below */
export function receiverDepth(box, sinElev, down = 110) {
  const s = clamp(sinElev, 0.02, 1), c = Math.sqrt(1 - s * s);
  return box * c / s + down / s;
}
/** the far plane: the light's distance + the deepest receiver, rounded up to FAR_QUANT and capped */
export function farPlane(lightDist, box, sinElev, down = 110) {
  return Math.min(FAR_CAP, Math.ceil((lightDist + receiverDepth(box, sinElev, down)) / FAR_QUANT) * FAR_QUANT);
}
