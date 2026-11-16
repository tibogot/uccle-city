"""CARS 2: the city's generic European cars, rebuilt with smooth LOFTED bodies (docs/CARS2.md). Replaces the faceted
family (tools/blender/carFaceted.py, kept behind ?cars=old) whose fronts read as 1980s one-box MPVs.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/cars2.py -- models/cars
      models/cars/cars2.glb    one root node per car type, the pack contract of carFaceted.py (COLOR_0 = palette x baked
                               AO, _KIND, one material) + AUTHORED LODs: Body / Wheel_FL..RR (LOD0), Body_L1 / Wheel_*_L1
                               (LOD1), Body_L2 / Wheel_*_L2 (LOD2, the ~250-triangle stand-in)
    ... --only hatch_c,police   --no-bake   --samples 64
    Look at them: tools/blender/carSheet.py models/cars/cars2.glb docs/cars2/new [--lod 1]

THE METHOD (after Mr.doob's slop-newyork js/cars.js, our own code and numbers): each body is a table of smooth side-
and plan-view curves (monotone cubic splines through [z, value] knots: half width, sill, shoulder = widest point, top
edge = bonnet / belt / boot line, crown, tumblehome) plus superelliptic roundings into the nose and tail and a RAKE
(the fascia slopes back from the bumper to the bonnet, rounded in plan). Cross-sections are sampled along the car
(dense over the nose, tail and the wheel arches, sparse along the doors) and lofted:
  - a body TUBE (sill -> lower corner -> shoulder -> upper corner -> crown, both sides) whose lower edge rises round
    the wheels (circular wheel arches with no boolean), closed at the nose and tail by CAPS that follow the rake;
  - a GLASSHOUSE loft on the belt line (raked windscreen and backlight, tumblehome side glass, crowned roof).
Unlike slop (which paints every detail in one shader), the detail here is GEOMETRY + per-vertex palette, because the
city's car material is shared by every fleet, LOD and the player's car (viewer/drive/carPacks.js packMaterial: _KIND
0 fixed, 1 paint, 2 head lamp, 3 tail lamp, 4 glass, 5 chrome / gloss, 6 rubber, 7 plate, 8 interior):
  - every region edge (lamps, grille, intakes, shut lines, pillars, liveries) is a ROW of the loft: the profile is
    sampled at the parameters where those heights fall at the nose / tail, so the lines run along the body following
    its own sweep (the bonnet shut line climbs to the cowl along the wing top, as on real cars);
  - lamps, grilles and intakes are INSET (a bezel, a recess, a lens); glass is inset into a black frame and recessed;
  - wheels are separate meshes (Wheel_*) so the traffic rolls and steers them (vertex shader, per-vertex wheel centre);
  - weighted normals, hard edges only at region changes and real creases; Cycles AO baked per vertex (OptiX).
Belgian plates (random characters, no real registration), no brand, no logo: generic designs at real proportions
(VW Polo / Peugeot 208 class, Golf / 308, Octavia Combi, BMW 3 / A4 class, 2008 / Captur, Kangoo / Berlingo,
Transporter / Trafic), the Brussels taxi and the Belgian police estate (white, blue + fluorescent yellow
Battenburg band, POLICE lettering, real tail-light clusters).
"""
import bpy, bmesh, math, os, sys, struct, json, random, time
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/cars")
ONLY = set(arg("--only").split(",")) if arg("--only") else None
BAKE = "--no-bake" not in ARGS
SAMPLES = int(arg("--samples", "96"))
NAME = arg("--name", "cars2")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ palette
# (name, kind, linear rgb). Paint entries hold a SHADE (the viewer multiplies the per-instance paint colour).
PAL = [
    ("paint", 1, (1, 1, 1)),
    ("paint_seam", 1, (0.16, 0.16, 0.16)),        # shut lines: a dark line in the paint colour
    ("trim", 0, (0.020, 0.020, 0.022)),            # black textured plastic
    ("rubber", 6, (0.012, 0.012, 0.013)),          # window seals
    ("glass", 4, (0.020, 0.024, 0.028)),
    ("glass_dark", 4, (0.006, 0.007, 0.008)),      # privacy glass (estates, SUVs, vans: rear)
    ("chrome", 5, (0.60, 0.61, 0.62)),
    ("gloss", 5, (0.025, 0.025, 0.027)),           # gloss black: B pillars, grilles, lamp housings
    ("head", 2, (0.86, 0.87, 0.90)),               # head lamp lens / DRL
    ("head_in", 2, (0.26, 0.27, 0.29)),            # inside the lens: the reflector (smoked)
    ("tail", 3, (0.33, 0.012, 0.010)),
    ("tail_hi", 3, (0.66, 0.035, 0.025)),
    ("tail_dark", 3, (0.10, 0.006, 0.006)),        # smoked tail lens
    ("reverse", 0, (0.70, 0.70, 0.70)),
    ("amber", 0, (0.75, 0.30, 0.02)),
    ("plate", 7, (0.80, 0.80, 0.78)),
    ("plate_red", 0, (0.50, 0.015, 0.02)),
    ("plate_blue", 0, (0.010, 0.035, 0.22)),
    ("interior", 8, (0.028, 0.028, 0.030)),
    ("seat", 8, (0.050, 0.048, 0.046)),
    ("liner", 0, (0.010, 0.010, 0.011)),           # wheel-well liners, deep recesses
    ("under", 0, (0.016, 0.016, 0.017)),
    ("tyre", 6, (0.020, 0.020, 0.021)),
    ("tyre_side", 6, (0.030, 0.030, 0.031)),
    ("rim", 0, (0.34, 0.35, 0.37)),
    ("rim_dark", 0, (0.030, 0.030, 0.032)),
    ("disc", 5, (0.22, 0.22, 0.22)),
    ("white", 0, (0.78, 0.78, 0.76)),
    ("sign", 2, (0.95, 0.55, 0.06)),               # taxi roof-sign letters (lit at night: head-lamp kind)
    ("skid", 0, (0.38, 0.39, 0.40)),               # SUV skid plates
    ("taxi_yellow", 0, (0.80, 0.52, 0.02)),
    ("pol_blue", 0, (0.010, 0.040, 0.30)),         # Belgian police: blue
    ("pol_yellow", 0, (0.72, 0.80, 0.0)),          # fluorescent yellow (lime)
    ("pol_white", 0, (0.80, 0.80, 0.79)),          # the police estate's white (keepPaint: drawn as fixed colour)
]
M = {n: i for i, (n, _, _) in enumerate(PAL)}
MATS = [bpy.data.materials.new(n) for n, _, _ in PAL]

def lerp(a, b, t): return a + (b - a) * t
def clamp(x, a, b): return a if x < a else b if x > b else x

# ------------------------------------------------------------------------------------------------ curves
def smooth_curve(points):
    """Monotone cubic (Fritsch-Carlson) through [x, y] knots: smooth, never overshoots; clamped outside."""
    pts = sorted(points)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; n = len(pts)
    if n == 1: return lambda x: ys[0]
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [d[0]]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0: m.append(0.0)
        else:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m.append((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]))
    m.append(d[-1])
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = 0
        while x > xs[i + 1]: i += 1
        t = (x - xs[i]) / h[i]; t2 = t * t; t3 = t2 * t
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]
    return f

def end_factor(z, tip, length, e=2.0):
    """1 along the body, 0 at the tip along a superelliptic quarter (vertical tangent at the tip)."""
    u = (z - (tip - length)) / length if tip > 0 else (tip + length - z) / length
    if u <= 0: return 1.0
    if u >= 1: return 0.0
    return (1 - u ** e) ** (1 / e)

# ------------------------------------------------------------------------------------------------ the car types
# Car frame: x LEFT, y up, z forward; origin on the ground midway between the axles. Lengths in metres.
# Curves: [[z, value]]; nose / tail: key -> [length, tip value, exponent] (the value rounds into the tip over length);
# noseRake / tailRake: setback of the fascia by height (+ plan * x^2), eased in over `length`.
# cabin: cowl (windscreen base z), roofFront / roofRear (header / backlight top), deck (backlight base), roofY,
# rail (roof-rail half widths front / rear), sail (side glass starts this far behind the cowl), pillars [(z0, z1, mat)],
# glassEnd (side glass ends: C / D pillar). Regions on the nose / tail: (name, mat, (y0, y1) at the tip, (f0, f1) of
# the half width, wrap = metres round onto the sides, tag = inset group).
def S(**k): return k

HATCH_C = S(
    label="compact hatchback", type="hatchback", paint=(0.025, 0.07, 0.17),
    zFront=2.19, zRear=-2.10, wheelZ=1.32, wheelR=0.316, rimR=0.205, tyreW=0.205, wheelX=0.772,
    archGap=0.042, archFlare=0.014, archPow=2.2, tuck=0.07,
    halfWidth=[[2.19, 0.86], [1.32, 0.892], [0, 0.897], [-1.32, 0.895], [-2.10, 0.875]],
    sill=[[2.19, 0.27], [1.1, 0.25], [-1.1, 0.25], [-2.10, 0.31]],
    shoulder=[[2.19, 0.60], [1.6, 0.68], [1.32, 0.70], [0, 0.72], [-1.32, 0.76], [-2.10, 0.78]],
    edge=[[2.06, 0.79], [1.75, 0.86], [1.35, 0.915], [1.02, 0.955], [0.5, 0.972], [-0.5, 0.99], [-1.3, 1.015], [-1.75, 1.025], [-2.0, 1.02]],
    crown=[[2.06, 0.032], [1.15, 0.028], [0.98, 0.002], [-2.1, 0.002]],
    tumble=[[2.19, 0.09], [1.0, 0.085], [-1.3, 0.10], [-2.1, 0.10]],
    nose=dict(halfWidth=[0.34, 0.66, 2.6], edge=[0.13, 0.745, 2.4], crown=[0.13, 0.008, 2], sill=[0.2, 0.22, 2], shoulder=[0.24, 0.55, 2.4]),
    tail=dict(halfWidth=[0.26, 0.72, 2.8], edge=[0.07, 0.985, 3], crown=[0.07, 0.0, 2], sill=[0.18, 0.33, 2], shoulder=[0.2, 0.76, 2.6]),
    noseRake=dict(length=0.56, y=[[0.22, 0.05], [0.32, 0.0], [0.50, 0.0], [0.60, 0.03], [0.70, 0.09], [0.76, 0.15]], plan=0.08),
    tailRake=dict(length=0.40, y=[[0.33, 0.06], [0.46, 0.0], [0.62, 0.0], [0.80, 0.01], [0.98, 0.035]], plan=0.06),
    cabin=dict(cowl=1.02, roofFront=0.16, roofRear=-1.56, deck=-1.97, roofY=[[0.16, 1.43], [-0.55, 1.456], [-1.56, 1.42]],
               rail=[0.64, 0.60], inset=0.035, bulge=0.012, roofEdge=0.05, roofCrown=0.03, roofRound=4.0, sail=0.15,
               pillars=[(-0.27, -0.18, "gloss")], glassEnd=-1.36, backGlass="glass_dark", sideRearGlass="glass"),
    back="hatch", doors=[0.995, -0.225, -1.10], handles=[-0.06, -0.92], handleY=0.905,
    front=[("chin", "trim", (0.0, 0.29), (0, 1), 4, None),
           ("intake", "gloss", (0.29, 0.43), (0, 0.60), 0, "intake"),
           ("fog", "gloss", (0.29, 0.43), (0.72, 0.90), 0, "fog"),
           ("bumper", "paint_seam", (0.552, 0.558), (0, 1), 4, None),
           ("grille", "gloss", (0.605, 0.70), (0, 0.46), 0, "grille"),
           ("head", "gloss", (0.605, 0.70), (0.50, 1), 0.22, "head"),
           ("bonnet", "paint_seam", (0.722, 0.728), (0, 1), 9, None)],
    rear=[("diff", "trim", (0.0, 0.38), (0, 1), 4, None),
          ("refl", "tail", (0.43, 0.47), (0.72, 0.90), 0, "refl"),
          ("bumper", "paint_seam", (0.565, 0.571), (0, 1), 4, None),
          ("gate", "paint_seam", (0.79, 0.796), (0, 0.60), 0, None),
          ("tail", "gloss", (0.835, 0.965), (0.60, 1), 0.15, "tail")],
    plateF=0.44, plateR=0.665, rearSeamZ=0.12, rearSeamY=0.79,
)

