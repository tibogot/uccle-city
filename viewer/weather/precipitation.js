// FALLING THINGS: rain streaks + splashes, snow flakes, autumn leaves. GPU only: positions live in a storage buffer,
// a compute pass moves them (wind, fall speed, wobble / tumble), wraps them round a window that follows the camera
// (constant population: game-engine-v1 modularRoadWorldRain.js PORT NOTE 4) and collides them with the overhead map
// (one texture fetch: overheadMap.js). The draw is ONE instanced mesh per kind whose instance count follows the
// intensity (the population is allocated once at MAX; the draw just draws fewer). CPU per frame: a few uniforms.
//
// Anti-aliasing (the flicker test, no crawling dots): every streak / flake is drawn at least ~1.5 px wide, its alpha
// scaled down by how much it was widened (the same energy, never a sub-pixel speck that blinks between pixels); a
// circular soft edge at the window's border (the square never shows); a near fade (a drop on the lens is a smear).
import * as THREE from "three/webgpu";
import { Fn, If, float, vec2, vec3, vec4, uniform, instancedArray, instanceIndex, hash, mix, smoothstep, clamp, max, min, abs, sin, cos,
  normalize, cross, length, mod, select, uv, positionGeometry, cameraPosition, varying, attribute, positionWorld, cameraViewMatrix, sqrt } from "three/tsl";
import { wx } from "./weatherState.js";
import { season } from "../seasons/season.js";

const KIND = {
  rain: { max: 24000, box: 44, top: 22, fall: 8.5, size: 0.006, len: 0.55 },
  snow: { max: 64000, box: 24, top: 12, fall: 1.0, size: 0.017, len: 0 },
  leaves: { max: 900, box: 60, top: 14, fall: 1.1, size: 0.05, len: 0 },
};

/**
 * kind: "rain" | "snow" | "leaves". map: the overhead map. trees (leaves): [{ x, z, r, y }] crown centres.
 * Returns { mesh, splashes (rain), update(camera, dt, intensity), dispose }.
 */
