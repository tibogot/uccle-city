# Local static server with Cache-Control: no-cache (plain http.server lets the browser serve stale JS).
#   python tools/facadekit/serve.py [port]   (from the repo root; default 8784)
import http.server, socketserver, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()
    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8784
socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", port), NoCache) as s:
    print(f"serving on http://127.0.0.1:{port}", flush=True)
    s.serve_forever()
