# Tsuyo public API and agent readiness

Canonical site: https://tsuyo.vercel.app. Developer entry: https://tsuyo.vercel.app/docs.

## Architecture

Vite builds the unchanged interactive storefront into `dist/` and a self-contained anonymous React server renderer into `dist-server/`. The build moves the HTML template outside the static directory so the homepage cannot bypass content negotiation. Vercel's explicit root rewrite and page handler return the existing React markup for HTML, public content for Markdown, and real 404 responses for missing pages. `Vary: Accept` and `Cache-Control: no-store` prevent representation or customer-state mixing. Private account, checkout and admin URLs remain reachable for the browser and are excluded from indexing.

The server uses the existing Supabase publishable key and anonymous policies, never a service-role key or incoming customer bearer token. Public data is explicitly projected. Exact inventory counts, private customer data, orders and privileged operations are absent from the new outputs. Active published products are fetched at request time; the illustrative fallback appears only when no active catalog exists and live checkout is closed. Upstream failures return 503 and recovery guidance rather than fabricated availability. The client still initializes its existing local bag/account state and refreshes from Supabase; no server snapshot or session is serialized into HTML.

## Public resources

- `/api`: API index; no authentication.
- `/api/products`: bounded search with `q`, `category`, `limit`, `offset`.
- `/api/products/{id}`: price, sizes, fit, care, preview and availability flags.
- `/api/store`: current checkout, payment mode, sandbox and delivery configuration.
- `/api/pages?path=/contact`: enumerated public information pages as Markdown in JSON.
- `/openapi.json`: validated OpenAPI 3.0.3 with unique operation IDs, typed inputs, response schemas and RFC 9457 problems.
- `/mcp`: official SDK Streamable HTTP; stateless JSON responses. Tools: `search_products`, `get_product`, `get_store_status`, `read_page`. Read-only annotations and typed input/output schemas; Origin validation; no purchase or private data access. GET returns 405 because unsolicited SSE is not offered.
- `/.well-known/mcp`, `/mcp.json`, `/server.json`: MCP Registry server.json-format metadata, validated against the pinned official schema. Metadata publication is not registry publication or verification.
- `/llms.txt`, `/llms-full.txt`, `/robots.txt`, `/sitemap.xml`: usage guidance, expanded public content, crawler guidance and live XML sitemap with last-modified dates.
- `/about`, `/contact`, `/privacy`, `/docs`, `/docs/auth`, `/docs/errors`: inherited help-page design. `/developers`, `/help/contact` and `/help/privacy` preserve useful aliases with canonical URLs.

Prices are integer MYR minor units. Preview products are illustrative; sandbox payments do not create fulfilment orders or reserve real stock. Real checkout and delivery settings were not opened by this work.

## Verification

```sh
npm ci
npm test
npm run preview
npm run verify:agentic -- https://tsuyo.vercel.app
npx is-agentic https://tsuyo.vercel.app --json
```

`npm test` builds before running the full suite. The tests cover negotiated HTML/Markdown, statuses, headings and identity, all public pages, safe inventory projection, anonymous upstream reads, API errors and schemas, discovery formats, an official MCP client handshake and all four tools, protocol failure paths, metadata transitions, server packaging and the production preview. The live verifier checks every new endpoint/file, linked assets, catalog/product pages and all four MCP tools, writing an ignored `tmp/agentic-live-verification.json` evidence file.

Baseline Is Agentic snapshot: 29/100, scanned 2026-10-11T06:57:30.063Z, https://is-agentic.com/scan/tsuyo.vercel.app. The report API and CLI return cached immutable snapshots; rerunning them immediately does not prove an updated score. Use the report page's Rescan control for an immediate new audit and compare `scanned_at`.

No current browser-control tooling or desktop/mobile captures were available. The fresh reviewer scored three listed source/HTTP fixes resolved; this is not a new browser interaction or visual certification. The design documenter preserved the existing design system and recorded its pre-existing stale sidecar wording.

## Remaining business and external work

The owner supplied public email admin@tsuyo.com, phone 0123456789 and postal code 52780. Organization JSON-LD publishes those exact details, with no invented street/locality. A full postal/returns address, legal entity, final privacy/retention and trading policies, live catalog and delivery configuration still need business decisions. Verify the public mailbox/phone before live trading. Search ranking/indexing, press backlinks and external MCP registry publication need separate external work; no rankings or registry verification are claimed. No new API secrets are required for public reads.
