"""development views of the quick blend (Workbench, flat colours per slot, a sun): fast massing / layout checks.
    blender --factory-startup -b models/vanbuuren/vanbuuren_quick.blend -P tools/blender/vanbuuren_quickview.py -- <outdir> [name=u,w,h:tu,tw,th:lens ...]
"""
import bpy, sys, os, math
from mathutils import Vector
ARGS = sys.argv[sys.argv.index("--") + 1:]
OUTD = ARGS[0]; os.makedirs(OUTD, exist_ok=True)
OY = 90.0
COL = {"brick_orange_amsterdam": (0.55, 0.20, 0.10), "brick_pattern": (0.62, 0.26, 0.12), "concrete_white": (0.85, 0.84, 0.80),
       "roof_tiles_flat_dark": (0.16, 0.14, 0.13), "wood_varnished": (0.45, 0.22, 0.08), "wood_frame_white": (0.9, 0.9, 0.88),
       "glass_window": (0.1, 0.13, 0.16), "glass_leaded": (0.2, 0.2, 0.15), "oak_door": (0.6, 0.38, 0.12), "metal_green_veranda": (0.15, 0.35, 0.25),
       "zinc_gutter": (0.5, 0.52, 0.53), "stone_blue": (0.3, 0.31, 0.32)}
for m in bpy.data.materials:
    if m.name in COL: m.diffuse_color = (*COL[m.name], 1)
scn = bpy.context.scene
scn.render.engine = "BLENDER_WORKBENCH"
sh = scn.display.shading
sh.light = "STUDIO"; sh.color_type = "MATERIAL"; sh.show_shadows = True; sh.show_cavity = True
sh.cavity_type = "BOTH"
scn.display.light_direction = (0.5, -0.4, 0.75)
scn.render.resolution_x, scn.render.resolution_y = 1400, 1000
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
P = lambda u, w, h: Vector((u, -w, h - OY))
views = {"east": ((24, -1.0, 97.0), (5, 0.5, 101.0), 30), "west": ((-28, 2.0, 96.0), (-5, 1.0, 101.0), 30),
         "south": ((2, 30, 96.5), (1, 6, 101.0), 30), "aerial": ((26, 26, 122), (0, 0, 101), 30),
         "aerial_nw": ((-24, -24, 120), (0, 0, 100), 30)}
for a in ARGS[1:]:
    n, spec = a.split("="); p, t, l = spec.split(":")
    views[n] = (tuple(map(float, p.split(","))), tuple(map(float, t.split(","))), float(l))
for name, (pos, tgt, lens) in views.items():
    cam.location = P(*pos); d = P(*tgt) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam_d.lens = lens
    scn.render.filepath = os.path.join(OUTD, f"q_{name}.png")
    bpy.ops.render.render(write_still=True)
