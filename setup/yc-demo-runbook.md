# YC 產品 Demo 錄影 Runbook

> 這是 YC application 裡的 **product demo**，不是一分鐘 founder video。
> Founder video 只能由 founders 對鏡頭說話；產品畫面要另外放在 demo 欄位。

## 這支影片要證明什麼

110 秒內只證明一件事：**既有藥局進貨掃描產生供應訊號，消費者預留後，藥局能在 LINE 一鍵確認並記錄完成取貨。**

目前的誠實邊界：

- 沒有 Pi／實體掃描器，所以條碼輸入是**明確標示的模擬掃描**。
- parser → classifier → SQLite spool → uploader → ingest API → Agent Console 是真的程式與資料流。
- `/en/store/中山藥局/preview` 的商品與售價是**明確標示的 consumer preview**；其中「Received today」新鮮度會由上一步的 demo receiving scan 真正更新。
- 從「送出預留」開始，reservation、LINE 推播、藥局確認與取貨頁狀態更新都是真的。

不要說「每一幕都不是 mock」，也不要說掃描會產生精確庫存數量。能說的是：receiving scan 更新了 consumer preview 裡既有品項的供應新鮮度。

## 目前應該錄 localhost

截至 2026-08-09，PR #25 仍是 open；production 的 `/console` 是 404。錄影用：

```text
http://localhost:3100
```

不要用舊稿的 `localhost:3000`。`web/package.json` 的 dev server 是 3100。

## 建議成片規格

- 16:9、1920×1080、30 fps，長度 95–110 秒。
- 英文 founder voice-over；不用 AI 配音、不加音樂、不做動畫片頭。
- 游標要看得見，但不要繞圈；每次點擊前停半秒。
- Browser zoom 125–150%，Terminal 字級 22–26 px。
- 只錄產品視窗；不要錄桌布、其他 tabs、通知、API key 或 `.env.local`。
- 最簡單的工具：macOS `Shift-Command-5` 錄選取範圍。手機用 iPhone Mirroring 放在同一畫面；若不穩，再用 iPhone 內建螢幕錄影後剪入。

## 錄影前 10 分鐘

### 1. 準備畫面

開啟「勿擾模式」，關掉密碼管理器 popup、Slack、Telegram、Calendar 通知。

桌面排成三個可切換的畫面：

1. Terminal：只留 demo command，看不到 server log。
2. Browser：開兩個 tabs。
   - `http://localhost:3100/en/console`
   - `http://localhost:3100/en/store/中山藥局/preview`
3. iPhone Mirroring：停在綁定中山藥局的 LINE 聊天室。

### 2. 啟動 server（不要錄這段）

```bash
cd /Users/jhinresh/pharmabox/web
npm run dev
```

### 3. 清掉上一輪 demo scan／console 資料

另開 Terminal：

```bash
cd /Users/jhinresh/pharmabox
./setup/demo-reset.sh
```

這只清 `scan:*` 與 `console:log`；不刪 reservation、LINE binding 或真實需求資料。

重新整理 `/en/console`，必須同時看到：

- “No receiving scans yet”
- “No events yet”

### 4. 做一次閉環預檢

- 中山藥局 LINE binding 必須存在。
- 預留成功後，頁面上的「示範診斷」必須顯示「已推播給藥局的 LINE」。
- LINE 按「有貨，確認保留」後，取貨憑證頁應在 15 秒內變成「已確認保留」。
- 預檢完再執行一次 `./setup/demo-reset.sh`，讓正式錄影從空 console 開始。

注意：示範預留的 IP rate limit 是每小時 3 次，`demo-reset.sh` 不會清它。不要為了練旁白重複送單；先空走動作，最後只做一次預檢、一次正式錄影。

## 110 秒 shot list 與逐字旁白

