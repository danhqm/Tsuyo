import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import { storeRequest } from "./client";
import { readAttempt } from "./checkoutAttempt.mjs";
import { money } from "../catalog";
export default function SandboxBagCheckout({ bag, getProduct }) {
  const [params] = useSearchParams();
  const [quote, setQuote] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const items = bag.map((i) => ({
    product_id: i.id,
    size: i.size,
    quantity: i.quantity,
  }));
  const cartKey = JSON.stringify(items);
  useEffect(() => {
    let active = true;
    setQuote(null);
    setError("");
    if (!bag.length) return;
    setBusy(true);
    storeRequest("sandbox-quote", { items })
      .then((q) => {
        if (active) setQuote({ ...q, cartKey });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [cartKey, refresh]);
  async function pay(event) {
    event.preventDefault();
    if (busy || !quote || quote.cartKey !== cartKey) return;
    setBusy(true);
    setError("");
    try {
      const email = new FormData(event.currentTarget).get("email");
      const body = { items, email, expected_total_minor: quote.total_minor };
      const attempt = readAttempt(JSON.stringify({ sandbox: true, ...body }));
      sessionStorage.setItem("tsuyo-checkout", JSON.stringify(attempt));
      const checkout = await storeRequest("sandbox-checkout", {
        ...body,
        key: attempt.key,
        access_token: attempt.access_token,
      });
      if (
        !checkout.completed &&
        !/^https:\/\/checkout\.stripe\.com\//.test(checkout.url)
      )
        throw new Error("Stripe checkout could not be opened. Please retry.");
      sessionStorage.setItem(
        "tsuyo-checkout",
        JSON.stringify({ ...attempt, session_id: checkout.session_id }),
      );
      sessionStorage.setItem(
        `tsuyo-sandbox:${checkout.session_id}`,
        attempt.access_token,
      );
      window.location.assign(
        checkout.completed
          ? `/checkout/complete?sandbox=${encodeURIComponent(checkout.session_id)}`
          : checkout.url,
      );
    } catch (e) {
      setError(e.message);
      setBusy(false);
      if (e.status === 409) {
        sessionStorage.removeItem("tsuyo-checkout");
        setQuote(null);
      }
    }
  }
  if (!bag.length)
    return (
      <main id="main-content" className="checkout-page section-padding">
        <div className="empty-state">
          <ShoppingBag size={38} />
          <h1>YOUR BAG IS EMPTY.</h1>
          <p>Choose a sample piece to test checkout.</p>
          <Link to="/shop" className="button button-dark">
            Shop the collection
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </main>
    );
  return (
    <main id="main-content" className="checkout-page section-padding">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} />
        Back to collection
      </Link>
      <h1>YOUR NEXT SET.</h1>
      <p className="account-notice" role="status">
        Stripe sandbox checkout. Use a test email and test card. No real money
        is charged, and no order, delivery or stock reservation is created.
      </p>
      {params.get("cancelled") === "1" && (
        <p className="checkout-disclaimer" role="status">
          Payment was not completed. Your bag is still here; you can try again.
        </p>
      )}
      <div className="checkout-grid">
        <form className="commerce-form" onSubmit={pay}>
          <h2>Test payment</h2>
          <label>
            Test email address
            <input
              name="email"
              type="email"
              autoComplete="off"
              defaultValue="test@example.com"
              maxLength={254}
              required
            />
          </label>
          <p>
            On Stripe, use card <strong>4242 4242 4242 4242</strong>, a future
            expiry and any three-digit CVC.
          </p>
          <label className="consent-line">
            <input type="checkbox" required />I understand this is a sandbox
            payment and no merchandise will be shipped.
          </label>
          {error && (
            <p className="account-notice" role="alert">
              {error}
            </p>
          )}
          {busy && !quote && <p role="status">Checking your test total...</p>}
          <div className="checkout-actions">
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => setRefresh((v) => v + 1)}
            >
              Refresh test total
            </button>
            <button
              className="button button-dark full-width"
              disabled={busy || !quote || quote.cartKey !== cartKey}
            >
              {busy ? "Please wait..." : "Continue to payment"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
        <aside className="order-summary">
          <h2>Your test bag</h2>
          {bag.map((i) => {
            const p = getProduct(i.id);
            return (
              <div className="checkout-line" key={`${i.id}-${i.size}`}>
                <img src={p?.image} alt="" />
                <div>
                  <strong>{p?.name}</strong>
                  <p>
                    {i.size} · Quantity {i.quantity}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="order-total">
            <span>Subtotal</span>
            <strong>
              {quote ? money(quote.subtotal_minor / 100) : "Checking..."}
            </strong>
          </div>
          <div className="order-total">
            <span>Delivery</span>
            <strong>Not included in test</strong>
          </div>
          <div className="order-total final-total">
            <span>Test total</span>
            <strong>
              {quote ? money(quote.total_minor / 100) : "Checking..."}
            </strong>
          </div>
          <p>
            Sample prices are verified by the server. Real delivery fees and
            promo codes will be available when the store launches.
          </p>
        </aside>
      </div>
    </main>
  );
}
