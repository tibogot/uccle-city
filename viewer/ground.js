// Ground material for the terrain mesh.
//
// Land cover per tile is painted at load from the real OSM areas and paths of features.json into a
// 1 m/px RGBA mask (linear filtered, so edges blend over a metre or two):
//   R = woodland (wood, forest, scrub): leaf litter, moss, dark soil
//   G = paths (footway, path, cycleway, steps, pedestrian): gravel / stabilised sand, 1.6 m wide
//   B = sand (playground)                       A = water
// Everything else (gardens, verges, lawns, pitches and parks) is grass: three scales of value noise
// for patches of greener and drier grass, worn earth near the low end of slopes, clover-dark spots,
// and a fine bump. Steep ground turns to bare earth.
import * as THREE from "three/webgpu";
import { Fn, float, vec2, vec3, color, mix, smoothstep, positionWorld, normalWorld, texture, uv, clamp, max } from "three/tsl";
import { noise2D, bumpNormal } from "./tslkit.js";

const KIND = {
  wood: [255, 0, 0, 0], forest: [255, 0, 0, 0], scrub: [170, 0, 0, 0],
  playground: [0, 0, 255, 0], water: [0, 0, 0, 255],
};
const PATHS = new Set(["footway", "path", "cycleway", "steps", "pedestrian"]);

/** RGBA land-cover mask for one tile (1 px per metre). */
export function landCoverTexture(feats, bounds) {
  const W = Math.round(bounds.x1 - bounds.x0), H = Math.round(bounds.z1 - bounds.z0);
  const cv = new OffscreenCanvas(W, H), g = cv.getContext("2d");
  g.clearRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";                     // channels add up independently
  const px = (x) => x - bounds.x0, pz = (z) => z - bounds.z0;
  let areas = 0, paths = 0;
  for (const a of feats.areas || []) {
    const c = KIND[a.kind];
    if (!c) continue;
    g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},1)`;
    g.beginPath();
    for (const ring of a.rings || []) {
      ring.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
      g.closePath();
    }
    g.fill("evenodd");
    areas++;
  }
  g.strokeStyle = "rgba(0,255,0,1)";
  g.lineCap = g.lineJoin = "round";
  for (const l of feats.lines || []) {
    if (!PATHS.has(l.kind)) continue;
    g.lineWidth = l.kind === "pedestrian" ? 4 : 1.6;
    g.beginPath();
    l.line.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
    g.stroke();
    paths++;
  }
  // canvas alpha would premultiply our water channel away: read RGB from the canvas, water separately
  const img = g.getImageData(0, 0, W, H).data;
  const wc = new OffscreenCanvas(W, H), wg = wc.getContext("2d");
  wg.fillStyle = "#fff";
  for (const a of feats.areas || []) {
    if (a.kind !== "water") continue;
    wg.beginPath();
    for (const ring of a.rings || []) { ring.forEach(([x, z], i) => (i ? wg.lineTo(px(x), pz(z)) : wg.moveTo(px(x), pz(z)))); wg.closePath(); }
    wg.fill("evenodd");
  }
  const wimg = wg.getImageData(0, 0, W, H).data;
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = img[i * 4 + 3] / 255 || 1;
    data[i * 4] = Math.min(255, img[i * 4] / a); data[i * 4 + 1] = Math.min(255, img[i * 4 + 1] / a);
    data[i * 4 + 2] = Math.min(255, img[i * 4 + 2] / a); data[i * 4 + 3] = wimg[i * 4];
    if (!img[i * 4 + 3]) data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 0;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, areas, paths };
}

/** The terrain material: grass by default, the mask's covers where OSM has them. */
export function groundMaterial(cover, bounds, contour) {
  const P = positionWorld;
  const muv = vec2(P.x.sub(bounds.x0).div(bounds.x1 - bounds.x0), P.z.sub(bounds.z0).div(bounds.z1 - bounds.z0));
  const mk = texture(cover.tex, muv);
  const xz = vec2(P.x, P.z);
  const n1 = noise2D(xz.mul(0.035)), n2 = noise2D(xz.mul(0.21).add(17.3)), n3 = noise2D(xz.mul(1.7).add(5.1));
  const fine = noise2D(xz.mul(9.0));
  // grass: lush to dry, darker clover patches, a little earth showing where worn
  let grass = mix(color(0x4a6a2a), color(0x6f8236), n1);
  grass = mix(grass, color(0x8c8a4a), smoothstep(0.62, 0.85, n2).mul(0.55));        // dry patches
  grass = mix(grass, color(0x3a5524), smoothstep(0.55, 0.8, n3).mul(0.35));         // clover / lush
  grass = grass.mul(fine.mul(0.22).add(0.89));
  const worn = smoothstep(0.78, 0.92, noise2D(xz.mul(0.09).add(3.3))).mul(0.6);
  grass = mix(grass, color(0x6b5a40), worn.mul(smoothstep(0.5, 0.75, n3)));
  // woodland floor: leaf litter, moss
  let wood = mix(color(0x3b3020), color(0x5a4a2c), n2);
  wood = mix(wood, color(0x3c5426), smoothstep(0.6, 0.85, n3).mul(0.6)).mul(fine.mul(0.3).add(0.85));
  // gravel paths, sand, water
  const gravel = mix(color(0x9a8c74), color(0xb8ab92), n3).mul(fine.mul(0.35).add(0.82));
  const sand = mix(color(0xc4ad84), color(0xd8c49c), n2).mul(fine.mul(0.2).add(0.9));
  const water = color(0x1c2a2c);
  let col = grass;
  col = mix(col, wood, mk.r);
  col = mix(col, sand, mk.b);
  col = mix(col, gravel, mk.g);
  // steep banks: bare earth
  const slope = smoothstep(float(0.9), float(0.72), normalWorld.y);
  col = mix(col, mix(color(0x6d5a40), color(0x7d6a4f), n2), slope.mul(float(1).sub(mk.g)));
  col = mix(col, water, mk.a);
  col = contour ? contour(col) : col;
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  m.colorNode = col;
  // grass blades / gravel grain as bump; water flat and glossy
  const relief = fine.mul(0.012).add(n3.mul(0.02)).mul(float(1).sub(mk.a));
  m.normalNode = bumpNormal(relief);
  m.roughnessNode = mix(mix(float(0.92), float(0.85), mk.g), float(0.08), mk.a);
  m.metalnessNode = mk.a.mul(0.5);
  return m;
}
