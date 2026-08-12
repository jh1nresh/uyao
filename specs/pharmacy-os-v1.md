# Spec：uYao Pharmacy OS v1

> Status: proposed · 2026-08-12
> Scope: 在不取代既有 POS、掃描器與藥師決策權的前提下，完成一條可持續運作、可稽核、可擴張的藥局工作閉環。
> Sequencing: phase 依證據 gate 推進，不是承諾日期。前一階段沒有通過，不擴建下一階段。
> Product truth: 現場證據與 production code 優先於本規格。

## 完整的定義

uYao OS v1 的完成標準不是 dashboard 頁數，而是至少一道真實工作流可以反覆完成：

```text
取得訊號
→ 建立有來源的 WorkItem
→ 藥師批准／拒絕／修正
→ 執行工作
→ 記錄 OutcomeReceipt
→ 用實際結果修正下一次判斷
```

第一個 production loop 必須在一間真實藥局運作；模擬掃碼、fixture 庫存與行銷頁面不算現場驗證。

## 系統邊界

| 系統 | 權威範圍 |
|---|---|
| 既有 POS | 交易、售出、付款、正式庫存與帳務紀錄 |
| 藥局既有掃描器 | 原本的掃描輸入，不要求藥局改操作 |
| PharmaBox connector | 被動側錄、解析、離線暫存與盡力上傳 |
| uYao OS | 供需訊號、規則、WorkItem、核准、執行狀態與 OutcomeReceipt |
| LINE | 藥師的通知與低摩擦批准／拒絕／修正介面 |
| uYao Control Plane | 裝置、綁定、失敗重試、稽核與客服；不是藥師每天使用的新後台 |

硬邊界：

- 掃描是 `Observation`，不是精確庫存數量。
- uYao 不取代 POS、健保申報或藥師判斷。
- agent 不自動批准高影響的退貨、補貨或藥品安全決策。
- 日常操作留在 LINE；複雜明細才開安全的單一任務頁。
- 不收集完成工作流所不需要的病患或處方資料。

## 目前基礎

Repo 已有以下 prototype 能力，可演進而非重寫：

- `src/pharmabox/`：GS1／EAN 解析、session 分類、SQLite spool、USB HID 轉發。
- `POST /api/box/ingest`：掃描事件接收與新鮮度訊號。
- `web/lib/reservations-store.ts`：預留狀態、逾時、取消、no-show 與取貨結果。
- `POST /api/line/webhook`：LINE 簽章驗證、藥局綁定與 postback。
- `POST /api/reservations`：預留建立與 LINE 路由。
- `/console`：內部唯讀事件流水。

目前缺口：

- 真實 tenant／角色權限與正式登入。
- 可查詢、可關聯的 durable event ledger。
- GTIN／健保碼／藥品／供應商規則的有來源 mapping。
- 跨 workflow 共用的 WorkItem 狀態機。
- 通用 Approval、Correction 與 OutcomeReceipt。
- 裝置健康、通知失敗、重試與卡住任務的營運告警。
- 真實藥局的退貨、補貨或取貨結果與金額證據。

## 高階架構

```text
既有掃描器／POS ─┐
消費者搜尋／預留 ├→ Event Ingest → Event Ledger → Pharmacy Memory
供應商規則／文件 ┘                                  │
                                                     ▼
                                              Rules + Agent
                                                     │
                                                     ▼
                                                  WorkItem
                                          ┌──────────┼──────────┐
                                          ▼          ▼          ▼
                                     LINE Action  Task Page  Control Plane
                                          └──────────┼──────────┘
                                                     ▼
                                               OutcomeReceipt
                                                     │
                                                     └→ Pharmacy Memory
```

## 核心資料模型

### Event 與 Memory

- `Pharmacy`：tenant、地址、時區、狀態。
- `User`／`Membership`：藥師、店長、uYao ops 與權限。
- `Device`：connector、店家綁定、最後上線、軟體版本。
- `ProductIdentifier`：GTIN、EAN、健保碼與人工確認的品項 mapping。
- `InventoryObservation`：何時、何店、何品項、哪個來源被觀察到。
- `LotObservation`：批號、效期與原始掃描來源。
- `DemandSignal`：query、地區、時間、catalog／inventory miss。
- `SupplierRule`：規則內容、適用範圍、來源文件、有效日期與人工核准狀態。

