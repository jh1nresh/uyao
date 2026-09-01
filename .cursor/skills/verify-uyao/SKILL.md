---
name: verify-uyao
description: Drive uYao storeOS web (the pharmacist CDP surface) the way a pharmacist does — launch a local Next instance, exercise mapped Store OS paths over Chrome DevTools Protocol, and capture proof. Use when proving storeOS behavior, not company marketing, Instagram, shop search, or capture-box hardware.
---

# verify-uyao

storeOS web is the pharmacist-facing product. Code truth lives in `web/` (this repo). Canonical production host is `https://store.uyaohealth.com/`. Locally, Next host-routes Store OS when `Host` is `store.localhost` (non-production only). The signed-in workspace without Postgres is the dev-only `/store-os-preview` shell.

This skill is a verification harness, not a PR-review checklist. Drive the real UI. Do not rewrite product screens. Do not touch Pi capture-box hardware, Instagram/SEO GTM, SAV-E, or the open GS1 ingest PR.

## Launch

From the repo root:

```bash
.cursor/skills/verify-uyao/bin/verify-uyao launch
```

What it does:

1. `npm ci` in `web/` if `next` is missing (verification scaffolding only).
2. Starts `web/node_modules/.bin/next dev -p 43100 -H 127.0.0.1` (override with `VERIFY_UYA_PORT`).
3. Starts system Chrome with an isolated `--user-data-dir` under `.cursor/skills/verify-uyao/.run/chrome-profile` and CDP on `VERIFY_UYA_CDP_PORT` (default `43101`).
4. Waits until `http://127.0.0.1:$PORT/` with `Host: store.localhost:$PORT` returns the Store OS sign-in HTML, or `/store-os-preview` returns the pharmacist workspace.

Ready signal: JSON `"ready": true` plus `urls.storeOs` and `urls.preview`. The Next log line `Ready in` is supporting evidence, not the gate.

Isolation:

- Default app port is **43100**, not the README developer port **3100**. Refuse to bind a port you do not own.
- Chrome profile is per-run under `.run/`. Never use the human's default Chrome profile.
- A second concurrent harness needs both `VERIFY_UYA_PORT` and `VERIFY_UYA_CDP_PORT`.
- Local preview reservations are in-memory demo rows. They are not a tenant database. Do not treat them as live pharmacy work.
- If `npm run dev` is already on 3100, leave it alone. This skill will not attach to a foreign instance.

Public fallback: only if local Next cannot boot. Document the failure, then drive `https://store.uyaohealth.com/` (login page only; no pharmacist session without credentials).

## Doctor

Read-only. Run first whenever anything looks off.

```bash
.cursor/skills/verify-uyao/bin/verify-uyao doctor
```

It answers: is a storeOS process listening on the verification port, is that process owned by this run, what `web/package.json` version is checked out, and is store auth configured.

Auth in this checkout: `isStoreAuthConfigured()` requires `STORE_OS_SESSION_SECRET` (≥32 chars) **and** `DATABASE_URL`. `web/.env.example` has both empty. Without them the canonical login form is visible and disabled (`Store accounts are not configured in this environment`). That is still worth driving for `store-login`. The signed-in pharmacist shell for local proof is `/store-os-preview` (`NODE_ENV !== "production"`).

`worthDriving` is true only when the HTML is Store OS login or the Store OS workspace.

## Drive

Connect over CDP to the Chrome this run started. Prefer ARIA names and the routes below. Do not click by coordinates.

```bash
.cursor/skills/verify-uyao/bin/verify-uyao drive reservation-inbox
```

Mapped path IDs (see `features/`):

| ID | Pharmacist path | Local URL |
|---|---|---|
| `store-login` | Sign in to the pharmacy workspace | `http://store.localhost:$PORT/` |
| `reservation-inbox` | Confirm / reject / complete pickup work | `http://127.0.0.1:$PORT/store-os-preview` |
| `account-settings` | Account and store settings | preview → `aria-label="開啟帳號與門市設定"` |
| `support-agent` | Support Agent FAQ / human ticket | preview → `aria-label="支援 Agent · 待命"` |
| `agent-workboard` | Demo inventory / procurement handoff | preview → `採購 Agent` |

