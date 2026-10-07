# Browser verification

The production build passes. Browser checks were performed in Codex's in-app browser using actual interface controls.

Verified flows:
- Mobile menu to women's collection: one matching product.
- Required size selection shows an actionable error before adding an item.
- Form Training Set, size M: RM 219.00; quantity two: RM 438.00; return to quantity one: RM 219.00.
- Bag persists at quantity one after a page reload.
- Valid Malaysian checkout details reach a clearly labelled local preview confirmation without payment or an order.
- Saved pieces show the saved Core Tee, and removal restores an empty saved list.
- Live search for shorts returns the training shorts, and the submitted search preserves the result on the shop route.
- Descending price order: RM 219, RM 159, RM 149, RM 129.
- Men's filter returns three products; Shorts category narrows to one.
- Quick add requires a size. Adding shorts in L to the set in M produces RM 348.00.
- Removing both lines restores the empty bag and its collection action. Test bag and wishlist were left empty.
- Desktop hero sticks at 80px while its image transform advances from scale 1 to scale 1.0245 and ultimately 1.13.
- Desktop mindset sticks at 80px; frame expands from inset(12.5035% 16.969%) to inset(0%); first chapter opacity falls from 1 to 0 and second rises to 0.8896 at the sampled point.
- No horizontal overflow was found at the captured desktop size (1433 CSS px).

Limitations: Reduced-motion behavior is inspected in source; the browser control does not expose preference emulation. Cursor behavior is implemented in source, but no hover-only automation is exposed. No claim is made that a live commerce backend or payments were tested.

The context, concept, and detector tools were attempted and could not run because their engine was not installed. A separate finish reviewer inspects the final captures and source.

The in-app browser full-page capture at the default 1273px width produces an invalid black area after enlarging the capture surface; the actual scrolled viewport renders all sections. That invalid file was discarded. User-width evidence is the real viewport series: user-viewport.jpg, user-1273-collection.jpg, user-1273-products.jpg, user-1273-campaigns.jpg, user-1273-mindset.jpg, user-1273-newsletter.jpg, and user-1273-footer.jpg. All were opened and checked. The contextual cursor appears in the campaign capture. No horizontal overflow was found at mobile 383px or user 1273px.

Final correction batch: repeat navigation now responds to React Router location.key in ScrollManager and Overlays. Browser checks confirm header home click at Y1134 resets to0; reopening search on the Core Tee and selecting that same product dismisses the dialog at Y0; selecting Women from the mobile menu while already on the women's collection dismisses the dialog at Y0. Brand now contains only TSUYO; category eyebrows are removed; newsletter placeholder uses --muted (#686863), 4.91:1 against #f1f0eb. Production build passes after the batch.

The user-width full-page capture recovered by temporarily fixing the capture bounds to the exact measured browser dimensions1280x720 (1273px client width). user-viewport-full.jpg now contains all sections and real sticky spacer geometry. The final evidence matrix is desktop-hero.jpg/desktop.jpg at1433px, mobile-hero.jpg/mobile.jpg at383px, and user-viewport.jpg/user-viewport-full.jpg at1273px. All were opened and validated; earlier scroll-series images document the prior pass.

The final embed-prompt scan was attempted and met the same absent engine limitation. Independent Pillow inspection confirmed nonempty EXIF ImageDescription provenance in all seven shipping WebP images. No shipping rasters changed during the correction batch.
