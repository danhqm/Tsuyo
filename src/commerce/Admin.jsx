import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useCommerce } from "./CommerceProvider";
import { storeRequest } from "./client";
import { money } from "../catalog";
const minor = (value) => Math.round(Number(value) * 100);
const tabs = ["Products", "Orders", "Delivery", "Promos", "Settings"];
export default function Admin() {
  const {
    session,
    user,
    isStaff,
    authLoading,
    roleLoading,
    customerClient,
    reload: reloadCatalog,
  } = useCommerce();
  const [tab, setTab] = useState("Products"),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [product, setProduct] = useState(null),
    [order, setOrder] = useState(null);
  async function reload() {
    const next = await storeRequest("admin.overview", {}, session);
    setData(next);
    if (product)
      setProduct(next.products.find((p) => p.id === product.id) || product);
    if (order) {
      const found = next.orders.find((o) => o.id === order.id);
      setOrder(
        found ||
          (await storeRequest("admin.orders", { order_id: order.id }, session))
            .orders[0] ||
          order,
      );
    }
  }
  useEffect(() => {
    if (isStaff) reload().catch((e) => setError(e.message));
  }, [isStaff, session?.access_token]);
  async function run(action, body) {
    setBusy(true);
    setError("");
    try {
      await storeRequest(action, body, session);
      await reload();
      await reloadCatalog();
      setError("Saved.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (authLoading || roleLoading)
    return (
      <main id="main-content" className="admin-page section-padding">
        <h1>STORE MANAGEMENT.</h1>
        <p role="status">Checking your account…</p>
      </main>
    );
  if (!user || !isStaff)
    return (
      <main id="main-content" className="admin-page section-padding">
        <h1>STORE MANAGEMENT.</h1>
        <p>Sign in with an authorized store account to manage Tsuyo.</p>
        <Link className="button button-dark" to="/account">
          Your account
          <ArrowUpRight size={18} />
        </Link>
      </main>
    );
  return (
    <main id="main-content" className="admin-page section-padding">
      <div className="account-heading">
        <div>
          <h1>STORE MANAGEMENT.</h1>
          <p>Tsuyo · MYR</p>
        </div>
        <Link to="/account" className="text-link">
          Your account
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <nav className="admin-tabs" aria-label="Store management sections">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError("");
            }}
            aria-current={tab === t ? "page" : undefined}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && (
        <p className="account-notice" role="status">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Loading your store…</p>
      ) : (
        <>
          {tab === "Products" && (
            <div className="admin-editor-layout">
              <aside className="admin-product-list">
                <button
                  className="text-link"
                  onClick={() =>
                    setProduct({
                      id: "",
                      name: "",
                      description: "",
                      category: "men",
                      product_type: "T-shirts",
                      color: "",
                      color_hex: "#191919",
                      image_url: "",
                      fit: "",
                      care: "",
                      details: [],
                      status: "draft",
                      is_demo: true,
                      product_variants: [],
                    })
                  }
                >
                  Add product
                  <ArrowRight size={16} />
                </button>
                {data.products.map((p) => (
                  <button
                    className={product?.id === p.id ? "selected" : ""}
                    key={p.id}
                    onClick={() => setProduct(p)}
                  >
                    <img src={p.image_url} alt="" />
                    <span>
                      {p.name}
                      <small>
                        {p.status}
                        {p.is_demo ? " · illustrative" : ""}
                      </small>
                    </span>
                  </button>
                ))}
              </aside>
              {!product ? (
                <div className="account-empty">
                  <h2>Your collection</h2>
                  <p>Select a piece to manage its details, sizes and stock.</p>
                  <p>
                    The starter catalog contains four drafts with illustrative
                    prices and zero stock.
                  </p>
                </div>
              ) : (
                <section key={product.id || "new"}>
                  <h2>{product.name || "New product"}</h2>
                  <form
                    className="commerce-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run("admin.product", {
                        product: {
                          ...product,
                          ...Object.fromEntries(f),
                          is_demo: !f.has("real"),
                          details: String(f.get("details"))
                            .split("\n")
                            .filter(Boolean),
                        },
                      });
                    }}
                  >
                    <div className="form-pair">
                      <label>
                        Product URL
                        <input
                          name="id"
                          defaultValue={product.id}
                          readOnly={!!product.id}
                          required
                          pattern="[a-z0-9-]+"
                          maxLength={80}
                        />
                      </label>
                      <label>
                        Product name
                        <input
                          name="name"
                          defaultValue={product.name}
                          required
                          maxLength={120}
                        />
                      </label>
                    </div>
                    <label>
                      Description
                      <textarea
                        name="description"
                        defaultValue={product.description}
                        required
                        maxLength={3000}
                      />
                    </label>
                    <div className="form-pair">
                      <label>
                        Collection
                        <select name="category" defaultValue={product.category}>
                          <option value="men">Men</option>
                          <option value="women">Women</option>
                          <option value="unisex">Unisex</option>
                        </select>
                      </label>
                      <label>
                        Product type
                        <input
                          name="product_type"
                          defaultValue={product.product_type}
                          required
                        />
                      </label>
                    </div>
                    <div className="form-pair">
                      <label>
                        Colour name
                        <input
                          name="color"
                          defaultValue={product.color}
                          required
                        />
                      </label>
                      <label>
                        Colour hex
                        <input
                          name="color_hex"
                          defaultValue={product.color_hex}
                          pattern="#[0-9A-Fa-f]{6}"
                          required
                        />
                      </label>
                    </div>
                    <label>
                      Image URL
                      <input
                        name="image_url"
                        value={product.image_url}
                        onChange={(e) =>
                          setProduct((p) => ({
                            ...p,
                            image_url: e.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Upload product photograph
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={busy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10485760) {
                            setError("Choose an image smaller than 10 MB.");
                            return;
                          }
                          setBusy(true);
                          setError("");
                          const extension = {
                            "image/jpeg": "jpg",
                            "image/png": "png",
                            "image/webp": "webp",
                            "image/avif": "avif",
                          }[file.type];
                          if (!extension) {
                            setError("Use a JPG, PNG, WebP or AVIF image.");
                            setBusy(false);
                            return;
                          }
                          const path = `products/${crypto.randomUUID()}.${extension}`;
                          const { error } = await customerClient.storage
                            .from("product-media")
                            .upload(path, file, {
                              contentType: file.type,
                              upsert: false,
                            });
                          if (error) setError(error.message);
                          else
                            setProduct((p) => ({
                              ...p,
                              image_url: customerClient.storage
                                .from("product-media")
                                .getPublicUrl(path).data.publicUrl,
                            }));
                          setBusy(false);
                        }}
                      />
                    </label>
                    <label>
                      Fit
                      <input
                        name="fit"
                        defaultValue={product.fit}
                        maxLength={200}
                      />
                    </label>
                    <label>
                      Details (one per line)
                      <textarea
                        name="details"
                        defaultValue={product.details?.join("\n") || ""}
                      />
                    </label>
                    <label>
                      Care instructions
                      <textarea
                        name="care"
                        defaultValue={product.care}
                        maxLength={500}
                      />
                    </label>
                    <label>
                      Status
                      <select name="status" defaultValue={product.status}>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label className="consent-line">
                      <input
                        name="real"
                        type="checkbox"
                        defaultChecked={!product.is_demo}
                      />
                      This is real merchandise with confirmed descriptions and
                      prices.
                    </label>
                    <button className="button button-dark" disabled={busy}>
                      Save product
                      <ArrowRight size={16} />
                    </button>
                  </form>
                  {product.id && (
                    <>
                      <h3 className="admin-subheading">Sizes and inventory</h3>
                      {(product.product_variants || []).map((v) => (
                        <div className="inventory-row" key={v.id}>
                          <div>
                            <strong>
                              {v.size} · {v.sku}
                            </strong>
                            <p>
                              {v.stock_on_hand - v.stock_reserved} available ·{" "}
                              {v.stock_reserved} reserved · {v.stock_on_hand} on
                              hand
                            </p>
                          </div>
                          <form
                            className="commerce-form compact-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              run("admin.variant", {
                                variant: {
                                  ...v,
                                  price_minor: minor(f.get("price")),
                                  active: f.has("active"),
                                },
                              });
                            }}
                          >
                            <label>
                              Price (RM)
                              <input
                                type="number"
                                name="price"
                                defaultValue={v.price_minor / 100}
                                step="0.01"
                                min="0.01"
                                required
                              />
                            </label>
                            <label className="consent-line">
                              <input
                                type="checkbox"
                                name="active"
                                defaultChecked={v.active}
                              />
                              Enabled
                            </label>
                            <button className="text-link" disabled={busy}>
                              Save price
                            </button>
                          </form>
                          <form
                            className="commerce-form compact-form"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              const f = new FormData(form);
                              if (
                                await run("admin.stock", {
                                  variant_id: v.id,
                                  delta: Number(f.get("delta")),
                                  reason: f.get("reason"),
                                })
                              )
                                form.reset();
                            }}
                          >
                            <label>
                              Stock change (+ / −)
                              <input
                                name="delta"
                                type="number"
                                step="1"
                                required
                              />
                            </label>
                            <label>
                              Reason
                              <input name="reason" required maxLength={200} />
                            </label>
                            <button className="text-link" disabled={busy}>
                              Adjust stock
                            </button>
                          </form>
                        </div>
                      ))}
                      <details className="address-create">
                        <summary>Add a size</summary>
                        <form
                          className="commerce-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const f = new FormData(form);
                            if (
                              await run("admin.variant", {
                                variant: {
                                  product_id: product.id,
                                  sku: f.get("sku"),
                                  size: f.get("size"),
                                  price_minor: minor(f.get("price")),
                                  active: true,
                                },
                              })
                            )
                              form.reset();
                          }}
                        >
                          <div className="form-pair">
                            <label>
                              Size
                              <input name="size" required maxLength={20} />
                            </label>
                            <label>
                              SKU
                              <input name="sku" required maxLength={120} />
                            </label>
                          </div>
                          <label>
                            Price (RM)
                            <input
                              name="price"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                            />
                          </label>
                          <button
                            className="button button-dark"
                            disabled={busy}
                          >
                            Add size
                            <ArrowRight size={16} />
                          </button>
                        </form>
                      </details>
                    </>
                  )}
                </section>
              )}
            </div>
          )}
          {tab === "Orders" && (
            <>
              <h2>Orders</h2>
              <p className="admin-help">
                Orders and payment amounts come from the server. Refunds never
                restock a garment automatically.
              </p>
              {!data.orders.length ? (
                <div className="account-empty">
                  <p>No orders yet. Paid orders will appear here.</p>
                </div>
              ) : (
                <div className="commerce-table-wrap">
                  <table className="commerce-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <button
                              className="text-link"
                              onClick={() => setOrder(o)}
                            >
                              #{o.order_number}
                            </button>
                          </td>
                          <td>{o.email}</td>
                          <td>{money(o.total_minor / 100)}</td>
                          <td>{o.payment_status.replaceAll("_", " ")}</td>
                          <td>{o.fulfillment_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.hasMoreOrders && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const page = await storeRequest(
                        "admin.orders",
                        { offset: data.orders.length },
                        session,
                      );
                      setData((d) => ({
                        ...d,
                        orders: [...d.orders, ...page.orders],
                        hasMoreOrders: page.hasMoreOrders,
                      }));
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Load older orders
                </button>
              )}
              {order && (
                <section key={order.id} className="account-section">
                  <h3>Order #{order.order_number}</h3>
                  <p>
                    {order.recipient} · {order.email}
                  </p>
                  <p>
                    {Object.values(order.shipping_address)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <ul>
                    {order.items.map((i) => (
                      <li key={i.id}>
                        {i.name} · {i.size} × {i.quantity}
                      </li>
                    ))}
                  </ul>
                  <form
                    className="commerce-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      run("admin.fulfill", {
                        order_id: order.id,
                        status: f.get("status"),
                        carrier: f.get("carrier"),
                        tracking_number: f.get("tracking"),
                      });
                    }}
                  >
                    <label>
                      Next delivery stage
                      <select name="status">
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </label>
                    <div className="form-pair">
                      <label>
                        Carrier
                        <input
                          name="carrier"
                          defaultValue={order.carrier || ""}
                        />
                      </label>
                      <label>
                        Tracking number
                        <input
                          name="tracking"
                          defaultValue={order.tracking_number || ""}
                        />
                      </label>
                    </div>
                    <button
                      className="button button-dark"
                      disabled={
                        busy ||
                        !["paid", "partially_refunded"].includes(
                          order.payment_status,
                        )
                      }
                    >
                      Update delivery
                      <ArrowRight size={16} />
                    </button>
                  </form>
                  {["paid", "partially_refunded"].includes(
                    order.payment_status,
                  ) && (
                    <details className="address-create">
                      <summary>Issue a refund</summary>
                      <form
                        className="commerce-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const f = new FormData(form);
                          const amount = minor(f.get("amount"));
                          const storageKey = `tsuyo-refund:${order.id}:${amount}`;
                          let key = sessionStorage.getItem(storageKey);
                          if (!key) {
                            key = crypto.randomUUID();
                            sessionStorage.setItem(storageKey, key);
                          }
                          if (
                            await run("admin.refund", {
                              order_id: order.id,
                              amount_minor: amount,
                              key,
                            })
                          ) {
                            sessionStorage.removeItem(storageKey);
                            form.reset();
                          }
                        }}
                      >
                        <p>
                          Refundable:{" "}
                          {money(
                            (order.total_minor - order.refund_minor) / 100,
                          )}
                          . Stripe will return funds to the original payment
                          method.
                        </p>
                        <label>
                          Refund amount (RM)
                          <input
                            name="amount"
                            type="number"
                            min="0.01"
                            max={(order.total_minor - order.refund_minor) / 100}
                            step="0.01"
                            required
                          />
                        </label>
                        <label className="consent-line">
                          <input type="checkbox" required />I confirm this
                          refund for order #{order.order_number}.
                        </label>
                        <button className="button button-dark" disabled={busy}>
                          Refund payment
                          <ArrowRight size={16} />
                        </button>
                      </form>
                    </details>
                  )}
                </section>
              )}
            </>
          )}
          {tab === "Delivery" && (
            <>
              <h2>Delivery zones</h2>
              <p className="admin-help">
                Add confirmed delivery fees for each region. Disabled zones
                cannot be used at checkout. State-specific zones take precedence
                over country-wide zones.
              </p>
              {data.zones.map((z) => (
                <ShippingForm key={z.id} zone={z} busy={busy} run={run} />
              ))}
              <ShippingForm key="new" busy={busy} run={run} />
            </>
          )}
          {tab === "Promos" && (
            <>
              <h2>Promo codes</h2>
              <p className="admin-help">
                Choose a fixed discount in MYR or a percentage discount.
              </p>
              {data.coupons.map((c) => (
                <PromoForm key={c.code} coupon={c} busy={busy} run={run} />
              ))}
              <PromoForm key="new" busy={busy} run={run} />
            </>
          )}
          {tab === "Settings" && (
            <>
              <h2>Store readiness</h2>
              <p className="admin-help">
                Enter real inventory, configure delivery, connect Stripe and its
                webhook, and test payment before opening checkout. Email
                receipts need a configured sender.
              </p>
              <form
                className="commerce-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  run("admin.settings", {
                    settings: {
                      checkout_enabled: f.has("open"),
                      tax_mode: f.get("tax"),
                      support_email: f.get("support"),
                    },
                  });
                }}
              >
                <label>
                  Support email
                  <input
                    name="support"
                    type="email"
                    defaultValue={data.settings.support_email || ""}
                  />
                </label>
                <label>
                  Tax treatment
                  <select name="tax" defaultValue={data.settings.tax_mode}>
                    <option value="inclusive">
                      Prices include any applicable tax
                    </option>
                    <option value="stripe_tax">
                      Calculate tax with configured Stripe Tax
                    </option>
                  </select>
                </label>
                <label className="consent-line">
                  <input
                    name="open"
                    type="checkbox"
                    defaultChecked={data.settings.checkout_enabled}
                  />
                  Open online checkout
                </label>
                <button className="button button-dark" disabled={busy}>
                  Save settings
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}
        </>
      )}
    </main>
  );
}
function ShippingForm({ zone, busy, run }) {
  return (
    <form
      className="commerce-form admin-zone"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run("admin.shipping", {
          zone: {
            id: zone?.id,
            name: f.get("name"),
            countries: String(f.get("countries"))
              .split(",")
              .map((v) => v.trim().toUpperCase())
              .filter(Boolean),
            regions: String(f.get("regions"))
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            fee_minor: minor(f.get("fee")),
            free_over_minor: f.get("free") === "" ? null : minor(f.get("free")),
            priority: Number(f.get("priority")),
            enabled: f.has("enabled"),
          },
        });
      }}
    >
      <h3>{zone?.name || "New delivery zone"}</h3>
      <label>
        Zone name
        <input name="name" defaultValue={zone?.name || ""} required />
      </label>
      <div className="form-pair">
        <label>
          Country codes (comma-separated)
          <input
            name="countries"
            defaultValue={zone?.countries.join(", ") || ""}
            placeholder="MY, SG"
            required
          />
        </label>
        <label>
          States or regions (optional)
          <input name="regions" defaultValue={zone?.regions.join(", ") || ""} />
        </label>
      </div>
      <div className="form-pair">
        <label>
          Delivery fee (RM)
          <input
            name="fee"
            type="number"
            defaultValue={(zone?.fee_minor || 0) / 100}
            min="0"
            step="0.01"
            required
          />
        </label>
        <label>
          Free delivery from (RM, optional)
          <input
            name="free"
            type="number"
            defaultValue={
              zone?.free_over_minor != null ? zone.free_over_minor / 100 : ""
            }
            min="0"
            step="0.01"
          />
        </label>
      </div>
      <label>
        Priority
        <input
          name="priority"
          type="number"
          defaultValue={zone?.priority || 0}
          min="0"
          max="100"
          required
        />
      </label>
      <label className="consent-line">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={zone?.enabled || false}
        />
        Enable this delivery zone
      </label>
      <button className="button button-dark" disabled={busy}>
        Save delivery zone
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
function PromoForm({ coupon, busy, run }) {
  return (
    <form
      className="commerce-form admin-zone"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const kind = f.get("kind");
        run("admin.coupon", {
          coupon: {
            code: f.get("code"),
            kind,
            amount:
              kind === "fixed"
                ? minor(f.get("amount"))
                : Math.round(Number(f.get("amount")) * 100),
            min_subtotal_minor: minor(f.get("min")),
            max_uses: f.get("max") === "" ? null : Number(f.get("max")),
            expires_at: f.get("expires") || null,
            enabled: f.has("enabled"),
          },
        });
      }}
    >
      <h3>{coupon?.code || "New promo code"}</h3>
      <label>
        Code
        <input
          name="code"
          defaultValue={coupon?.code || ""}
          pattern="[A-Za-z0-9_-]{3,30}"
          required
        />
      </label>
      <label>
        Type
        <select name="kind" defaultValue={coupon?.kind || "fixed"}>
          <option value="fixed">Fixed amount (RM)</option>
          <option value="percent">Percentage (%)</option>
        </select>
      </label>
      <label>
        Discount value
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={
            coupon
              ? coupon.kind === "fixed"
                ? coupon.amount / 100
                : coupon.amount / 100
              : ""
          }
          required
        />
      </label>
      <label>
        Minimum bag value (RM)
        <input
          name="min"
          type="number"
          min="0"
          step="0.01"
          defaultValue={(coupon?.min_subtotal_minor || 0) / 100}
          required
        />
      </label>
      <label>
        Maximum uses (optional)
        <input
          name="max"
          type="number"
          min="1"
          step="1"
          defaultValue={coupon?.max_uses || ""}
        />
      </label>
      <label>
        Expires (optional)
        <input
          name="expires"
          type="datetime-local"
          defaultValue={
            coupon?.expires_at
              ? new Date(coupon.expires_at).toISOString().slice(0, 16)
              : ""
          }
        />
      </label>
      <label className="consent-line">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={coupon?.enabled || false}
        />
        Enable this code
      </label>
      <button className="button button-dark" disabled={busy}>
        Save code
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
