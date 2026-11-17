// THE PLAYER'S REAR PLATE AS A TEXTURE (claude/policerear, TODO 8c; ?carplate=old = the modelled plate alone).
// The cars2 plate is geometry: a 4 mm red border and 5 x 7-cell characters of 8.6 mm strokes in red faces 0.6 mm over the
// white plate. In the chase view (the rear 3.8 m from the camera: ~5 mm per internal pixel) the border is under a pixel
// and the strokes ~1.7 px: each jitter phase hits or misses them, and when a phase's whole 3 x 3 neighbourhood misses a
// stroke the TAAU clips it out of the history: the plate's lines blink and crawl while the car moves
// (tools/cars/rearThin.mjs: the plate is ~90 % of the rear's thin-feature misses on the unmarked car).
// A texture is pre-filtered (mipmaps + anisotropic filtering integrate the pixel's footprint): every frame sees the
// same area-averaged plate whatever the jitter, characters readable as far as the resolution allows.
// One quad over the modelled plate (1.7 mm over its characters), a child of the chassis (rigid motion vectors as the
// body), no shadow; one small canvas texture (512 x 108, mipmapped); +1 draw. The characters of the modelled estate's plate (cars2.py's random draw for "estate": 2-XDK-032; no real registration).
//   const plate = addRearPlate(chassis, bodyGeometry)   plate.removeFromParent() (geometry / material kept: shared)
import * as THREE from "three/webgpu";

export const PLATE_OLD = typeof location !== "undefined" && /[?&]carplate=old(&|$)/.test(location.search);

/** the rear plate's plane from the body geometry: the kind-7 (plate) faces at the rear facing back.
 *  -> { centre, normal, up, w, h } in the geometry's frame, or null */
export function findRearPlate(geo) {
  const P = geo.attributes.position?.array, N = geo.attributes.normal?.array, K = geo.attributes._kind?.array;
  if (!P || !N || !K) return null;
  let zMin = Infinity;
  for (let i = 2; i < P.length; i += 3) zMin = Math.min(zMin, P[i]);
  const pts = [], n = new THREE.Vector3();
  for (let v = 0; v < K.length; v++) {
    if (Math.round(K[v]) !== 7 || P[v * 3 + 2] > zMin + 0.6 || N[v * 3 + 2] > -0.6) continue;
    pts.push(new THREE.Vector3(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]));
    n.x += N[v * 3]; n.y += N[v * 3 + 1]; n.z += N[v * 3 + 2];
  }
  if (pts.length < 4) return null;
  n.normalize();
  const right = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3().crossVectors(n, right).normalize();
  if (up.y < 0) up.negate();
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  c.divideScalar(pts.length);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, d = -Infinity;
  const t = new THREE.Vector3();
  for (const p of pts) {
    t.subVectors(p, c);
    const u = t.x, vv = t.dot(up);
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, vv); v1 = Math.max(v1, vv);
    d = Math.max(d, -t.dot(n));          // the frontmost plate point along the normal (the plate face, not its slab)
  }
  const centre = c.clone().addScaledVector(right, (u0 + u1) / 2).addScaledVector(up, (v0 + v1) / 2);
  // project the centre onto the plate's face (the faces at the largest offset along the normal)
  let face = -Infinity;
  for (const p of pts) face = Math.max(face, t.subVectors(p, centre).dot(n));
  centre.addScaledVector(n, face);
  return { centre, normal: n, up, w: u1 - u0, h: v1 - v0 };
}

const lin2hex = (r, g, b) => "#" + [r, g, b].map((x) => Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)).toString(16).padStart(2, "0")).join("");

/** a Belgian plate (white, red border and characters, the EU band with its stars and B), the cars2 palette's colours */
export function plateTexture(text = "2-XDK-032", { W = 512, H = 108 } = {}) {
  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = cv.getContext("2d");
  const white = lin2hex(0.80, 0.80, 0.78), red = lin2hex(0.50, 0.015, 0.02), blue = lin2hex(0.010, 0.035, 0.22);
  const px = W / 0.52;                                     // texels per metre (the plate is 0.52 x 0.11 m)
  g.fillStyle = white; g.fillRect(0, 0, W, H);
  // red border (4 mm, 4 mm in from the edge: cars2.py plate())
  g.strokeStyle = red; g.lineWidth = 0.004 * px;
  const m = 0.004 * px + g.lineWidth / 2;
  g.strokeRect(0.046 * px + 0.004 * px, m, W - 0.05 * px - m - 0.004 * px, H - 2 * m);
  // the EU band (4.2 cm), 12 stars, B
  g.fillStyle = blue; g.fillRect(0.004 * px, 0.004 * px, 0.042 * px, H - 0.008 * px);
  const bx = 0.025 * px, by = H * 0.36, R = 0.011 * px;
  g.fillStyle = "#e8c020";
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.arc(bx + Math.cos(a) * R, by + Math.sin(a) * R, 0.0012 * px, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#f4f4f4"; g.font = `bold ${Math.round(0.03 * px)}px Arial, Helvetica, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("B", bx, H * 0.78);
  // the characters: 6 cm high (cap height), red, spread over the plate as the modelled ones (cars2.py text_rects: one
  // cell per character, the same span), each squeezed into its cell (Arial Narrow is not on every machine)
  g.fillStyle = red; g.font = `600 ${Math.round(0.06 / 0.716 * px)}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
  g.textBaseline = "alphabetic";
  const x0 = 0.058 * px, x1 = W - 0.014 * px, cell = (x1 - x0) / text.length, base = H / 2 + 0.03 * px;
  for (let i = 0; i < text.length; i++) g.fillText(text[i], x0 + (i + 0.5) * cell, base, cell * 0.86);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.name = "player plate";
  return tex;
}

let shared = null;
/** the quad over the rear plate, added to `chassis` (null when the plate cannot be found or ?carplate=old) */
export function addRearPlate(chassis, geo) {
  if (PLATE_OLD) return null;
  const f = geo.userData.rearPlate ??= findRearPlate(geo);
  if (!f) return null;
  if (!shared) {
    const mat = new THREE.MeshStandardNodeMaterial({ map: plateTexture(), roughness: 0.45, metalness: 0 });
    mat.name = "player plate";
    shared = { mat, geos: new Map() };
  }
  const k = `${f.w.toFixed(3)}x${f.h.toFixed(3)}`;
  if (!shared.geos.has(k)) shared.geos.set(k, new THREE.PlaneGeometry(f.w, f.h));
  const mesh = new THREE.Mesh(shared.geos.get(k), shared.mat);
  mesh.name = "player-plate";
  // the plane's +z = the plate's outward normal, +y = up along the plate; 3.5 mm out of the plate face (the modelled
  // characters stand 1.8 mm out of it: covered, 1.7 mm apart: no depth fight at the chase distance)
  const z = f.normal, y = f.up, x = new THREE.Vector3().crossVectors(y, z).normalize();
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  mesh.position.copy(f.centre).addScaledVector(z, 0.0035);
  mesh.castShadow = false; mesh.receiveShadow = true;
  chassis.add(mesh);
  return mesh;
}
