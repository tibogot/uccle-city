"""THE VILLA'S FABRIC ARRAY (claude/villa3, docs/VILLA_V3_PLAN.md): CC0 Poly Haven scans (models/villa/LICENCES.md)
-> one KTX2 2D array, a layer per fabric, every texel  R = the albedo's luminance detail (mean 0.5: the colour stays
the slot's TSL tint, no colour baked), G = the scan's AO (cavities), B / A = the OpenGL normal's x / y. Linear (not
sRGB), Basis UASTC + RDO + Zstandard, mipmapped (the KTX-Software CLI). The interior's `props` material samples it.
  python tools/villa/fabrics_ktx2.py <src dir: <id>/<id>_{diff,ao,nor_gl}_1k.jpg> [size=1024]
Writes models/villa/fabrics.ktx2 (+ fabrics.json: the layer order and each scan's real size in metres)."""
import sys, os, json, subprocess
from PIL import Image, ImageOps
import numpy as np
SRC = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "models", "villa")
# layer: (Poly Haven id, the scan's tile size in metres from its API "dimensions" (mm)), in the shader's order
LAYERS = [("rough_linen", 0.271), ("knitted_fleece", 0.268), ("terlenka", 0.266), ("leather_white", 0.300)]
work = os.path.join(SRC, "_work"); os.makedirs(work, exist_ok=True)
files = []
for k, (pid, _) in enumerate(LAYERS):
    ld = lambda m: Image.open(os.path.join(SRC, pid, f"{pid}_{m}_1k.jpg")).resize((N, N), Image.LANCZOS)
    diff = np.asarray(ld("diff").convert("RGB"), dtype=np.float32) / 255.0
    lum = diff @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    lum = np.clip(0.5 * lum / max(lum.mean(), 1e-3), 0, 1)          # mean 0.5 (x2 in the shader = mean 1)
    ao = np.asarray(ld("ao").convert("L"), dtype=np.float32) / 255.0
    nor = np.asarray(ld("nor_gl").convert("RGB"), dtype=np.float32) / 255.0
    rgba = np.stack([lum, ao, nor[..., 0], nor[..., 1]], -1)
    p = os.path.join(work, f"{k:02d}.png"); Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA").save(p); files.append(p)
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
out = os.path.join(OUT, "fabrics.ktx2")
subprocess.run([KTX, "create", "--format", "R8G8B8A8_UNORM", "--assign-tf", "linear", "--layers", str(len(files)), "--encode", "uastc", "--uastc-quality", "2",
                "--uastc-rdo", "--uastc-rdo-l", os.environ.get("RDO", "2.0"), "--zstd", "18", "--generate-mipmap", *files, out], check=True)
json.dump({"about": "tools/villa/fabrics_ktx2.py: CC0 Poly Haven fabric scans (models/villa/LICENCES.md)", "size": N,
           "layers": [{"id": pid, "tile_m": t} for pid, t in LAYERS]}, open(os.path.join(OUT, "fabrics.json"), "w"), indent=1)
print(out, os.path.getsize(out) // 1024, "KB")
