# uYao Logo v4 Implementation Receipt

## Implemented Selection

Direction B — Nearby Medicine Search, selected explicitly by the founder. The 1448 × 1086 supplied brand board became the fixed visual target.

## Files or Assets Changed

- Promoted `designs/uyao-logo/uyao-logo-kit-v4/` as the canonical editable package.
- Replaced the branch-only v3 assets with v4 reference-exact SVG/PDF/PNG outputs.
- Updated the Next.js brand lockup, compact mark, favicon, and Apple icon to v4.
- Updated `BrandLogo` to the v4 lockup viewBox ratio and `BrandMark` to the v4 mark.

## Rules Preserved

- Exact `uYao | 有藥` naming.
- Search and scan semantics do not claim stock certainty.
- Outlined deterministic SVG geometry with mono and reverse variants.
- No medical cross, pin, leaf, heart, shield, checkmark, texture, or 3D.

## Intentional Deviations

- Raster blur, compression noise, and anti-aliasing halos from the screenshot were not encoded into the vector.
- No native `.ai` file is claimed because the original AI source was not supplied; the included SVG and pure-vector PDFs are Illustrator-editable and can be saved as `.ai`.

## Build, Export, or Playback Result

- Foreground pixel MAE against the equal-size reference reduced from 103.29 in the earlier reconstruction to 25.51 in v4; remaining error includes raster blur and antialiasing.
- 9 SVG files parsed successfully with no `<text>` or `font-family` dependency.
- Both Illustrator PDFs contain zero embedded raster images.
- Transparent 400 px mark: RGBA, four corner alpha values all `0`.
- TypeScript: passed.
- Next.js production build: passed, all 37 static pages generated.

## Actual Artifact Evidence

- Exact vector board: `uyao-logo-kit-v4/uyao-brand-board-vector.svg`
- Overlay evidence: `.tmp/design-work/2026-08-10-uyao-brand-direction/evidence/b-exact-final-overlay.png`
- Desktop runtime: `.tmp/design-work/2026-08-10-uyao-brand-direction/evidence/runtime-landing-v4.png`
- Mobile runtime: `.tmp/design-work/2026-08-10-uyao-brand-direction/evidence/runtime-app-v4.png`

## Viewport, Crop, State, or Device Coverage

- 1448 × 1086 exact brand board.
- 1440 × 900 company landing header.
- 390 × 844 consumer app header.
- 1024 × 1024 app icon.
- 400 × 400 transparent standalone mark.
- Primary, mono, reverse, and reverse-on-green vectors.

## Accessibility and Reduced Motion

- Mono and reverse variants preserve the silhouette without color.
- Mark-only fallbacks prevent the thin Chinese descriptor from being forced below legible size.
- Motion: N/A; identity is static.

## Remaining Gaps

- Trademark clearance.
- Physical print proof and real social-platform upload proof.
