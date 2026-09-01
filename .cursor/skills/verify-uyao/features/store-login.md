# Sign in to Store OS

Sign in is the pharmacist's door to the assigned pharmacy workspace. The page states that after signing in the operator only sees reservations for that store.

## Sub-features

- `login-open` opens the canonical Store OS sign-in card.
- `login-unconfigured` shows a disabled form when store accounts are not configured.
- `login-submit` posts email and password to `/api/store/auth/login` and reloads into the workspace when auth is live.
- `login-invite` swaps the card for activation when the URL hash contains `#invite=<43-char token>`.

## How to get to it (user POV)

- Open `https://store.uyaohealth.com/` (production).
- Open `http://store.localhost:$PORT/` on a local `next dev` (Host must be `store.localhost`, not `localhost`).
- Follow an invite URL that lands on the Store OS host with `#invite=…`.

## Driving it with verify-uyao

Preconditions:

- `verify-uyao doctor` reports the store surface as `login` or `workspace`.
- Local proof uses `urls.storeOs` from launch JSON.

- **Open sign-in.** Run `verify-uyao drive store-login`. Chrome opens `http://store.localhost:$PORT/`. The heading is `登入你的藥局` (or `Sign in to your pharmacy`) and the card shows `uYao Store`.
- **See the fields.** The email textbox is `input[name="username"]`. The password textbox is `input[name="password"]`. Submit is `登入 Store OS`.
- **Unconfigured local env.** When `STORE_OS_SESSION_SECRET` or `DATABASE_URL` is missing, both fields and the submit button are disabled and the notice `這個環境尚未設定店家帳號，登入目前停用。` is visible. That is the expected local end state.
- **Configured env.** Fill email and password, then submit. A successful response reloads into `StoreOsShell` with the store name in the sidebar. Do not invent credentials. If none are available, report `login-submit` as blocked, not verified.
- **Proof.** `verify-uyao screenshot` and `verify-uyao snapshot`. The artifacts show the sign-in card (or the signed-in shell if credentials worked).

## Gotchas

- `http://127.0.0.1:$PORT/store-os` and `http://localhost:$PORT/store-os` 308 to production. Always use the `store.localhost` host locally.
- Invite activation only appears when the hash token matches `^[A-Za-z0-9_-]{43}$`.
- Rate limit on login is 15 minutes per IP+username. Do not brute-force the form.
- A 503 means auth is not configured, not that the password is wrong.
