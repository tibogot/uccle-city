"""Print a glTF's objects, vertex groups, UVs, materials and bounds (Blender, headless):
    blender -b -P tools/blender/inspectGlb.py -- <file.glb>"""
import bpy, sys
path = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
for o in bpy.context.scene.objects:
    print("OBJ", o.type, o.name, "parent", o.parent.name if o.parent else None)
    if o.type == "MESH":
        me = o.data
        print("  verts", len(me.vertices), "uv", [u.name for u in me.uv_layers], "mats", [m.name for m in me.materials])
        print("  groups", [g.name for g in o.vertex_groups][:80])
        xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
        print("  bounds x", round(min(xs), 2), round(max(xs), 2), "y", round(min(ys), 2), round(max(ys), 2), "z", round(min(zs), 2), round(max(zs), 2))
        for m in me.materials:
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image: print("  image", n.image.name, n.image.size[:])
print("ACTIONS", [a.name for a in bpy.data.actions])
