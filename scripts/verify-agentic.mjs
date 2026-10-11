import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import SwaggerParser from "@apidevtools/swagger-parser";
import { XMLValidator, XMLParser } from "fast-xml-parser";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { pages, pageAliases } from "../src/public-content.js";
import { staticPaths, appPaths } from "../server/pages.mjs";
const base = (process.argv[2] || "https://tsuyo.vercel.app").replace(/\/$/, "");
const checks = [];
async function request(path, options = {}) {
  const r = await fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(25000),
  });
  const text = await r.text();
  return { r, text };
}
function record(path, r) {
  checks.push({
    path,
    status: r.status,
    type: r.headers.get("content-type"),
    vary: r.headers.get("vary"),
  });
}
const visible = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
for (const accept of ["text/html", "text/markdown"]) {
  const { r, text } = await request("/", { headers: { Accept: accept } });
  assert.equal(r.status, 200);
  assert.ok(r.headers.get("content-type").startsWith(accept));
  assert.match(r.headers.get("vary"), /Accept/i);
  assert.ok(visible(text).length > 500);
  if (accept === "text/html") {
    assert.match(text, /<h1/);
    assert.match(text, /rel="canonical" href="https:\/\/tsuyo.vercel.app\/"/);
    assert.match(text, /href="\/docs"/);
    assert.doesNotMatch(text, /stock_on_hand|stock_reserved|tsuyo-public-data/);
    const org = JSON.parse(
      text.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )[1],
    );
    assert.equal(org.contactPoint.email, "admin@tsuyo.com");
    assert.equal(org.address.postalCode, "52780");
    console.log("Raw homepage visible characters:", visible(text).length);
    const resources = [
      ...text.matchAll(/(?:src|href)="(\/(?:assets|fonts)\/[^"]+)"/g),
    ].map((m) => m[1]);
    for (const path of new Set(resources)) {
      const asset = await request(path);
      assert.equal(asset.r.status, 200, path);
      assert.ok(!asset.r.headers.get("content-type").includes("text/html"));
      record(path, asset.r);
    }
  }
  record("/ [" + accept + "]", r);
}
for (const path of [
  ...staticPaths.filter((p) => p !== "/"),
  ...Object.keys(pageAliases),
]) {
  for (const accept of ["text/html", "text/markdown"]) {
    const { r, text } = await request(path, { headers: { Accept: accept } });
    assert.equal(r.status, 200, path);
    assert.ok(r.headers.get("content-type").startsWith(accept), path);
    assert.match(r.headers.get("vary"), /Accept/i);
    if (
      ["/about", "/contact", "/privacy"].includes(path) &&
      accept === "text/html"
    )
      assert.ok(visible(text.match(/<main[\s\S]*?<\/main>/)[0]).length > 500);
    record(path + " [" + accept + "]", r);
  }
}
for (const path of [
  "/agentic-check-missing",
  "/help/agentic-check-missing",
  "/product/agentic-check-missing",
  "/assets/agentic-check-missing.css",
  "/agentic-check-missing?route=",
]) {
  for (const accept of ["text/html", "text/markdown"]) {
    const { r, text } = await request(path, { headers: { Accept: accept } });
    assert.equal(r.status, 404, path);
    assert.ok(r.headers.get("content-type").startsWith(accept));
    assert.ok(text.length > 20);
    record(path, r);
  }
}
const spec = await request("/openapi.json");
assert.equal(spec.r.status, 200);
await SwaggerParser.validate(JSON.parse(spec.text));
record("/openapi.json", spec.r);
const schema = JSON.parse(
  await readFile("tests/fixtures/mcp-server.schema.json", "utf8"),
);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
for (const path of ["/server.json", "/mcp.json", "/.well-known/mcp"]) {
  const { r, text } = await request(path);
  assert.equal(r.status, 200);
  assert.ok(r.headers.get("content-type").includes("json"));
  const manifest = JSON.parse(text);
  assert.equal(
    ajv.validate(schema, manifest),
    true,
    JSON.stringify(ajv.errors),
  );
  record(path, r);
}
for (const path of ["/llms.txt", "/llms-full.txt", "/robots.txt"]) {
  const { r, text } = await request(path);
  assert.equal(r.status, 200);
  assert.ok(!r.headers.get("content-type").includes("html"));
  assert.ok(text.length > 50);
  if (path.includes("llms")) assert.match(text, /When to use/);
  record(path, r);
}
const sitemap = await request("/sitemap.xml");
assert.equal(sitemap.r.status, 200);
assert.ok(sitemap.r.headers.get("content-type").includes("xml"));
assert.equal(XMLValidator.validate(sitemap.text), true);
record("/sitemap.xml", sitemap.r);
for (const entry of new XMLParser().parse(sitemap.text).urlset.url) {
  assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!appPaths.includes(new URL(entry.loc).pathname));
}
for (const path of [
  "/api",
  "/api/products",
  "/api/store",
  ...Object.keys(pages).map(
    (path) => "/api/pages?path=" + encodeURIComponent(path),
  ),
]) {
  const { r, text } = await request(path);
  assert.equal(r.status, 200, path);
  assert.ok(r.headers.get("content-type").startsWith("application/json"));
  JSON.parse(text);
  record(path, r);
}
const { text: catalog } = await request("/api/products?limit=50");
for (const p of JSON.parse(catalog).products) {
  assert.equal(p.currency, "MYR");
  const { r, text } = await request("/api/products/" + p.id);
  assert.equal(r.status, 200);
  assert.doesNotMatch(text, /stock_on_hand|stock_reserved|customer_id/);
  record("/api/products/" + p.id, r);
  for (const accept of ["text/html", "text/markdown"]) {
    const page = await request("/product/" + p.id, {
      headers: { Accept: accept },
    });
    assert.equal(page.r.status, 200);
    record("/product/" + p.id + " [" + accept + "]", page.r);
  }
}
for (const [path, status] of [
  ["/api/agentic-check-missing", 404],
  ["/api/products/agentic-check-missing", 404],
  ["/api/products?limit=0", 400],
  ["/api/pages?path=/admin", 404],
]) {
  const { r, text } = await request(path);
  assert.equal(r.status, status);
  assert.ok(
    r.headers.get("content-type").startsWith("application/problem+json"),
  );
  const p = JSON.parse(text);
  assert.ok(p.code && p.message && p.resolution);
  record(path, r);
}
const options = await request("/api/products", { method: "OPTIONS" });
assert.equal(options.r.status, 204);
const head = await request("/", { method: "HEAD" });
assert.equal(head.r.status, 200);
assert.equal(head.text, "");
record("HEAD /", head.r);
const client = new Client({
  name: "tsuyo-live-verification",
  version: "1.0.0",
});
try {
  await client.connect(
    new StreamableHTTPClientTransport(new URL(base + "/mcp")),
  );
  const { tools } = await client.listTools();
  assert.equal(tools.length, 4);
  assert.ok(tools.every((t) => t.annotations.readOnlyHint));
  for (const [name, args] of [
    ["search_products", { limit: 2 }],
    ["get_product", { id: JSON.parse(catalog).products[0].id }],
    ["get_store_status", {}],
    ["read_page", { path: "/contact" }],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, name);
    checks.push({ path: "MCP " + name, status: "passed" });
  }
} finally {
  await client.close();
}
const denied = await request("/mcp", {
  method: "POST",
  headers: {
    Origin: "https://invalid.example",
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
assert.equal(denied.r.status, 403);
const get = await request("/mcp", { headers: { Accept: "text/event-stream" } });
assert.equal(get.r.status, 405);
await mkdir("tmp", { recursive: true });
await writeFile(
  "tmp/agentic-live-verification.json",
  JSON.stringify(
    { base, verified_at: new Date().toISOString(), checks },
    null,
    2,
  ),
);
console.log(`Passed ${checks.length} live HTTP and MCP checks at ${base}.`);
