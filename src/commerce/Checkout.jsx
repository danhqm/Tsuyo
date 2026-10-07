import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShoppingBag,
} from "lucide-react";
import { useCommerce } from "./CommerceProvider";
import { storeRequest } from "./client";
import { money } from "../catalog";
const countryName = (code) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  } catch {
    return code;
  }
};
function readAttempt(fingerprint) {
  try {
    const saved = JSON.parse(sessionStorage.getItem("tsuyo-checkout"));
    if (saved?.fingerprint === fingerprint) return saved;
  } catch {}
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return {
    fingerprint,
    key: crypto.randomUUID(),
    access_token: Array.from(bytes, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export default function Checkout({ bag, subtotal, getProduct }) {
  const { session, user, settings, zones, checkoutOpen, loading, preview } =
    useCommerce();
  const countries = useMemo(
    () => [...new Set(zones.flatMap((z) => z.countries))].sort(),
    [zones],
  );
  const [country, setCountry] = useState("MY"),
    [quote, setQuote] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [coupon, setCoupon] = useState("");
  useEffect(() => {
    if (countries.length && !countries.includes(country))
      setCountry(countries.includes("MY") ? "MY" : countries[0]);
  }, [countries, country]);
  const pieces = () =>
    bag.map((i) => {
      const variant = getProduct(i.id)?.variants?.find(
        (v) => v.size === i.size && v.active,
      );
      if (!variant)
        throw new Error(
          "A piece in your bag is unavailable. Remove it and choose another piece.",
        );
      return { variant_id: variant.id, quantity: i.quantity };
    });
  async function calculate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      setQuote(
        await storeRequest(
          "quote",
          { items: pieces(), country, region: form.get("region"), coupon },
          session,
        ),
      );
    } catch (e) {
      setQuote(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const address = {
        line1: f.get("line1"),
        line2: f.get("line2"),
        city: f.get("city"),
        region: f.get("region"),
        postal_code: f.get("postal_code"),
        country,
        phone: f.get("phone"),
      };
      const body = {
        items: pieces(),
        email: f.get("email"),
        recipient: f.get("recipient"),
        address,
        coupon,
      };
      const fingerprint = JSON.stringify(body);
      const attempt = readAttempt(fingerprint);
      sessionStorage.setItem("tsuyo-checkout", JSON.stringify(attempt));
      const result = await storeRequest(
        "checkout",
        { ...body, key: attempt.key, access_token: attempt.access_token },
        session,
      );
      sessionStorage.setItem(
        "tsuyo-checkout",
        JSON.stringify({ ...attempt, order_id: result.order_id }),
      );
      localStorage.setItem(
        `tsuyo-order:${result.order_id}`,
        attempt.access_token,
      );
      if (!/^https:\/\/checkout\.stripe\.com\//.test(result.url))
        throw new Error("Checkout could not be opened. Please try again.");
      window.location.assign(result.url);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) sessionStorage.removeItem("tsuyo-checkout");
      setBusy(false);
    }
  }
  if (!bag.length)
    return (
      <main id="main-content" className="checkout-page section-padding">
        <div className="empty-state">
          <ShoppingBag size={38} />
          <h1>YOUR BAG IS EMPTY.</h1>
          <p>Find the pieces for your next set.</p>
          <Link to="/shop" className="button button-dark">
            Shop the collection
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </main>
    );
  const closed = !checkoutOpen || preview || !countries.length;
  return (
    <main id="main-content" className="checkout-page section-padding">
      <Link to="/shop" className="back-link">
        <ArrowLeft size={16} />
        Back to collection
      </Link>
      <h1>YOUR NEXT SET.</h1>
      {loading ? (
        <p className="checkout-disclaimer" role="status">
          Checking the store…
        </p>
      ) : closed ? (
        <p className="checkout-disclaimer" role="status">
          The store is getting ready. Online checkout will open once the
          collection and delivery options are confirmed.
        </p>
      ) : (
        <p className="checkout-disclaimer">
          Review your delivery details, then pay securely with Stripe.
        </p>
      )}
      <div className="checkout-grid">
        <form
          className="commerce-form"
          onSubmit={pay}
          onChange={() => setQuote(null)}
        >
          <h2>Your details</h2>
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={user?.email || ""}
              readOnly={!!user?.email}
              required
              maxLength={254}
            />
          </label>
          <label>
            Full name
            <input
              name="recipient"
              autoComplete="name"
              required
              maxLength={120}
            />
          </label>
          <label>
            Phone number
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
          <h2>Delivery address</h2>
          <label>
            Street address
            <input
              name="line1"
              autoComplete="address-line1"
              required
              maxLength={200}
            />
          </label>
          <label>
            Apartment, suite, etc. (optional)
            <input name="line2" autoComplete="address-line2" maxLength={200} />
          </label>
          <div className="form-pair">
            <label>
              City
              <input
                name="city"
                autoComplete="address-level2"
                required
                maxLength={120}
              />
            </label>
            <label>
              Postcode
              <input
                name="postal_code"
                autoComplete="postal-code"
                required
                maxLength={24}
                pattern={country === "MY" ? "[0-9]{5}" : undefined}
                title={
                  country === "MY"
                    ? "Enter a five-digit Malaysian postcode"
                    : undefined
                }
              />
            </label>
          </div>
          <label>
            State or region
            <input
              name="region"
              autoComplete="address-level1"
              required
              maxLength={120}
            />
          </label>
          <label>
            Country
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              name="country"
              autoComplete="country"
              required
            >
              {(countries.length ? countries : ["MY"]).map((c) => (
                <option key={c} value={c}>
                  {countryName(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Promo code (optional)
            <input
              name="coupon"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              maxLength={30}
            />
          </label>
          <label className="consent-line">
            <input name="terms" type="checkbox" required />
            I’ve reviewed Tsuyo’s <Link to="/help/terms">terms</Link> and{" "}
            <Link to="/help/privacy">privacy information</Link>.
          </label>
          {error && (
            <p className="account-notice" role="alert">
              {error}
            </p>
          )}
          <div className="checkout-actions">
            <button
              type="button"
              className="text-link"
              disabled={closed || busy}
              onClick={(e) => {
                const form = e.currentTarget.form;
                if (form.reportValidity())
                  calculate({ preventDefault() {}, currentTarget: form });
              }}
            >
              Calculate delivery
            </button>
            <button
              className="button button-dark full-width"
              disabled={closed || busy || !quote}
            >
              {busy ? "Please wait…" : "Continue to payment"}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
        <aside className="order-summary">
          <h2>Your rotation</h2>
          {bag.map((i) => {
            const p = getProduct(i.id);
            return (
              <div className="checkout-line" key={`${i.id}-${i.size}`}>
                <img src={p?.image} alt="" />
                <div>
                  <strong>{p?.name || "Unavailable piece"}</strong>
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
              {money((quote?.subtotal_minor ?? subtotal * 100) / 100)}
            </strong>
          </div>
          <div className="order-total">
            <span>Discount</span>
            <strong>
              {quote ? `− ${money(quote.discount_minor / 100)}` : "—"}
            </strong>
          </div>
          <div className="order-total">
            <span>Delivery</span>
            <strong>
              {quote ? money(quote.shipping_minor / 100) : "Enter your address"}
            </strong>
          </div>
          <div className="order-total final-total">
            <span>
              {settings?.tax_mode === "stripe_tax" ? "Before tax" : "Total"}
            </span>
            <strong>
              {money((quote?.total_minor ?? subtotal * 100) / 100)}
            </strong>
          </div>
          <p>
            {settings?.tax_mode === "stripe_tax"
              ? "Applicable taxes are calculated by Stripe at payment."
              : closed
                ? "Delivery and totals will be confirmed when checkout opens."
                : "Prices include any applicable tax."}{" "}
            Your order is confirmed after payment succeeds.
          </p>
        </aside>
      </div>
    </main>
  );
}
export function OrderConfirmation({ clearBag }) {
  const [params] = useSearchParams();
  const id = params.get("order");
  const { session } = useCommerce();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [checking, setChecking] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setChecking(true);
    setError("");
    let token;
    try {
      token = localStorage.getItem(`tsuyo-order:${id}`);
    } catch {}
    storeRequest("order", { order_id: id, access_token: token }, session)
      .then((result) => {
        if (active) {
          setData(result);
          if (
            ["paid", "partially_refunded"].includes(result.order.payment_status)
          ) {
            let current;
            try {
              current = JSON.parse(sessionStorage.getItem("tsuyo-checkout"));
            } catch {}
            if (current?.order_id === id) {
              clearBag(result.items);
              sessionStorage.removeItem("tsuyo-checkout");
            }
          }
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [id, session?.access_token, attempt]);
  return (
    <main id="main-content" className="checkout-page section-padding">
      <div className="checkout-success">
        <div className="success-icon">
          <Check size={32} />
        </div>
        <h1>
          {data?.order.payment_status === "paid"
            ? "YOUR NEXT SET. CONFIRMED."
            : "YOUR ORDER."}
        </h1>
        {checking ? (
          <p role="status">Checking payment status…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          data && (
            <>
              <p>
                Order #{data.order.order_number} ·{" "}
                {data.order.payment_status.replaceAll("_", " ")}
              </p>
              <div className="success-total">
                <span>Total</span>
                <strong>{money(data.order.total_minor / 100)}</strong>
              </div>
              <p>
                Delivery: {data.order.fulfillment_status}
                {data.order.tracking_number &&
                  ` · ${data.order.carrier}: ${data.order.tracking_number}`}
              </p>
              {!["paid", "partially_refunded", "refunded"].includes(
                data.order.payment_status,
              ) && (
                <p>
                  We’ll confirm your order once payment is recorded. This page
                  alone does not confirm payment.
                </p>
              )}
            </>
          )
        )}
        <div className="account-actions">
          <button
            className="text-link"
            disabled={checking}
            onClick={() => setAttempt((a) => a + 1)}
          >
            Refresh status
          </button>
          <Link to="/shop" className="button button-dark">
            Keep exploring
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </main>
  );
}
