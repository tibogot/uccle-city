"""MEASURED ROAD-BRIDGE PROFILES (claude/places1, 2026-11-23; rule deck-profile-measured, docs/rules/deck-profile-measured.md).

The OSM road decks (viewer/streets/bridgeDecks.js) drew their top as the straight line between the bare-earth DTM a few
metres past each end. A long bridge over two lines rises in a curve, not a straight line: Avenue des Tilleuls (E9 / D9,
164 m over L26 and the L26/5 chord) was drawn up to 0.95 m UNDER its real top in the middle, its soffit 4.0 m over the
chord's rails, and railData.js pulled the contact wire down to 3.6 m over the rail top to pass under it (owner playtest:
"wire clearance too low under Av. des Tilleuls / Hospices / Carsoel").

Here: per OSM road bridge (every tile's roads.json, meta.bridge not "no"; the longest copy of a way across the tiles),
the deck's real top along its centre line from the UrbIS DSM (2021, 0.5 m: the deck's surface; the DTM is the cutting
under it). Every PROF m: the median of the DSM over the carriageway (+-CARR m across, +-0.5 m along); then the samples
more than OUTLIER m off their running median dropped (trees and lamps over the road, the cutting seen past a narrow
deck's edge), filled from their neighbours, lightly smoothed (a deck's top is a smooth vertical curve). A bridge whose fit
keeps too few samples or leaves a large residual is not a clean deck surface (a service ramp, a bridge under trees) and
is skipped and reported: the viewer keeps the straight line for it.

Writes data/overrides.json "bridgeProfiles": { "<osm way>": { "why", "source", "line": [x, z, y, x, z, y, ...] } }
(spliced in as one block; the rest of the file untouched).

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/bridges/deckProfiles.py --raw C:/Users/tibog/Downloads/uccle-city/data/raw [--dry]
"""
import argparse, json, math, re, sys
from pathlib import Path

import numpy as np
import rasterio

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from common import local_to_l72  # noqa: E402

PROF = 2.0          # m between samples along the line
CARR = 1.5          # m either side of the centre line sampled (inside the carriageway of the narrowest bridge road)
MED = 7             # samples in the running median the outliers are judged against
OUTLIER = 0.3       # m off the fit: dropped
MIN_KEEP = 0.6      # share of the samples the final fit must keep
MAX_RMS = 0.12      # m: the kept samples' rms off the fit


class Raster:
    def __init__(self, src: Path):
        self.ds = [rasterio.open(f) for f in sorted(src.rglob("*.tif"))]
        self.cache = {}

    def at(self, e, n):
        for i, ds in enumerate(self.ds):
            b = ds.bounds
            if b.left <= e < b.right and b.bottom < n <= b.top:
                if i not in self.cache:
                    a = ds.read(1).astype("float64")
                    a[a < -1000] = np.nan
                    self.cache[i] = a
                r, c = ds.index(e, n)
                a = self.cache[i]
                return float(a[r, c]) if 0 <= r < a.shape[0] and 0 <= c < a.shape[1] else math.nan
        return math.nan


def bridge_lines():
    """{osm: (name, [[x, z], ...])}: the longest copy of every bridge way across the tiles"""
    out = {}
    for f in sorted((ROOT / "data" / "tiles").glob("*/roads.json")):
        doc = json.loads(f.read_text(encoding="utf-8"))
        nodes = {n["id"]: n for n in doc.get("nodes", [])}
        for r in doc.get("roads", []):
            m = r.get("meta") or {}
            br = m.get("bridge")
            if not br or br == "no" or not m.get("osm"):
                continue
            a, b = nodes.get(r["a"]), nodes.get(r["b"])
            if not a or not b:
                continue
            pts = [[a["x"], a["z"]]] + [[p["x"], p["z"]] for p in r.get("pts") or []] + [[b["x"], b["z"]]]
            L = sum(math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) for i in range(1, len(pts)))
            k = str(m["osm"])
            if k not in out or L > out[k][2]:
                out[k] = (m.get("name", ""), pts, L)
    return out


