"""Fetch the CC0 texture scans the material library compares against (viewer/materials/, labs/material-lab.html).

Sources (both CC0, no attribution required; credited anyway in CREDITS.md):
  Poly Haven  https://polyhaven.com  (API: api.polyhaven.com/files/<id>, 2k JPG: diffuse, nor_gl, rough, ao)
  ambientCG   https://ambientcg.com  (2K-JPG zip: Color, NormalGL, Roughness, AmbientOcclusion if any)

Raw files go to data/raw/textures/<source>/<id>/ (git-ignored). They are treated as untrusted DATA: nothing in them is
executed; zip members are extracted by base name only (no paths), images only. Process them with
tools/textures/process_textures.py.

    python tools/textures/fetch_textures.py            # all
    python tools/textures/fetch_textures.py red_brick  # one
"""
import io
import json
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "data", "raw", "textures")

# library material -> (source, asset id, real-world size of one texture repeat in metres)
SCANS = {
    "brick_red_brussels": ("polyhaven", "red_brick", 1.4),
    "stone_white": ("polyhaven", "sandstone_blocks_08", 3.0),
    "stone_blue": ("polyhaven", "granite_tile_04", 2.0),
    "slate": ("polyhaven", "roof_slates_02", 3.0),
    "cobbles": ("polyhaven", "cobblestone_floor_08", 2.0),
    "asphalt": ("polyhaven", "asphalt_02", 3.0),
    "paving_concrete": ("polyhaven", "concrete_tiles", 1.9),
    "copper_patina": ("ambientcg", "Metal058C", 2.0),
}
PH_MAPS = {"Diffuse": "albedo", "nor_gl": "normal", "Rough": "rough", "AO": "ao"}
ACG_MAPS = {"_Color": "albedo", "_NormalGL": "normal", "_Roughness": "rough", "_AmbientOcclusion": "ao"}
UA = {"User-Agent": "uccle-city-texture-fetch/1.0 (CC0 scans for a 3D city)"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def fetch_polyhaven(aid, out):
    files = json.loads(get(f"https://api.polyhaven.com/files/{aid}").decode("utf8"))
    for key, role in PH_MAPS.items():
        if key not in files:
            print(f"  {aid}: no {key}")
            continue
        url = files[key]["2k"]["jpg"]["url"]
        dst = os.path.join(out, f"{role}.jpg")
        if not os.path.exists(dst):
            open(dst, "wb").write(get(url))
        print(f"  {aid}: {role} <- {url}")


def fetch_ambientcg(aid, out):
    url = f"https://ambientcg.com/get?file={aid}_2K-JPG.zip"
    z = zipfile.ZipFile(io.BytesIO(get(url)))
    for name in z.namelist():
        base = os.path.basename(name)                    # never trust member paths
        if not base.lower().endswith(".jpg"):
            continue
        for key, role in ACG_MAPS.items():
            if key in base:
                open(os.path.join(out, f"{role}.jpg"), "wb").write(z.read(name))
                print(f"  {aid}: {role} <- {base}")
    print(f"  {aid}: from {url}")


def main():
    only = set(sys.argv[1:])
    for mat, (src, aid, size) in SCANS.items():
        if only and aid not in only and mat not in only:
            continue
        out = os.path.join(RAW, src, aid)
        os.makedirs(out, exist_ok=True)
        print(f"{mat}: {src}/{aid} ({size} m per repeat)")
        (fetch_polyhaven if src == "polyhaven" else fetch_ambientcg)(aid, out)
        json.dump({"material": mat, "source": src, "id": aid, "size_m": size, "licence": "CC0"},
                  open(os.path.join(out, "meta.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
