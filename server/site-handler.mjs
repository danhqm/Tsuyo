import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createPageHandler } from "./page-handler.mjs";
import { createPublicHandler } from "./public-api.mjs";
import { createMcpHandler } from "./mcp.mjs";
import { loadPublicStore } from "./public-store.mjs";
import { sitemapFor } from "./pages.mjs";
import { send, sendProblem, readonlyMethod } from "./http.mjs";
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".txt": "text/plain",
};
export function createSiteHandler({
  render,
  template,
  load = loadPublicStore,
  directory = "dist",
  allowedOrigins,
}) {
  const page = createPageHandler({ render, template, load }),
    api = createPublicHandler(load),
    mcp = createMcpHandler(load, { allowedOrigins }),
    root = resolve(directory);
  return async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname;
    if (path === "/mcp") return mcp(req, res);
    if (path === "/api" || path.startsWith("/api/")) return api(req, res);
    if (path === "/sitemap.xml") {
      try {
        if (!readonlyMethod(req, res)) return;
        send(res, 200, "application/xml", sitemapFor(await load()), req.method);
      } catch (error) {
        sendProblem(res, error, req.method);
      }
      return;
    }
    let file;
    try {
      file = resolve(
        root,
        "." +
          (path === "/.well-known/mcp"
            ? "/mcp.json"
            : decodeURIComponent(path)),
      );
    } catch {
      return page(req, res);
    }
    if (file.startsWith(root + sep) && ["GET", "HEAD"].includes(req.method)) {
      try {
        if ((await stat(file)).isFile()) {
          const body = await readFile(file);
          const extension = file.slice(file.lastIndexOf("."));
          res.statusCode = 200;
          res.setHeader(
            "Content-Type",
            types[extension] || "application/octet-stream",
          );
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.end(req.method === "HEAD" ? undefined : body);
          return;
        }
      } catch {
        /* Missing files go through the genuine 404 page. */
      }
    }
    return page(req, res);
  };
}
