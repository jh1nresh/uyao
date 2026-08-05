# Uyao Logo Production Design Spec

## Design Thesis

Uyao's mark combines a squared `U` portal with a rising scan signal and a
`Y`-shaped negative path. The exterior stays disciplined like a pharmacy tool;
the internal curve and custom wordmark carry the approachability.

## Experience Budget and Frozen Rubric

- Trust: 45
- Ownability: 35
- Small-scale clarity: 20
- Primary surface: brand-marketing
- Approved direction: Candidate B structure + Candidate A corner discipline

## Tokens or Visual Rules

- Verified green: `#0B7A3E`
- Deep ink: `#1A2420`
- Reverse: `#FFFFFF`
- No gradients, shadows, texture, 3D, secondary accent, or decorative container
- Outer mark corners and scan signal are square; only the internal left junction is softened

## Navigation, Composition, and Viewport

- Horizontal lockup: mark followed by the custom `Uyao` wordmark
- Standalone mark: favicon, compact navigation, social avatar, and small product surfaces
- Minimum lockup width: 120 px
- Below 120 px: use the mark only
- Clear space: one quarter of the mark width on every side

## Component or Asset Inventory

- `web/public/brand/uyao-logo.svg`
- `web/public/brand/uyao-logo-reverse.svg`
- `web/public/brand/uyao-mark.svg`
- `web/public/brand/uyao-mark-mono.svg`
- `web/public/brand/uyao-mark-reverse.svg`
- `web/public/brand/uyao-favicon-16.png`
- `web/public/brand/uyao-favicon-32.png`
- `web/app/icon.svg`

## State, Content, or Gameplay Matrix

N/A. The brand mark never communicates inventory state. Product certainty
continues to use the existing `●`, `○`, and `?` stock language.

## Expressive Mechanisms

One open Y-shaped negative path and one rising scan signal. Together they
suggest verification without introducing a medical cross, pill, location pin,
mascot, or growth-arrow claim.

## Motion and Reduced Motion

Static. No logo animation is part of the identity.

## Assets and Ownership

All production SVG geometry is deterministic and repository-owned. ImageGen
direction renders remain under `.tmp/design-work/` and are not production assets.

## Exact Copy and Typography

The wordmark reads exactly `Uyao`. It is drawn with SVG paths and strokes and
does not depend on an installed typeface.

## Accessibility

- Green on white is reserved for the mark, not body text.
- Mono and reverse variants preserve meaning without color.
- The standalone mark must remain recognizable at 16 and 32 px.

## Real Data Replacements

N/A.

## Implementation Order

1. Validate all SVG documents.
2. Render horizontal, mono, reverse, 16 px, and 32 px evidence.
3. Use `web/app/icon.svg` as the Next.js favicon.
4. Integrate the horizontal lockup into product UI only in a separate approved change.

## Visual Verification

Verify exact fills, transparent/reverse behavior, 16 px negative-space opening,
and that no generated gradient or texture remains.

## Residual Risks

- Trademark similarity has not been cleared.
- Browser rasterization can vary at 16 px; `web/app/icon.svg` includes a white ground for predictable negative space.
