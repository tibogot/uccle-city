// THE CITY'S GARDEN PLANTS: one material per LOD for ALL the plant types (docs/FOLIAGE.md "City"), so the kit's
// pools merge into one multi-draw object per LOD (viewer/multiDraw.js mergeStreamPools: 8 types = 8 indirect draws of
// one render object). The Foliage Lab's plant shading (viewer/foliage/plants.js material()) on instanced attributes
// instead of the lab's storage buffers:
//   iPlant = (type, yaw, scale, rnd)     iBand = (LOD 0->1, LOD 1->2, end (m), the tile's fade slot)
//   per type (uniform arrays, written on the CPU when the season changes): height, evergreen, brown heads, grey spikes;
//   the season per type: leaf amount, bloom, browned heads kept, the whole plant's size (bulbs, window-box geraniums)
// NOTE (three r187 NodeMaterial.setupPosition): the instance matrix is applied BEFORE material.positionNode, so
// positionLocal / normalLocal there are already the instance-transformed (= world: the pools sit at the origin) ones;
// the seasonal shrink and the wind are added as world offsets (yaw + scale from iPlant).
// Small plants never cast shadows; they receive the sun's. LOD hand-overs and the tile fade: the per-pixel dither of
// viewer/lodFade.js in a band round each switch (no pop). Weather: wet (wxMat: darker, glossier), snow on the
// up-facing crown (season.uSnow, driven by the city weather; snow caps on the shrubs: viewer/weather/cityCaps.js).
import * as THREE from "three/webgpu";
import {
  attribute, uniformArray, vec2, vec3, vec4, float, int, mix, smoothstep, length, normalize, max, clamp, select, sin, cos, step,
  positionLocal, normalLocal, positionWorld, cameraPosition, cameraViewMatrix, varying, sign, dot, fwidth, positionView,
} from "three/tsl";
import { season } from "../foliage/seasons.js";
import { wind, windAt } from "../foliage/wind.js";
import { noiseAt } from "../foliage/noise.js";
import { lodEye, ditherNoise, keepBand } from "../lodFade.js";
import { FadeSlots } from "../instanceStream.js";
import { wxMat } from "../weather/cityWeatherize.js";
import { vertexLit, foliageLights } from "../foliage/vertexLight.js";
import { addLampLight } from "../lampLight.js";

export const PLANT_TYPES = ["box_ball", "laurel", "rhododendron", "hydrangea", "rose", "lavender", "bulbs", "geranium"];
/** the plants' tile fades: iBand.w = the instance's tile slot */
export const plantFades = new FadeSlots();

// per type: sRGB leaf, flower palettes (A, B), behaviour (the Foliage Lab's TYPES, viewer/foliage/plants.js)
const T = {
  box_ball:     { leaf: "#4a6e2c", fa: ["#3a5a22"], ever: 1 },
  laurel:       { leaf: "#3c6328", fa: ["#e8ecd8"], ever: 1 },
  rhododendron: { leaf: "#41612c", fa: ["#c4417e", "#d86aa0", "#9b4fb8", "#e8e4ea"], ever: 1, shell: 0.4 },
  hydrangea:    { leaf: "#5a8a36", fa: ["#6f8fd8", "#e07aa8", "#f0eee6", "#9a7fd0"], ever: 0, brown: 1, shell: 0.5 },
  rose:         { leaf: "#47702c", fa: ["#b0102a", "#e86a8a", "#f2efe4", "#f0c040", "#e88050"], ever: 0, shell: 0.18 },
  lavender:     { leaf: "#9aab8e", fa: ["#7a5cc0", "#8a6ad0"], ever: 1, grey: 1, shell: 0.65 },
  bulbs:        { leaf: "#6a9a3a", fa: ["#d01c1c", "#f2c21a", "#e86aa0", "#f4f0e8"], fb: ["#f2d21a", "#f8f0c8"], ever: 0 },
  geranium:     { leaf: "#5a8a30", fa: ["#d4142a", "#e84a6a", "#f05a3a", "#f4f0ec"], ever: 1 },
};
const NF = 5;
const col = (h) => new THREE.Color(h);
const uLeaf = uniformArray(PLANT_TYPES.map((t) => col(T[t].leaf)), "color");
const palette = (k) => PLANT_TYPES.flatMap((t) => { const a = T[t][k] || T[t].fa; return Array.from({ length: NF }, (_, i) => col(a[Math.min(i, a.length - 1)])); });
const uFA = uniformArray(palette("fa"), "color"), uFB = uniformArray(palette("fb"), "color");
/** (height of the model, flowers in the palette, evergreen, shell bloom patch) */
export const uType = uniformArray(PLANT_TYPES.map(() => new THREE.Vector4()), "vec4");
/** (brown heads, grey spikes, -, -) */
const uFlag = uniformArray(PLANT_TYPES.map((t) => new THREE.Vector4(T[t].brown || 0, T[t].grey || 0, 0, 0)), "vec4");
/** the season per type: (leaf amount, bloom, browned heads kept, whole plant 0..1) */
export const uSeason = uniformArray(PLANT_TYPES.map(() => new THREE.Vector4(1, 1, 0, 1)), "vec4");
export const plantU = { dbg: uniformArray([0], "float") };