def remap(sp, zmap=None, ymap=None, xs=1.0, **over):
    """A new type from a base: z through the piecewise-linear zmap [(old, new)], heights through ymap, widths * xs."""
    zm = smooth_lin(zmap) if zmap else (lambda z: z)
    ym = smooth_lin(ymap) if ymap else (lambda y: y)
    out = json.loads(json.dumps(sp))
    out["zFront"], out["zRear"], out["wheelZ"] = zm(sp["zFront"]), zm(sp["zRear"]), zm(sp["wheelZ"])
    for k in ("sill", "shoulder", "edge"):
        out[k] = [[zm(z), ym(v)] for z, v in sp[k]]
    out["halfWidth"] = [[zm(z), v * xs] for z, v in sp["halfWidth"]]
    out["crown"] = [[zm(z), v] for z, v in sp["crown"]]
    out["tumble"] = [[zm(z), v * xs] for z, v in sp["tumble"]]
    for end in ("nose", "tail"):
        for k, v in sp[end].items():
            out[end][k] = [v[0], ym(v[1]) if k in ("edge", "sill", "shoulder") else v[1] * xs if k == "halfWidth" else v[1], v[2]]
    for end in ("noseRake", "tailRake"):
        out[end]["y"] = [[ym(y), s] for y, s in sp[end]["y"]]
    c = out["cabin"]; c0 = sp["cabin"]
    for k in ("cowl", "roofFront", "roofRear", "deck", "glassEnd"): c[k] = zm(c0[k])
    c["roofY"] = [[zm(z), ym(y)] for z, y in c0["roofY"]]
    c["rail"] = [r * xs for r in c0["rail"]]
    c["pillars"] = [[zm(a), zm(b), m] for a, b, m in c0["pillars"]]
    out["doors"] = [zm(z) for z in sp["doors"]]; out["handles"] = [zm(z) for z in sp["handles"]]
    out["handleY"] = ym(sp["handleY"])
    for end in ("front", "rear"):
        out[end] = [[n, m, [ym(y[0]), ym(y[1])], f, w, t] for n, m, y, f, w, t in sp[end]]
    out["plateF"], out["plateR"], out["rearSeamY"] = ym(sp["plateF"]), ym(sp["plateR"]), ym(sp["rearSeamY"])
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict): out[k].update(v)
        else: out[k] = v
    return out

def smooth_lin(knots):
    ks = sorted(knots)
    def f(x):
        if x <= ks[0][0]: return x + (ks[0][1] - ks[0][0])
        if x >= ks[-1][0]: return x + (ks[-1][1] - ks[-1][0])
        for (a, A), (b, B) in zip(ks, ks[1:]):
            if x <= b: return lerp(A, B, (x - a) / (b - a))
    return f

# small hatchback (Polo / 208 / Clio / Yaris class): 4.05 x 1.75 x 1.45, WB 2.56
HATCH_S = remap(HATCH_C, zmap=[(-2.10, -1.95), (-1.32, -1.28), (1.32, 1.28), (2.19, 2.11)], xs=0.978,
                ymap=[(0, 0), (0.30, 0.29), (1.0, 0.985), (1.456, 1.45)],
                label="small hatchback", paint=(0.42, 0.03, 0.03), wheelR=0.30, rimR=0.19, tyreW=0.185, wheelX=0.752)
HATCH_S["nose"]["halfWidth"] = [0.36, 0.64, 2.4]
HATCH_S["cabin"]["roofRear"] = -1.58; HATCH_S["cabin"]["deck"] = -1.88
HATCH_S["front"] = [("chin", "trim", (0.0, 0.26), (0, 1), 0.3, None),
                    ("intake", "gloss", (0.28, 0.45), (0, 0.66), 0, "intake"),
                    ("bumper", "paint_seam", (0.535, 0.541), (0, 1), 0.36, None),
                    ("grille", "gloss", (0.57, 0.67), (0, 0.42), 0, "grille"),
                    ("head", "gloss", (0.585, 0.69), (0.46, 1), 0.26, "head"),
                    ("bonnet", "paint_seam", (0.712, 0.718), (0, 1), 9, None)]
HATCH_S["rear"] = [("diff", "trim", (0.0, 0.43), (0, 1), 0.28, None),
                   ("refl", "tail", (0.45, 0.48), (0.76, 0.93), 0, "refl"),
                   ("bumper", "paint_seam", (0.555, 0.561), (0, 1), 0.3, None),
                   ("tail", "gloss", (0.80, 0.96), (0.70, 1), 0.20, "tail")]

# estate (Octavia Combi / Passat Variant class): 4.69 x 1.83 x 1.47, WB 2.69
ESTATE = remap(HATCH_C, zmap=[(-2.10, -2.425), (-1.32, -1.345), (1.32, 1.345), (2.19, 2.265)], xs=1.02,
               ymap=[(0, 0), (1.0, 1.005), (1.456, 1.47)],
               label="estate", type="estate", paint=(0.30, 0.31, 0.32), rails=True)
ESTATE["edge"] = [[2.13, 0.80], [1.8, 0.87], [1.38, 0.92], [1.04, 0.955], [0.4, 0.975], [-0.6, 0.99], [-1.6, 1.01], [-2.1, 1.02], [-2.33, 1.02]]
ESTATE["shoulder"] = [[2.265, 0.60], [1.345, 0.70], [0, 0.72], [-1.345, 0.76], [-2.425, 0.78]]
ESTATE["crown"] = [[2.13, 0.032], [1.2, 0.028], [1.0, 0.002], [-2.425, 0.002]]
ESTATE["cabin"].update(cowl=1.03, roofFront=0.17, roofRear=-2.20, deck=-2.36, roofY=[[0.17, 1.44], [-1.0, 1.47], [-2.2, 1.45]],
                       rail=[0.65, 0.62], pillars=[[-0.30, -0.21, "gloss"], [-1.34, -1.40, "gloss"]], glassEnd=-2.06, sideRearGlass="glass_dark")
ESTATE["doors"] = [1.01, -0.255, -1.30]; ESTATE["handles"] = [-0.08, -1.10]
ESTATE["rear"] = [("diff", "trim", (0.0, 0.46), (0, 1), 0.28, None),
                  ("refl", "tail", (0.48, 0.51), (0.76, 0.93), 0, "refl"),
                  ("bumper", "paint_seam", (0.575, 0.581), (0, 1), 0.3, None),
                  ("gate", "paint_seam", (0.80, 0.806), (0, 0.6), 0, None),
                  ("tail", "gloss", (0.84, 0.985), (0.60, 1), 0.13, "tail")]
ESTATE["tail"]["edge"] = [0.07, 1.0, 3]
ESTATE["rearSeamZ"] = 0.10

# saloon (BMW 3 / Audi A4 / Mercedes C class, notchback): 4.71 x 1.83 x 1.44, WB 2.85
SALOON = remap(HATCH_C, zmap=[(-2.10, -2.465), (-1.32, -1.425), (1.32, 1.425), (2.19, 2.245)], xs=1.02,
               ymap=[(0, 0), (1.0, 0.995), (1.456, 1.44)],
               label="saloon", type="sedan", paint=(0.012, 0.013, 0.015), back="notch", wheelR=0.325, rimR=0.215, tyreW=0.225, wheelX=0.785)
SALOON["edge"] = [[2.12, 0.78], [1.75, 0.855], [1.3, 0.915], [0.9, 0.945], [0.3, 0.965], [-0.6, 0.985], [-1.3, 1.005], [-1.62, 1.01], [-2.2, 1.0], [-2.40, 0.985]]
SALOON["shoulder"] = [[2.245, 0.60], [1.425, 0.70], [0, 0.72], [-1.425, 0.75], [-2.465, 0.76]]
SALOON["crown"] = [[2.1, 0.034], [1.0, 0.03], [0.88, 0.002], [-1.58, 0.002], [-1.70, 0.016], [-2.40, 0.012]]
SALOON["tail"] = dict(halfWidth=[0.30, 0.74, 2.8], edge=[0.09, 0.965, 3], crown=[0.09, 0.0, 2], sill=[0.18, 0.36, 2], shoulder=[0.22, 0.74, 2.6])
SALOON["tailRake"] = dict(length=0.42, y=[[0.36, 0.06], [0.48, 0.0], [0.66, 0.0], [0.82, 0.012], [0.965, 0.045]], plan=0.07)
SALOON["cabin"].update(cowl=0.90, roofFront=0.05, roofRear=-0.98, deck=-1.62, roofY=[[0.05, 1.41], [-0.45, 1.44], [-0.98, 1.41]],
                       rail=[0.66, 0.62], pillars=[[-0.36, -0.27, "gloss"]], glassEnd=-1.24, sideRearGlass="glass", backGlass="glass")
SALOON["doors"] = [0.885, -0.31, -1.22]; SALOON["handles"] = [-0.16, -1.05]
SALOON["rear"] = [("diff", "trim", (0.0, 0.42), (0, 1), 0.30, None),
                  ("refl", "tail", (0.45, 0.48), (0.76, 0.93), 0, "refl"),
                  ("bumper", "paint_seam", (0.575, 0.581), (0, 1), 0.34, None),
                  ("lid", "paint_seam", (0.775, 0.781), (0, 0.50), 0, None),
                  ("tail", "gloss", (0.80, 0.93), (0.50, 1), 0.24, "tail")]
SALOON["plateR"] = 0.66
SALOON["rearSeamZ"] = 0.0

# small SUV / crossover (Peugeot 2008 / Renault Captur / VW T-Roc class): 4.30 x 1.80 x 1.57, WB 2.62
SUV = remap(HATCH_C, zmap=[(-2.10, -2.12), (-1.32, -1.31), (1.32, 1.31), (2.19, 2.18)], xs=1.006,
            ymap=[(0, 0), (0.22, 0.32), (0.6, 0.73), (1.0, 1.10), (1.456, 1.57)],
            label="small SUV", type="suv", paint=(0.06, 0.12, 0.10), wheelR=0.345, rimR=0.215, tyreW=0.215, wheelX=0.78,
            archGap=0.05, archFlare=0.03, clad=0.50, rails=True, skid=True)
SUV["cabin"].update(sideRearGlass="glass_dark", rail=[0.63, 0.60])
SUV["front"] = [("chin", "skid", (0.0, 0.40), (0, 0.55), 0, None),
                ("chin2", "trim", (0.0, 0.40), (0.55, 1), 0.3, None),
                ("intake", "gloss", (0.42, 0.58), (0, 0.62), 0, "intake"),
                ("bumper", "paint_seam", (0.645, 0.651), (0, 1), 0.36, None),
                ("grille", "gloss", (0.68, 0.79), (0, 0.50), 0, "grille"),
                ("head", "gloss", (0.70, 0.80), (0.52, 1), 0.22, "head"),
                ("bonnet", "paint_seam", (0.822, 0.828), (0, 1), 9, None)]
SUV["rear"] = [("diff", "skid", (0.0, 0.50), (0, 0.5), 0, None),
               ("diff2", "trim", (0.0, 0.50), (0.5, 1), 0.28, None),
               ("refl", "tail", (0.53, 0.56), (0.76, 0.93), 0, "refl"),
               ("bumper", "paint_seam", (0.665, 0.671), (0, 1), 0.3, None),
               ("gate", "paint_seam", (0.90, 0.906), (0, 0.56), 0, None),
               ("tail", "gloss", (0.94, 1.07), (0.56, 1), 0.15, "tail")]

