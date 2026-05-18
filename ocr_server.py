#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, sys

print("Lade EasyOCR...", flush=True)
import easyocr
reader = easyocr.Reader(["en"], verbose=False)
print("EasyOCR bereit.", flush=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_POST(self):
        n = int(self.headers["Content-Length"])
        paths = json.loads(self.rfile.read(n))
        out = {}
        for key, path in paths.items():
            try:
                # Erst ohne allowlist versuchen (bessere Erkennung), dann Zeichen filtern
                r = reader.readtext(
                    path,
                    detail=1,
                    paragraph=False,
                    text_threshold=0.3,
                    low_text=0.2,
                    link_threshold=0.2,
                    slope_ths=1.0,
                    min_size=5,
                )
                if r:
                    # Nur Ziffern behalten, Buchstaben substituieren
                    def norm(c):
                        m = {"O":"0","o":"0","Q":"0","D":"0","I":"1","i":"1","l":"1","L":"1",
                             "S":"5","s":"5","Z":"2","z":"2","B":"8","b":"8","G":"9","g":"9",
                             "A":"4","T":"7","f":"5","F":"5"}
                        return m.get(c, c)
                    combined = "".join(norm(c) for item in r for c in item[1] if norm(c).isdigit())
                    best_conf = max(float(item[2]) for item in r)
                    out[key] = {
                        "d": combined,
                        "c": round(best_conf, 2)
                    }
                else:
                    out[key] = {"d": "", "c": 0}
            except Exception as e:
                out[key] = {"d": "", "c": 0}
        body = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

server = HTTPServer(("127.0.0.1", 3001), Handler)
server.allow_reuse_address = True
server.serve_forever()
