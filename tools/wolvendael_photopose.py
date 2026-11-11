"""CHATEAU DE WOLVENDAEL: camera poses of the reference photos (the lab's overlays, the side-by-sides, the pond's
reflections), after tools/vanbuuren_photopose.py (claude/vanbuuren).

    python tools/wolvendael_photopose.py [--undistort] [--measure]     (opencv-python, numpy)

Each photo gets hand-picked correspondences on the full-size original (data/raw/refs/wolvendael/full/, git-ignored):
  - POINTS: a pixel <-> a point in the building frame (u along the pond front, u+ = NE; w across, w- = the pond side;
    h m TAW): the chimney stacks' front top edges (positions from the DSM, tools/wolvendael_measure.py);
  - LINES: a pixel on a vertical wall corner through a footprint corner (u, w) (UrbIS footprint);
  - a weak prior on the camera's height (the photographer's eye ~1.6 m over the DTM at the pond's far bank) and the
    focal length from the EXIF (35 mm equivalent on the image diagonal).
Solved: the pose + focal (+ k1 for the wide w03) by Levenberg-Marquardt from cv2.solvePnP starts.
--measure: the pixels picked on the pond front (MEASURE below: bay edges, cornice, string courses, sills, heads) are
back-projected on the pond front's plane (w = -11.36): their u / h in the frame (models/wolvendael_chateau/
photo_measured.json, read by tools/blender/wolvendael_chateau.py).
--undistort: data/raw/refs/wolvendael/undist/<photo> (1600 px, git-ignored): the photo remapped to the pinhole camera
the lab renders.
Writes models/wolvendael_chateau/photo_views.json: pos / target / up (building frame), vertical fov, f, k1, errors.
Blender / three frame used inside: (u, -w, h - 40).
"""
import json, math, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "data" / "raw" / "refs" / "wolvendael"
if not REFS.exists(): REFS = ROOT.parent.parent.parent / "data" / "raw" / "refs" / "wolvendael"
FULL = REFS / "full"
SITE = json.load(open(ROOT / "models" / "wolvendael_chateau" / "site.json"))
DATUM = 40.0
FP = SITE["footprint_local"]["537523"]          # [20.55,-11.38] NE front, [20.42,-2.57] NE back, ..., [-12.69,-11.33] SW front
CH = SITE["roof"]
FRONT_W = -11.36                                # the pond front's plane (mean of its two corners)
CRED = "Photo: Donarreiskoffer, 2019, CC BY-SA 4.0 (Wikimedia Commons, Wolvendael Park {n}.jpg)"
CH_TOP = 63.95                                  # the stacks' caps (DSM max 64.2 includes pots and the 0.5 m blur)
CH_FRONT = 0.8                                  # the front face is ~0.8 m before the stack's DSM centre (towards the pond)
NE_STACK = (CH["chimney_ne"]["u"], CH["chimney_ne"]["w"] - CH_FRONT, CH_TOP)
C_STACK = (CH["chimney_c"]["u"], CH["chimney_c"]["w"] - CH_FRONT, CH_TOP)

VIEWS = {
    "w02.jpg": dict(name="pond front across the pond (w02)", credit=CRED.format(n="02"), f0=3602, wide=False, cam_h=48.9,
                    pts=[((2447, 523), NE_STACK), ((3132, 576), C_STACK)],
                    lines=[((2000, 950), FP[0]), ((2001, 1300), FP[0]), ((1933, 1000), FP[1]), ((1935, 1300), FP[1]),
                           ((3998, 1050), FP[5]), ((3999, 1350), FP[5])]),
    "w04.jpg": dict(name="pond front across the pond, closer (w04)", credit=CRED.format(n="04"), f0=3602, wide=False, cam_h=48.9,
                    pts=[((2552, 628), NE_STACK), ((3252, 656), C_STACK)],
                    lines=[((2141, 1100), FP[0]), ((2143, 1450), FP[0]), ((2073, 1100), FP[1]), ((2075, 1450), FP[1]),
                           ((4180, 1150), FP[5]), ((4182, 1450), FP[5])]),
    "w00.jpg": dict(name="pond front and the north-east end, snow (w00)", credit="Photo: Edison McCullen, 2026, CC BY 4.0 (Wikimedia Commons, Ecole des Arts d'Uccle.jpg)",
                    f0=5422, wide=False, cam_h=49.0,
                    pts=[((3940, 148), (NE_STACK[0] + 0.35, NE_STACK[1], CH_TOP)), ((4880, 240), (C_STACK[0] + 0.35, C_STACK[1], CH_TOP)),
                         ((3563, 693), (FP[0][0], FP[0][1], 57.91)), ((3564, 1063), (FP[0][0], FP[0][1], 53.99))],
                    lines=[((3563, 950), FP[0]), ((3566, 1300), FP[0]), ((5950, 900), FP[5]), ((5952, 1150), FP[5])]),
}

