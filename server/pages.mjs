import { pageMetadata } from "../src/page-metadata.mjs";
import {
  pages,
  contentPage,
  pageMarkdown,
  pageAliases,
  site,
} from "../src/public-content.js";
export const staticPaths = [
  "/",
  "/shop",
  "/mindset",
  "/help/sizing",
  "/help/delivery",
  "/help/terms",
  ...Object.keys(pages),
];
export const appPaths = [
  "/account",
  "/admin",
  "/checkout",
  "/checkout/complete",
];
export function knownPage(path, s) {
  return (
    staticPaths.includes(path) ||
    !!pageAliases[path] ||
    appPaths.includes(path) ||
    s?.products.some((p) => path === "/product/" + p.id)
  );
}
export function metadataTitle(path, s) {
  return pageMetadata(
    path,
    s?.products.find((p) => path === "/product/" + p.id)?.name,
  ).title;
}
export function markdownFor(path, s) {
  const content = pageMarkdown(path);
  if (content) return content;
  const p = s?.products.find((p) => path === "/product/" + p.id);
  if (p)
    return `# ${p.name}\n\n${p.description}\n\n- Colour: ${p.color}\n- Price: RM ${p.price.toFixed(2)} (MYR)\n- Sizes: ${p.sizes.join(", ")}\n- Fit: ${p.fit}\n- ${!p.fromDatabase || p.isDemo ? "Illustrative preview; not a fulfilment offer." : "Availability is subject to current stock and checkout settings."}\n\n## Details\n\n${p.details.map((d) => "- " + d).join("\n")}\n\n## Care\n\n${p.care}\n\n[Store status](${site.url}/api/store)\n`;
  const products = s?.products || [];
  const collection = products
    .map(
      (p) =>
        `- [${p.name}](${site.url}/product/${p.id}): RM ${p.price.toFixed(2)}; ${p.color}; sizes ${p.sizes.join(", ")}. ${p.description}`,
    )
    .join("\n");
  if (path === "/" || path === "/shop")
    return `# Tsuyo Gymwear — Built Through Effort\n\nStrength is built. Every rep. Every day. Tsuyo’s gymwear collection includes oversized essentials, everyday training shorts, pump covers and women’s training pieces. Explore fit and care information, choose your size and build your training rotation. Prices are in Malaysian ringgit (MYR).\n\n## The core collection\n\n${collection}\n\n## Store availability\n\n${s.preview ? "This is a concept storefront. Products, descriptions and prices are illustrative; a Stripe sandbox payment does not create a fulfilment order or reserve real stock." : "Check the public store status before planning a purchase."} Delivery regions and rates must be configured before live sales.\n\n## Find your next step\n\n[Shop](${site.url}/shop) · [About](${site.url}/about) · [Contact](${site.url}/contact) · [Privacy](${site.url}/privacy) · [Tsuyo API & agent docs](${site.url}/docs)\n`;
  const text = {
    "/mindset":
      "Strength is built through the work you put in. Every rep. Every day. Discover the Tsuyo training mindset and explore the gymwear collection.",
    "/help/sizing":
      "Size guidance is illustrative. Tees and shorts use S, M, L, XL and XXL; the Form Training Set uses XS through XL. Open the HTML size guide for its illustrative measurements, and contact Tsuyo before relying on them for a purchase.",
    "/help/delivery":
      "Malaysia and international delivery are planned. Delivery regions, fees, free-shipping thresholds and return arrangements are not yet configured. Check /api/store for current configured zones and contact Tsuyo before planning a real order.",
    "/help/terms":
      "The preview catalog uses illustrative products and prices. Sandbox payments are isolated from fulfilment orders and stock. Final shipping, returns and trading terms must be confirmed before live sales.",
    "/account":
      "Use the secure storefront account page with JavaScript to sign in and manage your own shopping data. Public APIs never expose customer account information.",
    "/admin":
      "Store management requires a verified authorized account. Public APIs and MCP tools do not expose administration or private data.",
    "/checkout":
      "Review your bag in the interactive storefront before proceeding to hosted Stripe checkout. A sandbox checkout is clearly labelled and does not create a real order.",
    "/checkout/complete":
      "Payment confirmation is verified by the private checkout flow. Public Markdown never includes a session token, receipt or customer details.",
  }[path];
  if (text)
    return `# ${metadataTitle(path, s)}\n\n${text}\n\n[Tsuyo docs](${site.url}/docs) · [Contact](${site.url}/contact)\n`;
  return `# Page not found\n\nThe requested page does not exist. Find public resources in [Tsuyo docs](${site.url}/docs), [the sitemap](${site.url}/sitemap.xml), or [agent instructions](${site.url}/llms.txt).\n`;
}
export const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": site.url + "/#organization",
  name: "Tsuyo Gymwear",
  url: site.url,
  description:
    "Gymwear for the everyday pursuit of strength. Oversized tees, training shorts, pump covers and training sets, with prices in MYR.",
  logo: site.url + "/favicon.svg",
  contactPoint: {
    "@type": "ContactPoint",
    email: site.email,
    telephone: site.phone,
    contactType: "customer support",
  },
  address: { "@type": "PostalAddress", postalCode: site.postalCode },
};
export function sitemapFor(s) {
  const urls = [...staticPaths, ...s.products.map((p) => "/product/" + p.id)];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (path) =>
          `  <url><loc>${site.url + path}</loc><lastmod>${s.products.find((p) => path === "/product/" + p.id)?.updatedAt?.slice(0, 10) || site.updated}</lastmod></url>`,
      )
      .join("\n") +
    "\n</urlset>\n"
  );
}
