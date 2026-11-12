"""EGLISE SAINT-PIERRE D'UCCLE: camera poses of the reference photos (for the lab's photo overlays and the side-by-sides).
After tools/stalle_photopose.py (branch claude/stalle).

    python tools/stpierre_photopose.py            (opencv-python, numpy; reads data/raw/refs/saint-pierre/*.jpg sizes)

Each photo gets hand-picked correspondences: a pixel of the ORIGINAL image <-> a point of the church in the building frame
(u along the axis, w south, h m TAW: footprint corners, DSM / photo levels, points of the model whose positions were
read on the frontal photo P02). The focal length and the principal point's height are scanned, the pose solved
(cv2.solvePnP), and the camera written as the lab's viewpoint: pos (u, w, h), target, vertical fov. Writes
models/stpierre/photo_views.json. Reprojection errors are printed per point: a large one means the model and the photo
disagree there (a fix for the model) or a misread pixel.
"""
import json, math
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "data" / "raw" / "refs" / "saint-pierre"
WC = -0.07
# the plan's heights (tools/blender/stpierre.py): photo P02 levels re-anchored on the door's aspect in c10 (see NOTES)
T = lambda h: round(49.85 + (36 * h - 1752.6) / 35.3, 2)
# model points (u, w, h) used below
DOOR_TL, DOOR_TR = (-0.55, WC - 1.32, T(55.35)), (-0.55, WC + 1.32, T(55.35))
FAN_TOP = (-0.7, WC, T(55.35) + 0.87 + 1.55)
CORN_L, CORN_R = (-0.42, WC - 9.78 - 0.42, T(59.45)), (-0.42, WC + 9.78 + 0.42, T(59.45))
UCORN_L, UCORN_R = (-0.81, WC - 4.13 - 0.36, T(64.85)), (-0.81, WC + 4.13 + 0.36, T(64.85))
DIAL_W = (0.11, WC, T(73.42))
URN_TOP = T(59.45) + 0.91 + 1.66
URN_FN, URN_FS = (0.48, WC - 9.18, URN_TOP), (0.48, WC + 9.18, URN_TOP)
URN_S_PIL = (6.89, 9.41, URN_TOP)
URN_N4_S, URN_N4_N = (6.26, -10.3, URN_TOP), (6.26, -16.8, URN_TOP)
BELFRY_BL, BELFRY_TR = (0.2, WC - 0.93, T(68.3)), (0.2, WC + 0.93, T(71.6))

VIEWS = {
    "heritage_P02.jpg": dict(f35=25, level=51.4, name="west front, frontal (inventory P02)", credit="Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)", pts=[
        ((508, 888), DOOR_TL), ((603, 888), DOOR_TR), ((557, 795), FAN_TOP), ((207, 742), CORN_L), ((908, 742), CORN_R),
        ((375, 548), UCORN_L), ((735, 548), UCORN_R), ((548, 255), DIAL_W), ((248, 655), URN_FN), ((873, 640), URN_FS),
        ((515, 435), BELFRY_BL), ((580, 320), BELFRY_TR),
        
    ]),
    "c10.jpg": dict(f35=27, name="west front (Commons, EmDee 2011)", credit="Photo: EmDee, 2011, CC BY-SA 3.0 (Wikimedia Commons, Eglise Saint-Pierre d'Uccle 10.JPG)", pts=[
        ((1232, 2466), DOOR_TL), ((1424, 2466), DOOR_TR), ((1330, 2250), FAN_TOP), ((400, 1960), CORN_L), ((1945, 2155), CORN_R), ((1670, 1700), UCORN_R), ((1300, 870), DIAL_W), ((474, 1680), URN_FN), ((1870, 1970), URN_FS),
        ((1240, 1300), BELFRY_BL), ((1380, 1010), BELFRY_TR),
    ]),
    "heritage_P01.jpg": dict(f35=25, level_yaw=51.2, name="south-west, the long side (inventory P01)", credit="Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)", pts=[
        ((808, 437), URN_FS), ((968, 508), URN_S_PIL), ((562, 150), DIAL_W), ((503, 790), DOOR_TL), ((550, 790), DOOR_TR), ((850, 555), CORN_R),
        ((540, 320), BELFRY_BL), ((578, 205), BELFRY_TR), ((900, 680), (3.8, 9.53, 58.9)), ((900, 855), (3.8, 9.5, 53.79)), ((1052, 722), (10.0, 9.53, 58.9)),
    ]),
    "heritage_P03.jpg": dict(f35=25, level_yaw=51.4, name="north-west, the fourth nave (inventory P03)", credit="Reference only: Inventaire du patrimoine architectural, urban.brussels (no free licence)", pts=[
        ((805, 500), URN_FN), ((737, 557), URN_N4_S), ((523, 532), URN_N4_N), ((1083, 158), DIAL_W), ((1095, 780), DOOR_TL), ((1172, 780), DOOR_TR),
        ((1065, 330), BELFRY_BL), ((1120, 220), BELFRY_TR), ((625, 718), (5.9, -13.55, 58.99)), ((625, 858), (5.9, -13.55, 53.53)),
    ]),
}


