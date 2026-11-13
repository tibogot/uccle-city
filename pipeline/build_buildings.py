"""UrbIS 3D buildings -> data/tiles/<T>/buildings.json + buildings.bin (CONTRACT §5.2).

Reads every OGR-readable vector file under data/raw/urbis/buildings3d/ (CityGML/GML, Shapefile
PolygonZ/MultiPatch, GeoPackage, DXF 3DFACE, FileGDB...). Each feature is one building unless
--id-field groups several features (e.g. CityGML roof/wall surface layers sharing a parent id).
3D faces are split into roof / walls by their normals; ground faces are dropped.

    python pipeline/build_buildings.py --tile G4 [--id-field NAME] [--height-field NAME] [--layer NAME]

Run build_terrain.py first so `base` comes from the DTM.
"""
from __future__ import annotations

import argparse
import struct
import sys
from collections import defaultdict
from pathlib import Path

import mapbox_earcut as earcut
import numpy as np
import pyogrio
from pyproj import CRS, Transformer
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union

from common import (CONTRACT, L72, ORIGIN_E, ORIGIN_N, RAW, TILES, local_to_l72, polygon_out, read_json, round2,
                    study_polygon_local, tile_bounds, write_json)

VEC_EXTS = {".gml", ".xml", ".shp", ".gpkg", ".dxf", ".geojson", ".json", ".fgb", ".kml"}
WALL_NY = 0.17          # |n·up| below this = wall
GROUND_EPS = 0.3        # m above the building's lowest vertex


# ---------------------------------------------------------------- WKB -> faces (handles PolyhedralSurface/TIN too)

def wkb_faces(buf: bytes):
    """Return list of faces; a face is [outer_ring, *holes], ring = [(x, y, z), ...]."""
    faces = []

    def read(off):
        bo = "<" if buf[off] == 1 else ">"
        (t,) = struct.unpack_from(bo + "I", buf, off + 1)
        off += 5
        has_z = bool(t & 0x80000000)
        has_m = bool(t & 0x40000000)
        has_srid = bool(t & 0x20000000)
        t &= 0x0FFFFFFF
        if has_srid:
            off += 4
        base = t % 1000
        dim = t // 1000                      # ISO: 1=Z 2=M 3=ZM
        has_z = has_z or dim in (1, 3)
        has_m = has_m or dim in (2, 3)
        nd = 2 + has_z + has_m

        def ring(o):
            (npts,) = struct.unpack_from(bo + "I", buf, o)
            o += 4
            vals = struct.unpack_from(bo + "d" * (npts * nd), buf, o)
            o += 8 * npts * nd
            pts = [(vals[k * nd], vals[k * nd + 1], vals[k * nd + 2] if has_z else float("nan")) for k in range(npts)]
            return pts, o

        if base in (3, 17):                  # Polygon, Triangle
            (nr,) = struct.unpack_from(bo + "I", buf, off)
            off += 4
            rings = []
            for _ in range(nr):
                r, off = ring(off)
                rings.append(r)
            if rings:
                faces.append(rings)
            return off
        if base in (6, 7, 15, 16):           # MultiPolygon, GeometryCollection, PolyhedralSurface, TIN
            (ng,) = struct.unpack_from(bo + "I", buf, off)
            off += 4
            for _ in range(ng):
                off = read(off)
            return off
        if base == 2:                        # LineString (skip)
            (npts,) = struct.unpack_from(bo + "I", buf, off)
            return off + 4 + 8 * npts * nd
        if base == 1:
            return off + 8 * nd
        if base == 5:                        # MultiLineString
            (ng,) = struct.unpack_from(bo + "I", buf, off)
            off += 4
            for _ in range(ng):
                off = read(off)
            return off
        raise ValueError(f"unsupported WKB type {t}")

    read(0)
    return faces


# ---------------------------------------------------------------- face maths (local x, y=up, z=south)

def newell(ring):
    nx = ny = nz = 0.0
    n = len(ring)
    for k in range(n):
        x1, y1, z1 = ring[k]
        x2, y2, z2 = ring[(k + 1) % n]
        nx += (y1 - y2) * (z1 + z2)
        ny += (z1 - z2) * (x1 + x2)
        nz += (x1 - x2) * (y1 + y2)
    L = (nx * nx + ny * ny + nz * nz) ** 0.5
    return (nx / L, ny / L, nz / L) if L > 1e-12 else None


