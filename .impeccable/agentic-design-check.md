# Public information extension: design check

Recorded: 2026-10-11. Mode: **Read**. Direction: an ordinary extension of Tsuyo's established help surface.

Disposition: **aligned at source and local HTTP scope**. The existing Industrial Training Editorial world remains authoritative. This record documents the extension; it does not regenerate the design system or certify rendered desktop/mobile behavior.

## Authority and scope

The main task ran Impeccable context once, targeting `src/App.jsx`. This documenter reused that context and read `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/agentic-surface.md`, and Impeccable's `reference/document.md`. The explicit write boundary permits only this check and the companion finish record. `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` are preserved unchanged.

Source inspection covered `src/PublicPage.jsx`, `src/public-content.js`, `src/page-metadata.mjs`, the appended public-page rules in `src/styles.css`, the footer and routes in `src/App.jsx`, and supporting SSR/page metadata source and agentic tests. The new public routes are `/about`, `/contact`, `/privacy`, `/docs`, `/docs/auth`, and `/docs/errors`; `/developers`, `/help/contact`, and `/help/privacy` reuse the appropriate public page. The footer adds About and API & agent docs within its existing navigation groups.

No new visual world, imagery, font files, icon family, animation system, or component library is needed for this extension. Existing Lucide arrows, global focus styling, help-page spacing, and navigation remain the visual vocabulary.

## Comparison with the established system

| Concern | Incumbent authority | Extension evidence | Source result |
| --- | --- | --- | --- |
| Palette | Sustained reading on Bone Paper and Training Ink; vermilion marks interaction | Public prose uses `var(--ink)` on the inherited `var(--paper)` canvas. Code samples reverse those existing colors. | Aligned |
| Typography | Upright Barlow Condensed headings and Manrope body/control text | Public H1 and H2 inherit the display family; the help body inherits Manrope. No italic treatment is introduced. | Aligned |
| Reading measure | Help copy stays within 650px | `PublicPage` places sections and resource navigation in `.help-body`, retaining its 650px maximum width. Public body size is 14px; the existing paragraph rule retains its 1.75 line height. | Aligned |
| Heading hierarchy | Clear reading sequence using semantic headings | One H1 precedes ordered section H2s. Sections contain paragraphs; REST examples use `pre` and `code`. | Aligned |
| Flat composition | Fine dividers and square geometry; shadows reserved for overlays/status | Public sections remain unboxed. Resource rows use the existing line color; code samples are square ink fields. No public-page shadow or rounded card is added. | Aligned |
| Resource affordance | Restrained underlined editorial text actions | `.public-links a` has a resting underline, 4px underline offset, fine bottom divider, and 44px minimum row height. Both internal routes and external/resource anchors share the treatment. | Aligned |
| Navigation | Existing footer shop, support, and brand groups | Contact and Privacy point to the public pages; API docs and About occupy the established groups without a new navigation layout. The collection recovery path remains available. | Aligned |
| Keyboard and recovery structure | Visible global focus and semantic navigation/status | Resource lists have labelled `nav` elements and inherit the global focus outline. `PublicUnavailable` uses the same help surface, one H1, an alert paragraph, and Contact/docs recovery links. | Source support present; no browser interaction claim |
| Responsive intent | Shared fluid gutter, narrower-screen help spacing and type | Public pages reuse the help-page media rules and fluid gutter. H1 allows wrapping; code samples scroll within their own block. | Source support present; current viewport rendering unverified |
| Motion | Essential information remains available without motion | The extension adds no motion. It uses the incumbent shell, which retains its existing reduced-motion and coarse-pointer handling. | Aligned at source scope |

The public H1 is locally bounded at 1000px, while sustained prose retains the 650px measure. H2s use the existing display face at 32px with 40px/18px vertical margins. These are surface-specific reading rules, not changes to normative global tokens.

## Content truth and user path

The only supplied public contact facts are **admin@tsuyo.com**, **0123456789**, and **postal code 52780**. Contact copy and Organization JSON-LD use those values. No street address, visitor/returns location, opening hours, legal entity, support response time, or delivery commitment is invented. Contact explicitly explains that a postal code alone is not a shipping destination.

About, Contact, Privacy, and developer guidance disclose illustrative catalog content and the separate Stripe sandbox. A sample payment is not a fulfillment order or inventory reservation. Live purchasing remains subject to the existing checkout setting, catalog, and delivery setup; the established product context records live payments disabled. Planned Malaysia/international delivery is described as awaiting configured regions and rates.

Public REST and MCP documentation guides a visitor or agent from catalog discovery to current store status. It describes public reads without customer credentials, bounded search/pagination, typed operations, error recovery, and read-only tools. It does not offer account, order, payment, or administrative mutations. Registry-format discovery is explicitly distinguished from a registry-listing or verification claim. Privacy describes the implemented storefront and identifies the unpublished retention/legal-policy work before live trading.

## Functional evidence and limits

The main task reports the production client/SSR build and `npm test` passing **42 tests**. The inspected `tests/agentic.test.mjs` covers raw server-rendered content, heading sequence, HTML/Markdown negotiation, known routes and aliases, genuine 404 responses, anonymous public data, REST validation/recovery, OpenAPI, discovery schemas, sitemap/llms files, JSON-LD serialization, official-client MCP initialization and tool calls, transport restrictions, metadata boundaries, and shop filters/root rewrite.

The main task's local HTTP evidence reports **1,560 visible characters in the raw homepage HTML**. This supports meaningful server-rendered content before client JavaScript. It is a content/response measurement, not viewport or visual evidence. HTML and Markdown missing-page responses retain HTTP 404, and unknown/private paths are noindex. The styled unavailable response retains HTTP 503 and Retry-After recovery guidance.

The exact `/product/:id` pattern gates product metadata in both the shared helper and client lookup. A matching product slug on an unrelated, nested, missing, or private route cannot promote it to a product title/indexable page. The client loading guard preserves product metadata while the catalog is still loading. The regression test records those boundaries.

This documenter made no network requests and reran no build/tests. Test results and local HTTP measurements above come from the main task; source assertions were read directly. Staging function startup/routing and deployed endpoint verification were still being investigated when this record was written. No deployment or production readiness verdict is implied.

No browser-control tool or current desktop/mobile captures were available for the new public pages. Older storefront/backend captures are prior evidence for the incumbent project and are not treated as captures of this extension. No screenshot, computed-style, keyboard traversal, responsive overflow, or rendered visual review is claimed here.

## Pre-existing documentation drift

The sidecar's **Dark commerce action** description still says it proceeds through the "local checkout preview," while `PRODUCT.md` and current checkout source describe connected commerce and a separate Stripe sandbox. This stale description predates the public-information extension. It is recorded without repair; no design tokens or incumbent system files are changed.

This check and `.impeccable/agentic-finish-review.md` carry extension evidence and limits. They do not promote task-specific reading rules into a replacement design system.
