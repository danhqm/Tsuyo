import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { supabase } from "./client";
import { useCommerce } from "./CommerceProvider";
import { money } from "../catalog";
function Notice({ children }) {
  return (
    <p className="account-notice" role="status">
      {children}
    </p>
  );
}
export default function Account() {
  const { configured, user, session, customerClient, authLoading, isStaff } =
    useCommerce();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") || "signin";
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [orders, setOrders] = useState([]),
    [addresses, setAddresses] = useState([]),
    [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setMessage(""), [mode]);
  useEffect(() => {
    if (!customerClient) return;
    let active = true;
    setLoaded(false);
    Promise.all([
      customerClient
        .from("orders")
        .select(
          "id,order_number,total_minor,payment_status,fulfillment_status,created_at",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      customerClient.from("addresses").select("*").order("created_at"),
      customerClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
    ]).then(([o, a, p]) => {
      if (active) {
        if (o.error || a.error || p.error)
          setMessage(
            "We couldn’t load your account. Please refresh and try again.",
          );
        else {
          setOrders(o.data);
          setAddresses(a.data);
          setProfile(p.data);
        }
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [customerClient, user?.id]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      let result;
      if (mode === "signup")
        result = await supabase.auth.signUp({
          email: form.get("email"),
          password: form.get("password"),
          options: {
            data: { full_name: form.get("name") },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });
      else if (mode === "reset")
        result = await supabase.auth.resetPasswordForEmail(form.get("email"), {
          redirectTo: `${window.location.origin}/account?mode=recovery`,
        });
      else if (mode === "recovery")
        result = await supabase.auth.updateUser({
          password: form.get("password"),
        });
      else
        result = await supabase.auth.signInWithPassword({
          email: form.get("email"),
          password: form.get("password"),
        });
      if (result.error) throw result.error;
      setMessage(
        mode === "signup"
          ? "Check your inbox to confirm your email address."
          : mode === "reset"
            ? "If an account exists, you’ll receive a reset link."
            : mode === "recovery"
              ? "Your password has been updated."
              : "",
      );
      if (mode === "recovery") setParams({});
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (authLoading)
    return (
      <main id="main-content" className="account-page section-padding">
        <h1>YOUR ACCOUNT.</h1>
        <Notice>Loading your account…</Notice>
      </main>
    );
  if (!configured)
    return (
      <main id="main-content" className="account-page section-padding">
        <h1>YOUR ACCOUNT.</h1>
        <Notice>
          Customer accounts are being set up. Please check back soon.
        </Notice>
      </main>
    );
  if (!user || mode === "recovery")
    return (
      <main id="main-content" className="account-page section-padding">
        <div className="auth-layout">
          <div>
            <h1>
              {mode === "signup"
                ? "JOIN THE PURSUIT."
                : mode === "reset"
                  ? "RESET YOUR PASSWORD."
                  : mode === "recovery"
                    ? "A FRESH START."
                    : "WELCOME BACK."}
            </h1>
            <p>Keep your rotation, addresses and orders in one place.</p>
          </div>
          <form className="commerce-form" onSubmit={submit}>
            {mode === "signup" && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={120}
                />
              </label>
            )}
            {mode !== "recovery" && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  minLength={mode === "signin" ? undefined : 8}
                  maxLength={128}
                />
              </label>
            )}
            <button className="button button-dark" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : mode === "recovery"
                      ? "Update password"
                      : "Sign in"}
              <ArrowRight size={18} />
            </button>
            {message && <Notice>{message}</Notice>}
            <div className="auth-links">
              <Link
                to={`/account?mode=${mode === "signin" ? "signup" : "signin"}`}
              >
                {mode === "signin" ? "Create an account" : "Back to sign in"}
              </Link>
              {mode === "signin" && (
                <Link to="/account?mode=reset">Forgot password?</Link>
              )}
            </div>
          </form>
        </div>
      </main>
    );
  return (
    <main id="main-content" className="account-page section-padding">
      <div className="account-heading">
        <div>
          <h1>YOUR ROTATION.</h1>
          <p>{user.email}</p>
        </div>
        <div className="account-actions">
          {isStaff && (
            <Link to="/admin" className="text-link">
              Manage store
              <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="text-link"
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) setMessage(error.message);
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {message && <Notice>{message}</Notice>}
      {!loaded ? (
        <Notice>Loading your details…</Notice>
      ) : (
        <>
          <section className="account-section">
            <h2>Your orders</h2>
            {orders.length ? (
              <div className="commerce-table-wrap">
                <table className="commerce-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/checkout/complete?order=${o.id}`}>
                            #{o.order_number}
                          </Link>
                        </td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>{money(o.total_minor / 100)}</td>
                        <td>{o.payment_status.replaceAll("_", " ")}</td>
                        <td>{o.fulfillment_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="account-empty">
                <p>Your first rotation is waiting.</p>
                <Link to="/shop" className="text-link">
                  Explore the collection
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </section>
          <div className="account-columns">
            <section className="account-section">
              <h2>Your details</h2>
              <form
                className="commerce-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setBusy(true);
                  const { error } = await customerClient
                    .from("profiles")
                    .upsert({
                      id: user.id,
                      full_name: f.get("name"),
                      phone: f.get("phone"),
                      updated_at: new Date().toISOString(),
                    });
                  setBusy(false);
                  setMessage(error ? error.message : "Your details are saved.");
                }}
              >
                <label>
                  Full name
                  <input
                    name="name"
                    defaultValue={
                      profile?.full_name || user.user_metadata?.full_name || ""
                    }
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    defaultValue={profile?.phone || ""}
                    maxLength={40}
                  />
                </label>
                <button className="button button-dark" disabled={busy}>
                  Save details
                  <ArrowRight size={16} />
                </button>
              </form>
            </section>
            <section className="account-section">
              <h2>Delivery addresses</h2>
              {addresses.map((a) => (
                <div className="address-row" key={a.id}>
                  <div>
                    <strong>
                      {a.label} · {a.recipient}
                    </strong>
                    <p>
                      {a.line1}, {a.city}, {a.region}, {a.postal_code},{" "}
                      {a.country}
                    </p>
                  </div>
                  <button
                    className="text-link"
                    aria-label={`Remove ${a.label} address`}
                    onClick={async () => {
                      const { error } = await customerClient
                        .from("addresses")
                        .delete()
                        .eq("id", a.id);
                      if (error) setMessage(error.message);
                      else setAddresses((v) => v.filter((x) => x.id !== a.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <details className="address-create">
                <summary>Add an address</summary>
                <form
                  className="commerce-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    const row = Object.fromEntries(f);
                    row.country = row.country.toUpperCase();
                    row.user_id = user.id;
                    setBusy(true);
                    const { data, error } = await customerClient
                      .from("addresses")
                      .insert(row)
                      .select()
                      .single();
                    setBusy(false);
                    if (error) setMessage(error.message);
                    else {
                      setAddresses((v) => [...v, data]);
                      form.reset();
                      setMessage("Your address is saved.");
                    }
                  }}
                >
                  {[
                    "label",
                    "recipient",
                    "line1",
                    "city",
                    "region",
                    "postal_code",
                    "country",
                  ].map((k) => (
                    <label key={k}>
                      {
                        {
                          label: "Address label",
                          recipient: "Recipient",
                          line1: "Street address",
                          city: "City",
                          region: "State or region",
                          postal_code: "Postcode",
                          country: "Country code (MY, SG, etc.)",
                        }[k]
                      }
                      <input
                        name={k}
                        required
                        maxLength={k === "country" ? 2 : 200}
                        pattern={k === "country" ? "[A-Za-z]{2}" : undefined}
                        defaultValue={
                          k === "label"
                            ? "Home"
                            : k === "country"
                              ? "MY"
                              : undefined
                        }
                      />
                    </label>
                  ))}
                  <button className="button button-dark" disabled={busy}>
                    Save address
                    <ArrowRight size={16} />
                  </button>
                </form>
              </details>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
