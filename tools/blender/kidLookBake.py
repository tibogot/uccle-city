"""THE KID LOOK ROUND (docs/KIDCHAR.md "Phase 6: the kid look", 2026-11-28): the bakes that take kid A off "plastic".

    blender -b --factory-startup -P tools/blender/kidLookBake.py -- [--renders DIR] [--samples 64]

  in   models/characters/kidA.glb (LOD0: the atlas UVs, the _SLOT attribute, the bind pose) + kidA_rig.json (joints)
       + the colour atlas (models/characters/kidA_atlas.ktx2, extracted with KTX-Software's `ktx extract`)
  out  models/characters/kidA_detail.png  1024 x 640, linear RGBA, the ATLAS LAYOUT at half size:
         R  height (0.5 = none; +-0.5 = +-HEIGHT_MM): seams, welts, hems, the zip's teeth, the elastic's gathers, folds
            (the waist blouson, the armpits, the shorts' crotch and hem), the sole's grooves, the high-passed albedo of
            the MPFB textures (shorts, shoes, hair, skin: their painted folds and strands become relief)
         G  roughness OFFSET (0.5 = the slot's own; +-0.5 = +-0.4): the skin's T-zone and lips oilier, the cheeks matte,
            the zip glossier, the elastic and the sole rubber matte
         B  cavity / wear (albedo multiply): seams and grooves darker, a little dirt on the soles and the hems
         A  skin tint (0.5 = none): > 0.5 warmer (cheeks, nose, ears, lips, knuckles, elbows, knees: blood under thin
            skin), < 0.5 toward the hair colour (the scalp under the hair: a soft hairline, no hard card edge)
       models/characters/kid_fabric.png    512 x 512, linear RGBA, TILING micro height (periodic: every feature an
         integer count per tile): R jersey / sock knit (V stitches), G ripstop nylon (plain weave + the 5 mm grid),
         B twill (shorts / cap drill, 3/1 diagonal), A skin (pores + fine cross lines)
       --renders DIR: Cycles (OPTIX) checks of LOD0 with these maps: a UV checker under a grazing light (stretching,
         shading from topology) and the look by day sun, shade and a grazing light
  tools/kid/kidLookPack.py turns both PNGs into KTX2 (linear UASTC + zstd, mips).

The garments whose atlas cell is a 1-D colour band (the jacket's SLEEVES, the socks, the cap, the brims: u or v
constant in kidGame.py's cell_uv) have no 2-D texels to bake into: their folds / ribs are computed in the material from
the bind position (viewer/kid/kidModel.js kidLookMaterial). Next round: give them 2-D cells in kidGame.py and bake them
here too.
"""
import bpy, sys, os, json, math, subprocess
import numpy as np
from mathutils import kdtree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
arg = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CH = os.path.join(ROOT, "models", "characters")
GLB = os.path.join(CH, "kidA.glb")
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
RENDERS = arg("--renders")
SAMPLES = int(arg("--samples", "64"))
W, H = 1024, 640                     # the detail map: the atlas (2048 x 1280) at half size, same layout
AW, AH = 2048, 1280
HEIGHT_MM = 1.6                      # R = 0 / 1 -> -/+ this many mm (viewer: KIDLOOK.heightMM)
rng = np.random.default_rng(1128)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
meshes = [o for o in scn.objects if o.type == "MESH"]
lod0 = next(o for o in meshes if o.name.endswith("LOD0"))
meta = json.load(open(os.path.join(CH, "kidA.json")))
SLOTS = meta["kid"]["slots"]
SI = {n: i for i, n in enumerate(SLOTS)}
J = {k: np.array(v, np.float64) for k, v in json.load(open(os.path.join(CH, "kidA_rig.json")))["joints"].items()}   # glTF (y up, +z forward)

# ------------------------------------------------------------------------------------------------ the mesh (glTF coords)
me = lod0.data
nv = len(me.vertices)
co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
P = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1)                               # Blender Z-up -> glTF Y-up
no = np.empty(nv * 3); me.vertices.foreach_get("normal", no); no = no.reshape(-1, 3)
N = np.stack([no[:, 0], no[:, 2], -no[:, 1]], 1)
sa = me.attributes.get("_SLOT")
slot_v = np.empty(nv); sa.data.foreach_get("value", slot_v); slot_v = np.round(slot_v).astype(int)
nl = len(me.loops)
lv = np.empty(nl, np.int64); me.loops.foreach_get("vertex_index", lv)
uvd = np.empty(nl * 2); me.uv_layers.active.data.foreach_get("uv", uvd); uvd = uvd.reshape(-1, 2)   # Blender v up
tri_loops = []
for p in me.polygons:
    ls = list(p.loop_indices)
    for k in range(1, len(ls) - 1): tri_loops.append((ls[0], ls[k], ls[k + 1]))
tri_loops = np.array(tri_loops)
print(f"LOD0: {nv} verts, {len(tri_loops)} tris, slots {SLOTS}")

# ------------------------------------------------------------------------------------------------ the colour atlas
work = os.path.join(CH, "_kidlook_tmp"); os.makedirs(work, exist_ok=True)
apng = os.path.join(work, "atlas.png")
subprocess.run([KTX, "extract", "--transcode", "rgba8", os.path.join(CH, "kidA_atlas.ktx2"), apng], check=True)
im = bpy.data.images.load(apng); im.colorspace_settings.name = "Non-Color"
A = np.empty(AW * AH * 4, np.float32); im.pixels.foreach_get(A); A = A.reshape(AH, AW, 4)  # rows bottom first (v up)
Asm = A.reshape(H, 2, W, 2, 4).mean(axis=(1, 3))                                          # half size
lum = (0.2126 * Asm[..., 0] + 0.7152 * Asm[..., 1] + 0.0722 * Asm[..., 2])

