"""A static dev server with the LIVE SITE's caching (vercel.json headers), for warm-cache boot measurements.

    python tools/serve_cached.py [port=8871]        # serves the repo root

/data/**: public, max-age=3600 (manifest.json and overrides.json: max-age=0, must-revalidate); /viewer/** and
/vendor/**: max-age=0, must-revalidate (revalidated with If-Modified-Since -> 304, as Vercel does with its ETag).
A second load in the same browser is then a "warm" load: tile data from the HTTP cache, code revalidated.
(For editing use tools/serve_nocache.py: this one can serve stale data for an hour.)
"""
import http.server, os, sys, functools, re

RULES = [
    (re.compile(r"^/data/tiles/manifest\.json|^/data/overrides\.json"), "public, max-age=0, must-revalidate"),
    (re.compile(r"^/data/"), "public, max-age=3600, stale-while-revalidate=86400"),
    (re.compile(r"^/(viewer|vendor)/"), "public, max-age=0, must-revalidate"),
]

class Cached(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript",
                      ".wasm": "application/wasm", ".glb": "model/gltf-binary", ".json": "application/json"}
    def end_headers(self):
        path = self.path.split("?", 1)[0]
        for rx, cc in RULES:
            if rx.search(path):
                self.send_header("Cache-Control", cc)
                break
        else:
            self.send_header("Cache-Control", "public, max-age=0, must-revalidate")
        super().end_headers()
    def log_message(self, *a): pass

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8871
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Cached, directory=root)).serve_forever()
