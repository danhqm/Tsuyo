import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { XMLValidator, XMLParser } from "fast-xml-parser";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { render } from "../dist-server/entry-server.js";
import {
  previewSnapshot,
  mapPublicRow,
  loadPublicStore,
  productDTO,
  storeDTO,
} from "../server/public-store.mjs";
import { createPublicHandler } from "../server/public-api.mjs";
import { createPageHandler, safeJSON } from "../server/page-handler.mjs";
import { createMcpHandler } from "../server/mcp.mjs";
import { representation, PublicError } from "../server/http.mjs";
import { sitemapFor, staticPaths, appPaths } from "../server/pages.mjs";
import {
  pages,
  pageAliases,
  pageMarkdown,
  site,
} from "../src/public-content.js";
import { openapi } from "../server/openapi.mjs";
const template = await readFile(
  new URL("../dist-server/template.html", import.meta.url),
  "utf8",
);
const snapshot = previewSnapshot();
snapshot.payment = {
  mode: "test",
  configured: true,
  sandbox_bag_enabled: true,
};
const load = async () => snapshot;
const visible = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
async function host(handler) {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
async function withHost(handler, fn) {
  const server = await host(handler);
  try {
    await fn(server.base);
  } finally {
    await server.close();
  }
}
const pageHandler = createPageHandler({ load, render, template });
test("raw homepage preserves campaign content, links, heading sequence and identity", async () =>
  withHost(pageHandler, async (base) => {
    const r = await fetch(base + "/", { headers: { Accept: "text/html" } }),
      body = await r.text();
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /^text\/html/);
    assert.match(r.headers.get("vary"), /Accept/i);
    assert.ok(visible(body).length >= 500);
    assert.equal([...body.matchAll(/<h1[ >]/g)].length, 1);
    const headings = [...body.matchAll(/<h([1-6])[ >]/g)].map((m) =>
      Number(m[1]),
    );
    assert.equal(headings[0], 1);
    for (let i = 1; i < headings.length; i++)
      assert.ok(headings[i] <= headings[i - 1] + 1);
    assert.match(body, /<title>Tsuyo Gymwear/);
    assert.match(body, /rel="canonical" href="https:\/\/tsuyo.vercel.app\/"/);
    assert.match(body, /<html lang="en"/);
    assert.match(body, /property="og:type" content="website"/);
    assert.match(
      body,
      /property="og:image" content="https:\/\/tsuyo.vercel.app\/assets/,
    );
    assert.match(body, /href="\/docs"/);
    assert.match(body, /campaign-hero.webp/);
    assert.doesNotMatch(
      body,
      /tsuyo-public-data|stock_on_hand|stock_reserved|access_token/,
    );
    const org = JSON.parse(
      body.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )[1],
    );
    assert.equal(org["@type"], "Organization");
    assert.equal(org.contactPoint.email, "admin@tsuyo.com");
    assert.equal(org.contactPoint.telephone, "0123456789");
    assert.equal(org.address.postalCode, "52780");
    assert.equal(org.address["@type"], "PostalAddress");
    assert.equal(org.address.streetAddress, undefined);
  }));
