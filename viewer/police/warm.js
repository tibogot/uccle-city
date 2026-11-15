// PIPELINE WARM-UP for the police game's new materials (the car, the props): drawn for a few REAL frames out of sight
// (1 km under the camera, frustum culling off), as viewer/game/waypoint.js does: the pipelines are then built inside the
// post chain's MRT pass, as they will be used (a renderer.compileAsync outside that pass builds another variant and,
// in r187, can wait forever on a hidden object). Under the "On your way" card: the first frame of play never stalls.
export async function warm(roots, camera, frames = 6) {
  const saved = [];
  for (const r of roots) {
    const st = { r, vis: r.visible, pos: r.position.clone(), culled: [] };
    r.traverse((o) => { if (o.isMesh) { st.culled.push([o, o.frustumCulled]); o.frustumCulled = false; } });
    r.visible = true;
    saved.push(st);
  }
  for (let k = 0; k < frames; k++) {
    for (const s of saved) { s.r.position.set(camera.position.x, camera.position.y - 1000, camera.position.z); s.r.updateMatrixWorld(true); }
    await new Promise((res) => requestAnimationFrame(() => res()));
  }
  for (const s of saved) { s.r.visible = s.vis; s.r.position.copy(s.pos); s.r.updateMatrixWorld(true); for (const [o, c] of s.culled) o.frustumCulled = c; }
}
