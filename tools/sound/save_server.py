# Accepts POST /save?name=<file>.wav and writes the body into the target dir (CORS open). Scratch tool.
import http.server, sys, os, urllib.parse
port, root = int(sys.argv[1]), sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers", "*")
    def do_OPTIONS(self): self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query); name = os.path.basename(q.get("name", ["x.bin"])[0])
        n = int(self.headers.get("Content-Length", 0)); data = self.rfile.read(n)
        with open(os.path.join(root, name), "wb") as f: f.write(data)
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
