// Road surface codes per vertex (pure JS, used by the tile worker and roadPaint.js).
export const SURFACE = { asphalt: 0, sett: 1, paving_stones: 2, unhewn_cobblestone: 3, cobblestone: 3,
  gravel: 4, fine_gravel: 4, compacted: 4, unpaved: 4, concrete: 0 };

/** Same hash as laneRoadMesh.js hashPhase (not exported upstream). */
/** 0: the asphalt shader's tone is world space only (round 2); the Road Checker's C21 reads it */
export const ASPHALT_PIECE_TONE = 0;

export function hashPhase(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100;
}

/** Per-vertex surface code for an asphalt part, from each vertex's aPiece phase. */
export function surfaceAttribute(net, part) {
  const byPhase = new Map();
  const roadSurf = new Map();
  for (const rr of net.roads) {
    const code = SURFACE[rr.src?.meta?.surface] ?? 0;
    roadSurf.set(rr.id, code);
    byPhase.set(hashPhase(rr.id), code);
  }
  for (const node of net.nodes) {
    const votes = new Map();
    for (const a of node.arms || []) { const c = roadSurf.get(a.road.id) ?? 0; votes.set(c, (votes.get(c) || 0) + 1); }
    let best = 0, bn = -1;
    for (const [c, n] of votes) if (n > bn || (n === bn && c === 0)) { best = c; bn = n; }
    byPhase.set(hashPhase(node.id), best);
  }
  const piece = part.attributes.aPiece.array;
  const out = new Float32Array(part.vertexCount);
  for (let v = 0; v < part.vertexCount; v++) out[v] = byPhase.get(Math.round(piece[v * 2] * 100) / 100) ?? 0;
  return out;
}