/** the model heights (from the loaded library) into uType */
export function setTypeHeights(heights) {
  PLANT_TYPES.forEach((t, i) => uType.array[i].set(heights[t] || 1, T[t].fa.length, T[t].ever, T[t].shell || 0));
}

// spring / early summer blooms the lab tied to other keys (rhododendron Apr-Jun, cherry laurel candles Apr-May)
const BLOOM = {
  //           Jan Feb Mar  Apr  May  Jun  Jul Aug Sep Oct Nov Dec
  rhododendron: [0, 0, 0.05, 0.45, 1.0, 0.55, 0.05, 0, 0, 0, 0, 0],
  laurel:       [0, 0, 0.0, 0.6, 0.9, 0.2, 0, 0, 0, 0, 0, 0],
};
const sampleM = (arr, month) => { const m = (((month - 1) % 12) + 12) % 12, i = Math.floor(m), f = m - i; return arr[i] + (arr[(i + 1) % 12] - arr[i]) * f; };

/** the per-type season (CPU, when the month changes): from the foliage season (viewer/foliage/seasons.js) */
export function applyPlantSeason() {
  const S = season.u, mo = season.month;
  const v = (t) => uSeason.array[PLANT_TYPES.indexOf(t)];
  const leaf = S.leaf.value;
  v("box_ball").set(1, 1, 0, 1);
  v("laurel").set(1, sampleM(BLOOM.laurel, mo), 0, 1);
  v("rhododendron").set(1, sampleM(BLOOM.rhododendron, mo), 0, 1);
  v("hydrangea").set(leaf, S.hydrangea.value, S.hydBrown.value, 1);
  v("rose").set(leaf, S.rose.value, 0, 1);
  v("lavender").set(1, S.lavender.value, 0, 1);
  const bulbs = S.bulbs.value;
  v("bulbs").set(1, 1, 0, Math.min(1, Math.max(0, (bulbs - 0.05) / 0.3)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (bulbs - 0.05) / 0.3))));
  // window-box geraniums: full May-October, cut back (small leaf clumps) in winter
  const g = S.geranium.value;
  v("geranium").set(1, g, 0, 0.45 + 0.55 * Math.min(1, g / 0.5));
}

/** the kit's LOD keep (viewer/gardens/gardenKit.js lodKeep): the per-pixel band hand-over + the tile fade */
function lodKeep(lod, band, n = ditherNoise()) {
  const d = length(positionWorld.sub(lodEye));
  const t1 = smoothstep(band.x.mul(0.9), band.x.mul(1.1), d), t2 = smoothstep(band.y.mul(0.9), band.y.mul(1.1), d), e = smoothstep(band.z.mul(0.8), band.z, d);
  const f = plantFades.fade(band.w);
  const tile = select(f.greaterThan(1.5), n.greaterThanEqual(f.sub(2)), n.lessThan(f));
  const k = lod === 0 ? keepBand(t1, float(1.01), n) : lod === 1 ? keepBand(t2, t1, n) : keepBand(e, t2, n);
  return k.and(tile);
}

