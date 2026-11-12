#!/usr/bin/env python3
"""
Prime Focus Schools - Local Development & CMS Backend Server
Serves static website files with cache headers and gzip compression,
and provides REST API endpoints to persist blog posts.
Zero external dependencies required (uses standard library http.server).
"""

from datetime import datetime, timezone
import email.utils
import gzip
from http import HTTPStatus
import http.server
import io
import json
import os
import posixpath
import sys
import threading
import urllib.parse

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
POSTS_FILE = os.path.join(DATA_DIR, "posts.json")
POSTS_LOCK = threading.RLock()

MEDIA_CACHE_EXTENSIONS = frozenset({
    ".webp", ".png", ".jpg", ".jpeg", ".svg", ".woff2", ".ico", ".gif", ".woff", ".ttf"
})
ASSET_CACHE_EXTENSIONS = frozenset({".css", ".js", ".mjs", ".json", ".xml", ".txt"})
HTML_CACHE_EXTENSIONS = frozenset({".html", ".htm"})
GZIP_EXTENSIONS = frozenset({".html", ".htm", ".css", ".js", ".mjs", ".json", ".svg", ".xml", ".txt"})

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "js"), exist_ok=True)


def read_posts():
    with POSTS_LOCK:
        if not os.path.exists(POSTS_FILE):
            return []
        try:
            with open(POSTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[ERROR] Failed reading posts: {e}")
            return []


def write_posts(posts):
    with POSTS_LOCK:
        try:
            with open(POSTS_FILE, "w", encoding="utf-8") as f:
                json.dump(posts, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"[ERROR] Failed writing posts: {e}")
            return False


class PFSRequestHandler(http.server.SimpleHTTPRequestHandler):
    _resolved_path = None
    _status_code = 200
    _cache_control_override = None

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webp": "image/webp",
        ".woff2": "font/woff2",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".xml": "application/xml; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def parse_request(self):
        self._resolved_path = None
        self._status_code = 200
        self._cache_control_override = None
        return super().parse_request()

    def send_response(self, code, message=None):
        self._status_code = int(code)
        super().send_response(code, message)

    def _accepts_gzip(self):
        ae = self.headers.get("Accept-Encoding", "")
        for part in ae.lower().split(","):
            token = part.strip()
            if not token:
                continue
            name, *params = [p.strip() for p in token.split(";")]
            if name == "gzip":
                for param in params:
                    if param.startswith("q="):
                        try:
                            if float(param[2:]) == 0.0:
                                return False
                        except ValueError:
                            pass
                return True
        return False

    def _get_cache_control(self):
        if self._cache_control_override:
            return self._cache_control_override

        url_path = urllib.parse.urlparse(self.path).path
        if url_path == "/api" or url_path.startswith("/api/"):
            return "no-store"

        if self._status_code >= 400:
            return "no-cache"

        target = self._resolved_path or url_path
        ext = os.path.splitext(target)[1].lower()
        if not ext and url_path.endswith("/"):
            ext = ".html"

        if ext in MEDIA_CACHE_EXTENSIONS:
            return "public, max-age=604800"
        if ext in ASSET_CACHE_EXTENSIONS:
            return "public, max-age=3600"
        if ext in HTML_CACHE_EXTENSIONS:
            return "public, max-age=300"
        return "public, max-age=300"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", self._get_cache_control())
        super().end_headers()

    def _send_json_response(self, status_code, payload_obj, head_only=False):
        raw_bytes = json.dumps(payload_obj, ensure_ascii=False).encode("utf-8")
        use_gzip = self._accepts_gzip()
        body = gzip.compress(raw_bytes, compresslevel=6) if use_gzip else raw_bytes

        self._cache_control_override = "no-store"
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Vary", "Accept-Encoding")
        if use_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def _handle_api_read(self, head_only=False):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/posts":
            posts = read_posts()
            self._send_json_response(HTTPStatus.OK, posts, head_only=head_only)
            return True
        if parsed.path == "/api" or parsed.path.startswith("/api/"):
            self._send_json_response(
                HTTPStatus.NOT_FOUND,
                {"error": "API endpoint not found"},
                head_only=head_only,
            )
            return True
        return False

    def _etag_matches(self, header_value, etag):
        for raw_tag in header_value.split(","):
            tag = raw_tag.strip()
            if tag == "*" or tag == etag:
                return True
        return False

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            parts = urllib.parse.urlsplit(self.path)
            if not parts.path.endswith(("/", "%2f", "%2F")):
                self.send_response(HTTPStatus.MOVED_PERMANENTLY)
                new_parts = (parts[0], parts[1], parts[2] + "/", parts[3], parts[4])
                new_url = urllib.parse.urlunsplit(new_parts)
                self.send_header("Location", new_url)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            for index in self.index_pages:
                index_path = os.path.join(path, index)
                if os.path.isfile(index_path):
                    path = index_path
                    break
            else:
                self._resolved_path = "index.html"
                return self.list_directory(path)

        if path.endswith("/") or path.endswith(os.path.sep):
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None

        self._resolved_path = path
        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None

        try:
            fs = os.fstat(f.fileno())
            _, ext = posixpath.splitext(path.replace(os.sep, "/"))
            ext = ext.lower()
            is_compressible = ext in GZIP_EXTENSIONS
            use_gzip = is_compressible and self._accepts_gzip()
            etag = f'"{fs.st_mtime_ns}-{fs.st_size}{"-gzip" if use_gzip else ""}"'

            inm = self.headers.get("If-None-Match")
            not_modified = False
            if inm:
                not_modified = self._etag_matches(inm, etag)
            elif "If-Modified-Since" in self.headers:
                try:
                    ims = email.utils.parsedate_to_datetime(self.headers["If-Modified-Since"])
                except (TypeError, IndexError, OverflowError, ValueError):
                    ims = None
                if ims is not None:
                    if ims.tzinfo is None:
                        ims = ims.replace(tzinfo=timezone.utc)
                    if ims.tzinfo is timezone.utc:
                        last_modif = datetime.fromtimestamp(fs.st_mtime, timezone.utc).replace(microsecond=0)
                        if last_modif <= ims:
                            not_modified = True

            if not_modified:
                self.send_response(HTTPStatus.NOT_MODIFIED)
                self.send_header("ETag", etag)
                self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                if is_compressible:
                    self.send_header("Vary", "Accept-Encoding")
                self.end_headers()
                f.close()
                return None

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", ctype)
            self.send_header("ETag", etag)
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            if is_compressible:
                self.send_header("Vary", "Accept-Encoding")

            if use_gzip:
                raw_data = f.read()
                f.close()
                gz_data = gzip.compress(raw_data, compresslevel=6)
                self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(gz_data)))
                self.end_headers()
                return io.BytesIO(gz_data)

            self.send_header("Content-Length", str(fs.st_size))
            self.end_headers()
            return f
        except Exception:
            f.close()
            raise

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self):
        if self._handle_api_read(head_only=True):
            return
        super().do_HEAD()

    def do_GET(self):
        if self._handle_api_read(head_only=False):
            return
        super().do_GET()

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            content_length = 0
        body = self.rfile.read(max(0, content_length))
        return json.loads(body.decode("utf-8"))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/posts/sync":
            try:
                new_posts = self._read_json_body()
                if not isinstance(new_posts, list):
                    self._send_json_response(
                        HTTPStatus.BAD_REQUEST,
                        {"error": "Expected a JSON array of posts"},
                    )
                    return
                write_posts(new_posts)
                self._send_json_response(
                    HTTPStatus.OK,
                    {"success": True, "count": len(new_posts)},
                )
                return
            except Exception as e:
                self._send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
                return

        if parsed.path == "/api/posts":
            try:
                post_data = self._read_json_body()
                if not isinstance(post_data, dict):
                    self._send_json_response(
                        HTTPStatus.BAD_REQUEST,
                        {"error": "Expected a JSON object for post"},
                    )
                    return
                with POSTS_LOCK:
                    posts = read_posts()
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
                self._send_json_response(
                    HTTPStatus.OK,
                    {"success": True, "post": post_data},
                )
                return
            except Exception as e:
                self._send_json_response(HTTPStatus.BAD_REQUEST, {"error": str(e)})
                return

        self._send_json_response(HTTPStatus.NOT_FOUND, {"error": "API endpoint not found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/posts/"):
            post_id = parsed.path.split("/")[-1]
            with POSTS_LOCK:
                posts = read_posts()
                filtered = [p for p in posts if p.get("id") != post_id]
                write_posts(filtered)
            self._send_json_response(
                HTTPStatus.OK,
                {"success": True, "deleted": post_id},
            )
            return

        self._send_json_response(HTTPStatus.NOT_FOUND, {"error": "API endpoint not found"})


class PFSHTTPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 128


def run_server(port=PORT):
    with PFSHTTPServer(("", port), PFSRequestHandler) as httpd:
        print("=====================================================")
        print(" Prime Focus Schools Web & CMS Server Running")
        print(f" URL: http://localhost:{port}")
        print(f" Blog: http://localhost:{port}/blog.html")
        print(f" CMS:  http://localhost:{port}/cms.html")
        print(" Press Ctrl+C to stop.")
        print("=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")


if __name__ == "__main__":
    port = PORT
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
