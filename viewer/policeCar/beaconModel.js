// THE MAGNETIC BLUE BEACON and the hidden flashers of the unmarked police car, scripted in JS (round, small, few parts:
// exact surfaces of revolution with smooth normals are simpler and cleaner here than a Blender round trip; the owner's
// rules hold: hard edges split by duplicated profile points, rounded edges by small bevel arcs, no fans on visible
// round faces (the only poles sit on hidden or flat tops), enough segments for a smooth silhouette at 30 cm).
//
// Sizes after the common magnetic beacons (Hella KL 7000 / RTK 7 class): rubber magnet foot 136 mm, black ABS housing
// 149 mm x 46 mm, blue polycarbonate dome 122 mm at its foot, 158 mm overall; inside, a rotating parabolic mirror round a
// vertical H1 bulb (ROTATING) or an octagonal tower of LED modules (LED). Fresnel flutes on the dome (36 vertical ribs,
// as real domes spread the beam vertically) are real geometry (radius modulated), not a texture.
// The cable: black, 4 mm, from the back of the housing across the roof, over the driver's door frame into the window
// gap (fitCar.js finds the path on each car type).
// Grille flashers: two LED heads (70 x 28 x 22 mm) just inboard of the head lamps; visor bar: a 460 mm LED bar inside
// the top of the windscreen, facing forward (both hidden by day when off: dark housings, clear lenses).
//
// All emission comes from ONE set of uniforms (beaconU), written each frame from pattern.js lampState() by the kit.
import * as THREE from "three/webgpu";
import { uniform, color, float, vec2, vec3, positionLocal, normalize, dot, max, pow, mix, smoothstep, fract, abs, uv, sin, cos } from "three/tsl";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const BLUE = new THREE.Color(0x1b4dff);          // the lamp's emitted blue (R65 blue, ~465 nm, a little cyan-free)

/** live uniforms (one player car): written by policeKit.js each frame */
export const beaconU = {
  angle: uniform(0),     // reflector azimuth (rad, beacon frame: 0 = +z forward, + toward +x = the car's left)
  rot: uniform(0),       // rotating-mode level 0..1 (the bulb is on)
  led: uniform(0),       // LED-mode flash 0..1
  gL: uniform(0), gR: uniform(0), visor: uniform(0),
  gain: uniform(1),      // emissive gain (day / night: the eye's adaptation is the tone mapper's; this keeps the lens readable by day)
};

// ------------------------------------------------------------------------------------------------ surfaces of revolution
/**
 * Revolve a profile [[r, y], ...] (bottom to top) round +y. Points repeated (same r, y twice) make a hard edge.
 * segs: segments round; ripple(theta, k) -> radius factor (flutes), k = profile index. Seam welded (indexed, wraps).
 * A point with r = 0 becomes a single pole.
 */
