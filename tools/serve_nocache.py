"""A static dev server that never lets the browser cache (python -m http.server serves stale JS after edits).

    python tools/serve_nocache.py [port=8791]        # serves the repo root
"""
import http.server, os, sys, functools

class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".mjs": "text/javascript",
                      ".wasm": "application/wasm", ".glb": "model/gltf-binary", ".json": "application/json"}
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()
    def log_message(self, *a): pass

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(NoCache, directory=root)).serve_forever()