# compact van (Renault Kangoo / Citroen Berlingo / VW Caddy class): 4.49 x 1.86 x 1.84, WB 2.72
VAN_C = S(
    label="compact van", type="van", paint=(0.62, 0.62, 0.60), clad=0.42,
    zFront=2.27, zRear=-2.22, wheelZ=1.36, wheelR=0.32, rimR=0.19, tyreW=0.205, wheelX=0.79,
    archGap=0.045, archFlare=0.02, archPow=2.2, tuck=0.06,
    halfWidth=[[2.27, 0.88], [1.36, 0.92], [0, 0.93], [-1.36, 0.93], [-2.22, 0.92]],
    sill=[[2.27, 0.33], [1.1, 0.30], [-1.1, 0.30], [-2.22, 0.36]],
    shoulder=[[2.27, 0.66], [1.36, 0.76], [0, 0.80], [-1.36, 0.84], [-2.22, 0.86]],
    edge=[[2.14, 0.89], [1.85, 0.97], [1.45, 1.04], [1.12, 1.075], [0.5, 1.085], [-1.0, 1.10], [-2.1, 1.11]],
    crown=[[2.14, 0.03], [1.2, 0.025], [1.08, 0.002], [-2.22, 0.002]],
    tumble=[[2.27, 0.08], [1.0, 0.06], [-2.22, 0.05]],
    nose=dict(halfWidth=[0.34, 0.70, 2.6], edge=[0.12, 0.86, 2.4], crown=[0.12, 0.008, 2], sill=[0.2, 0.28, 2], shoulder=[0.24, 0.62, 2.4]),
    tail=dict(halfWidth=[0.12, 0.84, 3.2], edge=[0.04, 1.09, 3], crown=[0.04, 0.0, 2], sill=[0.12, 0.38, 2], shoulder=[0.1, 0.84, 3]),
    noseRake=dict(length=0.56, y=[[0.28, 0.05], [0.40, 0.0], [0.58, 0.0], [0.70, 0.04], [0.80, 0.10], [0.86, 0.15]], plan=0.08),
    tailRake=dict(length=0.25, y=[[0.38, 0.04], [0.50, 0.0], [0.80, 0.0], [1.09, 0.008]], plan=0.03),
    cabin=dict(cowl=1.13, roofFront=0.30, roofRear=-2.13, deck=-2.20, roofY=[[0.30, 1.80], [-0.6, 1.84], [-2.13, 1.83]],
               rail=[0.80, 0.82], inset=0.03, bulge=0.008, roofEdge=0.06, roofCrown=0.03, roofRound=5.0, sail=0.16,
               pillars=[[-0.18, -0.08, "gloss"], [-1.30, -1.40, "paint"]], glassEnd=-2.02, backGlass="glass_dark", sideRearGlass="glass_dark"),
    back="box", doors=[1.12, -0.13, -1.36], slide=True, handles=[0.0, -0.30], handleY=0.98,
    front=[("chin", "trim", (0.0, 0.48), (0, 1), 0.34, None),
           ("intake", "gloss", (0.32, 0.46), (0, 0.66), 0, "intake"),
           ("grille", "gloss", (0.62, 0.76), (0, 0.52), 0, "grille"),
           ("head", "gloss", (0.64, 0.78), (0.55, 1), 0.24, "head"),
           ("bonnet", "paint_seam", (0.812, 0.818), (0, 1), 9, None)],
    rear=[("diff", "trim", (0.0, 0.52), (0, 1), 0.2, None),
          ("tail", "gloss", (0.62, 1.04), (0.84, 1), 0.05, "tail")],
    plateF=0.40, plateR=0.62, rearSeamZ=0.0, rearSeamY=0.6,
)

# panel van (VW Transporter / Renault Trafic class, H1): 4.99 x 1.92 x 1.98, WB 3.0; cargo body, glass in the cab only
VAN_P = remap(VAN_C, zmap=[(-2.22, -2.52), (-1.36, -1.50), (1.36, 1.50), (2.27, 2.47)], xs=1.035,
              ymap=[(0, 0), (0.3, 0.31), (1.1, 1.12), (1.84, 1.98)],
              label="panel van", paint=(0.70, 0.70, 0.68), wheelR=0.335, rimR=0.20, tyreW=0.215, wheelX=0.83, cargo=True)
VAN_P["edge"] = [[2.34, 0.95], [2.05, 1.03], [1.70, 1.09], [1.45, 1.12], [0.5, 1.13], [-1.0, 1.14], [-2.4, 1.14]]
VAN_P["cabin"].update(cowl=1.48, roofFront=0.88, roofRear=-2.44, deck=-2.50, roofY=[[0.88, 1.93], [0.3, 1.98], [-2.44, 1.98]],
                      rail=[0.86, 0.90], pillars=[], glassEnd=0.30, roofRound=7.0)
VAN_P["doors"] = [1.47, 0.32, -0.62]; VAN_P["handles"] = [0.48, -0.50]

# Brussels taxi: the saloon in black, yellow chequer line, amber TAXI roof sign; keeps its livery
TAXI = json.loads(json.dumps(SALOON)); TAXI.update(label="Brussels taxi", type="taxi", paint=(0.010, 0.010, 0.011), keepPaint=True, taxi=True)
# Belgian police estate (federal / local police): white, a blue + fluorescent yellow Battenburg band along the sides
# and across the tailgate, POLICE lettering; keeps its livery
POLICE = json.loads(json.dumps(ESTATE)); POLICE.update(label="police estate", type="police", paint=(0.80, 0.80, 0.79), keepPaint=True, police=True, rails=False)

TYPES = {"hatch_s": HATCH_S, "hatch_c": HATCH_C, "estate": ESTATE, "saloon": SALOON, "suv": SUV, "van_c": VAN_C,
         "van_p": VAN_P, "taxi": TAXI, "police": POLICE}

# ------------------------------------------------------------------------------------------------ body profile
LOWER_N, UPPER_N = 2.8, 3.2

def body_fn(sp):
    W0, B0, S0, E0, C0, T0 = (smooth_curve(sp[k]) for k in ("halfWidth", "sill", "shoulder", "edge", "crown", "tumble"))
    archR = sp["wheelR"] + sp["archGap"]
    axles = (sp["wheelZ"], -sp["wheelZ"])
    def rounded(z, v, key):
        n, t = sp["nose"].get(key), sp["tail"].get(key)
        if n and z > 0: v = n[1] + (v - n[1]) * end_factor(z, sp["zFront"], n[0], n[2])
        if t and z < 0: v = t[1] + (v - t[1]) * end_factor(z, sp["zRear"], t[0], t[2])
        return v
    def body(z):
        flare = 0.0
        for a in axles:
            d = (z - a) / (archR + 0.4)
            if abs(d) < 1: flare = max(flare, (1 - d * d) ** 2)
        W = rounded(z, W0(z) + sp["archFlare"] * flare, "halfWidth")
        ySill = rounded(z, B0(z), "sill")
        yB = ySill
        p = sp.get("archPow", 2.0)
        for a in axles:
            d = abs(z - a)
            if d < archR:
                yB = max(yB, ySill + (sp["wheelR"] + archR - ySill) * (1 - (d / archR) ** p) ** (1 / p))
        yE = rounded(z, E0(z), "edge")
        yT = yE + max(0.0, rounded(z, C0(z), "crown"))
        yS = min(max(rounded(z, S0(z), "shoulder"), yB + 0.035), yE - 0.035)
        xE = max(W - T0(z), W * 0.55)
        return dict(z=z, W=W, yB=yB, ySill=ySill, yS=yS, yE=yE, yT=yT, xE=xE, xB=W - sp["tuck"])
    return body

def prof_pt(b, s):
    """Right-half section point at parameter s: [0,1] lower corner, [1,2] upper corner, [2,3] crown (3 = centre)."""
    if s <= 1:
        a = s * math.pi / 2
        y = b["yS"] - (b["yS"] - b["yB"]) * math.cos(a) ** (2 / LOWER_N)
        u = clamp((b["yS"] - y) / max(b["yS"] - b["ySill"], 1e-4), 0, 1)
        x = b["xB"] + (b["W"] - b["xB"]) * max(0.0, 1 - u ** LOWER_N) ** (1 / LOWER_N)
        return x, y
    if s <= 2:
        a = (s - 1) * math.pi / 2
        return (b["xE"] + (b["W"] - b["xE"]) * max(math.cos(a), 0) ** (2 / UPPER_N),
                b["yS"] + (b["yE"] - b["yS"]) * math.sin(a) ** (2 / UPPER_N))
    f = 3 - s
    return b["xE"] * f, b["yE"] + (b["yT"] - b["yE"]) * (1 - f * f)

def s_of_y(b, y):
    """The profile parameter (0..2) where the section reaches height y (bisection; y is monotone in s there)."""
    lo, hi = 0.0, 2.0
    if y <= b["yB"]: return 0.0
    if y >= b["yE"]: return 2.0
    for _ in range(40):
        m = (lo + hi) / 2
        if prof_pt(b, m)[1] < y: lo = m
        else: hi = m
    return (lo + hi) / 2

def rake_fn(sp):
    ends = []
    for key, tip, d in (("noseRake", sp["zFront"], 1), ("tailRake", sp["zRear"], -1)):
        r = sp.get(key)
        if r: ends.append((tip, d, r["length"], r.get("plan", 0.0), smooth_curve(r["y"])))
    def rake(x, y, z):
        for tip, d, L, plan, sb in ends:
            u = ((z - tip) * d + L) / L
            if u > 0: return z - d * (sb(y) + plan * x * x) * u * u
        return z
    return rake

# ------------------------------------------------------------------------------------------------ mesh builder
class MB:
    """bmesh in CAR coordinates (x left, y up, z forward) -> Blender (x, -z, y)."""
    def __init__(self):
        self.bm = bmesh.new()
    def v(self, p):
        return self.bm.verts.new((p[0], -p[2], p[1]))
    def quad(self, vs, mat):
        vv = []
        for v in vs:
            if v not in vv: vv.append(v)
        if len(vv) < 3: return None
        try: f = self.bm.faces.new(vv)
        except ValueError: return None
        f.material_index = mat
        return f
    def face(self, pts, mat, out=None):
        f = self.quad([self.v(p) for p in pts], mat)
        if f is not None and out is not None:
            f.normal_update()
            if out[0] == "dir": want = C(out[1])
            elif out[0] == "to": want = C(out[1]) - f.calc_center_median()
            else: want = f.calc_center_median() - C(out[1])
            if f.normal.dot(want) < 0: f.normal_flip()
        return f
    def obj(self, name, weld=True):
        bm = self.bm
        if weld: bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me); bm.free()
        for m in MATS: me.materials.append(m)
        o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
        return o

def C(p): return Vector((p[0], -p[2], p[1]))

def rbox(mb, c, size, mat, bevel=0.0, rot=None, taper=None):
    """Closed box (car coords) centred c; optional bevel (one segment chamfer) / point transform / +z end taper."""
    bm = mb.bm
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    V = {}
    for ix in (-1, 1):
        for iy in (-1, 1):
            for iz in (-1, 1):
                kx, ky = taper if (taper and iz > 0) else (1, 1)
                p = (ix * sx * kx, iy * sy * ky, iz * sz)
                if rot: p = rot(p)
                V[(ix, iy, iz)] = bm.verts.new(C((c[0] + p[0], c[1] + p[1], c[2] + p[2])))
    fs = []
    for q in [[(-1,-1,-1),(-1,1,-1),(1,1,-1),(1,-1,-1)], [(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)],
              [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)], [(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)],
              [(-1,-1,-1),(-1,-1,1),(-1,1,1),(-1,1,-1)], [(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]]:
        f = bm.faces.new([V[k] for k in q]); f.material_index = mat; fs.append(f)
    bmesh.ops.recalc_face_normals(bm, faces=fs)
    if bevel > 0:
        es = list({e for f in fs for e in f.edges})
        r = bmesh.ops.bevel(bm, geom=es + list({v for e in es for v in e.verts}), offset=bevel, segments=1, affect="EDGES", profile=0.5, clamp_overlap=True)
        for f in r.get("faces", []): f.material_index = mat
    return fs