function revolve(profile, segs = 64, ripple = null) {
  const pos = [], idx = [], rows = [];
  for (let k = 0; k < profile.length; k++) {
    const [r, y] = profile[k];
    if (r <= 1e-6) { rows.push({ pole: pos.length / 3 }); pos.push(0, y, 0); continue; }
    const start = pos.length / 3;
    for (let s = 0; s < segs; s++) {
      const th = (s / segs) * Math.PI * 2, f = ripple ? ripple(th, k) : 1;
      pos.push(Math.sin(th) * r * f, y, Math.cos(th) * r * f);
    }
    rows.push({ start });
  }
  for (let k = 0; k < rows.length - 1; k++) {
    const a = rows[k], b = rows[k + 1];
    // a duplicated point (hard edge) is a zero-height band: skip it (its two rows only split the normals)
    if (profile[k][0] === profile[k + 1][0] && profile[k][1] === profile[k + 1][1]) continue;
    for (let s = 0; s < segs; s++) {
      const s1 = (s + 1) % segs;
      if (a.pole != null && b.pole != null) continue;
      if (a.pole != null) idx.push(a.pole, b.start + s1, b.start + s);
      else if (b.pole != null) idx.push(a.start + s, a.start + s1, b.pole);
      else idx.push(a.start + s, a.start + s1, b.start + s1, a.start + s, b.start + s1, b.start + s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();          // area-weighted over the welded ring; duplicated rows keep hard edges
  // revolve's winding: outward faces for a profile going up (r > 0): check one triangle and flip if needed
  return orientOutward(g);
}
function orientOutward(g) {
  const p = g.attributes.position, i = g.index.array, n = g.attributes.normal;
  let dotSum = 0;
  for (let t = 0; t < Math.min(i.length, 300); t += 3) {
    const a = i[t], x = p.getX(a), z = p.getZ(a);
    dotSum += n.getX(a) * x + n.getZ(a) * z;
  }
  if (dotSum < 0) {
    for (let t = 0; t < i.length; t += 3) { const s = i[t + 1]; i[t + 1] = i[t + 2]; i[t + 2] = s; }
    g.computeVertexNormals();
  }
  return g;
}
/** a rounded corner: arc from angle a0 to a1 (rad, 0 = +r, PI/2 = +y) round centre (cr, cy), n steps */
function arc(cr, cy, rad, a0, a1, n = 4) {
  const out = [];
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * (k / n); out.push([cr + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  return out;
}

// ------------------------------------------------------------------------------------------------ materials
let MATS = null;
export function beaconMaterials() {
  if (MATS) return MATS;
  const rubber = new THREE.MeshStandardNodeMaterial({ color: 0x0c0c0d, roughness: 0.92 });
  const abs_ = new THREE.MeshStandardNodeMaterial({ color: 0x141517, roughness: 0.48, metalness: 0.0 });
  const plate = new THREE.MeshStandardNodeMaterial({ color: 0x2a2c30, roughness: 0.6 });
  const chrome = new THREE.MeshStandardNodeMaterial({ color: 0xe9edf2, roughness: 0.06, metalness: 1 });
  const cable = new THREE.MeshStandardNodeMaterial({ color: 0x0e0e10, roughness: 0.55 });
  // the bulb: a quartz capsule round a filament, white-hot when on (the dome tints what we see blue)
  const bulb = new THREE.MeshStandardNodeMaterial({ color: 0xd8dde6, roughness: 0.05, metalness: 0 });
  bulb.emissiveNode = color(0xd4e2ff).mul(beaconU.rot.mul(beaconU.gain).mul(2.2));
  // the mirror's inner face also glows where it reflects the bulb (a cheap stand-in for the reflection of an emitter)
  const mirror = new THREE.MeshStandardNodeMaterial({ color: 0xdfe6ee, roughness: 0.05, metalness: 1 });
  mirror.emissiveNode = color(BLUE).mul(beaconU.rot.mul(beaconU.gain).mul(0.9));
  // LED modules: black PCB faces with three LED dots each (the dots by UV), lit by the LED flash
  const ledFace = new THREE.MeshStandardNodeMaterial({ color: 0x0b0d12, roughness: 0.35 });
  {
    const u = uv(), dots = smoothstep(0.32, 0.18, abs(fract(u.x.mul(3)).sub(0.5))).mul(smoothstep(0.42, 0.22, abs(u.y.sub(0.5))));
    ledFace.emissiveNode = color(BLUE).mul(dots.mul(beaconU.led).mul(beaconU.gain).mul(14));
  }
  // THE DOME: blue polycarbonate, see-through by alpha to coverage (one opaque draw, as the cars' glass), its
  // emission from the lamp inside: ROTATING = a lobe that follows the mirror (the beam passing through the dome wall)
  // + a faint all-round glow of the bulb; LED = the whole dome lights with the flash, brightest at the LED ring height
  const dome = new THREE.MeshStandardNodeMaterial({ color: 0x1238b8, roughness: 0.1, metalness: 0 });
  dome.alphaToCoverage = true;
  dome.opacityNode = float(0.62);
  {
    const p = positionLocal, d = normalize(vec2(p.x, p.z).add(vec2(1e-5, 0)));
    const c = dot(d, vec2(sin(beaconU.angle), cos(beaconU.angle)));
    const lobe = pow(max(c, 0), 10).mul(3.2).add(pow(max(c, 0), 2).mul(0.35));
    const band = smoothstep(0.055, 0.085, p.y).mul(smoothstep(0.15, 0.115, p.y));     // the beam / LED ring height
    const rot = beaconU.rot.mul(lobe.mul(band.mul(0.8).add(0.2)).add(0.06));
    const led = beaconU.led.mul(band.mul(1.6).add(0.45));
    dome.emissiveNode = color(BLUE).mul(rot.add(led).mul(beaconU.gain).mul(4.0));
  }
  // grille / visor lenses: clear when off (a hint of the blue LEDs behind), LED segments by UV
  const lens = (which, n) => {
    const m = new THREE.MeshStandardNodeMaterial({ color: 0x1a1f2a, roughness: 0.08, metalness: 0.2 });
    const seg = smoothstep(0.42, 0.25, abs(fract(uv().x.mul(n)).sub(0.5)));
    m.emissiveNode = color(BLUE).mul(seg.mul(0.75).add(0.25).mul(which).mul(beaconU.gain).mul(16));
    return m;
  };
  MATS = { rubber, abs: abs_, plate, chrome, cable, bulb, mirror, ledFace, dome,
    lensL: lens(beaconU.gL, 3), lensR: lens(beaconU.gR, 3), lensV: lens(beaconU.visor, 12) };
  for (const m of Object.values(MATS)) m.userData.shared = true;
  return MATS;
}

// ------------------------------------------------------------------------------------------------ the beacon
const SEGS = 96;
let GEO = null;
function beaconGeometry() {
  if (GEO) return GEO;
  // magnet foot (rubber), 6 mm, rounded rim
  const foot = revolve([[0, 0.0], [0.060, 0.0], ...arc(0.064, 0.003, 0.003, -Math.PI / 2, 0, 3), [0.067, 0.0062], [0.067, 0.0062], [0.0, 0.0062]], SEGS);
  // housing: flared skirt, two grooves, rounded shoulder, a step for the dome; the top plate (under the dome) is flat
  const H = [
    [0.066, 0.006], [0.066, 0.006], ...arc(0.0715, 0.0105, 0.0045, -Math.PI / 2, 0, 4),
    [0.0745, 0.019], [0.0738, 0.0205], [0.0745, 0.022],              // groove 1
    [0.0745, 0.031], [0.0738, 0.0325], [0.0745, 0.034],              // groove 2
    [0.0745, 0.041], ...arc(0.0705, 0.041, 0.004, 0, Math.PI / 2, 4),
    [0.0645, 0.045], [0.0645, 0.045], [0.0645, 0.049], [0.0645, 0.049], [0.0615, 0.049], [0.0615, 0.049], [0.0615, 0.0515], [0.0615, 0.0515],
    [0.0, 0.0515],
  ];
  const housing = revolve(H, SEGS);
  // dome: 36 Fresnel flutes on the wall (radius +-1.1 %), fading out over the shoulder; the cap (smooth) closes at a pole
  const D = [];
  D.push([0.0612, 0.049]);
  for (let k = 0; k <= 14; k++) { const y = 0.051 + k * (0.084 / 14); D.push([0.0612 - 0.0042 * (k / 14), y]); }   // wall, slight taper to 0.057
  for (let k = 1; k <= 10; k++) { const a = (k / 10) * (Math.PI / 2), rr = 0.057, h = 0.023; D.push([rr * Math.cos(a), 0.135 + h * Math.sin(a)]); }
  D[D.length - 1][0] = 0;
  const wallRows = 16;
  const dome = revolve(D, SEGS * 2, (th, k) => 1 + 0.011 * Math.cos(th * 36) * (k < wallRows ? 1 : Math.max(0, 1 - (k - wallRows) / 4)));
  // ROTATING inner: motor drum, bulb socket, H1 bulb, parabolic mirror (a dish of revolution round its own axis)
  const drum = revolve([[0, 0.0515], [0.026, 0.0515], [0.026, 0.0515], ...arc(0.023, 0.055, 0.003, 0, Math.PI / 2, 3), [0.0, 0.058]], 48);
  const socket = revolve([[0.0, 0.058], [0.008, 0.058], [0.008, 0.058], [0.008, 0.074], [0.008, 0.074], [0.0, 0.074]], 32);
  const bulbG = revolve([[0, 0.074], [0.0052, 0.074], ...arc(0.0, 0.094, 0.0052, 0, Math.PI / 2, 6)], 32);
  const dish = (() => {
    // paraboloid z = r^2 / (4 f), f = 12 mm, rim radius 34 mm; a thin shell (inner + outer + rim) so it has a back
    // one closed profile: the back (convex) face from the pole out to the rim, the rim (hard edges), the mirror
    // (concave) face back in to its pole. Revolved round +y, then turned so the dish opens toward +z (the beam).
    const f = 0.012, R = 0.030, n = 12, T = 0.0012, prof = [];
    for (let k = 0; k <= n; k++) { const r = R * (k / n); prof.push([r, r * r / (4 * f) - T]); }
    const zR = R * R / (4 * f);
    prof.push([R, zR - T], [R, zR], [R, zR]);
    for (let k = n - 1; k >= 0; k--) { const r = R * (k / n); prof.push([r, r * r / (4 * f)]); }
    const g = revolve(prof, 48);
    // the focus (y = f above the vertex) on the bulb's filament (y 0.090), the dish behind it
    return [g.rotateX(Math.PI / 2).translate(0, 0.090, -f)];
  })();
  // LED inner: an octagonal tower of modules (each face a 24 x 30 mm PCB with 3 LEDs), on a central post
  const ledFaces = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, b = new THREE.BoxGeometry(0.024, 0.030, 0.003).translate(0, 0.088, 0.0305).rotateY(a);
    ledFaces.push(b);
  }
  const ledTower = revolve([[0, 0.0515], [0.030, 0.0515], [0.030, 0.0515], [0.030, 0.104], [0.030, 0.104], [0.0, 0.104]], 8, null);
  GEO = { foot, housing, dome, drum, socket, bulb: bulbG, dish, ledFaces: mergeBoxes(ledFaces), ledTower };
  for (const g of Object.values(GEO).flat()) { g.computeBoundingSphere(); g.userData.shared = true; }
  return GEO;
}
function mergeBoxes(list) {
  // plain merge (positions, normals, uvs) of non-indexed-compatible boxes
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni);
  let v = 0, i = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, v * 3); N.set(g.attributes.normal.array, v * 3); U.set(g.attributes.uv.array, v * 2);
    for (let k = 0; k < g.index.count; k++) I[i + k] = g.index.array[k] + v;
    v += g.attributes.position.count; i += g.index.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3)); g.setAttribute("uv", new THREE.BufferAttribute(U, 2));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

/**
 * The beacon as a Group (origin = centre of the magnet foot's underside, +y up, +z the car's forward).
 * -> { group, mirror (the rotating part), rotating (group), led (group), setMode(mode) }
 */
export function buildBeacon() {
  const G = beaconGeometry(), M = beaconMaterials();
  const group = new THREE.Group(); group.name = "police-beacon";
  const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
  group.add(mesh(G.foot, M.rubber), mesh(G.housing, M.abs), mesh(G.dome, M.dome, true));
  const rotating = new THREE.Group(); rotating.name = "rotating";
  const turn = new THREE.Group(); turn.name = "mirror";
  turn.add(mesh(G.dish[0], M.mirror, false));
  rotating.add(mesh(G.drum, M.plate, false), mesh(G.socket, M.plate, false), mesh(G.bulb, M.bulb, false), turn);
  const led = new THREE.Group(); led.name = "led";
  led.add(mesh(G.ledTower, M.plate, false), mesh(G.ledFaces, M.ledFace, false));
  group.add(rotating, led);
  const setMode = (mode) => { rotating.visible = mode !== "led"; led.visible = mode === "led"; };
  setMode("rotating");
  return { group, mirror: turn, rotating, led, setMode, height: 0.158, radius: 0.0745 };
}

/** a grille flasher head: black housing + lens (lens faces +z); which = "L" | "R" */
export function buildFlasher(which) {
  const M = beaconMaterials();
  const g = new THREE.Group(); g.name = `grille-flasher-${which}`;
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.070, 0.028, 0.022, 3, 0.004), M.abs);
  body.position.z = -0.011;
  const lensG = new RoundedBoxGeometry(0.062, 0.020, 0.004, 2, 0.0015);
  const lensM = new THREE.Mesh(lensG, which === "L" ? M.lensL : M.lensR);
  lensM.position.z = 0.001;
  body.castShadow = false; lensM.castShadow = false;
  g.add(body, lensM);
  return g;
}
/** the visor bar inside the windscreen top (lens faces +z) */
export function buildVisor(width = 0.46) {
  const M = beaconMaterials();
  const g = new THREE.Group(); g.name = "visor-bar";
  const body = new THREE.Mesh(new RoundedBoxGeometry(width, 0.034, 0.030, 3, 0.005), M.abs);
  body.position.z = -0.016;
  const lensM = new THREE.Mesh(new RoundedBoxGeometry(width - 0.012, 0.022, 0.004, 2, 0.0015), M.lensV);
  lensM.position.z = 0.0005;
  // its two suction-cup brackets
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.012, 0.036, 2, 0.003), M.plate); b.position.set(s * width * 0.36, 0.022, -0.014); g.add(b); }
  g.add(body, lensM);
  return g;
}
/** the cable along a list of points (car frame), a smooth tube of radius 2 mm */
export function buildCable(points) {
  const M = beaconMaterials();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  const g = new THREE.TubeGeometry(curve, Math.max(24, points.length * 10), 0.002, 8, false);
  const m = new THREE.Mesh(g, M.cable); m.castShadow = true; m.receiveShadow = true; m.name = "beacon-cable";
  return m;
}
