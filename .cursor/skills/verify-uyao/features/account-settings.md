# Account and store settings

Settings is the pharmacist's view of who is signed in, which pharmacy they belong to, interface language, work-notification state, and sign out.

## Sub-features

- `settings-open` opens the `帳號與門市設定` dialog from the store status control.
- `settings-identity` shows operator name, email, pharmacy, slug, and role.
- `settings-locale` switches `繁體中文` / `English` and persists `uyao-store-locale`.
- `settings-push` shows work-notification state and Enable / Turn off when VAPID keys exist.
- `settings-logout` posts `/api/store/auth/logout` and reloads to sign-in.

## How to get to it (user POV)

- From the signed-in workspace (or `/store-os-preview`), click the pharmacy status control at the bottom of the Store Agents sidebar. Accessible name: `開啟帳號與門市設定`.
- Close with `關閉帳號設定`, `回到工作`, or Escape.

## Driving it with verify-uyao

Preconditions:

- Workspace is reachable at `urls.preview` (local) or a signed-in `urls.storeOs`.
- `verify-uyao doctor` is green.

- **Open settings.** Run `verify-uyao drive account-settings`. The dialog `帳號與門市設定` appears.
- **Read identity.** Preview shows operator `林藥師`, email `demo@uyaohealth.com`, pharmacy `uYao 示範藥局`, slug `uyao-demo`, role `店家擁有者`.
- **Language control.** Combobox `介面語言` has `繁體中文` and `English`. Changing it relabels the shell. Default isolated profile is `zh`.
- **Notifications.** Without `WEB_PUSH_PUBLIC_KEY` the control reads `尚未設定` and Enable is disabled. That is the local default.
- **Sign out (session only).** `登出` is visible. On preview it POSTs logout and reloads the preview shell (no session to clear). Do not treat preview reload as a production logout proof.
- **Proof.** Screenshot and snapshot with the dialog open so the operator and pharmacy fields are readable.

## Gotchas

- Push Enable stays disabled when keys are missing, the browser blocks notifications, or the API is unconfigured. Assert the status text, not a successful subscription.
- Locale is stored in `localStorage` (`uyao-store-locale`). Isolated `--user-data-dir` keeps runs from inheriting a human's English preference.
- Store name / role edits are not in this dialog. The copy says to use Support Agent.
