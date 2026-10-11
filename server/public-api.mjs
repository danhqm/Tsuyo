import {
  loadPublicStore,
  productDTO,
  storeDTO,
  searchProducts,
} from "./public-store.mjs";
import { pages, pageMarkdown, site } from "../src/public-content.js";
import {
  PublicError,
  notFound,
  routedPath,
  readonlyMethod,
  send,
  sendProblem,
} from "./http.mjs";
export const apiIndex = {
  name: "Tsuyo Gymwear Public API",
  version: "1.0.0",
  authentication: "none",
  read_only: true,
  documentation: site.url + "/docs",
  openapi: site.url + "/openapi.json",
  mcp: site.url + "/mcp",
  endpoints: [
    "/api/products",
    "/api/products/{id}",
    "/api/store",
    "/api/pages?path=/contact",
  ],
};
function invalid(name, hint) {
  throw new PublicError(
    400,
    "invalid_parameter",
    `Invalid ${name} parameter.`,
    hint,
  );
}
export function searchParameters(params) {
  for (const key of params.keys())
    if (!["q", "category", "limit", "offset", "route"].includes(key))
      invalid(
        key,
        "Use q, category, limit and offset as documented in /openapi.json.",
      );
  for (const key of ["q", "category", "limit", "offset"])
    if (params.getAll(key).length > 1)
      invalid(key, "Supply each parameter once.");
  const q = params.get("q") || "",
    category = params.get("category") || undefined;
  if (q.length > 100) invalid("q", "Keep q at 100 characters or fewer.");
  if (category && !["men", "women", "unisex"].includes(category))
    invalid("category", "Use men, women or unisex, or omit category.");
  const integer = (name, defaultValue, min, max) => {
    const raw = params.get(name);
    if (raw === null) return defaultValue;
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max)
      invalid(name, `Use an integer from ${min} to ${max}.`);
    return Number(raw);
  };
  return {
    q,
    category,
    limit: integer("limit", 20, 1, 50),
    offset: integer("offset", 0, 0, 10000),
  };
}
export function createPublicHandler(load = loadPublicStore) {
  return async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Accept");
    try {
      if (!readonlyMethod(req, res)) return;
      const path = routedPath(req),
        url = new URL(req.url, site.url);
      let body;
      if (path === "/api" || path === "/api/") body = apiIndex;
      else if (path === "/api/products") {
        const query = searchParameters(url.searchParams);
        body = searchProducts(await load(), query);
      } else if (/^\/api\/products\/[a-z0-9-]+$/.test(path)) {
        const s = await load(),
          p = s.products.find((p) => path === "/api/products/" + p.id);
        if (!p) throw notFound();
        body = productDTO(p);
      } else if (path === "/api/store") body = storeDTO(await load());
      else if (path === "/api/pages") {
        const pagePath = url.searchParams.get("path");
        if (!pages[pagePath]) throw notFound();
        body = {
          path: pagePath,
          url: site.url + pagePath,
          markdown: pageMarkdown(pagePath),
        };
      } else throw notFound();
      send(res, 200, "application/json", JSON.stringify(body), req.method);
    } catch (error) {
      if (!(error instanceof PublicError)) console.error("public_api_failed");
      sendProblem(res, error, req.method);
    }
  };
}
