# uYao Logo Production Design Spec — v4 Reference Exact

## Design Thesis

uYao means 「有藥」: help a person recognize a nearby medicine-search service, connect a need with pharmacy signals, and complete pharmacist-confirmed pickup without treating a scan as guaranteed stock. The selected identity integrates a rounded U-shaped portal, capsule, search ring, and wireless scan signal with the exact `uYao | 有藥` lockup from the founder-supplied reference.

## Experience Budget and Frozen Rubric

- Trust: 40
- Category recognition: 35
- Cross-asset extensibility: 25
- Primary surface: brand-marketing
- Approved direction: Direction B — Nearby Medicine Search
- Direction selection score: 91 / 100

## Tokens or Visual Rules

- Deep green: `#0B4431`
- Emerald: `#0C8F51`
- Lime: `#89C840`
- Mint: `#D8E8DA`
- Charcoal: `#2F2F2F`
- White ground: `#FEFEFE`
- The primary mark uses one controlled lime-to-emerald gradient; mono and reverse variants preserve identical geometry.
- No medical cross, location pin, leaf, heart, shield, checkmark, texture, 3D, or decorative glow.
- Shadow is reserved for the app-icon presentation board and is not part of the standalone mark.

## Navigation, Composition, and Viewport

- Horizontal lockup: integrated mark, custom outlined `uYao`, hairline divider, and outlined `有藥`.
- Primary lockup viewBox: `105 220 1245 330`.
- Standalone mark viewBox: `100 215 340 340`.
- Below the lockup's legible width, use the standalone mark.
- App, favicon, and social surfaces use mark-only geometry with crop-safe clear space.
- The 1448 × 1086 brand board is the fixed reconstruction reference.

## Component or Asset Inventory

- `designs/uyao-logo/uyao-logo-kit-v4/`
- `web/public/brand/uyao-logo-v4.svg`
- `web/public/brand/uyao-logo-v4-mono.svg`
- `web/public/brand/uyao-logo-v4-reverse.svg`
- `web/public/brand/uyao-mark-v4.svg`
- `web/public/brand/uyao-app-icon-v4.svg`
- `web/app/icon.svg`
- `web/app/apple-icon.png`
- `web/components/BrandLogo.tsx`
- `web/components/BrandMark.tsx`

## State, Content, or Gameplay Matrix

N/A. The mark communicates pharmacy search and connectivity, never stock certainty. Product certainty remains in explicit UI labels and pharmacy confirmation.

## Expressive Mechanisms

One compound silhouette: U portal, capsule, search ring, and scan signal. Rounded custom lettering extends the same stroke language through the Latin wordmark; the thin Chinese descriptor keeps the mark and `uYao` primary.

## Motion and Reduced Motion

Static. No logo animation is part of the identity.

## Assets and Ownership

All canonical SVG geometry and outlined lettering are repository-owned deterministic vectors. The founder supplied a raster reference but no original AI/Bézier source. Illustrator can open the SVG and vector PDF outputs and save them as native `.ai`.

## Exact Copy and Typography

- Exact lockup: `uYao | 有藥`.
- Latin lettering is custom SVG stroke geometry, including a single-storey `a` and circular `o`.
- Chinese lettering is stored as outlined vector paths; production does not depend on an installed font.

## Accessibility

- Mono and reverse variants preserve identity without gradient or color.
- The full lockup is not forced into favicon-scale use.
- The standalone mark keeps the U counter, capsule split, ring, and signal arcs open at small sizes.
- No pure black is used.

## Real Data Replacements

N/A.

## Implementation Order

1. Validate all SVG documents and confirm no `<text>` or font dependency remains.
2. Render the exact brand board against the 1448 × 1086 reference.
3. Export vector PDF, 1024 px app icon, and transparent 400 px mark.
4. Update web brand components and metadata icons.
5. Verify desktop landing and mobile consumer app headers.

## Visual Verification

- Compare the production vector board against the supplied raster at identical dimensions.
- Check primary silhouette, wordmark baselines, Chinese bounds, divider, app icon, and mono lockup.
- Verify transparent corners on the 400 px mark.
- Verify PDF files contain no embedded raster images.
- Verify runtime at 1440 × 900 desktop and 390 × 844 mobile.

## Anti-AI-Slop Audit

- No generic system-font wordmark.
- No default violet/blue or decorative hero gradient.
- No competing accent colors, pure black, glassmorphism, or indiscriminate shadow.
- The green gradient is an explicit reference-locked brand mechanism with mono and reverse fallbacks.

## Residual Risks

- Exact original Bézier control points cannot be recovered from a raster screenshot; v4 matches measured visible bounds, baselines, color roles, and composition while keeping vector edges clean instead of reproducing raster blur.
- Trademark similarity clearance is not complete.
- Real print color and social-platform rasterization still require channel-specific proof before a large external launch.
