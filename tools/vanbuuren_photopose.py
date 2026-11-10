"""VILLA VAN BUUREN: camera poses of the reference photos (the lab's overlays, the side-by-sides), after
tools/stalle_photopose.py.

    python tools/vanbuuren_photopose.py [--undistort]     (opencv-python, numpy)

Each photo gets hand-picked correspondences: a pixel of the full-size, UPRIGHT original (data/raw/refs/vanbuuren/full/)
<-> a point of the model in the building frame (u ~ east, w ~ south, h m TAW): a LANDMARK name written by
tools/blender/vanbuuren.py (models/vanbuuren/vanbuuren_landmarks.json: openings' corners, gable apexes, ridge ends) or
explicit (u, w, h). Solved: the pose + the focal length + radial distortion (k1, k2: the Samsung's 18 mm ultra-wide
bends lines) with the principal point at the image centre, by Levenberg-Marquardt from cv2.solvePnP starts over a focal
scan. Per-point reprojection errors are printed: a large one = the model and the photo disagree there (a fix for the
model, or a mis-picked pixel). --undistort writes data/raw/refs/vanbuuren/undist/<photo> (git-ignored): the photo
remapped to the pinhole camera the lab renders (same focal, no distortion).
Writes models/vanbuuren/photo_views.json: pos / target (building frame), vertical fov, f, k1, k2, errors.
"""
import json, math, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "data" / "raw" / "refs" / "vanbuuren"
if not REFS.exists(): REFS = ROOT.parent.parent.parent / "data" / "raw" / "refs" / "vanbuuren"
FULL = REFS / "full"
_J = json.load(open(ROOT / "models" / "vanbuuren" / "vanbuuren_landmarks.json"))
LM, PLANES = _J["landmarks"], _J.get("planes", {})
CRED_D = "Photo: Donarreiskoffer, 2019, CC BY-SA 4.0 (Wikimedia Commons, Museum Van Buuren {n}.jpg)"

def C(*names_px):
    """corners of an opening: C('east_S.o0', tl, tr, br, bl) -> 4 correspondences"""
    name, tl, tr, br, bl = names_px
    return [(tl, f"{name}.tl"), (tr, f"{name}.tr"), (br, f"{name}.br"), (bl, f"{name}.bl")]

VIEWS = {
    "v03.jpg": dict(name="entrance front, east (v03)", credit=CRED_D.format(n=24), wide=True, f0=1697, pts=[
        ((1816, 428), "ridgeC.east")
    ], lines=[((752, 950), (5.75, 7.10)), ((754, 1150), (5.75, 7.10)), ((2190, 1000), (5.30, -3.85)), ((2190, 1150), (5.30, -3.85)),
    ], pts2=[
        *C("east_N.attic", (1734, 706), (1902, 706), (1902, 788), (1734, 788)),
        *C("east_N.stair", (1678, 948), (1970, 948), (1970, 1244), (1678, 1244)),
        *C("east_S_hi.attic_l", (969, 575), (1070, 575), (1070, 697), (969, 697)),
        *C("east_S.ff", (802, 909), (949, 909), (949, 1119), (802, 1119)),
        *C("east_bay.ff", (1273, 902), (1468, 902), (1468, 1123), (1273, 1123)),
        *C("porch_front.lead_l", (1459, 1355), (1577, 1355), (1577, 1595), (1459, 1595)),
        *C("porch_front.lead_r", (2094, 1355), (2218, 1355), (2218, 1604), (2094, 1604)),
        *C("east_wing.gf", (2445, 1408), (2655, 1408), (2655, 1592), (2445, 1592)),
    ]),
    "v06.jpg": dict(name="garden front, west (v06)", credit="Photo: Alberto Fernandez Fernandez, 2011, CC BY-SA 3.0 (Wikimedia Commons, Museum van Buuren Brussels Belgium.jpg)", wide=False, f0=3038, pts=[
        ((1252, 702), "ridgeC.west"), ((1918, 528), "ridgeB.west")
    ], lines=[((937, 1330), (-7.0, -4.70)), ((937, 1580), (-7.0, -4.70)), ((1595, 1300), (-5.65, 1.30)), ((1597, 1600), (-5.65, 1.30)),
              ((1502, 1280), (-7.0, 1.30)), ((1503, 1580), (-7.0, 1.30))], pts2=[
        *C("west_C.attic", (1154, 982), (1290, 982), (1290, 1092), (1154, 1092)),
        *C("west_C.box", (1030, 1200), (1367, 1200), (1367, 1470), (1030, 1470)),
        *C("west_B.attic", (1802, 847), (2020, 847), (2020, 1027), (1802, 1027)),
        *C("west_B.ff", (1810, 1230), (1975, 1230), (1975, 1462), (1810, 1462)),
        *C("west_B.small", (1622, 1368), (1690, 1368), (1690, 1470), (1622, 1470)),
    ]),
    "v00.jpg": dict(name="south gable (v00)", credit=CRED_D.format(n=20), wide=False, f0=3602, cam_h=94.4, pts=[
        ((2360, 287), "ridgeA.south"),
        # off the gable's plane (a near-planar set leaves the camera free to slide along it): the chimney stack's top
        # corners (south-west, south-east) and the corner oriel's south window (on its face at w 7.30)
        ((2752, 600), (5.13, 4.64, 107.41)), ((2897, 612), (5.97, 4.64, 107.41)),
        ((1424, 1146), (-5.95, 7.30, 101.20)), ((1618, 1146), (-4.55, 7.30, 101.20)), ((1424, 1382), (-5.95, 7.30, 99.60)), ((1618, 1382), (-4.55, 7.30, 99.60))
    ], lines=[((1905, 1150), (-2.48, 8.45)), ((1903, 1450), (-2.48, 8.45)), ((2735, 1250), (3.72, 8.45)), ((2737, 1500), (3.72, 8.45))], pts2=[
        *C("south_A.attic", (2195, 675), (2496, 675), (2496, 869), (2195, 869)),
        *C("south_A.box", (2102, 1095), (2548, 1095), (2548, 1417), (2102, 1417)),
        *C("south_E.ff", (2819, 1308), (2955, 1308), (2955, 1489), (2819, 1489)),
    ]),
}

