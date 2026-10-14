"""AdmitPath Python Entrypoint.
Provides a standard WSGI/HTTP server using Python standard library.
Handles API endpoints, session authentication, crawler execution, and static serving.
"""
import http.server
import socketserver
import json
import urllib.parse
from core.config import HOST, PORT, DB_PATH
from core.db import init_db, get_connection
from core.seeds import seed_database
from core.auth import signup_user, login_user, validate_session, logout_user
from core.matcher import calculate_match_score
from core.compose import generate_personalized_email
from core.pipeline import run_crawler_pipeline

class AdmitPathHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "app": "AdmitPath"}).encode("utf-8"))
            return
        elif parsed.path == "/api/universities":
            conn = get_connection()
            rows = conn.execute("SELECT * FROM universities ORDER BY ranking ASC").fetchall()
            conn.close()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps([dict(r) for r in rows]).encode("utf-8"))
            return
        super().do_GET()

def run():
    init_db()
    conn = get_connection()
    seed_database(conn)
    conn.close()
    print(f"AdmitPath Python server running at http://{HOST}:{PORT}")
    with socketserver.TCPServer((HOST, PORT), AdmitPathHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    run()
