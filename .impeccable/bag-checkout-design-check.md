# Sample bag checkout: design-system evidence

Recorded 2026-10-10 for `C:/Users/danis/Project/Tsuyo`. This is an ordinary extension of Tsuyo's established Industrial Training Editorial world, in Operate mode. The normal bag action now reaches an explicitly labelled Stripe sandbox checkout for eligible sample bags. The checkout, summary and test confirmation inherit the incumbent visual system. No durable system or asset change was approved; `DESIGN.md` and `.impeccable/design.json` are preserved.

## Scope and evidence

This handoff follows `reference/new-work.md` and `reference/document.md`; its write boundary is this report alone. Direct source evidence: `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/stripe-surface.md`, `src/commerce/Checkout.jsx`, `src/commerce/SandboxBagCheckout.jsx`, `src/commerce/commerce.css`, the relevant global tokens, controls, checkout and responsive rules in `src/styles.css`, and stylesheet import order in `src/main.jsx`. The existing `.impeccable/stripe-design-check.md` establishes previously recorded commerce differences; `.impeccable/bag-checkout-finish-review.md` records the supplied finish verdict.

**Source-only design comparison and source/functional-flow review.** Browser-control tooling and current render captures were unavailable. No fresh desktop, mobile or user-width render was verified. No old capture is used as evidence of the current bag checkout. Source-defined responsive rules, focus styles and semantic markup show implementation intent; they do not establish rendered wrapping, overflow, visual legibility, keyboard operation or assistive-technology behavior. Stripe's hosted screen is outside this comparison.

The parent workflow loaded Impeccable context earlier this session and ran the detector once on the changed UI, returning `[]`. This pass reran neither command. The empty result supports only the detector's mechanical coverage. This pass did not execute a payment, inspect backend isolation independently or verify a deployment.

## Comparison with the incumbent system

| Dimension | Finished source evidence | System comparison |
| --- | --- | --- |
| Palette | Checkout inherits bone paper, ink, graphite supporting text, fine stone dividers and vermilion focus. The sandbox notice reuses the existing tonal notice surface. | Preserves the Accent Punctuation rule; no new palette role. |
| Typography | Checkout retains upright Barlow Condensed headings and Manrope labels, entries and supporting information. The checkout heading remains 70px, reducing to 51px at the existing mobile breakpoint; confirmation retains its 76px/63px heading pair. | Preserves the Upright Type rule and existing commerce type roles. |
| Actions and fields | Continue to payment uses the shared ink/paper action, 52px minimum height, 25px inline padding and SVG arrow. Refresh and recovery use established text links and dark actions. Test email and acknowledgement reuse visible native controls. | Preserves the Square Field rule and existing hover, disabled and focus styling. |
| Depth and geometry | The form remains flat, the summary uses the incumbent tonal field, and receipt status uses the existing circular success mark. | Preserves the Flat Commerce rule and the documented compact-circle exception. No new shadow or card treatment. |
| Composition | Checkout keeps the back link, condensed heading, notice, paired form/summary grid and summary totals. The sandbox form contains one test email, test-card guidance, acknowledgement and primary action. | Extends the established checkout hierarchy without a replacement identity or new layout system. |
| Responsive and motion intent | Existing 768px rules stack the checkout, release summary stickiness, adjust padding and reduce headings. Shared reduced-motion rules disable transitions and animations. | Retains source-defined responsive behavior; current viewport fit is unverified. |
| Images and icons | Bag lines reference the existing catalog images; receipt and action icons use Lucide. | No raster, font or imagery change. No new raster provenance is owed. |

The commerce stylesheet loads after the global stylesheet. Effective inherited form rules use 12px labels, 14px entry text, transparent square fields, a 46px minimum field height, 11px by 12px padding and muted-token borders. Global visible focus remains a 2px vermilion outline with 5px offset. These local operating roles were already part of commerce; this change does not promote them into new global tokens.

## Checkout states and recovery

The source selects `SandboxBagCheckout` only when sandbox bag checkout is enabled, payment mode is test, the store is in preview, public checkout is closed, and every bag item is a sample. The form explicitly says that the test creates no real charge, order, delivery or stock reservation. Its test email defaults to `test@example.com`; native validation requires a valid email and sandbox acknowledgement before submission.

A server quote is requested automatically when the bag changes and may be refreshed. The quote carries the bag identity, obsolete requests are ignored after effect cleanup, and Continue to payment requires a current matching quote and no busy request. The summary displays the returned MYR subtotal and test total, identifies delivery as excluded, and states that real delivery fees and promo codes become available at launch. The payment request includes the expected quoted total. This directly checks the UI's quote handling and request contract, not the backend's pricing implementation.

The checkout stores an attempt identity and guest access token, follows only a Stripe-hosted checkout URL for an open session, and routes an already completed session to its receipt. A conflict removes the cached attempt and quote so the visitor can refresh and retry. The supplied flow review also covers verified expired-session recovery and creation of a new attempt.

The receipt requests the sandbox result with its session-specific token. It uses verified result data for the test amount and paid status, polls a pending result within a bounded retry count, and offers status refresh. An expired result has explicit copy and Return to checkout. Confirmation remounts when the sandbox session ID changes, clearing the previous confirmation state. Bag removal is requested only for a verified paid result with returned items and a matching stored checkout session; the supplied functional scope limits removal to those paid item quantities. Cancelled and expired checkout keep recovery available.

Real-order and inventory isolation is the implementation constraint and the supplied functional-review scope. This report verifies that the customer-facing language and UI branch respect that separation; it does not independently certify the backend or production store.

## Supplied finish verdict

The initial source/flow reviewer found two material issues, fixed in one batch and rescored by the same reviewer:

| Finding | Verdict-pass score |
| --- | --- |
| Cached expired sessions lacked recovery. | Resolved |
| A previous paid confirmation could remain visible when another session ID loaded. | Resolved |

Disposition: **ship**, limited to those two resolved findings. This is not whole-surface visual approval, a new browser verification or complete accessibility coverage.

## Preserved system and existing drift

`DESIGN.md` retains token-bearing frontmatter and the eight canonical sections. The sidecar parses as schema version 2 and retains the same north star, palette metadata, type metadata, motion/breakpoint extensions and established component examples. Neither system file was refreshed.

Existing commerce differences remain reported rather than canonized: the global input token and field example describe 45px fields while the later commerce rules enforce a 46px minimum and 14px entry text; the global headline guidance does not enumerate the local checkout and receipt sizes. Existing source tones include the legacy field border (`#b9b9b0`, superseded here by the commerce muted border), summary surface (`#e5e4de`), final-total separator (`#c9c8c1`) and notice surface (`#e6e4dc`). The 9px summary note also predates this change. The sidecar dated 2026-10-05 still describes the dark commerce action as proceeding through a local checkout preview. This descriptive and token coverage drift is outside the authorized ordinary extension and was not repaired.

Preserved SHA-256 fingerprints:

- `DESIGN.md`: `2FA9608B9E6BCF21D822C97881AA7693E2B683FAD3AFBDC9C98F7DABB8046E57`
- `.impeccable/design.json`: `89E63D33673F7A43D4A37AFC10784438395FB14C20E5B5B2FD298D3E41C8C42E`

This pass changed only `.impeccable/bag-checkout-design-check.md`.