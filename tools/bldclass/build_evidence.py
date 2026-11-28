"""BUILDING-CLASS EVIDENCE (claude/reality1, class C1 of docs/REALITY_ROUND_2026-11-26.md; rule bldclass-evidence).

The classifier (viewer/buildingTypes.js classify) only saw form + a period draw, so 1,856 UrbIS solids were drawn as the
post-war balcony block, 194 of them under steep pitched roofs (Institut Montjoie: a neo-Gothic school with balconies).
This writes, per tile, what open data KNOWS about a solid, for classify to use before any draw:

  data/bldclass/<T>.json  { "<solid id>": { era: "pre" | "inter" | "post", year, inst, near, src } }
    era   pre < 1919, inter 1919-1945, post >= 1946 (the build year; or the inventory style when it dates the building:
          Brutalisme / Postmodernisme = post; Art nouveau, Beaux-Arts, Eclectisme, Neo-*, regionalist / picturesque /
          rural / traditionalist = old ("pre" unless a year says inter))
    inst  school | church | hospital | convent | civic: a building OSM tags so, or a large solid inside an OSM
          amenity=school / college / university / kindergarten / hospital / place_of_worship / monastery site
    near  old | new: no own date, but >= 3 dated inventory buildings within 40 m and >= 80 % of one era (the street /
          neighbour prior)
    src   inv:<id> (Brussels Irismonument inventory) / osm:w<id>

Sources (kept trimmed in data/bldclass/src/, facts only: positions, years, style / typology words; no photos, no texts):
  - urban.brussels, Inventaire du patrimoine architectural (Irismonument_inventory, WFS gis.urban.brussels), CC BY 4.0
  - OpenStreetMap contributors, ODbL (building / amenity / start_date tags, Overpass)

  python tools/bldclass/build_evidence.py [--fetch]      (--fetch: re-download both sources into data/bldclass/src/)
"""
import json, math, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
from common import L72_PROJ4, ORIGIN_E, ORIGIN_N  # noqa: E402
from pyproj import Transformer  # noqa: E402

SRC = ROOT / "data" / "bldclass" / "src"
OUT = ROOT / "data" / "bldclass"
BBOX = (50.7613, 4.3081, 50.8193, 4.4163)
UA = {"User-Agent": "osm-research-client/1.0"}

POST_STYLES = ("Brutalisme", "Postmodernisme", "Architecture contemporaine", "Fonctionnalisme")
OLD_STYLES = ("Art nouveau", "Beaux-Arts", "clectisme", "Néo", "régionaliste", "pittoresque", "rurale", "traditionaliste",
              "Néoclassicisme", "Classicisme", "Art Déco", "Cottage", "Renaissance", "Gothique", "roman")
HOUSE_TYPOS = ("maison bourgeoise", "maison d’habitation", "maison d'habitation", "maison ouvrière", "villa", "hôtel particulier", "maison d’architecte", "bungalow", "cité-jardin", "maison unifamiliale")
BIG_TYPOS = ("immeuble", "scolaire", "église", "chapelle", "couvent", "hôpital", "bureaux", "château", "institut", "clinique", "salle", "gare")
INST_BUILDING = {"school": "school", "college": "school", "university": "school", "kindergarten": "school",
                 "church": "church", "chapel": "church", "temple": "church", "cathedral": "church",
                 "hospital": "hospital", "convent": "convent", "monastery": "convent", "civic": "civic", "public": "civic"}
INST_AMENITY = {"school": "school", "college": "school", "university": "school", "kindergarten": "school",
                "hospital": "hospital", "place_of_worship": "church", "monastery": "convent", "nursing_home": "convent"}


