// GPU A/B of the façade kit INSIDE one page (?kit=1): the kit toggled (its meshes hidden, its walls on the painted far
// material) and back, 3 alternations per view, GPU p50 over 3 s each, draws and triangles. Contention from other tabs
// drifts slowly; alternating in one page keeps the comparison fair.
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (!window.viewer || !window.__kit) await sleep(250);
  const v = window.viewer, k = window.__kit;
  await v.loading; await sleep(4000);
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  const walls = [];
  v.scene.traverse((o) => { if (o.name === "buildings-walls-kit") walls.push(o); });
  const setKit = (on) => { k.group.visible = on; for (const w of walls) w.material = on ? w.userData.cutMat : w.userData.plainMat; k.forceRebucket(); };
  const views = { street: [[1214.5, 81.2, 621], [1229, 82.5, 648]], avenue: [[1219, 88, 735], [1225, 83, 650]], close: [[1221, 81.2, 640.5], [1229, 82.4, 629]], aerial: [[1120, 230, 820], [1220, 80, 640]] };
  const res = {};
  for (const [name, [p, t]] of Object.entries(views)) {
    v.camera.position.set(...p); v.controls.target.set(...t); v.controls.update();
    await sleep(2000);
    const on = [], off = [], dOn = [], dOff = [];
    for (let i = 0; i < 3; i++) for (const st of [true, false]) {
      setKit(st);
      if (st && name === "aerial") k.update(v.camera.position, v.camera);      // (the automatic swap back to the far walls)
      await sleep(1500); v.resetGpu(); await sleep(3000);
      (st ? on : off).push(v.gpuStats().p50);
      const r = v.renderer.info.render; (st ? dOn : dOff).push(r.drawCalls);
    }
    setKit(true);
    res[name] = { on, off, delta: +(on.reduce((a, b) => a + b) / 3 - off.reduce((a, b) => a + b) / 3).toFixed(2), drawsOn: dOn[0], drawsOff: dOff[0], kitMeshes: k.stats.meshes, kitTris: k.stats.tris };
  }
  return res;
}