Stable handles from `web/components/StoreOsLogin.tsx` and `web/components/StoreOsShell.tsx`:

- Login heading: `登入你的藥局` / `Sign in to your pharmacy`
- Email field: `input[name="username"]`
- Password field: `input[name="password"]`
- Submit: `登入 Store OS` / `Sign in to StoreOS`
- Work nav: `aria-label="工作分類"` / `Work categories` (`需要你`, `全部工作`, `完成紀錄`)
- Reservation list: `aria-label="門市預留單"` / `Store reservations`
- Confirm / reject: `確認有貨`, `回報無庫存`, `完成取貨`
- Settings: `開啟帳號與門市設定` → dialog `帳號與門市設定`
- Support: `支援 Agent · 待命` → region `uYao 支援`
- Agents sidebar: `aria-label="Store Agents"`

Host rules (`web/proxy.ts`): `localhost` / `127.0.0.1` is the company host. `/store-os` on that host **308s to production** `store.uyaohealth.com`. Store OS login locally is **only** `store.localhost`. `/store-os-preview` is a known company-host path and 308s to `/zh-tw/store-os-preview` before rewriting back to the preview page.

## Evidence

Proof lives in `.cursor/skills/verify-uyao/evidence/` and **survives cleanup**.

Standards:

- Exercise the pharmacist UI, not `/api/store/reservations` as a substitute for the inbox.
- Capture the action and the resulting state (screenshot + ARIA snapshot).
- `drive` writes `evidence/<path-id>/drive.png` and `evidence/<path-id>/drive.aria.json`.
- `screenshot` / `snapshot` write `evidence/<path-id>/screenshot.png` and `evidence/<path-id>/snapshot.aria.json`.
- On `/store-os-preview`, confirm/reject calls `PATCH /api/store/reservations` and 401s without a session. Do not treat a 401 reload as a successful mutation. Observable proof for the inbox is the seeded demo rows (`A-482` pending, `A-481` confirmed) and the work-nav filter change.

```bash
.cursor/skills/verify-uyao/bin/verify-uyao screenshot
.cursor/skills/verify-uyao/bin/verify-uyao snapshot
```

## Cleanup

```bash
.cursor/skills/verify-uyao/bin/verify-uyao cleanup
```

Kills **only** the Next and Chrome pids recorded in `.cursor/skills/verify-uyao/.run/run.json`. Never `pkill next`, never kill by process name. Does not delete `evidence/`. Removes the Chrome profile and the run file after the owned pids exit.

If launch reused an already-owned healthy run, cleanup still tears that recorded run down. If a port was already taken by a foreign process, launch refused to start — cleanup then has nothing of ours to kill.

After a failed attempt, run cleanup before the next launch so 43100/43101 are not stranded.

## Helpers

Executable: `.cursor/skills/verify-uyao/bin/verify-uyao`

Every command prints one JSON object on stdout (`ok`/`error`, `urls`, `artifacts`). Logs go to `.run/next.log` and `.run/chrome.log`.

```bash
.cursor/skills/verify-uyao/bin/verify-uyao doctor
.cursor/skills/verify-uyao/bin/verify-uyao launch
.cursor/skills/verify-uyao/bin/verify-uyao drive reservation-inbox
.cursor/skills/verify-uyao/bin/verify-uyao screenshot
.cursor/skills/verify-uyao/bin/verify-uyao snapshot
.cursor/skills/verify-uyao/bin/verify-uyao cleanup
```

Env:

| Variable | Default | Purpose |
|---|---|---|
| `VERIFY_UYA_PORT` | `43100` | Isolated Next port |
| `VERIFY_UYA_CDP_PORT` | `43101` | Isolated Chrome DevTools port |
| `VERIFY_UYA_CHROME` | first existing `google-chrome` | Browser binary |
| `VERIFY_UYA_HEADED=1` | off | Headed Chrome when `DISPLAY` is set |

Feature recipes: `features/README.md`. Keep the map honest with `/maintain-verification-skill` when storeOS routes or ARIA names change.
