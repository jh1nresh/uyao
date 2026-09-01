# storeOS verification map

This directory is the maintained source for verifying pharmacist-facing storeOS web. Read the index before driving, then use the matching feature file as the recipe.

Out of scope here: company landing, consumer shop search, Instagram, capture-box hardware, scanner/lamp/field box, SAV-E, GS1 ingest.

## Baseline preconditions

- Launch with `.cursor/skills/verify-uyao/bin/verify-uyao launch` so Next listens on `VERIFY_UYA_PORT` (default `43100`) and Chrome exposes CDP on `VERIFY_UYA_CDP_PORT` (default `43101`).
- Run `.cursor/skills/verify-uyao/bin/verify-uyao doctor` and require `worthDriving: true`, the expected `urls.storeOs` / `urls.preview`, and `process.ownedByThisRun` when you intend to clean up afterward.
- Signed-in work without Postgres uses `/store-os-preview` (dev only). Canonical login uses `http://store.localhost:$PORT/`.
- Do not drive a storeOS instance this run did not start.
- Do not use `/store-os` on `localhost` — `web/proxy.ts` 308s that path to production.

## Driving conventions

- Start every recipe from a freshly launched isolated Chrome profile unless the feature says otherwise.
- Prefer ARIA roles and accessible names from `StoreOsLogin` / `StoreOsShell`.
- Treat every CLI invocation as literal.
- Restore nothing on preview: demo reservations are seeded in `web/app/store-os-preview/page.tsx` and are not persisted.
- Cleanup must not remove proof artifacts.

## Proof and skip reporting

- Capture the pharmacist action and the resulting workspace state.
- UI proof is a screenshot plus an ARIA snapshot under `.cursor/skills/verify-uyao/evidence/<path-id>/`.
- Mutation proof on the live login workspace requires a real store session. Preview confirm/reject 401s; do not report those as successful status changes.
- Record the feature ID and URL with every artifact.
- Report an unreachable path with the command and the unmet precondition.

## Feature entry contract

Each feature file starts with an H1 and one paragraph of user-visible behavior, then exactly these H2s:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with verify-uyao`
4. `Gotchas`

## Features

- [Sign in to Store OS](./store-login.md) — canonical host, disabled-unconfigured vs live credentials.
- [Reservation inbox](./reservation-inbox.md) — Needs you / All work / Completed and in-stock actions.
- [Account and store settings](./account-settings.md) — operator, pharmacy, language, push, sign out.
- [Support Agent](./support-agent.md) — FAQ answers and human support ticket.
- [Agent workboard](./agent-workboard.md) — demo inventory / procurement handoff and fixed restock draft.
