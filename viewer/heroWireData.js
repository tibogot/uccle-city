// The wire data of the heroes' thin strokes (claude/defects3; viewer/heroWires.js): pure JS, shared by the viewer's
// worker (viewer/heroWireWorker.js) and the gate (tools/audit/jitterCheck.mjs).
import { components, strokes } from "./thinBars.js";

/** a stroke counts as straight when no vertex lies further than STRAIGHT x its width from its long axis (a square bar's
 *  corner is at 0.71 w; an arched or bent part is left as it is) */
export const STRAIGHT = 1.2;

/**
 * The wire data of one geometry (positions in its own frame): per vertex [ox, oy, oz, half-width] for the vertices of
 * straight thin strokes, 0 elsewhere. Pure (no three): the gate (tools/audit/jitterCheck.mjs) runs it on the GLBs.
 * -> { data: Float32Array(4 n), strokes, wired, bent }
 */
export function wireData(pos, index = null) {
  const nv = pos.length / 3, data = new Float32Array(nv * 4);
  const cc = components(pos, index), S = strokes(pos, index, cc);
  const verts = Array.from({ length: cc.n }, () => []);
  for (let i = 0; i < nv; i++) if (S[cc.comp[i]].thin) verts[cc.comp[i]].push(i);
  let n = 0, wired = 0, bent = 0;
  for (let c = 0; c < cc.n; c++) {
    const s = S[c]; if (!s.thin) continue;
    n++;
    const vs = verts[c];
    // the long axis: principal direction of the vertices (power iteration on the covariance)
    let mx = 0, my = 0, mz = 0;
    for (const i of vs) { mx += pos[i * 3]; my += pos[i * 3 + 1]; mz += pos[i * 3 + 2]; }
    mx /= vs.length; my /= vs.length; mz /= vs.length;
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
    for (const i of vs) { const x = pos[i * 3] - mx, y = pos[i * 3 + 1] - my, z = pos[i * 3 + 2] - mz; xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z; }
    let ux = 1, uy = 1, uz = 1;
    for (let it = 0; it < 24; it++) {
      const a = xx * ux + xy * uy + xz * uz, b = xy * ux + yy * uy + yz * uz, d = xz * ux + yz * uy + zz * uz, L = Math.hypot(a, b, d) || 1;
      ux = a / L; uy = b / L; uz = d / L;
    }
    let far = 0;
    const off = vs.map((i) => {
      const x = pos[i * 3] - mx, y = pos[i * 3 + 1] - my, z = pos[i * 3 + 2] - mz, t = x * ux + y * uy + z * uz;
      const o = [x - t * ux, y - t * uy, z - t * uz]; far = Math.max(far, Math.hypot(o[0], o[1], o[2])); return o;
    });
    if (far > STRAIGHT * s.w) { bent++; continue; }
    wired++;
    const hw = Math.max(s.w / 2, 1e-4);
    vs.forEach((i, k) => { data[i * 4] = off[k][0]; data[i * 4 + 1] = off[k][1]; data[i * 4 + 2] = off[k][2]; data[i * 4 + 3] = hw; });
  }
  return { data, strokes: n, wired, bent };
}