def walk(pts, step):
    """points every `step` m along the polyline: (x, z, tx, tz)"""
    seg = []
    for i in range(1, len(pts)):
        (ax, az), (bx, bz) = pts[i - 1], pts[i]
        l = math.hypot(bx - ax, bz - az)
        if l > 1e-6:
            seg.append((ax, az, (bx - ax) / l, (bz - az) / l, l))
    L = sum(s[4] for s in seg)
    n = max(1, int(round(L / step)))
    out = []
    for k in range(n + 1):
        s = L * k / n
        for ax, az, tx, tz, l in seg:
            if s <= l + 1e-9:
                out.append((ax + tx * s, az + tz * s, tx, tz))
                break
            s -= l
        else:
            ax, az, tx, tz, l = seg[-1]
            out.append((ax + tx * l, az + tz * l, tx, tz))
    return out


def profile(dsm: Raster, pts):
    S = walk(pts, PROF)
    raw = []
    for x, z, tx, tz in S:
        v = []
        for o in np.arange(-CARR, CARR + 0.01, 0.5):
            for a in (-0.5, 0.0, 0.5):
                y = dsm.at(*local_to_l72(x + tz * o + tx * a, z - tx * o + tz * a))
                if math.isfinite(y):
                    v.append(y)
        raw.append(float(np.median(v)) if len(v) >= 6 else math.nan)
    raw = np.array(raw)
    n = len(raw)
    keep = np.isfinite(raw)
    if keep.sum() < max(4, n // 2):
        return None, {"n": n, "why": "no clean samples"}
    idx = np.arange(n)
    h = MED // 2
    for _ in range(6):
        y = np.interp(idx, idx[keep], raw[keep])
        med = np.array([np.median(y[max(0, i - h): i + h + 1]) for i in range(n)])
        nxt = np.isfinite(raw) & (np.abs(raw - med) <= OUTLIER)
        if nxt.sum() < 4 or (nxt == keep).all():
            break
        keep = nxt
    y = np.interp(idx, idx[keep], raw[keep])
    fit = np.array([np.mean(y[max(0, i - 1): i + 2]) for i in range(n)])        # a light 3-sample smoothing
    fit[0], fit[-1] = y[0], y[-1]
    rms = float(np.sqrt(np.mean((raw[keep] - fit[keep]) ** 2)))
    info = {"n": n, "kept": round(float(keep.mean()), 2), "rms": round(rms, 3)}
    if keep.mean() < MIN_KEEP or rms > MAX_RMS:
        info["why"] = "not a clean deck surface"
        return None, info
    return [[round(S[i][0], 2), round(S[i][1], 2), round(float(fit[i]), 2)] for i in range(n)], info


def splice(doc_text: str, block: dict) -> str:
    """the overrides file with its "bridgeProfiles" key replaced / added after "bridgePlans" (one line per bridge)"""
    lines = ['  "bridgeProfiles": {']
    items = list(block.items())
    for i, (k, v) in enumerate(items):
        lines.append(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, separators=(", ", ": "))}' + ("," if i < len(items) - 1 else ""))
    lines.append("  },")
    new = "\n".join(lines) + "\n"
    old = re.search(r'^  "bridgeProfiles": \{\n(?:    .*\n)*  \},\n', doc_text, re.M)
    if old:
        return doc_text[: old.start()] + new + doc_text[old.end():]
    at = re.search(r'^  "buildingLooks": \{', doc_text, re.M)
    return doc_text[: at.start()] + new + doc_text[at.start():]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    dsm = Raster(Path(a.raw) / "urbis" / "dsm")
    block = {"_doc": "OSM road bridges' measured top along the centre line (tools/bridges/deckProfiles.py, rule deck-profile-measured): [x, z, y, ...] every 2 m, m TAW. viewer/streets/bridgeDecks.js bridgeDescriptors draws the deck's profile through it (?bridgeprof=old: the straight line between the ends' ground)."}
    for k, (name, pts, L) in sorted(bridge_lines().items()):
        line, info = profile(dsm, pts)
        print(f"{k:>11} {name[:40]:40} {L:6.1f} m  {json.dumps(info)}")
        if line is None:
            continue
        block[k] = {"name": name, "source": "UrbIS DSM 2021 0.5 m, median over the carriageway, outliers off the running median dropped", "line": [v for p in line for v in p]}
    if a.dry:
        return
    f = ROOT / "data" / "overrides.json"
    t = f.read_text(encoding="utf-8")
    t2 = splice(t, block)
    json.loads(t2)
    f.write_text(t2, encoding="utf-8", newline="\n")
    print(f"wrote {len(block) - 1} profiles -> {f}")


if __name__ == "__main__":
    main()
