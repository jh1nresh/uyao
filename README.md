# uYao / PharmaBox

uYao 把藥局既有掃描流程產生的庫存、效期與在地需求訊號，轉成退貨、補貨與預留建議；關鍵動作由藥師在 LINE 核准。PharmaBox 是串在掃描器與藥局電腦之間的被動資料入口，不取代 POS。

- 公司與試點：[uyao.vercel.app](https://uyao.vercel.app)
- 消費端找藥：[shop-uyao.vercel.app](https://shop-uyao.vercel.app)

> 目前是試點原型。未接上真實藥局掃描流的庫存畫面與 demo 指令都是模擬資料，不代表藥局即時現貨。

## 系統迴路

```text
藥局掃描器 → PharmaBox → 藥局電腦（原樣轉發）
                    └→ 解析／離線 spool → uYao API
                                           ├→ 庫存與效期訊號
                                           ├→ Action agent
                                           └→ LINE 藥師核准

消費者搜尋 → 選擇藥局 → 預留 → LINE 通知藥局 → 店取完成
```

## Repository

| 路徑 | 內容 |
|---|---|
| `src/pharmabox/` | GS1／EAN 解析、session 分類、USB HID 轉發、SQLite spool 與資料工具 |
| `web/` | Next.js landing、消費端找藥、藥局試點、LINE 預留與營運 console |
| `setup/` | Pi service、demo simulator 與 YC demo runbook |
| `specs/` | 產品、硬體、需求捕捉與 web 規格 |
| `tests/` | PharmaBox Python 測試 |

品牌原稿與社群輸出不進版控；網站部署需要的精簡素材保留在 `web/public/brand/`。

## 本機啟動

### PharmaBox pipeline

```bash
python3 -m pip install -e ".[dev]"
echo '(01)04712345678901(17)271031(10)B7' | python3 -m pharmabox.dev_cli
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

## 核心邊界

- PharmaBox 只側錄並原樣轉發掃描，不替換藥局 POS。
- GS1 DataMatrix 可攜帶 GTIN、效期與批號；一般一維條碼通常沒有完整效期／批號。
- 掃描訊號能證明「最近被掃到」，不能單獨保證精確庫存數量。
- 消費端只做附近找藥、預留與店取，不提供購物車、線上結帳或處方藥交易。
- LINE 是藥局端核准與通知介面；關鍵決策不由 agent 自動執行。

## 文件

- [Box P1](specs/box-p1.md)
- [Web marketplace](specs/web-marketplace.md)
- [Company landing](specs/company-landing-page.md)
- [Demand capture](specs/demand-capture.md)
- [Hardware options](specs/hardware-options.md)
- [YC demo runbook](setup/yc-demo-runbook.md)
- [Web 開發說明](web/README.md)
