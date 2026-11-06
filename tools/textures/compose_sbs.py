"""Side-by-side for docs/trees/textures/: a reference photo (Wikimedia Commons, credited on the image) next to a tree
textures lab screenshot (A | B | C split screen).

    python -E -P tools/textures/compose_sbs.py <photo.jpg> <lab.png> <out.jpg> "<photo credit>" "<lab caption>"
"""
import sys

from PIL import Image, ImageDraw, ImageFont


def main():
    photo, lab, out, credit, caption = sys.argv[1:6]
    L = Image.open(lab).convert("RGB")
    H = L.height
    P = Image.open(photo).convert("RGB")
    # the photo cropped to a portrait slot as tall as the screenshot, about one lab slot wide
    w = int(H * 0.72)
    k = max(w / P.width, H / P.height)
    P = P.resize((int(P.width * k + 0.5), int(P.height * k + 0.5)), Image.LANCZOS)
    x0, y0 = (P.width - w) // 2, (P.height - H) // 2
    P = P.crop((x0, y0, x0 + w, y0 + H))
    bar = 28
    W = Image.new("RGB", (w + 6 + L.width, H + bar), (22, 24, 28))
    W.paste(P, (0, 0))
    W.paste(L, (w + 6, 0))
    d = ImageDraw.Draw(W)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 15)
    except OSError:
        f = ImageFont.load_default()
    d.text((8, H + 5), f"Photo: {credit} (Wikimedia Commons)", fill=(225, 228, 232), font=f)
    d.text((w + 14, H + 5), caption, fill=(225, 228, 232), font=f)
    W.save(out, quality=86)


if __name__ == "__main__":
    main()
