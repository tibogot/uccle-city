// THE SHOPFRONT SWAG RUN (pure JS, no three.js: viewer/christmas/xmasCity.js hangs it, tools/audit/xmasCheck.mjs checks
// it in node). claude/xmas1, rule xmas-fit-current-city: the swag's width and centre come from the SAME drawn front as
// the shop kit (viewer/shops/shopLayout.js frontFace + frontWidth: a curated front.w / front.du), never from site.json's
// own slot width (the build caps it at 6.5 m): a curated wide front (the Carrefour Market's 18 m glazing) gets a swag
// of its width, where its glazing is.
//   - a classic front: from its cornice's corona (0.94 m over the fascia's bottom, 0.30 m out);
//   - a modern front: from its fascia box (0.62 m over the fascia's bottom, 0.22 m out);
//   - a front under a curated CANOPY (a retail box's, shed: true: the Carrefour): along the canopy's front band, over
//     the glazed run (the band's top; out by the band's face, as the fascia box's 0.056 m inset).
// Modules of 1.6 m (scaled to fill the run), the module's origin = its hook.
import { frontFace, frontWidth, frontFamily } from "../shops/shopLayout.js";

export const SWAG_MODULE = 1.6;

/** f: the site's front (the street life's face fields + id / kind / cat); cur: the curated entry (terraces.json) or
 *  null; hash01: the street life's hash. Returns { W, n, sx, hook, out, yaw, cx, cz, tx, tz, modules: [{ x, y, z, u }],
 *  ends: [[x, z], [x, z]], canopy } */
export function swagRun(f, cur, hash01) {
  const cf = cur?.front || null;
  const face = frontFace(f, cf);
  const W = frontWidth(face, cf);
  const fam = frontFamily({ id: f.id, kind: f.kind, cat: f.cat }, face, cur, hash01);
  const c = cf?.canopy;
  const hook = c ? f.y + (c.y ?? 3.1) + (c.edge ?? 0.55) - 0.05 : f.y + fam.fasciaY + (fam.classic ? 0.94 : 0.62);
  const out = c ? (c.out ?? 3) + 0.06 - 0.056 + (c.stripe ? 0.01 : 0) : fam.classic ? 0.3 : 0.22;   // (the band's face at out + 0.06, its stripe 0.01 proud)
  const n = Math.max(1, Math.round(W / SWAG_MODULE)), sx = W / (n * SWAG_MODULE);
  const yaw = Math.atan2(f.nx, f.nz), tx = -f.nz, tz = f.nx;
  // (the run's frame: X = right seen from the street = (nz, -nx) as the shop kit; the modules are symmetric, so u runs
  // along (tx, tz) = -X as before: the same set of points)
  const modules = [];
  for (let k = 0; k < n; k++) {
    const u = -W / 2 + ((k + 0.5) * W) / n;
    modules.push({ u, x: face.x + tx * u + f.nx * out, y: hook, z: face.z + tz * u + f.nz * out });
  }
  const ends = [-1, 1].map((s) => [face.x + tx * s * W / 2, face.z + tz * s * W / 2]);
  return { W, n, sx, hook, out, yaw, cx: face.x, cz: face.z, tx, tz, modules, ends, canopy: !!c };
}
