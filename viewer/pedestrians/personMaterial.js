// The crowd's person material: an ADAPTED COPY of Mr.doob's createPersonMaterial (vendor/slop-ped/pedestrians.js
// :718-962, MIT, (c) 2026 Mr.doob; see vendor/slop-ped/LICENSE). Same rigid-pair skinning from the pose buffer, same
// procedural clothes and face. Changes (bodies v2, P4):
//   - info.w packs hair (0..1) + 2 x a style code (bits below): accessories / clothes parts (bodies.js) are shown or
//     collapsed per person; children get a bigger head (1.2x about the head joint); older people get greyer hair;
//   - palettes by season (uSeason: 0 summer .. 1 winter) and a few Brussels-ish additions;
//   - colours for the new parts: hats, scarves, skirts, long coats, bags, backpacks, umbrellas (open with uRain),
//     canes;
//   - his "part >= 6 is hair" tests narrowed to the hair parts (6, 7).
import * as THREE from "three/webgpu";
import { Fn, If, float, int, vec2, vec3, vec4, color, attribute, instanceIndex, normalLocal, varying, vertexStage, cross,
  normalize, sin, abs, fract, max, min, clamp, mix, step, smoothstep, floor, uniform } from "three/tsl";

export const PART = { BODY: 0, LEG: 1, SHOE: 2, ARM: 3, HAND: 4, HEAD: 5, HAIR: 6, LONG_HAIR: 7,
  HAT: 8, SCARF: 9, SKIRT: 10, BAG: 11, BACKPACK: 12, UMBRELLA: 13, CANE: 14, COAT: 15, UMB_CLOSED: 16 };
export const STYLE = { HAT: 1, SCARF: 2, COAT: 4, SKIRT: 8, BAG: 16, BACKPACK: 32, UMBRELLA: 64, CANE: 128, CHILD: 256, OLD: 512, CAP: 1024 };
const STRIDE = 31;
/** Shared uniforms: the weather lab / city drive them. */
export const personUniforms = { season: uniform(0.75), rain: uniform(0) };

// palettes: [summer, winter]
const COAT_M = [[0x3b5a7a, 0x8a8f96, 0xb8a27a, 0x2f4f3f, 0xe3ded2, 0x7d3f22, 0x55606b, 0x9a4a3a], [0x2b3a52, 0x33332f, 0x8a6a44, 0x5a2f2f, 0x4f5238, 0x6a6a66, 0x222024, 0x3a3f4a]];
const COAT_F = [[0xd9a3a0, 0x8fb0c9, 0xe8dcc4, 0x6b8f71, 0xc2554d, 0xf0ece4, 0x9c7bb0, 0x3e5c86], [0x7a2630, 0xb89a72, 0x2e3e5c, 0x1f1d22, 0xc9c1b2, 0x5b6b4a, 0x8c5a7a, 0x3c3c40]];
const SHIRT = [0xe8e6e0, 0xb8c4d8, 0xcfc8b8, 0x9aa7b8];
const LEG_M = [0x22242c, 0x35485b, 0x51473d, 0x7c7160, 0x252526];
const LEG_F = [0x1c1c22, 0x2f4a6e, 0x46413b, 0xcfc8bb, 0x5a2a2e];
const SKIN = [0xc68863, 0xa96f4c, 0x8a5535, 0x6b3d24, 0xd9a077];
const HAIR = [0x1a1512, 0x3a2a1a, 0x584022, 0x6e6862, 0x2a2624, 0x8f6d43, 0x5e3020];
const WOOL = [0x7a1f2b, 0x2f3b5c, 0x5c6b3a, 0xc9b28a, 0x3b3b3e, 0xa8432e, 0x6d5a8a, 0xd8d2c4];
const SKIRT = [0x2a2a30, 0x6b2f3a, 0x2f4a6e, 0x8a7a5a, 0x4a5a3a, 0x9c6b8a];
const BAG = [0x3a2418, 0x6b4426, 0x1e1e20, 0x8a6a4a, 0x5a1e22];
const PACK = [0x2a4a7a, 0xb03a2e, 0x2e2e30, 0x4a7a3a, 0xd8b03a, 0x7a4a9a];
const UMB = [0x111216, 0x1d2a4a, 0x7a1e24, 0x2a4a3a, 0x3a3a40, 0xb8a888];

