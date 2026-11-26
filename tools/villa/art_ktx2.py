"""THE VILLA'S SCULPTURES' TEXTURES (claude/villa3 job 4, rule villa-licences): the CC0 Poly Haven scans' own maps
(data/raw/villa_sculptures/<id>/textures, never modified in place: read, resized, re-packed here) -> two KTX2 2D arrays,
one layer per statue (the layer = the statue's face code in villa.py):
    models/villa/art_col.ktx2   sRGB  RGB = the scan's diffuse, A = its AO (1 where the scan has none)
    models/villa/art_dat.ktx2   linear  R / G = the OpenGL normal's x / y, B = roughness, A = metalness
    python tools/villa/art_ktx2.py [size=512]"""
import sys, os, subprocess
import numpy as np
from PIL import Image
N = int(sys.argv[1]) if len(sys.argv) > 1 else 512
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "data", "raw", "villa_sculptures")
WORK = os.path.join(ROOT, "models", "villa", "_art"); os.makedirs(WORK, exist_ok=True)
ART = ["marble_bust_01", "horse_statue_01", "bronze_whale_statue"]          # (the layer order = villa_art.py ART)
def img(pid, m, mode):
    p = os.path.join(SRC, pid, "textures", f"{pid}_{m}_1k.jpg")
    return np.asarray(Image.open(p).convert(mode).resize((N, N), Image.LANCZOS), dtype=np.float32) / 255.0 if os.path.exists(p) else None
cols, dats = [], []
for k, pid in enumerate(ART):
    diff = img(pid, "diff", "RGB"); nor = img(pid, "nor_gl", "RGB"); arm = img(pid, "arm", "RGB"); rough = img(pid, "rough", "L")
    ao = arm[..., 0] if arm is not None else np.ones((N, N), np.float32)
    rg = arm[..., 1] if arm is not None else (rough if rough is not None else np.full((N, N), 0.5, np.float32))
    mt = arm[..., 2] if arm is not None else np.zeros((N, N), np.float32)
    c = np.dstack([diff, ao]); d = np.dstack([nor[..., 0], nor[..., 1], rg, mt])
    for arr, lst, tag in ((c, cols, "col"), (d, dats, "dat")):
        p = os.path.join(WORK, f"{tag}{k}.png"); Image.fromarray((arr * 255 + 0.5).astype(np.uint8), "RGBA").save(p); lst.append(p)
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
for files, name, fmt, tf in ((cols, "art_col.ktx2", "R8G8B8A8_SRGB", "srgb"), (dats, "art_dat.ktx2", "R8G8B8A8_UNORM", "linear")):
    out = os.path.join(ROOT, "models", "villa", name)
    subprocess.run([KTX, "create", "--format", fmt, "--assign-tf", tf, "--layers", str(len(files)), "--encode", "uastc", "--uastc-quality", "2",
                    "--uastc-rdo", "--uastc-rdo-l", "4.0", "--zstd", "18", "--generate-mipmap", *files, out], check=True)
    print(out, os.path.getsize(out) // 1024, "KB")
