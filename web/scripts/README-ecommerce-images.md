# 電商產品圖產生器

上架用的 1000×1000 商品圖。版面來自 Claude Design 專案「電商產品圖製作」
（`電商產品圖.dc.html`）。

```bash
cd web
python3 scripts/build-ecommerce-images.py
```

輸出到 `designs/ecommerce/`，已 gitignore —— 輸出包只留本機，跟 `designs/uyao-logo/`
同一個慣例。要換位置用 `--out`。

## 檔案

| 檔案 | 角色 |
|---|---|
| `ecommerce_content.py` | 文案、數字、配色。改內容只動這裡 |
| `ecommerce-plate.html` | 版型與樣式 |
| `build-ecommerce-images.py` | 逐張用 headless Chrome 截圖 |

中文由站上同一份 `Noto Sans TC` 排，不經影像模型 —— 影像模型畫繁體中文會出假字。

## 素材

素材放 `.tmp/ecom-assets/<key>.png`，用 `packshot-cleanup.swift` 從實拍去背，
背景指定白色：

```bash
swift scripts/packshot-cleanup.swift 原圖.png .tmp/ecom-assets/defense-front.png \
  --bg ffffff --pad 0.04 --highlights 0.5
```

缺素材的版位會印出紅色斜線的「素材未到位」標記，不會靜默輸出空白圖，收尾也會
在 stderr 列出缺哪幾張。**看到標記就不要上架那一張。**

目前缺三張，需要店家補拍：

| key | 缺什麼 | 影響 |
|---|---|---|
| `defense-back` | Defense 背面標示照 | `defense-3-ingredients` |
| `yi-back` | 憶元素 營養標示照 | `yiyuansu-3-ingredients` |
| `aob` | AOB 商品照 | `aob-1-main`、`aob-2-features` |

補齊後把檔案放進 `.tmp/ecom-assets/`，在 `ecommerce_content.py` 把對應的
`hero` / `usp_art` / `ing_art` 從 `None` 改成 key，重跑即可。

## 上架前要確認的事

1. **Defense 廠商名**：設計稿寫「國鼎生物科技有限公司」，包裝與 `lib/data.ts`
   都是「圓鼎生物科技有限公司」。這裡取「圓鼎」，但兩者只能有一個對，**請向
   店家或原廠確認**再上架。
2. **Defense 的 `FDA APPROVED` chip**：標章確實印在包裝上，但美國 FDA 不對膳食
   補充品做「核准」。把包裝上的標章放大成行銷 chip，宣稱強度比包裝本身高，
   有廣告不實風險。要不要留是行銷決定，但別當成監管背書。
3. **AOB 沒有可查證的成分、廠商與進口商資訊**。日文包裝在台灣通路上架通常需要
   中文標示（品名、內容物、淨重、進口商、有效日期）。本產品目前不在
   `lib/data.ts` 的目錄裡，資料尚未建立。
4. 食品不得宣稱療效。目前文案都取自包裝既有敘述，沒有新增功效宣稱 —— 之後改
   `ecommerce_content.py` 時請維持這條界線。