def blur(x, r):
    """separable box blur x3 (~ gaussian), radius r px, edge-clamped"""
    for _ in range(3):
        for ax in (0, 1):
            pad = [(0, 0)] * x.ndim; pad[ax] = (r, r)
            xp = np.pad(x, pad, mode="edge"); c = np.cumsum(xp, axis=ax, dtype=np.float64)
            c = np.concatenate([np.zeros_like(np.take(c, [0], axis=ax)), c], axis=ax)
            n = x.shape[ax]
            x = (np.take(c, np.arange(2 * r + 1, n + 2 * r + 1), axis=ax) - np.take(c, np.arange(0, n), axis=ax)) / (2 * r + 1)
    return x.astype(np.float32)

# ------------------------------------------------------------------------------------------------ rasterise LOD0 into the atlas space
# per texel: the bind position, normal and slot of the surface point it shows (last write wins where islands overlap:
# MPFB mirrors the shorts' legs and the shoes, so every function below is symmetric in x)
TP = np.zeros((H, W, 3), np.float32); TN = np.zeros((H, W, 3), np.float32)
TS = np.full((H, W), -1, np.int32); TUV = np.zeros((H, W, 2), np.float32)
degen = 0
for a, b, c in tri_loops:
    va, vb, vc = lv[a], lv[b], lv[c]
    pa, pb, pc = uvd[a] * (W, H), uvd[b] * (W, H), uvd[c] * (W, H)
    area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1])
    if abs(area) < 0.05: degen += 1; continue          # a 1-D band cell (sleeves, socks, cap, brims): nothing to bake
    x0, x1 = int(max(0, math.floor(min(pa[0], pb[0], pc[0]) - 0.5))), int(min(W - 1, math.ceil(max(pa[0], pb[0], pc[0]) + 0.5)))
    y0, y1 = int(max(0, math.floor(min(pa[1], pb[1], pc[1]) - 0.5))), int(min(H - 1, math.ceil(max(pa[1], pb[1], pc[1]) + 0.5)))
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    w0 = ((pb[0] - xs) * (pc[1] - ys) - (pc[0] - xs) * (pb[1] - ys)) / area
    w1 = ((pc[0] - xs) * (pa[1] - ys) - (pa[0] - xs) * (pc[1] - ys)) / area
    w2 = 1 - w0 - w1
    inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)     # (a hair conservative: no cracks along shared edges)
    if not inside.any(): continue
    yy, xx = (ys[inside] - 0.5).astype(int), (xs[inside] - 0.5).astype(int)
    W0, W1, W2 = w0[inside][:, None], w1[inside][:, None], w2[inside][:, None]
    TP[yy, xx] = W0 * P[va] + W1 * P[vb] + W2 * P[vc]
    n_ = W0 * N[va] + W1 * N[vb] + W2 * N[vc]; TN[yy, xx] = n_ / np.maximum(np.linalg.norm(n_, axis=1, keepdims=True), 1e-6)
    TS[yy, xx] = slot_v[va]
    TUV[yy, xx] = np.stack([xs[inside] / W, ys[inside] / H], 1)
cov = TS >= 0
print(f"rasterised: {cov.mean() * 100:.1f} % of the texels covered, {degen} degenerate (1-D cell) tris skipped")
X, Y, Z = TP[..., 0], TP[..., 1], TP[..., 2]
AX = np.abs(X)
is_ = lambda n: TS == SI[n]

# ------------------------------------------------------------------------------------------------ the maps
h = np.zeros((H, W), np.float32)          # height, mm
g = np.zeros((H, W), np.float32)          # roughness offset
cav = np.ones((H, W), np.float32)         # albedo multiply
tint = np.zeros((H, W), np.float32)       # + warm / - hair
ridge = lambda d, w: np.exp(-(d / w) ** 2)                      # a soft ridge of half-width w
sstep = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))

# the MPFB textures' painted detail as relief (high-pass of the luminance; the paint's folds and strands)
hp = lum - blur(lum, 3)
for n, k in (("shorts", 9.0), ("shoes", 5.0), ("hair", 10.0), ("skin", 2.0), ("tee", 4.0)):
    m = is_(n); h[m] += np.clip(hp[m] * k, -0.9, 0.9)

