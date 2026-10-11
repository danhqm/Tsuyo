import { products as previewProducts } from "../src/catalog.js";
import { site } from "../src/public-content.js";
import { PublicError } from "./http.mjs";
export function previewSnapshot() {
  return {
    products: previewProducts,
    settings: { name: "Tsuyo", currency: "MYR", checkout_enabled: false },
    zones: [],
    payment: { mode: "unknown", configured: false, sandbox_bag_enabled: false },
    preview: true,
  };
}
// Project only public fields; exact inventory counts never enter the output model.
export function mapPublicRow(row) {
  const variants = row.product_variants
    .filter((v) => v.active)
    .map((v) => ({
      id: v.id,
      size: v.size,
      price_minor: v.price_minor,
      active: true,
      available: v.stock_on_hand - v.stock_reserved > 0,
    }));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    type: row.product_type,
    color: row.color,
    colorHex: row.color_hex,
    image: row.image_url,
    tag: row.collection,
    sizes: variants.map((v) => v.size),
    price: Math.min(...variants.map((v) => v.price_minor)) / 100,
    fit: row.fit,
    details: row.details,
    care: row.care,
    variants,
    isDemo: row.is_demo,
    fromDatabase: true,
    updatedAt: row.updated_at,
  };
}
export async function loadPublicStore({
  env = process.env,
  fetcher = fetch,
} = {}) {
  const url = env.VITE_SUPABASE_URL,
    key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith("sb_publishable_"))
    throw new PublicError(
      503,
      "store_unavailable",
      "The public store connection is unavailable.",
      "Retry after 30 seconds or contact Tsuyo through /contact.",
    );
  const get = async (path, options = {}) => {
    const r = await fetcher(url + path, {
      ...options,
      headers: { apikey: key, ...options.headers },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("public_upstream_failed");
    return r.json();
  };
  try {
    const [rows, settings, zones, payment] = await Promise.all([
      get(
        "/rest/v1/products?select=id,name,description,category,product_type,color,color_hex,image_url,collection,fit,details,care,is_demo,updated_at,product_variants(id,size,price_minor,stock_on_hand,stock_reserved,active)&status=eq.active&order=created_at",
      ),
      get(
        "/rest/v1/store_settings?select=name,currency,checkout_enabled&limit=1",
      ),
      get(
        "/rest/v1/shipping_zones?select=id,name,countries,regions,fee_minor,free_over_minor,priority,enabled&enabled=eq.true",
      ),
      get("/functions/v1/store-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payments" }),
      }),
    ]);
    if (!settings[0] || !Array.isArray(rows) || !Array.isArray(zones))
      throw new Error("public_data_invalid");
    const products = rows
      .filter((r) => r.product_variants.some((v) => v.active))
      .map(mapPublicRow);
    return {
      products:
        products.length || settings[0].checkout_enabled
          ? products
          : previewProducts,
      settings: settings[0],
      zones,
      payment: {
        mode: ["test", "live"].includes(payment.mode)
          ? payment.mode
          : "unknown",
        configured: payment.configured === true,
        sandbox_bag_enabled: payment.sandbox_bag_enabled === true,
      },
      preview: products.length
        ? products.some((p) => p.isDemo)
        : !settings[0].checkout_enabled,
    };
  } catch {
    throw new PublicError(
      503,
      "store_unavailable",
      "Public store data could not be fetched.",
      "Retry after 30 seconds. Do not assume checkout or stock is available.",
    );
  }
}
export function productDTO(p) {
  const preview = !p.fromDatabase || p.isDemo;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    type: p.type,
    color: p.color,
    price_minor: Math.round(p.price * 100),
    currency: "MYR",
    preview,
    available: !preview && !!p.variants?.some((v) => v.available),
    variants: p.sizes.map((size) => {
      const v = p.variants?.find((v) => v.size === size);
      return {
        size,
        price_minor: v?.price_minor || Math.round(p.price * 100),
        available: !preview && v?.available === true,
      };
    }),
    fit: p.fit,
    details: p.details || [],
    care: p.care,
    image_url: new URL(p.image, site.url).href,
    url: site.url + "/product/" + p.id,
  };
}
export function storeDTO(s) {
  return {
    name: "Tsuyo Gymwear",
    url: site.url,
    currency: "MYR",
    preview: s.preview,
    checkout_enabled: s.settings.checkout_enabled === true,
    payment_mode: s.payment.mode,
    payments_configured: s.payment.configured,
    sandbox_bag_enabled: s.payment.sandbox_bag_enabled,
    shipping_configured: s.zones.length > 0,
    shipping_zones: s.zones.map((z) => ({
      name: z.name,
      countries: z.countries,
      regions: z.regions,
      fee_minor: z.fee_minor,
      free_over_minor: z.free_over_minor,
    })),
    notice: s.preview
      ? "Products and prices are illustrative. Sandbox payments do not create fulfilment orders or reserve stock."
      : "Prices and availability may change. Recheck checkout and delivery before purchasing.",
  };
}
export function searchProducts(
  s,
  { q = "", category, limit = 20, offset = 0 } = {},
) {
  const all = s.products
    .map(productDTO)
    .filter(
      (p) =>
        (!category || p.category === category) &&
        `${p.name} ${p.color} ${p.type}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    );
  return {
    products: all.slice(offset, offset + limit),
    total: all.length,
    limit,
    offset,
  };
}
