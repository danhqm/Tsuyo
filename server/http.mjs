export class PublicError extends Error {
  constructor(status, code, message, resolution) {
    super(message);
    Object.assign(this, { status, code, resolution });
  }
}
export function problem(error) {
  const known = error instanceof PublicError;
  return {
    type: "about:blank",
    title: known ? error.code : "store_unavailable",
    status: known ? error.status : 503,
    code: known ? error.code : "store_unavailable",
    message: known
      ? error.message
      : "Public store data is temporarily unavailable.",
    detail: known
      ? error.message
      : "Public store data is temporarily unavailable.",
    resolution: known
      ? error.resolution
      : "Retry after 30 seconds. See /docs/errors for guidance.",
  };
}
export function send(res, status, type, body, method = "GET") {
  res.statusCode = status;
  res.setHeader("Content-Type", type + "; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.end(method === "HEAD" ? undefined : body);
}
export function sendProblem(res, error, method) {
  const p = problem(error);
  if (p.status === 503) res.setHeader("Retry-After", "30");
  send(res, p.status, "application/problem+json", JSON.stringify(p), method);
}
export function routedPath(req) {
  const url = new URL(req.url, "https://tsuyo.vercel.app");
  const route = req.query?.route ?? url.searchParams.get("route");
  return typeof route === "string"
    ? "/" + route.replace(/^\/+/, "")
    : url.pathname;
}
export function representation(accept = "*/*") {
  const entries = accept.split(",").map((item, index) => {
    const [type, ...params] = item.trim().toLowerCase().split(";");
    const raw = params.find((p) => p.trim().startsWith("q="));
    const q = raw ? Number(raw.trim().slice(2)) : 1;
    return { type, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, index };
  });
  function score(type) {
    const matches = entries
      .filter((e) => e.type === type || e.type === "text/*" || e.type === "*/*")
      .map((e) => ({
        ...e,
        specificity: e.type === type ? 2 : e.type === "text/*" ? 1 : 0,
      }))
      .sort((a, b) => b.specificity - a.specificity || a.index - b.index);
    return matches[0] || { q: 0, specificity: -1, index: Infinity };
  }
  const md = score("text/markdown"),
    html = score("text/html");
  if (!md.q && !html.q) return null;
  return md.q > html.q || (md.q === html.q && md.specificity > html.specificity)
    ? "markdown"
    : "html";
}
export const notFound = () =>
  new PublicError(
    404,
    "not_found",
    "The requested public resource does not exist.",
    "Start at /docs, /api, /llms.txt or /sitemap.xml.",
  );
export function readonlyMethod(req, res) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  res.setHeader("Allow", "GET, HEAD, OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return false;
  }
  throw new PublicError(
    405,
    "method_not_allowed",
    "This resource is read-only.",
    "Use GET or HEAD. See /docs.",
  );
}
