# uYao Web

uYao 的 Next.js 16 App Router 應用，包含 consumer-first 公開站、公司資訊頁、Store OS、PWA Web Push、試點申請與營運 console。

- Public site：[uyaohealth.com](https://uyaohealth.com)
- Store OS：[store.uyaohealth.com](https://store.uyaohealth.com)

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
| `/`、`/zh-tw`、`/en` | 消費端搜尋與品項瀏覽首頁 |
| `/app` | 內部 implementation route；公開網址會導回語系首頁 |
| `/drug/[slug]` | 藥品與附近藥局 |
| `/store/[slug]` | 藥局店頁與可預留品項 |
| `/search`、`/category/[slug]` | 搜尋結果與品類入口 |
| `/agent` | uYao Agent；用單一對話查目錄並整理藥師接手，不執行交易 |
| `https://store.uyaohealth.com/` | Store OS 店家登入、預留工作與通知設定 |
| `/pharmacy` | 藥局合作與試點申請 |
| `/about`、`/evidence`、`/guides` | 公司資訊、產品證據與知識內容 |
| `/console` | 掃描、Store OS 預留、Web Push 與逾時處理流水 |

主要 API：

- `POST /api/box/ingest`：接收 PharmaBox 掃描事件。
- `POST /api/reservations`：建立預留、寫入 Store OS，並最佳努力送出 Web Push。
- `POST/DELETE /api/store/push-subscriptions`：登入店家的裝置通知訂閱與取消。
- `POST /api/demand`：記錄目錄或庫存未命中的搜尋。
- `POST /api/agent`：受限的 uYao Agent loop；只讀目錄與呈現 handoff，沒有預留、付款或下單工具。
- `POST /api/pilot`：保存試點申請並寄送通知信。

## 資料迴路

```text
box ingest → 庫存／效期狀態 → 消費端搜尋與 console
預留 → rate limit → Store OS inbox → Web Push 提醒 → 確認／拒絕／完成店取
試點表單 → record sinks → Resend email
```

本機開發會把部分資料寫到 `web/.data/`；Production 必須使用外部 KV／webhook，不能依賴 Vercel 唯讀檔案系統。

## Production 環境變數

| 類別 | 變數 |
|---|---|
| KV | `KV_REST_API_URL`、`KV_REST_API_TOKEN` |
| Web Push | `WEB_PUSH_PUBLIC_KEY`、`WEB_PUSH_PRIVATE_KEY`、`WEB_PUSH_SUBJECT` |
| Email | `RESEND_API_KEY`、`PILOT_EMAIL_FROM`、`PILOT_EMAIL_TO` |
| Record sinks | `RECORD_WEBHOOK_URL`、`PILOT_WEBHOOK_URL` |
| uYao Agent（選填） | `UYAO_COMMERCE_AGENT_PROVIDER=openai`、`OPENAI_API_KEY`、`OPENAI_MODEL`（預設 `gpt-5.6-luna`）；亦支援 `anthropic`、`ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL` |
| 廣告量測（選填） | `NEXT_PUBLIC_GA4_ID`、`NEXT_PUBLIC_META_PIXEL_ID` |

不要把實際值、Vercel sensitive pull 結果、Push subscription endpoint 或私鑰寫進 README。

## 廣告歸因與轉換量測

投錢之前的硬前置（`specs/ads-launch-v1.md` §8）。分兩層，**下層不依賴上層**：

| 層 | 檔案 | 開關 |
|---|---|---|
| 第一方歸因 | `lib/attribution.ts`、`lib/attribution-client.ts` | 永遠開著 |
| GA4 / Meta Pixel | `lib/analytics.ts`、`components/Analytics.tsx` | 設了 `NEXT_PUBLIC_*` ID 才載入 |

第一方歸因把落地網址上的 `utm_*` 與 `gclid`／`fbclid`／`ttclid`／`msclkid` 收進
sessionStorage，之後三個轉換 endpoint 都帶著它落進 `source` 欄位：

| Endpoint | 意義 | 歸因去處 |
|---|---|---|
| `POST /api/demand` | 落空搜尋與到貨通知登記 | record sink |
| `POST /api/pilot` | 藥局試點 lead | record sink（**不進通知信**） |
| `POST /api/reservations` | 預留 | record sink（**不進 Store OS／取貨頁**） |

**不放 cookie、不記 IP、不做指紋**，referrer 只留主機名 —— 與
`specs/demand-capture.md` 的承諾一致。歸因模型是 session 內的 last non-direct click。

`source` 只在伺服器端走白名單（`normalizeAdSource`）；前端塞任何其他欄位都會被丟掉。
兩個「不進」是刻意的邊界，各有測試釘住：通知信是給人看的，收信的藥局不需要
`utm_content`；Store OS 與取貨頁是藥師與消費者的工作介面，不該顯示這個人是哪則
廣告帶來的。

轉換事件（`lib/analytics.ts` 的 `track()`）：

| 事件 | 觸發點 | Meta 標準事件 |
|---|---|---|
| `demand_recorded` | `NotifyMe` 掛載（落空搜尋被記錄） | 不映射 |
| `notify_signup` | 到貨通知登記成功 | `Lead` |
| `concierge_request` | **尚未接線** | `Contact` |

藥局試點申請與預留刻意**不發事件**：這一輪不投 B2B 廣告
（`specs/ads-launch-v1.md` §5.3），而 `OFFERS` 是空的、預留現在根本產生不出來。
多一個沒有 campaign 對應、或結構上不可能觸發的優化目標只是雜訊。
兩者的歸因照樣存進紀錄，之後要投、或第一台盒子上線時就量得到。

`demand_recorded` 刻意不映射到標準事件：它是被動記錄不是使用者意圖，
拿它當出價目標會買到一群必然落空的流量。

`concierge_request` 的事件與映射都已就緒，但站上還沒有代問入口
（`specs/ads-launch-v1.md` §3 的 IG DM 是 W1 要上的）。入口做出來時，
在送出成功的地方呼叫 `track("concierge_request", { area })` 即可，不需要動這一層。

沒設 ID 時站上不會出現任何第三方 analytics 網域，`track()` 是純 no-op。

## 產品邊界

- 庫存徽章表示掃描新鮮度，不宣稱精確數量或保證現貨。
- 消費端只支援預留與店取，沒有購物車、金流或配送。
- 處方藥不進消費端目錄；藥師完成所有關鍵交付與核准。
- uYao Agent 的 model 只選擇 read/presentation tools；server 重新填入所有卡片資料，且只接受同一 turn 由 server 發出的 product ID。沒有 provider 時使用固定目錄比對。
- 地區與距離品質取決於店家座標；缺座標時不可把跨區估算當成 GPS 距離。
- Demo reservation 必須明確標示為示範資料，不能讓藥局誤認為真實訂單。

## 相關規格

- [Web marketplace](../specs/web-marketplace.md)
- [Company landing](../specs/company-landing-page.md)
- [Demand capture](../specs/demand-capture.md)
- [Box P1](../specs/box-p1.md)
