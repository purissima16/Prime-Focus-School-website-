#!/usr/bin/env python3
"""
Prime Focus Schools - Local Development & CMS Backend Server
Serves static website files and provides REST API endpoints to persist blog posts.
Zero external dependencies required (uses standard library http.server).
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse
from datetime import datetime

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
POSTS_FILE = os.path.join(DATA_DIR, "posts.json")
JS_DATA_FILE = os.path.join(BASE_DIR, "js", "blog-data.js")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "js"), exist_ok=True)

def read_posts():
    if not os.path.exists(POSTS_FILE):
        return []
    try:
        with open(POSTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed reading posts: {e}")
        return []

def write_posts(posts):
    try:
        with open(POSTS_FILE, "w", encoding="utf-8") as f:
            json.dump(posts, f, indent=2, ensure_ascii=False)
        
        # Also sync js/blog-data.js for static fallback
        js_code = (
            "/**\n"
            " * Prime Focus Schools - Blog Posts Dataset\n"
            f" * Synchronized via local CMS server on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            " * Glorify God Always | Ipaja, Lagos\n"
            " */\n\n"
            f"const defaultBlogPosts = {json.dumps(posts, indent=2, ensure_ascii=False)};\n\n"
            "if (typeof module !== 'undefined' && module.exports) {\n"
            "  module.exports = { defaultBlogPosts };\n"
            "}\n"
        )
        with open(JS_DATA_FILE, "w", encoding="utf-8") as f:
            f.write(js_code)
        return True
    except Exception as e:
        print(f"[ERROR] Failed writing posts: {e}")
        return False

class PFSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/posts" or parsed.path.startswith("/api/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/posts":
            posts = read_posts()
            payload = json.dumps(posts, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/posts/sync":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                new_posts = json.loads(body.decode("utf-8"))
                if isinstance(new_posts, list):
                    write_posts(new_posts)
                    response = {"success": True, "count": len(new_posts)}
                    res_body = json.dumps(response).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(res_body)
                    return
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        if parsed.path == "/api/posts":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                post_data = json.loads(body.decode("utf-8"))
                posts = read_posts()
                
                # Check if updating or creating
                idx = -1
                post_id = post_data.get("id")
                if post_id:
                    for i, p in enumerate(posts):
                        if p.get("id") == post_id:
                            idx = i
                            break

                if idx >= 0:
                    posts[idx] = post_data
                else:
                    posts.insert(0, post_data)

                write_posts(posts)
                res_body = json.dumps({"success": True, "post": post_data}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(res_body)
                return
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/posts/"):
            post_id = parsed.path.split("/")[-1]
            posts = read_posts()
            filtered = [p for p in posts if p.get("id") != post_id]
            write_posts(filtered)
            res_body = json.dumps({"success": True, "deleted": post_id}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(res_body)
            return

        self.send_response(404)
        self.end_headers()

def run_server(port=PORT):
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), PFSRequestHandler) as httpd:
        print(f"=====================================================")
        print(f" Prime Focus Schools Web & CMS Server Running")
        print(f" URL: http://localhost:{port}")
        print(f" Blog: http://localhost:{port}/blog.html")
        print(f" CMS:  http://localhost:{port}/cms.html")
        print(f" Press Ctrl+C to stop.")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    port = PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