def lathe(mb, prof, n, mat_of, x0=0.0, phase=0.0, closed=False):
    """Surface of revolution about the car x axis. prof: [(r, x)]; mat_of(k) per band. -> rings of verts."""
    rings = []
    for (r, x) in prof:
        rings.append([mb.v((x0 + x, r * math.cos(phase + 2 * math.pi * s / n), r * math.sin(phase + 2 * math.pi * s / n))) for s in range(n)])
    for k in range(len(rings) - 1):
        for s in range(n):
            mb.quad([rings[k][s], rings[k][(s + 1) % n], rings[k + 1][(s + 1) % n], rings[k + 1][s]], mat_of(k, s))
    return rings

# ------------------------------------------------------------------------------------------------ plates, text
FONT = {
    "0": ["01110","10001","10011","10101","11001","10001","01110"], "1": ["00100","01100","00100","00100","00100","00100","01110"],
    "2": ["01110","10001","00001","00110","01000","10000","11111"], "3": ["11110","00001","00001","01110","00001","00001","11110"],
    "4": ["00010","00110","01010","10010","11111","00010","00010"], "5": ["11111","10000","11110","00001","00001","10001","01110"],
    "6": ["00110","01000","10000","11110","10001","10001","01110"], "7": ["11111","00001","00010","00100","01000","01000","01000"],
    "8": ["01110","10001","10001","01110","10001","10001","01110"], "9": ["01110","10001","10001","01111","00001","00010","01100"],
    "A": ["01110","10001","10001","11111","10001","10001","10001"], "B": ["11110","10001","10001","11110","10001","10001","11110"],
    "C": ["01110","10001","10000","10000","10000","10001","01110"], "D": ["11100","10010","10001","10001","10001","10010","11100"],
    "E": ["11111","10000","10000","11110","10000","10000","11111"], "F": ["11111","10000","10000","11110","10000","10000","10000"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"], "I": ["01110","00100","00100","00100","00100","00100","01110"],
    "K": ["10001","10010","10100","11000","10100","10010","10001"], "L": ["10000","10000","10000","10000","10000","10000","11111"],
    "N": ["10001","11001","10101","10011","10001","10001","10001"], "O": ["01110","10001","10001","10001","10001","10001","01110"],
    "P": ["11110","10001","10001","11110","10000","10000","10000"], "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"], "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"], "X": ["10001","10001","01010","00100","01010","10001","10001"],
    "Z": ["11111","00001","00010","00100","01000","10000","11111"], "-": ["00000","00000","00000","01110","00000","00000","00000"],
}
def glyph_rects(ch):
    rows = FONT[ch]; used = [[False] * 5 for _ in range(7)]; out = []
    for y in range(7):
        for x in range(5):
            if rows[y][x] != "1" or used[y][x]: continue
            x1 = x
            while x1 + 1 < 5 and rows[y][x1 + 1] == "1" and not used[y][x1 + 1]: x1 += 1
            y1 = y
            while y1 + 1 < 7 and all(rows[y1 + 1][k] == "1" and not used[y1 + 1][k] for k in range(x, x1 + 1)): y1 += 1
            for yy in range(y, y1 + 1):
                for xx in range(x, x1 + 1): used[yy][xx] = True
            out.append((x, y, x1 + 1, y1 + 1))
    return out

def text_rects(text, h, gap=0.18):
    """[(u0, v0, u1, v1)] of the text centred at 0 (u along, v up)."""
    cw = h / 7 * 5; adv = cw * (1 + gap); total = adv * len(text) - cw * gap; u0 = -total / 2; out = []
    for i, ch in enumerate(text):
        if ch == " ": continue
        for (x0, y0, x1, y1) in glyph_rects(ch):
            out.append((u0 + i * adv + x0 / 5 * cw, h / 2 - y1 / 7 * h, u0 + i * adv + x1 / 5 * cw, h / 2 - y0 / 7 * h))
    return out

def plate(mb, centre, tilt, facing, rng, detail, w=0.52, h=0.11):
    """Belgian-style plate (white, red characters and border, blue EU band), random characters (1-ABC-123 format)."""
    ct, st = math.cos(tilt), math.sin(tilt)
    def fr(u, v, n=0.0):
        return (centre[0] + u * facing, centre[1] + v * ct, centre[2] + facing * (n - v * st))
    def slab(uu, vv, n0, n1, mat, side_mat):
        A = [fr(-uu, -vv, n0), fr(uu, -vv, n0), fr(uu, vv, n0), fr(-uu, vv, n0)]
        B = [fr(-uu, -vv, n1), fr(uu, -vv, n1), fr(uu, vv, n1), fr(-uu, vv, n1)]
        cc = fr(0, 0, (n0 + n1) / 2)
        mb.face(B, mat, out=("from", cc))
        for k in range(4): mb.face([A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]], side_mat, out=("from", cc))
    slab(w / 2 + 0.012, h / 2 + 0.012, -0.03, 0.004, M["trim"], M["trim"])
    slab(w / 2, h / 2, 0.004, 0.010, M["plate"], M["trim"])
    n = 0.0112
    mb.face([fr(-w/2 + 0.004, -h/2 + 0.004, n), fr(-w/2 + 0.046, -h/2 + 0.004, n), fr(-w/2 + 0.046, h/2 - 0.004, n), fr(-w/2 + 0.004, h/2 - 0.004, n)], M["plate_blue"], out=("dir", (0, 0, facing)))
    if detail > 0: return
    for (a, c, b, d) in [(-w/2 + 0.05, h/2 - 0.010, w/2 - 0.006, h/2 - 0.006), (-w/2 + 0.05, -h/2 + 0.006, w/2 - 0.006, -h/2 + 0.010)]:
        mb.face([fr(a, c, n), fr(b, c, n), fr(b, d, n), fr(a, d, n)], M["plate_red"], out=("dir", (0, 0, facing)))
    letters = "ABCDEFHKLNPRSTUXZ"
    txt = f"{rng.randint(1, 2)}-{''.join(rng.choice(letters) for _ in range(3))}-{rng.randint(0, 9)}{rng.randint(0, 9)}{rng.randint(0, 9)}"
    for (u0, v0, u1, v1) in text_rects(txt, 0.06, 0.22):
        mb.face([fr(0.022 + u0, v0, n + 0.0006), fr(0.022 + u1, v0, n + 0.0006), fr(0.022 + u1, v1, n + 0.0006), fr(0.022 + u0, v1, n + 0.0006)], M["plate_red"], out=("dir", (0, 0, facing)))

