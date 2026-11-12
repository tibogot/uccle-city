"""Round 2: before | after pairs of the spot close-ups and lane images (docs/roads/round2/{before,after}/<name>.jpg)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(sys.argv[1]); out = root / "pairs"; out.mkdir(exist_ok=True)
for p in sorted((root / "after").glob("*.jpg")):
    b = root / "before" / p.name
    if not b.exists() or p.name.startswith("j") and ("_plan" in p.name or "_close" in p.name or "_street" in p.name or "_oblique" in p.name): continue
    A, B = [Image.open(q).convert("RGB") for q in (b, p)]
    w = 700; A = A.resize((w, int(A.size[1] * w / A.size[0]))); B = B.resize((w, int(B.size[1] * w / B.size[0])))
    sh = Image.new("RGB", (2 * w + 8, A.size[1] + 22), (24, 26, 30)); d = ImageDraw.Draw(sh)
    sh.paste(A, (0, 22)); sh.paste(B, (w + 8, 22))
    d.text((6, 5), f"{p.stem}: before (6c70e37)", fill=(230, 233, 238)); d.text((w + 14, 5), f"{p.stem}: after (round 2)", fill=(230, 233, 238))
    sh.save(out / f"{p.stem}_before_after.jpg", quality=86); print(out / f"{p.stem}_before_after.jpg")