# pixels on the pond front for --measure: name -> (photo, [(x, y), ...]); each pixel lands on w = FRONT_W
MEASURE = {
    # w04 (1:1 picks on the full-size file). Rectangles: (left, head), (right, head), (left, sill), (right, sill)
    "ff.B1": ("w04.jpg", [(2232, 1078), (2310, 1078), (2232, 1198), (2310, 1198)]),
    "ff.B2": ("w04.jpg", [(2460, 1080), (2538, 1080), (2460, 1198), (2538, 1198)]),
    "ff.B3": ("w04.jpg", [(2650, 1085), (2725, 1085), (2650, 1200), (2725, 1200)]),
    "ff.B4": ("w04.jpg", [(2790, 1087), (2867, 1087), (2790, 1210), (2867, 1210)]),
    "ff.B5": ("w04.jpg", [(2935, 1090), (3012, 1090), (2935, 1213), (3012, 1213)]),
    "ff.B6": ("w04.jpg", [(3075, 1093), (3152, 1093), (3075, 1215), (3152, 1215)]),
    "ff.B7": ("w04.jpg", [(3220, 1100), (3296, 1100), (3220, 1220), (3296, 1220)]),
    "ff.B8": ("w04.jpg", [(3400, 1103), (3470, 1103), (3400, 1222), (3470, 1222)]),
    "ff.B9": ("w04.jpg", [(3609, 1105), (3680, 1105), (3609, 1225), (3680, 1225)]),
    "ff.B10": ("w04.jpg", [(3795, 1115), (3860, 1115), (3795, 1235), (3860, 1235)]),
    "ff.B12": ("w04.jpg", [(4040, 1120), (4105, 1120), (4040, 1240), (4105, 1240)]),
    "gf.B1": ("w04.jpg", [(2232, 1305), (2310, 1305), (2232, 1480), (2310, 1480)]),
    "gf.B2": ("w04.jpg", [(2459, 1307), (2541, 1307), (2459, 1480), (2541, 1480)]),
    "gf.B3": ("w04.jpg", [(2655, 1315), (2725, 1315), (2655, 1485), (2725, 1485)]),
    "gf.B4": ("w04.jpg", [(2790, 1345), (2870, 1345), (2830, 1315)]),
    "gf.B5": ("w04.jpg", [(2940, 1348), (3015, 1348), (2978, 1318)]),
    "gf.B6": ("w04.jpg", [(3080, 1350), (3155, 1350), (3118, 1322)]),
    "gf.B7": ("w04.jpg", [(3220, 1320), (3285, 1320), (3220, 1490), (3285, 1490)]),
    "gf.B8": ("w04.jpg", [(3395, 1325), (3465, 1325), (3395, 1490), (3465, 1490)]),
    "gf.B9": ("w04.jpg", [(3610, 1325), (3675, 1325), (3610, 1490), (3675, 1490)]),
    "gf.B10": ("w04.jpg", [(3810, 1330), (3865, 1330), (3810, 1495), (3865, 1495)]),
    "gf.B11": ("w04.jpg", [(3930, 1330), (3990, 1330), (3930, 1495), (3990, 1495)]),
    "gf.B12": ("w04.jpg", [(4040, 1330), (4100, 1330), (4040, 1495), (4100, 1495)]),
    "shutters.B1": ("w04.jpg", [(2190, 1300), (2355, 1300)]),
    "shutters.B2": ("w04.jpg", [(2420, 1300), (2582, 1300)]),
    "strip.NE": ("w04.jpg", [(2141, 1100), (2180, 1100)]),
    "strip.A": ("w04.jpg", [(2582, 1100), (2620, 1100)]),
    "strip.B": ("w04.jpg", [(3325, 1150), (3360, 1150)]),
    "strip.C": ("w04.jpg", [(3718, 1150), (3752, 1150)]),
    "strip.SW": ("w04.jpg", [(4150, 1150), (4181, 1150)]),
    "levels.NE": ("w04.jpg", [(2160, 966), (2160, 1002), (2160, 1022), (2160, 1240), (2160, 1256), (2160, 1490)]),
    "levels.centre": ("w04.jpg", [(2900, 980), (2740, 1250), (2740, 1290), (2900, 1500)]),
    "dormer_line.B2": ("w04.jpg", [(2455, 878), (2530, 878), (2455, 963), (2530, 963), (2440, 856), (2545, 856), (2482, 812)]),
    "dormer_line.B4": ("w04.jpg", [(2790, 880), (2865, 880), (2790, 975), (2865, 975), (2780, 860), (2880, 860), (2828, 815)]),
    "brisis_break": ("w04.jpg", [(2600, 862), (2950, 866)]),
    # the north-east end (w00, approximate pose): its 2 bays, on the plane u = 20.48
    "ne_end.ff": ("w00.jpg", [(3270, 900), (3320, 900), (3270, 1085), (3320, 1085), (3400, 845), (3460, 845), (3400, 1050), (3460, 1050)], 20.48),
    "ne_end.gf": ("w00.jpg", [(3280, 1240), (3335, 1240), (3405, 1210), (3470, 1210)], 20.48),
    "ne_end.dormers": ("w00.jpg", [(3180, 560), (3205, 560), (3420, 470), (3445, 470)], 20.0),
}


