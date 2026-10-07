# Tsuyo commerce extension: design-system evidence

Recorded 2026-10-07. This is an ordinary extension of the approved Industrial Training Editorial world. The finished account, checkout and management entry surfaces honor that identity. `DESIGN.md` and `.impeccable/design.json` remain the visual authority and were preserved; this report records application-level decisions without adding them to the global token system.

## Authority and files checked

The shipped documenter definition, `reference/document.md` and the finish rule in `reference/new-work.md` were read. The latter states: “Ordinary extensions compare the finished build against the incumbent system, preserve its files, and report the evidence checked; report pre-existing drift without repairing it unasked.” The write boundary for this pass is this report alone.

Evidence checked: `PRODUCT.md`, `.impeccable/backend-surface-brief.md`, `DESIGN.md`, `.impeccable/design.json`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`, `src/commerce/commerce.css`, and representative account, checkout and management component code. `src/main.jsx` loads `src/styles.css` before the commerce stylesheet, so the commerce form refinements apply after the incumbent styles. No app, SQL, secret, asset or incumbent system file was changed by this pass. No browser, detector, context or concept-seed command was run.

## Identity preserved in the build

The shared root palette remains bone paper (`#f1f0eb`), ink (`#1a1a18`), graphite text (`#686863`), fine stone (`#d3d2cb`) and vermilion (`#e85d39`). The new forms use those existing primitives for their canvas, text, borders and inherited focus treatment. The darker `muted` primitive outlines operating fields for visibility; separators retain `line`.

Customer headings retain upright Barlow Condensed; operational headings, labels and data use Manrope. Dark actions retain the existing ink/paper pairing, 52px minimum height, 25px inline padding and SVG arrows. Inputs and primary actions remain square. Forms and tables stay flat, using tonal surfaces and fine rules instead of decorative elevation. The unchanged header, navigation and footer connect the extension to the familiar storefront. The existing Accent Punctuation, Upright Type, Flat Commerce and Square Field rules still apply.

The desktop account layout places the heading and purpose beside the form, within a 1100px local maximum. Below 768px it becomes one column. Checkout keeps the incumbent two-column form/summary arrangement, then places the summary after the form on mobile. Local form pairs also become single columns. Management entry uses a direct heading, authorization explanation and account action.

## Deliberate operating typography and controls

These are observed component roles, not replacements for the global campaign ramp:

| Role | Finished source values | Purpose |
| --- | --- | --- |
| Account primary heading | Barlow Condensed, inherited 700; 64px desktop / 52px mobile | Customer identity and form entry |
| Management primary heading | Manrope, inherited 700; 32px / 27px; line-height 1.2 | Restrained operating hierarchy |
| Account/management section heading | Manrope 600, 23px, line-height 1.3 | Group related account data and controls |
| Checkout primary heading | Barlow Condensed 600, 70px / 51px | Continues the incumbent checkout role |
| Checkout section heading | Manrope 500, 18px / 17px, line-height 1.2 | Details and delivery groups |
| Commerce field label / input | Manrope 600 at 12px / input at 14px | Readable familiar forms |
| Consent / tables | 11px consent; 12px table data with tabular numerals | Compact supporting information |

Commerce inputs use transparent backgrounds, a 1px `muted` border, 46px minimum height, and 11px by 12px padding. Their visible labels, native validation, autocomplete and inherited vermilion focus outline support the operating task. This local sizing is intentional; it is not a directive to resize the storefront's existing marketing typography. The brief records visible detector advisories at 64px, 32px, 10px, 52px and 27px; its original output was truncated. This pass did not rerun or imply complete coverage of that detector.

## Existing documentation and sidecar checks

`DESIGN.md` retains token-bearing frontmatter with the supported color, typography, rounded, spacing and component groups. All eight canonical prose sections appear in the required order. Its normative palette and font pairing match the global source. The sidecar parses as valid JSON, declares schema version 2, and retains the same Industrial Training Editorial north star. Its seven color metadata keys and eight typography metadata keys match the frontmatter, all seven tonal ramps have eight steps, and the ten component `refersTo` values resolve to existing component tokens. Primitive token groups are not duplicated under a legacy `tokens` property. This is a syntax and structural/reference check, not a new external schema certification.

Preserved SHA-256 fingerprints:

- `DESIGN.md`: `2FA9608B9E6BCF21D822C97881AA7693E2B683FAD3AFBDC9C98F7DABB8046E57`
- `.impeccable/design.json`: `89E63D33673F7A43D4A37AFC10784438395FB14C20E5B5B2FD298D3E41C8C42E`

## Rendered evidence and review scope

The twelve required settled captures under `.impeccable/review/backend/` were opened during this documentation pass: `account-desktop.jpg`, `signup-desktop.jpg`, `reset-desktop.jpg`, `checkout-desktop.jpg`, `admin-gate-desktop.jpg`, `account-mobile.jpg`, `signup-mobile.jpg`, `checkout-mobile.jpg`, `admin-gate-mobile.jpg`, `account-user.jpg`, `signup-user.jpg`, and `checkout-user.jpg`. They show the named unsigned account forms, closed checkout with a bag item, and management entry guard. The customer forms preserve the typography, surface and geometry described above; mobile stacks them without visible horizontal clipping. The user-width captures also preserve the hierarchy. No transient form switch or lazy-loading frame was used for this comparison.

The supplied finish-reviewer verdict is **ship**, at the scope of its verdict pass: both listed fixes were scored resolved. Source confirms that the selected order section is keyed by `order.id`, so its uncontrolled fulfillment/refund fields remount when order selection changes. The brief now records seed `6e314a6d` as a late, unscoped finish-stage roll, not a pre-implementation or user-selected direction. This pass does not elevate that fix-list verdict into a new whole-surface approval.

Authenticated account/management screenshots are unavailable. Management operations were sampled in code, not exercised in the browser. Stripe is prepared but intentionally disabled, and payment, refund and transactional email delivery were not exercised by this pass. The entry guard is visual evidence only, not proof of backend authorization. The backend test and deployment evidence belongs to `BACKEND.md` and its original checks.

## Drift not canonized or repaired

The incumbent global stylesheet already contains checkout tones and dimensions outside the frontmatter: the preview field border (`#b9b9b0`), summary background (`#e5e4de`), total separator (`#c9c8c1`), small 9px summary copy, and local checkout type sizes. These remain observed local implementation values, not newly approved primitives. The new status-notice tone (`#e6e4dc`) is likewise recorded as a local tonal surface, not a new global palette role. Residual registration-symbol CSS exists even though the current wordmark renders only TSUYO; it remains unused styling, not a brand pattern. Existing footer navigation labels do not authorize introducing campaign kickers elsewhere. No prohibition was added that bans the world's native utility circles or established editorial treatments. These observations were not repaired or promoted because this task extends the incumbent world and does not authorize a system redesign.
