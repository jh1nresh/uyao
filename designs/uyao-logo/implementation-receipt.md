# Uyao Logo Implementation Receipt

## Implemented Selection

Founder-approved hybrid: Candidate B's open scan signal and friendly wordmark
with Candidate A's square exterior discipline.

## Files or Assets Changed

- Added primary, mono, and reverse brand SVGs under `web/public/brand/`.
- Added 16 px and 32 px favicon PNG exports.
- Added `web/app/icon.svg`, which Next.js publishes as `/icon.svg`.
- Added the production design spec and this receipt under `designs/uyao-logo/`.

## Rules Preserved

- Exact name: `Uyao`
- Exact palette: `#0B7A3E`, `#1A2420`, and white
- Square exterior, open U/Y negative path, rising scan signal
- No medical cross, pill, location pin, gradient, texture, shadow, or 3D
- Brand mark does not encode or invent inventory certainty

## Intentional Deviations

- The production mark uses three optically related green shapes rather than
  forcing the direction render into one filled path. This preserves the approved
  open scan channel and avoids the failed H/check silhouette found during vector QA.
- The wordmark is deterministic SVG geometry, not the generated raster lettering.

## Build, Export, or Playback Result

- `xmllint --noout web/public/brand/*.svg web/app/icon.svg`: passed
- `npm run typecheck`: passed
- `npm run build`: passed; Next.js emitted `/icon.svg` as a static route
- Build warning: Next.js ignored `/Users/jhinresh/pnpm-lock.yaml` because it is outside this repository; unrelated to the logo change

## Actual Artifact Evidence

- Primary lockup: `../../web/public/brand/uyao-logo.svg`
- Reverse proof: `../../.tmp/design-work/2026-08-05-uyao-logo-adjustment/production-evidence/reverse-proof.svg.png`
- 16 px proof: `../../.tmp/design-work/2026-08-05-uyao-logo-adjustment/production-evidence/favicon-16.png`
- 32 px proof: `../../.tmp/design-work/2026-08-05-uyao-logo-adjustment/production-evidence/favicon-32.png`

## Viewport, Crop, State, or Device Coverage

- Horizontal lockup at large size
- Standalone mark
- One-color ink mark
- White reverse lockup on green and deep-ink grounds
- 16 px and 32 px browser-icon rasterization

## Accessibility and Reduced Motion

- Mono and reverse variants do not depend on color to preserve identity.
- The favicon includes a white ground so the negative path remains stable in light and dark browser chrome.
- Motion: N/A; the identity is static.

## Remaining Gaps

- Trademark similarity search is not complete.
- The horizontal lockup has not been integrated into `SiteHeader`; that is a separate UI change.