def solve(img_wh, pts, shift=True, frange=(0.4, 5.0)):
    W, H = img_wh
    obj = np.array([[u, -w, h - 50.0] for _, (u, w, h) in pts], np.float64)
    pix = np.array([p for p, _ in pts], np.float64)
    best = None
    for f in np.geomspace(frange[0] * W, frange[1] * W, 80):
        for cy in (np.linspace(0.2 * H, 1.0 * H, 33) if shift else [H / 2]):
            Kc = np.array([[f, 0, W / 2], [0, f, cy], [0, 0, 1]], np.float64)
            try:
                ok, rv, tv = cv2.solvePnP(obj, pix, Kc, None, flags=cv2.SOLVEPNP_SQPNP)
                if not ok: continue
                ok, rv, tv = cv2.solvePnP(obj, pix, Kc, None, rv, tv, True, flags=cv2.SOLVEPNP_ITERATIVE)
            except cv2.error:
                continue
            proj, _ = cv2.projectPoints(obj, rv, tv, Kc, None)
            err = np.sqrt(((proj.reshape(-1, 2) - pix) ** 2).sum(1))
            if best is None or err.mean() < best[0]: best = (err.mean(), f, rv, tv, err, cy)
    e, f, rv, tv, err, cy = best
    R, _ = cv2.Rodrigues(rv)
    cam = (-R.T @ tv).ravel()
    fwd = R.T @ np.array([0, 0, 1.0])
    dist = np.linalg.norm(obj.mean(0) - cam)
    tgt = cam + fwd * dist
    fov = math.degrees(2 * math.atan(H / 2 / f))
    to_uwh = lambda p: [round(float(p[0]), 2), round(float(-p[1]), 2), round(float(p[2] + 50.0), 2)]
    return dict(pos=to_uwh(cam), target=to_uwh(tgt), fov=round(fov, 2), cy=round(float(cy / H), 4), f_px=round(float(f), 1), err_px=[round(float(x), 1) for x in err], mean_err=round(float(e), 1))


def solve_level(img_wh, pts, f, eye):
    """a RECTIFIED photo (the inventory's: verticals parallel) = a level pinhole camera facing +u with its principal point
    off-centre vertically: with the EXIF focal and the photographer's eye height fixed, scan the distance and solve the
    side offset and the horizon row linearly (the free PnP slides along the front plane's degeneracy otherwise)"""
    W, H = img_wh
    best = None
    for uc in np.arange(-60.0, -8.0, 0.05):
        D = np.array([u - uc for _, (u, w, h) in pts]); xs = np.array([p[0] for p, _ in pts]); ys = np.array([p[1] for p, _ in pts])
        ws = np.array([w for _, (u, w, h) in pts]); hs = np.array([h for _, (u, w, h) in pts])
        wc = np.mean(ws - (xs - W / 2) * D / f)                     # x = W/2 + f (w - wc) / D
        cy = np.mean(ys + f * (hs - eye) / D)                        # y = cy - f (h - eye) / D
        ex = W / 2 + f * (ws - wc) / D; ey = cy - f * (hs - eye) / D
        err = np.sqrt((ex - xs) ** 2 + (ey - ys) ** 2)
        if best is None or err.mean() < best[0]: best = (err.mean(), uc, wc, cy, err)
    e, uc, wc, cy, err = best
    full = 2 * max(cy, H - cy)
    return dict(pos=[round(float(uc), 2), round(float(wc), 2), eye], target=[round(float(uc + 30), 2), round(float(wc), 2), eye], fov=round(math.degrees(2 * math.atan(H / 2 / f)), 2),
                cy=round(float(cy / H), 4), f_px=round(float(f), 1), err_px=[round(float(x), 1) for x in err], mean_err=round(float(e), 1), model="level (rectified)")