def clean_ring(r):
    out = []
    for p in r:
        if not out or max(abs(p[0] - out[-1][0]), abs(p[1] - out[-1][1]), abs(p[2] - out[-1][2])) > 1e-4:
            out.append(p)
    if len(out) > 1 and max(abs(a - b) for a, b in zip(out[0], out[-1])) <= 1e-4:
        out.pop()
    return out


def triangulate(face, normal):
    """face = [outer, *holes] in local xyz. Returns list of (i,j,k) into the flattened vertex list, plus verts."""
    drop = int(np.argmax(np.abs(normal)))
    keep = [a for a in range(3) if a != drop]
    verts, ends = [], []
    for r in face:
        verts.extend(r)
        ends.append(len(verts))
    v2 = np.array([[p[keep[0]], p[keep[1]]] for p in verts], dtype=np.float64)
    idx = earcut.triangulate_float64(v2, np.array(ends, dtype=np.uint32))
    tris = []
    for t in range(0, len(idx), 3):
        a, b, c = verts[idx[t]], verts[idx[t + 1]], verts[idx[t + 2]]
        u = np.subtract(b, a)
        w = np.subtract(c, a)
        cr = np.cross(u, w)
        if np.dot(cr, normal) < 0:
            tris.append((idx[t], idx[t + 2], idx[t + 1]))
        else:
            tris.append((idx[t], idx[t + 1], idx[t + 2]))
    return verts, tris


# ---------------------------------------------------------------- terrain lookup

class Ground:
    def __init__(self, tile):
        self.ok = False
        p = TILES / tile / "terrain.json"
        if p.exists():
            h = read_json(p)
            self.h = h
            self.grid = np.frombuffer((TILES / tile / "terrain.u16").read_bytes(), dtype="<u2").reshape(h["rows"], h["cols"])
            self.ok = True

    def at(self, x, z):
        if not self.ok:
            return None
        h = self.h
        c = (x - h["x0"]) / h["step"]
        r = (z - h["z0"]) / h["step"]
        if c < 0 or r < 0 or c > h["cols"] - 1 or r > h["rows"] - 1:
            return None
        c0, r0 = min(int(c), h["cols"] - 2), min(int(r), h["rows"] - 2)
        fc, fr = c - c0, r - r0
        q = self.grid[r0:r0 + 2, c0:c0 + 2].astype(np.float64)
        if (q == h["nodata"]).any():
            return None
        v = q[0, 0] * (1 - fc) * (1 - fr) + q[0, 1] * fc * (1 - fr) + q[1, 0] * (1 - fc) * fr + q[1, 1] * fc * fr
        return v / 100.0


# ---------------------------------------------------------------- main build

def iter_sources(src: Path, layer_filter):
    files = sorted(p for p in src.rglob("*") if p.suffix.lower() in VEC_EXTS and p.is_file())
    if not files:
        raise SystemExit(f"no vector files under {src} (see pipeline/sources.json 'buildings3d')")
    for f in files:
        try:
            layers = pyogrio.list_layers(f)
        except Exception as e:  # noqa: BLE001
            print(f"  skip {f.name}: {e}", file=sys.stderr)
            continue
        for name, gtype in layers:
            if layer_filter and layer_filter not in name:   # substring: UrbIS layer names carry the sheet number
                continue
            yield f, name