def proj(obj, p, W, H):
    rv, tv, f, k1, k2 = p[:3], p[3:6], p[6], p[7], p[8]
    K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
    out, _ = cv2.projectPoints(obj, rv, tv, K, np.array([k1, k2, 0, 0, 0.0]))
    return out.reshape(-1, 2)

LINES = []          # (pixel, (u, w)): the pixel lies on the vertical wall corner through (u, w)
def line_res(q, W, H):
    out = []
    for (px_, (u, w)) in LINES:
        a, b = proj(np.array([[u, -w, 94.0 - 90.0], [u, -w, 106.0 - 90.0]]), q, W, H)
        d = b - a; n = np.array([-d[1], d[0]]) / (np.linalg.norm(d) + 1e-9)
        out.append(float((np.array(px_) - a) @ n))
    return out
def lm_refine(obj, pix, p, W, H, free, iters=60, f0=None, cam_h=None):
    """Levenberg-Marquardt over the free parameters (indices into p), numeric Jacobian, a weak prior on k1 / k2"""
    p = p.copy(); lam = 1e-3
    def res(q):
        r = np.concatenate([(proj(obj, q, W, H) - pix).ravel(), line_res(q, W, H)])
        extra = [q[7] * KW, q[8] * KW] + ([(q[6] - f0) / f0 * 400] if f0 else [])
        if cam_h is not None:
            # a prior on the camera's height (the photographer's eye above the DTM; a near-planar facade alone leaves it loose)
            Rq, _ = cv2.Rodrigues(q[:3]); ch = (-Rq.T @ q[3:6])[2] + 90.0
            extra.append((ch - cam_h) * 40.0)
        return np.concatenate([r, extra])
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
            if lam > 1e6: return p
    return p

KW = 200.0
def solve(W, H, pts, wide, f0=None, cam_h=None):
    global KW
    KW = 200.0 if wide else 2000.0
    obj = np.array([[LM[n][0] if isinstance(n, str) else n[0], -(LM[n][1] if isinstance(n, str) else n[1]), (LM[n][2] if isinstance(n, str) else n[2]) - 90.0] for _, n in pts], np.float64)
    pix = np.array([p for p, _ in pts], np.float64)
    best = None
    for f in ([f0 * 0.97, f0, f0 * 1.03] if f0 else np.geomspace(0.4 * W, 2.5 * W, 40)):
        K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
        ok, rv, tv = cv2.solvePnP(obj, pix, K, None, flags=cv2.SOLVEPNP_SQPNP)
        if not ok: continue
        p = np.concatenate([rv.ravel(), tv.ravel(), [f, 0.0, 0.0]])
        p = lm_refine(obj, pix, p, W, H, [0, 1, 2, 3, 4, 5, 6] + ([7, 8] if wide else [7]), iters=40, f0=f0, cam_h=cam_h)
        err = np.sqrt(((proj(obj, p, W, H) - pix) ** 2).sum(1))
        if best is None or err.mean() < best[0]: best = (err.mean(), p, err)
    e, p, err = best
    R, _ = cv2.Rodrigues(p[:3]); tv = p[3:6]
    cam = (-R.T @ tv).ravel(); fwd = R.T @ np.array([0, 0, 1.0])
    dist = np.linalg.norm(obj.mean(0) - cam); tgt = cam + fwd * dist
    up = R.T @ np.array([0, -1.0, 0])
    f = p[6]
    to_uwh = lambda q: [round(float(q[0]), 3), round(float(-q[1]), 3), round(float(q[2] + 90.0), 3)]
    meas = {}
    if PLANES:
        # every picked pixel -> its ray -> the plane of its landmark's facade: the photo's position of that corner
        Kc = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
        und = cv2.undistortPoints(pix.reshape(-1, 1, 2), Kc, np.array([p[7], p[8], 0, 0, 0.0])).reshape(-1, 2)
        for (px_, n), (x, y) in zip(pts, und):
            if not isinstance(n, str) or n.split(".")[0] not in PLANES: continue
            nu, nw, dd, Uu, Uw = PLANES[n.split(".")[0]]
            ray = R.T @ np.array([x, y, 1.0])                  # Blender frame (u, -w, h - 90)
            nb = np.array([nu, -nw, 0.0])
            tt = (dd - nb @ cam) / (nb @ ray)
            q = cam + ray * tt
            meas[n] = [round(float(q[0]), 3), round(float(-q[1]), 3), round(float(q[2] + 90.0), 3)]
    return dict(_p=[float(x) for x in p], pos=to_uwh(cam), target=to_uwh(tgt), measured=meas, up=[round(float(up[0]), 4), round(float(-up[1]), 4), round(float(up[2]), 4)],
                fov=round(math.degrees(2 * math.atan(H / 2 / f)), 3), f_px=round(float(f), 1), k1=round(float(p[7]), 5), k2=round(float(p[8]), 5),
                err_px=[round(float(x), 1) for x in err], mean_err=round(float(e), 2), names=[n if isinstance(n, str) else str(n) for _, n in pts])

