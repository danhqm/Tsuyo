export const site = {
  url: "https://tsuyo.vercel.app",
  name: "Tsuyo Gymwear",
  email: "admin@tsuyo.com",
  phone: "0123456789",
  postalCode: "52780",
  updated: "2026-10-11",
};
export const pages = {
  "/about": {
    title: "About Tsuyo Gymwear",
    sections: [
      {
        title: "Strength is built",
        paragraphs: [
          "Tsuyo is a gymwear storefront built around the everyday pursuit of strength. The collection brings together oversized tees, training shorts, pump covers and a women’s training set. Its visual identity takes cues from industrial training spaces: monochrome photographs, quiet branding and upright, readable typography. The phrase ‘Built Through Effort’ describes the mindset behind the brand, from the first warm-up to the last working set.",
          "Browse the men’s and women’s collections, read each piece’s fit and care information, and choose a size before adding it to your bag. Prices are shown in Malaysian ringgit (MYR). Product descriptions, images and size guidance in the preview collection are illustrative; they should not be treated as verified manufacturing specifications or a promise of availability.",
        ],
      },
      {
        title: "The store today",
        paragraphs: [
          "The storefront currently supports a separate Stripe sandbox flow for trying the payment experience. A sample payment does not create a fulfilment order or reserve real inventory. Live purchases depend on the store’s current checkout setting, published products and configured delivery rates. Malaysia and international delivery are planned, with regions and rates still to be configured. Check the store status endpoint for current availability, or contact Tsuyo before making purchasing plans.",
        ],
      },
    ],
    links: [
      { label: "Explore the collection", href: "/shop" },
      { label: "Contact Tsuyo", href: "/contact" },
      { label: "Current store status", href: "/api/store" },
    ],
  },
  "/contact": {
    title: "Contact Tsuyo",
    sections: [
      {
        title: "Talk to us",
        paragraphs: [
          "For collection questions, fit guidance, account help or a question about the checkout experience, email admin@tsuyo.com. Tsuyo’s public phone number is 0123456789. Include the name of the piece and size you are asking about so the team can understand your request. For an account issue, describe what happened and the page you were using; never include your password, card details, a secret API key or a payment receipt access token in your message.",
          "The public postal code supplied for Tsuyo is 52780. A street address and visitor or returns location have not been published. Please contact the team before sending a parcel or planning a visit. The postal code alone is not a shipping destination. Opening hours and response times have not been announced.",
        ],
      },
      {
        title: "Before you order",
        paragraphs: [
          "The collection currently includes illustrative products and prices. Stripe sandbox payments are for testing and do not create a real delivery or fulfilment order. Delivery regions, fees and return arrangements must be confirmed before live sales open. If your question concerns a test payment, explain that it was a sandbox checkout. For current programmatic information, the public store status API and developer documentation are available without an account.",
        ],
      },
    ],
    links: [
      { label: "Email Tsuyo", href: "mailto:admin@tsuyo.com" },
      { label: "Call 0123456789", href: "tel:0123456789" },
      { label: "Delivery information", href: "/help/delivery" },
    ],
  },
  "/privacy": {
    title: "Tsuyo Privacy",
    sections: [
      {
        title: "What this storefront stores",
        paragraphs: [
          "Tsuyo uses browser storage to remember a guest’s bag and saved pieces on that device. Signing in uses Supabase Auth; account sessions are stored by its browser client. For signed-in customers, shopping data can be synchronized with the connected Supabase database. Account features can store profile details, saved delivery addresses, cart items, wishlists and order records. Access to customer records is controlled through authentication and database policies. Public catalog APIs and MCP tools do not accept customer credentials and do not return profiles, addresses or orders.",
          "When you subscribe to the newsletter, the storefront records the submitted email and consent in Supabase. Marketing email delivery requires a configured sender. This notice does not promise that a subscription immediately sends an email. You can contact admin@tsuyo.com about a subscription or a privacy request; explain which account or email the request concerns without sharing your password.",
        ],
      },
      {
        title: "Checkout and service providers",
        paragraphs: [
          "Hosted card entry happens on Stripe’s checkout page. Tsuyo does not ask you to enter full card details into its own forms. The store passes the checkout information needed for the selected flow to Stripe and uses verified payment events to update payment status. Sandbox sample checkouts are isolated from real orders and stock. Browser session storage retains the information needed to resume or verify a sample checkout. Treat receipt links and access tokens as private.",
          "Vercel serves this website, Supabase provides its database and authentication, and Stripe processes hosted payments. Requests to these services involve technical request information such as IP addresses. This page describes the implemented storefront; final retention schedules and the legal entity’s complete policy still need to be published before live trading. Contact admin@tsuyo.com for access, correction or deletion questions. You can clear guest shopping data using your browser’s site-data controls; clearing local data does not delete an existing account.",
        ],
      },
    ],
    links: [
      { label: "Privacy enquiries", href: "mailto:admin@tsuyo.com" },
      { label: "Your account", href: "/account" },
    ],
  },
  "/docs": {
    title: "Tsuyo API & Agent Docs",
    sections: [
      {
        title: "When to use Tsuyo",
        paragraphs: [
          "Use Tsuyo’s public API to find gymwear by name or category, compare MYR prices and sizes, read fit and care descriptions, or check whether checkout and delivery are configured. The API and MCP server expose public information only. They cannot create a bag, place an order, charge a card, inspect customer records or administer the store. Illustrative pieces are explicitly marked preview and must not be recommended as available for purchase.",
          "No authentication, account or API key is required for these read-only endpoints. Customer account and payment workflows remain in the storefront. Do not send a Supabase token, Stripe key or customer email to the public API. Recheck store status before discussing a purchase; successful catalog discovery is not a stock reservation.",
        ],
      },
      {
        title: "REST endpoints",
        paragraphs: [
          "GET /api returns the API index. GET /api/products accepts q (up to 100 characters), category (men, women or unisex), limit (1–50; default 20) and offset (0–10000; default 0). GET /api/products/{id} returns one public piece. GET /api/store returns checkout, payment and shipping status. GET /api/pages?path=/contact returns a public page as Markdown inside JSON. All prices use integer minor units: 14900 MYR means RM 149.00. The OpenAPI 3.0.3 document specifies operations, parameters and response schemas.",
          "Use GET for reads, HEAD for headers and OPTIONS for CORS preflight. Unsupported methods return 405. API failures use application/problem+json (RFC 9457), with status, code, message and resolution. Invalid parameters return 400, missing resources 404, and unavailable store data 503 with Retry-After. Respect Retry-After and avoid rapid retries. Product pages and store data are fetched anonymously; user sessions never enter a public response.",
        ],
        code: "curl 'https://tsuyo.vercel.app/api/products?q=tee&category=men&limit=5'\ncurl -H 'Accept: text/markdown' https://tsuyo.vercel.app/",
      },
      {
        title: "MCP connection",
        paragraphs: [
          "Connect an MCP client to https://tsuyo.vercel.app/mcp using Streamable HTTP. The server uses the official MCP SDK, negotiates supported protocol versions and returns JSON responses. Initialize the client, then list tools. POST requests accept application/json and text/event-stream. This server is stateless and does not issue session IDs; GET returns 405 because it offers no unsolicited event stream.",
          "The tools are search_products, get_product, get_store_status and read_page. They have typed inputs and outputs and read-only annotations. Public discovery metadata at /.well-known/mcp and /server.json follows the MCP Registry server.json schema. Publishing this metadata does not mean Tsuyo is listed or verified in a third-party registry. Browser clients with an Origin header must use Tsuyo’s origin; server-to-server clients need no Origin header.",
        ],
      },
    ],
    links: [
      { label: "OpenAPI specification", href: "/openapi.json" },
      { label: "API index", href: "/api" },
      { label: "Agent instructions", href: "/llms.txt" },
      { label: "MCP discovery", href: "/.well-known/mcp" },
      { label: "Authentication guidance", href: "/docs/auth" },
      { label: "Error guidance", href: "/docs/errors" },
    ],
  },
  "/docs/auth": {
    title: "Tsuyo API Authentication",
    sections: [
      {
        title: "Public reads",
        paragraphs: [
          "The public catalog, store status and public page endpoints require no authentication. The MCP endpoint also serves only public, read-only tools. Do not attach customer bearer tokens or secret API keys. It cannot access bags, account data, orders or administrative actions. Use the storefront’s account page for authenticated customer features; payment authorization remains with the hosted Stripe checkout and the existing commerce backend.",
        ],
      },
    ],
    links: [{ label: "Tsuyo API docs", href: "/docs" }],
  },
  "/docs/errors": {
    title: "Tsuyo API Errors",
    sections: [
      {
        title: "Recover from an error",
        paragraphs: [
          "REST errors use RFC 9457 application/problem+json. Read status, code, message and resolution rather than parsing HTML. invalid_parameter (400) means correct the named input; not_found (404) means consult the API index or catalog; method_not_allowed (405) means use GET, HEAD or OPTIONS; store_unavailable (503) means retry after the Retry-After interval. MCP protocol errors use JSON-RPC, while tool failures return isError with a structured problem in text content. A successful search with no matches is an empty products array, not an error.",
        ],
      },
    ],
    links: [
      { label: "Tsuyo API docs", href: "/docs" },
      { label: "OpenAPI specification", href: "/openapi.json" },
    ],
  },
};
export const pageAliases = {
  "/developers": "/docs",
  "/help/contact": "/contact",
  "/help/privacy": "/privacy",
};
export function contentPage(path) {
  return pages[pageAliases[path] || path];
}
export function pageMarkdown(path) {
  const page = contentPage(path);
  if (!page) return null;
  return (
    `# ${page.title}\n\n` +
    page.sections
      .map(
        (s) =>
          `## ${s.title}\n\n${s.paragraphs.join("\n\n")}${s.code ? `\n\n\`\`\`sh\n${s.code}\n\`\`\`` : ""}`,
      )
      .join("\n\n") +
    "\n\n" +
    (page.links || [])
      .map(
        (l) =>
          `- [${l.label}](${l.href.startsWith("/") ? site.url + l.href : l.href})`,
      )
      .join("\n") +
    `\n\nUpdated ${site.updated}.\n`
  );
}