def fetch():
    SRC.mkdir(parents=True, exist_ok=True)
    u = ("https://gis.urban.brussels/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
         "&typeNames=URBAN_DCH_IBH:Irismonument_inventory&outputFormat=application/json&srsName=EPSG:31370"
         "&CQL_FILTER=" + urllib.parse.quote("CITY='1180'"))
    inv = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=300))
    rows = []
    for f in inv["features"]:
        p, g = f["properties"], f.get("geometry") or {}
        if g.get("type") != "Point":
            continue
        rows.append({"id": p.get("ID_BATI_DMS"), "e": round(g["coordinates"][0], 2), "n": round(g["coordinates"][1], 2),
                     "year": p.get("BULT") or "", "style": p.get("STYLE_FR") or "", "typo": p.get("TYPO_FR") or ""})
    (SRC / "irismonument_uccle.json").write_text(json.dumps({"source": "urban.brussels Irismonument_inventory (CC BY 4.0), CITY=1180, facts only", "rows": rows}, ensure_ascii=False), encoding="utf8")
    s, w, n, e = BBOX
    q = (f'[out:json][timeout:120];(way[building][~"^(start_date|construction_date)$"~"."]({s},{w},{n},{e});'
         f'way[building~"^(school|college|university|kindergarten|church|chapel|temple|hospital|convent|monastery|civic|public|apartments)$"]({s},{w},{n},{e});'
         f'nwr[amenity~"^(school|kindergarten|college|university|hospital|nursing_home|place_of_worship|monastery)$"]({s},{w},{n},{e}););out tags geom;')
    osm = json.load(urllib.request.urlopen(urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode(), headers=UA), timeout=300))
    keep = []
    for el in osm["elements"]:
        t = el.get("tags", {})
        rings = []
        if el["type"] == "way" and el.get("geometry"):
            rings = [[[round(p["lat"], 7), round(p["lon"], 7)] for p in el["geometry"]]]
        elif el["type"] == "relation":
            rings = [[[round(p["lat"], 7), round(p["lon"], 7)] for p in m["geometry"]] for m in el.get("members", []) if m.get("role") == "outer" and m.get("geometry")]
        if not rings:
            continue
        keep.append({"id": f'{el["type"][0]}{el["id"]}', "tags": {k: t[k] for k in ("building", "amenity", "start_date", "construction_date", "name") if k in t}, "rings": rings})
    (SRC / "osm_buildings.json").write_text(json.dumps({"source": "OpenStreetMap contributors (ODbL), Overpass", "rows": keep}, ensure_ascii=False), encoding="utf8")
    print(f"fetched {len(rows)} inventory points, {len(keep)} OSM ways / relations")


def year_of(s):
    for tok in str(s).replace("-", " ").replace("/", " ").replace("s", " ").split():
        if tok.isdigit() and 1000 <= int(tok) <= 2030:
            return int(tok)
    return None


WALL_BRICK = ("clectisme", "Néo-Renaissance flamande", "Néo-gothique", "Néogothique", "Néo-roman", "Beaux-Arts", "Art nouveau", "régionaliste", "pittoresque", "rurale", "traditionaliste", "Cottage", "École d'Amsterdam")
WALL_STONE = ("Néoclassicisme", "Classicisme", "Néo-Renaissance", "Louis XVI")


def wall_of(style, typo="", year=None):
    """(round 3, Street View 2026-11-26) the facade material an inventory style dates: the eclectic / Beaux-Arts /
    Flemish neo-Renaissance / regionalist fronts of Uccle are red brick with white stone bands (Av. Churchill 4,
    Rue Alphonse Renard), the neoclassical ones a pale stone (Rue Edith Cavell 143); Art Deco / modernist stays the
    draw (white render or yellow brick); None = no word for it"""
    if any(k in style for k in WALL_BRICK) and not style.startswith("Néoclassicisme"): return "brick"
    if any(k in style for k in WALL_STONE): return "stone"
    # (claude/reality2) an interwar modernist BLOCK of flats is face brick in buff / yellow / beige tiles far more often
    # than white render in Uccle (Avenue Brugmann 304, 1938); the modernist villas and houses keep the draw
    if style.startswith(("Modernisme", "Art Déco")) and "appartements" in typo and year and 1919 <= year < 1946: return "buff"
    return None


def era_of(year, style):
    if year:
        return "pre" if year < 1919 else "inter" if year < 1946 else "post"
    if any(k in style for k in POST_STYLES):
        return "post"
    if any(k in style for k in OLD_STYLES):
        return "pre"
    return None


def inring(r, x, z):
    c = False
    j = len(r) - 1
    for i in range(len(r)):
        xi, zi = r[i]; xj, zj = r[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c


def seg_dist(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az
    L = dx * dx + dz * dz
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / L))
    return math.hypot(px - ax - t * dx, pz - az - t * dz)