const mats = [];
/** the material of LOD 0, 1 or 2 (made once) */
export function plantMaterial(lod) {
  if (mats[lod]) return mats[lod];
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, metalness: 0 });
  const I = attribute("iPlant", "vec4");
  const ti = I.x.add(0.5).floor().toInt(), yaw = I.y, sc = I.z, rnd = I.w;
  const TY = uType.element(ti), SE = uSeason.element(ti), FL = uFlag.element(ti);
  const H = TY.x;
  const p0 = attribute("position", "vec3"), pd = attribute("pdat", "vec3"), pb = attribute("pbase", "vec4");
  const slot = pd.z, ao = pd.x, prnd = pd.y, kind = pb.w;
  const base = pb.xyz;
  const isLeaf = step(0.5, kind).mul(step(kind, 1.5)), isFlower = step(1.5, kind).mul(step(kind, 2.5));
  // seasonal shrink of a part toward its own base: leaves by the leaf amount (each its own threshold), flowers by the
  // bloom (browned hydrangea heads stay), the whole plant (bulbs, cut-back geraniums)
  let partK = mix(float(1), smoothstep(prnd.sub(0.15), prnd.add(0.05), SE.x), isLeaf);
  partK = mix(partK, max(smoothstep(prnd.mul(0.7), prnd.mul(0.7).add(0.3), SE.y), SE.z), isFlower);
  partK = partK.mul(SE.w);
  const local = mix(base, p0, partK);
  // wind: the plant leans from its foot (height²), leaves / florets flutter about their base
  const c = cos(yaw), s = sin(yaw);
  const rot = (v) => vec3(v.x.mul(c).add(v.z.mul(s)), v.y, v.x.mul(s).negate().add(v.z.mul(c)));
  const root = positionLocal.sub(rot(p0.mul(sc)));
  const w = windAt(root.xz);
  const hN = clamp(p0.y.div(H), 0, 1.2);
  const flutter = sin(wind.uTime.mul(7.0).add(prnd.mul(40))).mul(w.z.mul(0.25).add(0.08)).mul(wind.uStrength);
  const leafOff = p0.sub(base).mul(flutter.mul(0.25)).mul(isLeaf.add(isFlower));
  const lean = w.xy.mul(hN.mul(hN)).mul(H.mul(sc).mul(0.18));
  // the shells' outline: lumps along the radial direction from the crown's middle (one per position: no crack) (~25 cm clusters, +-7 % of the height): no smooth egg silhouette
  const isShell = step(2.5, kind);
  const lump = noiseAt(p0.xz.mul(1.3).add(p0.y.mul(0.9)).add(rnd.mul(13)), 1 / 0.6, true).a.sub(0.5).mul(H.mul(0.14)).mul(isShell);
  m.positionNode = positionLocal.add(rot(local.sub(p0).add(leafOff).add(normalize(p0.sub(vec3(0, H.mul(0.45), 0)).add(vec3(0, 1e-4, 0))).mul(lump)).mul(sc))).add(vec3(lean.x, 0, lean.y));
  // CROWN NORMALS (the lab's): leaves lit partly as the crown's ellipsoid, more with distance (tiny flat leaves flip
  // light / dark as the camera moves otherwise)
  const nF = normalize(normalLocal);
  const crownC = root.add(vec3(0, H.mul(sc).mul(0.45), 0));
  const crownN = normalize(positionLocal.sub(crownC).mul(vec3(1, 1.4, 1)).add(vec3(0, 0.25, 0)));
  const dCam = length(cameraPosition.sub(root));
  const kCrown = mix(float(0.35), float(0.9), smoothstep(3, 12, dCam)).mul(isLeaf.add(isFlower).add(step(2.5, kind)).min(1));
  const nWv = normalize(mix(nF.mul(sign(dot(nF, crownN)).add(0.001)), crownN, kCrown));
  const nW = varying(nWv, "v_plN");
  const nV = normalize(cameraViewMatrix.mul(vec4(nW, 0)).xyz);
  // colours per slot
  const S = season.u;
  const autumnC = vec3(col("#8a5a1e"));
  const lc0 = mix(uLeaf.element(ti), autumnC, S.autumn.mul(0.85).mul(float(1).sub(TY.z)));
  const lc = lc0.mul(prnd.sub(0.5).mul(mix(float(0.3), float(0.08), smoothstep(4, 14, dCam))).add(1)).mul(noiseAt(root.xz, 1 / 3, true).b.mul(0.3).add(0.85)).mul(rnd.sub(0.5).mul(0.16).add(1));
  const nfl = TY.y.add(0.5).floor();
  const fi = ti.mul(NF).add(rnd.mul(nfl).floor().min(nfl.sub(1)).toInt());
  let fa = vec3(uFA.element(fi));
  fa = mix(fa, vec3(0.42, 0.3, 0.2), SE.z.mul(FL.x));                                       // hydrangea heads brown
  fa = mix(fa, mix(vec3(0.42, 0.45, 0.38), fa, smoothstep(0.1, 0.6, SE.y)), FL.y);          // lavender spikes grey out
  const fb = vec3(uFB.element(fi));
  const stemC = vec3(0.16, 0.2, 0.06);
  const mn = noiseAt(p0.xz.add(p0.y).add(rnd.mul(17)), 1 / 0.3, true);
  // the shell's leaf mass: a leaf-sized grain (crevices between leaf clusters), faded to its mean by its own footprint
  // (the lab's shell read as smooth painted plastic at 12-30 m)
  const gp = p0.xz.add(vec2(p0.y.mul(0.7), p0.y.mul(-0.4))).add(rnd.mul(11));
  const fine = noiseAt(gp, 1 / 0.09).a, fineFar = smoothstep(0.004, 0.02, length(fwidth(gp)));
  const mid = noiseAt(gp.add(5.7), 1 / 0.23).a;
  const crev = mix(smoothstep(0.22, 0.72, fine.mul(0.65).add(mid.mul(0.35))), float(0.55), fineFar);
  let massC = lc.mul(mn.a.mul(0.35).add(0.75));
  // the far shell keeps the blooms as patches (no colour pop at the LOD1 -> shell hand-over), upper half most
  const shellB = TY.w, bloomNow = max(SE.y, SE.z.mul(0.8).mul(FL.x));
  // (finer, softer than the lab's: its 0.3 m patches read as camouflage-painted eggs; flowers are clusters of florets)
  const pf = noiseAt(gp.add(3.1), 1 / 0.16).b;
  const patch = smoothstep(float(1).sub(shellB.mul(0.55)), float(1.12).sub(shellB.mul(0.4)), pf.mul(0.55).add(mn.b.mul(0.2)).add(clamp(p0.y.div(H), 0, 1).mul(0.4))).mul(bloomNow).mul(step(0.01, shellB)).mul(step(kind, 3.5)).mul(0.8);
  massC = mix(massC, fa.mul(0.85), patch);
  const centreC = vec3(0.95, 0.6, 0.05);
  const colr = select(slot.lessThan(0.5), lc, select(slot.lessThan(1.5), massC, select(slot.lessThan(2.5), stemC, select(slot.lessThan(3.5), fa, select(slot.lessThan(4.5), fb, centreC)))));
  // snow on the crown's up-facing side (the city weather drives season.uSnow)
  const snow = season.uSnow.mul(smoothstep(0.15, 0.7, nW.y)).mul(0.85);
  const isMass = slot.greaterThan(0.5).and(slot.lessThan(1.5));
  const grain = select(isMass, mix(float(0.36), float(1.18), crev), float(1));   // (fragment: fwidth)
  // (no derivative bump: dFdx over the 2x2 pixel quads drew blocky 2-pixel dots on the shells at 5-10 m)
  m.normalNode = nV;
  m.colorNode = mix(varying(colr.mul(ao), "v_plC").mul(grain), vec3(0.88, 0.9, 0.94), snow);
  m.roughnessNode = mix(select(slot.lessThan(0.5), float(0.55), float(0.75)), float(0.9), snow);
  m.maskNode = lodKeep(lod, attribute("iBand", "vec4"));
  // perf pass 3: the sun per vertex, sun + sky only (no pooled lamp point lights: the lamp light map at night)
  const snowV = season.uSnow.mul(smoothstep(0.15, 0.7, nWv.y)).mul(0.85);
  vertexLit(m, { normal: nWv, roughness: mix(select(slot.lessThan(0.5), float(0.55), float(0.75)), float(0.9), snowV) });
  if (foliageLights()) addLampLight(m);
  m.name = `plants-lod${lod}`;
  wxMat(m, { porosity: 0.15, snow: false });            // wet in rain (darker, glossier); the snow is ours
  m.userData.shared = true; m.userData.noFade = true;
  void int; void vec2;
  mats[lod] = m;
  return m;
}
