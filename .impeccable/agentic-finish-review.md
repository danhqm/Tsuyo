# Public information extension: finish review

Recorded: 2026-10-11. Disposition: **ship at source and local HTTP scope**.

A fresh finish reviewer inspected the narrow public-information extension against Tsuyo's preserved visual system and source/HTTP evidence. The initial disposition was **fix** for three material items. One correction batch addressed them, and the same reviewer scored all three **resolved** and returned **ship** at that review scope.

| Finding | Recorded correction | Verdict |
| --- | --- | --- |
| Client navigation could leave incorrect metadata on a missing page | Shared route metadata now supplies the Page Not Found title and noindex boundaries for unknown paths, canonical aliases, and private routes. The client applies those values during navigation. | Resolved |
| An upstream failure could return an unstyled 503 page | The error response now retains the SSR template/styles and renders `PublicUnavailable` in the inherited help surface, with an alert, Contact/docs recovery links, HTTP 503, and Retry-After guidance. | Resolved |
| Resource links lacked the committed resting affordance | `.public-links a` now applies its underline at rest, alongside the existing fine divider and 44px minimum row height. | Resolved |

The main task also tightened product metadata to the exact `/product/:id` shape and retained the client catalog-loading guard. The regression test ensures a product slug on an unrelated or private route cannot change its title or indexing. This is additional recorded metadata protection, not a fourth scored visual finding.

The documenter directly inspected `src/PublicPage.jsx`, `src/public-content.js`, `src/page-metadata.mjs`, appended public CSS, and footer/routes in `src/App.jsx`. The source supports the established bone/ink palette, upright Barlow Condensed/Manrope, flat help layout, 650px prose measure, sequential H2 sections, and resting underlined resources. The public email, phone, and postal code remain the user-supplied admin@tsuyo.com, 0123456789, and 52780. Copy discloses illustrative products and sandbox behavior without adding a street address or trading promises.

Validation reported by the main task: production client/SSR build passed; `npm test` passed **42 tests**; local raw homepage HTML contained **1,560 visible characters**. Source and tests cover genuine HTML/Markdown 404s, public REST, OpenAPI, read-only MCP, llms/sitemap discovery, canonical/Organization metadata, styled 503 recovery, and metadata boundaries. This documenter did not rerun tests or make network requests.

No browser-control tooling or current desktop/mobile screenshots were available for this extension. No new visual, screenshot, computed-style, responsive, or browser-interaction review is claimed. The verdict scores the listed source/HTTP fixes; it does not certify all authenticated commerce flows, deployed endpoint behavior, or production readiness. Staging function startup/routing and deployed endpoint verification remained pending when this record was written.

`PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` are preserved unchanged. No assets, motion system, source files, or commerce behavior were changed by this documentation pass. The pre-existing sidecar description of a "local checkout preview" is reported in `.impeccable/agentic-design-check.md` without repair.