MEAS = {}
def main():
    out = {}
    for fn, v in VIEWS.items():
        p = FULL / fn
        if not p.exists(): print("missing", p); continue
        im = cv2.imread(str(p)); H, W = im.shape[:2]
        LINES[:] = v.get("lines", [])
        r = solve(W, H, v["pts"] + v.get("pts2", []), v["wide"], v.get("f0"), v.get("cam_h"))
        r["line_err_px"] = [round(x, 1) for x in line_res(np.array(r.pop("_p")), W, H)]
        print("   wall corner lines (px):", r["line_err_px"])
        out[v["name"]] = dict(file=fn, credit=v["credit"], size=[W, H], **r)
        print(f"{fn}: f {r['f_px']} px (fov {r['fov']}), k1 {r['k1']} k2 {r['k2']}, mean err {r['mean_err']} px, pos {r['pos']}")
        # per opening: the measured extents (the facade's running coordinate + levels) vs the model's
        groups = {}
        for n, m in r["measured"].items():
            base = n.rsplit(".", 1)[0]
            if base.count(".") == 1: groups.setdefault(base, {})[n.rsplit(".", 1)[1]] = m
        for base, c in groups.items():
            if len(c) < 4: continue
            nu, nw, dd, Uu, Uw = PLANES[base.split(".")[0]]
            run = (lambda q: q[1]) if abs(nu) > 0.5 else (lambda q: q[0])
            mod = {k: LM[f"{base}.{k}"] for k in c}
            fmt = lambda d: f"c {(run(d['tl']) + run(d['tr']) + run(d['bl']) + run(d['br'])) / 4:6.2f} w {abs(run(d['tr']) - run(d['tl'])) / 2 + abs(run(d['br']) - run(d['bl'])) / 2:5.2f} h {(d['bl'][2] + d['br'][2]) / 2:6.2f}..{(d['tl'][2] + d['tr'][2]) / 2:6.2f}"
            e = [x for nn, x in zip(r["names"], r["err_px"]) if nn.startswith(base + ".")]
            cc = lambda d: (run(d['tl']) + run(d['tr']) + run(d['bl']) + run(d['br'])) / 4
            MEAS[base] = dict(c=round(cc(c), 3), w=round(abs(run(c['tr']) - run(c['tl'])) / 2 + abs(run(c['br']) - run(c['bl'])) / 2, 3),
                              h0=round((c['bl'][2] + c['br'][2]) / 2, 3), h1=round((c['tl'][2] + c['tr'][2]) / 2, 3), photo=fn, err_px=round(float(np.mean(e)), 1))
            print(f"   {base:24s} photo {fmt(c)} | model {fmt(mod)} | err {np.mean(e):5.1f} px")
        if "--undistort" in sys.argv:
            K = np.array([[r["f_px"], 0, W / 2], [0, r["f_px"], H / 2], [0, 0, 1.0]])
            und = cv2.undistort(im, K, np.array([r["k1"], r["k2"], 0, 0, 0.0]), None, K)
            (REFS / "undist").mkdir(exist_ok=True)
            # the lab loads a 1600 px wide copy
            s = 1600 / W
            cv2.imwrite(str(REFS / "undist" / fn), cv2.resize(und, (1600, int(round(H * s))), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
    json.dump(out, open(ROOT / "models" / "vanbuuren" / "photo_views.json", "w"), indent=1)
    if "--write-measured" in sys.argv:
        # the openings as the photos place them (read by tools/blender/vanbuuren.py: positions from the photos)
        json.dump(MEAS, open(ROOT / "models" / "vanbuuren" / "photo_measured.json", "w"), indent=1)

if __name__ == "__main__":
    main()