# --- the windbreaker's torso (its cell is 2-D: u = the angle round the body from the zip, v = hem -> collar)
CELL = {"jk_torso": (1024, 0, 256, 256)}
x0c, y0c, wc, hc = CELL["jk_torso"]
in_torso = is_("jacket") & (TUV[..., 0] * AW >= x0c) & (TUV[..., 0] * AW < x0c + wc) & (TUV[..., 1] * AH < y0c + hc)
cu = (TUV[..., 0] * AW - x0c - 1.5) / (wc - 3); cv = (TUV[..., 1] * AH - y0c - 1.5) / (hc - 3)
pel = J["pelvis"][1]; hem = pel - 0.005
neck0, head0 = J["neck_01"][1], J["Head"][1]; collar = neck0 + 0.32 * (head0 - neck0)
chest = J["spine_03"][1] - 0.015
vc = (chest - hem) / (collar - hem)
Hm = collar - hem                                            # the cell's v in metres
circ = 0.86                                                  # ~ the torso's girth (m): u in metres
dv = lambda v0: np.abs(cv - v0) * Hm * 1000                  # mm from a band line
du = lambda u0: np.minimum(np.abs(cu - u0), 1 - np.abs(cu - u0)) * circ * 1000
jt = in_torso
# panel seams at the colour-band edges (a raised welt each side of a stitched groove) + the side seams
for v0 in (0.07, vc - 0.03, vc):
    d = dv(v0); h[jt] += (0.55 * ridge(d - 1.6, 1.0) + 0.55 * ridge(d + 1.6, 1.0) - 0.7 * ridge(d, 0.5))[jt]
    cav[jt] *= (1 - 0.18 * ridge(d, 0.8))[jt]
for u0 in (0.25, 0.75):
    d = du(u0); h[jt] += (0.5 * ridge(d - 1.5, 1.0) - 0.6 * ridge(d, 0.5))[jt]; cav[jt] *= (1 - 0.15 * ridge(d, 0.7))[jt]
# the zip: teeth (3 mm pitch) on the tape, the tape's edge stitch
uz = np.minimum(cu, 1 - cu) * circ * 1000                    # mm from the zip line
zip_ = jt & (uz < 0.035 * circ * 1000)
teeth = 0.5 + 0.5 * np.cos(2 * np.pi * cv * Hm * 1000 / 3.0)
h[zip_] += (0.9 * teeth * ridge(uz, 2.2) + 0.3 * ridge(uz - 0.03 * circ * 1000 + 1.5, 0.6))[zip_]
g[zip_] -= 0.25; cav[zip_] *= (0.9 + 0.1 * teeth)[zip_]
# the elastic hem (navy band v < 0.07): gathered fabric (vertical puckers ~7 mm) + two channel stitch lines
eh = jt & (cv < 0.07)
puck = np.sin(2 * np.pi * cu * circ * 1000 / 7.0 + 1.3 * np.sin(cu * 37.0))
h[eh] += (0.7 * puck)[eh]; g[eh] += 0.12
for v0 in (0.015, 0.055):
    h[eh] -= (0.5 * ridge(dv(v0), 0.5))[eh]
# the blouson above the hem: soft horizontal sag folds that die out up the body, broken by a slow wave
bl = jt & (cv >= 0.07) & (cv < 0.32)
fz = (cv - 0.07) * Hm * 1000
sag = np.sin(2 * np.pi * fz / 26.0 + 2.2 * np.sin(cu * 2 * np.pi * 3 + 0.7)) * (1 - sstep(0.07, 0.32, cv)) * (0.6 + 0.4 * np.cos(cu * 2 * np.pi * 2))
h[bl] += (1.1 * sag)[bl]
# the armpits: diagonal drag folds at the sides under the arms (u ~ 0.25 / 0.75, the upper chest)
for u0, sgn in ((0.25, 1), (0.75, -1)):
    dd = (cu - u0) * circ * 1000; vz = (cv - 0.75) * Hm * 1000
    w_ = np.exp(-(dd / 45.0) ** 2) * np.exp(-(vz / 60.0) ** 2)
    h[jt] += (0.9 * np.sin(2 * np.pi * (dd * sgn + vz) / 22.0) * w_)[jt]
# the stand collar's turn line (v ~ 0.9) and its edge
h[jt] -= (0.5 * ridge(dv(0.9), 1.2))[jt]; h[jt] += (0.4 * ridge(dv(0.985), 1.0))[jt]

# --- the shorts (the CC0 cargo shorts, mirrored legs: x-symmetric): crotch whiskers, hem folds, the hem's turn-up stitch
sh = is_("shorts")
knee = J["calf_l"][1]; zc = knee + 0.035
front = Z > 0.0
wsk = sh & front & (Y > pel - 0.16) & (Y < pel - 0.03) & (AX < 0.11)
dxw = AX - 0.03; dyw = Y - (pel - 0.10)
h[wsk] += (0.8 * np.sin(2 * np.pi * (dxw * 0.8 - dyw) * 1000 / 14.0) * np.exp(-(dyw / 0.035) ** 2) * np.exp(-((dxw - 0.03) / 0.04) ** 2))[wsk]
hemz = sh & (Y < zc + 0.07)
up = (Y - zc) * 1000
h[hemz] += (0.7 * np.sin(2 * np.pi * up / 18.0 + 3 * np.sin(np.arctan2(Z, AX - 0.088) * 2)) * np.exp(-(up / 45.0) ** 2))[hemz]
h[sh] -= (0.6 * ridge(up - 18.0, 0.6) + 0.6 * ridge(up - 21.0, 0.6))[sh]                # the hem's double stitch
cav[sh] *= (1 - 0.06 * sstep(30, 0, up))[sh]                                             # the hem's edge a bit worn
# the waistband top (just under the jacket's hem; mostly hidden): a welt
h[sh] += (0.5 * ridge((Y - (hem + 0.006)) * 1000, 2.5))[sh]