# ------------------------------------------------------------------------------------------------ build one car
# detail: 0 = LOD0 (premium), 1 = LOD1 (~1.2k triangles), 2 = LOD2 (~250-triangle stand-in)
def build_car(cid, sp, detail):
    rng = random.Random(sum(map(ord, cid)) * 7919)
    body = body_fn(sp); rake = rake_fn(sp)
    zF, zR, WZ = sp["zFront"], sp["zRear"], sp["wheelZ"]
    cab = sp["cabin"]
    archR = sp["wheelR"] + sp["archGap"]
    bF, bR = body(zF), body(zR)
    mid = body(0.0)
    police, taxi = sp.get("police"), sp.get("taxi")
    # ---- profile ROWS. Each row has its own parameter at the nose (rowsF) and at the tail (rowsR), blended along the
    # car: the region edges of the fascia and of the tail are rows (the nose's lamp top can be the tail's bumper line);
    # ANCHOR rows hold one value all along (the top edge, the cabin floor, cladding, liveries, the character line)
    if detail == 0:
        base = [0, 0.5, 1.0, 1.5, 1.8, 2.0, 2.4, 2.75, 3.0]; tol = 0.08
    elif detail == 1:
        base = [0, 1.0, 1.6, 2.0, 2.5, 3.0]; tol = 0.15
    else:
        base = [0, 1.0, 1.6, 2.0, 3.0]; tol = 9
    regions = {"front": [], "rear": []}
    for end, b in (("front", bF), ("rear", bR)):
        for (name, mat, (y0, y1), (f0, f1), wrap, tag) in sp[end]:
            if detail == 2 and name not in ("head", "tail"): continue
            if detail == 1 and (mat == "paint_seam" or name in ("fog", "refl", "intake")): continue
            regions[end].append(dict(name=name, mat=mat, s=(round(s_of_y(b, y0), 4), round(s_of_y(b, y1), 4)), f=(f0, f1), wrap=wrap, tag=tag))
    anchors = {0.0, 2.0, 3.0}
    f_in = 1 - cab["inset"] / mid["xE"] - 0.004
    s_belt_in = round(3 - f_in, 4)
    if detail < 2: anchors.add(s_belt_in)
    s_clad = round(s_of_y(mid, sp["clad"]), 4) if sp.get("clad") else None
    if s_clad: anchors.add(s_clad)
    s_bands = []
    if police and detail < 2:
        s_bands = [round(s_of_y(mid, y), 4) for y in ([0.56, 0.69, 0.82] if detail == 0 else [0.56, 0.82])]
        anchors.update(s_bands)
    s_taxi = []
    if taxi and detail < 2:
        s_taxi = [round(s_of_y(mid, 0.80), 4), round(s_of_y(mid, 0.835), 4)]; anchors.update(s_taxi)
    s_char = round(s_of_y(mid, mid["yE"] - 0.11), 4) if detail == 0 else None
    if s_char: anchors.add(s_char)
    A = sorted(anchors)
    def end_list(end):
        keep = set(A)
        for r in regions[end]: keep.update(r["s"])
        out = []
        for v in sorted(keep):
            if not out or v - out[-1] > 0.002: out.append(v)
        for v in base:
            if min(abs(v - k) for k in out) > tol: out.append(v)
        return sorted(out)
    LF, LR = end_list("front"), end_list("rear")
    rowsF, rowsR = [], []
    for a0, a1 in zip(A, A[1:]):
        sf = [v for v in LF if a0 < v < a1]; sr = [v for v in LR if a0 < v < a1]
        n_ = max(len(sf), len(sr))
        for seg in (sf, sr):
            while len(seg) < n_:
                pts = [a0] + seg + [a1]
                g = max(range(len(pts) - 1), key=lambda i: pts[i + 1] - pts[i])
                seg.append((pts[g] + pts[g + 1]) / 2); seg.sort()
        rowsF += [a0] + sf; rowsR += [a0] + sr
    rowsF.append(3.0); rowsR.append(3.0)
    NS = len(rowsF)
    kidx = lambda lst, v: min(range(len(lst)), key=lambda i: abs(lst[i] - v))
    for end, lst in (("front", rowsF), ("rear", rowsR)):
        for r in regions[end]: r["k"] = (kidx(lst, r["s"][0]), kidx(lst, r["s"][1]))
    k_belt_in = kidx(rowsF, s_belt_in); k_clad = kidx(rowsF, s_clad) if s_clad else None
    k_bands = [kidx(rowsF, v) for v in s_bands]; k_taxi = [kidx(rowsF, v) for v in s_taxi]
    k_char = kidx(rowsF, s_char) if s_char else None
    k_two = kidx(rowsF, 2.0)
    zone_f, zone_r = zF - 0.9, zR + 0.9
    def wF(z):   # 1 at the nose .. 0 at the tail
        t = clamp((z - zone_r) / (zone_f - zone_r), 0, 1); return t * t * (3 - 2 * t)
    def srow(k, z):
        return rowsR[k] + (rowsF[k] - rowsR[k]) * wF(z)

    # ---- stations (front to rear)
    zs = [zF, zR]
    nose_len = max(v[0] for v in sp["nose"].values()); tail_len = max(v[0] for v in sp["tail"].values())
    rs = [0, 0.4, 0.68, 0.86, 0.96] if detail == 0 else [0, 0.6, 0.9] if detail == 1 else [0, 0.75]
    for u in rs:
        zs.append(zF - nose_len * (1 - u)); zs.append(zR + tail_len * (1 - u))
    k_arch = 8 if detail == 0 else 4 if detail == 1 else 2
    for a in (WZ, -WZ):
        for i in range(k_arch + 1): zs.append(a + archR * math.cos(i / k_arch * math.pi))
    zs += [cab["cowl"], cab["deck"]]
    seams = []
    if detail == 0:
        for z in sp["doors"]: zs += [z + 0.003, z - 0.003]; seams.append(z)
        if sp.get("rearSeamZ"): zs += [zR + sp["rearSeamZ"], zR + sp["rearSeamZ"] - 0.006]
    for end, tip, sgn in (("front", zF, 1), ("rear", zR, -1)):
        for r in regions[end]:
            if 0 < r["wrap"] < 4 and detail < 2: zs.append(tip - sgn * r["wrap"])
    blocks = []
    if police and detail < 2:
        z0, z1 = WZ - archR - 0.05, -WZ + archR + 0.05
        nb = max(2, round((z0 - z1) / 0.40))
        blocks = [lerp(z0, z1, i / nb) for i in range(nb + 1)]
        zs += blocks
    zs = sorted({round(clamp(z, zR, zF), 4) for z in zs}, reverse=True)
    eps = 0.002 if detail == 0 else 0.03 if detail == 1 else 0.08
    st = []
    for z in zs:
        if not st or st[-1] - z > eps: st.append(z)
    st[0], st[-1] = zF, zR
    gap_of = lambda m: (0.75 if detail == 0 else 1.1 if detail == 1 else 2.0) if cab["cowl"] - 0.1 > m > cab["deck"] + 0.1 else (0.36 if detail == 0 else 0.6 if detail == 1 else 1.2)
    Z = [st[0]]
    for a, b in zip(st, st[1:]):
        n = math.ceil((a - b) / gap_of((a + b) / 2) - 0.15)
        for j in range(1, n): Z.append(lerp(a, b, j / n))
        Z.append(b)
    NZ = len(Z)
    if os.environ.get("CARS2_DEBUG"): print(f"  [dbg] {cid} d{detail}: rows {NS} F {[round(v, 3) for v in rowsF]} R {[round(v, 3) for v in rowsR]} stations {NZ}")

    mb = MB()
    faces = []        # (face, info dict)
    # ---- tube vertices: ring = side +1 (rows up to the centre), then side -1 (down, without the centre)
    ring_idx = [(1, k) for k in range(NS)] + [(-1, k) for k in range(NS - 2, -1, -1)]
    NR = len(ring_idx)
    secs = [body(z) for z in Z]
    V = []
    for i, z in enumerate(Z):
        b = secs[i]
        row = []
        for side, k in ring_idx:
            x, y = prof_pt(b, srow(k, z))
            if k_char is not None and k == k_char and cab["deck"] + 0.25 < z < cab["cowl"] + 0.25: x += 0.003
            row.append(mb.v((side * x, y, rake(x, y, z))))
        V.append(row)
    for i in range(NZ - 1):
        for j in range(NR - 1):
            (sa, ka), (sb, kb) = ring_idx[j], ring_idx[j + 1]
            f = mb.quad([V[i][j], V[i][j + 1], V[i + 1][j + 1], V[i + 1][j]], M["paint"])
            if f: faces.append((f, dict(part="tube", k=min(ka, kb), side=sa if sa == sb else 0, z=(Z[i + 1], Z[i]))))
        mb.quad([V[i][NR - 1], V[i][0], V[i + 1][0], V[i + 1][NR - 1]], M["under"])
    # ---- caps (the end's rows, columns at fractions of each row's half width)
    F0 = [0, 0.5, 1.0] if detail == 0 else [0, 1.0]
    Fs = set(F0)
    for end in ("front", "rear"):
        for r in regions[end]: Fs.update(round(v, 4) for v in r["f"])
    if police and detail < 2: Fs.update([0.17, 0.34, 0.51])
    Fs = sorted(f for f in Fs if 0 <= f <= 1)
    FL = [f for f in reversed(Fs)] + [-f for f in Fs[1:]]          # +1 .. -1
    for ci, (iz, b) in enumerate(((0, secs[0]), (NZ - 1, secs[-1]))):
        z = Z[iz]; front = ci == 0
        rows = []
        for k in range(NS - 1):
            x, y = prof_pt(b, srow(k, z))
            rows.append([mb.v((x * f, y, rake(x if k == 0 else x * f, y, z))) for f in FL])
        xa, ya = prof_pt(b, 3.0)
        apex = mb.v((0, ya, rake(0, ya, z)))
        for k in range(NS - 2):
            for j in range(len(FL) - 1):
                vs = [rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j]]
                f = mb.quad(vs if not front else vs[::-1], M["paint"])
                if f: faces.append((f, dict(part="front" if front else "rear", k=k, f=(min(abs(FL[j]), abs(FL[j + 1])), max(abs(FL[j]), abs(FL[j + 1]))),
                                             side=1 if FL[j] + FL[j + 1] > 0 else -1)))
        k = NS - 2
        for j in range(len(FL) - 1):
            vs = [rows[k][j], rows[k][j + 1], apex]
            f = mb.quad(vs if not front else vs[::-1], M["paint"])
            if f: faces.append((f, dict(part="front" if front else "rear", k=k, f=(0, 1), side=1 if FL[j] + FL[j + 1] > 0 else -1)))
    # ---- wheel-well liners (half drums inside the arches), their own object (open surfaces: normals set here)
    lm = MB()
    nseg = 10 if detail == 0 else 5 if detail == 1 else 0
    for a in (WZ, -WZ):
        if not nseg: break
        for side in (1, -1):
            b = body(a)
            x_out = b["xB"] - 0.004; x_in = sp["wheelX"] - sp["tyreW"] / 2 - 0.06
            yc = sp["wheelR"]; r = archR - 0.004
            pts = [(a + r * math.cos(math.pi * (-0.06 + 1.12 * q / nseg)), yc + r * math.sin(math.pi * (-0.06 + 1.12 * q / nseg))) for q in range(nseg + 1)]
            for q in range(nseg):
                (z0, y0), (z1, y1) = pts[q], pts[q + 1]
                lm.face([(side * x_out, y0, z0), (side * x_out, y1, z1), (side * x_in, y1, z1), (side * x_in, y0, z0)], M["liner"],
                        out=("to", (0, yc, a)))
            if detail == 0:
                lm.face([(side * x_in, y, z) for z, y in pts], M["liner"], out=("dir", (side, 0, 0)))

    # ---- region materials (by row index: the same rows at the nose and the tail)
    tags = {}
    def setm(f, info, mat, tag=None):
        f.material_index = M[mat]
        if tag:
            key = tag + ("L" if info.get("side", 1) > 0 else "R") if tag in ("head", "tail", "fog", "refl") else tag
            tags.setdefault(key, []).append(f)
    def kin(k, r): return k >= r["k"][0] and k + 1 <= r["k"][1]
    def fin(fr, r): return fr[0] >= r["f"][0] - 1e-4 and fr[1] <= r["f"][1] + 1e-4
    gate_k = kidx(rowsR, s_of_y(bR, sp["rearSeamY"])) if sp.get("rearSeamZ") else None
    for f, info in faces:
        p = info["part"]; k = info["k"]
        if p == "tube":
            zlo, zhi = info["z"]
            if k >= k_belt_in and zhi <= cab["cowl"] + 1e-4 and zlo >= cab["deck"] - 1e-4:
                f.material_index = M["interior"]; continue
            if k_clad is not None and k + 1 <= k_clad: f.material_index = M["trim"]
            for end, tip, sgn in (("front", zF, 1), ("rear", zR, -1)):
                for r in regions[end]:
                    if r["f"][1] < 0.999 or r["wrap"] <= 0 or not kin(k, r): continue
                    if r["wrap"] >= 5: near = zlo >= cab["cowl"] - 1e-4 if sgn > 0 else False
                    else:
                        wz = (zF - WZ - archR) if r["wrap"] >= 4 else r["wrap"]
                        if sgn < 0 and r["wrap"] >= 4: wz = (-WZ - archR) - zR
                        near = zlo >= tip - wz - 1e-4 if sgn > 0 else zhi <= tip + wz + 1e-4
                    if near: setm(f, info, r["mat"], r["tag"])
            if detail == 0:
                for zs_ in seams:
                    if zlo >= zs_ - 0.0031 and zhi <= zs_ + 0.0031 and k >= 1 and k + 1 <= k_two: f.material_index = M["paint_seam"]
                if gate_k is not None:
                    zq = zR + sp["rearSeamZ"]
                    if zlo >= zq - 0.0061 and zhi <= zq + 1e-4 and k >= gate_k and k + 1 <= k_two: f.material_index = M["paint_seam"]
            if k_bands and blocks and k >= k_bands[0] and k + 1 <= k_bands[-1] and blocks[-1] - 1e-4 <= zlo and zhi <= blocks[0] + 1e-4:
                bi = sum(1 for zb in blocks if zb >= zhi - 1e-4) - 1
                ri = 0 if (len(k_bands) < 3 or k + 1 <= k_bands[1]) else 1
                f.material_index = M["pol_blue"] if (bi + ri) % 2 == 0 else M["pol_yellow"]
            if k_taxi and k >= k_taxi[0] and k + 1 <= k_taxi[1] and cab["cowl"] > zlo and zhi > cab["deck"]:
                f.material_index = M["taxi_yellow"]
        else:
            if k >= k_two: continue                       # the bonnet / boot top: paint
            for r in regions[p]:
                if kin(k, r) and fin(info["f"], r): setm(f, info, r["mat"], r["tag"])
    # police: the Battenburg across the tailgate between the lamps (two rows, blocks of 0.17 of the half width)
    if police and detail < 2:
        lo, md, hi = kidx(rowsR, s_of_y(bR, 0.585)), kidx(rowsR, s_of_y(bR, 0.69)), kidx(rowsR, s_of_y(bR, 0.79))
        for f, info in faces:
            if info["part"] != "rear" or f.material_index != M["paint"]: continue
            k = info["k"]
            if k >= lo and k + 1 <= hi and info["f"][1] <= 0.51 + 1e-4:
                col = int(info["f"][0] / 0.17 + 1e-3) + (0 if info["side"] > 0 else 1)
                row = 0 if k + 1 <= md else 1
                f.material_index = M["pol_blue"] if (col + row) % 2 == 0 else M["pol_yellow"]

    bm = mb.bm
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    def inset(fs, th, depth, band_mat=None, in_mat=None):
        fs = [f for f in fs if f.is_valid]
        if not fs: return [], []
        r = bmesh.ops.inset_region(bm, faces=fs, thickness=th, depth=depth, use_even_offset=False, use_boundary=True)
        band = r["faces"]
        if band_mat is not None:
            for f in band: f.material_index = M[band_mat]
        if in_mat is not None:
            for f in fs: f.material_index = M[in_mat]
        return band, fs
    if detail == 0:
        for sd in "LR":
            fs = tags.get("head" + sd, [])
            inset(fs, 0.006, -0.004, "trim")                      # thin dark surround
            _, inner = inset(fs, 0.004, -0.018, "gloss", "gloss")  # housing
            _, inner = inset(inner, 0.012, 0.008, "gloss", "head")  # the lens (DRL band round it)
            inset(inner, 0.014, -0.004, "head", "head_in")          # reflector inside
            fs = tags.get("tail" + sd, [])
            inset(fs, 0.005, -0.003, "trim")
            _, inner = inset(fs, 0.004, -0.010, "tail_dark", "tail_dark")
            _, inner = inset(inner, 0.010, 0.006, "tail_dark", "tail")
            inset(inner, 0.012, 0.002, "tail", "tail_hi")
            inset(tags.get("fog" + sd, []), 0.008, -0.02, "gloss", "liner")
            inset(tags.get("refl" + sd, []), 0.006, -0.003, "trim", "reverse" if sd == "L" else "tail")
        inset(tags.get("grille", []), 0.008, -0.03, "gloss", "liner")
        inset(tags.get("intake", []), 0.010, -0.04, "gloss", "liner")
    elif detail == 1:
        for sd in "LR":
            for f in tags.get("head" + sd, []): f.material_index = M["head"]
            for f in tags.get("tail" + sd, []): f.material_index = M["tail"]
            for f in tags.get("refl" + sd, []): f.material_index = M["tail"]
        for t in ("grille", "intake"):
            for f in tags.get(t, []): f.material_index = M["liner"]
    else:
        for sd in "LR":
            for f in tags.get("head" + sd, []): f.material_index = M["head"]
            for f in tags.get("tail" + sd, []): f.material_index = M["tail"]
    tub = mb.obj(f"{cid}_body{detail}")

    # ------------------------------------------------------------------------------------ glasshouse
    gh = MB()
    roofY = smooth_curve(cab["roofY"])
    H = cab["roofEdge"] + cab["roofCrown"]
    def belt(z):
        b = body(z); return b["xE"] - cab["inset"], b["yE"] - 0.004
    bcx, bcy = belt(cab["cowl"]); bdx, bdy = belt(cab["deck"])
    rFx, rFy = cab["rail"][0], roofY(cab["roofFront"]) - H
    rRx, rRy = cab["rail"][1], roofY(cab["roofRear"]) - H
    def crown_y(z): b = body(z); return b["yT"]
    hC = max(0.006, crown_y(cab["cowl"]) - bcy - 0.008); hD = max(0.006, crown_y(cab["deck"]) - bdy - 0.008)
    def cabin(z):
        bx, by = belt(z)
        if z >= cab["roofFront"]:
            t = (cab["cowl"] - z) / (cab["cowl"] - cab["roofFront"])
            rx, ry, h = lerp(bcx, rFx, t), lerp(bcy, rFy, t), lerp(hC, H, min(1, t * 1.6))
        elif z <= cab["roofRear"]:
            t = (z - cab["deck"]) / (cab["roofRear"] - cab["deck"])
            rx, ry, h = lerp(bdx, rRx, t), lerp(bdy, rRy, t), lerp(hD, H, min(1, t * 1.6))
        else:
            t = (cab["roofFront"] - z) / (cab["roofFront"] - cab["roofRear"])
            rx, ry, h = lerp(rFx, rRx, t), roofY(z) - H, H
        return dict(bx=max(bx, rx), by=min(by, ry), rx=rx, ry=ry, h=h)
    n_roof = cab["roofRound"]
    def cab_pt(c, u):
        if u <= 1:
            return lerp(c["bx"], c["rx"], u) + cab["bulge"] * 4 * u * (1 - u), lerp(c["by"], c["ry"], u)
        th = (u - 1) * math.pi / 2
        return c["rx"] * max(math.cos(th), 0) ** (2 / n_roof), c["ry"] + c["h"] * math.sin(th) ** (2 / n_roof)
    U = ([0, 0.5, 0.9, 1.0, 1.12, 1.4, 1.7, 2.0] if detail == 0 else [0, 0.9, 1.12, 1.6, 2.0] if detail == 1 else [0, 1.0, 2.0])
    if sp.get("cargo") or sp["back"] == "box": U = sorted(set(U) | ({1.96} if detail == 0 else set()))
    NU = len(U)
    u_side1, u_roof0 = (0.9, 1.12) if detail < 2 else (1.0, 1.0)
    zc = [cab["cowl"], cab["roofFront"], cab["roofRear"], cab["deck"]]
    for t in ([0.15, 0.4, 0.7] if detail == 0 else [0.5] if detail == 1 else []): zc.append(lerp(cab["cowl"], cab["roofFront"], t))
    for t in ([0.5] if detail == 0 else []): zc.append(lerp(cab["roofFront"], cab["roofRear"], t))
    for t in ([0.75, 0.45, 0.18] if detail == 0 else [0.5] if detail == 1 else []): zc.append(lerp(cab["deck"], cab["roofRear"], t))
    z_sail = cab["cowl"] - cab["sail"]
    pills = [tuple(p) for p in cab["pillars"]]
    if detail < 2:
        zc += [z_sail, cab["glassEnd"]]
        for a, b, m in pills: zc += [a, b]
    if police and detail < 2: zc += [b for b in blocks if cab["cowl"] > b > cab["deck"]]
    ZC = sorted({round(z, 4) for z in zc if cab["deck"] - 1e-4 <= z <= cab["cowl"] + 1e-4}, reverse=True)
    ZC2 = []
    for z in ZC:
        if not ZC2 or ZC2[-1] - z > 0.004: ZC2.append(z)
    ZC = ZC2
    cring = [(1, k) for k in range(NU)] + [(-1, k) for k in range(NU - 2, -1, -1)]
    CV = []
    for z in ZC:
        c = cabin(z)
        CV.append([gh.v((sd * cab_pt(c, U[k])[0], cab_pt(c, U[k])[1], z)) for sd, k in cring])
    gfaces = []
    for i in range(len(ZC) - 1):
        for j in range(len(cring) - 1):
            (sa, ka), (sb, kb) = cring[j], cring[j + 1]
            f = gh.quad([CV[i][j + 1], CV[i][j], CV[i + 1][j], CV[i + 1][j + 1]], M["paint"])
            if f: gfaces.append((f, dict(u=(min(U[ka], U[kb]), max(U[ka], U[kb])), z=(ZC[i + 1], ZC[i]), side=sa if sa == sb else 0)))
    gtags = {}
    back_glass = cab.get("backGlass", "glass"); side_rear = cab.get("sideRearGlass", "glass")
    cargo = sp.get("cargo")
    for f, info in gfaces:
        (u0, u1), (z0, z1) = info["u"], info["z"]
        zmid = (z0 + z1) / 2
        side = u1 <= u_side1 + 1e-4
        rail = u0 >= u_side1 - 1e-4 and u1 <= u_roof0 + 1e-4
        top = u0 >= u_roof0 - 1e-4
        mat, tag = "paint", None
        if z0 >= cab["roofFront"] - 1e-4:                    # windscreen stations
            if top: mat, tag = "glass", "ws"
            elif rail: mat = "gloss" if sp.get("blackA") else "paint"
            elif side: (mat, tag) = ("glass", "side") if z1 <= z_sail + 1e-4 else ("trim", None)
        elif z1 <= cab["roofRear"] + 1e-4:                   # backlight stations
            if top: (mat, tag) = ("paint", None) if cargo else (back_glass, "bl")
            elif side and z0 >= cab["glassEnd"] - 1e-4 and not cargo: mat, tag = side_rear, "side"
        else:
            if side and z0 >= cab["glassEnd"] - 1e-4 and z1 <= z_sail + 1e-4:
                mat, tag = ("glass" if zmid > (pills[0][0] if pills else -9) else side_rear), "side"
                for a, b, m in pills:
                    if min(a, b) - 1e-4 <= zmid <= max(a, b) + 1e-4: mat, tag = m, None
        if (sp.get("cargo") or sp["back"] == "box") and top and detail == 0 and u0 >= 1.96 - 1e-4 and z1 <= cab["roofRear"] + 1e-4:
            mat = "paint_seam" if cargo else mat                    # rear barn doors: the centre line
        if police and detail < 2 and side and blocks and False: pass
        f.material_index = M[mat]
        if tag: gtags.setdefault(tag, []).append(f)
    gbm = gh.bm
    bmesh.ops.remove_doubles(gbm, verts=gbm.verts, dist=1e-5)
    gbm.normal_update()
    if detail < 2:
        for tg in ("ws", "bl", "side"):
            fs = [f for f in gtags.get(tg, []) if f.is_valid]
            if not fs: continue
            r = bmesh.ops.inset_region(gbm, faces=fs, thickness=0.016 if detail == 0 else 0.02, depth=0, use_even_offset=True, use_boundary=True)
            for f in r["faces"]: f.material_index = M["rubber"]
            if detail == 0:
                bmesh.ops.inset_region(gbm, faces=fs, thickness=0.003, depth=-0.006, use_even_offset=True, use_boundary=True)
                for f in fs: pass
    # the cabin floor seen through the glass: the body's crown, already interior. Headliner: under the roof
    house = gh.obj(f"{cid}_house{detail}")

    # ------------------------------------------------------------------------------------ details
    dt = MB()
    yb = mid["yE"]
    if detail < 2:
        # mirrors (on the sail, below the A pillar)
        for sd in (1, -1):
            zm = z_sail + 0.02; c = cabin(zm); bx, by = belt(zm)
            x0 = bx + 0.02
            rbox(dt, (sd * (x0 + 0.03), by + 0.06, zm - 0.03), (0.07, 0.04, 0.06), M["trim"], bevel=0.006 if detail == 0 else 0)   # arm
            cx = sd * (x0 + 0.13)
            rbox(dt, (cx, by + 0.10, zm - 0.04), (0.20, 0.12, 0.09), M["paint"], bevel=0.02 if detail == 0 else 0, taper=(0.9, 0.85))
            if detail == 0:
                dt.face([(cx - 0.085 * sd, by + 0.05, zm - 0.087), (cx + 0.085 * sd, by + 0.05, zm - 0.087), (cx + 0.085 * sd, by + 0.15, zm - 0.087), (cx - 0.085 * sd, by + 0.15, zm - 0.087)],
                        M["glass"], out=("dir", (0, 0, -1)))
        if detail == 0:
            # door handles (flush, body colour with a dark recess line)
            for sd in (1, -1):
                for zh in sp["handles"]:
                    b = body(zh); s = s_of_y(b, sp["handleY"]); x, y = prof_pt(b, s)
                    rbox(dt, (sd * (x - 0.004), y, zh), (0.03, 0.028, 0.17), M["paint"], taper=(0.6, 0.8))
                    rbox(dt, (sd * (x - 0.012), y - 0.018, zh), (0.03, 0.01, 0.15), M["liner"])
            # plates
            plate(dt, (0, sp["plateF"], rake(0, sp["plateF"], zF) + 0.006), 0.05, 1, rng, 0)
            plate(dt, (0, sp["plateR"], rake(0, sp["plateR"], zR) - 0.004), -0.08, -1, rng, 0)
            # wipers
            for sd in (0.32, -0.12):
                zw = cab["cowl"] - 0.03; c = cabin(zw)
                rbox(dt, (sd, c["ry"] + c["h"] + 0.012, zw - 0.02), (0.55, 0.012, 0.018), M["trim"], rot=lambda p: (p[0], p[1] + p[0] * 0.18, p[2] - p[0] * 0.15))
            # exhaust (hatch / estate / saloon: one tip, left rear, hidden under the diffuser lip)
            # interior: dashboard, seats, headrests, steering wheel (left-hand drive: +x is the driver)
            zd0 = cab["cowl"] - 0.22; zd1 = zd0 - 0.30
            bx, by = belt(zd1)
            rbox(dt, (0, by - 0.03, (zd0 + zd1) / 2), (2 * bx * 0.92, 0.16, zd0 - zd1), M["interior"])
            rows = [cab["pillars"][0][1] + 0.05 if cab["pillars"] else cab["roofFront"] - 0.65]
            if not sp.get("cargo") and cab["glassEnd"] < rows[0] - 0.7: rows.append(rows[0] - 0.85)
            for ri, zs_ in enumerate(rows):
                bx, by = belt(zs_)
                for sd in ((1, -1) if ri == 0 else (1, 0, -1) if bx > 0.7 else (1, -1)):
                    xs = sd * bx * (0.48 if ri == 0 else 0.55)
                    w = 0.46 if ri == 0 else 0.40
                    rbox(dt, (xs, by - 0.06, zs_ - 0.05), (w, 0.48, 0.10), M["seat"], rot=lambda p: (p[0], p[1], p[2] - p[1] * 0.25))
                    rbox(dt, (xs, by + 0.24, zs_ - 0.13), (0.24, 0.13, 0.08), M["seat"])
            # steering wheel: 10-sided ring
            zsw = zd1 - 0.06; c = cabin(zsw); bx, by = belt(zsw)
            xs = bx * 0.48; yc = by + 0.05; R = 0.18
            ring_o = [dt.v((xs, yc + R * math.cos(a), zsw + 0.35 * R * math.sin(a) + 0.0)) for a in (2 * math.pi * q / 10 for q in range(10))]
            ring_i = [dt.v((xs, yc + 0.8 * R * math.cos(a), zsw + 0.35 * 0.8 * R * math.sin(a))) for a in (2 * math.pi * q / 10 for q in range(10))]
            for q in range(10):
                dt.quad([ring_o[q], ring_o[(q + 1) % 10], ring_i[(q + 1) % 10], ring_i[q]], M["interior"])
        else:
            plate(dt, (0, sp["plateF"], rake(0, sp["plateF"], zF) + 0.006), 0.05, 1, rng, 1)
            plate(dt, (0, sp["plateR"], rake(0, sp["plateR"], zR) - 0.004), -0.08, -1, rng, 1)
            # interior block: seat backs seen through the glass
            zs_ = cab["pillars"][0][1] + 0.05 if cab["pillars"] else cab["roofFront"] - 0.65
            bx, by = belt(zs_)
            rbox(dt, (0, by + 0.18, zs_ - 0.1), (2 * bx * 0.85, 0.36, 0.12), M["seat"])
        # roof rails (estate, SUV)
        if sp.get("rails"):
            for sd in (1, -1):
                za, zb = cab["roofFront"] - 0.25, cab["roofRear"] + 0.12
                ca, cb = cabin(za), cabin(zb)
                xa = sd * ca["rx"] * 0.92; xb = sd * cb["rx"] * 0.92
                ya = ca["ry"] + ca["h"] * 0.55; yb_ = cb["ry"] + cb["h"] * 0.55
                L_ = za - zb
                rbox(dt, ((xa + xb) / 2, (ya + yb_) / 2 + 0.035, (za + zb) / 2), (0.035, 0.025, L_), M["gloss"], bevel=0.008 if detail == 0 else 0,
                     rot=lambda p, k=(ya - yb_) / L_, kx=(xa - xb) / L_: (p[0] + p[2] * kx, p[1] + p[2] * k, p[2]))
                for zf_ in (za - 0.05, zb + 0.05):
                    c = cabin(zf_)
                    rbox(dt, (sd * c["rx"] * 0.92, c["ry"] + c["h"] * 0.55 + 0.012, zf_), (0.04, 0.03, 0.07), M["gloss"])
        # taxi roof sign
        if taxi:
            zt = lerp(cab["roofFront"], cab["roofRear"], 0.4); c = cabin(zt); yt = c["ry"] + c["h"]
            rbox(dt, (0, yt + 0.075, zt), (0.62, 0.15, 0.17), M["trim"], bevel=0.02 if detail == 0 else 0, taper=(0.92, 0.85))
            if detail == 0:
                for d_ in (1, -1):
                    for (u0, v0, u1, v1) in text_rects("TAXI", 0.075):
                        zz = zt + d_ * 0.087
                        dt.face([(-d_ * u0, yt + 0.075 + v0, zz), (-d_ * u1, yt + 0.075 + v0, zz), (-d_ * u1, yt + 0.075 + v1, zz), (-d_ * u0, yt + 0.075 + v1, zz)], M["sign"], out=("dir", (0, 0, d_)))
            else:
                for d_ in (1, -1):
                    zz = zt + d_ * 0.087
                    dt.face([(-0.2, yt + 0.04, zz), (0.2, yt + 0.04, zz), (0.2, yt + 0.11, zz), (-0.2, yt + 0.11, zz)], M["sign"], out=("dir", (0, 0, d_)))
        # third brake lamp (high level) on hatches / estates / SUVs
        if detail == 0 and sp["back"] in ("hatch",) or (detail == 0 and sp["type"] in ("estate", "police")):
            c = cabin(cab["roofRear"] - 0.01)
            rbox(dt, (0, c["ry"] + c["h"] - 0.012, cab["roofRear"] - 0.03), (0.30, 0.025, 0.04), M["tail"], bevel=0.004)
    # police: POLICE lettering on the front doors (both sides) and over the rear band; text in blue, 1.5 mm proud
    if police and detail == 0:
        def side_pt(z, y, sd):
            b = body(z); s = s_of_y(b, y); x, yy = prof_pt(b, s)
            return (sd * (x + 0.0025), y, z)
        zc_ = (sp["doors"][0] + sp["doors"][1]) / 2 + 0.05
        for sd in (1, -1):
            for (u0, v0, u1, v1) in text_rects("POLICE", 0.085, 0.2):
                yy = 0.90
                # the text reads front-to-back on the left (+x) side, back-to-front on the right
                za, zb = zc_ - sd * u0, zc_ - sd * u1
                pts = [side_pt(za, yy + v0, sd), side_pt(zb, yy + v0, sd), side_pt(zb, yy + v1, sd), side_pt(za, yy + v1, sd)]
                dt.face(pts, M["pol_blue"], out=("dir", (sd, 0, 0)))
        for (u0, v0, u1, v1) in text_rects("POLICE", 0.07, 0.2):
            y0, y1 = 0.88 + v0, 0.88 + v1
            # on the tailgate glass base: just under the backlight, centred
            zz = rake(0, 0.88, zR) - 0.003
            dt.face([(-u0, y0, zz), (-u1, y0, zz), (-u1, y1, zz), (-u0, y1, zz)], M["pol_blue"], out=("dir", (0, 0, -1)))
    details = dt.obj(f"{cid}_det{detail}", weld=False)
    out = [tub, house, details]
    if nseg: out.append(lm.obj(f"{cid}_liner{detail}", weld=False))
    return out