def ring_dist(r, x, z):
    return min(seg_dist(x, z, *r[i - 1], *r[i]) for i in range(len(r)))


def area(r):
    return abs(sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r)))) / 2


def main():
    if "--fetch" in sys.argv:
        fetch()
    inv = json.loads((SRC / "irismonument_uccle.json").read_text(encoding="utf8"))["rows"]
    osm = json.loads((SRC / "osm_buildings.json").read_text(encoding="utf8"))["rows"]
    tf = Transformer.from_crs("EPSG:4326", L72_PROJ4, always_xy=True)

    def ll(r):
        out = []
        for la, lo in r:
            e, n = tf.transform(lo, la)
            out.append((e - ORIGIN_E, ORIGIN_N - n))
        return out

    pts = []
    for p in inv:
        y = year_of(p["year"])
        pts.append({"x": p["e"] - ORIGIN_E, "z": ORIGIN_N - p["n"], "year": y, "era": era_of(y, p["style"]), "style": p["style"],
                    "typo": p["typo"], "id": p["id"]})
    bld, sites = [], []
    for o in osm:
        t = o["tags"]
        rings = [ll(r) for r in o["rings"]]
        y = year_of(t.get("start_date") or t.get("construction_date") or "")
        if t.get("building") and t.get("building") != "yes" or y:
            bld.append({"rings": rings, "inst": INST_BUILDING.get(t.get("building")), "year": y, "id": o["id"], "apartments": t.get("building") == "apartments"})
        if t.get("amenity") in INST_AMENITY and o["id"][0] in "wr":
            sites.append({"rings": rings, "inst": INST_AMENITY[t["amenity"]], "id": o["id"]})
        if t.get("building") == "yes" and t.get("amenity") in INST_AMENITY:
            bld.append({"rings": rings, "inst": INST_AMENITY[t["amenity"]], "year": y, "id": o["id"], "apartments": False})

    tiles = sorted(p.name for p in (ROOT / "data" / "tiles").iterdir() if (p / "buildings.json").exists())
    OUT.mkdir(parents=True, exist_ok=True)
    tot = {"solids": 0, "era": 0, "inst": 0, "near": 0}
    for T in tiles:
        doc = json.loads((ROOT / "data" / "tiles" / T / "buildings.json").read_text(encoding="utf8"))
        x0 = min(min(q[0] for q in b["footprint"][0]) for b in doc["buildings"]) - 50 if doc["buildings"] else 0
        x1 = max(max(q[0] for q in b["footprint"][0]) for b in doc["buildings"]) + 50 if doc["buildings"] else 0
        z0 = min(min(q[1] for q in b["footprint"][0]) for b in doc["buildings"]) - 50 if doc["buildings"] else 0
        z1 = max(max(q[1] for q in b["footprint"][0]) for b in doc["buildings"]) + 50 if doc["buildings"] else 0
        P = [p for p in pts if x0 <= p["x"] <= x1 and z0 <= p["z"] <= z1]
        Bo = [o for o in bld if any(x0 <= x <= x1 and z0 <= z <= z1 for x, z in o["rings"][0][:1])]
        S = [s for s in sites if any(x0 <= x <= x1 and z0 <= z <= z1 for r in s["rings"] for x, z in r[::max(1, len(r) // 8)])]
        out = {}
        rings = [(b["id"].split("/")[-1], b["footprint"][0], b) for b in doc["buildings"]]
        # (claude/reality2) the solids with a shop front on them (data/streetlife/<T>.json: real shops + the fill)
        slf = ROOT / "data" / "streetlife" / f"{T}.json"
        shop_bu = {p["face"]["bu"] for p in json.loads(slf.read_text(encoding="utf8"))["pois"] if p.get("face") and p.get("kind") not in ("atm",)} if slf.exists() else set()
        # inventory point -> the solid containing it, else the nearest within 4 m (address points sit on the facade)
        own = {}
        for p in P:
            best, bd = None, 4.0
            for sid, r, b in rings:
                if abs(r[0][0] - p["x"]) > 120 or abs(r[0][1] - p["z"]) > 120:
                    continue
                if inring(r, p["x"], p["z"]):
                    best, bd = sid, -1
                    break
                d = ring_dist(r, p["x"], p["z"])
                if d < bd:
                    best, bd = sid, d
            if best:
                own.setdefault(best, []).append(p)
        for sid, r, b in rings:
            cx = sum(q[0] for q in r) / len(r); cz = sum(q[1] for q in r) / len(r)
            e = {}
            src = []
            ps = own.get(sid, [])
            # a house's record (maison bourgeoise / d'habitation / ouvriere, villa, hotel particulier) does not date a tall
            # or deep solid: its address point sits on the party wall of the block next door (Av. Churchill 123, a 9-storey
            # post-war block, took the Eclectic house beside it)
            hb = b.get("height") or 0
            if hb > 17 or area(r) > 450:
                ps = [p for p in ps if not any(k in p["typo"] for k in HOUSE_TYPOS)]
                # ... and only a record that says what it is (apartments, school, church, offices...) dates one: a bare
                # year on a 26 m solid was the house the block replaced (Av. Churchill 242: a 2010s balcony block
                # carrying a 1913 record)
                ps = [p for p in ps if any(k in p["typo"] for k in BIG_TYPOS)]
            dated = [p for p in ps if p["era"]]
            if dated:
                p = min(dated, key=lambda q: q["year"] or 9999)
                e["era"] = p["era"]
                if p["year"]:
                    e["year"] = p["year"]
                src.append(f'inv:{p["id"]}')
            wl = next((wall_of(p["style"], p["typo"], p["year"]) for p in ps if wall_of(p["style"], p["typo"], p["year"])), None)
            if wl:
                e["wall"] = wl
                if not src: src.append(f'inv:{next(p for p in ps if wall_of(p["style"], p["typo"], p["year"]))["id"]}')
            sch = [p for p in ps if "scolaire" in p["typo"]]
            if sch:
                e["inst"] = "school"
                if f'inv:{sch[0]["id"]}' not in src:
                    src.append(f'inv:{sch[0]["id"]}')
            for o in Bo:
                r0 = o["rings"][0]
                ox = sum(q[0] for q in r0) / len(r0); oz = sum(q[1] for q in r0) / len(r0)
                if inring(r0, cx, cz) or inring(r, ox, oz):
                    if o["inst"]:
                        e["inst"] = o["inst"]
                    if o["year"] and "era" not in e:
                        e["era"] = era_of(o["year"], ""); e["year"] = o["year"]
                    if o["apartments"] and "era" not in e:
                        e["apt"] = True
                    src.append(f'osm:{o["id"]}')
                    break
            h = b.get("height") or 0
            if "inst" not in e and area(r) >= 150 and h >= 8:
                for s in S:
                    if any(inring(sr, cx, cz) for sr in s["rings"]):
                        e["inst"] = s["inst"]; src.append(f'osm:{s["id"]}'); break
            if "era" not in e:
                near = [p for p in P if p["era"] and abs(p["x"] - cx) < 40 and abs(p["z"] - cz) < 40 and math.hypot(p["x"] - cx, p["z"] - cz) <= 40]
                if len(near) >= 3:
                    old = sum(1 for p in near if p["era"] in ("pre", "inter"))
                    if old >= 0.8 * len(near):
                        e["near"] = "old"
                    elif len(near) - old >= 0.8 * len(near):
                        e["near"] = "new"
            if (b.get("attrs") or {}).get("BU_ID") in shop_bu:
                e["shop"] = True
            if e:
                e["src"] = src
                out[sid] = e
                tot["era"] += "era" in e; tot["inst"] += "inst" in e; tot["near"] += "near" in e
        tot["solids"] += len(rings)
        (OUT / f"{T}.json").write_text(json.dumps({"_doc": "claude/reality1 rule bldclass-evidence: tools/bldclass/build_evidence.py (urban.brussels Irismonument inventory CC BY 4.0 + OpenStreetMap ODbL)", "solids": out}, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
    print(f"{len(tiles)} tiles, {tot['solids']} solids: {tot['era']} dated, {tot['inst']} institutions, {tot['near']} with a neighbour prior")


if __name__ == "__main__":
    main()
