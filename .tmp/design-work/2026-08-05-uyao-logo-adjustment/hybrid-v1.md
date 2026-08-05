# Hybrid v1

## Preview

![Friendly Precision hybrid](./evidence/hybrid-v2.png)

One focused revision was used. The first hybrid was rejected because ImageGen rounded the square exterior and left the rising stroke optically loose. `hybrid-v2.png` restores the square base while keeping the warmer wordmark and soft internal junction.

## Screen or Layer Mapping

- Mark: Candidate B's connected structure with Candidate A's squared exterior.
- Internal cut: one shorter rising scan path, with gentle optical softening at the junction.
- Wordmark: exact `Uyao`, slightly more open spacing, softer humanist terminals, shorter `y` descender.

## Unified Shell or System

- One connected U/Y mark.
- Flat `#0B7A3E` mark, `#1A2420` wordmark, white or transparent ground.
- Square outside, softer inside: friendliness comes from rhythm and junctions, not a bubbly container.
- Icon-to-wordmark gap reduced enough to read as one name, without crowding the `U`.

## State, Content, or World Model

Brand asset only. It does not express or invent inventory state.

## Feedback and Expressive Mechanism Rules

The rising internal stroke is the only expressive gesture. It should read as an open verification path, not a check mark, branch, road, or pencil.

## Generated-Fixture Caveats

ImageGen output is direction evidence. Exact text, fills, spacing, curves, reverse-color use, and pixel hinting require deterministic vector production after D2 approval.

## Remaining Risks

- The generated raster still makes the rising stroke look optically separate at large size. Production SVG must join it deterministically to the right body while preserving the visible white scan channel.
- Upper-right negative space may close at 16 px.
- Humanist wordmark must be authored, not accepted as a generic font default.
- Trademark similarity is not cleared.

## D2 Approval and Production

- D2 approved by founder on 2026-08-05.
- Canonical assets: `../../../web/public/brand/`
- Next.js favicon: `../../../web/app/icon.svg`
- Production spec: `../../../designs/uyao-logo/production-design-spec.md`
- Implementation receipt: `../../../designs/uyao-logo/implementation-receipt.md`
