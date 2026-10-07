---
name: Tsuyo
description: Industrial training editorial with quiet, precise commerce.
colors:
  paper: "#f1f0eb"
  ink: "#1a1a18"
  muted: "#686863"
  line: "#d3d2cb"
  accent: "#e85d39"
  product-field: "#dddcd5"
  dark-hover: "#35352f"
typography:
  display:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "clamp(80px, 8.3vw, 120px)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "45px"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  product-title:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "57px"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.025em"
  navigation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  product-tag:
    fontFamily: "Manrope, sans-serif"
    fontSize: "8px"
    fontWeight: 700
    letterSpacing: "0.07em"
  wordmark:
    fontFamily: '"Barlow Condensed", sans-serif'
    fontSize: "42px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  square: "0"
  circle: "50%"
spacing:
  gutter: "clamp(24px, 4.2vw, 72px)"
  control-gap: "8px"
  grid-gap: "18px"
  action-inline: "25px"
  drawer-inset: "28px"
  panel-inset: "30px"
  section-block: "100px"
components:
  button-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 25px"
    height: "52px"
  button-light-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 25px"
    height: "52px"
  button-dark-hover:
    backgroundColor: "{colors.dark-hover}"
    textColor: "{colors.paper}"
  text-link:
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
    height: "35px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "10px 12px"
    height: "45px"
  newsletter-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 0 23px"
  navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
    height: "80px"
  size-option:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    height: "45px"
  size-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  product-card:
    backgroundColor: "{colors.product-field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
  product-tag:
    backgroundColor: "rgba(241, 240, 235, 0.86)"
    textColor: "{colors.ink}"
    typography: "{typography.product-tag}"
    rounded: "{rounded.square}"
    padding: "6px 7px"
  drawer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    width: "490px"
    height: "100dvh"
  context-cursor:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    width: "88px"
    height: "88px"
---

# Design System: Tsuyo

## Overview

**Creative North Star: "Industrial Training Editorial"**

Tsuyo pairs the atmosphere of an industrial gym with the clarity of an apparel catalog. Monochrome campaign photographs carry the grit; bone-colored shopping surfaces, measured controls, and readable upright type give visitors a calm place to choose their pieces.

The system moves between expansive photography and restrained information. Condensed headlines supply force without ornamental typography. Vermilion punctuates moments of attention and interaction, while fine lines and square geometry organize commerce. Motion follows the image and the reading sequence, with simpler static compositions for small screens and reduced motion.

**Key Characteristics:**

- Monochrome industrial photography and warm bone commerce surfaces.
- Upright condensed display type paired with readable Manrope controls.
- Square actions and product fields, with circles reserved for compact utilities.
- Fine dividers, quiet metadata, and tabular prices in MYR.
- Scroll-driven image scale and framing, supported by visible static content.

## Colors

The palette is warm monochrome, punctuated by one vermilion accent. Frontmatter values are the normative primitives; the names below describe their application.

### Primary

- **Training Vermilion — accent:** Headline punctuation, the collection navigation dot, image cursor, selection, focus outlines, and the hover state of the light campaign action. Dark ink stays the text color on this accent.

### Neutral

- **Bone Paper — paper:** Page canvas, header, light action, drawer, and translucent product utilities.
- **Training Ink — ink:** Default text, dark actions, dark editorial fields, footer, and selected size controls.
- **Graphite Text — muted:** Supporting descriptions, garment color names, form notes, and newsletter placeholder.
- **Fine Stone — line:** Commerce dividers, size borders, drawer header separators, and the scrolled header edge.
- **Product Stone — product-field:** The field behind product photographs.
- **Deep Graphite — dark-hover:** Hover feedback for a dark action.

**The Accent Punctuation Rule.** Use vermilion for attention and interaction within the monochrome world; keep sustained reading on paper or ink surfaces.

## Typography

**Display Font:** Barlow Condensed, with sans-serif fallback. Local upright weights are 600, 700, and 800.

**Body Font:** Manrope, with sans-serif fallback. The local variable font supports weights 400–800.

**Character:** Tall, close-set display letters carry the training voice. The body face stays clean and measured, with mixed-case shopping labels and tabular numerals for prices and quantities.

### Hierarchy

- **Display:** The frontmatter display role is the desktop hero. At the wide-screen breakpoint it becomes (144px); on mobile it becomes (88px, line-height 0.87), falling to (78px) on the smallest breakpoint. The mindset headline uses (clamp(80px, 10vw, 144px), weight 700, line-height 0.88).
- **Headline:** The frontmatter headline role is the collection section heading. On mobile it becomes (34px, line-height 1). Large commerce page headings use (78px, weight 600), with smaller mobile sizes.
- **Product title:** The product heading role has a compact, upright rhythm. Its mobile size is (54px, line-height 0.95).
- **Body:** The frontmatter body role represents common descriptions. Story prose uses (13px, line-height 1.8), help copy stays within (650px), and product details stay within (470px). Small-screen supporting copy often uses (11–12px).
- **Label:** Actions use the frontmatter label role. Navigation uses its separate lighter role. Metadata commonly spans (8–10px); these sizes belong to short labels, not paragraphs.
- **Wordmark:** The header uses the frontmatter wordmark role, reduced to (36px) on mobile. The footer enlarges the same upright face to (clamp(140px, 30vw, 480px)), with a compressed line-height and horizontal stretch.

**The Upright Type Rule.** Keep all typography upright; the brand voice comes from condensation, weight, scale, and spacing.

## Layout

The page is fluid. A shared horizontal gutter scales with the viewport; there is no universal boxed page width. Product-detail text, story prose, and forms receive local maximum widths where reading or input benefits.

