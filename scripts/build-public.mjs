import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { site, pages, pageMarkdown } from "../src/public-content.js";
import { openapi } from "../server/openapi.mjs";
await mkdir("dist-server", { recursive: true });
// No static index: every page, including /, passes through HTTP negotiation.
await rename("dist/index.html", "dist-server/template.html");
await writeFile("dist/openapi.json", JSON.stringify(openapi, null, 2) + "\n");
const manifest = {
  $schema:
    "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  name: "io.github.danhqm/tsuyo",
  title: "Tsuyo Gymwear",
  description:
    "Read-only Tsuyo gymwear catalog, MYR prices, store status and public help pages.",
  version: "1.0.0",
  websiteUrl: site.url,
  repository: { url: "https://github.com/danhqm/Tsuyo", source: "github" },
  remotes: [{ type: "streamable-http", url: site.url + "/mcp" }],
};
await writeFile("dist/server.json", JSON.stringify(manifest, null, 2) + "\n");
await writeFile("dist/mcp.json", JSON.stringify(manifest, null, 2) + "\n");
const instructions = `# Tsuyo Gymwear\n\n> Gymwear for the everyday pursuit of strength. MYR prices. Public catalog, store status and help information.\n\n## When to use this\n\nUse Tsuyo to find tees, training shorts, pump covers or training sets; compare sizes and MYR prices; read fit and care; check store checkout and delivery status; or answer a public contact/privacy question.\n\n## How to use\n\n- Search GET /api/products?q=tee&category=men&limit=5, then GET /api/products/{id}. Prices are integer MYR minor units: 14900 is RM 149.00.\n- Check GET /api/store before proposing a purchase. Preview=true means illustrative products and prices. A sandbox payment does not create a fulfilment order or reserve inventory. Never infer sale readiness from a product result.\n- Public reads need no API key. Never send customer credentials. No order, payment, account or administration mutations are exposed.\n- Connect an MCP client to ${site.url}/mcp (Streamable HTTP); initialize, list tools, then call search_products, get_product, get_store_status or read_page. All are read-only.\n- Request any public page with Accept: text/markdown. HTML remains available with Accept: text/html. Missing pages return 404, not a successful app shell.\n- Errors include code, message and resolution. On 503 respect Retry-After. Fetch only the pages you need, use bounded catalog pagination and avoid rapid repeated calls.\n\n## API and tools\n\n- [Tsuyo API & Agent Docs](${site.url}/docs): endpoints, examples and MCP connection\n- [OpenAPI 3.0.3](${site.url}/openapi.json): typed operations and responses\n- [API index](${site.url}/api): public read-only surface\n- [Authentication](${site.url}/docs/auth): public reads and private account boundaries\n- [Errors](${site.url}/docs/errors): recovery guidance\n- [MCP server metadata](${site.url}/.well-known/mcp): registry-format discovery, not a claim of registry listing\n- [Full public guidance](${site.url}/llms-full.txt): expanded About, Contact, Privacy and developer pages\n\n## Store and trust\n\n- [Collection](${site.url}/shop): currently published catalog\n- [About](${site.url}/about): brand and preview status\n- [Contact](${site.url}/contact): public email, phone and postal code\n- [Privacy](${site.url}/privacy): storefront data practices\n- [Size guide](${site.url}/help/sizing): illustrative size guidance\n- [Delivery](${site.url}/help/delivery): delivery configuration\n- [Sitemap](${site.url}/sitemap.xml): indexable public pages\n`;
await writeFile("dist/llms.txt", instructions);
await writeFile(
  "dist/llms-full.txt",
  instructions +
    "\n\n" +
    Object.keys(pages).map(pageMarkdown).join("\n\n---\n\n"),
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\n\nSitemap: ${site.url}/sitemap.xml\n`,
);
console.log("Built public discovery files and SSR template.");
