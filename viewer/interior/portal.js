// THE PORTAL: what the city must draw while the camera is inside the house.
// Cheapest correct approach (no scissor / stencil passes, no recompiles):
//   1. the interior is drawn FIRST (renderOrder -10, opaque): its walls fill the depth buffer, so the city's fragments
//      behind them fail the depth test before shading (early-Z); only what is seen through a window or the open door
//      is shaded.
//   2. when the camera is inside AND no opening (window / door rectangle of house.json, the same rectangles the façade
//      shader draws) intersects the view frustum, nothing of the city can be seen: the camera switches to the interior
//      layer (the cell + the character only) and the sun's shadow camera to an empty layer, so neither the city's draw
//      calls nor its shadow map are paid. Switching layers changes no shader.
// The city's per-object culling inside the portal frusta would save little more: its meshes are whole 500 m tiles.
import * as THREE from "three/webgpu";

export const INTERIOR_LAYER = 3;
const EMPTY_LAYER = 31;

export class Portal {
  constructor(cell, { camera, sun = null, extra = [] }) {
    this.cell = cell; this.camera = camera; this.sun = sun;
    // every opening of every façade face, as a thin world box (the whole opening, frame included)
    const s = cell.spec, [ox, oz] = s.frame.origin;
    this.boxes = [];
    for (const f of s.faces) for (const o of f.openings) {
      const b = new THREE.Box3();
      for (const u of [o.u0, o.u1]) for (const h of [o.h0, o.h1]) b.expandByPoint(new THREE.Vector3(f.origin[0] + f.t[0] * u, s.base + h, f.origin[1] + f.t[1] * u));
      b.expandByScalar(0.05);
      this.boxes.push(b);
    }
    this.frustum = new THREE.Frustum(); this.m = new THREE.Matrix4();
    this.inside = false; this.sealed = false; this.visible = 0;
    cell.root.traverse((o) => o.layers.enable(INTERIOR_LAYER));
    this.extra = extra;
    for (const o of extra) o.traverse((q) => q.layers.enable(INTERIOR_LAYER));
  }
  /** Per frame, before rendering. Returns true when the city is skipped this frame. */
  update() {
    const cam = this.camera;
    this.inside = this.cell.contains(cam.position, -0.05);
    let sealed = false;
    if (this.inside) {
      cam.updateMatrixWorld();
      this.m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.m, cam.coordinateSystem, cam.reversedDepth);
      let n = 0;
      for (const b of this.boxes) if (this.frustum.intersectsBox(b)) n++;
      this.visible = n;
      sealed = n === 0;
    } else this.visible = -1;
    if (sealed !== this.sealed) {
      this.sealed = sealed;
      if (sealed) { cam.layers.set(INTERIOR_LAYER); this.sun?.shadow.camera.layers.set(EMPTY_LAYER); }
      else { cam.layers.set(0); cam.layers.enable(INTERIOR_LAYER); this.sun?.shadow.camera.layers.set(0); }
    }
    return sealed;
  }
  dispose() { if (this.sealed) { this.camera.layers.set(0); this.sun?.shadow.camera.layers.set(0); } }
}