def to_b(p): return [p[0], -p[1], p[2] - DATUM]


def proj(obj, p, W, H):
    rv, tv, f, k1 = p[:3], p[3:6], p[6], p[7]
    K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
    out, _ = cv2.projectPoints(np.asarray(obj, float).reshape(-1, 3), rv, tv, K, np.array([k1, 0, 0, 0, 0.0]))
    return out.reshape(-1, 2)


LINES = []
def line_res(q, W, H):
    out = []
    for (px_, (u, w)) in LINES:
        a, b = proj(np.array([to_b((u, w, 46.0)), to_b((u, w, 60.0))]), q, W, H)
        d = b - a; n = np.array([-d[1], d[0]]) / (np.linalg.norm(d) + 1e-9)
        out.append(float((np.array(px_) - a) @ n))
    return out


def cam_of(q):
    R, _ = cv2.Rodrigues(q[:3]); return R, (-R.T @ q[3:6]).ravel()


def lm(obj, pix, p, W, H, free, f0, cam_h, wide, iters=80):
    p = p.copy(); lam = 1e-3
    def res(q):
        r = [(proj(obj, q, W, H) - pix).ravel() * 0.7] if len(obj) else []
        r.append(np.array(line_res(q, W, H)))
        extra = [q[7] * (200.0 if wide else 3000.0), (q[6] - f0) / f0 * 300]
        if cam_h is not None: extra.append((cam_of(q)[1][2] + DATUM - cam_h) * 6.0)
        return np.concatenate(r + [np.array(extra)])
    r = res(p); e = (r ** 2).sum()
    for _ in range(iters):
        J = np.zeros((len(r), len(free)))
        for j, i in enumerate(free):
            d = np.zeros_like(p); d[i] = 1e-6 * max(1.0, abs(p[i])) if i != 6 else 0.5
            J[:, j] = (res(p + d) - r) / d[i]
        A = J.T @ J; g = J.T @ r
        while True:
            step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
            q = p.copy(); q[free] += step
            rq = res(q); eq = (rq ** 2).sum()
            if eq < e: p, r, e = q, rq, eq; lam = max(lam / 3, 1e-7); break
            lam *= 4
            if lam > 1e7: return p
    return p


