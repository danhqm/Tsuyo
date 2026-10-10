# Tsuyo

Live storefront: **[tsuyo.vercel.app](https://tsuyo.vercel.app)**. Vercel hosts the React application; Supabase hosts its database, authentication and store API. Checkout remains closed while the real catalog, shipping and payment setup are prepared.

The Supabase backend is now deployed to the **E-commerce** project. Customer accounts, catalog/inventory, persistent shopping data, orders, shipping, coupons, protected store management, Stripe integration and maintenance jobs are implemented. Real payments remain disabled. Stripe sandbox checkout and signed webhook delivery are verified; delivery rates await configuration and the catalog remains in draft. See [BACKEND.md](BACKEND.md) for setup, verification and launch steps. The storefront routes are `/account`, `/admin`, and `/checkout`. See [STRIPE.md](STRIPE.md) for the customer payment journey and protected sandbox testing.

A gymwear storefront in MYR, built with React, Vite, GSAP ScrollTrigger, and Lenis. The visual direction draws from the supplied Achilles Heel reference and the images in `references/`: industrial gyms, hard monochrome light, strong condensed type, and restrained vermilion accents. Typography is self-hosted Barlow Condensed and Manrope, with no italics.

## Run

```sh
npm install
npm run dev
```

The preview runs at http://localhost:5173. `npm run build` creates `dist/`, and `npm run preview` serves that build. A deployed host needs to rewrite application routes to `index.html`.