# --- ROUND 2 (docs/KIDCHAR.md phase 7): the sleeves, socks, cap, brims and the hair shell have 2-D cells now
# (kidGame.py R2, the layout in kidA_rig.json "cells"): their folds / ribs / seams are BAKED here (round 1 computed them
# in the material from the bind position; kidModel.js turns that off for this mesh)
RIG = json.load(open(os.path.join(CH, "kidA_rig.json")))
if RIG.get("look") == "r2":
    CL = RIG["cells"]
    def in_cell(name):
        x0_, y0_, w_, h_ = CL[name]
        return (TUV[..., 0] * AW >= x0_) & (TUV[..., 0] * AW < x0_ + w_) & (TUV[..., 1] * AH >= y0_) & (TUV[..., 1] * AH < y0_ + h_)
    def cell_v(name):
        x0_, y0_, w_, h_ = CL[name]; return (TUV[..., 1] * AH - y0_ - 1.5) / (h_ - 3)
    gauss = lambda x, c, w: np.exp(-((x - c) / w) ** 2)
    # the sleeves (T-pose: the arm along x): the elbow's rings, the stack above the cuff, the cuff's rib, the shoulder's
    # drag; the colour-band seams (welt + stitch groove) and the underarm seam; the cuff's two channel stitches
    sl = is_("jacket") & in_cell("jk_sleeve")
    sA = np.clip((AX - 0.149) / 0.4, 0, 1)
    aArm = np.arctan2(Z - 0.034, Y - 1.117)
    sleeveH = (0.9 * np.sin(AX * 2 * np.pi / 0.011 + 2 * np.sin(2 * aArm)) * gauss(sA, 0.5, 0.09)
               + 0.8 * np.sin(AX * 2 * np.pi / 0.009 + 1.5 * np.sin(3 * aArm)) * gauss(sA, 0.84, 0.05)
               + 0.5 * np.cos(aArm * 36) * sstep(0.925, 0.945, sA)
               + 0.6 * np.sin(2 * aArm + 40 * AX) * gauss(sA, 0.1, 0.08))
    h[sl] += sleeveH[sl]
    tv = cell_v("jk_sleeve"); Ls = 0.4 * 1000
    for v0 in (0.5, 0.86):
        d = np.abs(tv - v0) * Ls; h[sl] += (0.5 * ridge(d - 1.5, 0.9) + 0.5 * ridge(d + 1.5, 0.9) - 0.6 * ridge(d, 0.45))[sl]
        cav[sl] *= (1 - 0.16 * ridge(d, 0.7))[sl]
    under = np.abs(np.abs(aArm) - np.pi) * 0.045 * 1000                         # mm from the underarm seam (r ~ 4.5 cm)
    h[sl] += (0.45 * ridge(under - 1.4, 0.8) - 0.55 * ridge(under, 0.45))[sl]; cav[sl] *= (1 - 0.12 * ridge(under, 0.6))[sl]
    for v0 in (0.955, 0.985):
        h[sl] -= (0.45 * ridge(np.abs(tv - v0) * Ls, 0.5))[sl]
    g[sl & (sA > 0.93)] += 0.1                                                   # the elastic matte
    # the socks: TUBE-SOCK ribs the whole length (finer, shallower below the cuff), the rib cuff deeper, the cuff's
    # turn line, the stripes' knit change, the ankle's slouch rings
    so_ = is_("socks")
    if so_.any():
        aLeg = np.arctan2(Z + 0.003, AX - 0.088)
        stop = float(np.percentile(Y[so_], 99.5)); rib0 = stop - 0.026
        cuffm = sstep(rib0 - 0.002, rib0 + 0.002, Y)
        sockH = (np.cos(aLeg * 44) * (0.25 + 0.4 * cuffm)
                 + 0.6 * np.sin(Y * 2 * np.pi / 0.009 + 2 * np.sin(2 * aLeg)) * gauss(Y, 0.115, 0.03) * (1 - cuffm)
                 - 0.6 * ridge((Y - rib0) * 1000, 0.6))
        h[so_] += sockH[so_]
        cav[so_] *= (1 - 0.08 * ridge((Y - rib0) * 1000, 0.8))[so_]
        g[so_] += (0.06 * cuffm)[so_]
    # the cap: six panels (seams at +-15 deg (the white front panel's edges), +-75, +-135), each seam a welt with two
    # stitch rows; the panels' slight puff between the seams. The seams' angle is read from the cap cell's OWN u (the
    # angle round the crown the colour cell was painted with, kidGame.py cp_uv2: u x 1.1 = the turn, 0.5 = the front):
    # the first try took it from the bind position round the Head joint, and its seams drifted off the white panel's
    # edges up the crown (the cavity darkened the white: "red bleeding into the white", the coordinator 2026-11-28). No
    # sweatband stitch line: it drew a hard horizontal line across the white panel near the brim (that stitching is
    # inside a real cap)
    cp = is_("cap")
    if cp.any():
        x0_, y0_, w_, h_ = CL["cap"]
        cuc = np.clip((TUV[..., 0] * AW - x0_ - 1.5) / (w_ - 3), 0, 1)
        aCap = (cuc * 1.1 - 0.5) * 360.0                                      # deg, 0 = the front
        Jh = J["Head"]
        rr_ = np.hypot(X - Jh[0], Z - Jh[2])
        dmin = np.full((H, W), 1e9, np.float32)
        for a0 in (15, -15, 75, -75, 135, -135):
            dmin = np.minimum(dmin, np.abs(((aCap - a0 + 180) % 360) - 180))
        ds = np.radians(dmin) * rr_ * 1000                                    # mm from the nearest seam
        front = np.abs(aCap) < 15
        # (the welts sit on the coloured panels' side, never over the white one: no darker rim on the white)
        h[cp] += (0.55 * ridge(ds - 1.3, 0.8) * ~front + 0.55 * ridge(ds - 1.3, 0.8) * 0.4 * front - 0.6 * ridge(ds, 0.45)
                  + 0.35 * np.clip(ds / 25, 0, 1))[cp]
        cav[cp] *= (1 - 0.1 * ridge(ds, 0.5) * ~front)[cp]
    # the brims: four stitch rows parallel to the front edge (v = 0 at the cap, 1 at the edge), the edge's bead
    for bn in ("brim_f", "brim_b"):
        br = is_(bn)
        if not br.any(): continue
        bv = cell_v("brim") * 68.0                                            # mm from the cap (~ the brim's depth)
        for v0 in (36.0, 44.0, 52.0, 60.0):
            h[br] -= (0.55 * ridge(bv - v0, 0.5))[br]; cav[br] *= (1 - 0.1 * ridge(bv - v0, 0.6))[br]
        h[br] += (0.5 * sstep(62, 66, bv))[br]
    # the hair shell: strands along the locks (fine ridges round the head, a little wavy), the locks' grooves deeper
    hs = is_("hair") & in_cell("hairshell")
    if hs.any():
        aH = np.arctan2(X, Z - J["Head"][2])
        strands = 0.5 * np.sin(aH * 160 + 6 * np.sin(Y * 90)) + 0.35 * np.sin(aH * 330 + 3 * np.sin(Y * 150 + 1))
        locks = 0.8 * np.sin(aH * 23 + 40 * Y + 1.7 * np.sin(aH * 5))
        h[hs] += (strands + locks)[hs]; cav[hs] *= (0.9 + 0.1 * np.clip(locks, -1, 1))[hs]
        g[hs] += 0.08
    print("round 2 cells baked: sleeves", int(sl.sum()), "socks", int(so_.sum()), "cap", int(cp.sum()), "hair shell", int(hs.sum()))