### Work 與 Outcome

- `WorkItem`：`return`、`reorder`、`reservation`、`data_correction` 等工作類型。
- `Decision`：批准、拒絕或修正；包含 actor、時間與理由。
- `Execution`：誰執行、開始／完成時間與失敗原因。
- `OutcomeReceipt`：實際數量、金額、完成結果與證據來源。
- `AuditEvent`：所有狀態變更的不可變流水。

### 採購與藥商履約

- `PurchaseProposal`：品項、數量、建議藥商、價格／總額上限、理由與輸入證據。
- `ApprovalSnapshot`：藥師實際批准的不可變版本；固定品項、數量、價格邊界、藥商、有效期限與替代品政策。
- `SupplierOrder`：agent 依已批准 snapshot 送出的訂單、channel、idempotency key 與 external order id。
- `SupplierAcknowledgement`：藥商接受、部分接受、拒絕、缺貨、交期、價差或替代品提案。
- `Shipment`：實際出貨數量、批次與預計到貨時間。
- `Invoice`：實際單價、總額與藥商憑證。
- `ReceivingReceipt`：藥局實際收到的品項、數量與進貨掃描證據。
- `OrderException`：超價、缺貨、部分出貨、替代品、逾時、取消或狀態不明；需要人工接手或重新批准。

每筆核心紀錄至少包含：

```text
pharmacy_id
source + provenance
observed_at / occurred_at
confidence
external_id / idempotency_key
actor
created_at
```

### WorkItem 狀態機

```text
detected
→ proposed
→ awaiting_approval
→ approved / rejected / corrected
→ in_progress
→ completed / failed / expired
```

終態不可被背景排程重新打開。任何狀態改變都要寫入 `AuditEvent`，完成工作必須附 `OutcomeReceipt` 或明確失敗原因。

## API 邊界

沿用現有 REST／Next.js 路徑，先收斂 contract，不導入 GraphQL 或額外服務：

```text
POST /api/box/ingest
  接收批次掃描事件；以 device + event id 做 idempotency。

POST /api/work-items/:id/decisions
  藥師批准、拒絕或修正。重複 LINE postback 必須安全。

POST /api/work-items/:id/outcomes
  寫入實際完成、失敗、數量與金額結果。

POST /api/supplier-orders
  只接受已批准且未過期的 ApprovalSnapshot；以 pharmacy + snapshot id 做 idempotency。

POST /api/supplier-orders/:id/acknowledgements
  記錄藥商接受、部分接受、拒絕、價差、交期或替代品提案。

POST /api/supplier-orders/:id/receipts
  寫入 shipment、invoice、receiving reconciliation 與最終 OutcomeReceipt。

GET /api/tasks/:token
  提供安全的單一任務明細，不暴露其他藥局資料。

GET /api/owner/summary
  週期摘要；第一版可由 LINE deep link 開啟，不要求日常登入。
```

## 介面原則

第一版只有三種操作面：

1. **LINE Action**：日常批准、拒絕、修正與逾時提醒。
2. **Single Task Page**：顯示單一工作所需的來源、規則、明細與歷史。
3. **uYao Control Plane**：給 uYao ops 處理裝置、綁定、重試、稽核與客服。

店長先收到 LINE 週報：待處理、已完成、結果金額與資料品質。只有現場反覆要求批次處理、搜尋歷史或交班時，才增加一頁式 Action Center：

- 待批准
- 處理中
- 已完成／結果

不先做 KPI 卡片牆、圖表首頁、聊天首頁、完整庫存編輯器或另一個 daily inbox。

## Phase 0：現場真相與安裝路徑

### 目的

確認資料是否真的存在、工作怎麼發生，以及誰有權做決定。這一階段不擴建 production OS。

### 範圍