export function createPrecipitation({ renderer, kind = "rain", map = null, trees = [] }) {
  const K = KIND[kind];
  const MAX = K.max;
  const pos = instancedArray(MAX, "vec4");          // xyz + seed
  const spl = kind === "rain" ? instancedArray(MAX, "vec4") : null;   // splash xyz + age (0..1, >= 1 dead)
  const uCam = uniform(new THREE.Vector3());
  const uDt = uniform(0);
  const uFrame = uniform(0);
  const uBox = uniform(K.box), uTop = uniform(K.top), uFall = uniform(K.fall);
  const uSize = uniform(K.size), uLen = uniform(K.len), uOpacity = uniform(kind === "rain" ? 0.22 : 0.85);
  const uPx = uniform(0.001);                       // metres per pixel at 1 m (2 tan(fov/2) / height)
  const uRight = uniform(new THREE.Vector3(1, 0, 0)), uUp = uniform(new THREE.Vector3(0, 1, 0));
  const uColor = uniform(new THREE.Color(0.6, 0.65, 0.7));
  const uGroundY = uniform(0);
  const NT = Math.min(8, trees.length);
  const treeU = trees.slice(0, 8).map((t) => uniform(new THREE.Vector4(t.x, t.z, t.r, t.y)));

  // per particle x per frame random: a per-particle hash moved along a golden-ratio sequence by the frame number
  // (hashing instanceIndex + frame x prime directly ran past float precision: every particle got the same value)
  const rnd = (k) => hash(instanceIndex.add(k * 1009)).add(uFrame.mul(0.61803398875).add(k * 0.137)).fract();
  const floorAt = (xz) => {
    if (!map) return uGroundY;
    const s = map.sample(xz);
    return select(map.inside(xz), s.x, uGroundY);
  };
  const spawnXZ = (k) => {
    if (kind !== "leaves" || NT === 0) return vec2(rnd(k).sub(0.5), rnd(k + 1).sub(0.5)).mul(uBox).add(uCam.xz);
    // leaves: from a random crown
    const pick = rnd(k + 2).mul(NT).floor();
    let t = treeU[0];
    for (let i = 1; i < NT; i++) t = select(pick.equal(i), treeU[i], t);
    const a = rnd(k).mul(6.2832), r = sqrt(rnd(k + 1)).mul(t.z);
    return vec2(t.x.add(cos(a).mul(r)), t.y.add(sin(a).mul(r)));
  };
  const spawnY = (xz, k) => {
    if (kind !== "leaves" || NT === 0) return uCam.y.add(uTop.mul(rnd(k).mul(0.9).add(0.1)));
    let t = treeU[0];
    let best = float(1e9);
    let y = treeU[0].w;
    for (let i = 0; i < NT; i++) { const d = length(xz.sub(treeU[i].xy)); y = select(d.lessThan(best), treeU[i].w, y); best = min(best, d); }
    return y.add(rnd(k).sub(0.5).mul(4));
  };

  const init = Fn(() => {
    const p = pos.element(instanceIndex);
    const xz = spawnXZ(1);
    const y = kind === "leaves" ? floorAt(xz).sub(50) : max(floorAt(xz).add(0.1), uCam.y.sub(2)).add(rnd(5).mul(uTop));   // spread through the column at once
    p.assign(vec4(xz.x, y, xz.y, hash(instanceIndex.add(12345))));
    if (spl) spl.element(instanceIndex).assign(vec4(0, -1e4, 0, 2));
  })().compute(MAX);

  const step = Fn(() => {
    const p = pos.element(instanceIndex);
    const P = p.xyz.toVar();
    const seed = p.w;
    const t = wx.uTime;
    let v;
    if (kind === "rain") v = vec3(wx.uWind.x, uFall.mul(seed.mul(0.3).add(0.85)).negate(), wx.uWind.y);
    else if (kind === "snow") {
      // flakes: slow, wobbling, carried by the wind (and gusts)
      const w = sin(t.mul(seed.mul(1.3).add(0.7)).add(seed.mul(40))).mul(0.45);
      const w2 = cos(t.mul(seed.mul(0.9).add(0.5)).add(seed.mul(17))).mul(0.45);
      v = vec3(wx.uWind.x.mul(0.9).add(w), uFall.mul(seed.mul(0.5).add(0.75)).negate(), wx.uWind.y.mul(0.9).add(w2));
    } else {
      const w = sin(t.mul(seed.mul(2.1).add(1.1)).add(seed.mul(40))).mul(0.9);
      v = vec3(wx.uWind.x.mul(0.6).add(w), uFall.mul(seed.mul(0.6).add(0.7)).negate().mul(sin(t.mul(3.0).add(seed.mul(9))).mul(0.4).add(1.0)), wx.uWind.y.mul(0.6).add(cos(t.mul(1.7).add(seed.mul(5))).mul(0.6)));
    }
    P.addAssign(v.mul(uDt));
    const wrapped = float(0).toVar();
    if (kind !== "leaves") {
      // wrap round the window that follows the camera
      const raw = P.xz.sub(uCam.xz);
      const rel = mod(raw.add(uBox.mul(0.5)), uBox).sub(uBox.mul(0.5));
      wrapped.assign(select(length(rel.sub(raw)).greaterThan(1.0), float(1), float(0)));
      P.x.assign(uCam.x.add(rel.x)); P.z.assign(uCam.z.add(rel.y));
    }
    const fy = floorAt(P.xz);
    const hit = P.y.lessThan(fy);
    const lost = kind === "leaves" ? P.y.lessThan(fy.sub(0.5)) : P.y.lessThan(uCam.y.sub(25)).or(P.y.greaterThan(uCam.y.add(uTop).add(15)));
    If(hit.or(lost), () => {
      if (spl) If(hit.and(P.y.greaterThan(fy.sub(1.5))), () => { spl.element(instanceIndex).assign(vec4(P.x, fy.add(0.01), P.z, 0)); });
      if (kind === "leaves") {
        // a landed leaf rests ~a minute (it lies there) then a new one leaves a crown
        If(lost.or(rnd(11).lessThan(uDt.mul(0.05))), () => {
          const xz = spawnXZ(3);
          P.assign(vec3(xz.x, spawnY(xz, 7), xz.y));
        }).Else(() => { P.y.assign(fy.add(0.02)); });
      } else {
        // fell onto a surface: a new drop at the top. Wrapped INTO a building (wind carries it across the window's
        // border): somewhere in the open column instead, else the street in the lee of the houses empties
        const xz = spawnXZ(3);
        const f2 = floorAt(xz);
        const lo = max(f2.add(0.2), uCam.y.sub(2.0)), hi = uCam.y.add(uTop);
        const yTop = uCam.y.add(uTop.mul(rnd(9).mul(0.25).add(0.75)));
        const yCol = lo.add(rnd(10).mul(max(hi.sub(lo), 0.5)));
        P.assign(vec3(xz.x, select(wrapped.greaterThan(0.5).or(lost), yCol, yTop), xz.y));
      }
    });
    p.assign(vec4(P, seed));
    if (spl) { const s = spl.element(instanceIndex); s.w.assign(s.w.add(uDt.mul(seed.mul(1.2).add(2.8)))); }
  })().compute(MAX);

  // ------------------------------------------------------------------ the draw
  let geo, mat;
  const P = pos.element(instanceIndex);
  const C = P.xyz;
  const toCam = cameraPosition.sub(C);
  const dist = length(toCam);
  const rel = C.xz.sub(cameraPosition.xz);
  const edge = float(1).sub(smoothstep(uBox.mul(0.5 * 0.55), uBox.mul(0.5 * 0.98), length(rel)));
  if (kind === "rain") {
    geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const vel = normalize(vec3(wx.uWind.x, uFall.negate(), wx.uWind.y));
    const side = normalize(cross(vel, normalize(toCam)));
    const wPx = dist.mul(uPx).mul(1.4);                       // >= 1.4 px wide
    const w = max(uSize, wPx);
    const pos3 = C.add(vel.mul(positionGeometry.y.sub(0.5).mul(uLen))).add(side.mul(positionGeometry.x.mul(w)));
    mat.positionNode = pos3;
    const energy = varying(uSize.div(w).mul(edge).mul(smoothstep(1.0, 3.5, dist)));
    const f = uv();
    const across = smoothstep(1.0, 0.0, abs(f.x.mul(2).sub(1)));
    const along = sin(f.y.mul(3.1416));
    mat.colorNode = vec3(uColor);
    mat.opacityNode = across.mul(along).mul(energy).mul(uOpacity);
  } else if (kind === "snow") {
    geo = new THREE.PlaneGeometry(1, 1);
    mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const s0 = uSize.mul(P.w.mul(0.9).add(0.6));
    const sPx = dist.mul(uPx).mul(1.6);
    const s = max(s0, sPx);
    // motion blur (the night photo, Av. Churchill: flakes near the lamps are short streaks): stretched along the
    // flake's velocity by ~1/40 s of travel
    const vel = vec3(wx.uWind.x.mul(0.9), uFall.negate(), wx.uWind.y.mul(0.9));
    const vdir = normalize(vel), sideF = normalize(cross(vdir, normalize(toCam)));
    const sLen = s.add(length(vel).mul(0.025));
    mat.positionNode = C.add(sideF.mul(positionGeometry.x.mul(s))).add(vdir.mul(positionGeometry.y.mul(sLen)));
    const energy = varying(s0.div(s).mul(edge).mul(smoothstep(0.4, 1.5, dist)));   // widened -> fainter (linear: a 1.6 px dot keeps its look)
    const q = uv().sub(0.5).mul(2);
    const r = length(vec2(q.x, q.y.mul(0.85)));
    mat.colorNode = vec3(uColor);
    mat.opacityNode = smoothstep(1.0, 0.2, r).mul(energy).mul(uOpacity);
  } else {
    geo = new THREE.PlaneGeometry(1, 1);
    mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.75, alphaTest: 0.5 });
    // a tumbling leaf: the quad spins about a per-leaf axis
    const seed = P.w;
    const a = wx.uTime.mul(seed.mul(3).add(1.5)).add(seed.mul(50));
    const ax = normalize(vec3(sin(seed.mul(13)), cos(seed.mul(7)), sin(seed.mul(3))));
    const g = positionGeometry.mul(uSize.mul(seed.mul(0.5).add(0.75)));
    const rot = (q) => q.mul(cos(a)).add(cross(ax, q).mul(sin(a))).add(ax.mul(ax.dot(q)).mul(float(1).sub(cos(a))));
    mat.positionNode = C.add(rot(g));
    mat.normalNode = normalize(cameraViewMatrix.mul(vec4(rot(vec3(0, 0, 1)), 0)).xyz);
    const f = uv().sub(0.5);
    const leafShape = smoothstep(0.5, 0.42, length(f.mul(vec2(1.7, 1.0))).add(abs(f.x).mul(0.3)));
    const k = seed.mul(97.0).fract();
    const lc = mix(mix(vec3(0.42, 0.25, 0.02), vec3(0.45, 0.12, 0.02), k), vec3(0.2, 0.08, 0.02), smoothstep(0.8, 1.0, k));
    mat.colorNode = lc;
    mat.opacityNode = leafShape;
  }
  mat.fog = false;
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.frustumCulled = false; mesh.count = 0;
  mesh.renderOrder = 10;
  if (kind === "leaves") mesh.castShadow = false;

  // splashes: a flat ring + a small upright crown (billboarded about y), paired with the drops
  let splashes = null;
  if (spl) {
    const g = new THREE.BufferGeometry();
    const q = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]], q2 = [[-0.5, 0, 0], [0.5, 0, 0], [0.5, 1, 0], [-0.5, 1, 0]];
    const pa = [], ua = [], pt = [];
    for (const [quad, part] of [[q, 0], [q2, 1]]) for (const i of [0, 1, 2, 0, 2, 3]) { pa.push(...quad[i]); ua.push([0, 1, 1, 0][i] ?? 0, [0, 0, 1, 1][i] ?? 0); pt.push(part); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pa, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(ua, 2));
    g.setAttribute("part", new THREE.Float32BufferAttribute(pt, 1));
    const sm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const S = spl.element(instanceIndex);
    const age = S.w;
    const part = attribute("part", "float");
    const sz = float(0.22).mul(age.mul(0.7).add(0.3));
    const dir = normalize(vec3(cameraPosition.x.sub(S.x), 0, cameraPosition.z.sub(S.z)).add(vec3(1e-4, 0, 0)));
    const sideV = vec3(dir.z.negate(), 0, dir.x);
    const flat = vec3(positionGeometry.x, 0, positionGeometry.z).mul(sz);
    const crown = sideV.mul(positionGeometry.x.mul(0.09)).add(vec3(0, positionGeometry.y.mul(0.07).mul(float(1).sub(age).mul(0.8).add(0.2)), 0));
    const dS = length(cameraPosition.sub(S.xyz));
    const alive = age.lessThan(1).select(1, 0);
    sm.positionNode = S.xyz.add(mix(flat, crown, part)).add(vec3(0, alive.sub(1).mul(1e4), 0));
    const f = uv().sub(0.5).mul(2);
    const r = length(f);
    const ring = smoothstep(0.25, 0.0, abs(r.sub(age.mul(0.8).add(0.15)))).mul(smoothstep(1.0, 0.9, r));
    const crownA = smoothstep(1.0, 0.3, abs(f.x)).mul(smoothstep(1.0, 0.2, uv().y)).mul(smoothstep(0.55, 0.0, age));
    // splashes are 5-20 cm: fade them before they shrink under ~3 px (no sparkle far away)
    const pxFade = varying(smoothstep(0.012, 0.004, dS.mul(uPx)).mul(edge));
    sm.colorNode = vec3(uColor).mul(1.25);
    sm.opacityNode = mix(ring.mul(0.5), crownA.mul(0.6), part).mul(float(1).sub(age)).mul(pxFade).mul(wx.uRain.mul(1.5).min(1)).mul(0.9);
    sm.fog = false;
    splashes = new THREE.InstancedMesh(g, sm, MAX);
    splashes.frustumCulled = false; splashes.count = 0; splashes.renderOrder = 9;
  }

  let initialised = false, frame = 0;
  const _r = new THREE.Vector3(), _u = new THREE.Vector3();
  return {
    mesh, splashes, pos, uColor, uOpacity, uSize, uLen, uFall, uBox, uGroundY, max: MAX, kind,
    /** intensity 0..1 -> the drawn count; dt in seconds (0 = frozen) */
    update(camera, dt, intensity, H) {
      const n0 = Math.round(MAX * Math.min(1, Math.max(0, intensity)));
      uCam.value.copy(camera.position);
      // (re)fill the whole column round the camera when the kind starts (else it starts as one sheet at the top)
      if (!initialised || (n0 > 0 && !this.active)) { renderer.compute(init); initialised = true; }
      this.active = n0 > 0;
      uDt.value = Math.min(dt, 0.05);
      uFrame.value = (++frame % 1000);
      uPx.value = 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, H);
      _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
      uRight.value.copy(_r); uUp.value.copy(_u);
      const n = Math.round(MAX * Math.min(1, Math.max(0, intensity)));
      mesh.count = n; mesh.visible = n > 0;
      if (splashes) { splashes.count = n; splashes.visible = n > 0; }
      if (n > 0 && dt > 0) renderer.compute(step);
    },
    /** compile both compute passes now (boot), so the first rain does not stall on a pipeline build */
    warm() { renderer.compute(init); initialised = true; uDt.value = 0; renderer.compute(step); },
    /** leaves: move the crown centres (the city's sliding overhead map), [{ x, z, r, y }] up to 8 */
    setTrees(list) { for (let i = 0; i < treeU.length; i++) { const t = list[i % Math.max(1, list.length)]; if (t) treeU[i].value.set(t.x, t.z, t.r, t.y); } },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
