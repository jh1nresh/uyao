# Spec: PharmaBox P1 — 掃描器中間人盒子

> Status: in progress · 2026-08-04
> Scope: 盒子軟體本體。雲端 dashboard / LINE 推播 / 補貨預測全部 out of scope。

## Product boundary
串在「藥局現有掃描器 → 藥局電腦」中間的透明盒子。對藥局電腦模擬成同一支 HID 鍵盤掃描器（零工作流改變），同時側錄每筆掃描、解析、落地本地 queue、盡力上傳。

## P1 independently testable slice
在開發機（Mac，無 Pi、無 gadget mode）用 stdin 模擬掃描器輸入，跑完整 pipeline：
原始掃描字串 → 符號分類（EAN-13 / 健保碼 / GS1）→ GS1 AI 解析（GTIN/效期/批號）→ 進貨/調劑分類 → SQLite queue → （有設定 API URL 時）批次上傳含重試。

## Acceptance scenarios
1. `]d20147123456789012311727103110A1B2` → GTIN=47123456789012, expiry=2027-10-31, batch=10A1B2, symbology=gs1
2. `(17)271000` → expiry=2027-10-31（DD=00 → 月底）
3. `4711234567890` → symbology=ean13；`BC22731100` → symbology=nhi_code
4. 10 秒內連掃 ≥5 筆 → session 標 receiving；孤立單筆 → dispensing；含 GS1 效期的 session 一律 receiving
5. API 掛掉時事件留在 queue，`uploaded=0`；恢復後補傳成功標 `uploaded=1`（不掉單）
6. `pytest` 全綠

## Out of scope (P1)
- Pi gadget mode 實機驗證（setup script 附上，但驗證是 P2 到手硬體才做）
- 健保碼→品名 lookup、效期警報引擎、任何雲端/UI

## Verification
`python3 -m pytest` + `echo '<scan>' | python3 -m pharmabox.dev_cli`
