"""Round 2 sheets: per junction a 2 x 2 sheet of the lab captures (photo, ours, oblique, street), optionally two tags
side by side (before | after) for one view.

    python tools/road_audit/compose2.py sheet <dir>/<tag> <out_dir>              # j<N>_{close_photo,close,oblique,street}.jpg
    python tools/road_audit/compose2.py pair <dirA> <dirB> <view> <out_dir> [labelA labelB]   # before | after of one view
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

def cell(p, w=640):
    im = Image.open(p).convert("RGB")
    return im.resize((w, int(im.size[1] * w / im.size[0])))

mode = sys.argv[1]
if mode == "sheet":
    src, out = Path(sys.argv[2]), Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
    for n in range(1, 11):
        views = [("close_photo", "orthophoto 2024"), ("close", "ours (plan, same camera)"), ("oblique", "oblique"), ("street", "street level")]
        ps = [src / f"j{n}_{v}.jpg" for v, _ in views]
        if not all(p.exists() for p in ps): continue
        ims = [cell(p) for p in ps]; h = ims[0].size[1]
        sh = Image.new("RGB", (1288, 2 * (h + 22)), (24, 26, 30)); d = ImageDraw.Draw(sh)
        for k, (im, (_, lab)) in enumerate(zip(ims, views)):
            x, y = (k % 2) * 648, (k // 2) * (h + 22)
            sh.paste(im, (x, y + 22)); d.text((x + 6, y + 5), f"{n}. {lab} [{src.name}]", fill=(230, 233, 238))
        sh.save(out / f"j{n:02d}_{src.name}.jpg", quality=86); print(out / f"j{n:02d}_{src.name}.jpg")
else:
    a, b, view, out = Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], Path(sys.argv[5]); out.mkdir(parents=True, exist_ok=True)
    la, lb = (sys.argv[6], sys.argv[7]) if len(sys.argv) > 7 else (a.name, b.name)
    for n in range(1, 11):
        pa, pb = a / f"j{n}_{view}.jpg", b / f"j{n}_{view}.jpg"
        if not (pa.exists() and pb.exists()): continue
        A, B = cell(pa), cell(pb); h = A.size[1]
        sh = Image.new("RGB", (1288, h + 22), (24, 26, 30)); d = ImageDraw.Draw(sh)
        sh.paste(A, (0, 22)); sh.paste(B, (648, 22))
        d.text((6, 5), f"{n}. {view}: {la}", fill=(230, 233, 238)); d.text((654, 5), f"{n}. {view}: {lb}", fill=(230, 233, 238))
        sh.save(out / f"j{n:02d}_{view}_{la}_{lb}.jpg", quality=86); print(out / f"j{n:02d}_{view}_{la}_{lb}.jpg")
