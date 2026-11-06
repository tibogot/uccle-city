"""SNCB/NMBS AM08 "Desiro ML" (Siemens / Bombardier, 3 cars, B-B + 2-2 + B-B), the unit of every S train through Uccle
(S1 on L124; S5, S7, S9, S19 on L26; also IC 4011-type doubles: photos 2017-2025 at Uccle-Calevoet and Saint-Job,
data/raw/refs/trains/SOURCES.json). Built entirely in code: lofted body with a superelliptic nose, real window and
door recesses (inset + extruded, not painted), plug doors with door windows, a simple saloon behind the glass, bogies
with wheelsets, dampers, springs and brake discs, Scharfenberg couplers, gangways, roof equipment, a single-arm
pantograph raised to the contact wire. Ambient occlusion baked with Cycles into COLOR_0 (light only, no colour).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/am08.py -- <out_dir> [--no-bake] [--preview <abs dir>]
      <out_dir>/am08.glb    pieces EndCar, MidCar, Bogie, Gangway, Panto (+ "_far" variants of the bodies), each with its
                            origin on the track centre at rail-top height (+x forward). NAMED material slots, so the livery
                            is swappable (viewer/rail/trainModel.js draws them as one material with a palette):
                            paint_body, paint_cab, paint_door, paint_skirt, paint_grey, paint_roof, rubber, glass,
                            metal_dark, lamp_white, lamp_red, display, interior
      <out_dir>/am08.json   layout (car lengths, bogie positions, coupler planes), the measurements and estimates

MEASURED (published): length over couplers 79.91 m, 3 cars, B-B + 2-2 + B-B (loco-info.com, SNCB fleet data), 1435 mm.
ESTIMATED (photos: no drawing found): car lengths 27.30 / 25.31 / 27.30 m, body width 2.86 m, roof 4.15 m, floor and door
sill 0.96 m, window and door positions, bogie centres, the nose shape, the livery colours (SNCB yellow cab, white body,
red doors, navy skirt band), wheel diameter 0.85 m, bogie wheelbase 2.60 m.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/rail")
BAKE = "--no-bake" not in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
os.makedirs(OUT, exist_ok=True)
T0 = time.time()

# ------------------------------------------------------------------------------------------------ dimensions (m)
L_END, L_MID = 27.30, 25.31          # coupler / gangway plane to gangway plane; 2 * 27.30 + 25.31 = 79.91
GAP = 0.36                           # body end to the gangway plane
HW = 1.43                            # body half width (2.86)
ROOF = 4.15
SILL = 0.96
BOGIE_END_FROM_NOSE = 5.60           # end car: front bogie centre from the coupler face (estimated from photos)
BOGIE_SPACING_END = 17.4             # end car bogie centres
BOGIE_SPACING_MID = 17.6
WHEEL_R, WB, GAUGE = 0.425, 2.60, 1.435
WIRE = 5.50
NOSE_L = 1.62                        # the nose's reach beyond the straight body (bottom)
# half profile (y >= 0) from the underside centre round to the roof centre: (y, z)
PROFILE = [(0.0, 0.62), (0.70, 0.62), (1.18, 0.62), (1.32, 0.66), (1.385, 0.80), (1.41, 0.96), (1.425, 1.20), (1.43, 1.55),
           (1.43, 2.05), (1.425, 2.55), (1.41, 2.95), (1.375, 3.25), (1.31, 3.52), (1.20, 3.76), (1.02, 3.95), (0.78, 4.07),
           (0.45, 4.13), (0.0, 4.15)]
WIN_Z = (1.55, 2.55)
DOOR_Z = (SILL, 2.95)
# nose reach (x beyond the straight body) by height: lower front protrudes, the windscreen rakes back, the roof rounds in
LF = [(0.62, 1.50), (0.80, 1.60), (1.10, 1.62), (1.40, 1.58), (1.78, 1.46), (2.55, 1.10), (3.25, 0.66), (3.52, 0.46),
      (3.76, 0.30), (3.95, 0.17), (4.07, 0.08), (4.15, 0.0)]
SUPER = 3.2                          # superellipse exponent of the nose in plan (2 = ellipse, higher = blunter)


def lerp_tab(tab, z):
    if z <= tab[0][0]: return tab[0][1]
    for (z0, a), (z1, b) in zip(tab, tab[1:]):
        if z <= z1: return a + (b - a) * (z - z0) / (z1 - z0)
    return tab[-1][1]


# openings along each car, x from the car's FRONT plane (coupler face of an end car, gangway plane of the mid car)
END_DOORS = [(6.95, 8.35), (21.0, 22.4)]          # double plug doors, 1.40 m (photos: one right behind the cab window)
END_WINDOWS = [(3.05, 6.55), (8.75, 11.25), (11.45, 13.95), (14.15, 16.65), (16.85, 19.35), (19.55, 20.6), (22.8, 25.3), (25.5, 26.6)]
MID_DOORS = [(5.1, 6.5), (18.8, 20.2)]
MID_WINDOWS = [(0.7, 2.6), (2.8, 4.7), (6.9, 9.4), (9.6, 12.1), (12.3, 14.8), (15.0, 17.5), (17.7, 18.4), (20.6, 22.5), (22.7, 24.6)]
CAB_SIDE_WIN = (1.95, 2.85)                       # the driver's side window (from the coupler face)

# ------------------------------------------------------------------------------------------------ materials
SLOTS = ["paint_body", "paint_cab", "paint_door", "paint_skirt", "paint_grey", "paint_roof", "rubber", "glass", "metal_dark",
         "lamp_white", "lamp_red", "display", "interior"]
PREVIEW_COL = {"paint_body": (0.80, 0.82, 0.80), "paint_cab": (0.92, 0.70, 0.0), "paint_door": (0.65, 0.03, 0.04),
               "paint_skirt": (0.02, 0.04, 0.16), "paint_grey": (0.30, 0.32, 0.34), "paint_roof": (0.55, 0.57, 0.58),
               "rubber": (0.015, 0.015, 0.016), "glass": (0.01, 0.012, 0.014), "metal_dark": (0.04, 0.04, 0.042),
               "lamp_white": (0.9, 0.9, 0.85), "lamp_red": (0.5, 0.02, 0.02), "display": (0.02, 0.02, 0.02), "interior": (0.10, 0.14, 0.22)}
S = {n: i for i, n in enumerate(SLOTS)}

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for nm in SLOTS:
    m = bpy.data.materials.new(nm)
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*PREVIEW_COL[nm], 1)
    rough = {"glass": 0.05, "paint_body": 0.35, "paint_cab": 0.35, "paint_door": 0.35, "lamp_white": 0.1, "lamp_red": 0.1}.get(nm, 0.6)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = rough
    if nm in ("paint_body", "paint_cab", "paint_door", "paint_skirt"):
        m.node_tree.nodes["Principled BSDF"].inputs["Coat Weight"].default_value = 0.6
    mats.append(m)


def new_obj(name, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    return o


# ------------------------------------------------------------------------------------------------ the car body
def ring_full():
    """the full profile ring (y, z), counter-clockwise seen from +x: underside centre, right side (y < 0)... """
    half = PROFILE
    right = [(-y, z) for y, z in half]                           # y < 0 side, bottom -> roof
    left = [(y, z) for y, z in reversed(half[1:-1])]             # y > 0 side, roof -> bottom
    return right + left                                          # closed loop (first = bottom centre)


def body(length, front_kind, rear_kind, doors, windows, detail=2):
    """One car body, x from -length/2 (rear) to +length/2 (front plane). front_kind: 'nose' | 'flat'."""
    bm = bmesh.new()
    xf, xr = length / 2 - (0 if front_kind == "nose" else GAP), -length / 2 + GAP
    x_body_front = (length / 2 - NOSE_L) if front_kind == "nose" else xf
    # stations along x: every opening edge (from the front plane), the door centre seam, then every <= 0.6 m
    edges = {xr, x_body_front}
    fx = lambda a: length / 2 - a                                # "from the front" -> x
    for a, b in doors:
        for t in (a, b, (a + b) / 2 - 0.012, (a + b) / 2 + 0.012, a + 0.14, b - 0.14): edges.add(fx(t))
    for a, b in windows: edges.update((fx(a), fx(b)))
    if front_kind == "nose": edges.update((fx(CAB_SIDE_WIN[0]), fx(CAB_SIDE_WIN[1])))
    xs = sorted(e for e in edges if xr - 1e-6 <= e <= x_body_front + 1e-6)
    dense = []
    for a, b in zip(xs, xs[1:]):
        n = max(1, math.ceil((b - a) / (0.6 if detail >= 1 else 2.5)))
        dense += [a + (b - a) * k / n for k in range(n)]
    dense.append(xs[-1])
    ring = ring_full()
    if detail == 0:
        ring = [p for i, p in enumerate(ring) if i % 2 == 0 or abs(p[1] - WIN_Z[0]) < 1e-3 or abs(p[1] - WIN_Z[1]) < 1e-3]
    rows = []
    for x in dense:
        rows.append([bm.verts.new((x, y, z)) for y, z in ring])
    # the nose: rings swept round a superellipse in plan, the reach by height (LF)
    if front_kind == "nose":
        K = 16 if detail >= 1 else 6
        for k in range(1, K + 1):
            th = (math.pi / 2) * k / K
            s, c = math.sin(th), math.cos(th)
            sp, cp = s ** (2 / SUPER), c ** (2 / SUPER)
            rows.append([bm.verts.new((x_body_front + lerp_tab(LF, z) * sp, y * cp, z)) for y, z in ring])
    n = len(ring)
    for r0, r1 in zip(rows, rows[1:]):
        for i in range(n):
            j = (i + 1) % n
            try: bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
            except ValueError: pass
    # end caps (flat ends: the gangway face)
    caps = []
    if front_kind != "nose": caps.append(bm.faces.new(list(reversed(rows[-1]))))
    caps.append(bm.faces.new(rows[0]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    # materials by face position
    for f in bm.faces:
        c = f.calc_center_median(); nx = f.normal
        a = length / 2 - c.x                                      # from the front plane
        side = abs(nx.y) > 0.5 and abs(nx.z) < 0.7
        if f in caps: f.material_index = S["rubber"]; continue
        if c.z < 0.64 and nx.z < -0.5: f.material_index = S["metal_dark"]; continue
        if c.z > 3.45 and nx.z > 0.35 and not (front_kind == "nose" and c.x > x_body_front - 0.9):
            f.material_index = S["paint_roof"]; continue
        mat = S["paint_body"]
        if c.z < 0.92: mat = S["paint_skirt"]
        if front_kind == "nose":
            inn = c.x > x_body_front - 0.02
            cab_zone = a < 2.95 - max(0.0, c.z - 1.2) * 0.35 + 0.35       # the yellow wraps back to the first window, slanted
            if c.z > 0.9 and (inn or cab_zone): mat = S["paint_cab"]
            if inn and nx.x > 0.45:
                if c.z < 0.95: mat = S["metal_dark"]
                elif c.z < 1.52: mat = S["paint_grey"]
                elif 1.80 < c.z < 3.20 and abs(c.y) < 0.98: mat = S["glass"]
                elif 3.20 <= c.z < 3.38 and abs(c.y) < 0.62: mat = S["display"]
                elif 1.66 < c.z < 3.40 and abs(c.y) < 1.12: mat = S["rubber"]
        f.material_index = mat
    if detail >= 1:
        recesses(bm, length, doors, windows, front_kind, detail)
    return bm


def faces_in(bm, x0, x1, z0, z1, side=None, mat_not=None):
    out = []
    for f in bm.faces:
        c = f.calc_center_median()
        if x0 < c.x < x1 and z0 < c.z < z1 and abs(f.normal.y) > 0.6 and (side is None or c.y * side > 0):
            if mat_not is None or f.material_index not in mat_not:
                out.append(f)
    return out


def recess(bm, faces, inset, depth, mat_inner, mat_ring):
    if not faces: return []
    res = bmesh.ops.inset_region(bm, faces=faces, thickness=inset, depth=0.0, use_even_offset=True)
    for f in res["faces"]: f.material_index = mat_ring
    # push the region in along its normal
    vs = {v for f in faces for v in f.verts}
    nrm = Vector((0, 0, 0))
    for f in faces: nrm += f.normal * f.calc_area()
    nrm.normalize()
    ext = bmesh.ops.extrude_face_region(bm, geom=faces)
    newv = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=newv, vec=-nrm * depth)
    for g in ext["geom"]:
        if isinstance(g, bmesh.types.BMFace):
            g.material_index = mat_ring
    for f in faces: f.material_index = mat_inner
    bmesh.ops.delete(bm, geom=[f for f in faces if False], context="FACES")
    return faces


def recesses(bm, length, doors, windows, front_kind, detail):
    fx = lambda a: length / 2 - a
    for side in (1, -1):
        for a, b in windows:
            fs = faces_in(bm, fx(b), fx(a), WIN_Z[0], WIN_Z[1], side)
            recess(bm, fs, 0.045, 0.055, S["glass"], S["rubber"])
        for a, b in doors:
            fs = faces_in(bm, fx(b), fx(a), DOOR_Z[0], DOOR_Z[1], side)
            recess(bm, fs, 0.022, 0.018, S["paint_door"], S["rubber"])
            # the two leaves' windows (deeper set glass in the door)
            m = (a + b) / 2
            for p, q in ((a + 0.14, m - 0.012), (m + 0.012, b - 0.14)):
                fw = faces_in(bm, fx(q), fx(p), WIN_Z[0] + 0.05, WIN_Z[1] + 0.25, side)
                fw = [f for f in fw if f.material_index == S["paint_door"]]
                recess(bm, fw, 0.035, 0.03, S["glass"], S["rubber"])
            # the seam between the leaves
            for f in faces_in(bm, fx(m + 0.013), fx(m - 0.013), DOOR_Z[0], DOOR_Z[1], side):
                f.material_index = S["rubber"]
        if front_kind == "nose":
            fs = faces_in(bm, fx(CAB_SIDE_WIN[1]), fx(CAB_SIDE_WIN[0]), 1.9, 2.95, side)
            recess(bm, fs, 0.04, 0.04, S["glass"], S["rubber"])


def box(bm, c, size, mat, bev=0.0):
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r["verts"]
    for v in vs:
        v.co = Vector((c[0] + v.co.x * size[0], c[1] + v.co.y * size[1], c[2] + v.co.z * size[2]))
    fs = list({f for v in vs for f in v.link_faces})
    for f in fs: f.material_index = mat
    if bev:
        es = list({e for v in vs for e in v.link_edges})
        r2 = bmesh.ops.bevel(bm, geom=es, offset=bev, segments=2, affect="EDGES", profile=0.5)
        for f in r2["faces"]: f.material_index = mat
    return vs


def cyl(bm, c, r, h, axis, mat, seg=12):
    r_ = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h)
    rot = {"x": (0, math.pi / 2, 0), "y": (math.pi / 2, 0, 0), "z": (0, 0, 0)}[axis]
    from mathutils import Euler
    M = Euler(rot).to_matrix()
    for v in r_["verts"]: v.co = M @ v.co + Vector(c)
    for f in {f for v in r_["verts"] for f in v.link_faces}: f.material_index = mat
    return r_["verts"]


def car_details(bm, length, front_kind, detail):
    xf, xr = length / 2, -length / 2
    # underframe equipment boxes between the bogies
    if detail >= 1:
        for x0, x1 in ((-5.5, -1.0), (0.5, 4.8)):
            box(bm, ((x0 + x1) / 2, 0, 0.42), (x1 - x0, 2.2, 0.38), S["metal_dark"], 0.02)
        # roof equipment: two long fairings (HVAC, resistors) on the end car, the transformer pod on the mid car
        for x0, x1 in ((-9.5, -5.0), (3.0, 7.5)):
            box(bm, ((x0 + x1) / 2, 0, ROOF + 0.12), (x1 - x0, 1.9, 0.28), S["paint_roof"], 0.06)
    # gangway frames on flat ends
    for xe, kind in ((xr + GAP, "flat"), (xf - GAP, front_kind)):
        if kind != "flat": continue
        s = 1 if xe > 0 else -1
        box(bm, (xe + s * 0.03, 0, 2.05), (0.08, 1.30, 2.30), S["rubber"], 0.03)
    if front_kind == "nose":
        # the obstacle deflector (skirt) under the nose; the coupler sits behind the nose cover (not drawn)
        xn = xf - NOSE_L + lerp_tab(LF, 0.62)
        box(bm, (xn - 0.35, 0, 0.45), (0.5, 2.25, 0.34), S["metal_dark"], 0.03)
        box(bm, (xn - 0.05, 0, 0.66), (0.22, 0.5, 0.12), S["paint_grey"], 0.02)
        # head + tail lamps: two clusters each side on the grey lower front (photo: round LED headlights + tail)
        for y in (0.88, -0.88):
            z = 1.36
            xs = xf - NOSE_L + lerp_tab(LF, z) * (1 - abs(y / HW) ** SUPER) ** (1 / SUPER) - 0.02
            vs = cyl(bm, (xs, y + (0.12 if y > 0 else -0.12), z), 0.085, 0.06, "x", S["lamp_white"], 14)
            vs = cyl(bm, (xs - 0.01, y - (0.10 if y > 0 else -0.10), z), 0.06, 0.06, "x", S["lamp_red"], 12)
            cyl(bm, (xs + 0.0, y + 0.03 * (1 if y > 0 else -1), z - 0.16), 0.03, 0.05, "x", S["lamp_white"], 8)
        # wipers
        for y in (0.35, -0.35):
            box(bm, (xf - NOSE_L + lerp_tab(LF, 1.86) + 0.0, y, 1.86), (0.03, 0.03, 0.75), S["rubber"])
        # mirrors / cameras on the cab sides
        for y in (HW + 0.06, -HW - 0.06):
            box(bm, (xf - 2.0, y, 2.6), (0.18, 0.06, 0.24), S["paint_grey"], 0.02)


def interior(bm, length, front_kind):
    """A hint of the saloon behind the glass: floor, seat rows (2+2, backs facing), ceiling light strip, end walls."""
    xr = -length / 2 + GAP + 0.3
    xf = (length / 2 - NOSE_L - 1.6) if front_kind == "nose" else length / 2 - GAP - 0.3
    box(bm, ((xr + xf) / 2, 0, 1.18), (xf - xr, 2.6, 0.04), S["interior"])
    box(bm, ((xr + xf) / 2, 0, 3.55), (xf - xr, 2.4, 0.04), S["paint_roof"])
    x = xr + 0.6
    k = 0
    while x < xf - 0.6:
        for y in (0.95, 0.45, -0.45, -0.95):
            box(bm, (x, y, 1.45), (0.45, 0.44, 0.10), S["interior"])
            box(bm, (x + (0.2 if k % 2 else -0.2), y, 1.75), (0.08, 0.44, 0.60), S["interior"])
        x += 0.9; k += 1
    if front_kind == "nose":
        box(bm, (xf + 0.05, 0, 2.2), (0.06, 2.7, 2.2), S["paint_grey"])   # the cab back wall


def bogie_mesh(detail=2):
    bm = bmesh.new()
    seg = 18 if detail >= 2 else 10
    for x in (WB / 2, -WB / 2):
        cyl(bm, (x, 0, WHEEL_R), 0.075, GAUGE + 0.30, "y", S["metal_dark"], 10)               # axle
        for s in (1, -1):
            cyl(bm, (x, s * (GAUGE / 2 + 0.035), WHEEL_R), WHEEL_R, 0.13, "y", S["metal_dark"], seg)   # wheel
            cyl(bm, (x, s * (GAUGE / 2 + 0.035), WHEEL_R), WHEEL_R + 0.015, 0.03, "y", S["metal_dark"], seg)   # flange
            if detail >= 2:
                cyl(bm, (x, s * (GAUGE / 2 - 0.25), WHEEL_R), 0.30, 0.05, "y", S["paint_grey"], 14)   # brake disc
            box(bm, (x, s * (GAUGE / 2 + 0.24), WHEEL_R), (0.36, 0.22, 0.30), S["metal_dark"], 0.03)   # axle box
            if detail >= 2:
                cyl(bm, (x, s * (GAUGE / 2 + 0.24), WHEEL_R + 0.30), 0.10, 0.26, "z", S["paint_grey"], 10)   # primary spring
    for s in (1, -1):
        box(bm, (0, s * (GAUGE / 2 + 0.24), WHEEL_R + 0.48), (WB + 0.55, 0.22, 0.26), S["metal_dark"], 0.04)   # side frame
        if detail >= 2:
            cyl(bm, (0.35, s * (GAUGE / 2 + 0.24), WHEEL_R + 0.75), 0.17, 0.22, "z", S["rubber"], 14)   # air spring
            cyl(bm, (-0.75, s * (GAUGE / 2 + 0.40), WHEEL_R + 0.50), 0.045, 0.55, "x", S["paint_grey"], 8)   # yaw damper
    box(bm, (0, 0, WHEEL_R + 0.45), (0.45, GAUGE + 0.25, 0.24), S["metal_dark"], 0.03)            # transom
    if detail >= 2:
        box(bm, (0, 0, WHEEL_R + 0.35), (0.9, 0.5, 0.35), S["metal_dark"], 0.03)                   # traction motor / gearbox hint
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0003)
    return bm


def gangway_mesh():
    """the bellows between two cars: 0.72 m across the gap, inset from the body (the viewer turns it to the bisector)"""
    bm = bmesh.new()
    n = 9
    for k in range(n):
        x = -0.36 + 0.72 * (k + 0.5) / n
        w = 1.42 if k % 2 == 0 else 1.36
        box(bm, (x, 0, 2.05), (0.72 / n + 0.005, w, 2.42), S["rubber"])
    return bm


def panto_mesh():
    """single-arm pantograph on its base frame, raised to the contact wire (WIRE above the rail): origin at the base"""
    bm = bmesh.new()
    z0 = ROOF + 0.10
    for x, y in ((0.55, 0.42), (0.55, -0.42), (-0.55, 0.42), (-0.55, -0.42)):
        cyl(bm, (x, y, z0 + 0.08), 0.06, 0.18, "z", S["paint_door"], 10)        # insulators (red-brown)
    box(bm, (0, 0, z0 + 0.2), (1.3, 1.0, 0.06), S["metal_dark"], 0.01)
    hinge = Vector((-0.45, 0, z0 + 0.25)); head_z = WIRE - 0.03
    knee = Vector((0.95, 0, z0 + (head_z - z0) * 0.5)); head = Vector((-0.25, 0, head_z - 0.12))

    def bar(a, b, r):
        d = b - a; L = d.length
        vs = cyl(bm, (0, 0, 0), r, L, "z", S["metal_dark"], 8)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        for v in vs: v.co = q @ (v.co + Vector((0, 0, L / 2))) + a
    for y in (0.2, -0.2): bar(hinge + Vector((0, y, 0)), knee + Vector((0, y * 0.2, 0)), 0.032)
    for y in (0.05, -0.05): bar(knee + Vector((0, y, 0)), head + Vector((0, y * 5, 0)), 0.022)
    for dx in (0.12, -0.12): bar(Vector((head.x + dx, -0.8, head_z)), Vector((head.x + dx, 0.8, head_z)), 0.025)
    for y in (0.8, -0.8):
        s = 1 if y > 0 else -1
        bar(Vector((head.x, y, head_z)), Vector((head.x, y + s * 0.18, head_z - 0.14)), 0.016)
    return bm


# ------------------------------------------------------------------------------------------------ build the pieces
pieces, far = {}, {}
bm = body(L_END, "nose", "flat", END_DOORS, END_WINDOWS, 2); car_details(bm, L_END, "nose", 2); interior(bm, L_END, "nose")
pieces["EndCar"] = new_obj("EndCar", bm)
bm = body(L_MID, "flat", "flat", MID_DOORS, MID_WINDOWS, 2); car_details(bm, L_MID, "flat", 2); interior(bm, L_MID, "flat")
pieces["MidCar"] = new_obj("MidCar", bm)
pieces["Bogie"] = new_obj("Bogie", bogie_mesh(2))
pieces["Gangway"] = new_obj("Gangway", gangway_mesh())
pieces["Panto"] = new_obj("Panto", panto_mesh())
bm = body(L_END, "nose", "flat", END_DOORS, END_WINDOWS, 0); car_details(bm, L_END, "nose", 0)
far["EndCar_far"] = new_obj("EndCar_far", bm)
bm = body(L_MID, "flat", "flat", MID_DOORS, MID_WINDOWS, 0); car_details(bm, L_MID, "flat", 0)
far["MidCar_far"] = new_obj("MidCar_far", bm)
far["Bogie_far"] = new_obj("Bogie_far", bogie_mesh(0))

for o in list(pieces.values()) + list(far.values()):
    me = o.data
    for p in me.polygons: p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(38))
    # small bevels on the hard edges (boxes, frames); the lofted body has none sharper than 38 deg except its recesses
    if o.name.startswith(("Bogie", "Panto")):
        continue
    md = o.modifiers.new("bev", "BEVEL"); md.width = 0.008; md.segments = 1; md.limit_method = "ANGLE"; md.angle_limit = math.radians(50)
    md.use_clamp_overlap = True
    for oo in scn.objects: oo.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="bev")


def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)


counts = {k: tris(o) for k, o in list(pieces.items()) + list(far.items())}
print("AM08 triangles", counts, f"{time.time() - T0:.1f}s", flush=True)

# ------------------------------------------------------------------------------------------------ layout (distances from the unit's front coupler face)
x_end_front = 0.0
layout = {
    "length": 2 * L_END + L_MID, "width": 2 * HW, "height": ROOF, "wire": WIRE, "wheelR": WHEEL_R, "wheelbase": WB,
    "cars": [
        {"piece": "EndCar", "front": 0.0, "length": L_END, "flip": False, "bogies": [BOGIE_END_FROM_NOSE, BOGIE_END_FROM_NOSE + BOGIE_SPACING_END]},
        {"piece": "MidCar", "front": L_END, "length": L_MID, "flip": False, "bogies": [L_END + (L_MID - BOGIE_SPACING_MID) / 2, L_END + (L_MID + BOGIE_SPACING_MID) / 2], "panto": L_MID / 2 - 6.0},
        {"piece": "EndCar", "front": L_END + L_MID, "length": L_END, "flip": True, "bogies": [L_END + L_MID + L_END - BOGIE_END_FROM_NOSE - BOGIE_SPACING_END, 2 * L_END + L_MID - BOGIE_END_FROM_NOSE]},
    ],
    "gangways": [L_END, L_END + L_MID],
    "tris": counts,
    "measured": "length over couplers 79.91 m, 3 cars B-B + 2-2 + B-B, standard gauge (loco-info.com; SNCB)",
    "estimated": "car lengths 27.30 / 25.31 / 27.30 m, width 2.86 m, roof 4.15 m, door sill 0.96 m, window / door positions, bogie centres, nose shape, livery colours (from Wikimedia Commons photos 2019-2025), wheel 0.85 m, wheelbase 2.60 m",
    "slots": SLOTS,
}
json.dump(layout, open(os.path.join(OUT, "am08.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ AO into COLOR_0 (a whole unit assembled on a ground plane)
def place_copy(src, x, flip=False, z=0.0):
    o = src.copy(); o.data = src.data; scn.collection.objects.link(o)
    o.location = (x, 0, z); o.rotation_euler = (0, 0, math.pi if flip else 0); o.hide_render = False
    return o


assembly = []
def assemble(end, mid, bog):
    objs = []
    for car in layout["cars"]:
        cx = -(car["front"] + car["length"] / 2)
        src = end if car["piece"] == "EndCar" else mid
        objs.append(place_copy(src, cx, car["flip"]))
        for b in car["bogies"]:
            objs.append(place_copy(bog, -b))
    return objs


gm = bpy.data.meshes.new("ground"); bmg = bmesh.new()
bmesh.ops.create_grid(bmg, x_segments=1, y_segments=1, size=80); bmg.to_mesh(gm); bmg.free()
ground = bpy.data.objects.new("ground", gm); scn.collection.objects.link(ground); ground.location = (-40, 0, -0.35)
gmat = bpy.data.materials.new("gmat"); gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.25, 0.24, 0.22, 1)
gm.materials.append(gmat)
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 0.9
for o in list(pieces.values()) + list(far.values()):
    ca = o.data.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    o.data.color_attributes.active_color = ca
    o.hide_render = True
if BAKE:
    scn.cycles.samples = 64
    scn.render.bake.target = "VERTEX_COLORS"
    t = time.time()
    for group in ((pieces["EndCar"], pieces["MidCar"], pieces["Bogie"]), (far["EndCar_far"], far["MidCar_far"], far["Bogie_far"])):
        objs = assemble(*group)
        for target in group:
            for oo in scn.objects: oo.select_set(False)
            # bake on the instance at its place (shares the mesh with the piece): the first copy of that mesh
            inst = next(o for o in objs if o.data == target.data)
            inst.select_set(True); bpy.context.view_layer.objects.active = inst
            bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        for o in objs: bpy.data.objects.remove(o)
    for name in ("Gangway", "Panto"):
        o = pieces[name]; o.hide_render = False
        for oo in scn.objects: oo.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        o.hide_render = True
    print(f"AO bake {time.time() - t:.1f}s", flush=True)

for o in list(pieces.values()) + list(far.values()): o.hide_render = False
ground.hide_render = True
for oo in scn.objects: oo.select_set(oo.name in pieces or oo.name in far)
glb = os.path.join(OUT, "am08.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=False, export_normals=True, export_vertex_color="ACTIVE",
                          export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB", flush=True)

if not PREVIEW:
    sys.exit(0)
# ------------------------------------------------------------------------------------------------ previews: a unit on a straight track, the photos' angles
os.makedirs(PREVIEW, exist_ok=True)
for o in list(pieces.values()) + list(far.values()): o.hide_render = True
objs = assemble(pieces["EndCar"], pieces["MidCar"], pieces["Bogie"])
car = layout["cars"][1]
pt = place_copy(pieces["Panto"], -(car["front"] + car["length"] / 2) + car["panto"])
for k, gx in enumerate(layout["gangways"]): place_copy(pieces["Gangway"], -gx)
ground.hide_render = False
for m in mats:                         # AO from the bake multiplies the preview colour
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"
    mul = nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs["Fac"].default_value = 1.0
    mul.inputs["Color1"].default_value = (*PREVIEW_COL[m.name], 1)
    nt.links.new(a.outputs["Color"], mul.inputs["Color2"]); nt.links.new(mul.outputs["Color"], p.inputs["Base Color"])
    if m.name == "glass":
        p.inputs["Alpha"].default_value = 0.45
world = scn.world
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.3
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
scn.cycles.samples = 48; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1200, 800
scn.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam


def shot(fname, loc, look, lens):
    cam.location = Vector(loc); cam.data.lens = lens
    cam.rotation_euler = (Vector(look) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREVIEW, fname)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)


shot("am08_34front.png", (9.0, -6.5, 1.9), (-8.0, 0.0, 2.0), 26)     # like "AM 08049 Uccle-Calevoet 2025"
shot("am08_front.png", (8.0, -1.6, 1.8), (0.0, 0.0, 2.0), 35)
shot("am08_side.png", (-40.0, -38.0, 2.2), (-40.0, 0.0, 2.0), 30)
shot("am08_detail.png", (-3.0, -4.5, 1.2), (-6.0, 0.0, 1.0), 35)
print("DONE", time.time() - T0)
