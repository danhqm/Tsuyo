import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = !!url && !!key && key.startsWith("sb_publishable_");
export const supabase = configured ? createClient(url, key) : null;
export function userClient(session) {
  return session
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      })
    : null;
}
export async function storeRequest(action, body = {}, session = null) {
  if (!configured)
    throw new Error(
      "The store connection is being set up. Please check back soon.",
    );
  const response = await fetch(`${url}/functions/v1/store-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ ...body, action }),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The store could not complete this request. Please try again.",
    );
  }
  if (!response.ok) {
    const error = new Error(result.error || "Please try again.");
    error.status = response.status;
    throw error;
  }
  return result;
}
export function mapProduct(row) {
  const variants = (row.product_variants || []).filter((v) => v.active);
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
  };
}
