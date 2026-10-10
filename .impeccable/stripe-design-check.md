# Stripe extension: design-system evidence

Recorded 2026-10-10. This is an ordinary extension of Tsuyo's established Industrial Training Editorial world, in Operate mode. The checkout, confirmation and owner Payments surfaces inherit the incumbent palette, fonts, geometry and commerce composition. No durable system change or asset change was approved. `DESIGN.md` and `.impeccable/design.json` remain the visual authority and are preserved.

## Scope and evidence

This handoff compares the finished additions with the incumbent system under `reference/new-work.md` and `reference/document.md`. Its write boundary is this report alone.

Evidence read directly: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/stripe-surface.md`, `src/commerce/Checkout.jsx`, `src/commerce/PaymentsPanel.jsx`, `src/commerce/Admin.jsx`, `src/commerce/commerce.css`, the relevant global tokens, controls, checkout and responsive rules in `src/styles.css`, and stylesheet import order in `src/main.jsx`. The earlier `.impeccable/backend-documentation.md` was read only to establish already recorded local design differences; its screenshots were not opened or used as current evidence.

**Source-only design comparison and source/functional-flow review.** No browser-control tooling or current render captures are exposed in this session. No desktop, mobile or user-width render was verified, and no old screenshot supports a claim about the current Stripe surfaces. Source-defined responsive behavior, focus styles and semantics are evidence of implementation intent, not proof of rendered layout or keyboard operation. Stripe's hosted payment screen is outside this comparison.

The parent workflow ran Impeccable context once for `src/commerce/Checkout.jsx`, with no active hook. It ran the mechanical detector once on `Checkout.jsx`, `Admin.jsx` and `PaymentsPanel.jsx`, returning `[]`. These are supplied workflow results; this documentation pass did not rerun either command. An empty detector result supports only the detector's mechanical checks.

## Comparison with the incumbent system

| Dimension | Current source evidence | Comparison |
| --- | --- | --- |
| Palette and surfaces | Global bone paper, ink, muted graphite, fine stone and vermilion tokens remain the inherited source. Payment status reuses `account-notice`; tables use fine `line` dividers. | Keeps sustained reading on warm monochrome surfaces and the Accent Punctuation rule. No new palette role. |
| Typography | Customer checkout and confirmation retain upright Barlow Condensed. The owner panel uses existing Manrope management headings, body, form labels and table styles. | Keeps the Upright Type rule and the existing distinction between expressive customer headings and restrained operating information. |
| Actions and fields | Payment and test actions use the shared ink/paper dark button, 52px minimum height, 25px inline padding and small SVG arrows. Fields reuse transparent square controls; global focus remains a 2px vermilion outline with 5px offset. | Keeps the Square Field rule and established hover/disabled treatments. No new button or input system. |
| Depth and shapes | Forms, notices and tables remain flat. Confirmation reuses the established circular success mark. | Keeps the Flat Commerce rule and the documented compact utility-circle exception. No new shadows or decorative card elevation. |
| Composition | Checkout keeps the existing paired form/order-summary grid. Payments joins the current management tabs with a connection-status table, sample-piece/size selector, one test action and a retry link. | Extends the existing commerce hierarchy directly; no replacement world or concept tournament. |
| Responsive and motion intent | Existing 768px rules stack checkout and form pairs, release the sticky order summary and reduce management spacing. Tables and management tabs retain horizontal overflow containers. Shared reduced-motion rules disable transitions and animations. | Reuses incumbent responsive behavior. Current rendered overflow, wrapping and viewport fit remain unverified. |
| Imagery and assets | Checkout references existing catalog images; payment states use small Lucide icons. | Adds no font, campaign image, raster or imagery treatment. This extension has no new raster provenance to record. |

`src/main.jsx` loads the commerce stylesheet after the global stylesheet. The inherited commerce forms therefore use 12px labels, 14px entry text, a 46px minimum field height, 11px by 12px padding and muted-token borders. The owner panel uses the already established 23px section heading, 16px subsection heading, 13px supporting copy and 12px tabular table data. These are local operating roles, not updates to the global campaign type ramp.

## Payment-state and recovery evidence

The customer form clears its quote when form data or bag contents change. `quoteGeneration` advances on invalidation and calculation; an asynchronous quote result is accepted only when its generation remains current. Continue to payment requires an available checkout, configured payment connection, a current quote and no busy request. The form preserves visible labels, native validation, autocomplete, status notices and alert messages in source.

Purchase confirmation reads the returned order status rather than treating the return URL as payment success. Pending/processing states receive bounded refresh polling; paid states use confirmed copy. Failed and expired states now receive explicit terminal headings, explain that payment was not completed and offer Return to checkout. Sandbox confirmation follows a separate result request and labels the outcome as a test.

Owner Payments lives inside the existing staff-gated management component. It reads connection and test results, exposes a labelled status table, and disables its test action without a selected sample, connected account, configured webhook or test mode. Its copy states that the test creates no real charge, stock reservation or fulfilment order. This source comparison verifies the UI gates and messages; backend isolation and authenticated payment execution belong to the functional workflow evidence, not to a visual certification by this report.

## Supplied finish verdict

The finish reviewer found two P2 source/flow issues. They were fixed in one batch, and the same reviewer reread the changes:

| Material finding | Verdict-pass score |
| --- | --- |
| An obsolete asynchronous quote response could overwrite invalidation after form or bag edits. | Resolved |
| Failed/expired payments used pending-state copy and lacked checkout recovery. | Resolved |

Disposition: **ship**, scoped to those two resolved fixes. This verdict does not establish whole-surface visual approval, current browser rendering or full accessibility coverage. No render verification occurred.

## Preserved system and pre-existing drift

`DESIGN.md` retains its token-bearing frontmatter and eight canonical sections. The sidecar parses as JSON, declares schema version 2, keeps the same Industrial Training Editorial north star, seven color metadata entries, eight typography metadata entries and ten component examples. Its color ramps retain eight steps and it has no legacy duplicated `tokens` property. These are source/structure checks, not external schema certification.

The prior commerce documentation already records local operating typography outside the global ramp, including 64/52px account headings, 32/27px management headings and 70/51px checkout headings. Existing local tones include the legacy field border (`#b9b9b0`), summary background (`#e5e4de`), final-total separator (`#c9c8c1`) and account-notice surface (`#e6e4dc`), with 9px summary copy. These source values predate Stripe; the existing commerce-form rules override the legacy field border with the muted token. None is promoted into a new global primitive. The sidecar dated 2026-10-05 also retains the earlier description of the dark commerce action as proceeding through a local checkout preview. That descriptive lag is reported without refreshing the incumbent system.

Preserved SHA-256 fingerprints:

- `DESIGN.md`: `2FA9608B9E6BCF21D822C97881AA7693E2B683FAD3AFBDC9C98F7DABB8046E57`
- `.impeccable/design.json`: `89E63D33673F7A43D4A37AFC10784438395FB14C20E5B5B2FD298D3E41C8C42E`

No source, global context, asset, credential, backend, deployment or other documentation file was changed by this pass.

