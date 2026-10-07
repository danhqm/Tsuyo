# Tsuyo

The Supabase backend is now deployed to the **E-commerce** project. Customer accounts, catalog/inventory, persistent shopping data, orders, shipping, coupons, protected store management, Stripe integration and maintenance jobs are implemented. Payments remain disabled, delivery rates await configuration, and the catalog remains in draft. See [BACKEND.md](BACKEND.md) for setup, verification and launch steps. The storefront routes are `/account`, `/admin`, and `/checkout`.

A gymwear storefront in MYR, built with React, Vite, GSAP ScrollTrigger, and Lenis. The visual direction draws from the supplied Achilles Heel reference and the images in `references/`: industrial gyms, hard monochrome light, strong condensed type, and restrained vermilion accents. Typography is self-hosted Barlow Condensed and Manrope, with no italics.

## Run

```sh
npm install
npm run dev
```

The preview runs at http://localhost:5173. `npm run build` creates `dist/`, and `npm run preview` serves that build. A deployed host needs to rewrite application routes to `index.html`.

## Storefront

- Pinned hero with scroll-linked zoom and receding headline.
- Pinned mindset section with an expanding photograph and two text chapters.
- Native scrolling on touch, reduced-motion alternatives, contextual campaign cursor, image hover zoom, and touch-accessible quick add.
- Men's and women's collection filters, product category filters, price/name sorting, live search and empty states.
- Product detail routes, size validation, illustrative size guide, and care accordions.
- Shopping bag with quantity controls and totals, saved pieces, and browser persistence.
- Responsive navigation and native dialog panels with keyboard focus management and Escape dismissal.
- Connected checkout with server quotes and a closed-store guard until enabled.
- Newsletter consent saved through the protected backend. Email campaigns are not sent.

## Catalog and integrations

The four products, MYR prices, descriptions, and size measurements are illustrative. Prepare the real catalog and inventory in `/admin`; `src/catalog.js` supplies the labelled design preview while the catalog remains in draft. The supplied reference photos are mood references; original third-party garment logos are not used as Tsuyo catalog imagery.

The Supabase data model and management interfaces are connected. Stripe payment credentials and a transactional email sender are not configured; no charges or receipts are sent. Final stock, delivery rates, tax setup and commercial policies must be confirmed before checkout opens.

## Media

Six original images were generated through Higgsfield with GPT Image 2.5: the hero, four product photographs, and the women's campaign. Optimized WebP files are in `public/assets/`, with exact prompts embedded in EXIF descriptions. Their prompts, original URLs, and generation IDs are recorded in `scripts/asset-sources.json`. The mindset photograph is a supplied reference, and its source path is embedded in its metadata.

The requested Seedance 2.5 video could not be submitted because Higgsfield returned "Out of credits on plus (monthly) plan in Private workspace." No video generation job exists. The exact follow-up request is prepared in `scripts/seedance-request.json`. After generating the clip, save it as `public/assets/campaign.mp4` and set `campaign.video` in `src/catalog.js` to `/assets/campaign.mp4`. The hero supports muted, looping, inline video and retains its still poster.

`scripts/download_assets.py` reproduces the image optimization and font downloads using Python/Pillow. Self-hosted font attribution and licenses are in `public/fonts/`.

## Verification

Production build and the original storefront browser checks cover mobile navigation, category filters, sorting, search, required size selection, quick add, wishlist, bag quantities/totals, bag persistence after reload and empty bag recovery. Backend browser checks cover public account/registration/recovery forms, guarded management entry and closed checkout at desktop, mobile and user widths. Desktop/mobile screenshots are saved under `.impeccable/review/` (gitignored). Twelve local database/API tests and deployed negative API checks pass; authenticated management, Stripe payments and email delivery await human/provider setup. See BACKEND.md for the exact scope.

The initial Impeccable context and concept launcher attempts could not run in the original sandbox. The backend finish detector subsequently ran through the installed CLI and reported visible advisory typography-ramp differences for the new operating surfaces. Visual review uses actual browser captures and source.

The original storefront finish reviewer returned **ship**, recorded in `.impeccable/finish-review.md`. The backend interface verdict pass returned **ship** with its two material fixes resolved; its narrower scope is recorded in `.impeccable/backend-finish-review.md`. `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` document the brief and incumbent visual system.
