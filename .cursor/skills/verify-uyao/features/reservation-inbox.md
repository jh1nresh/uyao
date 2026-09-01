# Reservation inbox

The inbox is the pharmacist's reservation work queue: codes waiting for in-stock confirmation, confirmed pickups, and closed records. Phone numbers are truncated to the last three digits.

## Sub-features

- `inbox-attention` lists reservations with status `pending_store_confirm` under `需要你`.
- `inbox-all` lists every reservation for the store under `全部工作`.
- `inbox-completed` lists picked-up, out-of-stock, cancelled, and expired rows under `完成紀錄`.
- `inbox-confirm` marks a pending code in stock (`確認有貨`).
- `inbox-reject` reports no stock (`回報無庫存`).
- `inbox-pickup` completes a confirmed pickup (`完成取貨`).
- `inbox-intake` shows customer context (allergies, shop search, note) when present.

## How to get to it (user POV)

- Sign in on the Store OS host, then use the `工作分類` nav: `需要你`, `全部工作`, `完成紀錄`.
- Locally without a session, open `/store-os-preview` on the company host (`127.0.0.1` or `localhost`). The preview seeds `A-482` (pending), `A-481` (confirmed), `A-479` (picked up), `A-476` (no stock).
- Ask the Manager Agent composer: `確認 A-123`, `缺貨 A-123`, or `完成 A-123` (signed-in workspace only).

## Driving it with verify-uyao

Preconditions:

- Local launch is healthy. `urls.preview` is set.
- Isolated Chrome profile so locale stays `zh` (default).
- Do not wait idle for 15s on preview before finishing the drive.

- **Open the workspace.** Run `verify-uyao drive reservation-inbox`. The page is `/store-os-preview` on the company host. Heading `需要你`. Region `門市預留單` contains `A-482` and `確認有貨`.
- **Filter All work.** The driver clicks `全部工作`. Heading becomes `全部工作` and `A-481` is visible.
- **Return to Needs you.** The driver clicks `需要你`. Heading is `需要你` again and `確認有貨` is still visible.
- **Live mutation (session only).** On a signed-in store (not preview), click `確認有貨` on a real pending code. Observable end state: status text `已確認` and composer notice `${code} 已確認有貨`. Re-open `全部工作` and confirm the new status. Preview PATCH returns 401 and reloads — do not report that as a successful confirm.
- **Proof.** `verify-uyao screenshot` and `verify-uyao snapshot` while `A-482` and the Needs you heading are visible.

## Gotchas

- Preview `useEffect` polls `GET /api/store/reservations` every 15s. A 401 reloads the page. Finish the drive before that interval.
- Confirm/reject/pickup on preview cannot persist. The seeded rows reset on reload.
- `localhost` `/store-os` is not this page. Preview is a company-host route; login is a store-host route.
- Demo rows carry a `示範` badge. Never treat them as a real pharmacy commitment.
- Full phone numbers are intentionally hidden. Assert `手機末三碼`, not a complete number.
