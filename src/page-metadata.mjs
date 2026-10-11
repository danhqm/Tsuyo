import { contentPage, pageAliases, site } from "./public-content.js";
const titles = {
  "/": "Tsuyo Gymwear | Built Through Effort",
  "/shop": "Tsuyo Gymwear | Core Collection",
  "/mindset": "The Tsuyo Mindset",
  "/help/sizing": "Tsuyo Size Guide",
  "/help/delivery": "Tsuyo Delivery & Returns",
  "/help/terms": "Tsuyo Terms",
  "/account": "Your Tsuyo Account",
  "/admin": "Tsuyo Store Management",
  "/checkout": "Tsuyo Checkout",
  "/checkout/complete": "Tsuyo Order Confirmation",
};
const privatePaths = ["/account", "/admin", "/checkout", "/checkout/complete"];
export function pageMetadata(path, productName) {
  if (!/^\/product\/[a-z0-9-]+$/.test(path)) productName = undefined;
  const page = contentPage(path);
  const known = !!page || !!titles[path] || !!productName;
  return {
    title:
      page?.title ||
      (productName ? `${productName} | Tsuyo Gymwear` : titles[path]) ||
      "Page Not Found | Tsuyo",
    canonical: site.url + (pageAliases[path] || path),
    robots:
      !known || privatePaths.includes(path)
        ? "noindex, nofollow"
        : "index, follow",
  };
}
