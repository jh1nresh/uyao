# 消費端 Web（有藥）

`specs/web-marketplace.md` 的 v1 實作 — 從 Claude Design 的 `消費端 Web.dc.html`
（藥品頁 1a / 搜尋首頁 1b / 藥局頁 1c / 行動端流程 1d / 庫存徽章 1e）落地。

Next.js 14 App Router + Tailwind，沒有 UI 元件庫、沒有資料庫。

```bash
npm install
npm run dev        # http://localhost:3100
npm run build      # 25 頁，其中 drug/store/category 是 SSG
npm run typecheck
```

## 頁面

| 路由 | 對應設計 | 說明 |
|---|---|---|
| `/` | 1b / M1 | 搜尋框 + 品類入口 + 附近現在有貨 |
| `/drug/[slug]` | 1a / M2 | 核心單位、SEO 入口。附近藥局 rows（列表 ⇄ 地圖）+ 同成分替代品 |
| `/store/[slug]` | 1c / M5 | 藥局頁（NAP + 有貨商品 grid），帶 `Pharmacy` JSON-LD — 對藥局的贈品 |
| `/search?q=` | — | 搜尋結果，`noindex`（SEO 入口是藥品頁，不做內容農場） |
| `/category/[slug]` | — | 品類列表，首頁品類入口的落點 |
| `/stock-badges` | 1e | 庫存徽章分級說明 |
| `/pharmacy-login` | — | header 連結落點；預留確認實際走藥局端 LINE bot |

預留流程（M3 → M4）是 `components/ReserveSheet.tsx` 的 bottom sheet，
桌機同一個 panel 置中。

## 資料層

`lib/data.ts` 是固定 fixture + 純函式查詢，換成 API 時上層 component 不用動：

- 庫存/效期 → 盒子掃描流（見 repo 根目錄的 `src/pharmabox/`）
- 價格 → 藥局自報

`Offer.daysSinceScan` 存「距最近一次掃描的天數」而不是 timestamp，
讓 render 不依賴時鐘（SSG 不會因為 build 時間不同而漂移）。正式版換成 timestamp 差值。

`lib/stock.ts` 是差異化核心：

- 徽章分級 `● 今日掃描確認 / ○ N 天前確認 / ？ 請預留確認`，永遠不顯示確切數量
- 排序 `庫存新鮮度 → 距離 → 價格`（跟 GoodRx 相反）
- `？` 的品項預留鈕轉外框樣式 — 不假裝有貨

## 預留 API

`POST /api/reservations` `{drugSlug, storeSlug, contact}` → `{code, holdHours: 4, ...}`
`DELETE /api/reservations` `{code}`

v1 沒有資料庫，落地成 `web/.data/reservations.jsonl`（已 gitignore），
之後換成藥局端 LINE bot 的 queue。

## 法規邊界（不要改掉）

- 全站只有「預留取貨」，沒有購物車 / 結帳 / 金流
- 只呈現成藥、指示藥、非藥品；處方藥不進 `lib/data.ts`，也不出現在消費端搜尋
- 藥價對消費者呈現可能構成廣告行為（藥事法 66 條事前審查）— **上線前要有懂藥事法的人 review**

## 已知限制

- 資料是 fixture，`USER_AREA` 寫死台北市大安區，沒有真的定位
- 地圖是示意圖（CSS 網格 + `Store.mapPos` 百分比），正式版接圖資
- 沒有會員系統；預留只留手機或 LINE ID
- 字型走 Google Fonts `<link>`（跟設計稿一致），要離線 build 的話改 `next/font`
