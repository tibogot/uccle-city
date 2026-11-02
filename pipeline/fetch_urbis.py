"""Download the UrbIS datasets listed in pipeline/sources.json into data/raw/urbis/<key>/
and unzip archives. Sources without URLs are reported (fill them in from datastore.brussels,
or drop the files there by hand).

    python pipeline/fetch_urbis.py [key ...]
"""
from __future__ import annotations

import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from common import RAW, read_json

HERE = Path(__file__).resolve().parent


def download(url: str, dest_dir: Path) -> Path:
    name = Path(urllib.parse.urlparse(url).path).name or "download.bin"
    dest = dest_dir / name
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  have {dest.name}")
        return dest
    print(f"  GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "uccle-city-pipeline/0.1"})
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(req, timeout=600) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.rename(dest)
    return dest


def safe_unzip(zpath: Path, dest: Path):
    """Extract without letting member names escape dest."""
    root = dest.resolve()
    with zipfile.ZipFile(zpath) as z:
        for m in z.infolist():
            target = (dest / m.filename).resolve()
            if not str(target).startswith(str(root)):
                raise SystemExit(f"refusing zip member outside target: {m.filename}")
        z.extractall(dest)


def main():
    cfg = read_json(HERE / "sources.json")["sources"]
    keys = sys.argv[1:] or list(cfg)
    missing = []
    for key in keys:
        src = cfg[key]
        d = RAW / "urbis" / key
        d.mkdir(parents=True, exist_ok=True)
        print(f"[{key}] {src['title']}")
        if not src.get("urls"):
            have = [p for p in d.rglob("*") if p.is_file()]
            if have:
                print(f"  no URL configured, using {len(have)} file(s) already in {d}")
            else:
                print(f"  NO URL and no files in {d}. See {src['page']}")
                missing.append(key)
            continue
        for url in src["urls"]:
            p = download(url, d)
            if p.suffix.lower() == ".zip":
                out = d / p.stem
                if not out.exists():
                    safe_unzip(p, out)
                    print(f"  unzipped -> {out}")
    if missing:
        print(f"\nmissing: {', '.join(missing)}")
        sys.exit(2)


if __name__ == "__main__":
    main()