| 時間 | 畫面與動作 | 英文旁白 |
|---|---|---|
| 0–8 秒 | `/en/console` 空白畫面，停一秒後切 Terminal。 | “A pharmacy POS records what sold. It cannot expose fresh supply to nearby customers or turn that demand into completed work.” |
| 8–24 秒 | Terminal 執行下方 command。讓三筆 receiving scan 完整跑完；不模擬售出。 | “The hardware is not connected in this demo, so barcode input is simulated. Parsing, session classification, offline storage, upload, and the decision pipeline are real.” |
| 24–38 秒 | 切 `/en/console`、重新整理。停在 Receiving signals，再讓 Decision trace 入鏡。 | “A receiving scan refreshes supply without pretending to know an exact quantity. This console is our internal trace, not a dashboard pharmacy staff must learn.” |
| 38–52 秒 | 切 `/en/store/中山藥局/preview`，讓 demo boundary 與 “Received today” 入鏡，再按 Reserve。 | “The catalog and prices in this labeled preview are simulated. The received-today signal came from the scan you just saw.” |
| 52–67 秒 | 輸入測試手機號、送出，停在 LINE delivery diagnosis，再開 pickup receipt。 | “A nearby customer reserves for pickup—no checkout and no delivery. The request goes to the pharmacy’s existing LINE account.” |
| 67–82 秒 | LINE 按「有貨，確認保留」，回英文 pickup receipt 等狀態變成 Pickup confirmed。 | “The pharmacist keeps decision authority and confirms with one tap. The customer immediately gets a pickup code and hold window.” |
| 82–98 秒 | 模擬顧客已到店；LINE 按「客人已取走」，回 pickup receipt 看 Picked up。 | “At pickup, the pharmacist closes the loop in LINE. The outcome is now recorded instead of inferred.” |
| 98–110 秒 | 回 `/en/console`，停在 reservation → LINE → confirmed → picked up 四行。 | “One supply signal became one pharmacist-approved pickup. UYao records the outcome so the next inventory action can improve.” |

正式錄影 command：

```bash
cd /Users/jhinresh/pharmabox
clear
DEMO_LANG=en STORE=中山藥局 UYAO_URL=http://localhost:3100 ./setup/demo-sim.sh
```

## 錄影時的節奏

- 按下錄影後先等 2 秒；最後一幕停 3 秒再停止。
- 不等頁面慢慢載入：所有 tabs 都要預先開好，錄影時只重新整理 `/en/console`。
- 不要把 terminal server log 放進成片；它會分散注意力，也可能露出不該露的資料。
- LINE 卡片進來後先停 1 秒再按，讓 YC 看清楚「示範」標示與取貨碼。
- 取貨頁最久每 15 秒 refresh。若沒有立刻翻牌，不要一直點；等一次 refresh。
- 旁白講錯一個字不用重來；功能失敗、通知沒來、頁面沒有翻牌才重錄。

## 不要講的話

- 不說 “AI agent decides”。目前決策是 deterministic；LLM 只可能用在之後的需求整理，不碰藥品安全。
- 不說 “real-time inventory count”。目前是 scan freshness signal，不是精確數量。
- 不說 “pharmacies are already using this” 或 “customers are already transacting”，除非錄影前已有可驗證的真實使用證據。
- 不說 receiving scan 產生商品目錄或精確數量；它只更新 preview 中已知品項的供應新鮮度。
- 不把 preview 橫幅裁掉。誠實標示比假裝 production 更有說服力。

## 成片驗收

輸出前從頭看一次，五項全部通過才上傳：

- [ ] 110 秒內，前 8 秒已說清楚問題與產品。
- [ ] 模擬掃碼、真實 pipeline、consumer preview、真實 reservation/LINE boundary 都講清楚。
- [ ] LINE 通知、藥局確認、完成取貨、Console outcome event 都看得到。
- [ ] 沒有 API key、手機完整號碼、其他通知或私人 tab 入鏡。
- [ ] 1080p 下文字可讀，英文聲音比電腦音量清楚。

上傳成不需登入或密碼即可播放的連結，貼到 YC application 的 demo 欄位。Founder application video 另外錄，不要把這支 90 秒產品 demo 當 founder video 交上去。

## 錄完收尾

1. 再跑一次 `./setup/demo-reset.sh`，清掉錄影產生的 scan signal 與 console 流水。
2. 不要刪 LINE binding、reservation store 或 rate-limit keys。
