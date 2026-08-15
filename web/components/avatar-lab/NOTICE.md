# Bible Strong Avatar Lab export

These files were exported from [Bible Strong Avatar Lab](https://avatars.bible-strong.app/):

- `Strobi` with the `listening` animation for the manager Agent
- `Nova` with the `working` animation for the inventory Agent
- `Citrus` with the `thinking` animation for the purchasing Agent
- `Cubee` with the `idle` animation for the checkout Agent

The exports were generated on 2026-08-15 from the public project at
<https://github.com/smontlouis/bible-strong-avatar-lab>, whose `main` commit was
`e205c576872be6da1b228174581ae636df09cd5e` at export time.

The generated runtime and avatar data are licensed under GNU AGPL v3.0. A copy
of that license is included as `AGPL-3.0.txt` in this directory.

## Integration changes

- One identical generated `avatar-runtime.ts` is shared by all four exports.
- The Vite-specific dynamic import ignore marker was replaced with webpack's
  equivalent so Next.js leaves the generated `blob:` module URL to the browser.
- The exported components are selected by the existing uYao Agent role.
- uYao CSS gives every role distinct active and inactive Store OS colors while
  preserving the sphere, asymmetric capsule, cone, and cube silhouettes.
- Runtime playback is enabled only for the central active Agent and is disabled
  when the operating system requests reduced motion.