# --- the tee strip in the open zip: the collar rib (1.5 mm ribs, 1.6 cm deep) at the neckline
te = is_("tee")
if te.any():
    ttop = np.max(Y[te])
    dn = (ttop - Y) * 1000
    rib = te & (dn < 16)
    h[rib] += (0.6 * np.cos(2 * np.pi * X * 1000 / 1.6))[rib]
    h[te] -= (0.7 * ridge(dn - 16.5, 0.8))[te]; cav[te] *= (1 - 0.12 * ridge(dn - 16.5, 0.8))[te]
    g[te] += 0.05

# --- the sneakers: the cupsole's sidewall grooves, the rubber matte, dirt at the ground line
so = is_("shoes")
zs = Y * 1000                                                 # mm over the ground (the bind pose stands at y 0)
sole = so & (zs < 28)
for z0 in (9.0, 17.0, 24.0):
    h[sole] -= (0.7 * ridge(zs - z0, 0.8))[sole]
h[so] += (0.6 * ridge(zs - 28.5, 1.4))[so]                   # the foxing's lip over the sole
g[sole] += 0.3; g[so & ~sole] -= 0.05
cav[so] *= (1 - 0.22 * sstep(14, 0, zs) - 0.06 * sstep(30, 0, zs))[so]
cav[so] *= (1 - 0.06 * np.clip(rng.standard_normal((H, W)).astype(np.float32) * 0.5, -1, 1))[so]

# --- the skin: oilier T-zone and lips, matte cheeks; warmth where the skin is thin / the blood is close; the hairline
sk = is_("skin")
eyes = (slot_v == SI["eyes"])
EP = P[eyes]
eye_c = np.array([np.abs(EP[:, 0]).mean(), EP[:, 1].mean(), EP[:, 2].mean()])        # one eye (x > 0), glTF coords
headv = (slot_v == SI["skin"]) & (P[:, 1] > neck0 + 0.02)
HP = P[headv]
cen = HP[np.abs(HP[:, 0]) < 0.006]
nose = cen[np.argmax(cen[:, 2] - 0.3 * np.abs(cen[:, 1] - (eye_c[1] - 0.03)))]         # the most forward point near mid face
earx = np.abs(HP[:, 0]).max()
earpts = HP[(np.abs(HP[:, 0]) > earx - 0.012) & (np.abs(HP[:, 1] - eye_c[1]) < 0.035)]
ear_c = np.array([np.abs(earpts[:, 0]).mean(), earpts[:, 1].mean(), earpts[:, 2].mean()]) if len(earpts) else eye_c + (0.05, 0, -0.08)
mouth = np.array([0.0, nose[1] - 0.030, nose[2] - 0.012])
cheek = np.array([eye_c[0] + 0.008, eye_c[1] - 0.032, eye_c[2] - 0.004])
print("face landmarks (glTF): eye", eye_c.round(3), "nose", nose.round(3), "ear", ear_c.round(3), "mouth", mouth.round(3))
def blob(c, rx, ry, rz, sym=True):
    x = AX if sym else X
    return np.exp(-(((x - c[0]) / rx) ** 2 + ((Y - c[1]) / ry) ** 2 + ((Z - c[2]) / rz) ** 2))