Desktop collection cards form four equal columns with the frontmatter grid gap. The grid becomes two columns at (900px). At (1150px), spacing compresses and card price information stacks; mobile preserves two columns and visible quick add. Product detail and checkout use paired columns, then become a single column at (768px). Campaign tiles move from a side-by-side pair to a vertical sequence at the same breakpoint.

The sticky header is (80px) tall, then (68px) at (768px). Desktop navigation gives way to the menu drawer at (900px). The standard mobile gutter is (24px), reduced to (18px) at (370px). Large editorial sections use generous block space; commerce controls use tighter, repeated spacing.

Desktop image stories may reserve scroll distance: the hero sequence is (140svh) and mindset sequence is (205svh), with sticky image stages beneath the header. These lengths are interaction tracks, not empty content sections to copy into ordinary pages. Small-screen and reduced-motion layouts remove the extra sequence height and sticky staging.

## Elevation & Depth

Commerce surfaces remain flat at rest. Tonal fields, fine borders, photograph crops, and dark overlays supply most depth. The only CSS box shadows in the finished system belong to the drawer and transient toast; they communicate an overlay or a status event rather than lifting product cards.

Campaign shading protects paper-colored type against photography. Image zoom and clip-path expansion provide depth through framing instead of decorative card effects.

**The Flat Commerce Rule.** Keep product cards and form surfaces flat; reserve shadow for the drawer and transient feedback.

## Shapes

The main geometry is square: actions, images, input fields, drawers, and size choices have hard corners. Borders are generally fine single-pixel strokes.

Circles are an intentional utility exception: saved-item controls, bag count, color swatches, campaign arrows, the contextual cursor, and the checkout success mark. Use them as compact identifiers or actions rather than turning every field into a pill.

**The Square Field Rule.** Keep commerce fields and primary actions square; retain circular geometry for the established compact utility patterns.

## Components

### Buttons

Actions are compact, firm rectangles. The light variant uses paper with ink and changes to vermilion on hover. The dark variant uses ink with paper and deepens to the recorded dark hover tone. Both use the frontmatter action padding and height, with a (36px) label-to-icon gap. An inline arrow moves (3px, -3px) on hover.

The underlined text action has a (35px) minimum height and a gap that grows from (15px) to (23px). Disabled buttons retain the same geometry at reduced opacity. All interactive elements receive the global vermilion focus outline (2px, 5px offset).

### Chips

Size choices are square, fine-bordered controls in a five-column row, with an (8px) gap. Hover darkens the border; selection fills the choice with ink and reverses the text to paper. Mobile height becomes (46px).

Product collection tags are small translucent paper rectangles over imagery. They identify a product collection; they are not a pattern for adding extra campaign eyebrows.

### Cards / Containers

The product card is an unboxed image-and-information composition. The image field is (3:4), clips overflow, and has no shadow. Product name and tabular price appear below, followed by a small circular garment-color swatch.

Photography enlarges to (1.055) on hover. The quick-add strip appears on hover or focus within; touch and mobile keep it visible. The round saved-item control remains separate from the square quick-add action.

### Inputs / Fields

Checkout fields are transparent, square, and fine-bordered with a (45px) height. Newsletter and search fields use a single dark bottom rule instead of a surrounding box. Newsletter entry text uses (18px), becoming (17px) on mobile; its placeholder uses the same muted primitive as supporting text.

Keep visible labels and the shared focus outline. Form errors use a dark vermilion text treatment. Read-only fields use muted text.

### Navigation

The sticky paper header places the condensed wordmark opposite compact Manrope links and icon actions. Desktop links reveal a thin ink underline on hover. The collection dot and bag count provide compact signals. The finished desktop CSS does not add a separate visual active-link treatment.

On narrower screens, the menu becomes a right-side drawer with large condensed link rows, fine dividers, and inline SVG arrows. The drawer keeps a sticky heading bar and scrolls independently.

### Editorial image stories

Campaign imagery is monochrome and edge-to-edge. Desktop hero scrolling enlarges the photograph to (1.13), moves it slightly, and recedes the headline; the mindset photograph opens from a framed inset to the viewport while its two text chapters exchange position and opacity. Category images use gentle vertical parallax.

The contextual vermilion cursor supplements the visible operating-system pointer and appears only over marked campaign areas. It is hidden on small screens, coarse pointers, and reduced motion.

### Overlays and feedback

Drawers use paper, square corners, a dim backdrop, and the reserved overlay shadow. Toasts use an ink rectangle with paper text and the smaller feedback shadow. Native dialog behavior, keyboard focus, and semantic status messaging support these patterns.

When reduced motion is requested, CSS transitions and animations stop, smooth scrolling is skipped, pinned sections become static, and the second mindset chapter is hidden. At mobile widths, the static image composition preserves the first chapter and direct actions.

## Do's and Don'ts

### Do:

- **Do** use paper and ink as the sustained reading surfaces, with vermilion punctuating interaction.
- **Do** pair upright Barlow Condensed display text with Manrope shopping and supporting text.
- **Do** keep photography monochrome in editorial campaigns and product images clear within square-cornered fields.
- **Do** keep MYR prices and quantities tabular and place product information outside the image.
- **Do** preserve visible focus, touch-accessible quick add, and static reduced-motion compositions.
- **Do** reserve circles for the established utility controls and identity signals.

### Don't:

- **Don't** introduce italic typography into this visual system.
- **Don't** add decorative shadows, rounded cards, or pill-shaped primary actions to commerce surfaces.
- **Don't** replace campaign photography with generic gradients or decorative illustrations.
- **Don't** rely on hover or scroll animation to make essential shopping information available.
- **Don't** promote campaign eyebrows or unused registration-symbol styling into new component patterns.
