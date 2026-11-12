"""RUE DE VERREWINKEL BRIDGE: the camera of the free photo s05 (Stratoswift 2021, CC BY-SA 4.0), solved against the
model's frame (for the side-by-side and the lab / city overlay).

    python tools/verrewinkel_photopose.py          (numpy, Pillow; reads data/raw/refs/sauvagere/s05.jpg's size)

Correspondences, measured on the ORIGINAL image (4896 x 3672):
  - the 17 blue-stone consoles' centroids (bright low-saturation blobs, found automatically around hand guesses);
  - the coping's lower shadow line (fitted on 72 points, rms 1.7 px): a LINE constraint;
  - the two rails of the near track (OSM 209080749 at X = -2.96): LINE constraints, rails horizontal along Y;
  - the arch crowns A, B, C and the near pier's front foot (hand-picked, +-10 px).
Model points come from models/rail/verrewinkel.json + the same parameters as tools/blender/roadBridge.py (bridge frame:
X along the road NW -> SE, +Y north-east, Z up over the cutting floor 70.30 TAW). Unknowns: camera position, yaw / pitch /
roll, focal (prior: EXIF 4.25 mm = 24 mm equiv. -> 3370 px), Levenberg-Marquardt. Writes
models/rail/verrewinkel_photo_views.json (bridge frame for Blender; city frame for the viewer) and prints the residuals:
a large one says where the model and the photo disagree.
"""
import json, math
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
W, H = 4896, 3672
INFO = json.load(open(ROOT / "models" / "rail" / "verrewinkel.json"))

# ---- the model's numbers (as roadBridge.py)
XA, XB = INFO["deck"]["x0"], INFO["deck"]["x1"]
R0, R1 = INFO["deck"]["road_ends"]
FLOOR = INFO["placement"]["city_local_position"][1]
road = lambda x: R0 + (x - XA) * (R1 - R0) / (XB - XA) - FLOOR
YU, YL = 2.50, 2.38
AX, NB, PITCH = 17.12, 18, 1.99
CONS = [(k - (NB - 2) / 2) * PITCH for k in range(NB - 1)]
zspring = lambda x: road(x) - 0.60
zcb = lambda x: road(x) + 0.90
OPS = {o["name"]: o for o in INFO["openings"]}

# ---- measurements on s05 (pixels)
CONS_PX = [(721.1, 2019.5), (1423.1, 1895.3), (1961.4, 1782.1), (2363.9, 1697.3), (2715.9, 1622.8), (2973.9, 1569.0),
           (3219.4, 1505.9), (3437.7, 1465.6), (3593.6, 1427.1), (3732.2, 1404.5), (3883.9, 1367.4), (3999.3, 1343.9),
           (4102.7, 1317.6), (4188.8, 1301.6), (4284.2, 1278.0), (4362.7, 1258.8), (4437.6, 1244.5)]
COPING_LINE = (-0.1034, 1541.3, 1200, 4440)                    # y = a x + b, x range
RAIL_LO = (0.3423, 1687.5, 3000, 4890)                         # the near track's rails (y = a x + b)
RAIL_HI = (0.3093, 1667.0, 3000, 4890)
POINTS = {                                                     # hand-picked: pixel -> model point (bridge frame)
    "arch A crown": ((2150, 1989), (OPS["A"]["x0"] / 2 + OPS["A"]["x1"] / 2, -YL, OPS["A"]["crown"])),
    "arch B crown": ((3519, 1599), (0.0, -YL, OPS["B"]["crown"])),
    "arch C crown": ((4151, 1423), (OPS["C"]["x0"] / 2 + OPS["C"]["x1"] / 2, -YL, OPS["C"]["crown"])),
    "SE fold, coping underside": ((4490, 1078), (17.2, -(YU + 0.04), zcb(17.2))),       # the arcade ends at the wing's fold
    "SE wing end, coping top": ((4660, 1048), (19.85, -(YU + 0.8), zcb(19.85) + 0.27)),
}
FSIG = 8.0                                                     # EXIF focal: trusted
RAIL_X, GAUGE_C, RAIL_Z = -2.96, 1.435 / 2 + 0.036, 0.31


def axes(yaw, pitch, roll):
    f = np.array([math.cos(pitch) * math.cos(yaw), math.cos(pitch) * math.sin(yaw), math.sin(pitch)])
    r = np.cross(f, [0, 0, 1.0]); r /= np.linalg.norm(r); v = np.cross(r, f)
    c, s = math.cos(roll), math.sin(roll)
    return c * r + s * v, -s * r + c * v, f


def proj(P, q):
    C, (yaw, pitch, roll, F) = q[:3], q[3:7]
    r, v, f = axes(yaw, pitch, roll)
    d = np.atleast_2d(P) - C
    z = d @ f
    return np.stack([W / 2 + F * (d @ r) / z, H / 2 - F * (d @ v) / z], 1)


def line_res(px, A, B):
    d = B - A; n = np.array([-d[1], d[0]]) / np.linalg.norm(d)
    return (px - A) @ n


