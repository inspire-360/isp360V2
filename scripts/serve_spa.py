from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import sys


ROOT = Path(__file__).resolve().parent.parent / "dist"
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else "4177"))


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        requested = (ROOT / self.path.lstrip("/")).resolve()
        try:
            requested.relative_to(ROOT)
        except ValueError:
            self.send_error(403, "Forbidden")
            return

        if requested.is_file():
            return super().do_GET()

        self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), SpaHandler)
    print(f"SPA preview server running at http://{HOST}:{PORT}")
    server.serve_forever()
