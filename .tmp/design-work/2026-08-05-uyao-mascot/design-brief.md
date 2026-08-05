# Design Brief（design-taste 疊加於 direction pack）

> brand.md 不存在；品牌真理是 `web/tailwind.config.ts` 的 token
> （green #0B7A3E、ink #1A2420、borderRadius:none）。本 brief 不覆蓋它。

```
Direction: 器物擬人 —— 掃描盒角色，臨床友善（clinical-friendly）。
           不是「AI 產品的機器人」，是「那台真的知道哪裡有貨的盒子」
Density:   spacious —— 每個畫面最多出現一次，周圍留白，不與文字搶位
Surface:   白底上的純色剪影，無容器、無卡片、無陰影
Type mood: 不變（Noto Sans TC）；吉祥物本體不帶文字
Motion:    無 —— 站上 motion 預算趨近於零，吉祥物不破例。
           表情只隨資料改變，沒有 idle 動畫
Do:
- 天線頂端＝庫存徽章字符：● 實心/○ 空心/？ —— 吉祥物與徽章系統共用零件
- 表情永遠綁定確定性等級，資料沒變表情不變
- 只用 green/ink/white；眼睛以外一律直角
- 16px 以剪影辨識，不求讀出表情
Don't:
- 通用機器人零件（圓球天線已移除；不加手臂、對話框、火花）
- 「沒有貨」畫面配笑臉
- 紅黃警示色、漸層、光暈、3D、圓角糖果感
- 當裝飾用 —— 沒有狀態要傳達的地方不出現
```

## Anti-slop 檢查（已跑）

| 檢出 | 嚴重度 | 處置 |
|---|---|---|
| 「可愛機器人」是 AI 時代陳腔 | MODERATE | 已修：移除編造的圓球天線，改為徽章字符；角色文法錨定真實硬體 |
| M2 十字加臉 = 品類符號擬人，convergence test 不過 | — | 淘汰 |
| 可掃描規則（#000 / transition-all） | — | 乾淨 |

## 與徽章系統的關係（最重要的一條）

`lib/stock.ts` 是唯一真理。吉祥物是它的**視圖**，不是第二套語意 ——
天線字符必須從 `StockBadgeSpec.char` 直接餵，不得在元件裡重新判斷。
