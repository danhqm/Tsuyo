import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  ShoppingBag,
} from "lucide-react";
import { useCommerce } from "./CommerceProvider";
import { storeRequest } from "./client";
import { money } from "../catalog";
import { readAttempt } from "./checkoutAttempt.mjs";
import SandboxBagCheckout from "./SandboxBagCheckout";
const countryName = (code) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  } catch {
    return code;
  }
};
function PurchaseCheckout({ bag, subtotal, getProduct, payment }) {
  const { session, user, settings, zones, checkoutOpen, loading, preview } =
    useCommerce();
  const [params] = useSearchParams();
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
  const quoteGeneration = useRef(0);
  function invalidateQuote() {
    quoteGeneration.current += 1;
    setQuote(null);
  }
  async function calculate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const generation = ++quoteGeneration.current;
    setQuote(null);
    setBusy(true);
    setError("");
    try {
      const next = await storeRequest(
        "quote",
        { items: pieces(), country, region: form.get("region"), coupon },
        session,
      );
      if (generation === quoteGeneration.current) setQuote(next);
    } catch (e) {
      if (generation === quoteGeneration.current) {
        setQuote(null);
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => invalidateQuote(), [JSON.stringify(bag)]);
  async function pay(event) {
    event.preventDefault();
    if (busy || !quote || !checkoutOpen || !payment?.configured) return;
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
  const closed =
    !checkoutOpen || preview || !countries.length || !payment?.configured;
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
      {params.get("cancelled") === "1" && (
        <p className="account-notice" role="status">
          You returned from Stripe before completing payment. Your bag is still
          here; review your details and try again when ready.
        </p>
      )}
      {!closed && payment?.mode === "test" && (
        <p className="account-notice" role="status">
          Stripe test checkout. Use a test card; no real money is charged.
        </p>
      )}
      <div className="checkout-grid">
        <form
          className="commerce-form"
          onSubmit={pay}
          onChange={invalidateQuote}
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
function PurchaseConfirmation({ clearBag }) {
  const [params] = useSearchParams();
  const id = params.get("order");
  const { session } = useCommerce();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [checking, setChecking] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let timer;
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
            ["pending", "processing"].includes(result.order.payment_status) &&
            attempt < 12
          )
            timer = setTimeout(() => setAttempt((a) => a + 1), 5000);
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
      clearTimeout(timer);
    };
  }, [id, session?.access_token, attempt]);
  const terminal = ["failed", "expired"].includes(data?.order.payment_status);
  return (
    <main id="main-content" className="checkout-page section-padding">
      <div className="checkout-success">
        <div className="success-icon">
          {["paid", "partially_refunded"].includes(
            data?.order.payment_status,
          ) ? (
            <Check size={32} />
          ) : ["failed", "expired"].includes(data?.order.payment_status) ||
            error ? (
            <CircleAlert size={32} />
          ) : (
            <Clock3 size={32} />
          )}
        </div>
        <h1>
          {["paid", "partially_refunded"].includes(data?.order.payment_status)
            ? "YOUR NEXT SET. CONFIRMED."
            : data?.order.payment_status === "expired"
              ? "CHECKOUT EXPIRED."
              : data?.order.payment_status === "failed"
                ? "PAYMENT NOT COMPLETED."
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
                  {terminal
                    ? "Payment was not completed for this order. Your bag is still available; return to checkout to start a new payment."
                    : "We are waiting for Stripe to confirm payment. This page alone does not confirm payment."}
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
          <Link
            to={terminal ? "/checkout" : "/shop"}
            className="button button-dark"
          >
            {terminal ? "Return to checkout" : "Keep exploring"}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </main>
  );
}

export function OrderConfirmation({ clearBag }) {
  const [params] = useSearchParams();
  return params.has("sandbox") ? (
    <SandboxConfirmation
      key={params.get("sandbox")}
      id={params.get("sandbox")}
      clearBag={clearBag}
    />
  ) : (
    <PurchaseConfirmation clearBag={clearBag} />
  );
}
function SandboxConfirmation({ id, clearBag }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true,
      timer;
    let token;
    try {
      token = sessionStorage.getItem(`tsuyo-sandbox:${id}`);
    } catch {}
    storeRequest("sandbox-result", {
      session_id: id,
      ...(token ? { access_token: token } : {}),
    })
      .then((payment) => {
        if (!active) return;
        setData(payment);
        setError("");
        if (payment.payment_status === "paid" && payment.items?.length) {
          let current;
          try {
            current = JSON.parse(sessionStorage.getItem("tsuyo-checkout"));
          } catch {}
          if (current?.session_id === id) {
            clearBag(payment.items);
            sessionStorage.removeItem("tsuyo-checkout");
          }
        }
        if (
          payment.status !== "expired" &&
          payment.payment_status !== "paid" &&
          attempt < 12
        )
          timer = setTimeout(() => setAttempt((v) => v + 1), 5000);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, attempt]);
  const paid = data?.payment_status === "paid";
  const expired = data?.status === "expired";
  return (
    <main id="main-content" className="checkout-page section-padding">
      <div className="checkout-success">
        <div className="success-icon">
          {paid ? (
            <Check size={32} />
          ) : error ? (
            <CircleAlert size={32} />
          ) : (
            <Clock3 size={32} />
          )}
        </div>
        <h1>
          {paid
            ? "TEST PAYMENT. CONFIRMED."
            : expired
              ? "TEST CHECKOUT EXPIRED."
              : "STRIPE PAYMENT TEST."}
        </h1>
        <p className="account-notice">
          Sandbox only. No real charge, order or shipment was created.
        </p>
        {error ? (
          <p role="alert">{error}</p>
        ) : data ? (
          <>
            <p role="status">
              {expired
                ? "This test checkout expired without completing payment. Your bag is still available; return to checkout to start again."
                : data.payment_status.replaceAll("_", " ")}
            </p>
            <div className="success-total">
              <span>Test amount</span>
              <strong>{money(data.amount_total / 100)}</strong>
            </div>
          </>
        ) : (
          <p role="status">Checking the test payment…</p>
        )}
        <div className="account-actions">
          <button
            className="text-link"
            onClick={() => setAttempt((v) => v + 1)}
          >
            Refresh status
          </button>
          <Link
            className="button button-dark"
            to={expired ? "/checkout" : "/shop"}
          >
            {expired ? "Return to checkout" : "Explore Tsuyo"}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function Checkout(props) {
  const { preview, checkoutOpen } = useCommerce();
  const [payment, setPayment] = useState(null),
    [failure, setFailure] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailure("");
    storeRequest("payments")
      .then((p) => {
        if (active) setPayment(p);
      })
      .catch(() => {
        if (active)
          setFailure(
            "Payment availability could not be checked. Please retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  const samples = props.bag.every((i) => {
    const p = props.getProduct(i.id);
    return p && (p.isDemo || !p.fromDatabase);
  });
  if (
    payment?.sandbox_bag_enabled &&
    payment.mode === "test" &&
    preview &&
    !checkoutOpen &&
    samples
  )
    return <SandboxBagCheckout {...props} />;
  return (
    <>
      {failure && (
        <div className="section-padding">
          <p className="account-notice" role="alert">
            {failure}
          </p>
          <button
            className="text-link"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Retry payment check
          </button>
        </div>
      )}
      <PurchaseCheckout {...props} payment={payment} />
    </>
  );
}
