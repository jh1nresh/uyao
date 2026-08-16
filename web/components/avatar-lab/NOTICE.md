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
- Each export gained a hand-written `resting` animation on top of its generated
  animation: one static expression (`expression-rest`, cloned from the first
  step of the generated animation) with `bodyMotion: "none"` and
  `eyeMotion: "microSaccades"`, plus blink. Every uYao surface plays `resting`,
  so the bodies hold their pose and only the eyes move — the x.ai/bot motion
  language. Re-exporting an avatar from Avatar Lab drops `resting`; re-add it
  before shipping (`tsc --noEmit` fails when it is missing, because the call
  sites pass the literal `"resting"`).
- Pointer tracking is uYao code, not part of the export: `useAvatarEyes`
  translates the runtime's eye group (`svg g[clip-path]`) toward the pointer,
  with travel scaled to the rendered size by `lib/avatar-eyes.ts`.
- `Sprout` takes an optional `data` prop so one surface can supply alternate
  export data. The landing footer uses it to raise and shorten the eyes
  (`components/landing/footerSproutData.ts`) so the mascot survives being
  cropped at its mid-line; every other Sprout still renders `sprout.avatar.ts`.
