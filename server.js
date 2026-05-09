const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ANIKOTO_BASE = "https://anikotoapi.site";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    } else {
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    }
  });
}

function proxyAnikoto(req, res) {
  const proxyPath = req.url.replace(/^\/api\/anikoto\//, "/");
  const url = ANIKOTO_BASE + proxyPath;

  fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    .then(async (apiRes) => {
      const body = await apiRes.arrayBuffer();
      const headers = {};
      apiRes.headers.forEach((value, name) => {
        if (!['transfer-encoding', 'connection', 'content-encoding'].includes(name.toLowerCase())) {
          headers[name] = value;
        }
      });
      res.writeHead(apiRes.status, {
        ...headers,
        "access-control-allow-origin": "*"
      });
      res.end(Buffer.from(body));
    })
    .catch(err => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: err.message }));
    });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      "access-control-max-age": "86400",
    });
    res.end();
    return;
  }
  if (req.url.startsWith("/api/anikoto/")) {
    proxyAnikoto(req, res);
  } else {
    const filePath = req.url === "/" ? "./index.html" : "." + req.url;
    serveStatic(res, filePath);
  }
});

server.listen(PORT, () => {
  console.log(`Ember running at http://localhost:${PORT}`);
});
