"""TIMBER POST-AND-RAIL FENCES (claude/reality1 round 3, class C4 leftover; rule timber-fence).

Reality round 2026-11-26: station and park edges in Uccle have low wooden post-and-rail fences (Calevoet, Rue Egide Van
Ophem; park lawns); the garden kit has no wooden piece, so OSM wooden fences became hedges or brick walls. This writes
their PLAN from OpenStreetMap (barrier=fence + fence_type wood / split_rail / post_and_rail / pole / rail, or
material=wood with no other fence_type; paling = picket fences are not this piece):

  data/fences/timber.json  { runs: [{ id: "osm:w<id>", h, pts: [[x, z]...], posts: [[x, z, tile]...] }] }
    posts every <= 2.4 m along each run (both ends included, at every corner > 20 deg), each with its tile; the viewer
    (viewer/fences/timberFence.js) seats them on the drawn ground and draws two rails between neighbours
  data/fences/src/osm_fences.json  the trimmed source (ODbL: OpenStreetMap contributors)

  python tools/fences/build_timber.py [--fetch]
"""
import json, math, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
from common import L72_PROJ4, ORIGIN_E, ORIGIN_N, tile_of_point  # noqa: E402
from pyproj import Transformer  # noqa: E402

SRC = ROOT / "data" / "fences" / "src" / "osm_fences.json"
OUT = ROOT / "data" / "fences" / "timber.json"
BBOX = (50.7613, 4.3081, 50.8193, 4.4163)
TIMBER = {"wood", "split_rail", "post_and_rail", "pole", "rail"}
STEP = 2.4


def fetch():
    s, w, n, e = BBOX
    q = f"[out:json][timeout:120];(way[barrier=fence]({s},{w},{n},{e}););out tags geom;"
    d = json.load(urllib.request.urlopen(urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": "osm-research-client/1.0"}), timeout=300))
    rows = [{"id": el["id"], "tags": {k: el["tags"][k] for k in ("barrier", "fence_type", "material", "height") if k in el.get("tags", {})},
             "geom": [[round(p["lat"], 7), round(p["lon"], 7)] for p in el.get("geometry", [])]} for el in d["elements"] if el["type"] == "way"]
    SRC.parent.mkdir(parents=True, exist_ok=True)
    SRC.write_text(json.dumps({"source": "OpenStreetMap contributors (ODbL), Overpass", "rows": rows}), encoding="utf8")


def tile_of(x, z):
    """the built tile of a point, or None (a fence past the city's tiles: Watermael, Linkebeek...)"""
    t = tile_of_point(x, z)
    return t if t and (ROOT / "data" / "tiles" / t / "terrain.json").exists() else None


def main():
    if "--fetch" in sys.argv or not SRC.exists():
        fetch()
    rows = json.loads(SRC.read_text(encoding="utf8"))["rows"]
    tf = Transformer.from_crs("EPSG:4326", L72_PROJ4, always_xy=True)
    runs, outside = [], []
    for r in rows:
        t = r["tags"]
        ft, mat = t.get("fence_type", ""), t.get("material", "")
        if not (ft in TIMBER or (mat == "wood" and ft == "")):
            continue
        pts = []
        for la, lo in r["geom"]:
            e, n = tf.transform(lo, la)
            pts.append((round(e - ORIGIN_E, 2), round(ORIGIN_N - n, 2)))
        if len(pts) < 2:
            continue
        try:
            h = float(str(t.get("height", "")).replace("m", "")) if t.get("height") else 1.0
        except ValueError:
            h = 1.0
        h = max(0.8, min(1.5, h))
        posts = [pts[0]]
        for k in range(1, len(pts)):
            (ax, az), (bx, bz) = pts[k - 1], pts[k]
            L = math.hypot(bx - ax, bz - az)
            n = max(1, math.ceil(L / STEP))
            for i in range(1, n + 1):
                posts.append((ax + (bx - ax) * i / n, az + (bz - az) * i / n))
        ps = [[round(x, 2), round(z, 2), tile_of(x, z)] for x, z in posts]
        if not any(p[2] for p in ps):
            outside.append(f"osm:w{r['id']}")
            continue
        runs.append({"id": f"osm:w{r['id']}", "h": round(h, 2), "pts": [list(p) for p in pts], "posts": ps})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"_doc": "claude/reality1 rule timber-fence: tools/fences/build_timber.py from OpenStreetMap (ODbL); do not edit",
                               "rail": [0.42, 0.86], "post": [0.12, 0.45], "outside": outside, "runs": runs}, separators=(",", ":")), encoding="utf8")
    print(f"{len(runs)} timber runs, {sum(len(r['posts']) for r in runs)} posts, {sum(math.hypot(r['pts'][k][0]-r['pts'][k-1][0], r['pts'][k][1]-r['pts'][k-1][1]) for r in runs for k in range(1, len(r['pts']))):.0f} m")


if __name__ == "__main__":
    main()
