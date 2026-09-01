# Agent workboard

The workboard is the demo view of how inventory and procurement agents hand off a restock WorkItem. Live stores only get Manager Agent plus reservations; the other roles are preview/demo.

## Sub-features

- `workboard-inventory` opens `庫存 Agent` and shows scan / checkout / correction evidence.
- `workboard-procurement` opens `採購 Agent` on WorkItem `WI-2031` (`葉黃素低庫存處理`).
- `workboard-draft` opens the fixed procurement draft dialog.
- `workboard-approval` records prototype answers without sending a supplier order.
- `workboard-coming-soon` shows `結帳 Agent` as Coming soon outside demo.

## How to get to it (user POV)

- On `/store-os-preview` or a `uyao-demo` session, use the Store Agents list: `庫存 Agent`, `採購 Agent`.
- Click `檢查固定草稿` to review item, quantity, supplier, ceiling, and `尚未送出`.

## Driving it with verify-uyao

Preconditions:

- `demoMode` is on. That is true for `/store-os-preview` and for session slug `uyao-demo`.
- Live non-demo stores will show Coming soon for inventory/procurement — do not report that as a broken workboard.

- **Open procurement.** Run `verify-uyao drive agent-workboard`. Heading is `葉黃素低庫存處理`. The pane states the draft is not submitted.
- **Open the draft.** Dialog `檢查採購草稿` lists the suggested quantity, supplier, price ceiling, and `尚未送出`.
- **Approval answers stay local.** `送出回答` writes a composer warning `已記錄在原型中，尚未送出任何訂單。` There is no supplier API call to assert on the network.
- **Proof.** Screenshot and snapshot with the draft dialog open so `尚未送出` is readable.

## Gotchas

- `isStoreAgentAvailable` is `manager` always, other agents only when `demoMode` is true. A real pharmacy login will not show this workboard.
- The restock numbers are prototype copy from `web/lib/store-os.ts`, not live scans. Do not cite them as inventory truth.
- Closing the draft returns to the same WorkItem; it does not create an order.