function pick(hexArray, t) {
  const n = hexArray.length, scaled = t.mul(n);
  let acc = color(hexArray[0]);
  for (let i = 1; i < n; i++) acc = mix(acc, color(hexArray[i]), step(float(i), scaled));
  return acc;
}
const qrot = (q, v) => v.add(cross(q.xyz, cross(q.xyz, v).add(v.mul(q.w))).mul(2.0));
const HEAD_JOINT = vec3(0, 1.52, -0.012);

export function createPersonMaterial(pose, detail = 1) {
  const U = personUniforms;
  const mat = new THREE.MeshStandardNodeMaterial({ metalness: 0 });
  const base = int(instanceIndex).mul(STRIDE);
  const info = pose.element(base.add(STRIDE - 1)); // seed, female, girth, hair + 2 x style
  const code = floor(info.w.mul(0.5));
  const hairAmt = info.w.sub(code.mul(2));
  const bit = (b) => step(0.5, fract(code.add(0.5).div(b * 2)));          // bit b of the style code
  const fHat = bit(STYLE.HAT), fCap = bit(STYLE.CAP), fScarf = bit(STYLE.SCARF), fCoat = bit(STYLE.COAT), fSkirt = bit(STYLE.SKIRT);
  const fBag = bit(STYLE.BAG), fPack = bit(STYLE.BACKPACK), fUmb = bit(STYLE.UMBRELLA), fCane = bit(STYLE.CANE);
  const fChild = bit(STYLE.CHILD), fOld = bit(STYLE.OLD);

  const skinA = attribute("skin", "vec4");
  const partV = skinA.w;
  const isP = (id) => step(abs(partV.sub(id)), 0.25);

  mat.positionNode = Fn(() => {
    const skin = attribute("skin", "vec4");
    const extra = attribute("extra", "vec3");
    const hairAmount = mix(clamp(hairAmt.mul(2.0), 0.0, 1.0), clamp(hairAmt.mul(2.0).sub(1.0), 0.0, 1.0), isP(PART.LONG_HAIR));
    let p = attribute("position", "vec3")
      .add(vec3(extra.x, 0.0, extra.y).mul(info.z.sub(1.0)))
      .add(attribute("femaleDelta", "vec3").mul(info.y))
      .add(attribute("hairDelta", "vec3").mul(hairAmount.mul(max(isP(PART.HAIR), isP(PART.LONG_HAIR)))));
    // shown or collapsed (to a point: zero-area triangles) per person
    const umbOpen = smoothstep(0.3, 0.7, U.rain);
    const vis = float(1)
      .sub(isP(PART.HAT).mul(float(1).sub(max(fHat, fCap))))
      .sub(isP(PART.SCARF).mul(float(1).sub(fScarf)))
      .sub(isP(PART.SKIRT).mul(float(1).sub(fSkirt)))
      .sub(isP(PART.COAT).mul(float(1).sub(fCoat)))
      .sub(isP(PART.BAG).mul(float(1).sub(fBag)))
      .sub(isP(PART.BACKPACK).mul(float(1).sub(fPack)))
      .sub(isP(PART.UMBRELLA).mul(float(1).sub(fUmb.mul(umbOpen))))
      .sub(isP(PART.UMB_CLOSED).mul(float(1).sub(fUmb.mul(float(1).sub(umbOpen)))))
      .sub(isP(PART.CANE).mul(float(1).sub(fCane)));
    p = p.mul(vis);
    // children: a bigger head (head, hair, hat about the head joint)
    const headish = max(max(isP(PART.HEAD), isP(PART.HAIR)), max(isP(PART.LONG_HAIR), isP(PART.HAT)));
    p = mix(p, p.sub(HEAD_JOINT).mul(1.2).add(HEAD_JOINT), fChild.mul(headish));
    const n = attribute("normal", "vec3");
    const w = skin.z;
    const ia = base.add(int(skin.x).mul(2));
    const ib = base.add(int(skin.y).mul(2));
    const qa = pose.element(ia), ta = pose.element(ia.add(1)), qb = pose.element(ib), tb = pose.element(ib.add(1));
    normalLocal.assign(normalize(mix(qrot(qa, n), qrot(qb, n), w)));
    return mix(qrot(qa, p).mul(ta.w).add(ta.xyz), qrot(qb, p).mul(tb.w).add(tb.xyz), w);
  })();

  const posAttr = attribute("position", "vec3");
  const extraAttr = attribute("extra", "vec3");
  const isLeg = isP(PART.LEG), isShoe = isP(PART.SHOE), isArm = isP(PART.ARM), isHand = isP(PART.HAND), isHead = isP(PART.HEAD);
  const isHairPart = max(isP(PART.HAIR), isP(PART.LONG_HAIR));
  const female = info.y;
  const lane = (salt) => fract(sin(info.x.add(salt).mul(12.9898)).mul(43758.5453));
  const winter = U.season;
  const skinCol = vertexStage(pick(SKIN, lane(17.0))).toVar();
  const hairCol = vertexStage(mix(pick(HAIR, lane(3.0)), color(0xb8b4ae), fOld.mul(0.75))).toVar();
  const coatCol = vertexStage(mix(
    mix(pick(COAT_M[0], lane(29.0)), pick(COAT_M[1], lane(29.0)), winter),
    mix(pick(COAT_F[0], lane(29.0)), pick(COAT_F[1], lane(29.0)), winter), female)).toVar();
  const shirtCol = vertexStage(pick(SHIRT, lane(71.0))).toVar();
  const legsCol = vertexStage(mix(pick(LEG_M, lane(47.0)), pick(LEG_F, lane(47.0)), female)).toVar();
  const bald = vertexStage(step(lane(41.0), 0.08).mul(float(1.0).sub(female)).mul(float(1).sub(fChild))).toVar();
  const tailored = vertexStage(step(0.42, lane(89.0)).mul(float(1).sub(fChild))).toVar();
  const hemY = vertexStage(mix(mix(0.955, 0.88, female), 1.0, lane(61.0))).toVar();
  const sneaker = vertexStage(max(step(0.4, lane(5.0)), fChild)).toVar();
  const upperCol = vertexStage(mix(mix(color(0x201e1c), color(0x4a3524), lane(23.0)), mix(color(0x252b32), color(0xc8c3b8), step(0.55, lane(31.0))), sneaker)).toVar();
  const soleCol = vertexStage(mix(color(0x191816), color(0xd5d1c8), sneaker)).toVar();
  const cuffCol = vertexStage(mix(coatCol.mul(0.72), shirtCol, tailored)).toVar();
  // the new parts
  const woolCol = vertexStage(pick(WOOL, lane(53.0))).toVar();
  const extraCol = vertexStage(
    mix(mix(mix(mix(mix(mix(mix(
      woolCol,                                                         // hat / scarf
      pick(SKIRT, lane(37.0)), isP(PART.SKIRT)),
      coatCol.mul(0.92), isP(PART.COAT)),
      pick(BAG, lane(59.0)), isP(PART.BAG)),
      pick(PACK, lane(67.0)), isP(PART.BACKPACK)),
      pick(UMB, lane(79.0)), max(isP(PART.UMBRELLA), isP(PART.UMB_CLOSED))),
      color(0x3a2a1e), isP(PART.CANE)),
      mix(woolCol, pick(PACK, lane(83.0)), fCap), isP(PART.HAT))).toVar();
  const isExtra = step(7.5, partV);
  const roughnessVal = vertexStage(mix(
    mix(mix(mix(float(0.86), float(0.55), max(isHand, isHead)), float(0.74), isHairPart), float(0.38), isShoe.mul(float(1.0).sub(sneaker))),
    mix(float(0.9), float(0.45), max(max(isP(PART.BAG), isP(PART.UMBRELLA)), isP(PART.CANE))), isExtra));

  if (!detail) {
    const vFar = varying(vertexStage(Fn(() => {
      const q = posAttr;
      const hd = normalize(vec2(q.x, q.z.add(0.01)));
      const hairline = hd.y.mul(0.055).add(1.62).sub(hd.x.mul(hd.x).sub(hd.y.mul(hd.y)).mul(0.005)).add(bald.mul(0.3));
      const headCol = mix(skinCol, hairCol, smoothstep(hairline.sub(0.015), hairline.add(0.015), q.y));
      const hairPartCol = mix(hairCol.mul(0.97), skinCol, bald.mul(step(q.y, 1.755)));
      const opening = q.y.sub(1.33).mul(0.42);
      const shirtV = smoothstep(1.33, 1.36, q.y).mul(step(abs(q.x), opening.add(0.01))).mul(smoothstep(0.035, 0.075, q.z)).mul(tailored);
      const neckLine = mix(1.5, 1.49, tailored);
      const torsoCol = mix(mix(legsCol, mix(coatCol, shirtCol, shirtV), step(hemY, q.y)), skinCol, step(neckLine, q.y));
      const sleeveCol = mix(coatCol, cuffCol, smoothstep(0.92, 0.96, extraAttr.z));
      const shoeCol = mix(upperCol, soleCol, step(q.y, 0.022));
      const farCol = mix(mix(mix(mix(mix(mix(torsoCol, legsCol, isLeg), shoeCol, isShoe), sleeveCol, isArm), skinCol, isHand), headCol, isHead), hairPartCol, isHairPart);
      return vec4(mix(farCol, extraCol, isExtra), roughnessVal);
    })()), "vPersonFarSurface2");
    mat.colorNode = vFar.xyz;
    mat.roughnessNode = vFar.w;
    return mat;
  }

  const vPartA = varying(vertexStage(vec4(
    mix(mix(mix(mix(mix(coatCol, legsCol, isLeg), upperCol, isShoe), skinCol, max(isHand, isHead)), hairCol, isHairPart), extraCol, isExtra),
    mix(mix(tailored, sneaker, isShoe), bald, max(isHead, isHairPart)))), "vPersonPartA2");
  const vPartB = varying(vertexStage(vec4(mix(mix(mix(mix(shirtCol, soleCol, isShoe), cuffCol, isArm), hairCol, isHead), skinCol, isHairPart), hemY)), "vPersonPartB2");
  const vPartC = varying(vertexStage(vec4(mix(legsCol, skinCol, step(1.18, posAttr.y)), partV)), "vPersonPartC2");
  const vLocal = varying(vertexStage(vec4(mix(posAttr.x, extraAttr.z, isArm), posAttr.y, posAttr.z, roughnessVal)), "vPersonLocal2");

  mat.colorNode = Fn(() => {
    const pId = vPartC.w;
    const colA = vPartA.xyz, colB = vPartB.xyz, param0 = vPartA.w, q = vLocal.xyz;
    const outCol = vec3(colA).toVar();
    If(pId.lessThan(0.5), () => {
      const isTailored = param0, coatHemY = vPartB.w;
      const chestFront = smoothstep(0.035, 0.075, q.z);
      const opening = q.y.sub(1.33).mul(0.42);
      const shirtV = smoothstep(1.33, 1.35, q.y).mul(smoothstep(0.004, 0.0, abs(q.x).sub(opening))).mul(chestFront).mul(isTailored);
      const lapel = smoothstep(0.024, 0.009, abs(abs(q.x).sub(opening))).mul(smoothstep(1.32, 1.37, q.y)).mul(chestFront).mul(isTailored).mul(float(1.0).sub(shirtV));
      const zip = smoothstep(0.006, 0.0025, abs(q.x)).mul(chestFront).mul(float(1.0).sub(isTailored));
      const collarBand = smoothstep(1.455, 1.48, q.y).mul(float(1.0).sub(isTailored));
      const neckLine = mix(1.5, 1.49, isTailored);
      const neck = smoothstep(neckLine.sub(0.004), neckLine.add(0.004), q.y);
      const hem = smoothstep(coatHemY.sub(0.004), coatHemY.add(0.004), q.y);
      const hemShade = smoothstep(coatHemY.add(0.035), coatHemY, q.y).mul(0.12);
      const jacketCol = mix(colA.mul(float(1.0).sub(lapel.mul(0.25)).sub(zip.mul(0.4)).sub(collarBand.mul(0.15)).sub(hemShade)), colB, shirtV);
      outCol.assign(mix(mix(vPartC.xyz, jacketCol, hem), vPartC.xyz, neck));
    }).ElseIf(pId.lessThan(1.5), () => {
      const crease = smoothstep(0.004, 0.0, abs(abs(q.x).sub(0.09))).mul(step(0.0, q.z)).mul(0.08);
      outCol.assign(colA.mul(float(1.0).sub(crease)));
    }).ElseIf(pId.lessThan(2.5), () => {
      const sole = smoothstep(0.024, 0.016, q.y);
      const laces = smoothstep(0.6, 0.75, fract(q.z.mul(80.0))).mul(step(abs(abs(q.x).sub(0.09)), 0.016)).mul(step(0.0, q.z)).mul(step(q.z, 0.09)).mul(step(0.075, q.y)).mul(param0);
      outCol.assign(mix(mix(colA, colB, sole), color(0xb8b4aa), laces.mul(0.6)));
    }).ElseIf(pId.lessThan(3.5), () => {
      outCol.assign(mix(colA, colB, smoothstep(0.93, 0.96, q.x)));
    }).ElseIf(pId.greaterThan(7.5), () => {
      // the new parts: knit ribs on hats / scarves, a seam on coats and skirts, plain otherwise
      const rib = sin(q.x.mul(260.0).add(q.z.mul(260.0))).mul(0.05).add(0.97);
      outCol.assign(colA.mul(mix(float(1), rib, step(abs(pId.sub(8.5)), 0.6))));
    }).ElseIf(pId.greaterThan(5.5), () => {
      const hairStrands = colA.mul(sin(q.x.mul(170.0).add(q.z.mul(130.0))).mul(0.06).add(0.97));
      outCol.assign(mix(hairStrands, colB, param0.mul(step(q.y, 1.755))));
    }).ElseIf(pId.greaterThan(4.5), () => {
      const isBald = param0;
      const hd = normalize(vec2(q.x, q.z.add(0.01)));
      const hairline = hd.y.mul(0.055).add(1.62).sub(hd.x.mul(hd.x).sub(hd.y.mul(hd.y)).mul(0.005)).add(isBald.mul(0.3));
      const hairMask = smoothstep(hairline.sub(0.004), hairline.add(0.004), q.y);
      const front = smoothstep(0.06, 0.08, q.z);
      const eyeX = abs(abs(q.x).sub(0.031));
      const eyes = smoothstep(0.011, 0.006, eyeX).mul(smoothstep(0.0055, 0.002, abs(q.y.sub(1.627)))).mul(front);
      const brows = smoothstep(0.016, 0.01, eyeX).mul(smoothstep(0.0035, 0.0012, abs(q.y.sub(1.646)))).mul(front);
      const mouth = smoothstep(0.022, 0.014, abs(q.x)).mul(smoothstep(0.0045, 0.0015, abs(q.y.sub(1.549)))).mul(front);
      const faceCol = mix(colA.mul(float(1.0).sub(eyes.mul(0.7)).sub(brows.mul(0.45))), colA.mul(color(0xb06a5c)).mul(1.15), mouth.mul(0.7));
      outCol.assign(mix(faceCol, colB, hairMask));
    });
    return outCol;
  })();
  mat.roughnessNode = vLocal.w;
  return mat;
}
