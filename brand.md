# Brand — uYao 有藥

uYao 是台灣獨立藥局的 AI Operating System，將庫存、效期與附近需求轉成由藥師批准的下一步行動。

_整理於 2026-08-12。這份文件記錄目前已上線的品牌系統；本次沒有重新選色或改寫全站 theme。_

## 品牌定位

- **公司產品：** uYao — 獨立藥局的 AI Operating System
- **消費者服務：** uYao 找藥 — 搜尋公開藥局資料並留下找藥需求
- **核心閉環：** supply signal → action → pharmacist approval → outcome receipt
- **責任邊界：** 不是線上藥局、不是 POS、不是即時庫存保證，也不提供醫療或用藥建議

## 視覺識別

### 主要 Logo

- 公司導覽與 Footer：`web/public/brand/uyao-logo-v4.svg`
- 反白版本：`web/public/brand/uyao-logo-v4-reverse.svg`
- 單色版本：`web/public/brand/uyao-logo-v4-mono.svg`
- X 頭像：`web/public/brand/uyao-x-avatar-400.png`
- 圓形裁切安全備用：`web/public/brand/uyao-mark-v2-x-safe-400.png`

Logo 是「uYao｜有藥」完整鎖定組合。不要重排字標、替換字型、加醫療十字、盾牌或勾選符號，也不要把圖形解讀成庫存保證。

### UI 色彩

| Token | Hex | 用途 |
|---|---|---|
| `ink` | `#1C2722` | 主要文字 |
| `forest` | `#17392C` | 主要按鈕、深色品牌面 |
| `green` | `#087B43` | 狀態、互動與重點線條 |
| `ivory` | `#F2EFE6` | 全站基底 |
| `paper` | `#F8F4E9` | 卡片與 Footer 表面 |
| `muted` | `#59665F` | 次要文字 |
| `oxblood` | `#74352F` | 編號、kicker 與限制提示 |
| `line` | `#D2CDC1` | 分隔線 |
| `sage` | `#DCE7D9` | 淺色 CTA 與證據區塊 |

實作來源是 `web/tailwind.config.ts`；元件使用 Tailwind token，不另寫近似色。Logo 向量內的深綠與漸層屬於品牌資產本身，不拿來新增 UI token。

### 對比基準

| 配對 | 對比 |
|---|---:|
| `ink` / `ivory` | 13.40:1 |
| `forest` / `paper` | 11.52:1 |
| `muted` / `ivory` | 5.23:1 |
| `paper` / `forest` | 11.52:1 |

以上核心配對通過 WCAG AA。新增小字時，不使用比 `muted` 更淡的顏色，除非重新驗證對比。

## Typography

- **介面與內文：** Noto Sans TC，自架 subset；系統中文字型 fallback
- **編輯式標題：** Noto Serif TC
- **數字、狀態與技術標籤：** IBM Plex Mono

字型由 `web/app/layout.tsx` 載入，CSS 變數定義在 `web/app/globals.css`。新增中文文案後要重跑 `web/scripts/subset-fonts.py`，避免線上字型缺字。

## 版面與互動

- 採暖色紙張感、1 px 分隔線、無圓角、低陰影。
- 內容區使用一致 gutter；長文控制閱讀寬度，Footer 可用較寬的資訊網格。
- 所有互動使用 `<a>` 或 `<button>`，觸控高度至少 44 px，保留可見 focus ring。
- 動畫只用於說明流程或狀態變化，並支援 `prefers-reduced-motion`。
- 不用裝飾性 emoji、醫療圖示拼貼、3D、玻璃擬態或與現有紙張系統衝突的圓角卡片。

## Tone and voice

### 使用

直接、具體、可驗證。先回答「現在能確認什麼」，再說下一步。清楚區分 code/test、prototype、示範資料、待驗證與正式合作。

### 避免

避免「即時有貨」「保證找到」「AI 自動決定」「認證」「醫療背書」等超出證據的說法。不要把公開收錄藥局寫成合作藥局，也不要把 WeStrong 的公司層級合作擴張成商品供應或藥品保證。

### 範例

> 搜尋公開藥局資料並留下找藥需求；供應、預留與用藥問題仍由藥局或藥師確認。

## 品牌與信任連結

- 官方網站：`https://uyaohealth.com/zh-tw`
- 消費者找藥：`https://shop.uyaohealth.com/zh-tw`
- 官方 X：`https://x.com/uyaohealth`
- 產品與合作證據：`https://uyaohealth.com/zh-tw/evidence`

Footer、結構化資料與社群帳號應使用以上 canonical URL。新的公開合作資訊先更新 evidence 頁，再從 landing 與 shop 連回該頁。

---

_Last updated: 2026-08-12 via `brand-design` reference-capture mode._