warm = (0.55 * blob(cheek, 0.022, 0.018, 0.03) + 0.45 * blob(np.array([0, nose[1] + 0.004, nose[2]]), 0.01, 0.014, 0.02)
        + 0.5 * blob(ear_c, 0.02, 0.03, 0.025) + 0.35 * blob(mouth, 0.016, 0.008, 0.02))
for jn, r, k in (("hand_l", 0.06, 0.25), ("lowerarm_l", 0.035, 0.18), ("calf_l", 0.05, 0.3)):
    c = J[jn].copy(); c[0] = abs(c[0])
    if jn == "calf_l": c[2] += 0.04                              # the knee's front
    warm += k * blob(c, r, r, r)
tint[sk] += np.clip(warm, 0, 1)[sk]
tz = 0.6 * blob(np.array([0, eye_c[1] + 0.03, eye_c[2] + 0.01]), 0.022, 0.025, 0.05) + 0.7 * blob(np.array([0, nose[1], nose[2]]), 0.012, 0.02, 0.03)
lips = blob(mouth, 0.017, 0.007, 0.02)
chk = blob(cheek, 0.024, 0.02, 0.03)
g[sk] += (-0.22 * tz - 0.25 * lips + 0.08 * chk)[sk]
# the hairline: the scalp under the cards takes the hair's colour, fading out over ~1.2 cm past the last hair vertex
hairv = P[slot_v == SI["hair"]]
kd = kdtree.KDTree(len(hairv))
for i, p in enumerate(hairv): kd.insert(p, i)
kd.balance()
hz = sk & (Y > eye_c[1] - 0.01)
idx = np.argwhere(hz)
dist = np.array([kd.find(TP[r, c])[2] for r, c in idx], np.float32)
hairw = np.zeros((H, W), np.float32)
hairw[idx[:, 0], idx[:, 1]] = np.clip(1 - (dist - 0.004) / 0.012, 0, 1) ** 1.5
hairw *= sstep(eye_c[1] - 0.01, eye_c[1] + 0.02, Y)        # never on the brows / temples below the eyes
hair_px = Asm[is_("hair") & (Asm[..., 3] > 0.5)][:, :3]
hair_rgb = hair_px.mean(0) if len(hair_px) else np.array([0.3, 0.2, 0.12])
tint[sk] -= hairw[sk]
print(f"hairline texels {int((hairw > 0.05).sum())}, hair colour (linear) {hair_rgb.round(3)}")

# --- the hair: lower spec between the strands (the cards' darker gaps are rougher), the eyes glossy (their own slot)
hr = is_("hair")
g[hr] += np.clip(-hp[hr] * 3, -0.2, 0.2)
# cavity from the relief (any groove a touch darker: the fabric's own occlusion)
cav *= np.clip(1 + 0.10 * np.clip(h, -2, 0) / 2, 0.75, 1)