- 一間真實獨立藥局。
- 抽樣 50 個藥盒的 DataMatrix／1D 覆蓋率。
- 記錄掃描器型號、1D／2D、進貨是否掃碼、退貨與調劑行為。
- 將藥局分入 `specs/hardware-options.md` 的四種安裝路徑之一。
- 選一家主要供應商，取得一條有來源的退貨規則與適用條件。
- 找出藥局的批准者、實際執行者與結果證據。

### 交付物

- 現場 workflow map。
- 50 盒覆蓋率與原始觀察紀錄。
- 確定的第一台硬體 BOM／安裝方式。
- 第一條 supplier rule 的來源與人工確認紀錄。
- 第一個 WorkItem 的真實資料需求。

### Exit gate

全部成立才進 Phase 1：

- [ ] 至少一種安裝路徑可行，且不破壞既有掃描／POS 操作。
- [ ] 知道哪些掃描能取得 GTIN、批號、效期，哪些不能。
- [ ] 有一位明確的 pharmacist authority owner。
- [ ] 有一道可在試點期間完成的真實工作流。
- [ ] 有可驗證的 outcome 來源，不只依賴口頭回報。

### Pivot rule

若 DataMatrix 或供應商規則不足以測試退貨窗口，不假裝資料完整；第一個 production loop 改用已可驗證的預留／取貨閉環，同時保留退貨資料缺口清單。

## Phase 1：OS Kernel

### 目的

建立所有 workflow 共用的可信核心，不再為 reservation、return、reorder 各寫一套狀態與紀錄。

### 範圍

- Pharmacy tenant、User／Membership 與角色權限。
- 真登入；移除 production `?key=` 作為正式權限模型的依賴。
- 可查詢的 relational store（初始以 Postgres 類型資料模型為目標）。
- append-only Event／Audit ledger。
- ProductIdentifier mapping 與人工修正 provenance。
- 通用 WorkItem、Decision、Execution、OutcomeReceipt。
- outbox／retry／dead-letter 狀態與 idempotency。
- 裝置 heartbeat、最後同步與通知失敗告警。
- LINE action 與安全 single-task deep link。

### Reliability requirements

- connector 斷網時保留本地事件；恢復後補傳。
- server 以 at-least-once delivery 設計，重送不產生重複 WorkItem。
- LINE 重複 postback 不重複批准或完成。
- 背景排程不改寫終態。
- tenant query 預設帶 `pharmacy_id`，避免跨店資料洩漏。
- raw event 不被後續正規化覆寫；修正以新紀錄表示。

### Exit gate

- [ ] 同一掃描事件重送三次，只產生一個 observation／WorkItem。
- [ ] LINE 批准、拒絕與修正都能追到 actor 和來源。
- [ ] 每個終態都有 OutcomeReceipt 或失敗原因。
- [ ] 裝置離線、LINE 推播失敗與卡住任務可被 uYao ops 看見。
- [ ] 權限測試證明 A 藥局不能讀取 B 藥局資料。
- [ ] 現有 parser、spool、預留與取貨測試仍全綠。

## Phase 2：第一道真實閉環

### Primary workflow

```text
批號／效期 observation
→ 對照已驗證的退貨窗口
→ 建立 return WorkItem
→ LINE 提出理由與建議
→ 藥師批准／拒絕／修正
→ 實際退貨
→ OutcomeReceipt 記錄數量、金額與差異原因
```

### 範圍

- 一間藥局。
- 一家供應商。
- 一小組人工確認過的品項與規則。
- 不追求全台藥品或所有供應商覆蓋。
- agent 先使用 deterministic rules；LLM 只做文件整理與人類可讀摘要。

### Exit gate

- [ ] 至少一筆真實 WorkItem 從 observation 走到終態。
- [ ] 藥師在 LINE 完成批准、拒絕或修正。
- [ ] OutcomeReceipt 有實際結果，不是預估數字。
- [ ] 建議依據可回溯到原始 scan 與 supplier rule。
- [ ] 現場不需要藥師每天登入另一個 dashboard。
- [ ] 完成一次失敗／逾時演練，系統能提示人工接手。

若 Phase 0 觸發 pivot，Phase 2 改驗證：真實搜尋 → 預留 → LINE 確認 → 到店取貨 → completed outcome；不得用 demo reservation 充當通過。

