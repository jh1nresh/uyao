# uYao

[English](README.md) | **繁體中文**

uYao 是獨立藥局的 AI Operating System。它把庫存、效期與附近需求訊號轉成退貨、補貨與預留工作；藥師在 Store OS 處理關鍵決策後，agent 只在授權範圍內執行並記錄結果。系統接入既有掃描器與 POS 工作流程，不要求藥局整套更換。

- 公司與試點：[uyaohealth.com](https://uyaohealth.com)
- 消費端找藥：[shop.uyaohealth.com](https://shop.uyaohealth.com)

> uYao 目前是試點原型。未接上真實藥局掃描流時顯示的庫存皆為模擬資料，不代表藥局已確認的即時現貨。Agent 向藥商送單已寫入 Pharmacy OS v1 規格，但目前不是 production-live 能力。

## 運作方式

```text
藥局掃描器 ─→ 透明連接器 ─→ 庫存／效期 observation ─┐
消費者搜尋 ─────────────────→ 附近需求訊號 ──────────┤
                                                        ▼
                                                  uYao WorkItem
                                                        ▼
                                                 Store OS 藥師決策
                                                        ▼
                                                授權範圍內執行
                                                        ▼
                                           驗證實際結果 → OutcomeReceipt
```

補貨的目標閉環會從藥師核准、不可變的訂單快照繼續到 agent 送單、藥商確認、收貨與發票對帳。品項、數量、藥商、價格上限或替代品政策只要有任何異動，都必須重新請藥師核准。

## Repository

| 路徑 | 用途 |
|---|---|
| `src/` | GS1／EAN 解析、掃描 session 分類、USB HID 轉發、SQLite spool 與資料工具 |
| `web/` | Next.js 公司網站、消費端找藥、藥局試點、Store OS 預留、Web Push 與營運 console |
| `setup/` | Raspberry Pi service 與本機 pipeline simulator |
| `specs/` | 產品、硬體、需求捕捉與 web 規格 |
| `tests/` | 掃描 pipeline 測試 |

## 本機啟動

### 掃描 pipeline

```bash
python3 -m pip install -e ".[dev]"
python3 -m pytest -q
```

### Web

```bash
cd web
npm ci
npm run dev        # http://localhost:3100
npm run test
npm run typecheck
```

## 產品邊界

- 掃描連接器只側錄並原樣轉發掃描，不取代藥局 POS。
- GS1 DataMatrix 可攜帶 GTIN、效期與批號；一般一維條碼通常沒有完整效期或批號。
- 掃描只能證明品項最近被觀察到，不能單獨保證藥局的精確庫存數量。
- 消費端只提供附近找藥、預留與到店取貨，不提供購物車、線上金流、配送或處方藥交易。
- 藥師保留決策權，工作狀態與操作集中在 Store OS；Web Push 只負責離站提醒。
- agent 只能執行已核准的 snapshot，或未來可撤銷、有明確上限的 delegated policy；任何超界變更都回到藥師重新核准。

## 文件

- [Pharmacy OS v1 階段規格](specs/pharmacy-os-v1.md)
- [掃描盒 P1](specs/box-p1.md)
- [Web marketplace](specs/web-marketplace.md)
- [公司 Landing Page](specs/company-landing-page.md)
- [需求捕捉](specs/demand-capture.md)
- [硬體選項](specs/hardware-options.md)
- [Web 開發說明](web/README.md)
