"""STIB STOPS KIT: the current Brussels bus / tram shelter (with its integrated double-sided lit advertising panel and
bench), the STIB stop pole (flag + timetable case) and the free-standing double-sided lit advertising panel (~2 m2).
Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stibStops.py -- models/stops [--no-bake] [--previews]

LOOK (look-only, never traced / stored: Google Street View, Avenue Circulaire at the Observatoire stop, Uccle, April 2024;
docs/assets/STOPS.md): a dark anthracite steel frame, flat thin roof slab, a back wall of two clear glass panes in thin
frames, a half-depth glass windbreak at the open end, a slatted steel bench on two flat legs, and at the other end the
lit poster case (a ~1.2 x 1.75 m poster each side behind glass, white light margin) standing across the shelter as its
end wall. The pole: a grey round tube (~3.2 m) carrying the stop flag (a red header band over a white panel: the stop
name and line numbers come at run time as SDF text, viewer/streetlife) and a timetable case at eye height. The free
panel ("MUPI"): the same poster case on a single foot pillar, a crowned cap.

Pieces (one object each, origin = footprint centre on the ground, the road side = -Y in Blender = +Z in three.js):
  shelter          3.9 x 1.45 m, 2.42 m high; poster case across the -X end
  pole             the flag faces look along +-X (along the street), the timetable case faces +Y (the sidewalk)
  adpanel          1.40 m wide (along Y), poster faces look along +-X
  <piece>__poster  the poster planes (slot "poster"): UV0 u in [0, 1] = face +X, [1, 2] = face -X, v up (each reads
                   un-mirrored from its own side); the poster image comes from the atlas at run time (iPoster)
  <piece>__glass   the clear panes (slot "glass", drawn see-through in their own pass)
Legs, posts and foot pillars run 0.5 m below the origin: on a sloping sidewalk the piece is set at its uphill corner
and the downhill feet still go into the ground (JOINS rule: no floating feet). Slots by NAME only (no baked colour).
UV0: metres along the part's grain (kitlib), UV1: the AO atlas (stibstops_ao.png) on the main objects.
LODs: viewer/stops/stopKit.js (meshoptimizer, JS, at load: never Blender decimate).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/stops")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()

# named slots (preview colours only; the viewer maps by name: viewer/stops/stopKit.js SLOT_ORDER)
FRAME = K.mat("frame_anthracite", (0.035, 0.04, 0.04), 0.45, 0.6)       # powder-coated steel, RAL 7021-ish
STEEL = K.mat("steel_brushed", (0.55, 0.56, 0.57), 0.32, 0.9)            # bench slats, fixings
POLE = K.mat("pole_grey", (0.36, 0.37, 0.38), 0.4, 0.7)                  # the STIB pole and flag body
RED = K.mat("stib_red", (0.55, 0.03, 0.04), 0.4, 0.0)                    # the flag's header band
WHITE = K.mat("white_panel", (0.82, 0.82, 0.8), 0.35, 0.0)               # the flag's text panel, the roof name board
LIGHT = K.mat("light_strip", (0.95, 0.95, 0.92), 0.3, 0.0)               # roof LED strip, poster-case margins (emissive)
DARK = K.mat("rubber_black", (0.02, 0.02, 0.02), 0.7, 0.0)               # gaskets, seals, the timetable window
POSTER = K.mat("poster", (0.7, 0.5, 0.3), 0.12, 0.0)
GLASS = K.mat("glass", (0.8, 0.85, 0.86), 0.05, 0.0)
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)
SINK = 0.5                                                                # legs below the origin


def box(P, mat, cx, cy, cz, sx, sy, sz, bevel=0.004, grain=Zv, segs=2):
    P.add_bm(bm_box(sx, sy, sz, bevel, segs), mat, grain, M((cx, cy, cz)))


def span(P, mat, x0, x1, y0, y1, z0, z1, bevel=0.004, grain=None, segs=2):
    """a bevelled box between two corners"""
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    if grain is None: grain = X if sx >= max(sy, sz) else (Y if sy >= sz else Zv)
    box(P, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, sx, sy, sz, bevel, grain, segs)


def quad_uv(bm, corners, uvs):
    """one quad in a fresh bmesh with explicit UVs (poster planes)"""
    uvl = bm.loops.layers.uv.verify()
    vs = [bm.verts.new(c) for c in corners]
    f = bm.faces.new(vs)
    for loop, uv in zip(f.loops, uvs): loop[uvl].uv = uv
    f.smooth = False
    return f


def poster_case(P, PP, cx, cy, z0, width, height, depth):
    """the lit double-sided poster case: a core slab, a 85 mm frame on each face 20 mm proud of it, the light margin
    and the poster recessed 16 mm (behind glass: the poster slot is glossy). Faces look along +-X. Returns the poster
    window (w, h) and centre z."""
    core = depth - 0.04
    span(P, FRAME, cx - core / 2, cx + core / 2, cy - width / 2, cy + width / 2, z0, z0 + height, 0.012, Zv, 3)
    fb = 0.085
    ww, wh = width - 2 * fb, height - 2 * fb                   # the window in the frame
    zc = z0 + height / 2
    for s in (1, -1):
        x0 = cx + s * core / 2                                  # core face
        xa, xb = (x0, x0 + s * 0.02) if s > 0 else (x0 + s * 0.02, x0)
        # frame bars (proud of the core by 20 mm), mitred look by order: sides full height, top / bottom between them
        span(P, FRAME, xa, xb, cy - width / 2, cy - width / 2 + fb, z0, z0 + height, 0.006, Zv)
        span(P, FRAME, xa, xb, cy + width / 2 - fb, cy + width / 2, z0, z0 + height, 0.006, Zv)
        span(P, FRAME, xa, xb, cy - width / 2 + fb + 0.001, cy + width / 2 - fb - 0.001, z0 + height - fb, z0 + height, 0.006, Y)
        span(P, FRAME, xa, xb, cy - width / 2 + fb + 0.001, cy + width / 2 - fb - 0.001, z0, z0 + fb, 0.006, Y)
        # a thin black gasket inside the frame window (where the glass sits)
        g = 0.012
        span(P, DARK, xb - s * 0.006 - 0.003, xb - s * 0.006 + 0.003, cy - ww / 2, cy - ww / 2 + g, zc - wh / 2, zc + wh / 2, 0.0, Zv)
        span(P, DARK, xb - s * 0.006 - 0.003, xb - s * 0.006 + 0.003, cy + ww / 2 - g, cy + ww / 2, zc - wh / 2, zc + wh / 2, 0.0, Zv)
        span(P, DARK, xb - s * 0.006 - 0.003, xb - s * 0.006 + 0.003, cy - ww / 2 + g, cy + ww / 2 - g, zc + wh / 2 - g, zc + wh / 2, 0.0, Y)
        span(P, DARK, xb - s * 0.006 - 0.003, xb - s * 0.006 + 0.003, cy - ww / 2 + g, cy + ww / 2 - g, zc - wh / 2, zc - wh / 2 + g, 0.0, Y)
        # the light margin (the lit white back of the case round the poster), 3 mm off the core face
        lm = 0.03
        bm = bmesh.new()
        xm = x0 + s * 0.003
        for (ya, yb, za, zb) in ((cy - ww / 2 + g, cy + ww / 2 - g, zc + wh / 2 - g - lm, zc + wh / 2 - g), (cy - ww / 2 + g, cy + ww / 2 - g, zc - wh / 2 + g, zc - wh / 2 + g + lm),
                                 (cy - ww / 2 + g, cy - ww / 2 + g + lm, zc - wh / 2 + g + lm, zc + wh / 2 - g - lm), (cy + ww / 2 - g - lm, cy + ww / 2 - g, zc - wh / 2 + g + lm, zc + wh / 2 - g - lm)):
            c = [(xm, ya, za), (xm, yb, za), (xm, yb, zb), (xm, ya, zb)]
            f = bm.faces.new([bm.verts.new(p) for p in (c if s > 0 else list(reversed(c)))]); f.smooth = False
        P.add_bm(bm, LIGHT, Y)
        # the poster: 4 mm off the core face, inside the light margin; u along the viewer's right, v up
        pw, ph = ww - 2 * (g + lm), wh - 2 * (g + lm)
        xp = x0 + s * 0.004
        bm = bmesh.new()
        ya, yb, za, zb = cy - pw / 2, cy + pw / 2, zc - ph / 2, zc + ph / 2
        if s > 0:   # seen from +X: the right hand is +Y
            quad_uv(bm, [(xp, ya, za), (xp, yb, za), (xp, yb, zb), (xp, ya, zb)], [(0, 0), (1, 0), (1, 1), (0, 1)])
        else:       # seen from -X: the right hand is -Y
            quad_uv(bm, [(xp, yb, za), (xp, ya, za), (xp, ya, zb), (xp, yb, zb)], [(1, 0), (2, 0), (2, 1), (1, 1)])
        PP.append(bm)
    return pw, ph, zc


def glass_pane(G, x0, x1, y0, y1, z0, z1):
    """a clear pane (closed thin box: both faces + edges)"""
    G.append(bm_box(x1 - x0, y1 - y0, z1 - z0, 0.0))
    G[-1].transform(M(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)))


def finish(P, posters, glass, name):
    o = P.to_object()
    extra = []
    if posters:
        bm = bmesh.new()
        uvl = bm.loops.layers.uv.verify()
        for b in posters:
            bu = b.loops.layers.uv.verify()
            vm = {}
            for v in b.verts: vm[v] = bm.verts.new(v.co)
            for f in b.faces:
                nf = bm.faces.new([vm[v] for v in f.verts]); nf.smooth = False
                for l0, l1 in zip(f.loops, nf.loops): l1[uvl].uv = l0[bu].uv
            b.free()
        me = bpy.data.meshes.new(name + "__poster"); bm.to_mesh(me); bm.free()
        me.uv_layers[0].name = "UVMap"
        me.materials.append(POSTER)
        po = bpy.data.objects.new(name + "__poster", me); scn.collection.objects.link(po)
        extra.append(po)
    if glass:
        bm = bmesh.new()
        for b in glass:
            vm = {}
            for v in b.verts: vm[v] = bm.verts.new(v.co)
            for f in b.faces: nf = bm.faces.new([vm[v] for v in f.verts]); nf.smooth = False
            b.free()
        me = bpy.data.meshes.new(name + "__glass"); bm.to_mesh(me); bm.free()
        me.uv_layers.new(name="UVMap")
        me.materials.append(GLASS)
        go = bpy.data.objects.new(name + "__glass", me); scn.collection.objects.link(go)
        extra.append(go)
    return o, extra


# ------------------------------------------------------------------------------------------------ the shelter
L, D, ROOF = 3.9, 1.45, 2.42
YB, YF = 0.62, -0.55            # back wall line, front post line (the road is at -Y)


def shelter():
    P, PP, G = Part("shelter"), [], []
    pw = 0.08
    # posts: three along the back, one at the open end's front corner (80 x 80 mm, 8 mm bevel), into the ground
    for x in (-1.66, 0.1, 1.86):
        span(P, FRAME, x - pw / 2, x + pw / 2, YB - pw / 2, YB + pw / 2, -SINK, ROOF - 0.12, 0.008, Zv, 3)
    span(P, FRAME, 1.86 - pw / 2, 1.86 + pw / 2, YF - pw / 2, YF + pw / 2, -SINK, ROOF - 0.12, 0.008, Zv, 3)
    # roof: a 120 mm slab with a 10 mm bevel, overhanging the front; a dark drip groove under its edge; the LED strip
    span(P, FRAME, -L / 2 - 0.05, L / 2 + 0.05, -0.80, YB + 0.13, ROOF - 0.12, ROOF, 0.012, X, 3)
    span(P, DARK, -L / 2 + 0.03, L / 2 - 0.03, -0.74, -0.71, ROOF - 0.128, ROOF - 0.119, 0.0, X)
    span(P, LIGHT, -1.45, 1.75, 0.05, 0.13, ROOF - 0.126, ROOF - 0.119, 0.0, X)
    # back wall: two glass panes in thin frames (top / bottom rails 50 mm, 4 mm bevel) between the posts
    for (xa, xb) in ((-1.66 + pw / 2, 0.1 - pw / 2), (0.1 + pw / 2, 1.86 - pw / 2)):
        span(P, FRAME, xa + 0.001, xb - 0.001, YB - 0.025, YB + 0.025, 0.10, 0.15, 0.004, X)
        span(P, FRAME, xa + 0.001, xb - 0.001, YB - 0.025, YB + 0.025, ROOF - 0.20, ROOF - 0.15, 0.004, X)
        glass_pane(G, xa + 0.002, xb - 0.002, YB - 0.005, YB + 0.005, 0.152, ROOF - 0.202)
        # a black gasket line where the glass meets the rails
        span(P, DARK, xa + 0.002, xb - 0.002, YB - 0.008, YB + 0.008, 0.150, 0.158, 0.0, X)
        span(P, DARK, xa + 0.002, xb - 0.002, YB - 0.008, YB + 0.008, ROOF - 0.208, ROOF - 0.200, 0.0, X)
    # the open end's windbreak: a half-depth pane from the back post toward the front, framed top and bottom
    ye = -0.05
    span(P, FRAME, 1.86 - 0.025, 1.86 + 0.025, ye, YB - pw / 2 - 0.001, 0.10, 0.15, 0.004, Y)
    span(P, FRAME, 1.86 - 0.025, 1.86 + 0.025, ye, YB - pw / 2 - 0.001, ROOF - 0.20, ROOF - 0.15, 0.004, Y)
    span(P, FRAME, 1.86 - 0.025, 1.86 + 0.025, ye - 0.05, ye, 0.10, ROOF - 0.15, 0.004, Zv)           # its free edge stile
    glass_pane(G, 1.86 - 0.005, 1.86 + 0.005, ye + 0.001, YB - pw / 2 - 0.002, 0.152, ROOF - 0.202)
    # the poster case across the -X end: from the back line to the front, on a plinth into the ground
    cw, cd = 1.36, 0.16
    ccx, ccy = -L / 2 + cd / 2, (YB + 0.06 + -0.70) / 2
    poster_case(P, PP, ccx, ccy, 0.14, cw, ROOF - 0.12 - 0.14 - 0.002, cd)
    span(P, FRAME, ccx - 0.05, ccx + 0.05, ccy - 0.45, ccy + 0.45, -SINK, 0.14, 0.006, Zv)            # plinth
    # bench: four steel slats on two flat legs (between the middle and the end post)
    for k in range(4):
        y = 0.22 + k * 0.095
        span(P, STEEL, 0.32, 1.66, y - 0.04, y + 0.04, 0.445, 0.47, 0.006, X)
    for x in (0.42, 1.56):
        span(P, FRAME, x - 0.03, x + 0.03, 0.2, 0.55, 0.40, 0.445, 0.005, Y)                          # cross bearer
        span(P, FRAME, x - 0.03, x + 0.03, 0.42, 0.50, -SINK, 0.40, 0.005, Zv)                        # leg
        span(P, FRAME, x - 0.02, x + 0.02, 0.50, YB - 0.026, 0.30, 0.36, 0.004, Y)                    # tie to the back rail line
    # a lean rail on the back posts, left of the bench
    span(P, STEEL, -1.62 + 0.04, 0.1 - 0.045, YB - 0.10, YB - 0.04, 0.78, 0.83, 0.008, X)
    for x in (-1.2, -0.3):
        span(P, FRAME, x - 0.015, x + 0.015, YB - 0.07, YB - 0.026, 0.76, 0.85, 0.004, Y)
    return finish(P, PP, G, "shelter")


# ------------------------------------------------------------------------------------------------ the STIB pole
POLE_TOP, FLAG = 2.62, (0.06, 0.56, 0.80)


def pole():
    P, PP, G = Part("pole"), [], []
    r = 0.038
    P.add_bm(bm_cyl(r, POLE_TOP + 0.05 + SINK, 20, 0.0), POLE, Zv, M((0, 0, -SINK)))
    P.add_bm(bm_cyl(0.05, 0.05, 20, 0.008), POLE, Zv, M((0, 0, 0.0)))                  # ground collar
    fx, fy, fz = FLAG
    z0 = POLE_TOP
    span(P, POLE, -fx / 2, fx / 2, -fy / 2, fy / 2, z0, z0 + fz, 0.012, Zv, 3)          # the flag body
    for s in (1, -1):
        xa, xb = (fx / 2 - 0.001, fx / 2 + 0.003) if s > 0 else (-fx / 2 - 0.003, -fx / 2 + 0.001)
        span(P, RED, xa, xb, -fy / 2 + 0.025, fy / 2 - 0.025, z0 + fz - 0.205, z0 + fz - 0.025, 0.002, Y)    # header band
        span(P, WHITE, xa, xb, -fy / 2 + 0.025, fy / 2 - 0.025, z0 + 0.025, z0 + fz - 0.225, 0.002, Y)        # text panel
        # a plain white roundel on the band (generic: no logo)
        xr = xb if s > 0 else xa
        P.add_bm(bm_cyl(0.055, 0.003, 24, 0.0), WHITE, Zv, M((xr + s * 0.0005, 0, z0 + fz - 0.115), (0, math.pi / 2 * s, 0)))
    P.add_bm(bm_cyl(0.045, 0.02, 20, 0.006), POLE, Zv, M((0, 0, z0 + fz)))              # cap (the tube's end)
    # timetable case at eye height, on two clamps, facing +Y (the sidewalk)
    cz0, cz1 = 1.12, 1.72
    for z in (cz0 + 0.08, cz1 - 0.08):
        P.add_bm(bm_cyl(r + 0.006, 0.05, 20, 0.004), FRAME, Zv, M((0, 0, z - 0.025)))
        span(P, FRAME, -0.02, 0.02, r, r + 0.03, z - 0.02, z + 0.02, 0.004, Y)
    span(P, POLE, -0.20, 0.20, r + 0.03, r + 0.10, cz0, cz1, 0.01, Zv, 3)
    span(P, DARK, -0.17, 0.17, r + 0.099, r + 0.102, cz0 + 0.03, cz1 - 0.03, 0.0, Zv)
    span(P, WHITE, -0.155, 0.155, r + 0.101, r + 0.104, cz0 + 0.045, cz1 - 0.045, 0.0, Zv)            # the printed timetable
    glass_pane(G, -0.17, 0.17, r + 0.106, r + 0.110, cz0 + 0.03, cz1 - 0.03)
    return finish(P, PP, G, "pole")


# ------------------------------------------------------------------------------------------------ the free-standing panel
def adpanel():
    P, PP, G = Part("adpanel"), [], []
    w, h, d, z0 = 1.40, 2.16, 0.17, 0.42
    poster_case(P, PP, 0, 0, z0, w, h, d)
    # crowned cap: a slab a little wider than the case, its top edges rounded
    span(P, FRAME, -d / 2 - 0.015, d / 2 + 0.015, -w / 2 - 0.015, w / 2 + 0.015, z0 + h, z0 + h + 0.06, 0.022, Y, 4)
    # foot pillar (into the ground) and a cover collar where it meets the case
    span(P, FRAME, -0.06, 0.06, -0.20, 0.20, -SINK, z0, 0.01, Zv, 3)
    span(P, FRAME, -d / 2, d / 2, -0.30, 0.30, z0 - 0.05, z0, 0.01, Y, 3)
    return finish(P, PP, G, "adpanel")


objs, extras = [], []
for b in (shelter, pole, adpanel):
    t = time.time()
    o, ex = b()
    objs.append(o); extras += ex
    print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]}; " + ", ".join(f"{x.name} {K.tris(x)}" for x in ex) + f" ({time.time() - t:.1f}s)")

layout = K.atlas_layout(objs)
for o in objs: K.lightmap_uv(o, layout[o.name], margin=0.004)
ao_png = os.path.join(OUT, "stibstops_ao.png")
if BAKE:
    ao_img = K.bake_ao(objs, ao_png, px=1024, samples=64, distance=0.6)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(objs + extras, os.path.join(OUT, "stibstops.glb"))
info = {
    "asset": "STIB stops kit: shelter, pole, free-standing ad panel (tools/blender/stibStops.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs + extras},
    "frame": "glTF Y up, origin = footprint centre on the ground, road side = -Y (Blender) = +Z (three.js); legs 0.5 m below",
    "poster_uv": "UV0 u 0..1 = face +X, 1..2 = face -X, v 0 = poster bottom (glTF: v flipped, 0 = top)",
}
json.dump(info, open(os.path.join(OUT, "stibstops.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    so, cam = K.preview_setup(ao_img, sun_elev=34, sun_az=210)
    for m, col in ((GLASS, (0.9, 0.95, 0.96)), (POSTER, (0.75, 0.32, 0.12))):      # (no lightmap on these: plain preview shaders)
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        for l in list(b.inputs["Base Color"].links): nt.links.remove(l)
        b.inputs["Base Color"].default_value = (*col, 1)
    GLASS.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 1.0
    POSTER.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (0.75, 0.32, 0.12, 1)
    POSTER.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.6
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    spot = {"shelter": (0, 0), "pole": (3.2, -0.6), "adpanel": (-4.2, -0.2)}
    for o in objs + extras: o.location = (*spot[o.name.split("__")[0]], 0)
    K.render(cam, os.path.join(PV, "stops_overview.jpg"), (2.5, -9.5, 2.6), (-0.4, 0, 1.3), 30, (1600, 900))
    K.render(cam, os.path.join(PV, "stops_inside.jpg"), (0.8, -2.6, 1.55), (-0.6, 0.4, 1.2), 26, (1200, 800))
    K.render(cam, os.path.join(PV, "stops_flag.jpg"), (5.0, -2.2, 2.7), (3.2, -0.6, 2.6), 45, (900, 900))
    so.rotation_euler = (math.radians(80), 0, math.radians(120))
    K.render(cam, os.path.join(PV, "stops_grazing.jpg"), (-6.5, -3.0, 1.4), (-1.9, 0, 1.2), 40, (1200, 800))
print(f"done {time.time() - T0:.0f}s")
