# uYao

[English](README.md) | **繁體中文**

uYao 把藥局的庫存、效期與在地需求訊號，轉成由藥師核准的退貨、補貨與預留流程。系統接入藥局既有的掃描器與 POS 工作流程，不要求藥局整套更換。

- 公司與試點：[uyaohealth.com](https://uyaohealth.com)
- 消費端找藥：[shop.uyaohealth.com](https://shop.uyaohealth.com)

> uYao 目前是試點原型。未接上真實藥局掃描流時顯示的庫存皆為模擬資料，不代表藥局已確認的即時現貨。

## 運作方式

```text
藥局掃描器 → 透明掃描連接器 → 藥局電腦
                    └→ 解析／離線 spool → uYao API
                                           ├→ 庫存與效期訊號
                                           ├→ 行動建議
                                           └→ LINE 藥師核准

消費者搜尋 → 選擇藥局 → 預留 → LINE 通知藥局 → 到店取貨
```

## Repository

| 路徑 | 用途 |
|---|---|
| `src/` | GS1／EAN 解析、掃描 session 分類、USB HID 轉發、SQLite spool 與資料工具 |
| `web/` | Next.js 公司網站、消費端找藥、藥局試點、LINE 預留與營運 console |
| `setup/` | Raspberry Pi service、demo simulator 與 YC demo runbook |
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
- LINE 是藥局端的核准與通知介面；agent 不會自動執行關鍵決策。

## 文件

- [掃描盒 P1](specs/box-p1.md)
- [Web marketplace](specs/web-marketplace.md)
- [公司 Landing Page](specs/company-landing-page.md)
- [需求捕捉](specs/demand-capture.md)
- [硬體選項](specs/hardware-options.md)
- [YC demo runbook](setup/yc-demo-runbook.md)
- [Web 開發說明](web/README.md)
