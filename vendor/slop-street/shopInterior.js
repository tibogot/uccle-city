// Shop interior behind the glass: a parallax room (back shelves with goods, a counter nearer the glass, ceiling lamps,
// a back light strip), box-filtered so it settles to its average light at a distance instead of shimmering.
// ADAPTED from Mr.doob's slop-newyork, js/tsl-materials.js createStorefront() (lines 567-625 at 536a907) and its helpers
// hash2D / filteredPulse / boxCoverage (lines 84-86, 148-162). MIT licence, see LICENSE and ORIGIN.md here.
// What changed: his storefront is part of a façade shader (a 7.5 m bay grid on the wall); here it is the material of a
// separate window QUAD per real shop (viewer/streetlife/): x / y are the quad's local metres (uv x size), the room
// depth and widths come from the shop's own width, the facade normal is the quad's world normal, no city uniforms.
import { Fn, float, vec2, vec3, vec4, color, fract, floor, sin, dot, max, min, clamp, abs, sign, step, smoothstep, mix, pow, normalize, fwidth, positionWorld, cameraPosition } from "three/tsl";

export const hash2D = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)));

export const filteredPulse = Fn(([x, a, b, w]) => {
  const p = float(x).toVar(), lo = float(a).toVar(), hi = float(b).toVar();
  const hw = max(float(w), 0.0001).mul(0.5).toVar();
  const integral = (t) => floor(t).mul(hi.sub(lo)).add(clamp(fract(t), lo, hi).sub(lo));
  return integral(p.add(hw)).sub(integral(p.sub(hw))).div(hw.mul(2.0));
});

export const boxCoverage = Fn(([x, a, b, s]) => {
  const xv = float(x).toVar(), sv = max(float(s), 0.001).toVar();
  return clamp(min(xv.add(sv), b).sub(max(xv.sub(sv), a)).div(sv.mul(2.0)), 0.0, 1.0);
});

/**
 * shopInterior(x, y, width, height, normal, seed, lit) -> vec4(rgb of the glass, glow)
 *  x, y   : local metres on the glass (0..width, 0..height), y up from the glass's bottom edge
 *  normal : the glass's world normal (vec3, outward)
 *  seed   : 0..1 per shop (its layout and light colour)
 *  lit    : 0..1 (night lighting of the shop)
 */
export const shopInterior = Fn(([x, y, width, height, normal, seed, lit]) => {
  const horizon = color(0x9fb4c8);
  const fw = vec2(fwidth(x), fwidth(y)).toVar();
  const band = (p, a, b, w) => boxCoverage(p, a, b, w.mul(0.5));
  const choice = seed;
  const light = mix(color(0xffd49a), color(0xe0edee), step(0.58, choice));
  const room = color(0x343330).toVar();
  const fixture = float(0).toVar();
  // fine displays disappear before becoming sub-pixel; distant shops keep their average light level
  const detail = float(1).sub(smoothstep(0.06, 0.2, max(fw.x, fw.y)));
  const ray = positionWorld.sub(cameraPosition);
  const inward = max(abs(dot(ray, normal)), 0.1);
  const dx = dot(ray, vec3(normal.z, 0, normal.x.negate())).div(inward);
  const dy = ray.y.div(inward);
  const halfW = width.mul(0.5), midY = height.mul(0.55);
  const ox = x.sub(halfW), oy = y.sub(midY);
  const tx = halfW.sub(ox.mul(sign(dx))).div(max(abs(dx), 0.001));
  const ty = midY.sub(oy.mul(sign(dy))).div(max(abs(dy), 0.001));
  const D = float(3.6);
  const depth = min(min(tx, ty), D);
  const px = x.add(dx.mul(depth)), py = y.add(dy.mul(depth));
  const onSide = step(tx, min(ty, D));
  const onHorizontal = step(ty, min(tx, D));
  const ceiling = onHorizontal.mul(step(0, dy));
  const floorMask = onHorizontal.mul(float(1).sub(step(0, dy)));
  const back = float(1).sub(max(onSide, onHorizontal));
  const roomFw = fw.mul(float(1).add(D.div(inward)));
  const shelfY = py.div(0.55);
  const shelves = filteredPulse(fract(shelfY), 0.05, 0.13, roomFw.y.div(0.55))
    .mul(band(py, 0.5, 2.3, roomFw.y)).mul(band(px, 0.3, width.sub(0.3), roomFw.x)).mul(back);
  const goodsX = px.div(0.28);
  const goodsSeed = hash2D(vec2(floor(goodsX), floor(shelfY)).add(choice.mul(31)));
  const goods = filteredPulse(fract(goodsX), 0.12, 0.88, roomFw.x.div(0.28))
    .mul(filteredPulse(fract(shelfY), 0.14, goodsSeed.mul(0.28).add(0.5), roomFw.y.div(0.55)))
    .mul(band(py, 0.5, 2.3, roomFw.y)).mul(back).mul(step(0.3, choice));
  const wall = mix(color(0x716557), color(0x596462), choice);
  const shell = mix(mix(wall, color(0x33302b), floorMask), color(0x9b9689), ceiling);
  const stock = mix(color(0x88654a), color(0x617b80), goodsSeed);
  const stocked = mix(mix(shell, stock, goods), color(0x30251b), shelves);
  // a counter nearer the glass than the rear shelves, so they shift at different rates as we pass
  const displayX = x.add(dx.mul(1.3)), displayY = y.add(dy.mul(1.3));
  const counter = band(displayY, 0.65, 1.1, fw.y.mul(1.5)).mul(band(displayX, 0.2, width.sub(0.2), fw.x.mul(1.5))).mul(step(1.3, depth));
  const furnished = mix(stocked, color(0x453a2d), counter.mul(0.82));
  const edgeShade = smoothstep(0, 0.5, min(px, width.sub(px))).mul(0.35).add(0.65);
  room.assign(mix(room, furnished.mul(edgeShade).mul(mix(0.58, 1, lit)), detail));
  const lamp = band(px, width.mul(0.18), width.mul(0.82), roomFw.x).mul(band(depth, 0.65, 0.82, roomFw.y)).mul(ceiling);
  const backLight = band(py, 2.45, 2.52, roomFw.y).mul(back).mul(band(px, 0.5, width.sub(0.5), roomFw.x));
  fixture.assign(max(lamp, backLight).mul(detail));
  const view = normalize(cameraPosition.sub(positionWorld));
  const fresnel = pow(clamp(float(1).sub(abs(dot(view, normal))), 0, 1), 2);
  const glassColor = mix(room.mul(light).mul(mix(0.35, 0.95, lit)), horizon, fresnel.mul(0.65).add(0.1));
  return vec4(mix(glassColor, light, fixture.mul(lit)), lit.mul(float(0.55).add(fixture.mul(2.2))).mul(float(1).sub(fresnel.mul(0.8))));
});