def residuals(q, detail=False):
    out, info = [], {}
    pc = proj(np.array([[x, -(YL + 0.2), zspring(x) - 0.2] for x in CONS]), q)
    e = (pc - np.array(CONS_PX)); out.append(e.ravel() / 6.0); info["consoles"] = np.sqrt((e ** 2).sum(1))
    a, b, x0, x1 = COPING_LINE
    xs = np.linspace(x0, x1, 12); meas = np.stack([xs, a * xs + b], 1)
    P = proj(np.array([[-15.0, -(YU + 0.04), zcb(-15.0)], [15.0, -(YU + 0.04), zcb(15.0)]]), q)
    e = line_res(meas, P[0], P[1]); out.append(e / 2.0); info["coping"] = np.abs(e)
    for (a, b, x0, x1), side in ((RAIL_LO, -1), (RAIL_HI, 1)):
        xs = np.linspace(x0, x1, 10); meas = np.stack([xs, a * xs + b], 1)
        X = RAIL_X + side * GAUGE_C
        P = proj(np.array([[X, -6.0, RAIL_Z], [X, -30.0, RAIL_Z]]), q)
        e = line_res(meas, P[0], P[1]); out.append(e / 8.0); info["rail%+d" % side] = np.abs(e)
    for k, (px, m) in POINTS.items():
        e = proj(np.array(m), q)[0] - np.array(px); out.append(e / 10.0); info[k] = np.linalg.norm(e)
    out.append([(q[6] - 3370) / FSIG])
    r = np.concatenate([np.ravel(x) for x in out])
    return (r, info) if detail else r


def lm(q, it=300):
    lam = 1e-2
    for _ in range(it):
        r = residuals(q); J = np.zeros((len(r), len(q)))
        for j in range(len(q)):
            dq = np.zeros_like(q); h = 1e-6 * max(1, abs(q[j])); dq[j] = h; J[:, j] = (residuals(q + dq) - r) / h
        A = J.T @ J; g = J.T @ r
        while True:
            step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
            if residuals(q + step) @ residuals(q + step) < r @ r: q = q + step; lam *= 0.3; break
            lam *= 10
            if lam > 1e9: return q
    return q


def main():
    best = None
    for cx in (-24.0, -19.0, -14.0):
        for cy in (-10.0, -14.0, -18.0):
            for cz in (5.0, 7.0, 9.0):
                C = np.array([cx, cy, cz]); T = np.array([2.0, -2.5, 4.0]); d = T - C
                q = np.array([cx, cy, cz, math.atan2(d[1], d[0]), math.asin(d[2] / np.linalg.norm(d)), 0.0, 3370.0])
                q = lm(q, 120); c = residuals(q) @ residuals(q)
                if best is None or c < best[0]: best = (c, q)
    q = lm(best[1], 400)
    r, info = residuals(q, True)
    for k, v in info.items(): print(f"  {k:28s} " + (f"{float(np.mean(v)):6.1f} px mean, {float(np.max(v)):6.1f} max" if np.ndim(v) else f"{float(v):6.1f} px"))
    C = q[:3]; yaw, pitch, roll, F = q[3:7]
    rr, vv, ff = axes(yaw, pitch, roll)
    tgt = C + ff * 20.0
    lens = F / W * 36.0
    # city frame: three (x, y, z) with y up; bridge (X, Y, Z) -> city
    th = INFO["placement"]["rotation_y_rad"]; cx0, _, cz0 = INFO["placement"]["city_local_position"]
    def city(p):
        X, Y, Z = p
        # three: local (X, Z, -Y) rotated by th about y, + position
        lx, ly, lz = X, Z, -Y
        c, s = math.cos(th), math.sin(th)
        return [round(cx0 + lx * c + lz * s, 3), round(FLOOR + ly, 3), round(cz0 - lx * s + lz * c, 3)]
    fov_v = math.degrees(2 * math.atan(H / 2 / F))
    print(f"camera bridge {C.round(2)} (eye {FLOOR + C[2]:.2f} TAW), yaw {math.degrees(yaw):.1f} pitch {math.degrees(pitch):.1f} roll {math.degrees(roll):.2f}, F {F:.0f} px ({lens:.1f} mm), vfov {fov_v:.1f}")
    out = {"s05": {"file": "data/raw/refs/sauvagere/s05.jpg", "credit": "Photo: Stratoswift, 2021, CC BY-SA 4.0, Wikimedia Commons",
                   "size": [W, H], "pos": [round(float(x), 3) for x in C], "target": [round(float(x), 3) for x in tgt], "lens": round(float(lens), 2),
                   "roll": round(float(roll), 4), "f_px": round(float(F), 1), "vfov": round(fov_v, 2),
                   "city": {"pos": city(C), "target": city(tgt), "up": city(C + vv)[0:3]},
                   "rms_px": round(float(np.sqrt(np.mean(np.concatenate([np.ravel(v) for v in info.values()]) ** 2))), 1)}}
    up_city = np.array(city(C + vv)) - np.array(city(C))
    out["s05"]["city"]["up"] = [round(float(x), 4) for x in up_city]
    json.dump(out, open(ROOT / "models" / "rail" / "verrewinkel_photo_views.json", "w"), indent=1)
    print("wrote models/rail/verrewinkel_photo_views.json")


if __name__ == "__main__":
    main()