def solve(W, H, v):
    obj = np.array([to_b(P) for _, P in v["pts"]], float); pix = np.array([px for px, _ in v["pts"]], float)
    # starting pose: solvePnP on the points + two points per line at plausible heights (the eaves 57.9 and the plinth 49)
    o2 = list(obj); p2 = list(pix)
    for (px_, (u, w)), h in zip(v["lines"], [57.5, 49.5] * 6):
        o2.append(to_b((u, w, h))); p2.append(px_)
    best = None
    for f in (v["f0"] * 0.95, v["f0"], v["f0"] * 1.05):
        K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
        ok, rv, tv = cv2.solvePnP(np.array(o2), np.array(p2), K, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: continue
        p = np.concatenate([rv.ravel(), tv.ravel(), [f, 0.0]])
        p = lm(obj, pix, p, W, H, [0, 1, 2, 3, 4, 5, 6] + ([7] if v["wide"] else []), v["f0"], v.get("cam_h"), v["wide"])
        err = np.sqrt(((proj(obj, p, W, H) - pix) ** 2).sum(1)); le = np.abs(line_res(p, W, H))
        score = float(np.concatenate([err, le]).mean())
        if best is None or score < best[0]: best = (score, p, err, le)
    return best


def backproject(p, W, H, px_list, plane_w=FRONT_W, plane_u=None):
    R, cam = cam_of(p); f = p[6]
    K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
    und = cv2.undistortPoints(np.array(px_list, float).reshape(-1, 1, 2), K, np.array([p[7], 0, 0, 0, 0.0])).reshape(-1, 2)
    out = []
    for x, y in und:
        ray = R.T @ np.array([x, y, 1.0])
        t = ((plane_u - cam[0]) / ray[0]) if plane_u is not None else ((-plane_w - cam[1]) / ray[1])     # blender Y = -w
        q = cam + ray * t
        out.append([round(float(q[0]), 3), round(float(-q[1]), 3), round(float(q[2] + DATUM), 3)])
    return out


def main():
    out = {}; params = {}
    for fn, v in VIEWS.items():
        path = FULL / fn
        im = cv2.imread(str(path)); H, W = im.shape[:2]
        LINES[:] = v["lines"]
        score, p, err, le = solve(W, H, v)
        params[fn] = (p, W, H)
        R, cam = cam_of(p)
        fwd = R.T @ np.array([0, 0, 1.0]); up = R.T @ np.array([0, -1.0, 0])
        tgt = cam + fwd * 60.0
        uwh = lambda q: [round(float(q[0]), 3), round(float(-q[1]), 3), round(float(q[2] + DATUM), 3)]
        r = dict(file=fn, credit=v["credit"], size=[W, H], pos=uwh(cam), target=uwh(tgt), up=[round(float(up[0]), 4), round(float(-up[1]), 4), round(float(up[2]), 4)],
                 fov=round(math.degrees(2 * math.atan(H / 2 / p[6])), 3), f_px=round(float(p[6]), 1), k1=round(float(p[7]), 5),
                 err_px=[round(float(x), 1) for x in err], line_err_px=[round(float(x), 1) for x in le], mean_err=round(score, 2))
        out[v["name"]] = r
        print(f"{fn}: f {r['f_px']} (fov {r['fov']}), k1 {r['k1']}, cam {r['pos']}, pts err {r['err_px']}, lines {r['line_err_px']}, mean {r['mean_err']}")
    json.dump(out, open(ROOT / "models" / "wolvendael_chateau" / "photo_views.json", "w"), indent=1)
    if "--measure" in sys.argv:
        meas = {}
        for name, m in MEASURE.items():
            fn, pxs = m[0], m[1]; pu = m[2] if len(m) > 2 else None
            p, W, H = params[fn]
            meas[name] = dict(photo=fn, px=pxs, uwh=backproject(p, W, H, pxs, plane_u=pu), plane=("u = %g" % pu) if pu is not None else "w = %g" % FRONT_W)
        json.dump(meas, open(ROOT / "models" / "wolvendael_chateau" / "photo_measured.json", "w"), indent=1)
        for k, m in meas.items(): print(f"  {k:28s} {m['photo']}  " + "  ".join(f"u {q[0]:6.2f} w {q[1]:6.2f} h {q[2]:6.2f}" for q in m["uwh"]))
    if "--undistort" in sys.argv:
        (REFS / "undist").mkdir(exist_ok=True)
        for fn, (p, W, H) in params.items():
            im = cv2.imread(str(FULL / fn)); K = np.array([[p[6], 0, W / 2], [0, p[6], H / 2], [0, 0, 1.0]])
            und = cv2.undistort(im, K, np.array([p[7], 0, 0, 0, 0.0]), None, K) if abs(p[7]) > 1e-6 else im
            s = 1600 / W
            cv2.imwrite(str(REFS / "undist" / fn), cv2.resize(und, (1600, int(round(H * s))), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])


if __name__ == "__main__":
    main()
