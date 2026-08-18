# 電商產品圖產生器

上架用的 1000×1000 商品圖。版面來自 Claude Design 專案「電商產品圖製作」
（`電商產品圖.dc.html`），涵蓋設計稿全部 21 項產品、58 張圖卡。

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

前八項（Defense～珊瑚鈣）的素材已到位，跑起來就是成品。**第 9～21 項共 13 個
key 還缺**，那 35 張現在印的是缺件標記：

| key | 產品 | 缺件影響 |
|---|---|---|
| `kurozu` | 東洋 熟成黑酢膠囊 | 2 張 |
| `biostand` | BIO-STAND 挺液鈣 | 3 張 |
| `congshen` | 聰身景麴 | 3 張 |
| `richingsheng` | 賢士 日清勝 | 3 張 |
| `guguanjian` | 固關鍵 UC II | 3 張 |
| `jinguguanjian` | TERYLEAF 金固關健 | 3 張 |
| `youweining` | 佑衛寧 高麗菜 | 3 張 |
| `glutamine` | 賜利康 L-Glutamine | 3 張 |
| `mg` | 新優力超級鎂 | 2 張 |
| `arginine` | L-Arginine 一氧化氮 | 2 張 |
| `guerhgan` | 中美 顧爾肝 | 3 張 |
| `sbenlin` | 益聖靈-P 軟膠囊 | 2 張 |
| `maca` | 歐業 勁勇 MEN'S MACA | 3 張 |

這 13 張的去背圖只存在 Claude Design 專案的 `assets/cut-<key>.png`，每張都超過
design 同步工具單檔 256 KiB 的讀取上限，**沒辦法用工具拉進 repo**，要從瀏覽器
手動下載，或用 `packshot-cleanup.swift` 從實拍重做。

檔名去掉 `cut-` 前綴放進 `.tmp/ecom-assets/`（`assets/cut-kurozu.png` →
`.tmp/ecom-assets/kurozu.png`），重跑上面那行指令就會出圖，`ecommerce_content.py`
不用再改 —— 版位已經指向這些 key 了。

素材到位後要看一次成品：`hero_h` 是照設計稿的 `max-height` 填的，包裝比例差太多
的品項可能要微調 `hero_h` / `usp_art_w`。

## 上架前要確認的事

1. ~~Defense 廠商名~~ **已確認為「圓鼎生物科技有限公司」**（2026-08-18 店家確認）。
   設計稿的「國鼎」是錯的，本產生器與 `lib/data.ts` 都已是圓鼎，不需再改。
2. **Defense 的 `FDA APPROVED` chip**：標章確實印在包裝上，但美國 FDA 不對膳食
   補充品做「核准」。把包裝上的標章放大成行銷 chip，宣稱強度比包裝本身高，
   有廣告不實風險。要不要留是行銷決定，但別當成監管背書。
3. **AOB 已由一銘藥局確認販售**（2026-08-18），也已收進 `lib/data.ts`，但只收
   品名與規格 —— 日文原裝包裝上讀不到成分與委製廠商。上架前仍需要中文標示
   （品名、內容物、淨重、進口商、有效日期），那是通路的法定要求，不是這支
   腳本能補的。
4. 食品不得宣稱療效。目前文案都取自包裝既有敘述，沒有新增功效宣稱 —— 之後改
   `ecommerce_content.py` 時請維持這條界線。
5. **L-Glutamine 成分卡的四顆訴求 chip**（`ing_chips`）照設計稿收了「消化道機能・
   保護力・運動恢復・健康維持」。特色卡上的原句是「幫助維持消化道機能」這種有
   限定語的寫法，chip 把限定語拿掉了，宣稱強度比原句高 —— 跟第 2 點的 FDA chip
   同一類問題。要不要留是行銷決定。
6. **第 9～21 項的素材疑似影像模型產出**：design 專案的 `raw/mg.png` 帶 `caBX`
   （C2PA content credentials）chunk，`uploads/` 裡對應的來源檔名是
   「ChatGPT Image 2026年8月18日…」。`assets/cut-*.png` 是它們去背後的版本。
   本檔案上面那條「中文不交給影像模型」的理由同樣適用在包裝照本身 —— 影像模型
   會改寫盒上的字。這 13 項在上架前要拿實體包裝逐一核對，或直接改用實拍照
   （`packshot-cleanup.swift`）。