# ------------------------------------------------------------------------------------------------ wheels
def build_wheel(sp, detail):
    """Wheel at the origin, axle along x, outer face toward +x. LOD0 ~300 triangles (tyre with bulged sidewall and a
    tread groove, 5 twin-spoke rim with real openings, brake disc), LOD1 ~70, LOD2 a 6-sided drum."""
    w = MB()
    RW, TW, RR = sp["wheelR"], sp["tyreW"], sp["rimR"]
    h = TW / 2
    if detail == 2:
        lathe(w, [(RW * 0.97, h), (RW * 0.97, -h)], 6, lambda k, s: M["tyre"])
        w.quad([w.v((h, RW * 0.97 * math.cos(2 * math.pi * s / 6), RW * 0.97 * math.sin(2 * math.pi * s / 6))) for s in range(6)][::-1], M["rim_dark"])
        return w.obj("wheel2", weld=True)
    N = 15 if detail == 0 else 8
    if detail == 0:
        prof = [(RR + 0.004, h * 0.80), (RR + 0.03, h * 0.97), (lerp(RR, RW, 0.62), h * 1.02), (RW - 0.02, h * 0.90),
                (RW, h * 0.5), (RW, -h * 0.55), (RW - 0.025, -h * 0.95), (RR, -h * 0.8)]
    else:
        prof = [(RR, h * 0.85), (lerp(RR, RW, 0.6), h * 1.0), (RW, h * 0.5), (RW, -h * 0.6), (RR, -h * 0.85)]
    side_bands = (0, 1, 2) if detail == 0 else (0, 1)
    lathe(w, prof, N, lambda k, s: M["tyre_side"] if k in side_bands else M["tyre"])
    # rim: lip ring (proud), then the face
    xf = h * 0.62
    lip = [(RR + 0.004, h * 0.80), (RR - 0.006, h * 0.84), (RR - 0.018, xf)]
    rings = lathe(w, lip, N, lambda k, s: M["rim"], phase=0)
    if detail == 0:
        # face: hub ring .. spoke ring; 5 spokes (1 of 3 segments), the openings (2 of 3) set back 4 cm with walls
        r_hub, r_mid, r_out = 0.06, 0.095, RR - 0.018
        outer = rings[-1]
        ang = lambda q: 2 * math.pi * q / N
        ring_hub = [w.v((xf + 0.014, r_hub * math.cos(ang(q)), r_hub * math.sin(ang(q)))) for q in range(N)]
        ring_mid = [w.v((xf + 0.008, r_mid * math.cos(ang(q)), r_mid * math.sin(ang(q)))) for q in range(N)]
        bk_mid = [w.v((xf - 0.045, r_mid * math.cos(ang(q)), r_mid * math.sin(ang(q)))) for q in range(N)]
        bk_out = [w.v((xf - 0.045, r_out * math.cos(ang(q)), r_out * math.sin(ang(q)))) for q in range(N)]
        opening = lambda q: q % 3 != 0
        for q in range(N):
            q1 = (q + 1) % N
            w.quad([ring_hub[q], ring_hub[q1], ring_mid[q1], ring_mid[q]], M["rim"])
            if opening(q):
                w.quad([bk_mid[q], bk_mid[q1], bk_out[q1], bk_out[q]], M["rim_dark"])
                w.quad([ring_mid[q], ring_mid[q1], bk_mid[q1], bk_mid[q]], M["rim_dark"])
                w.quad([outer[q1], outer[q], bk_out[q], bk_out[q1]], M["rim_dark"])
                if not opening((q - 1) % N): w.quad([ring_mid[q], bk_mid[q], bk_out[q], outer[q]], M["rim"])
                if not opening(q1): w.quad([ring_mid[q1], outer[q1], bk_out[q1], bk_mid[q1]], M["rim"])
            else:
                w.quad([ring_mid[q], ring_mid[q1], outer[q1], outer[q]], M["rim"])
        cap = w.v((xf + 0.018, 0, 0))
        for q in range(N): w.quad([ring_hub[q], ring_hub[(q + 1) % N], cap], M["rim_dark"] if q % 2 else M["rim"])
        # brake disc + caliper behind the face
        dsc = [w.v((xf - 0.07, 0.8 * RR * math.cos(2 * math.pi * q / 10), 0.8 * RR * math.sin(2 * math.pi * q / 10))) for q in range(10)]
        w.quad(dsc, M["disc"])
        rbox(w, (xf - 0.085, 0.55 * RR, -0.45 * RR), (0.05, 0.09, 0.12), M["rim_dark"])
    else:
        cen = w.v((xf, 0, 0))
        for s in range(N):
            w.quad([rings[-1][s], rings[-1][(s + 1) % N], cen][::-1], M["rim"] if s % 2 == 0 else M["rim_dark"])
    # inner side closed
    back = [w.v((-h * 0.8, RR * math.cos(2 * math.pi * s / N), RR * math.sin(2 * math.pi * s / N))) for s in range(N)]
    w.quad(back, M["rim_dark"])
    o = w.obj(f"wheel{detail}", weld=True)
    me = o.data; bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    return o