# ------------------------------------------------------------------------------------------------ pack + dilate + save
R = np.clip(0.5 + h / (2 * HEIGHT_MM), 0, 1)                  # (mm -> 0..1 around 0.5; +-HEIGHT_MM at 0 / 1)
Gc = np.clip(0.5 + g / 0.8, 0, 1)
Bc = np.clip(cav, 0, 1)
Ac = np.clip(0.5 + 0.5 * np.clip(tint, -1, 1), 0, 1)
D = np.stack([R, Gc, Bc, Ac], -1).astype(np.float32)
D[~cov] = (0.5, 0.5, 1.0, 0.5)
# dilate the covered texels 6 px into the gutters (mips + bilinear never pull in the neutral fill across an island edge)
m = cov.copy()
for _ in range(6):
    acc = np.zeros_like(D); cnt = np.zeros((H, W, 1), np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0: continue
            sh_ = np.roll(np.roll(D, dy, 0), dx, 1); mm = np.roll(np.roll(m, dy, 0), dx, 1)
            acc += sh_ * mm[..., None]; cnt += mm[..., None]
    grow = (~m) & (cnt[..., 0] > 0)
    D[grow] = acc[grow] / cnt[grow]; m |= grow
def save(arr, path):
    hh, ww = arr.shape[:2]
    img = bpy.data.images.new(os.path.basename(path), ww, hh, alpha=True, float_buffer=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(arr.astype(np.float32).ravel())
    img.filepath_raw = path; img.file_format = "PNG"; img.save()
    return img
det_img = save(D, os.path.join(CH, "kidA_detail.png"))
print("detail", os.path.join(CH, "kidA_detail.png"), "R range", float(R[cov].min()), float(R[cov].max()))

# ------------------------------------------------------------------------------------------------ the tiling fabric sheet
T = 512
u, v = np.meshgrid((np.arange(T) + 0.5) / T, (np.arange(T) + 0.5) / T)
def per_noise(freq, seed, oct_=3):
    """periodic value noise (wraps on the tile): bicubic-ish interpolated random lattice, octaves"""
    out = np.zeros((T, T), np.float32); amp = 1.0; tot = 0
    r = np.random.default_rng(seed)
    for o in range(oct_):
        f = freq * 2 ** o
        lat = r.standard_normal((f, f)).astype(np.float32)
        x = u * f; y = v * f
        xi, yi = np.floor(x).astype(int), np.floor(y).astype(int); fx, fy = x - xi, y - yi
        sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = lat[yi % f, xi % f]; b = lat[yi % f, (xi + 1) % f]; c_ = lat[(yi + 1) % f, xi % f]; d = lat[(yi + 1) % f, (xi + 1) % f]
        out += amp * (a + (b - a) * sx + (c_ - a) * sy + (a - b - c_ + d) * sx * sy); tot += amp; amp *= 0.5
    return out / tot
# R: jersey knit: 16 wales x 20 courses per tile, each stitch a pair of tilted legs (the "V"), yarn noise
wx, wy = u * 16, v * 20
fx, fy = wx - np.floor(wx), wy - np.floor(wy)
legL = np.exp(-(((fx - 0.30) + 0.35 * (fy - 0.5)) / 0.17) ** 2 - ((fy - 0.5) / 0.55) ** 2)
legR = np.exp(-(((fx - 0.70) - 0.35 * (fy - 0.5)) / 0.17) ** 2 - ((fy - 0.5) / 0.55) ** 2)
knit = np.maximum(legL, legR) + 0.15 * per_noise(32, 1)
# G: ripstop: a fine plain weave (96 threads) + the reinforcing grid (4 per tile), a little slub
th = 96
weave = 0.5 + 0.25 * np.cos(2 * np.pi * u * th) * np.cos(2 * np.pi * v * th) + 0.25 * np.cos(2 * np.pi * (u + v) * th / 2)
gl = np.minimum(np.abs(((u * 4) % 1) - 0.5), np.abs(((v * 4) % 1) - 0.5))
rip = weave + 0.55 * np.exp(-((0.5 - gl) / 0.018) ** 2) + 0.1 * per_noise(16, 2)
# B: 3/1 twill: diagonal wales (24 per tile across, the diagonal wraps: 24 steps over u and v), yarn noise
tw = np.cos(2 * np.pi * (u * 24 + v * 24)) * 0.5 + 0.5
tw = tw ** 1.5 + 0.2 * np.cos(2 * np.pi * v * 96) * 0.5 + 0.15 * per_noise(24, 3)
# A: skin: pores (a jittered periodic lattice of small pits) + fine cross lines (two directions) + soft noise
pore = np.zeros((T, T), np.float32)
r = np.random.default_rng(7); Np = 40
jit = r.random((Np, Np, 2))
for gy in range(Np):
    for gx in range(Np):
        cx, cy = (gx + jit[gy, gx, 0]) / Np, (gy + jit[gy, gx, 1]) / Np
        ddx = (u - cx + 0.5) % 1 - 0.5; ddy = (v - cy + 0.5) % 1 - 0.5
        rad = (0.25 + 0.2 * jit[gy, gx, 1]) / Np
        sel = (np.abs(ddx) < 2 * rad) & (np.abs(ddy) < 2 * rad)
        pore[sel] -= np.exp(-(ddx[sel] ** 2 + ddy[sel] ** 2) / (rad * rad))
lines = np.abs(np.sin(2 * np.pi * (u * 9 + v * 14) + 2 * per_noise(6, 4))) ** 8 + np.abs(np.sin(2 * np.pi * (u * 13 - v * 8) + 2 * per_noise(6, 5))) ** 8
skin_t = pore * 0.8 - 0.35 * lines + 0.35 * per_noise(12, 6)
def norm01(x):
    lo, hi = np.percentile(x, 1), np.percentile(x, 99)
    return np.clip((x - lo) / (hi - lo), 0, 1)
F = np.stack([norm01(knit), norm01(rip), norm01(tw), norm01(skin_t)], -1)
fab_img = save(F, os.path.join(CH, "kid_fabric.png"))
print("fabric", os.path.join(CH, "kid_fabric.png"))

# ------------------------------------------------------------------------------------------------ the Cycles checks (OPTIX)
def gpu():
    scn.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind; prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices: d.use = d.type == kind
                scn.cycles.device = "GPU"; print("Cycles device:", kind); return
        except Exception as e: print("no", kind, e)
    scn.cycles.device = "CPU"

if RENDERS:
    os.makedirs(RENDERS, exist_ok=True)
    gpu(); scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
    try: scn.cycles.denoiser = "OPTIX"
    except Exception: pass
    scn.view_settings.view_transform = "AgX"
    for o in meshes:
        if o is not lod0: o.hide_render = True
    arm = next(o for o in scn.objects if o.type == "ARMATURE")
    act = bpy.data.actions.get("Idle") or next((a for a in bpy.data.actions if a.name.startswith("Idle")), None)
    if act:
        arm.animation_data_create(); arm.animation_data.action = act
        try:
            if hasattr(act, "slots") and len(act.slots): arm.animation_data.action_slot = act.slots[0]
        except Exception: pass
        scn.frame_set(int(act.frame_range[0]) + 9)
    cimg = bpy.data.images.load(apng)
    def mat(mode):
        m = bpy.data.materials.new("look_" + mode); m.use_nodes = True; nt = m.node_tree; L = nt.links
        b = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap")
        at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "_SLOT"
        # the hidden (back) brim
        cmp = nt.nodes.new("ShaderNodeMath"); cmp.operation = "COMPARE"; cmp.inputs[1].default_value = SI["brim_b"]; cmp.inputs[2].default_value = 0.5
        L.new(at.outputs["Fac"], cmp.inputs[0])
        inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L.new(cmp.outputs[0], inv.inputs[1])
        tc = nt.nodes.new("ShaderNodeTexImage"); tc.image = cimg; L.new(uvn.outputs[0], tc.inputs[0])
        al = nt.nodes.new("ShaderNodeMath"); al.operation = "MULTIPLY"; L.new(tc.outputs["Alpha"], al.inputs[0]); L.new(inv.outputs[0], al.inputs[1])
        L.new(al.outputs[0], b.inputs["Alpha"])
        if mode == "checker":
            ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 160
            ck.inputs["Color1"].default_value = (0.8, 0.8, 0.8, 1); ck.inputs["Color2"].default_value = (0.25, 0.25, 0.25, 1)
            L.new(uvn.outputs[0], ck.inputs[0]); L.new(ck.outputs[0], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.6
            return m
        td = nt.nodes.new("ShaderNodeTexImage"); td.image = det_img; L.new(uvn.outputs[0], td.inputs[0])
        sp = nt.nodes.new("ShaderNodeSeparateColor"); L.new(td.outputs["Color"], sp.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
        L.new(tc.outputs["Color"], mul.inputs["A"]); L.new(sp.outputs["Blue"], mul.inputs["B"]); L.new(mul.outputs["Result"], b.inputs["Base Color"])
        rg = nt.nodes.new("ShaderNodeMapRange"); rg.inputs["To Min"].default_value = 0.35; rg.inputs["To Max"].default_value = 1.0
        L.new(sp.outputs["Green"], rg.inputs[0]); L.new(rg.outputs[0], b.inputs["Roughness"])
        # micro: the fabric sheet box-projected on the bind-ish object coords (the knit channel), + the atlas relief
        oc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (60, 60, 60); L.new(oc.outputs["Object"], mp.inputs[0])
        tf = nt.nodes.new("ShaderNodeTexImage"); tf.image = fab_img; tf.projection = "BOX"; tf.projection_blend = 0.3; L.new(mp.outputs[0], tf.inputs[0])
        sf = nt.nodes.new("ShaderNodeSeparateColor"); L.new(tf.outputs["Color"], sf.inputs[0])
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 1.0; bp.inputs["Distance"].default_value = HEIGHT_MM * 0.002
        L.new(sp.outputs["Red"], bp.inputs["Height"])
        bp2 = nt.nodes.new("ShaderNodeBump"); bp2.inputs["Strength"].default_value = 0.35; bp2.inputs["Distance"].default_value = 0.0003
        L.new(sf.outputs["Green"], bp2.inputs["Height"]); L.new(bp2.outputs[0], bp.inputs["Normal"])
        L.new(bp.outputs[0], b.inputs["Normal"])
        b.inputs["Sheen Weight"].default_value = 0.35; b.inputs["Sheen Roughness"].default_value = 0.5
        b.inputs["Subsurface Weight"].default_value = 0.0
        return m
    w = bpy.data.worlds.new("w"); scn.world = w; w.use_nodes = True; bg = w.node_tree.nodes["Background"]
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
    bpy.ops.mesh.primitive_plane_add(size=10); gp = bpy.context.active_object
    gm = bpy.data.materials.new("ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.36, 0.36, 0.34, 1); gp.data.materials.append(gm)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    from mathutils import Vector
    def look(pos, tgt, lens):
        cam.location = Vector(pos); cam.data.lens = lens
        cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    b2 = lambda p: (p[0], -p[2], p[1])                                  # glTF -> Blender
    face = b2(J["Head"] + (0, 0.07, 0.02)); mid = (0, 0, 0.75)
    shots = [("checker_grazing", "checker", "graze", (1.6, -3.6, 0.9), mid, 60, (700, 1000)),
             ("look_day", "look", "day", (1.6, -3.6, 0.95), mid, 60, (700, 1000)),
             ("look_shade", "look", "shade", (1.6, -3.6, 0.95), mid, 60, (700, 1000)),
             ("look_grazing", "look", "graze", (1.0, -2.4, 1.1), (0, 0, 0.95), 85, (700, 900)),
             ("face_day", "look", "day", (0.35, -1.15, 1.36), face, 100, (800, 800)),
             ("face_grazing", "look", "graze", (0.35, -1.15, 1.36), face, 100, (800, 800)),
             ("face_checker", "checker", "graze", (0.35, -1.15, 1.36), face, 100, (800, 800))]
    mats = {k: mat(k) for k in ("checker", "look")}
    for name, mk, light, pos, tgt, lens, res in shots:
        lod0.data.materials.clear(); lod0.data.materials.append(mats[mk])
        if light == "day":
            bg.inputs[0].default_value = (0.62, 0.70, 0.80, 1); bg.inputs[1].default_value = 0.7
            sun.data.energy = 3.6; sun.data.angle = math.radians(2); sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sun.hide_render = False
        elif light == "shade":
            bg.inputs[0].default_value = (0.62, 0.70, 0.82, 1); bg.inputs[1].default_value = 1.0; sun.hide_render = True
        else:   # grazing: a low sun from the side (topology / bump faults show as streaks, steps or speckle)
            bg.inputs[0].default_value = (0.5, 0.55, 0.6, 1); bg.inputs[1].default_value = 0.15
            sun.data.energy = 4.0; sun.data.angle = math.radians(1); sun.rotation_euler = (math.radians(82), 0, math.radians(75)); sun.hide_render = False
        look(pos, tgt, lens)
        scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.filepath = os.path.join(RENDERS, f"bake_{name}.png"); bpy.ops.render.render(write_still=True)
        print("render", scn.render.filepath)

for f in os.listdir(work): os.remove(os.path.join(work, f))
os.rmdir(work)
print("KIDLOOK BAKE DONE")
