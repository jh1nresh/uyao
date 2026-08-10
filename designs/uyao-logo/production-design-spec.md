# Uyao Logo Production Design Spec — v2

## Design Thesis

Uyao means 「有藥」: help a person connect a nearby need with pharmacy signals
and pharmacist confirmation, without pretending that a scan is exact stock.
The v2 mark is one continuous `U` and `Y` route. The open `U` carries the local
search need; the joined `Y` expresses two inputs becoming one confirmed next
step. It does not encode a medical cross, a pill, a location pin, or a stock
guarantee.

## Experience Budget and Frozen Rubric

- Trust: 45
- Ownability: 35
- Small-scale clarity: 20
- Primary surface: brand-marketing
- Approved direction: Connected U/Y route v2

## Tokens or Visual Rules

- Verified green: `#0B7A3E`
- Deep ink: `#1A2420`
- Reverse: `#FFFFFF`
- No gradients, shadows, texture, 3D, secondary accent, or decorative container
- Terminals and the Y junction are precise; only the U bowl is curved
- One continuous stroke only; no detached check-like fragment

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
- `web/public/brand/uyao-x-avatar.svg`
- `web/public/brand/uyao-x-avatar-400.png`
- `web/public/brand/uyao-x-avatar-1024.png`
- `web/app/icon.svg`
- `web/components/BrandMark.tsx`

## State, Content, or Gameplay Matrix

N/A. The brand mark never communicates inventory state. Product certainty
continues to use the existing `●`, `○`, and `?` stock language.

## Expressive Mechanisms

One continuous U/Y route. It remains legible as a monogram first and suggests
connection second; it must never be described as proof that an item is in stock.

## Motion and Reduced Motion

Static. No logo animation is part of the identity.

## Social Avatar

- X/Twitter uses a dedicated white 「有」 glyph on a solid verified-green field.
- The 400 × 400 PNG is the upload asset; the 1024 × 1024 PNG is the social master.
- Keep the glyph inside the central 70% so X's circular crop never clips it.
- Do not add the Latin wordmark, tagline, border, gradient, or secondary symbol.
- This avatar is a small-size brand variant, not a replacement for the horizontal lockup.

## Assets and Ownership

All production SVG geometry is deterministic and repository-owned. ImageGen
direction renders remain under `.tmp/design-work/` and are not production assets.

## Exact Copy and Typography

The wordmark reads exactly `Uyao`. It is drawn with SVG paths and strokes and
does not depend on an installed typeface.

## Accessibility

- Green on white is reserved for the mark, not body text.
- Mono and reverse variants preserve meaning without color.
- The standalone mark must keep the U counter and both Y branches open at 16 and 32 px.

## Real Data Replacements

N/A.

## Implementation Order

1. Validate all SVG documents.
2. Render horizontal, mono, reverse, 16 px, and 32 px evidence.
3. Use `web/app/icon.svg` as the Next.js favicon.
4. Use `BrandMark` beside the Chinese consumer name 「有藥」 in product UI.

## Visual Verification

Verify exact stroke colors, transparent/reverse behavior, the 16 px U counter
and Y fork, and that no generated gradient or texture remains.

## Design System Audit

- Naming: `CrossMark` was inconsistent with the rule excluding a medical cross;
  the canonical component is now `BrandMark`.
- Token coverage: v2 uses only verified green, deep ink, and reverse white.
- Variant coverage: primary, reverse, mono, favicon, Apple icon, social square,
  and Open Graph outputs share the same geometry.
- Migration: v1 remains archived as `uyao-logo-kit-v1.zip`; production assets
  and the new `uyao-logo-kit-v2.zip` use v2 geometry.

## Residual Risks

- Browser rasterization can vary at 16 px; `web/app/icon.svg` includes a white ground for predictable negative space.
- Trademark similarity has not been cleared for the new connected U/Y geometry.
