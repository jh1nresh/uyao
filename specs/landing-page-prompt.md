# Landing Page 建置 Prompt（歷史版本）

> Status: superseded for company positioning by `specs/company-landing-page.md`; retain only as evidence of the earlier consumer-first／效期雷達 direction.
> 2026-08-05 · 產品代號 PharmaBox（品牌名未定，全站用 placeholder「藥雷達」，之後全域替換）

---

## 你要做什麼

用 **Next.js 14 (App Router) + Tailwind CSS** 建一個單頁 landing page，繁體中文，靜態即可（唯一互動 = 兩個表單）。不要裝 UI 元件庫（no shadcn/daisy/MUI），不要 Framer Motion 以外的動畫依賴（CSS 動畫優先，能不用 Framer 就不用）。

**產品**：藥局庫存/效期的即時資料網路。一個盒子串在藥局現有條碼掃描器上，自動知道每家藥局「有什麼藥、哪批何時過期」。兩個受眾、一頁服務兩個 funnel：
1. **消費者**（primary hero）：搜一個藥 → 看附近哪家藥局現在有貨 → 預留 → 到店取。不是網購，是預留取貨。
2. **藥局主**（secondary section）：效期雷達 — 快過期的藥在退貨期限前 30 天主動警報，過期藥從「丟錢+付清運費」變「退回藥商」。

## 設計方向（必須遵守）

```
Direction: 藥籤/處方標籤美學 — 白底、近黑墨色 (#1a1a1a 級,禁 #000)、
           單一 accent = 台灣藥局綠十字綠 (#00843D 附近自調)，只用在關鍵處
Density:   spacious hero、comfortable 其餘
Surface:   flat sections、細 1px 邊框、極少陰影 (卡片陰影 opacity ≤6%)
Type mood: clinical、精準、可信賴 — 中文 Noto Sans TC (300/500/700 三個字重上限)，
           數字/效期/距離一律 tabular-nums；可用一個 mono 字體標數據
Motion:    克制 — hero 搜尋 demo 的打字動畫是全頁唯一的持續動畫；
           scroll-in 只用 opacity+translateY 一種，200ms，不要 stagger 超過 3 個元素
Do:
- 綠十字幾何符號可當 brand 錨點（純 CSS/SVG 畫,不要圖庫 icon）
- 庫存徽章 (● 今日掃描確認) 當設計語言展示 — 這是產品的靈魂視覺
- 大量留白、數字說話（「效期前 30 天」「4 小時保留」）
Don't:
- 薄荷綠/漸層背景、3D 藥丸或藥罐插畫、手機 mockup 合成圖、stock photo
- emoji 當 icon、insurance-blue、置中大圓角卡片三欄 feature grid（AI slop 標配）
- transition-all、purple-to-blue 漸層、glassmorphism
```

## 頁面結構（由上而下，文案已定稿可直接用）

### 1. Nav（sticky, 白底細底框）
左：綠十字符號 + 「藥雷達」。右：「我是藥局」錨點連結 + 「加入等候名單」小按鈕。

### 2. Hero（全頁重心）
- H1：`附近哪家藥局有貨，搜了就知道`
- 副標：`小護士、酸痛貼布、皮膚藥膏 — 即時庫存來自藥局店內掃描，預留 4 小時，到店再付款。`
- **互動 demo（歷史提案，未採用）**：原先規劃用假品項寫死搜尋動畫；現行實作已改為合作藥局提供的 7 個品項，舊假品項不得再出現在公開畫面。若保留 demo，供應狀態與價格必須明確標示為模擬。
  `安心藥局 · 350m · 營業中 · ● 今日掃描確認 · [預留]`
  **不出現價格** —— 見 `web-marketplace.md` 的法規邊界（刊登品名+價格+可下單可能被
  認定為通訊交易通路販賣）。價格只在藥局到店時才有。
  行內元素全部做出來（徽章、tabular 數字、預留按鈕），按預留 → 跳等候名單表單。這個 demo 就是產品說明，不需要另外的 feature 圖。
- 表單：Email 或電話，一欄一鈕 `開通時通知我`（POST 到 `/api/waitlist`，先寫進 local json/console 即可）
- 下方小字 trust line：`藥品不網售 · 到店由藥師交付 · 資料來自店內真實掃描`

### 3. How it works（三步，水平時間軸不是三張卡）
`搜尋 → 預留 → 到店取`，每步一句話。步驟間用細線連接，數字用 mono 字體。

### 4. 藥局主 section（背景色塊區隔,淺灰或極淡綠,id="pharmacy"）
- H2：`給藥局主：過期藥不該是丟錢，還要再付清運費`
- 三個數字重點（橫排，大數字+小標）：`30 天前` 退貨窗口警報 / `0 改變` 現有掃描流程不動 / `5 分鐘` 裝上就開始
- 一句機制說明：`一個小盒子串在你現有的條碼掃描器上，自動記下每批藥的效期。快過退貨期限，Store OS 建立工作並用 Web Push 提醒。`
- CTA：`申請免費試點`（表單：藥局名、區域、Email 或電話，同樣先落地 local）

### 5. Footer
極簡：品牌、聯絡 email、`資料合作與法規：本服務不進行藥品網路販售`。

## 驗收標準
1. `npm run build` 過、`tsc --noEmit` 乾淨
2. Lighthouse mobile performance ≥ 90（無大圖、無重依賴,應該輕鬆過）
3. 手機 375px 寬下 hero demo 完整可用，預留按鈕單手可及
4. grep 檢查：無 `#000`、無 `transition-all`、無漸層 class、字重只有 3 種
5. 兩個表單提交後有成功狀態（inline 訊息，不要 alert/toast 庫）
6. 全站無 stock 圖、無 emoji icon、無 mockup 合成圖

## 不要做
多頁、CMS、i18n、深色模式、cookie banner、analytics（之後再加）、任何後端資料庫。
