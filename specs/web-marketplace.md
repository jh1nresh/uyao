# Spec: 消費端 Web — 藥品 價格/庫存/店家（SLL-R + Pointy）

> Status: direction locked, build 待 10+ 藥局在線 · 2026-08-05
> 先讀 `specs/box-p1.md`。資料來源 = 盒子掃描流（庫存/效期）+ 藥局自報（價格）。

## 定位一句話
「搜一個藥，看到附近哪家有貨、多少錢，按預留、到店取。」不做線上交易、不碰金流。

## ⚠️ 法規邊界（build 前必查清）
- 藥品網售禁止 → 全站只有「預留取貨」，沒有購物車/結帳
- **藥品廣告需事前審查（藥事法 66 條）、處方藥禁止對大眾廣告** → 對消費者呈現藥價可能構成廣告行為：
  - v1 只呈現**成藥/指示藥/非藥品**（軟膏、貼布正好多屬此類 — 品類選擇跟法規對齊）
  - 處方藥不列價格、不出現在消費端搜尋；只在藥局後台
  - P0 找懂藥事法的人 review 過再上線

## 資訊架構（三種頁面，Pointy 的 SEO 結構）

### 1. `/drug/[slug]` — 藥品頁（核心單位，SEO 入口）
GoodRx 的比價結構，改成「距離+庫存」優先而非純價格：

```
[藥品 header] 品名中英 · 劑型/規格 · 許可證字號 · 圖
[附近藥局 rows] 每行：店名 | 距離 | 營業中/已打烊 | 價格 | 庫存徽章 | [預留]
[地圖切換] list ⇄ map
[同成分替代品] 沒貨時的出路
```

**庫存徽章是差異化核心**（Pointy/GoodRx 都給不了）：
- `● 今日掃描確認` / `○ 3 天前確認` / `？請預留確認` — 誠實分級，來自盒子掃描新鮮度
- 永遠不顯示確切數量（是估計值），只顯示狀態
- 排序：有貨新鮮度 > 距離 > 價格（跟 GoodRx 相反 — 買貼布的人要「現在拿到」不是「省 5 塊」）

### 2. `/store/[slug]` — 藥局頁（Pointy store page）
店資訊（NAP、時段、Google Maps 深連結）+ 有貨商品 grid + 「本店可預留」。每家藥局免費得到一個會被 Google 索引的網頁 = 對藥局的贈品，也是獲客話術。

### 3. `/` — 搜尋首頁
一個搜尋框 + 品類入口(軟膏/藥膏/貼布) + 「附近現在有貨」流。不做內容農場。

## 預留流程（SLL-R pickup-first）
搜 → 藥局 row 按[預留] → 留 LINE/手機 → 藥局端 LINE bot 按 OK → 保留 4hr → 到店付款 → 藥局按已取 → 我們記精確 -1。no-show 兩次限權。

## 設計方向（design brief）
```
Direction: 清爽藥籤/處方標籤感 — 白底、近黑墨色、單一綠十字綠accent；資料密表格為主角
Density:   marketplace = compact（表格行距緊）；藥品 header = comfortable
Surface:   flat sections + 細邊框表格；不用浮卡片堆疊
Type mood: clinical、tabular、trustworthy；價格/效期/距離用 tabular-nums 或 mono
Motion:    幾乎沒有 — 列表 cross-fade 120ms，僅此
Do:  庫存徽章做成系統性的視覺語言；距離+營業狀態永遠可見；行動端單手可預留
Don't: 薄荷綠漸層、手機 mockup 圖、insurance-blue、圓角藥丸插畫、購物車隱喻（沒有購物車）
```
（Pinterest 調研結論：pharmacy app 品類已同質化 — 薄荷綠+白卡+3D 藥丸=品類噪音，走反方向：像「藥師的工具」不像「健康 app」。）

## Out of scope
線上支付、處方藥消費端呈現、會員系統（LINE 登入即可）、評價系統（SLL-R reputation 是後話）
