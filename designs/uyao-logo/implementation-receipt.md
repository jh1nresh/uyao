# Uyao Logo v2 Implementation Receipt

## Implemented Selection

Connected U/Y route: one continuous monoline replaces the three detached blocks.
The palette, custom Latin wordmark, Chinese consumer name, and flat one-color
production rules remain unchanged.

## Files or Assets Changed

- Updated primary, mono, and reverse brand SVGs under `web/public/brand/`.
- Updated 16 px, 32 px, Apple, social-square, and Open Graph PNG exports.
- Updated `web/app/icon.svg`, which Next.js publishes as `/icon.svg`.
- Renamed the UI primitive from `CrossMark` to `BrandMark`.
- Added a circle-crop-safe X/Twitter avatar in 400 px and 1024 px PNG sizes.
- Added `uyao-logo-kit-v2.zip`; v1 remains archived for migration history.

## Rules Preserved

- Exact name: `Uyao`
- Exact palette: `#0B7A3E`, `#1A2420`, and white
- Continuous U/Y route with square terminals and an open 16 px counter
- No medical cross, pill, location pin, gradient, texture, shadow, or 3D
- Brand mark does not encode or invent inventory certainty

## Semantic Refinement

- The U now reads before the secondary route metaphor.
- The two Y branches are equal, so neither becomes a detached check mark.
- The restrained U bowl feels consumer-accessible while square terminals preserve the
  pharmacy-tool discipline.
- The wordmark remains deterministic SVG geometry, not generated raster lettering.

## Build, Export, or Playback Result

- `xmllint --noout` for all production and proof SVGs: passed
- `npm run typecheck`: passed
- `npm test`: 6 files, 58 tests passed
- `npm run build`: passed; Next.js emitted `/icon.svg`, `/apple-icon.png`, and
  `/opengraph-image.png`
- Build warning: Next.js ignored `/Users/jhinresh/pnpm-lock.yaml` because it is
  outside this repository; unrelated to the logo change

## Actual Artifact Evidence

- Primary lockup: `../../web/public/brand/uyao-logo.svg`
- Comparison proof: `../../.tmp/design-work/2026-08-09-uyao-logo-semantic-refinement/comparison.png`
- 16 px proof: `../../web/public/brand/uyao-favicon-16.png`
- 32 px proof: `../../web/public/brand/uyao-favicon-32.png`

## Viewport, Crop, State, or Device Coverage

- Horizontal lockup at large size
- Standalone and one-color ink marks
- White reverse lockup on green and deep-ink grounds
- 16 px, 32 px, 180 px, 200 px, and 640 px rasterization
- 1200 × 630 Open Graph composition
- 400 × 400 X upload asset and 1024 × 1024 social master

## Accessibility and Reduced Motion

- Mono and reverse variants do not depend on color to preserve identity.
- The favicon includes a white ground so the negative path remains stable in light and dark browser chrome.
- Motion: N/A; the identity is static.

## Remaining Gaps

- Trademark similarity search is not complete.
- The Chinese product header remains a live `BrandMark` + 「有藥」 lockup so the
  wordmark stays crisp and accessible in the app.