## Phase 3：擴張 Workflows，不擴張核心

### 目的

在同一套 Event、WorkItem、Decision、OutcomeReceipt 上增加工作類型，而不是建立新的產品孤島。

### 建議順序

1. `reservation`：附近需求 → 藥局確認 → 到店取貨。
2. `return`：效期／規則 → 核准 → 實際退貨結果。
3. `reorder`：需求與庫存校正 → 建議 → 藥師核准 → agent 向藥商送單 → 藥商確認 → 到貨／發票 reconciliation。
4. `demand_followup`：catalog／inventory miss → 到貨通知或採購調查。
5. `transfer`：多店環境下的調撥建議；沒有多店證據前不做。

### Phase 3.1：補貨 proposal

Agent 準備可被藥師判斷的完整 proposal：

- 品項、規格、建議數量與 supplier。
- 當前價格、單價／總額上限與條件來源。
- 最近需求、缺貨、銷售與 inventory reconciliation 證據。
- 不補貨的風險與過量的風險。
- proposal 有效期限。

LINE 只提供批准、拒絕、修正與查看明細。此階段不向藥商送單。

### Phase 3.2：批准後由 agent 向藥商下單

藥師批准的是固定 `ApprovalSnapshot`，例如：

```text
supplier: A
product: 綠油精 10ml
quantity: 12
unit_price_ceiling: NT$X
total_ceiling: NT$Y
valid_until: today 17:00
substitution: forbidden
```

agent 只能依 snapshot 送單，不得在執行時擴大數量、預算、品項或 supplier。第一個 connector
只做一間合作藥商的一種正式下單管道，優先順序為 API／EDI、藥商正式 portal、結構化 Email
或官方通訊管道；受控 browser automation 只能是沒有正式介面的後備方案，不是第一選擇。

下單 API timeout 或回應遺失時，訂單進入 `unknown`／manual reconciliation，不能盲目重送。
每次送單使用 idempotency key，防止 LINE 重複按鈕、webhook retry 或網路重試造成重複採購。

### Phase 3.3：藥商確認、例外與到貨對帳

`sent` 不等於訂單成立。系統必須接住：

- supplier received／accepted／partially accepted／rejected。
- 實際價格、接受數量、缺貨與交期。
- 替代品、取消、修改與狀態不明。
- shipment、invoice、receiving scan 與實收數量。

若實際價格、數量、品項、supplier 或替代政策超出 `ApprovalSnapshot`，必須建立
`OrderException` 並回 LINE 重新批准；agent 不得默認接受。真正的終點是：

```text
SupplierOrder
→ SupplierAcknowledgement
→ Shipment
→ ReceivingReceipt + Invoice
→ Reconciliation
→ OutcomeReceipt
```

### Phase 3.4：有邊界的 delegated ordering

只有累積人工批准、例外與 OutcomeReceipt 後，藥師才可選擇設定 bounded policy：

```text
allowed_products
preferred_supplier
quantity_range
unit_price_ceiling
per_order_limit
monthly_limit
max_price_increase
substitution_policy
effective_at / expires_at
```

agent 只有在所有條件內才能自動下單；任何一項超界、policy 過期、資料信心不足或 supplier
提出修改，都回 LINE 重新批准。Policy 必須可撤銷、有版本、記錄建立者，且每筆自動訂單仍產生
完整 Approval／Execution／Outcome audit trail。

### Reorder exit gate

- [ ] 一間真實藥局、一間真實 supplier、一種正式 ordering channel。
- [ ] 藥師批准的 snapshot 與實際送單內容 byte-for-byte／field-for-field 可比對。
- [ ] 同一 snapshot 重試不會產生 duplicate supplier order。
- [ ] 藥商 acknowledgement、部分接受、拒絕與 timeout 都有可觀察狀態。
- [ ] 超價、替代品與數量變更會重新請藥師批准。
- [ ] 收貨掃描、invoice 與 supplier order 可 reconciliation。
- [ ] 至少一筆真實 order 產生 completed OutcomeReceipt。

### 每增加一種 workflow 的 admission gate

