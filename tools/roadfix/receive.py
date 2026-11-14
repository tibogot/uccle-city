"""A tiny POST sink for the browser runs (road fix round 2): POST /<name>.json body -> <dir>/<name>.json.
    python tools/roadfix/receive.py 8862 docs/collisions"""
import http.server, sys, os, re
D = sys.argv[2] if len(sys.argv) > 2 else "."
class H(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers", "*")
    def do_POST(self):
        name = os.path.basename(self.path)
        if not re.fullmatch(r"[\w.-]+\.json", name): self.send_response(400); self.end_headers(); return
        n = int(self.headers.get("Content-Length", 0)); data = self.rfile.read(n)
        open(os.path.join(D, name), "wb").write(data)
        self.send_response(200); self.cors(); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
