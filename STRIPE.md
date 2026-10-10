# Tsuyo Stripe integration

Stripe is connected to the Tsuyo sandbox. The storefront is https://tsuyo.vercel.app. Real payments remain disabled. The sample shopping bag supports isolated Stripe sandbox checkout; inventory-backed purchases stay closed until real products, stock and delivery rates are prepared.

## Customer journey

1. Land on Tsuyo and choose **Shop the collection** or a collection in the navigation.
2. Browse/filter products, open a piece, choose its size and add it to the bag.
3. Review quantities and the subtotal. Continue to checkout; an account is optional.
4. Enter contact and delivery details, an optional promo code, and review the store terms.
5. Calculate delivery. The server validates SKU availability, price, delivery and discounts. Editing the bag or form invalidates any outstanding quote.
6. Continue to payment. The server creates an idempotent order/stock reservation and a Stripe-hosted Checkout Session using the stored order snapshot. The browser redirects to Stripe; card details never pass through Tsuyo.
7. Choose an eligible payment method enabled in Stripe Dashboard and complete payment or any required authentication. Amounts remain in MYR; Adaptive Pricing is disabled to preserve order/currency reconciliation.
8. Return to Tsuyo. A signed Stripe event or authenticated session retrieval verifies payment before confirmation. Paid orders consume reserved stock once, and purchased items are removed from the bag. Pending payments are polled for a bounded period. Failed/expired payments show recovery; cancellation preserves the bag. Receipts remain queued until an email sender is configured.

## Sandbox testing from the shopping bag

Add sample pieces and sizes to the bag and open `/checkout`. The labelled sandbox form automatically calculates the server-verified MYR total. Enter a test email, tick the sandbox acknowledgement, and click **Continue to payment**. Delivery and promo codes are omitted from this test; no real order, stock movement or shipment is created. Confirmation is protected by a browser-held guest token. Only verified paid results remove the purchased sample quantities from the bag; cancellation keeps them available.

This path requires the explicit `STORE_SANDBOX_BAG_CHECKOUT=true` runtime flag, valid Stripe test mode and an illustrative-only bag. The backend rejects real merchandise, altered totals and invalid quantities. It rate-limits quote/session creation and uses a stable retry key. Switching Stripe to live mode disables this sample path automatically.

## Owner sandbox testing

Sign in to the verified store-owner account, open `/admin`, and choose **Payments**. Check the connection, select a sample size, then choose **Open Stripe test checkout**. This uses actual Stripe Checkout with stored sample pricing. Delivery is deliberately omitted from this connection test. It never creates a fulfilment order or changes stock.

Use card `4242 4242 4242 4242`, a future expiry and any three-digit CVC. Stripe's [testing guide](https://docs.stripe.com/testing) provides declined and authentication test cards. The owner returns to a protected payment result. Shopping-bag test sessions return to a token-protected sandbox confirmation. An operations-generated demonstration returns to `/checkout/complete?sandbox=...`; that page reveals only verified sandbox status and amount, with an explicit no-real-order notice.

Sandbox sessions are tagged `tsuyo_payment_test=true`, contain no normal `order_id`, and are excluded from normal webhook settlement. Test result retrieval verifies test mode, the marker and the creator. Creating sessions remains protected by verified staff or the existing maintenance secret.

## Deployed configuration

| Setting | Current value |
| --- | --- |
| Supabase project | `bhodifcqtkajjojvuqtk` |
| Stripe account | `acct_1UOUeDBHb72MZv7y` (Tsuyo sandbox) |
| `STRIPE_MODE` | `test` |
| `STRIPE_ACCOUNT_ID` | The sandbox account above |
| `STRIPE_SECRET_KEY` | Saved privately in Supabase Edge Function secrets |
| `STRIPE_WEBHOOK_SECRET` | Saved privately in Supabase Edge Function secrets |
| Store URL | `https://tsuyo.vercel.app` |
| Webhook | `https://bhodifcqtkajjojvuqtk.supabase.co/functions/v1/stripe-webhook` |
| Webhook API version | `2026-09-30.endive`, matching Stripe SDK 23.0.0 |

The webhook subscribes to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `charge.refunded`. It verifies the raw-body signature, rejects the wrong payment mode and returns errors for failed settlement so Stripe can retry.

Payment methods use [Stripe's Dashboard-managed dynamic methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods). The current API rejects `payment_method_types` on Checkout creation; the implementation omits it. A Stripe publishable key is not needed in this frontend because it redirects to a hosted session URL. Never put secret keys in `VITE_` variables.

## Verification on 10 October 2026

- Actual Checkout Session created by the deployed Supabase integration and paid by the user: **RM 129.00**, `myr`, `status=complete`, `payment_status=paid`.
- Corresponding signed `checkout.session.completed` event: `evt_1UOw1YBHb72MZv7yaqdtQIR3`, `pending_webhooks=0`.
- Production orders, on-hand stock and reserved stock remained zero; public checkout remained closed.
- Nineteen backend/Postgres/Stripe tests pass, covering RLS, authoritative prices, reservations, duplicate settlement, signature verification, mode/account isolation and protected test actions.
- Production build passed. Source/functional-flow review scored its two fixes resolved. Current render captures/browser automation were unavailable in this session; no new visual browser pass is claimed.
- Declined-card and 3DS hosted flows are available for owner testing but were not submitted during this verification. Normal customer orders and delivery were not enabled or exercised against cloud inventory.

For an authenticated Supabase CLI user, `npm run verify:stripe` checks provider health using the existing maintenance authorization in memory. `npm run verify:stripe -- checkout` creates an isolated test session and writes its URL to ignored `tmp/stripe-run.json`; `npm run verify:stripe -- result` reads its verified result. It never prints a credential.

## Before real sales

Prepare real inventory, activate merchandise and configure delivery zones. Configure and verify the live Stripe account/key and its separately registered webhook secret, set `STRIPE_MODE=live` and pin `STRIPE_ACCOUNT_ID` to that live account. Confirm commercial policies, tax configuration and receipt sender before opening checkout. Keep sandbox test sessions separate from production fulfilment. Supabase runtime settings are not automatically changed by deploying the frontend.

## Checkout button fix verification

The disabled button was caused by the real-store launch gates, not an outdated Vercel deployment. A clearly labelled sandbox bag form now has an automatic trusted quote and an actionable payment control. Twenty-seven backend tests pass. A real deployed two-piece MYR 278.00 Checkout Session was created, its retry returned the same session, its line items/totals matched, and an incorrect receipt token was rejected. No new payment was submitted during this verification; the earlier RM 129 successful payment remains the paid-provider evidence. Production orders and inventory remain unchanged. Browser-control tooling is unavailable, so no automated click/render check is claimed.