- [ ] 有真實使用者與 authority owner。
- [ ] 有明確輸入來源與信心邊界。
- [ ] 有可執行 action，不只是 insight。
- [ ] 有可觀察終態與 OutcomeReceipt。
- [ ] 能沿用既有狀態機與稽核模型。
- [ ] 不要求藥師日常登入新 dashboard。

### POS integration ladder

```text
L0  scanner observation
L1  每日 CSV 匯入／校正
L2  POS read-only API
L3  有 10+ live pharmacies 與明確 write-back ownership 後，才評估雙向整合
```

## 非功能要求

### Security

- production 使用正式登入、短效 deep link、tenant authorization 與 secret rotation。
- LINE 訊息只帶完成決策所需的最少資料；敏感明細留在授權頁面。
- webhook 必須驗簽；log 不寫 API key、完整電話或非必要個資。
- 所有管理操作留下 actor 與 audit record。
- 採購執行只接受未過期的 ApprovalSnapshot；任何擴大金額、數量、品項或替代都需重新批准。
- Delegated ordering policy 必須有版本、上限、有效期限、撤銷路徑與完整 audit。

### Availability and recovery

- connector 至少可離線 spool；API 暫時失敗不丟事件。
- ingestion、LINE push、cron 與 outcome write 都有明確 retry／manual fallback。
- dead-letter 必須能由 ops 看見並重放，不能只寫 `console.error`。
- 備份與恢復要用測試證明，不以「供應商有備份」代替。
- Supplier order 使用 idempotency；timeout／unknown 不可盲目 retry，必須先查詢或人工 reconciliation。

### Observability

最少監控：

- device last seen／sync lag。
- ingest success／duplicate／dead-letter。
- LINE sent／failed／unbound。
- WorkItem 各狀態停留時間。
- approval latency、override rate、completion rate。
- 有 OutcomeReceipt 的 completed work 比例。
- supplier order sent／acknowledged／exception／reconciled 與 duplicate-prevented。

## v1 成功指標

北極星不是 dashboard DAU，而是 **有證據完成的工作**：

- completed WorkItems with OutcomeReceipt。
- LINE action 回覆率與中位核准時間。
- 藥師拒絕／修正率及原因。
- 真實完成退貨、補貨或取貨的數量與金額。
- 經藥師批准並由 agent 送單，最後完成收貨／發票 reconciliation 的採購單。
- 每間藥局需要的人工支援時間。
- silent event loss = 0。

試點門檻可先作為假設，必須用現場資料調整：

- 7 天連續運作。
- 至少 5 個真實 WorkItem。
- 至少 3 個 completed outcomes。
- 每個 outcome 可回溯到輸入、規則、批准者與結果。

## 明確不做

- 不先做完整 POS／ERP replacement。
- 不從掃描次數推導或宣稱精確庫存。
- 不先建全台藥品 catalog 或所有供應商規則庫。
- 不讓 LLM 自動做藥品安全或高影響核准。
- 不做無金額、數量、品項、supplier 與有效期限上限的 autonomous ordering。
- 不自動接受漲價、替代品、部分出貨或超出 ApprovalSnapshot 的修改。
- 不以 browser automation 作為第一個 supplier connector；沒有正式介面時才做受控 fallback。
- 不把內部 Console 包裝成藥師每天使用的新 dashboard。
- 不先做線上藥品交易、購物車、金流或配送。
- 不在沒有真實多店需求前做跨店調撥。

## 隨規模重看

以下不是 v1 前置條件，但達到證據門檻後要重新評估：

- 10+ live pharmacies：POS connector framework、批次匯入與 tenant ops automation。
- 3+ supplier rule sets：規則版本、衝突與有效日期管理。
- 每店 10+ 同時 open tasks：可選的 pharmacy Action Center。
- 多店 owner：跨店彙總、角色繼承與 transfer workflow。
- 高事件量：將 cron／KEYS 掃描改為 queue、索引查詢與獨立 worker。
- 同一 supplier 完成足夠人工批准與 reconciliation 後：評估可撤銷的 bounded ordering policy；不得直接跳到無限制 autonomy。
- 涉及更多個資或臨床資料前：另做資料保護與專業法規 review，不由本規格推定合規。
