# Bible Strong Avatar Lab export

These files were exported from [Bible Strong Avatar Lab](https://avatars.bible-strong.app/):

- custom `Sprout` with the `listening` animation for the manager Agent
- custom `Sapling` with the `searching` animation for the inventory Agent
- custom `Flame` with the `thinking` animation for the purchasing Agent
- custom `Pepper` with the `idle` animation for the checkout Agent
- default `Strobi` with the `listening` animation for the support Agent

The exports were generated on 2026-08-15 from the public project at
<https://github.com/smontlouis/bible-strong-avatar-lab>, whose `main` commit was
`e205c576872be6da1b228174581ae636df09cd5e` at export time.

The generated runtime and avatar data are licensed under GNU AGPL v3.0. A copy
of that license is included as `AGPL-3.0.txt` in this directory.

## Integration changes

- One identical generated `avatar-runtime.ts` is shared by all five exports.
  Its engine is compiled from one shared `blob:` module; avatar data is passed
  into a cached factory instead of being embedded in a new module per export.
- The Vite-specific dynamic import ignore marker was replaced with webpack's
  equivalent so Next.js leaves the generated `blob:` module URL to the browser.
- The exported components are selected by the existing uYao Agent role.
- uYao CSS gives the four store roles distinct active and inactive Store OS
  colors while preserving the sprout, sapling, flame, and pepper silhouettes.
- The support Agent preserves Strobi's default blue body and dark eyes.
- The four store-role avatars were constructed in Avatar Lab for uYao. They
  share one expressive eye and motion grammar but use different primary and
  body-node geometry so the roles remain distinct at sidebar size.
- Runtime playback is enabled only for the central active Agent and is disabled
  when the operating system requests reduced motion.
- Landing avatars render generated first-frame SVG components from `static/`.
  Only an in-view animated avatar swaps into the shared runtime after page load
  and an idle callback. Regenerate them with `npm run generate:static-avatars`.
- `Sprout` takes an optional `data` prop so one surface can supply alternate
  export data. The landing footer uses it to raise and shorten the eyes
  (`components/landing/footerSproutData.ts`) so the mascot survives being
  cropped at its mid-line; every other Sprout still renders `sprout.avatar.ts`.
- Sprout still carries the generated `listening` sequence and the earlier
  hand-written `ambient` experiment. The large footer holds the resting pose
  of Bible Strong's Sprout `idle` preset (expression 00, original blink
  parameters) statically: the preset's second beat yaws the head, which read
  as periodic sway at footer scale. Only the footer eye crop is adapted;
  uYao's pointer tracking remains active.
  `lib/footer-sprout.test.ts` pins this footer-only contract.