def build(tile, src, id_field=None, height_field=None, layer=None):
    x0, z0, x1, z1 = tile_bounds(tile)
    margin = 60.0
    e0, n1 = local_to_l72(x0 - margin, z0 - margin)
    e1, n0 = local_to_l72(x1 + margin, z1 + margin)
    study = study_polygon_local()
    ground = Ground(tile)
    if not ground.ok:
        print("  WARNING: no terrain for this tile yet, base = lowest geometry vertex", file=sys.stderr)

    groups = defaultdict(lambda: {"faces": [], "attrs": {}, "extrude": None})
    inputs = []
    for f, lname in iter_sources(src, layer):
        info = pyogrio.read_info(f, layer=lname)
        crs = CRS.from_user_input(info["crs"]) if info.get("crs") else CRS.from_epsg(31370)
        same = crs.to_epsg() == 31370
        tr = None if same else Transformer.from_crs(crs, L72, always_xy=True)
        bbox = (e0, n0, e1, n1) if same else None
        meta, fids, geoms, fields = pyogrio.raw.read(f, layer=lname, bbox=bbox, return_fids=True)
        names = list(meta["fields"])
        nfeat = 0
        for k, wkb in enumerate(geoms):
            if wkb is None:
                continue
            try:
                faces = wkb_faces(bytes(wkb))
            except (ValueError, struct.error) as e:
                print(f"  {f.name}/{lname} fid {fids[k]}: {e}", file=sys.stderr)
                continue
            attrs = {}
            for fi, fn in enumerate(names):
                v = fields[fi][k]
                if v is None or (isinstance(v, float) and np.isnan(v)):
                    continue
                attrs[fn] = v.item() if hasattr(v, "item") else (v.decode() if isinstance(v, bytes) else v)
            key = str(attrs.get(id_field)) if id_field and id_field in attrs else f"{f.stem}:{lname}:{fids[k]}"
            g = groups[key]
            g["attrs"].update({kk: vv for kk, vv in attrs.items() if not isinstance(vv, (bytes, bytearray))})
            g["layers"] = sorted(set(g.get("layers", [])) | {lname})
            for face in faces:
                lf = []
                for r in face:
                    es = [p[0] for p in r]
                    ns = [p[1] for p in r]
                    hs = [p[2] for p in r]
                    if tr:
                        es, ns = tr.transform(es, ns)
                    lf.append([(e - ORIGIN_E, h, -(n - ORIGIN_N)) for e, n, h in zip(es, ns, hs)])
                g["faces"].append(lf)
            if height_field and height_field in attrs:
                g["extrude"] = float(attrs[height_field])
            nfeat += 1
        inputs.append({"file": f.relative_to(src).as_posix(), "layer": lname, "features": nfeat, "crs": crs.to_string()})

    positions, indices, buildings = [], [], []
    tri_count = 0
    skipped = defaultdict(int)
    for key, g in groups.items():
        faces = g["faces"]
        if not faces:
            skipped["no-geometry"] += 1
            continue
        has_z = all(not np.isnan(p[1]) for f in faces for r in f for p in r)
        footprint = None
        roof_faces, wall_faces = [], []
        if has_z:
            ymin = min(p[1] for f in faces for r in f for p in r)
            cx = np.mean([p[0] for f in faces for p in f[0]])
            cz = np.mean([p[2] for f in faces for p in f[0]])
            flat = []
            for f in faces:
                f = [clean_ring(r) for r in f]
                f = [r for r in f if len(r) >= 3]
                if not f:
                    continue
                n = newell(f[0])
                if n is None:
                    continue
                if abs(n[1]) < WALL_NY:
                    fc = np.mean(f[0], axis=0)
                    # a first guess only: wrong on concave houses (an L's inner-corner walls face the centre);
                    # tools/orient_buildings.mjs fixes every triangle afterwards (run it after this step)
                    if (fc[0] - cx) * n[0] + (fc[2] - cz) * n[2] < 0:   # make walls face away from the centre
                        f = [r[::-1] for r in f]
                        n = (-n[0], -n[1], -n[2])
                    wall_faces.append((f, n))
                else:
                    meany = np.mean([p[1] for p in f[0]])
                    if abs(n[1]) > 0.9 and meany <= ymin + GROUND_EPS:
                        flat.append(f)                                     # ground: footprint only
                        continue
                    if n[1] < 0:
                        f = [r[::-1] for r in f]
                        n = (-n[0], -n[1], -n[2])
                    roof_faces.append((f, n))
                    flat.append(f)
            polys = []
            for f in flat:
                try:
                    p = Polygon([(q[0], q[2]) for q in f[0]], [[(q[0], q[2]) for q in h] for h in f[1:]]).buffer(0)
                    if not p.is_empty:
                        polys.append(p)
                except ValueError:
                    pass
            if polys:
                footprint = unary_union(polys).buffer(0.01).buffer(-0.01)
        elif g["extrude"]:
            polys = [Polygon([(q[0], q[2]) for q in f[0]]).buffer(0) for f in faces if len(f[0]) >= 3]
            footprint = unary_union(polys)
        if footprint is None or footprint.is_empty:
            skipped["no-footprint"] += 1
            continue
        if footprint.geom_type == "MultiPolygon":
            parts = sorted(footprint.geoms, key=lambda p: p.area, reverse=True)
            g["attrs"]["_parts"] = len(parts)
            main = parts[0]
        else:
            main = footprint
        c = footprint.centroid
        if not (x0 <= c.x < x1 and z0 <= c.y < z1) or not study.covers(Point(c.x, c.y)):
            continue
        main = main.simplify(0.05)

        samples = [ground.at(x, z) for x, z in list(main.exterior.coords) + [(c.x, c.y)]]
        samples = [s for s in samples if s is not None]
        if has_z:
            vmin = min(p[1] for f in faces for r in f for p in r)
            vmax = max(p[1] for f in faces for r in f for p in r)
        base = min(samples) if samples else (vmin if has_z else None)
        if base is None:
            skipped["no-base"] += 1
            continue

        if not has_z:   # 2D footprint + height attribute: flat-roof extrusion
            top = base + g["extrude"]
            ext = [(x, z) for x, z in main.exterior.coords][:-1]
            roof = [[(x, top, z) for x, z in ext]]
            roof_faces = [(roof, (0.0, 1.0, 0.0))]      # triangulate() orients triangles to the given normal
            wall_faces = []
            for k in range(len(ext)):
                (ax, az), (bx, bz) = ext[k], ext[(k + 1) % len(ext)]
                ring = [(ax, base, az), (bx, base, bz), (bx, top, bz), (ax, top, az)]
                n = newell(ring)
                if not n:
                    continue
                mx, mz = (ax + bx) / 2, (az + bz) / 2
                # outward = away from the interior: probe a point just along the normal
                if main.contains(Point(mx + n[0] * 0.05, mz + n[2] * 0.05)):
                    ring = ring[::-1]
                    n = (-n[0], -n[1], -n[2])
                wall_faces.append(([ring], n))
            g["attrs"]["_extruded"] = True
            vmin, vmax = base, top

        rec = {"id": key, "source": "urbis3d", "footprint": polygon_out(main), "base": round2(base),
               "eaves": round2(min(p[1] for f, _ in roof_faces for p in f[0])) if roof_faces else None,
               "top": round2(vmax), "height": round2(vmax - base)}
        for label, flist in (("roof", roof_faces), ("walls", wall_faces)):
            first = tri_count
            for f, n in flist:
                try:
                    verts, tris = triangulate(f, n)
                except Exception:  # noqa: BLE001
                    skipped["bad-face"] += 1
                    continue
                off = len(positions)
                positions.extend(verts)
                indices.extend((a + off, b + off, c_ + off) for a, b, c_ in tris)
                tri_count += len(tris)
            rec[label] = {"first": first, "count": tri_count - first}
        rec["attrs"] = {k: v for k, v in g["attrs"].items() if isinstance(v, (str, int, float, bool))}
        rec["attrs"]["_layers"] = g.get("layers", [])
        buildings.append(rec)

    tdir = TILES / tile
    tdir.mkdir(parents=True, exist_ok=True)
    pos = np.array(positions, dtype="<f4").reshape(-1, 3)
    idx = np.array(indices, dtype="<u4").reshape(-1, 3)
    with open(tdir / "buildings.bin", "wb") as f:
        f.write(struct.pack("<II", len(pos), len(idx)))
        f.write(pos.tobytes())
        f.write(idx.tobytes())
    doc = {"contract": CONTRACT, "tile": tile, "count": len(buildings), "bin": "buildings.bin",
           "binLayout": "u32 vertexCount, u32 triangleCount, f32 positions[3*V], u32 indices[3*T] (little-endian)",
           "inputs": inputs, "skipped": dict(skipped), "buildings": buildings}
    write_json(tdir / "buildings.json", doc)
    return doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    ap.add_argument("--src", type=Path, default=RAW / "urbis" / "buildings3d")
    ap.add_argument("--id-field")
    ap.add_argument("--height-field", help="for 2D-only footprints: attribute holding the building height (m)")
    ap.add_argument("--layer", help="only layers whose name contains this text (UrbIS SHP: BuildingSolids)")
    args = ap.parse_args()
    doc = build(args.tile.upper(), args.src, args.id_field, args.height_field, args.layer)
    print(f"buildings {doc['tile']}: {doc['count']} kept, skipped {doc['skipped']}, inputs {doc['inputs']}", file=sys.stderr)


if __name__ == "__main__":
    main()
