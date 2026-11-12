// THE STALLE LAB'S INTERIOR PART: the interior cell (viewer/stalleInterior.js) in the lab: walk in with the third-person
// character (the west door opens, walls / piers / chair rows / steps collide, the character is lit by the baked ambient
// cubes inside), interior viewpoints, day / night, the bakes' gains, debug views (light only, albedo only, colliders),
// the portal's state.
import * as THREE from "three/webgpu";
import { loadStalleInterior, StallePortal, stalleInLook, probeGain, INTERIOR_LAYER } from "../viewer/stalleInterior.js";
import { ThirdPerson, CollisionWorld, Heightfield, TriBVH, PrismSet } from "../viewer/character/index.js";

export async function attachInterior({ renderer, scene, camera, controls, lighting, model, groundAt, toCity, ui, S, getPipe }) {
  const qp = new URLSearchParams(location.search);
  const cell = await loadStalleInterior({ placement: model.placement, lib: model.lib });
  scene.add(cell.root);
  cell.onDoorClosed = (closed) => model.setDoor(closed);  // the exterior's leaves while closed, the cell's (they open) otherwise
  const local = (u, h, w) => cell.root.localToWorld(new THREE.Vector3(u, h - 30, w));
  // collision: the ground (not inside the chapel), the cell's colliders, the neighbours' UrbIS prisms (the chapel's
  // own solid excluded: its walls are the cell's)
  const world = new CollisionWorld();
  world.add(new Heightfield((x, z) => (cell.contains(new THREE.Vector3(x, cell.info.levels_taw.floor + 1, z), -0.3) ? -1e4 : groundAt(x, z))));
  const bvh = world.add(new TriBVH(cell.colliders)); bvh.tag = 3;
  const meta = await fetch("../data/tiles/D5/buildings.json").then((r) => r.json()).catch(() => ({ buildings: [] }));
  const c0 = model.boundsWorld.getCenter(new THREE.Vector3());
  const near = meta.buildings.filter((b) => b.footprint?.[0]?.length >= 3 && b.footprint[0].some(([x, z]) => Math.hypot(x - c0.x, z - c0.z) < 90));
  const prisms = world.add(new PrismSet(near.map((b) => ({ rings: b.footprint, base: b.base - 3, top: b.top, id: b.attrs?.BU_ID || b.id })), []));
  prisms.exclude(model.notes.placement.chapel_bu_id, true);
  const tp = new ThirdPerson({ scene, camera, dom: renderer.domElement, world });
  tp.body.root.visible = false;
  const charName = qp.get("char") || "hoodie";
  if (charName !== "capsule") await tp.useCharacter(charName, renderer).catch((e) => console.warn("character", e));
  tp.body.setVariant(cell.probes.variant(tp.body));
  const portal = new StallePortal(cell, { camera, sun: lighting.sun, extra: [tp.body.root] });
  // colliders drawn (debug)
  const colGeo = new THREE.BufferGeometry(); colGeo.setAttribute("position", new THREE.BufferAttribute(cell.colliders, 3));
  const colMesh = new THREE.Mesh(colGeo, new THREE.MeshBasicNodeMaterial({ color: 0xff5533, wireframe: true, transparent: true, opacity: 0.6, depthTest: false }));
  colMesh.visible = false; colMesh.renderOrder = 10; colMesh.layers.enable(INTERIOR_LAYER); scene.add(colMesh);

  const VIEWS = {   // (u, h TAW, w) eye -> target
    "inside: nave from the door": [[1.3, 36.0, 0.7], [14.0, 36.9, 0.1]],
    "inside: the choir and the retable": [[11.4, 36.2, -0.5], [16.4, 37.6, 0.1]],
    "inside: south aisle": [[1.4, 36.0, 3.0], [10.0, 35.6, 3.0]],
    "inside: north aisle, lepers' window": [[4.5, 36.0, -3.1], [0.9, 35.4, -3.8]],
    "inside: back to the west window": [[9.8, 36.1, 0.1], [0.5, 38.4, 0.1]],
    "inside: the stucco ceiling": [[5.0, 35.6, 0.1], [6.0, 40.8, 0.12]],
    "west door, from the forecourt": [[-6.0, 35.6, 0.6], [2.0, 35.8, 0.1]],
  };
  const T = { light: "follow city", view: "final", colliders: false, dayGain: stalleInLook.dayGain.value, sunGain: stalleInLook.sunGain.value,
    nightGain: stalleInLook.nightGain.value, probe: probeGain.value, portal: "", cellInfo: "" };
  const fi = ui.addFolder("Interior (cell)");
  for (const k of Object.keys(VIEWS)) fi.add({ go: () => lookAt(k) }, "go").name(k);
  fi.add({ go: () => setMode("walk") }, "go").name("walk in (third person)");
  fi.add(T, "light", ["follow city", "day", "night"]).name("inside: day / night").onChange((v) => { stalleInLook.dayOverride.value = v === "day" ? 1 : v === "night" ? 0 : -1; });
  fi.add(T, "dayGain", 0, 6, 0.05).name("sky bake gain").onChange((v) => { stalleInLook.dayGain.value = v; });
  fi.add(T, "sunGain", 0, 6, 0.05).name("sun bake gain").onChange((v) => { stalleInLook.sunGain.value = v; });
  fi.add(T, "nightGain", 0, 3, 0.01).name("lamps bake gain").onChange((v) => { stalleInLook.nightGain.value = v; });
  fi.add({ a: stalleInLook.adaptInside }, "a", 1, 20, 0.1).name("eye adaptation inside").onChange((v) => { stalleInLook.adaptInside = v; });
  fi.add(T, "probe", 0, 3, 0.01).name("character (probes)").onChange((v) => { probeGain.value = v; });
  fi.add(T, "view", ["final", "light only", "albedo only"]).name("debug view").onChange((v) => { stalleInLook.view.value = ["final", "light only", "albedo only"].indexOf(v); });
  fi.add(T, "colliders").name("colliders").onChange((v) => { colMesh.visible = v; tp.debug && (tp.debug.visible = v); });
  fi.add(T, "portal").name("portal").listen();
  fi.add(T, "cellInfo").name("cell").listen();

  function lookAt(k) {
    setMode("orbit");
    const [e, t] = VIEWS[k];
    camera.clearViewOffset(); camera.fov = 70; camera.updateProjectionMatrix();
    camera.position.copy(local(e[0], e[1], e[2])); controls.target.copy(local(t[0], t[1], t[2])); controls.update();
    document.getElementById("photo").removeAttribute("src");
    S.view = k; dispatchEvent(new Event("resize"));
  }
  function setMode(m) {
    S.mode = m;
    if (m === "walk") {
      controls.enabled = false;
      camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix();
      const s = cell.root.localToWorld(new THREE.Vector3(...cell.info.spawn.outside));
      const fwd = cell.root.localToWorld(new THREE.Vector3(1, 0, 0)).sub(cell.root.position);
      tp.start(s.x, groundAt(s.x, s.z) + 0.05, s.z, Math.atan2(fwd.x, fwd.z));
      tp.body.root.visible = true;
    } else { tp.stop(); tp.body.root.visible = false; controls.enabled = true; }
  }
  const pl = new THREE.Vector3();
  let sealed = false;
  return {
    cell, tp, portal, setMode, lookAt, VIEWS,
    eye: () => (S.mode === "walk" ? pl : camera.position),
    update(dt) {
      if (S.mode === "walk") {
        tp.update(dt); pl.set(tp.x, tp.y + 1, tp.z);
        const inside = cell.contains(pl, 0.05);
        tp.body.useVariant(inside); if (inside) cell.probes.update(pl);
      }
      cell.update(dt, S.mode === "walk" ? pl : camera.position, camera.position);
    },
    beforeRender() {
      sealed = portal.update();
      T.portal = portal.inside ? (sealed ? "inside, no opening in view: city skipped" : `inside, ${portal.visible} openings in view`) : "outside";
      T.cellInfo = `${cell.stats.triangles} tris · ${cell.stats.draws} draws · load ${cell.stats.loadMs} ms · ${cell.probes.count} probes · door ${(cell.doorOpen * 100).toFixed(0)} %`;
    },
    info: () => `interior: ${T.cellInfo} · portal: ${T.portal}` + (S.mode === "walk" ? ` · character ${tp.ctl?.grounded ? "on ground" : "air"}, light ${tp.body.variantOn ? "probes" : "city"}` : ""),
  };
}