test("homepage negotiates Markdown; quality weights, defaults and refusals work", async () => {
  assert.equal(representation(), "html");
  assert.equal(representation("text/markdown"), "markdown");
  assert.equal(representation("text/html"), "html");
  assert.equal(representation("text/markdown;q=0.2,text/html;q=0.8"), "html");
  assert.equal(representation("text/markdown,*/*;q=0.5"), "markdown");
  assert.equal(representation("text/markdown;q=0,*/*"), "html");
  assert.equal(representation("application/json"), null);
  await withHost(pageHandler, async (base) => {
    const r = await fetch(base + "/", { headers: { Accept: "text/markdown" } }),
      body = await r.text();
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /^text\/markdown/);
    assert.equal(r.headers.get("vary"), "Accept");
    assert.ok(body.length > 500);
    assert.match(body, /^# Tsuyo Gymwear/);
    assert.match(body, /illustrative/);
    assert.doesNotMatch(body, /<div/);
    const refused = await fetch(base + "/", {
      headers: { Accept: "application/json" },
    });
    assert.equal(refused.status, 406);
  });
});
test("every public page and alias has meaningful HTML and Markdown; unknown paths are real 404", async () =>
  withHost(pageHandler, async (base) => {
    for (const path of [
      ...staticPaths,
      ...Object.keys(pageAliases),
      ...snapshot.products.map((p) => "/product/" + p.id),
      ...appPaths,
    ]) {
      for (const accept of ["text/html", "text/markdown"]) {
        const r = await fetch(base + path, { headers: { Accept: accept } });
        const body = await r.text();
        assert.equal(r.status, 200, path + accept);
        assert.ok(body.length > 20);
        assert.match(r.headers.get("content-type"), new RegExp("^" + accept));
        if (
          accept === "text/html" &&
          ["/about", "/contact", "/privacy"].includes(path)
        )
          assert.ok(
            visible(body.match(/<main[\s\S]*?<\/main>/)[0]).length >= 500,
          );
      }
    }
    for (const path of [
      "/missing-agent-page",
      "/help/missing",
      "/product/missing",
      "/assets/not-a-file.css",
      "/docs/nothing",
    ]) {
      for (const accept of ["text/html", "text/markdown"]) {
        const r = await fetch(base + path, { headers: { Accept: accept } });
        const body = await r.text();
        assert.equal(r.status, 404, path);
        assert.match(r.headers.get("content-type"), new RegExp("^" + accept));
        if (accept === "text/markdown") {
          assert.ok(body.length > 20);
          assert.match(body, /llms.txt/);
          assert.match(body, /sitemap.xml/);
        } else assert.match(body, /noindex/);
      }
    }
    const head = await fetch(base + "/contact", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    const post = await fetch(base + "/contact", { method: "POST" });
    assert.equal(post.status, 405);
  }));
test("product availability renders accurately without exact inventory data", async () => {
  const row = {
    id: "real-tee",
    name: "Real Tee",
    description: "Public",
    category: "men",
    product_type: "T-shirts",
    color: "Black",
    color_hex: "#111111",
    image_url: "/assets/core-tee.webp",
    collection: "CORE",
    fit: "Relaxed",
    details: [],
    care: "Cold wash",
    is_demo: false,
    updated_at: "2026-10-11T00:00:00Z",
    internal_note: "private",
    product_variants: [
      {
        id: "a",
        size: "S",
        price_minor: 10000,
        stock_on_hand: 73,
        stock_reserved: 2,
        active: true,
        sku: "internal",
      },
      {
        id: "b",
        size: "M",
        price_minor: 11000,
        stock_on_hand: 0,
        stock_reserved: 0,
        active: true,
      },
      { size: "L", active: false },
    ],
  };
  const p = mapPublicRow(row),
    dto = productDTO(p),
    s = { ...snapshot, products: [p], preview: false };
  assert.equal(dto.available, true);
  assert.equal(dto.variants[1].available, false);
  assert.doesNotMatch(
    JSON.stringify(p),
    /stock_on_hand|stock_reserved|internal_note|sku/,
  );
  assert.doesNotMatch(
    JSON.stringify(dto),
    /stock_on_hand|stock_reserved|internal_note|"id":"a"/,
  );
  const html = render("/product/real-tee", s);
  assert.match(html, /aria-pressed="false" disabled=""[^>]*>M<\/button>/);
  assert.doesNotMatch(html, /stock_on_hand|stock_reserved/);
});
test("public data fetch stays anonymous, projects fields, handles empty store and fails closed", async () => {
  const calls = [],
    env = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    };
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const value = url.includes("store_settings")
      ? [{ name: "Tsuyo", currency: "MYR", checkout_enabled: false }]
      : url.includes("functions")
        ? {
            mode: "test",
            configured: true,
            sandbox_bag_enabled: true,
            secret: "never return",
          }
        : [];
    return { ok: true, json: async () => value };
  };
  const s = await loadPublicStore({ env, fetcher });
  assert.equal(s.products.length, 4);
  assert.equal(s.preview, true);
  assert.equal(storeDTO(s).checkout_enabled, false);
  assert.equal(calls.length, 4);
  assert.ok(calls.every((c) => !c.options.headers.Authorization));
  assert.ok(
    calls.every((c) => c.options.headers.apikey === "sb_publishable_test"),
  );
  assert.doesNotMatch(JSON.stringify(s), /never return|sb_publishable/);
  assert.ok(calls[0].url.includes("status=eq.active"));
  assert.ok(
    calls.every(
      (c) => !c.url.includes("profiles") && !c.url.includes("orders"),
    ),
  );
  assert.equal(JSON.parse(calls[3].options.body).action, "payments");
  await assert.rejects(
    loadPublicStore({ env: {}, fetcher }),
    (e) => e.status === 503,
  );
  await assert.rejects(
    loadPublicStore({ env, fetcher: async () => ({ ok: false }) }),
    (e) => e.status === 503 && e.code === "store_unavailable",
  );
});
test("public API reads, search validation, pagination, CORS and problem recovery", async () =>
  withHost(createPublicHandler(load), async (base) => {
    const index = await (await fetch(base + "/api")).json();
    assert.equal(index.read_only, true);
    for (const path of [
      "/api/products",
      "/api/products/core-oversized-tee",
      "/api/store",
      "/api/pages?path=/contact",
    ]) {
      const r = await fetch(base + path);
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type"), /^application\/json/);
      assert.equal(r.headers.get("access-control-allow-origin"), "*");
    }
    const search = await (
      await fetch(base + "/api/products?q=tee&category=men&limit=1&offset=1")
    ).json();
    assert.equal(search.total, 1);
    assert.equal(search.products.length, 0);
    const women = await (
      await fetch(base + "/api/products?category=women")
    ).json();
    assert.equal(women.products.length, 1);
    assert.equal(women.products[0].preview, true);
    assert.equal(women.products[0].available, false);
    for (const query of [
      "limit=0",
      "limit=51",
      "limit=1.5",
      "offset=-1",
      "category=bad",
      "q=" + "x".repeat(101),
      "limit=1&limit=2",
      "unknown=1",
    ]) {
      const r = await fetch(base + "/api/products?" + query),
        p = await r.json();
      assert.equal(r.status, 400, query);
      assert.match(
        r.headers.get("content-type"),
        /^application\/problem\+json/,
      );
      assert.equal(p.code, "invalid_parameter");
      assert.ok(p.message && p.resolution);
    }
    for (const path of [
      "/api/nope",
      "/api/products/nope",
      "/api/pages?path=/admin",
      "/api/pages?path=/account",
    ]) {
      const r = await fetch(base + path),
        p = await r.json();
      assert.equal(r.status, 404);
      assert.equal(p.code, "not_found");
    }
    const post = await fetch(base + "/api/products", { method: "POST" });
    assert.equal(post.status, 405);
    assert.equal((await post.json()).code, "method_not_allowed");
    const options = await fetch(base + "/api/products", { method: "OPTIONS" });
    assert.equal(options.status, 204);
    const head = await fetch(base + "/api/products", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  }));
test("upstream failures never leak secrets and retain structured errors", async () => {
  const fail = async () => {
    throw new Error("secret upstream details");
  };
  await withHost(createPublicHandler(fail), async (base) => {
    const r = await fetch(base + "/api/products"),
      p = await r.json();
    assert.equal(r.status, 503);
    assert.equal(r.headers.get("retry-after"), "30");
    assert.equal(p.code, "store_unavailable");
    assert.doesNotMatch(JSON.stringify(p), /secret/);
  });
  await withHost(
    createPageHandler({ render, template, load: fail }),
    async (base) => {
      const r = await fetch(base + "/", {
        headers: { Accept: "text/markdown" },
      });
      assert.equal(r.status, 503);
      assert.match(await r.text(), /retry/i);
    },
  );
});
test("OpenAPI parses, operation IDs and types support function calling, responses validate", async () => {
  const parsed = await SwaggerParser.validate(structuredClone(openapi));
  assert.equal(parsed.openapi, "3.0.3");
  const ids = [];
  for (const path of Object.values(openapi.paths)) {
    for (const op of Object.values(path)) {
      assert.ok(op.operationId && op.description);
      ids.push(op.operationId);
      for (const param of op.parameters) assert.ok(param.schema.type);
      assert.ok(op.responses[200].content["application/json"].schema);
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  for (const name of Object.keys(parsed.components.schemas))
    ajv.addSchema(parsed.components.schemas[name], name);
  assert.equal(ajv.validate("Product", productDTO(snapshot.products[0])), true);
  assert.equal(ajv.validate("StoreStatus", storeDTO(snapshot)), true);
  assert.deepEqual(
    JSON.parse(await readFile("dist/openapi.json", "utf8")),
    openapi,
  );
});
test("discovery files follow registry schema, XML and llms instructions", async () => {
  const schema = JSON.parse(
    await readFile("tests/fixtures/mcp-server.schema.json", "utf8"),
  );
  const manifest = JSON.parse(await readFile("dist/server.json", "utf8"));
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  assert.equal(
    ajv.validate(schema, manifest),
    true,
    JSON.stringify(ajv.errors),
  );
  assert.equal(manifest.remotes[0].type, "streamable-http");
  assert.equal(manifest.remotes[0].url, site.url + "/mcp");
  assert.deepEqual(
    manifest,
    JSON.parse(await readFile("dist/mcp.json", "utf8")),
  );
  const sitemap = sitemapFor(snapshot);
  assert.equal(XMLValidator.validate(sitemap), true);
  const xml = new XMLParser().parse(sitemap);
  const urls = xml.urlset.url;
  assert.equal(urls.length, staticPaths.length + 4);
  for (const url of urls) {
    assert.ok(url.loc.startsWith(site.url));
    assert.match(url.lastmod, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!appPaths.includes(new URL(url.loc).pathname));
  }
  const llms = await readFile("dist/llms.txt", "utf8"),
    full = await readFile("dist/llms-full.txt", "utf8"),
    robots = await readFile("dist/robots.txt", "utf8");
  assert.match(llms, /## When to use this/);
  for (const tool of [
    "search_products",
    "get_product",
    "get_store_status",
    "read_page",
  ])
    assert.match(llms, new RegExp(tool));
  assert.match(llms, /No order, payment, account/);
  assert.match(full, /admin@tsuyo.com/);
  assert.match(robots, /Sitemap: https:\/\/tsuyo.vercel.app\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow: \/\n/);
  assert.ok(
    !(await readFile("dist-server/template.html", "utf8").then((s) =>
      s.includes("admin@tsuyo.com"),
    )),
  );
});
test("JSON-LD serialization is safe against closing-script injection", () => {
  assert.doesNotMatch(
    safeJSON({ name: "</script><script>evil" }),
    /<\/script>/,
  );
  assert.equal(JSON.parse(safeJSON({ name: "</script>" })).name, "</script>");
});
test("official MCP client initializes, lists typed read-only tools and calls every tool", async () =>
  withHost(createMcpHandler(load), async (base) => {
    const client = new Client({ name: "tsuyo-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(base + "/mcp"));
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      assert.deepEqual(tools.map((t) => t.name).sort(), [
        "get_product",
        "get_store_status",
        "read_page",
        "search_products",
      ]);
      for (const t of tools) {
        assert.equal(t.annotations.readOnlyHint, true);
        assert.equal(t.annotations.destructiveHint, false);
        assert.equal(t.inputSchema.type, "object");
        assert.equal(t.outputSchema.type, "object");
        assert.ok(t.description);
      }
      const search = await client.callTool({
        name: "search_products",
        arguments: { category: "women" },
      });
      assert.equal(search.structuredContent.products.length, 1);
      const product = await client.callTool({
        name: "get_product",
        arguments: { id: "training-shorts" },
      });
      assert.equal(product.structuredContent.price_minor, 12900);
      const store = await client.callTool({
        name: "get_store_status",
        arguments: {},
      });
      assert.equal(store.structuredContent.payment_mode, "test");
      const page = await client.callTool({
        name: "read_page",
        arguments: { path: "/contact" },
      });
      assert.match(page.structuredContent.markdown, /0123456789/);
      const missing = await client.callTool({
        name: "get_product",
        arguments: { id: "nope" },
      });
      assert.equal(missing.isError, true);
      assert.equal(JSON.parse(missing.content[0].text).code, "not_found");
      const invalid = await client.callTool({
        name: "search_products",
        arguments: { limit: 100 },
      });
      assert.equal(invalid.isError, true);
      const privatePage = await client.callTool({
        name: "read_page",
        arguments: { path: "/admin" },
      });
      assert.equal(privatePage.isError, true);
    } finally {
      await client.close();
    }
  }));
test("MCP transport validates Origin, version, JSON-RPC, notifications and unsupported streams", async () =>
  withHost(createMcpHandler(load), async (base) => {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    const call = (body, extra = {}) =>
      fetch(base + "/mcp", {
        method: "POST",
        headers: { ...headers, ...extra },
        body: JSON.stringify(body),
      });
    const denied = await call(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { Origin: "https://evil.example" },
    );
    assert.equal(denied.status, 403);
    const init = await call({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    });
    assert.equal(init.status, 200);
    assert.equal(init.headers.get("mcp-session-id"), null);
    assert.equal((await init.json()).result.protocolVersion, "2025-11-25");
    const notification = await call({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    assert.equal(notification.status, 202);
    assert.equal(await notification.text(), "");
    const version = await call(
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { "MCP-Protocol-Version": "1900-01-01" },
    );
    assert.equal(version.status, 400);
    const stream = await fetch(base + "/mcp", {
      headers: { Accept: "text/event-stream" },
    });
    assert.equal(stream.status, 405);
    const invalid = await call({ nonsense: true });
    assert.equal(invalid.status, 400);
  }));

test("client and server metadata share canonical titles and noindex boundaries", async () => {
  const { pageMetadata } = await import("../src/page-metadata.mjs");
  assert.equal(pageMetadata("/nope").title, "Page Not Found | Tsuyo");
  for (const path of ["/nope", "/help/nope", "/product/nope", ...appPaths])
    assert.equal(pageMetadata(path).robots, "noindex, nofollow");
  assert.equal(
    pageMetadata("/product/real-tee", "Real Tee").title,
    "Real Tee | Tsuyo Gymwear",
  );
  assert.equal(pageMetadata("/developers").canonical, site.url + "/docs");
  assert.equal(pageMetadata("/help/privacy").canonical, site.url + "/privacy");
  assert.match(pageMetadata("/").title, /Tsuyo Gymwear/);
  const fail = async () => {
    throw new Error("upstream");
  };
  await withHost(
    createPageHandler({ render, template, load: fail }),
    async (base) => {
      const r = await fetch(base + "/", { headers: { Accept: "text/html" } });
      const html = await r.text();
      assert.equal(r.status, 503);
      assert.equal(r.headers.get("retry-after"), "30");
      assert.match(html, /rel="stylesheet"/);
      assert.match(html, /id="main-content"/);
      assert.match(html, /href="\/contact"/);
      assert.match(html, /noindex, nofollow/);
      assert.match(html, /PLEASE TRY AGAIN/);
    },
  );
});

test("a product slug on a missing or private route cannot change indexing or title", async () => {
  const { pageMetadata } = await import("../src/page-metadata.mjs");
  for (const path of [
    "/missing/core-oversized-tee",
    "/product/missing/core-oversized-tee",
    "/help/core-oversized-tee",
  ]) {
    assert.equal(
      pageMetadata(path, "Core Oversized Tee").robots,
      "noindex, nofollow",
    );
    assert.equal(
      pageMetadata(path, "Core Oversized Tee").title,
      "Page Not Found | Tsuyo",
    );
  }
  assert.equal(
    pageMetadata("/account", "Core Oversized Tee").title,
    "Your Tsuyo Account",
  );
});

test("server rendering honors public shop filters and the explicit root rewrite", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.equal(config.rewrites[0].source, "/");
  assert.equal(config.rewrites[0].destination, "/api/page?route=/");
  await withHost(pageHandler, async (base) => {
    const r = await fetch(base + "/shop?category=women", {
      headers: { Accept: "text/html" },
    });
    const body = await r.text();
    assert.equal(r.status, 200);
    assert.match(body, /WOMEN’S COLLECTION/);
    assert.match(body, /Form Training Set/);
    assert.doesNotMatch(body, /Core Oversized Tee/);
  });
});

test("production SSR bundles the browser animation dependency for Node interoperability", async () => {
  const bundle = await readFile("dist-server/entry-server.js", "utf8");
  assert.doesNotMatch(bundle, /from "(?:gsap(?:\/ScrollTrigger)?|react-router-dom|react-router)"/);
});

test("production preview serves assets, discovery, negotiated pages and bounded public API", async () => {
  const { createSiteHandler } = await import("../server/site-handler.mjs");
  await withHost(
    createSiteHandler({ render, template, load }),
    async (base) => {
      for (const path of [
        "/favicon.svg",
        "/fonts/barlow-condensed-700.ttf",
        "/assets/core-tee.webp",
        "/openapi.json",
        "/.well-known/mcp",
        "/llms.txt",
        "/sitemap.xml",
        "/api/products",
      ]) {
        const r = await fetch(base + path);
        assert.equal(r.status, 200, path);
        await r.arrayBuffer();
      }
      const root = await fetch(base + "/", {
        headers: { Accept: "text/markdown" },
      });
      assert.equal(root.status, 200);
      assert.match(root.headers.get("content-type"), /^text\/markdown/);
      assert.match(await root.text(), /^# Tsuyo Gymwear/);
      for (const path of [
        "/dist-server/template.html",
        "/.env.local",
        "/missing.css",
      ]) {
        const r = await fetch(base + path);
        assert.equal(r.status, 404);
      }
    },
  );
});
