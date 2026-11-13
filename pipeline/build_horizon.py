"""The horizon ring: a coarse real landscape round Uccle (32 x 32 km) -> data/horizon/ (viewer/horizon.js, ?horizon=1).

Beyond the streamed tiles the viewer used to show the sky's flat floor (lighting.js groundAlbedo). This builds, from
open data only:

  heights  a 20 m grid (1601 x 1601, local x -15240..16760, z -15000..17000):
           - DHMV II DTM 1 m (Digitaal Vlaanderen WCS; covers Flanders AND Brussels), fetched at 10 m and tent-filtered
             to 20 m (no aliasing of 1 m ditches),
           - Wallonia (no DHMV) from the Copernicus DEM GLO-30 (a DSM: forests and buildings in it; EGM2008 heights),
             read as a cloud-optimised GeoTIFF over HTTP (only the blocks needed), shifted to TAW by the median
             difference with DHMV over open ground in the overlap, faded into the DHMV values over FEATHER m.
  colour   two orthophoto mosaics (JPEG): outer = the whole square at 2048 px (15.6 m/px), inner = the tile grid + 1 km
           at 5 m/px. Sources: Brussels UrbIS Ortho2024NS (summer, CC0), Flanders OMWRGB25VL (winter 2025; colour-matched
           to the Brussels summer photo on their overlap, per channel CDF), Wallonia SPW ORTHO_2021 (CC BY 4.0).

    python pipeline/build_horizon.py [--fetch]        (--fetch: download what data/raw/horizon/ lacks)

Raw downloads -> data/raw/horizon/ (not committed). Output: data/raw/horizon/heights.u16 (the mesh builder's input, not deployed), data/horizon/heights.json (grid, sources, offsets),
data/horizon/colour_outer.jpg, colour_inner.jpg. The mesh: tools/terrain/build_horizon_mesh.mjs (simplified) ->
data/horizon/horizon.bin.
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

from common import DATA, ORIGIN_E, ORIGIN_N, RAW, write_json

RAWH = RAW / "horizon"
OUT = DATA / "horizon"
# the grid (local metres, x east, z south): vertices at multiples of 20 m (tile edges are on it)
X0, Z0, SIZE, STEP = -15240.0, -15000.0, 32000.0, 20.0
N = int(SIZE / STEP) + 1
# inner colour box: the tile grid (x -3000..4500, z -2000..4000) + 1 km
INNER = (-4000.0, -3000.0, 5500.0, 5000.0)
INNER_PX = 5.0
OUTER_PX = 2048
BASE = -100.0          # m: stored height = (h - BASE) cm
FEATHER = 400.0         # m: GLO-30 -> DHMV fade at the Flemish / Walloon border

DHMV_WCS = "https://geo.api.vlaanderen.be/el-dtm/wcs"
GLO30 = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N50_00_E004_00_DEM/Copernicus_DSM_COG_10_N50_00_E004_00_DEM.tif"
WMS_BXL = ("https://geoservices-grid.irisnet.be/geoserver/urbisgrid/wms", "Ortho2024NS")
WMS_VL = ("https://geo.api.vlaanderen.be/OMW/wms", "OMWRGB25VL")
REST_WAL = "https://geoservices.wallonie.be/arcgis/rest/services/IMAGERIE/ORTHO_2021/MapServer/export"
UA = {"User-Agent": "uccle-city-pipeline/0.1"}


def l72_box(x0, z0, x1, z1):
    """local box -> L72 (E0, N0, E1, N1)."""
    return ORIGIN_E + x0, ORIGIN_N - z1, ORIGIN_E + x1, ORIGIN_N - z0


def http(url, expect, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
                ct, data = r.headers.get("Content-Type", ""), r.read()
            if expect not in ct:
                raise RuntimeError(f"{ct}: {data[:200]!r}")
            return data
        except Exception as e:  # noqa: BLE001
            print(f"  retry {k + 1}: {e}", file=sys.stderr)
            time.sleep(3 * (k + 1))
    raise SystemExit(f"failed: {url}")


# ------------------------------------------------------------------------------------------------ heights

def fetch_dhmv10():
    """DHMV at 10 m over the grid + 10 m, in 8 km chunks: data/raw/horizon/dhmv10_<i>_<j>.tif."""
    RAWH.mkdir(parents=True, exist_ok=True)
    C = 8000.0
    n = int(SIZE // C)
    for j in range(n):
        for i in range(n):
            f = RAWH / f"dhmv10_{i}_{j}.tif"
            if f.exists():
                continue
            # pixel centres on local multiples of 10 m; one extra pixel round each chunk
            x0, z0 = X0 + i * C - 10, Z0 + j * C - 10
            e0, n0, e1, n1 = l72_box(x0 - 5, z0 - 5, x0 + C + 20 + 5, z0 + C + 20 + 5)
            url = (f"{DHMV_WCS}?service=WCS&version=1.0.0&request=GetCoverage&coverage=EL.GridCoverage.DTM&format=GeoTIFF"
                   f"&crs=EPSG:31370&bbox={e0},{n0},{e1},{n1}&resx=10&resy=10&interpolation=bilinear")
            f.write_bytes(http(url, "tiff"))
            print(f"  {f.name}", file=sys.stderr)


def dhmv20():
    """The DHMV on the 20 m grid: a [1 2 1]^2 / 16 tent of the 10 m samples round each vertex. NaN = no DHMV."""
    import rasterio
    m10 = int(SIZE / 10) + 3                     # 10 m samples from X0 - 10 to X0 + SIZE + 10
    g10 = np.full((m10, m10), np.nan)
    for f in sorted(RAWH.glob("dhmv10_*.tif")):
        with rasterio.open(f) as ds:
            a = ds.read(1).astype(np.float64)
            a[a < -1000] = np.nan
            # this chunk's first pixel centre in local metres
            e_c, n_c = ds.transform.c + 5, ds.transform.f - 5
            x, z = e_c - ORIGIN_E, ORIGIN_N - n_c
            c0, r0 = int(round((x - (X0 - 10)) / 10)), int(round((z - (Z0 - 10)) / 10))
            h, w = a.shape
            rs, cs = max(0, -r0), max(0, -c0)
            re, ce = min(h, m10 - r0), min(w, m10 - c0)
            dst = g10[r0 + rs:r0 + re, c0 + cs:c0 + ce]
            src = a[rs:re, cs:ce]
            put = np.isnan(dst)
            dst[put] = src[put]
    # 20 m vertex k sits on 10 m sample 2k + 1
    k = np.array([1, 2, 1], float)
    acc = np.zeros((N, N))
    wsum = np.zeros((N, N))
    for dr in range(3):
        for dc in range(3):
            v = g10[dr:dr + 2 * N:2, dc:dc + 2 * N:2]
            w = k[dr] * k[dc] * (~np.isnan(v))
            acc += np.nan_to_num(v) * w
            wsum += w
    out = np.where(wsum >= 8, acc / np.maximum(wsum, 1e-9), np.nan)     # at least half the tent has data
    return out


def glo20():
    """Copernicus GLO-30 (EGM2008, a DSM) bilinearly resampled onto the 20 m grid (EPSG:31370)."""
    import rasterio
    from rasterio.crs import CRS
    from rasterio.transform import from_origin
    from rasterio.warp import Resampling, reproject
    cache = RAWH / "glo30_l72_20m.npy"
    if cache.exists():
        return np.load(cache)
    out = np.full((N, N), np.nan, dtype=np.float32)
    e_w, n_n = ORIGIN_E + X0, ORIGIN_N - Z0
    dst_t = from_origin(e_w - STEP / 2, n_n + STEP / 2, STEP, STEP)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open("/vsicurl/" + GLO30) as ds:
            # only the window round the ring (lat 50.6-51.0, lon 4.05-4.65)
            win = ds.window(4.05, 50.6, 4.65, 51.0)
            a = ds.read(1, window=win).astype(np.float32)
            t = ds.window_transform(win)
            reproject(a, out, src_transform=t, src_crs=ds.crs, dst_transform=dst_t, dst_crs=CRS.from_epsg(31370),
                      src_nodata=ds.nodata, dst_nodata=np.nan, resampling=Resampling.bilinear)
    RAWH.mkdir(parents=True, exist_ok=True)
    np.save(cache, out)
    return out


def merge_heights(d, g):
    from scipy.ndimage import distance_transform_edt, uniform_filter
    both = ~np.isnan(d) & ~np.isnan(g)
    diff = (g - d)[both]
    # open ground: the DSM within 1.5 m of the DTM's own neighbourhood (no canopy / roofs)
    flat = both & (np.abs(g - d) < 4)
    off = float(np.median((g - d)[flat]))
    st = {"overlapCells": int(both.sum()), "gloMinusDhmvMedianAll": round(float(np.median(diff)), 2),
          "gloMinusDhmvMedianOpen": round(off, 2), "openCells": int(flat.sum())}
    gc = g - off
    out = d.copy()
    need = np.isnan(d) & ~np.isnan(gc)
    if need.any():
        # fade the residual (DHMV - GLO) along the seam into Wallonia (smoothed over 5 cells)
        seam = both & (distance_transform_edt(~need) <= 3)
        res = np.where(seam, d - gc, 0.0)
        num, den = uniform_filter(res, 11), uniform_filter(seam.astype(float), 11)
        with np.errstate(invalid="ignore", divide="ignore"):
            rs = np.where(den > 0, num / den, 0)
        seed = seam & (den > 0)
        dist, (ri, ci) = distance_transform_edt(~seed, return_indices=True)
        corr = rs[ri, ci] * np.clip(1 - dist * STEP / FEATHER, 0, 1)
        out[need] = gc[need] + corr[need]
    st["gloFilledCells"] = int(need.sum())
    st["stillNoData"] = int(np.isnan(out).sum())
    if np.isnan(out).any():                       # nothing should be left; fill any pinhole from its neighbours
        _, (ri, ci) = distance_transform_edt(np.isnan(out), return_indices=True)
        out = out[ri, ci]
    return out, st


# ------------------------------------------------------------------------------------------------ colour

def wms(url, layer, box, w, h):
    e0, n0, e1, n1 = box
    q = (f"{url}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS={layer}&STYLES=&SRS=EPSG:31370"
         f"&BBOX={e0},{n0},{e1},{n1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/png&TRANSPARENT=TRUE")
    return np.asarray(Image.open(io.BytesIO(http(q, "image"))).convert("RGBA"))


def wal(box, w, h):
    e0, n0, e1, n1 = box
    q = (f"{REST_WAL}?bbox={e0},{n0},{e1},{n1}&bboxSR=31370&imageSR=31370&size={w},{h}&format=png32&transparent=true&f=image")
    return np.asarray(Image.open(io.BytesIO(http(q, "image"))).convert("RGBA"))


def fetch_mosaic(name, x0, z0, x1, z1, W, H, chunk=1024):
    """Three sources over the local box, chunked, cached as data/raw/horizon/<name>_<src>.png (RGBA)."""
    for src in ("bxl", "vl", "wal"):
        f = RAWH / f"{name}_{src}.png"
        if f.exists():
            continue
        img = np.zeros((H, W, 4), np.uint8)
        for r in range(0, H, chunk):
            for c in range(0, W, chunk):
                w, h = min(chunk, W - c), min(chunk, H - r)
                bx = (x0 + (x1 - x0) * c / W, z0 + (z1 - z0) * r / H, x0 + (x1 - x0) * (c + w) / W, z0 + (z1 - z0) * (r + h) / H)
                box = l72_box(*bx)
                a = (wms(*WMS_BXL, box, w, h) if src == "bxl" else wms(*WMS_VL, box, w, h) if src == "vl" else wal(box, w, h))
                img[r:r + h, c:c + w] = a
        Image.fromarray(img).save(f)
        print(f"  {f.name}", file=sys.stderr)


def match_cdf(src, ref, mask_s, mask_r):
    """Per channel LUT that maps src's distribution (on mask_s) onto ref's (on mask_r)."""
    out = src.copy()
    for ch in range(3):
        s = src[..., ch][mask_s]
        r = ref[..., ch][mask_r]
        qs = np.percentile(s, np.linspace(0, 100, 257))
        qr = np.percentile(r, np.linspace(0, 100, 257))
        out[..., ch] = np.interp(src[..., ch], qs, qr)
    return out


def apply_lut(a, lut):
    return np.stack([np.interp(a[..., c], lut[c][0], lut[c][1]) for c in range(3)], -1)


def composite(name, lut_from=None, wal_lut=None):
    bxl = np.asarray(Image.open(RAWH / f"{name}_bxl.png")).astype(np.float32)
    vl = np.asarray(Image.open(RAWH / f"{name}_vl.png")).astype(np.float32)
    wl = np.asarray(Image.open(RAWH / f"{name}_wal.png")).astype(np.float32)
    def ok(a):
        rgb = a[..., :3]
        return (a[..., 3] > 200) & ~((rgb > 250).all(-1)) & ~((rgb < 3).all(-1))
    mb, mv, mw = ok(bxl), ok(vl), ok(wl)
    st = {}
    # the Flemish winter photo, colour-matched to the Brussels summer photo where both exist
    both = mb & mv
    vlm = vl[..., :3]
    if lut_from is not None:
        vlm = apply_lut(vl, lut_from)
    elif both.sum() > 10000:
        vlm = match_cdf(vl[..., :3], bxl[..., :3], both, both)
        st["vlMatchedOn"] = int(both.sum())
    out = np.zeros(bxl.shape[:2] + (3,), np.float32)
    have = np.zeros(bxl.shape[:2], bool)
    wlm = apply_lut(wl, wal_lut) if wal_lut is not None else wl[..., :3]
    for m, a in ((mb, bxl[..., :3]), (mv, vlm), (mw, wlm)):
        put = m & ~have
        out[put] = a[put]
        have |= put
    st["coverage"] = round(float(have.mean()), 4)
    if not have.all():
        from scipy.ndimage import distance_transform_edt
        _, (ri, ci) = distance_transform_edt(~have, return_indices=True)
        out = out[ri, ci]
    return np.clip(out, 0, 255).astype(np.uint8), st


def vl_lut(name):
    """The Flemish -> Brussels LUT measured on one mosaic (the inner one: most overlap), reused for the other."""
    bxl = np.asarray(Image.open(RAWH / f"{name}_bxl.png")).astype(np.float32)
    vl = np.asarray(Image.open(RAWH / f"{name}_vl.png")).astype(np.float32)
    m = (bxl[..., 3] > 200) & (vl[..., 3] > 200) & ~((bxl[..., :3] > 250).all(-1)) & ~((vl[..., :3] > 250).all(-1))
    lut = []
    for ch in range(3):
        lut.append((np.percentile(vl[..., ch][m], np.linspace(0, 100, 257)), np.percentile(bxl[..., ch][m], np.linspace(0, 100, 257))))
    return lut


def wal_lut(name, vlut):
    """Wallonia's 2021 photo is paler: its distribution matched to the (matched) Flemish countryside of the same mosaic
    (the two do not overlap: both are the same farmland / woods / villages of Brabant)."""
    vl = np.asarray(Image.open(RAWH / f"{name}_vl.png")).astype(np.float32)
    bx = np.asarray(Image.open(RAWH / f"{name}_bxl.png")).astype(np.float32)
    wl = np.asarray(Image.open(RAWH / f"{name}_wal.png")).astype(np.float32)
    ok = lambda a: (a[..., 3] > 200) & ~((a[..., :3] > 250).all(-1)) & ~((a[..., :3] < 3).all(-1))
    mv = ok(vl) & ~ok(bx)
    mw = ok(wl) & ~mv & ~ok(bx)
    vlm = apply_lut(vl, vlut)
    lut = []
    for ch in range(3):
        lut.append((np.percentile(wl[..., ch][mw], np.linspace(0, 100, 257)), np.percentile(vlm[..., ch][mv], np.linspace(0, 100, 257))))
    return lut


# ------------------------------------------------------------------------------------------------ main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    ix0, iz0, ix1, iz1 = INNER
    iw, ih = int((ix1 - ix0) / INNER_PX), int((iz1 - iz0) / INNER_PX)
    if a.fetch:
        fetch_dhmv10()
        fetch_mosaic("inner", ix0, iz0, ix1, iz1, iw, ih)
        fetch_mosaic("outer", X0, Z0, X0 + SIZE, Z0 + SIZE, OUTER_PX, OUTER_PX)
    d = dhmv20()
    g = glo20()
    g = g.astype(np.float64)
    g[g < -200] = np.nan                        # GLO-30 voids (the -72 m pit near Rebecq is real: the Quenast quarries)
    h, st = merge_heights(d, g)
    print(f"heights: {json.dumps(st)}  range {h.min():.1f}..{h.max():.1f} m", file=sys.stderr)
    enc = np.clip(np.round((h - BASE) * 100), 0, 65534).astype("<u2")        # heights - BASE (the quarries go below 0 TAW)
    (RAWH / "heights.u16").write_bytes(enc.tobytes())          # build input of the mesh only: not deployed
    lut = vl_lut("inner")
    wlut = wal_lut("outer", lut)
    cin, sti = composite("inner", lut, wlut)
    cout, sto = composite("outer", lut, wlut)
    Image.fromarray(cin).save(OUT / "colour_inner.jpg", quality=80, optimize=True, progressive=True)
    Image.fromarray(cout).save(OUT / "colour_outer.jpg", quality=80, optimize=True, progressive=True)
    write_json(OUT / "heights.json", {
        "grid": {"x0": X0, "z0": Z0, "size": SIZE, "step": STEP, "cols": N, "rows": N, "encoding": "u16le-cm", "base": BASE},
        "inner": {"x0": ix0, "z0": iz0, "x1": ix1, "z1": iz1, "px": INNER_PX, "w": iw, "h": ih},
        "outer": {"x0": X0, "z0": Z0, "x1": X0 + SIZE, "z1": Z0 + SIZE, "w": OUTER_PX, "h": OUTER_PX},
        "heights": st, "colour": {"inner": sti, "outer": sto},
        "sources": {
            "dhmv": "Digitaal Hoogtemodel Vlaanderen II, DTM 1 m (Digitaal Vlaanderen, Modellicentie Gratis Hergebruik), WCS 10 m -> tent 20 m",
            "glo30": "Copernicus DEM GLO-30 (DSM, EGM2008; (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA)",
            "orthoBxl": "UrbIS Ortho2024NS (paradigm.brussels, CC0)",
            "orthoVl": "Orthofotomozaiek middenschalig winteropnamen 2025 OMWRGB25VL (Digitaal Vlaanderen), colour-matched",
            "orthoWal": "SPW Orthophotos 2021 (CC BY 4.0)"}}, indent=1)
    print(f"colour: inner {sti}, outer {sto}", file=sys.stderr)


if __name__ == "__main__":
    main()
