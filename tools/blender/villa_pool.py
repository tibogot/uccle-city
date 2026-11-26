"""THE VILLA'S POOL KIT (claude/villa3 job 3, docs/VILLA_V3_PLAN.md item 5): the pieces a real villa pool has, cheap.

    tube(path, r, sides)          a round tube along a 3D polyline (parallel-transport frames), capped
    ladder(depth_out, rise)       two stainless handrails over the coping, three treads (only the parts above the water
                                  draw: the water's shader ray-traces the basin, not the geometry under its surface)
    lounger()                     an aluminium sun lounger (frame, legs, a tilted back), a cream cushion in two parts
    parasol()                     a cantilever-free centre-pole parasol: stone base, pole, a 2.6 m canopy with a rim
    planter(h)                    a tall square planter with a clipped shrub
All in the KIT frame (x right, y up, z = front), slots from the exterior set: metal_dark (frames: code door = brushed
stainless), concrete_soffit (canvas / cushions), stone_blue, hedge. Budget: the kit node Villa_kit <= 12k triangles,
<= 4 draws (one per slot), shown with LOD0 (< 70 m)."""
import bmesh, math
from mathutils import Vector, Matrix
import interior_kit as K

STAINLESS = 7          # (metal_dark's code `door`: viewer/villa/villaModel.js draws it as brushed steel)

def tube(path, r=0.021, sides=8):
    P = [Vector(p) for p in path]
    bm = bmesh.new()
    t0 = (P[1] - P[0]).normalized()
    a = Vector((1, 0, 0)) if abs(t0.x) < 0.9 else Vector((0, 1, 0))
    nrm = t0.cross(a).normalized()
    rings = []
    for i, p in enumerate(P):
        t = ((P[i + 1] - P[i]) if i < len(P) - 1 else (P[i] - P[i - 1])).normalized()
        if i > 0:
            tp = ((P[i] - P[i - 1])).normalized()
            tt = (tp + t).normalized() if (tp + t).length > 1e-6 else t
            nrm = (nrm - tt * nrm.dot(tt)).normalized()
        else:
            tt = t
        b = tt.cross(nrm).normalized()
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * math.pi * k / sides) + b * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)])
    for A, B in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new((A[k], A[(k + 1) % sides], B[(k + 1) % sides], B[k]))
    for R_, rev in ((rings[0], True), (rings[-1], False)):
        bm.faces.new(list(reversed(R_)) if rev else R_)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def ladder(over=0.42, rise=0.85, below=0.4, gap=0.5):
    """kit frame: the pool's wall at z = 0, the water at y = 0, the deck at y = deck (the coping top), the pool at -z"""
    parts = []
    for sx in (-1, 1):
        x = sx * gap / 2
        path = [(x, -below, -0.12)] + [(x, -below + (rise + below) * k / 6, -0.12) for k in range(1, 7)]
        top = rise
        for k in range(1, 9):              # the bend over the coping: a half circle of radius over / 2
            a = math.pi * k / 8; rr = over / 2
            path.append((x, top + math.sin(a) * rr * 0.9, -0.12 + rr - math.cos(a) * rr))
        path += [(x, top - 0.25, -0.12 + over), (x, 0.13, -0.12 + over)]     # down into its anchor in the deck
        parts.append((tube(path, 0.021, 8), "metal_dark", STAINLESS))
    return parts

def lounger():
    """1.95 m x 0.66 m, the head at -z raised 35 degrees, seat height 0.32"""
    parts = []
    L, W_, H = 1.95, 0.66, 0.3
    for sx in (-1, 1):
        parts.append((K.xform(K.box(0.035, 0.05, L * 0.66, 0.006, 1), K.T(sx * (W_ / 2 - 0.02), H - 0.05, L * 0.17)), "metal_dark", 0))
        for z in (-L / 2 + 0.12, L / 2 - 0.08):
            parts.append((K.xform(K.box(0.035, H - 0.05, 0.035, 0.005, 1), K.T(sx * (W_ / 2 - 0.02), 0, z)), "metal_dark", 0))
        # (the back rail hinged at the joint z = -L/2 + 0.7 L: built from the hinge toward the head, then tipped up)
        parts.append((K.xform(K.xform(K.box(0.035, 0.05, L * 0.34, 0.006, 1), K.T(0, 0, -L * 0.17)), K.T(sx * (W_ / 2 - 0.026), H - 0.05, -L / 2 + L * 0.34, rx=35)), "metal_dark", 0))
    parts.append((K.xform(K.soft(W_ - 0.06, 0.07, L * 0.64, r=0.03, n=(4, 2, 7), puff=0.008), K.T(0, H, L * 0.17)), "concrete_soffit", 0))
    parts.append((K.xform(K.xform(K.soft(W_ - 0.06, 0.07, L * 0.32, r=0.03, n=(4, 2, 4), puff=0.008), K.T(0, 0, -L * 0.16 - 0.01)), K.T(0, H + 0.005, -L / 2 + L * 0.34, rx=35)), "concrete_soffit", 0))
    return parts

def parasol(h=2.45, R=1.3):
    parts = [(K.box(0.5, 0.08, 0.5, 0.01, 1), "stone_blue", 0)]
    parts.append((K.lathe([(0.026, 0.08), (0.026, h)], seg=10, cap_top=False), "metal_dark", 0))
    can = K.lathe([(0.0, h + 0.38), (0.12, h + 0.33), (R * 0.6, h + 0.16), (R, h), (R, h - 0.08), (R * 0.97, h - 0.08), (R * 0.58, h + 0.08), (0.06, h + 0.24)], seg=12, cap_top=False)
    parts.append((can, "concrete_soffit", 0))
    return parts

def planter(h=0.75, s=0.5, shrub=0.62):
    parts = [(K.box(s, h, s, 0.008, 1), "metal_dark", 0)]
    parts.append((K.xform(K.soft(shrub, shrub * 0.85, shrub, r=shrub * 0.45, n=(5, 4, 5), puff=0.02, seed=3), K.T(0, h - 0.06, 0)), "hedge", 0))
    return parts
