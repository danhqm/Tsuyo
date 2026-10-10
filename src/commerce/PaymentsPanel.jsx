import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import { storeRequest } from "./client";
import { money } from "../catalog";
export default function PaymentsPanel({ session, products, testSession }) {
  const variants = useMemo(
    () =>
      products.flatMap((p) =>
        p.product_variants
          .filter((v) => v.active && v.price_minor >= 200)
          .map((v) => ({ ...v, name: p.name })),
      ),
    [products],
  );
  const [selected, setSelected] = useState(variants[0]?.id || "");
  const [status, setStatus] = useState(null),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const key = useRef(null);
  useEffect(() => {
    let active = true;
    setError("");
    setStatus(null);
    Promise.all([
      storeRequest("admin.payments", {}, session),
      testSession && testSession !== "cancelled"
        ? storeRequest(
            "admin.test-result",
            { session_id: testSession },
            session,
          )
        : Promise.resolve(null),
    ])
      .then(([connection, payment]) => {
        if (active) {
          setStatus(connection);
          setResult(payment);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session?.access_token, testSession, refresh]);
  async function start(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      key.current ||= crypto.randomUUID();
      const checkout = await storeRequest(
        "admin.test-checkout",
        { variant_id: selected, key: key.current },
        session,
      );
      if (!/^https:\/\/checkout\.stripe\.com\//.test(checkout.url))
        throw new Error(
          "The sandbox checkout could not be opened. Retry the connection check.",
        );
      window.location.assign(checkout.url);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  const paid = result?.payment_status === "paid";
  return (
    <section className="payments-panel">
      <h2>Stripe payments</h2>
      <p className="admin-help">
        Check the payment connection and run a sandbox payment before opening
        the store. Test payments do not charge a real card, reserve stock or
        create a fulfilment order.
      </p>
      {error && (
        <p className="account-notice" role="alert">
          {error}
        </p>
      )}
      {testSession === "cancelled" && (
        <p className="account-notice" role="status">
          Test checkout cancelled. You can start another test when ready.
        </p>
      )}
      {result && (
        <div className="account-notice" role="status">
          {paid ? (
            <Check size={20} aria-hidden="true" />
          ) : (
            <CircleAlert size={20} aria-hidden="true" />
          )}
          <p>
            {paid
              ? "Test payment confirmed."
              : "Test payment has not completed."}{" "}
            {money((result.amount_total || 0) / 100)} ·{" "}
            {result.payment_status.replaceAll("_", " ")}. No real charge or
            shipment was created.
          </p>
        </div>
      )}
      {!status && !error ? (
        <p role="status">Checking Stripe…</p>
      ) : (
        status && (
          <div className="commerce-table-wrap">
            <table className="commerce-table">
              <caption className="sr-only">Stripe connection status</caption>
              <tbody>
                <tr>
                  <th scope="row">Payment environment</th>
                  <td>
                    {status.mode === "test"
                      ? "Sandbox / test mode"
                      : "Live payments"}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Stripe account</th>
                  <td>
                    {status.connected
                      ? "Connected"
                      : "Check the secret key and selected account"}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Webhook signing secret</th>
                  <td>
                    {status.webhook_configured
                      ? "Saved — verify deliveries in Stripe"
                      : "Setup required"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      )}
      <div className="account-actions">
        <button
          className="text-link"
          disabled={busy}
          onClick={() => setRefresh((v) => v + 1)}
        >
          Check connection again
        </button>
      </div>
      <form className="commerce-form account-section" onSubmit={start}>
        <h3>Run a test checkout</h3>
        <label>
          Sample piece and size
          <select
            value={selected}
            required
            onChange={(e) => {
              setSelected(e.target.value);
              key.current = null;
            }}
          >
            {!variants.length && (
              <option value="">Add a sample size first</option>
            )}
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.size} · {money(v.price_minor / 100)}
              </option>
            ))}
          </select>
        </label>
        <p>
          Use Stripe’s test card <strong>4242 4242 4242 4242</strong>, a future
          expiry and any three-digit CVC. Delivery is omitted from this
          connection test.
        </p>
        <button
          className="button button-dark"
          disabled={
            busy ||
            !selected ||
            !status?.connected ||
            !status?.webhook_configured ||
            status.mode !== "test"
          }
        >
          {busy ? "Opening Stripe…" : "Open Stripe test checkout"}
          <ArrowRight size={17} />
        </button>
        <a
          className="text-link"
          href="https://docs.stripe.com/testing"
          target="_blank"
          rel="noreferrer"
        >
          Declined and authentication test cards
        </a>
      </form>
    </section>
  );
}
