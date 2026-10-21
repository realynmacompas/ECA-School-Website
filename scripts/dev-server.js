/* =========================================================
   Local test server:  npm run dev   →  http://localhost:5500

   Live Server can only show files; it can't run the /api back
   end. This small server does both, the same way Vercel does:
   - /api/auth/login  → runs api/auth/login.js
   - everything else  → the normal website files
   Settings come from .env.local (see .env.example).
   Close VS Code Live Server first (both use port 5500, which is
   one of the addresses allowed in Google Cloud).
   ========================================================= */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 5500);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8"
};

// Same rules as Vercel: api/foo/bar.js answers /api/foo/bar; files/folders starting with "_" are private
async function findApiFile(urlPath) {
  const parts = urlPath.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  if (!parts.length || parts.some((p) => p.startsWith("_") || p.startsWith(".") || p.includes(".."))) return null;
  const file = path.join(root, "api", ...parts) + ".js";
  try { await fs.access(file); return file; } catch { return null; }
}

async function serveStatic(urlPath, res) {
  let filePath = path.normalize(path.join(root, decodeURIComponent(urlPath)));
  if (!filePath.startsWith(root + path.sep) && filePath !== root) return notFound(res);
  const relative = path.relative(root, filePath).split(path.sep)[0];
  if ([".git", "node_modules", "scripts", "db"].includes(relative) || relative.startsWith(".env")) return notFound(res);

  try {
    if ((await fs.stat(filePath)).isDirectory()) filePath = path.join(filePath, "index.html");
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  } catch {
    notFound(res);
  }
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not found");
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const file = await findApiFile(pathname);
    if (!file) return notFound(res);
    const mod = await import(pathToFileURL(file).href);
    return mod.default(req, res);
  }
  return serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`ECA website running at http://localhost:${PORT}`);
  console.log(`Admin login:          http://localhost:${PORT}/admin/login.html`);
  console.log(`Back-end check:       http://localhost:${PORT}/api/health`);
  console.log("Press Ctrl+C to stop.");
});
