"""textures/shops/interiors.png -> textures/shops/_work/interiors.rgba (+ .json) for tools/shops/encode_interiors.mjs"""
import json, os
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
im = Image.open(os.path.join(ROOT, "textures", "shops", "interiors.png")).convert("RGBA")
out = os.path.join(ROOT, "textures", "shops", "_work", "interiors.rgba")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "wb").write(im.tobytes())
json.dump({"width": im.width, "height": im.height}, open(out + ".json", "w"))
print(out, im.size)
