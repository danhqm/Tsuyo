import { site, pageAliases } from "../src/public-content.js";
import {
  knownPage,
  appPaths,
  markdownFor,
  metadataTitle,
  organization,
} from "./pages.mjs";
import { loadPublicStore, previewSnapshot } from "./public-store.mjs";
import {
  representation,
  routedPath,
  readonlyMethod,
  PublicError,
  send,
} from "./http.mjs";
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const safeJSON = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
export function htmlPage(template, markup, path, s, status) {
  const title =
      status >= 500 ? "Tsuyo Temporarily Unavailable" : metadataTitle(path, s),
    canonical = site.url + (pageAliases[path] || path),
    noindex = status !== 200 || appPaths.includes(path);
  const description =
    path === "/"
      ? "Tsuyo gymwear for the everyday pursuit. Explore oversized tees, training shorts, pump covers and training sets in MYR."
      : title + ". Public information from Tsuyo Gymwear.";
  const head = `<title>${escapeHTML(title)}</title><meta name="description" content="${escapeHTML(description)}"><link rel="canonical" href="${escapeHTML(canonical)}"><meta name="robots" content="${noindex ? "noindex, nofollow" : "index, follow"}"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${escapeHTML(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${site.url}/assets/campaign-hero.webp"><script type="application/ld+json">${safeJSON(organization)}</script>`;
  // No catalog data script or user state is serialized to the browser.
  return template
    .replace(/<title>[\s\S]*?<\/title>/, " ")
    .replace(/<meta\s+(?:name="description"|property="og:[^"]+")[^>]*>/g, "")
    .replace("</head>", head + "</head>")
    .replace(
      /<!--tsuyo:app:start-->[\s\S]*?<!--tsuyo:app:end-->/,
      `<div id="root">${markup}</div>`,
    );
}
export function createPageHandler({
  load = loadPublicStore,
  render,
  template,
}) {
  return async (req, res) => {
    res.setHeader("Vary", "Accept");
    const type = representation(req.headers.accept),
      path = routedPath(req);
    let status = 200,
      s = previewSnapshot();
    try {
      if (!readonlyMethod(req, res)) return;
      if (!type) {
        send(
          res,
          406,
          "text/plain",
          "Request text/html or text/markdown.",
          req.method,
        );
        return;
      }
      if (!knownPage(path, s) && !path.startsWith("/product/")) status = 404;
      else if (["/", "/shop"].includes(path) || path.startsWith("/product/"))
        s = await load();
      if (!knownPage(path, s)) status = 404;
      let body;
      if (type === "markdown") body = markdownFor(path, s);
      else
        body = htmlPage(
          template,
          render(
            status === 404
              ? "/tsuyo-page-not-found"
              : path +
                  (["/shop"].includes(path)
                    ? "?" + new URL(req.url, site.url).searchParams.toString()
                    : ""),
            s,
          ),
          path,
          s,
          status,
        );
      send(
        res,
        status,
        type === "markdown" ? "text/markdown" : "text/html",
        body,
        req.method,
      );
    } catch (error) {
      status = error instanceof PublicError ? error.status : 503;
      if (status === 503) {
        res.setHeader("Retry-After", "30");
        console.error("public_page_store_unavailable");
      }
      const message =
        status === 405
          ? "This page is read-only. Use GET or HEAD."
          : "The store could not load public data. Please retry after 30 seconds or visit /contact.";
      send(
        res,
        status,
        type === "markdown" ? "text/markdown" : "text/html",
        type === "markdown"
          ? `# Request unavailable\n\n${message}\n\n[Tsuyo docs](${site.url}/docs)\n`
          : htmlPage(
              template,
              render(path, previewSnapshot(), message),
              path,
              previewSnapshot(),
              status,
            ),
        req.method,
      );
    }
  };
}