def solve_level_yaw(img_wh, pts, f, eye):
    """a rectified photo taken obliquely: level camera (no pitch / roll), EXIF focal, the eye height fixed; brute force
    over the yaw and the plan position (coarse grid, then a fine one round the best), the horizon row solved linearly"""
    W, H = img_wh
    P = np.array([[u, w, h] for _, (u, w, h) in pts]); X = np.array([p for p, _ in pts], float)
    def score(yaws, us, ws):
        best = None
        for psi in yaws:
            fu, fw = math.cos(psi), math.sin(psi); ru, rw = -fw, fu
            U, Wg = np.meshgrid(us, ws, indexing="ij"); U = U.ravel()[:, None]; Wg = Wg.ravel()[:, None]
            du = P[None, :, 0] - U; dw = P[None, :, 1] - Wg
            D = du * fu + dw * fw; Rr = du * ru + dw * rw
            ok = (D > 1).all(1)
            x = W / 2 + f * Rr / np.maximum(D, 1e-3)
            cy = np.mean(X[None, :, 1] + f * (P[None, :, 2] - eye) / np.maximum(D, 1e-3), 1, keepdims=True)
            y = cy - f * (P[None, :, 2] - eye) / np.maximum(D, 1e-3)
            err = np.sqrt((x - X[None, :, 0]) ** 2 + (y - X[None, :, 1]) ** 2).mean(1)
            err[~ok] = 1e9
            i = int(err.argmin())
            if best is None or err[i] < best[0]: best = (float(err[i]), psi, float(U[i, 0]), float(Wg[i, 0]), float(cy[i, 0]))
        return best
    b = score(np.radians(np.arange(-80, 80.1, 1.0)), np.arange(-70, 30, 1.0), np.arange(-60, 60, 1.0))
    b = score(np.radians(np.arange(math.degrees(b[1]) - 1.5, math.degrees(b[1]) + 1.5, 0.1)), np.arange(b[2] - 2, b[2] + 2, 0.1), np.arange(b[3] - 2, b[3] + 2, 0.1))
    e, psi, uc, wc, cy = b
    fu, fw = math.cos(psi), math.sin(psi); ru, rw = -fw, fu
    errs = []
    for (px, (u, w, h)) in pts:
        D = (u - uc) * fu + (w - wc) * fw; R_ = (u - uc) * ru + (w - wc) * rw
        errs.append(round(math.hypot(W / 2 + f * R_ / D - px[0], cy - f * (h - eye) / D - px[1]), 1))
    return dict(pos=[round(uc, 2), round(wc, 2), eye], target=[round(uc + 30 * fu, 2), round(wc + 30 * fw, 2), eye], fov=round(math.degrees(2 * math.atan(H / 2 / f)), 2),
                cy=round(cy / H, 4), f_px=round(f, 1), err_px=errs, mean_err=round(e, 1), model="level + yaw (rectified)")


def main():
    out = {}
    path = ROOT / "models" / "stpierre" / "photo_views.json"
    for fn, v in VIEWS.items():
        p = REFS / fn
        if not p.exists(): print("missing", p); continue
        im = cv2.imread(str(p)); H, W = im.shape[:2]
        if len(v["pts"]) < 6:
            print(fn, "too few points for a free pose: skipped (see the lab's hand-set viewpoints)"); continue
        fr_ = v.get("frange", (0.4, 5.0))
        if "f35" in v:                       # EXIF 35 mm equivalent focal: f_px = f35 / 36 * the long side; +-12 % (crops, rectification)
            f0 = v["f35"] / 36.0 * max(W, H); fr_ = (0.88 * f0 / W, 1.12 * f0 / W)
        if v.get("level_yaw"): r = solve_level_yaw((W, H), v["pts"], v["f35"] / 36.0 * max(W, H), v["level_yaw"])
        elif v.get("level"): r = solve_level((W, H), v["pts"], v["f35"] / 36.0 * max(W, H), v["level"])
        else: r = solve((W, H), v["pts"], v.get("shift", True), fr_)
        out[v["name"]] = dict(file=fn, credit=v["credit"], size=[W, H], **r)
        print(fn, json.dumps(r))
    json.dump(out, open(path, "w"), indent=1)


if __name__ == "__main__":
    main()
