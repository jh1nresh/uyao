# YC Demo 錄影 Runbook

> 每一鏡都是真的在跑的系統 —— 沒有任何一幕是 mock。
> 主角店固定用**中山藥局**（唯一綁定 LINE 的店，預留會真的推到手機）。

## 前置（錄影前 5 分鐘）

```bash
# 1. 起 dev server（.env.local 已連線上 KV + LINE，本機做的事都是真的）
cd ~/pharmabox/web && npm run dev

# 2. 清掉上次測試的流水，讓 console 從空白開始（開拍那一刻才長出第一行）
../setup/demo-reset.sh
```

檢查：`localhost:3000/console` 應該是空的（「還沒有任何掃描進來」）。

畫面配置：**左半瀏覽器（console 分頁 + 店頁分頁）、右半手機畫面鏡像**（LINE 用）。
瀏覽器窗口寬度拉窄一點，字才夠大。

## Shot list（總長目標 90 秒）

| # | 秒 | 畫面 | 動作 | 旁白（英文） |
|---|----|------|------|--------------|
| 1 | 0–10 | terminal | `STORE=中山藥局 UYAO_URL=http://localhost:3000 ./setup/demo-sim.sh` 跑起來，JSON 一行行出現 | "A pharmacy scans products at checkout — like they already do every day. Our box sits inline with their existing scanner. Zero workflow change. Each scan is parsed: product, expiry date, batch." |
| 2 | 10–25 | `/console` | 重整，流水出現「掃到 → 庫存訊號更新」，現況表三支藥「● 今日掃描確認」 | "The system understands what it sees: this store just received these products. Stock signals update in real time." |
| 3 | 25–40 | `/store/中山藥局/preview` | 捲動給看徽章「● 今日掃描確認」 | "Consumers searching nearby now see which pharmacy actually has it — verified by today's scans, not a stale database." |
| 4 | 40–55 | 同頁 → 手機 | 店頁按預留、填手機號 → **切到手機：LINE 卡片跳出來** | "They reserve in one tap. The pharmacist gets it on LINE — the app every Taiwanese business owner already uses. No new software to learn." |
| 5 | 55–70 | 手機 → 瀏覽器取貨頁 | LINE 按「有貨，確認保留」→ 切回瀏覽器，取貨頁 15 秒內自動翻「已確認保留」 | "One tap to confirm. The customer's page updates instantly — pickup code, hold window, done. Two strangers just transacted with zero phone calls." |
| 6 | 70–90 | `/console` 收尾 | 重整，流水完整：掃描 → 預留 → 路由 → 確認，停在畫面上 | "Every step you just watched was automatic: routing, notification, follow-ups, expiry. And every scan builds a dataset nobody else has — real-time inventory of independent pharmacies. Next: the same LINE channel starts telling pharmacists what to restock." |

## 注意

- **旁白絕不說 "AI agent decides"** —— 說 "the system automatically"。被問到就答：決策引擎是 deterministic 的，LLM 在 roadmap（需求預測），不碰藥品安全。
- Shot 4 的預留單有「示範」標籤 —— 不用躲，被問到就說 demo mode inserts simulated offers for stores that haven't installed the box yet；真店的流程一模一樣。
- 手機那段單獨錄屏再剪進去也行，但「按下確認 → 網頁翻牌」（shot 5）盡量一鏡：因果零時差是全片最有說服力的瞬間。
- 錄壞了重來：跑一次 `setup/demo-reset.sh` 就回到空白狀態。
- 錄完記得再跑一次 reset —— 錄影產生的示範資料會留在線上 KV 的 console 流水裡。
- 若想網址列是 `uyao.vercel.app` 而不是 localhost：先 merge PR #25 + `vercel env add BOX_API_KEY` + 部署，腳本改帶 `BOX_API_KEY` 打線上即可，其他鏡不變。