# ------------------------------------------------------------------------------------------------ shading normals
def smooth_shade(o, angle=math.radians(42), flat=()):
    """Smooth shading, hard edges where the material changes, at real creases (> angle) and on open borders; then
    WEIGHTED normals (face area, keep sharp): panels read as one sheet, lamps / insets keep crisp edges."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges[:])
    bm.normal_update()
    FLAT = {M[n] for n in flat} | {M["under"], M["liner"]}
    for f in bm.faces: f.smooth = f.material_index not in FLAT
    for e in bm.edges:
        lf = e.link_faces
        hard = len(lf) != 2 or lf[0].material_index != lf[1].material_index or lf[0].normal.angle(lf[1].normal, 0.0) > angle or lf[0].material_index in FLAT
        e.smooth = not hard
    bm.to_mesh(o.data); bm.free()
    mod = o.modifiers.new("wn", "WEIGHTED_NORMAL"); mod.mode = "FACE_AREA"; mod.keep_sharp = True; mod.weight = 50; mod.thresh = 0.01
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    o.modifiers.clear(); old = o.data; o.data = me2; bpy.data.meshes.remove(old)

# ------------------------------------------------------------------------------------------------ bake + export
def gpu_setup():
    scn.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    scn.cycles.device = "GPU"; print("Cycles device:", kind); return
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    scn.cycles.device = "CPU"

def bake_ao(objs):
    """Two Cycles AO bakes per vertex: 'ao' over 0.9 m (mass, ground, arches), 'ao_s' over 0.2 m (seams, recesses)."""
    for o in scn.objects: o.select_set(False)
    for o in objs:
        for a in list(o.data.color_attributes): o.data.color_attributes.remove(a)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    for name, dist in (("ao", 0.9), ("ao_s", 0.2)):
        for o in objs:
            ca = o.data.color_attributes.new(name, "FLOAT_COLOR", "POINT"); o.data.color_attributes.active_color = ca
        world.light_settings.distance = dist
        if BAKE: bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")

def ao_of(o):
    n = len(o.data.vertices)
    a = o.data.color_attributes.get("ao"); b = o.data.color_attributes.get("ao_s")
    if not a or not BAKE: return np.ones(n)
    A = np.empty(n * 4, np.float32); a.data.foreach_get("color", A)
    if not b: return A[0::4].astype(np.float64)
    B = np.empty(n * 4, np.float32); b.data.foreach_get("color", B)
    return A[0::4] * (1 + (B[0::4] - 1) * 0.75)

PAL_RGB = np.array([p[2] for p in PAL], np.float64); PAL_KIND = np.array([p[1] for p in PAL], np.float64)

def tri_soup(objs, mirror_x=False, origin=(0, 0, 0)):
    """Objects -> welded indexed mesh dict (car coords relative to origin): pos, nrm, col (palette x AO), kind, idx."""
    Ps, Ns, Cs, Ks = [], [], [], []
    for o in objs:
        me = o.data; me.calc_loop_triangles()
        nt = len(me.loop_triangles)
        if nt == 0: continue
        tv = np.empty(nt * 3, np.int64); me.loop_triangles.foreach_get("vertices", tv)
        tl = np.empty(nt * 3, np.int64); me.loop_triangles.foreach_get("loops", tl)
        tp = np.empty(nt, np.int64); me.loop_triangles.foreach_get("polygon_index", tp)
        pm = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("material_index", pm)
        co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
        mw = np.array(o.matrix_world); co = co @ mw[:3, :3].T + mw[:3, 3]
        cn = np.empty(len(me.loops) * 3); me.corner_normals.foreach_get("vector", cn); cn = cn.reshape(-1, 3) @ mw[:3, :3].T
        ao = ao_of(o)
        P = co[tv][:, [0, 2, 1]] * np.array([1, 1, -1])          # Blender (x, y, z) -> car (x, z, -y)
        N = cn[tl][:, [0, 2, 1]] * np.array([1, 1, -1])
        mat = np.repeat(pm[tp], 3)
        occ = (1 + (ao[tv] - 1) * 0.92) ** 1.15
        kind = PAL_KIND[mat]
        occ = np.where(kind == 2, 1 + (occ - 1) * 0.4, occ)
        col = PAL_RGB[mat] * occ[:, None]
        if mirror_x:
            P[:, 0] *= -1; N[:, 0] *= -1
            P = P.reshape(-1, 3, 3)[:, [0, 2, 1]].reshape(-1, 3); N = N.reshape(-1, 3, 3)[:, [0, 2, 1]].reshape(-1, 3)
            col = col.reshape(-1, 3, 3)[:, [0, 2, 1]].reshape(-1, 3); kind = kind.reshape(-1, 3)[:, [0, 2, 1]].ravel()
        # drop zero-area triangles; face-normal check (corner normal > 60 deg off its face: flat)
        T = P.reshape(-1, 3, 3)
        fn = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); ln = np.linalg.norm(fn, axis=1)
        keep = ln > 2e-8
        fn = fn / np.maximum(ln, 1e-12)[:, None]
        Nn = N.reshape(-1, 3, 3); Nn = Nn / np.maximum(np.linalg.norm(Nn, axis=2, keepdims=True), 1e-9)
        bad = (Nn * fn[:, None, :]).sum(2) < 0.5
        Nn = np.where(bad[:, :, None], fn[:, None, :], Nn)
        sel = np.repeat(keep, 3)
        Ps.append(P[sel] - np.array(origin)); Ns.append(Nn.reshape(-1, 3)[sel]); Cs.append(col[sel]); Ks.append(kind[sel])
    P = np.concatenate(Ps); N = np.concatenate(Ns); Cc = np.concatenate(Cs); K = np.concatenate(Ks)
    key = np.concatenate([np.round(P * 1e5), np.round(N * 1e4), np.round(Cc * 1e4), K[:, None]], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.ravel()
    first = np.full(len(uniq), -1); first[inv[::-1]] = np.arange(len(inv))[::-1]
    return dict(pos=P[first].astype(np.float32), nrm=N[first].astype(np.float32), col=Cc[first].astype(np.float32),
                kind=K[first].astype(np.float32), idx=inv.ravel().astype(np.uint32))

def write_glb(path, cars):
    chunks, views, accessors, meshes, nodes = [], [], [], [], []
    off = [0]
    def push(data, target=None):
        pad = (4 - len(data) % 4) % 4
        views.append(dict(buffer=0, byteOffset=off[0], byteLength=len(data), **({"target": target} if target else {})))
        chunks.append(data + b"\0" * pad); off[0] += len(data) + pad
        return len(views) - 1
    def acc(arr, typ, comp, minmax=False, target=None):
        ncomp = {"SCALAR": 1, "VEC3": 3}[typ]
        arr = np.ascontiguousarray(arr)
        a = dict(bufferView=push(arr.tobytes(), target), componentType=comp, count=arr.size // ncomp, type=typ)
        if minmax:
            r = arr.reshape(-1, ncomp); a["min"] = r.min(0).tolist(); a["max"] = r.max(0).tolist()
        accessors.append(a); return len(accessors) - 1
    roots = []
    for car in cars:
        kids, done = [], {}
        for name, (mesh, origin) in car["parts"].items():
            if id(mesh) in done:
                nodes.append(dict(name=name, mesh=done[id(mesh)], translation=[round(float(v), 5) for v in origin])); kids.append(len(nodes) - 1); continue
            nv = len(mesh["kind"])
            idx = mesh["idx"].astype(np.uint32 if nv > 65535 else np.uint16)
            prim = dict(attributes=dict(POSITION=acc(mesh["pos"], "VEC3", 5126, True, 34962), NORMAL=acc(mesh["nrm"], "VEC3", 5126, False, 34962),
                                        COLOR_0=acc(mesh["col"], "VEC3", 5126, False, 34962), _KIND=acc(mesh["kind"], "SCALAR", 5126, False, 34962)),
                        indices=acc(idx, "SCALAR", 5125 if nv > 65535 else 5123, False, 34963), material=0)
            meshes.append(dict(name=f"{car['id']}_{name}", primitives=[prim])); done[id(mesh)] = len(meshes) - 1
            nodes.append(dict(name=name, mesh=len(meshes) - 1, translation=[round(float(v), 5) for v in origin])); kids.append(len(nodes) - 1)
        nodes.append(dict(name=car["id"], children=kids, extras=dict(label=car["label"], type=car["type"], paint=[round(v, 4) for v in car["paint"]],
                                                                    keepPaint=car["keepPaint"], size=car["size"], tris=car["tris"], lodTris=car["lodTris"])))
        roots.append(len(nodes) - 1)
    js = dict(asset=dict(version="2.0", generator=f"uccle-city tools/blender/cars2.py", copyright="uccle-city, scripted (original generic designs)"),
              scene=0, scenes=[dict(nodes=roots)], nodes=nodes, meshes=meshes, accessors=accessors, bufferViews=views,
              buffers=[dict(byteLength=off[0])],
              materials=[dict(name="CarPalette", pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=0, roughnessFactor=0.6))])
    jb = json.dumps(js, separators=(",", ":")).encode(); jb += b" " * ((4 - len(jb) % 4) % 4)
    bin_ = b"".join(chunks)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(bin_)))
        fh.write(struct.pack("<II", len(jb), 0x4E4F534A)); fh.write(jb)
        fh.write(struct.pack("<II", len(bin_), 0x004E4942)); fh.write(bin_)

# ------------------------------------------------------------------------------------------------ main
gpu_setup()
scn.cycles.samples = SAMPLES
scn.render.bake.target = "VERTEX_COLORS"
world = bpy.data.worlds.new("w"); scn.world = world
gme = bpy.data.meshes.new("ground"); gme.from_pydata([(-300, -300, 0), (300, -300, 0), (300, 300, 0), (-300, 300, 0)], [], [(0, 1, 2, 3)])
ground = bpy.data.objects.new("ground", gme); scn.collection.objects.link(ground)

results = []
t0 = time.time()
for cid, sp in TYPES.items():
    if ONLY and cid not in ONLY: continue
    tc = time.time()
    parts, lodTris = {}, []
    for detail in (0, 1, 2):
        objs = [o for o in build_car(cid, sp, detail) if len(o.data.polygons) or bpy.data.objects.remove(o)]
        wheel = build_wheel(sp, detail)
        for o in objs: smooth_shade(o)
        smooth_shade(wheel, angle=math.radians(50))
        W = sp["wheelX"]; RW = sp["wheelR"]
        wpos = {"FL": (W, RW, sp["wheelZ"]), "FR": (-W, RW, sp["wheelZ"]), "RL": (W, RW, -sp["wheelZ"]), "RR": (-W, RW, -sp["wheelZ"])}
        occl = []
        for k, (x, y, z) in wpos.items():
            o = wheel.copy(); o.data = wheel.data; scn.collection.objects.link(o)
            o.location = C((x, y, z)); o.scale = (1 if x > 0 else -1, 1, 1); occl.append(o)
        wheel.location = (0, 0, 80)
        bpy.context.view_layer.update()
        if os.environ.get("CARS2_DEBUG"):
            for o in objs:
                cs = np.array([v.co[:] for v in o.data.vertices] or [(0, 0, 0)]); print("  [dbg]", o.name, len(o.data.polygons), cs.min(0).round(2), cs.max(0).round(2))
        bake_ao(objs)
        bake_ao([wheel])
        body = tri_soup(objs)
        wl = tri_soup([wheel], origin=(0, 80, 0))
        wr = tri_soup([wheel], mirror_x=True, origin=(0, 80, 0))
        sfx = "" if detail == 0 else f"_L{detail}"
        parts["Body" + sfx] = (body, (0, 0, 0))
        parts["Wheel_FL" + sfx] = (wl, wpos["FL"]); parts["Wheel_FR" + sfx] = (wr, wpos["FR"])
        parts["Wheel_RL" + sfx] = (wl, wpos["RL"]); parts["Wheel_RR" + sfx] = (wr, wpos["RR"])
        tris = len(body["idx"]) // 3 + 2 * len(wl["idx"]) // 3 + 2 * len(wr["idx"]) // 3
        lodTris.append(tris)
        if detail == 0:
            lo = body["pos"].min(0); hi = body["pos"].max(0)
            size = [round(sp["halfWidth"][2][1] * 2 + sp["archFlare"], 3), round(float(hi[1]), 3), round(float(hi[2] - lo[2]), 3)]
        print(f"[cars2] {cid} LOD{detail}: {tris} tris (body {len(body['idx']) // 3}, wheel {len(wl['idx']) // 3})")
        for o in objs + occl + [wheel]: bpy.data.objects.remove(o)
    results.append(dict(id=cid, label=sp["label"], type=sp["type"], paint=sp["paint"], keepPaint=bool(sp.get("keepPaint")), size=size,
                        tris=lodTris[0], lodTris=lodTris, parts=parts))
    print(f"[cars2] {cid}: LODs {lodTris}, size {size}, {time.time() - tc:.1f}s")

glb = os.path.join(OUT, f"{NAME}.glb")
write_glb(glb, results)
print(f"[cars2] -> {glb} ({os.path.getsize(glb) / 1024:.0f} KB), {len(results)} cars, {time.time() - t0:.1f}s")
