# uYao Agent API 測試

`POST /api/agent` 只查詢目錄、呈現品項與合作藥局聯絡選項；不建立預留、不通知藥局、不付款。預設使用固定目錄比對。Claude 只選擇工具，呈現內容由伺服器資料產生，自由文字模型回覆不會直接顯示。

## 本機固定目錄測試

在 `web/` 執行；環境變數的空值會覆蓋 `.env.local` 中的模型／遠端 KV 設定：

```sh
UYAO_COMMERCE_AGENT_PROVIDER= ANTHROPIC_API_KEY= KV_REST_API_URL= KV_REST_API_TOKEN= npm run dev
```

另一個 terminal：

```sh
node scripts/smoke-commerce-agent.mjs --expect-mode catalog
```

腳本預設只呼叫 `http://localhost:3100/api/agent`。固定執行 3 次合成請求：JSON 查「補鈣」、NDJSON 查「補鈣」、NDJSON 問第一項附近藥局。任一非 2xx、缺少最後 result、mode 不符或 `degraded` 都失敗，不重試。不讀取或送出 API key，也不使用真實健康問答。

其他本機 port 使用 `--endpoint http://localhost:3101/api/agent`。外部端點必須同時指定完整 `--endpoint` 與 `--allow-external`；請先確認目標與其模型費用。redirect 一律拒絕。

## 選配 Claude 連線測試

將使用者自己的 Anthropic API key 放在本機 `web/.env.local` 或部署 secret 管理介面，勿貼進聊天、文件或 commit：

```dotenv
UYAO_COMMERCE_AGENT_PROVIDER=anthropic
ANTHROPIC_API_KEY=<自己的 API key>
ANTHROPIC_MODEL=claude-sonnet-5
```

重啟 dev server，確認沒有沿用上節的空 provider 環境設定，再執行：

```sh
node scripts/smoke-commerce-agent.mjs --expect-mode claude
```

這會使用付費 API；3 次請求最多觸發 12 次模型呼叫。每次模型呼叫最多 1200 output tokens、20 秒 timeout；腳本每個 HTTP 請求等候上限 90 秒。`ANTHROPIC_MODEL` 未設時使用 `claude-sonnet-5`；帳號是否可用、餘額與 API 配額仍取決於 Anthropic Console。

只有 `mode: "claude"` 且沒有 `degraded` 才證明該次結果經過 Claude 工具 loop。HTTP 200 或看得到卡片不代表模型連通。provider 未設為 `anthropic` 或沒有 key 都直接走 `catalog`；已嘗試模型但失敗／沒有有效 presentation，則回 `catalog` + `degraded: true`。目前 API 不回傳模型錯誤細節、token 使用量或 request ID。

## HTTP 格式

```json
{
  "messages": [{"role": "user", "content": "補鈣"}],
  "area": "datong",
  "locale": "zh",
  "screen": {"productSlugs": []},
  "safetyContextConfirmed": true
}
```

`messages` 為 1–8 則 user／assistant 純文字，最後必須是 user；每則會清理並截到 600 字元。`area` 必須是目錄支援地區，`locale` 為 `zh` 或 `en`。可省略 `screen`；若提供，最多 5 個存在於伺服器目錄的 product slug。續問時帶前次回覆的 product slugs。

正式 UI 先完成過敏問答，答案保存在 tab 的 `sessionStorage`，API 只接受 gate 布林值。此布林值不是身份驗證或藥品適用性證明。合成測試使用 `true` 不等於對真人完成過敏評估。

固定目錄 dev server 啟動後，可手動檢查一個 JSON 回覆：

```sh
curl --fail-with-body --max-time 90 http://localhost:3100/api/agent \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"補鈣"}],"area":"datong","locale":"zh","screen":{"productSlugs":[]},"safetyContextConfirmed":true}'
```

加 `-H 'Accept: application/x-ndjson' -N` 檢查串流；curl 的 2xx 成功不會驗證 result 或 mode，完整驗證使用 smoke 腳本。

JSON 回覆為 `{kind, message, trace, products, pharmacies, mode, degraded?}`。`kind` 是 `products`／`pharmacies`／`safety`／`no_match`，`mode` 是 `catalog`／`claude`。卡片的商品來源與藥局資料由 server records 產生，並非即時庫存。

加上 `Accept: application/x-ndjson`，每行一個事件：

```jsonl
{"type":"progress","progress":{"stage":"checking","message":"正在確認安全範圍…"}}
{"type":"progress","progress":{"stage":"searching","message":"正在查詢目錄來源…"}}
{"type":"result","reply":{"kind":"no_match","message":"…","trace":[],"products":[],"pharmacies":[],"mode":"catalog"}}
```

progress 的 stage 為 checking／searching／presenting，數量依實際分支改變；成功最後只有一個 result。串流啟動後也可能回 `{"type":"error","error":"…"}`，即使 HTTP 是 200 仍算失敗。這是步驟事件串流，不是模型逐 token 輸出。

## 錯誤與配額

| HTTP／結果 | 意義與檢查 |
|---|---|
| 400 | JSON 格式無法解析 |
| 422 | JSON 根節點或 messages／area／locale／screen 不合法 |
| 428 | 缺少 `safetyContextConfirmed: true` |
| 429 | uYao 每 IP 每小時 20 次請求；查看 `Retry-After`，不要重試迴圈 |
| 503 | KV 節流不可用，Agent 暫停；Production 檢查 `KV_REST_API_URL`、`KV_REST_API_TOKEN` |
| catalog + degraded | 模型 timeout／錯誤／無有效工具結果；檢查本機設定及 Anthropic Console 的 key、model、餘額與 API limits |

節流發生在 body 驗證前，無效請求也計次。本機 file KV counter 沒有到期清理，不適合用來驗證一小時後重設；累積 429 時不要改 IP 繞過，應使用下方 memory-driver 測試驗證程式。上線應使用正式 KV。Anthropic 自身還有另一層 RPM、token 與 spend limits。

## 架構與驗證範圍

此實作參考 [Anthropic commerce-agents](https://github.com/anthropics/commerce-agents) 的 server-owned presentation、工具溯源與受限 loop，採自寫 TypeScript Messages API adapter；沒有直接使用其 Agent SDK、Managed Agents、MerchantBackend 或持久記憶。只有 search_catalog、present_products、present_pharmacies、present_no_match 四個只讀工具，沒有交易工具。

對照 [官方安全架構](https://github.com/anthropics/commerce-agents/blob/main/docs/safety.md)、[模型 ID](https://platform.claude.com/docs/en/models/overview)、[API limits](https://platform.claude.com/docs/en/api/rate-limits)。目前 eval 主要驗證固定目錄與 mock tool calls；真實 Claude smoke 不代表醫療適用性、完整多輪品質或 production 流量驗證。

不需要真實 key 的測試：

```sh
env -u ANTHROPIC_API_KEY -u UYAO_COMMERCE_AGENT_PROVIDER -u KV_REST_API_URL -u KV_REST_API_TOKEN npm test -- lib/commerce-agent.test.ts lib/commerce-agent-provider.test.ts lib/commerce-agent.eval.test.ts app/api/agent/route.test.ts
```
