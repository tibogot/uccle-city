"""Fetch the CC0 bark scans and leaf atlases the tree textures lab compares (labs/tree-textures-lab.html).

Sources (both CC0; credited anyway in CREDITS.md):
  Poly Haven  https://polyhaven.com  (API api.polyhaven.com/files/<id>: 2k JPG diffuse, nor_gl, rough, ao)
  ambientCG   https://ambientcg.com  (<id>_2K-JPG.zip / _1K-PNG.zip: Color, NormalGL, Roughness, Opacity, ...)

Raw files go to data/raw/textures/trees/<source>/<id>/ (git-ignored). They are untrusted DATA: nothing in them is
executed; zip members are extracted by base name only (no paths), images only. Process them with
tools/textures/process_tree_textures.py.

    python -I tools/textures/fetch_tree_textures.py            # all
    python -I tools/textures/fetch_tree_textures.py Bark004    # some
"""
import io
import json
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "data", "raw", "textures", "trees")

# (source, asset id, kind, what for)
ASSETS = [
    ("polyhaven", "bark_platanus", "bark", "plane (London plane) bark"),
    ("polyhaven", "japanese_zelkova_bark", "bark", "beech candidate (smooth grey)"),
    ("polyhaven", "trident_maple_bark", "bark", "beech candidate (smooth grey)"),
    ("polyhaven", "chinese_hackberry_bark", "bark", "beech candidate (smooth grey)"),
    ("ambientcg", "Bark004", "bark", "beech candidate (smooth, light)"),
    ("ambientcg", "Bark005", "bark", "beech candidate (smooth, light)"),
    ("ambientcg", "Bark009", "bark", "beech candidate (smooth)"),
    ("ambientcg", "Bark011", "bark", "beech candidate (grey, moss)"),
    ("ambientcg", "LeafSet027", "leaves", "maple leaf set (palmate: plane candidate)"),
    ("ambientcg", "LeafSet024", "leaves", "leaf set"),
    ("ambientcg", "LeafSet023", "leaves", "leaf set"),
    ("ambientcg", "LeafSet022", "leaves", "leaf set"),
    ("ambientcg", "LeafSet018", "leaves", "leaf set"),
    ("ambientcg", "LeafSet016", "leaves", "oak leaf set"),
    ("ambientcg", "LeafSet014", "leaves", "leaf set"),
    ("ambientcg", "LeafSet013", "leaves", "leaf set"),
    ("ambientcg", "LeafSet010", "leaves", "leaf set"),
    ("ambientcg", "LeafSet009", "leaves", "leaf set"),
    ("ambientcg", "LeafSet005", "leaves", "leaf set (branch)"),
    ("ambientcg", "LeafSet004", "leaves", "leaf set"),
    ("ambientcg", "LeafSet003", "leaves", "leaf set"),
    ("ambientcg", "LeafSet002", "leaves", "leaf set"),
    ("ambientcg", "LeafSet001", "leaves", "leaf set"),
]
PH_MAPS = {"Diffuse": "albedo", "nor_gl": "normal", "Rough": "rough", "AO": "ao"}
ACG_MAPS = {"_Color": "albedo", "_NormalGL": "normal", "_Roughness": "rough", "_AmbientOcclusion": "ao",
            "_Opacity": "opacity", "_Translucency": "translucency", "_Displacement": "height"}
UA = {"User-Agent": "uccle-city-texture-fetch/1.0 (CC0 scans for a 3D city)"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
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
    return f"https://polyhaven.com/a/{aid}"


def fetch_ambientcg(aid, out, kind):
    # leaf atlases: PNG (the opacity must be lossless); bark: JPG
    fmt = "2K-PNG" if kind == "leaves" else "2K-JPG"
    url = f"https://ambientcg.com/get?file={aid}_{fmt}.zip"
    z = zipfile.ZipFile(io.BytesIO(get(url)))
    for name in z.namelist():
        base = os.path.basename(name)                    # never trust member paths
        ext = os.path.splitext(base)[1].lower()
        if ext not in (".jpg", ".png"):
            continue
        for key, role in ACG_MAPS.items():
            if key in base:
                open(os.path.join(out, f"{role}{ext}"), "wb").write(z.read(name))
                print(f"  {aid}: {role} <- {base}")
    return f"https://ambientcg.com/view?id={aid}"


def main():
    only = set(sys.argv[1:])
    for src, aid, kind, what in ASSETS:
        if only and aid not in only:
            continue
        out = os.path.join(RAW, src, aid)
        os.makedirs(out, exist_ok=True)
        print(f"{src}/{aid} ({kind}: {what})")
        page = fetch_polyhaven(aid, out) if src == "polyhaven" else fetch_ambientcg(aid, out, kind)
        json.dump({"source": src, "id": aid, "kind": kind, "what": what, "licence": "CC0", "url": page},
                  open(os.path.join(out, "meta.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
