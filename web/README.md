# uYao Web

uYao 的 Next.js 16 App Router 應用，包含公司 landing、消費端附近找藥、藥局預留通知、試點申請與營運 console。

- Landing：[uyao.vercel.app](https://uyao.vercel.app)
- Consumer app：[shop-uyao.vercel.app](https://shop-uyao.vercel.app)

## 本機開發

```bash
npm ci
npm run dev        # http://localhost:3100
npm run test
npm run typecheck
npm run build
```

本機環境變數放在 `web/.env.local`，不要提交金鑰。

## 主要路由

| 路由 | 用途 |
|---|---|
| `/`、`/en` | 公司 landing 與試點申請 |
| `/app` | 消費端搜尋首頁 |
| `/drug/[slug]` | 藥品與附近藥局 |
| `/store/[slug]` | 藥局店頁與可預留品項 |
| `/search`、`/category/[slug]` | 搜尋結果與品類入口 |
| `/pharmacy` | 藥局合作與 LINE 綁定入口 |
| `/console` | 掃描、預留、LINE 與逾時處理流水 |

主要 API：

- `POST /api/box/ingest`：接收 PharmaBox 掃描事件。
- `POST /api/reservations`：建立預留並通知已綁定的藥局 LINE。
- `POST /api/demand`：記錄目錄或庫存未命中的搜尋。
- `POST /api/pilot`：保存試點申請並寄送通知信。
- `POST /api/line/webhook`：驗證 LINE 簽章並處理綁定／藥局回覆。

## 資料迴路

```text
box ingest → 庫存／效期狀態 → 消費端搜尋與 console
預留 → rate limit → LINE 藥局通知 → 確認／拒絕／完成店取
試點表單 → record sinks → Resend email
```

本機開發會把部分資料寫到 `web/.data/`；Production 必須使用外部 KV／webhook，不能依賴 Vercel 唯讀檔案系統。

## Production 環境變數

| 類別 | 變數 |
|---|---|
| KV | `KV_REST_API_URL`、`KV_REST_API_TOKEN` |
| LINE | `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_ADMIN_USER_IDS` |
| Email | `RESEND_API_KEY`、`PILOT_EMAIL_FROM`、`PILOT_EMAIL_TO` |
| Record sinks | `RECORD_WEBHOOK_URL`、`PILOT_WEBHOOK_URL` |

不要把實際值、Vercel sensitive pull 結果或 LINE user ID 寫進 README。

## 產品邊界

- 庫存徽章表示掃描新鮮度，不宣稱精確數量或保證現貨。
- 消費端只支援預留與店取，沒有購物車、金流或配送。
- 處方藥不進消費端目錄；藥師完成所有關鍵交付與核准。
- 地區與距離品質取決於店家座標；缺座標時不可把跨區估算當成 GPS 距離。
- Demo reservation 必須明確標示為示範資料，不能讓藥局誤認為真實訂單。

## 相關規格

- [Web marketplace](../specs/web-marketplace.md)
- [Company landing](../specs/company-landing-page.md)
- [Demand capture](../specs/demand-capture.md)
- [Box P1](../specs/box-p1.md)
