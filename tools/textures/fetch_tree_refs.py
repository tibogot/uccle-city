"""Reference photos (Wikimedia Commons, free licences) for the tree textures lab's side-by-sides (docs/trees/textures/).

Downloads a 1280 px rendition of each file and its author / licence (extmetadata) to data/raw/refs/trees/textures/
(git-ignored; untrusted data, only read as images). The composites credit each photo on the image.

    python -I tools/textures/fetch_tree_refs.py
"""
import json
import os
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "data", "raw", "refs", "trees", "textures")
UA = {"User-Agent": "uccle-city-refs/1.0 (reference photos for a 3D city; contact via the repo)"}
FILES = {
    "plane_bark": "File:Siemianowice Platanus × hispanica bark.jpg",
    "plane_leaves": "File:Platanus acerifolia leaves (1).jpg",
    "plane_tree": "File:Platanus acerifolia trees (1).jpg",
    "beech_bark": "File:Fagus sylvatica (bark)1.JPG",
    "beech_trunk": "File:Fagus sylvatica trunk TK 2022-04-30 2.jpg",
    "beech_leaves": "File:Backlit beech leaves. (51702142935).jpg",
    "beech_tree": "File:Fagus sylvatica TK 2021-05-22 1.jpg",
}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    for key, title in FILES.items():
        q = urllib.parse.urlencode({"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata",
                                    "iiurlwidth": 1280, "format": "json"})
        d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + q))
        page = next(iter(d["query"]["pages"].values()))
        if "imageinfo" not in page:
            print(key, "not found:", title)
            continue
        ii = page["imageinfo"][0]
        em = ii.get("extmetadata", {})
        val = lambda k: (em.get(k, {}).get("value") or "").strip()
        import re
        artist = re.sub(r"<[^>]+>", "", val("Artist")).strip()
        lic = val("LicenseShortName")
        open(os.path.join(OUT, key + ".jpg"), "wb").write(get(ii["thumburl"]))
        meta[key] = {"title": title, "page": ii["descriptionurl"], "artist": artist, "licence": lic}
        print(key, "|", artist, "|", lic)
    json.dump(meta, open(os.path.join(OUT, "SOURCES.json"), "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
