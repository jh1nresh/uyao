# Spec：uYao Company Landing — YC English Adjustment

> Status: implemented 2026-08-09（branch `claude/uyao-landing-impl-d893db`，同 PR #26）
> Created: 2026-08-09
> Primary surface: `web-landing`
> Mode: `adjustment`
> Baseline: `/Users/jhinresh/.hermes/cache/documents/doc_2c03e2bacacf_uYao Landing.html`
> Base direction: `specs/company-landing-page.md`
> Scope: 保留現有視覺與產品閉環，修正 AI Operating System 定位、英文 YC route、proof wording 與缺漏素材
> Product truth: live repo、測試與 pilot evidence 永遠優先於本文件

---

## 0. 決策摘要

目前 landing 的視覺方向與主要結構保留，不做全面 redesign。

這次只調整四件事：

1. 公司 category 從 `demand-connected inventory agent` 升級為 `AI operating system for independent pharmacies`。
2. 保留中文 `/` 給台灣藥局，建立獨立英文 `/en` 給 YC、投資人與國際合作方。
3. 把 Agent 從「告訴藥師下一步」改成「主動準備並推進營運工作，藥師批准關鍵決策」。
4. 修正可能過度宣稱的合作藥局、學習能力、deterministic rules 與 Consumer Web proof。

對外核心定位：

```text
uYao is the AI operating system for independent pharmacies.
```

完整產品解釋：

```text
uYao turns inventory, expiry, and local demand into return,
reorder, and reservation workflows, with pharmacists approving
critical decisions.
```

中文定位：

```text
uYao 是獨立藥局的 AI Operating System，主動處理庫存、
效期與附近需求，只把必要決策交給藥師批准。
```

---

## 1. Surface、audience 與成功條件

### Primary surface

```text
web-landing
```

### Primary audiences

| Route | 主要讀者 | 主要工作 |
|---|---|---|
| `/` | 台灣獨立藥局 | 理解試點價值並申請 |
| `/en` | YC reviewer、投資人、國際合作方 | 在 5 秒內理解 category、customer、mechanism、wedge 與 proof |
| `/find` | 台灣消費者 | 搜尋藥品、留下需求、預留／到店取貨 |

### 5-second test for `/en`

YC reviewer 不捲動頁面也應能回答：

1. What is it? — AI operating system.
2. For whom? — Independent pharmacies.
3. What does it operate? — Inventory, expiry, and local demand workflows.
4. What does the agent do? — Prepares and advances returns, reordering, and reservations.
5. Who retains authority? — Pharmacists approve critical decisions.

### Primary CTA by route

| Route | Primary CTA | Secondary CTA |
|---|---|---|
| `/` | `申請試點` | `附近找藥` |
| `/en` | `Join the pilot` | `See the consumer product` |

CTA intent 全頁保持一致，不混用 `Get started`、`Work with us`、`Apply now` 等同義按鈕。

---

## 2. 必須保留的現有設計

現有 HTML 已經成立的部分不得為了英文版重做：

- 白／近黑＋單一 uYao green。
- Sharp edge、receipt-like、operational label 視覺。
- Noto Sans TC／system sans 搭配 IBM Plex Mono data layer。
- Hero 右側的 `Supply → Action → Outcome` 產品閉環。
- LINE action card、pharmacist buttons、outcome receipt。
- `Prototype`、`Example`、`Pending`、`Verified` 狀態清楚標示。
- POS gap、return-window wedge、demand signal、evidence ladder。
- 不使用 AI purple、gradient blob、stock doctor、fake dashboard 或 logo wall。
- Motion 保持功能性，不用 scroll hijack 或無限動畫。

### Design read

```text
A trust-first vertical-AI company landing for independent pharmacies,
using operational evidence and pharmacy-label materiality rather than
generic healthcare or AI visual language.
```

### Frozen experience budget

```text
First-viewport recognition  35
Truth and trust             35
Operational proof          30
```

### Dials

```text
DESIGN_VARIANCE: 6
MOTION_INTENSITY: 3
VISUAL_DENSITY: 5
```

---

## 3. Locale architecture

### Routes

```text
/       中文 company landing
/en     English YC/company landing
/find   中文 Consumer Web
```

### Language switch

Navigation 加入單一低權重切換：

```text
中 / EN
```

規則：

- 不在同一頁中英並排。
- 不依 IP、瀏覽器語言或自動翻譯強制 redirect。
- `/en` 必須是穩定 canonical URL，YC application 直接使用。
- 語言切換保留相同 section anchor；無對應 anchor 時回到 route top。
- `/en` 不翻譯藥品或台灣法規內容到超出已驗證範圍。
- LINE 為產品介面名稱，保留品牌名，不翻成 generic messaging app。

### Navigation copy

中文：

```text
怎麼運作
目前進度
附近找藥
[申請試點]
中 / EN
```

English：

```text
How it works
Evidence
Consumer search
[Join the pilot]
中 / EN
```

Desktop nav 維持單行，總高度 64–72px。Mobile 顯示 logo、primary CTA、language switch；其餘收進 menu。

---

## 4. English hero — exact copy

### Eyebrow

英文版保留一個 category eyebrow，因為 YC 必須先辨認 category：

```text
AI OPERATING SYSTEM FOR INDEPENDENT PHARMACIES
```

中文 Hero 不必增加 eyebrow；中文市場可以先講結果。

### H1

```text
Turn every inventory signal into completed work.
```

Desktop 最多兩行；mobile 最多三行。

### Subtext

```text
uYao handles returns, reordering, and reservations from inventory,
expiry, and local demand—with pharmacists approving critical decisions.
```

實作時以單一 paragraph 呈現；Hero subtext 維持 20 個英文詞以內，不得再增加第二段功能描述。

### CTA

```text
[Join the pilot]  [See the consumer product]
```

### Status line

必須根據實作當日的真實狀態選一個版本，不可自行挑較強說法。

若只有招募入口，尚未有 active partner：

```text
We’re recruiting independent pharmacies to validate the first end-to-end workflow.
```

若已有藥局正式進入現場驗證，且有可核對紀錄：

```text
We’re validating the first end-to-end workflow with early pharmacy partners.
```

禁止在只有表單、名單或初步接觸時使用 `with early pharmacy partners`。

### Hero visual labels

```text
SUPPLY → ACTION → OUTCOME
PROTOTYPE · EXAMPLE DATA

SCAN EVENT
GTIN · LOT · EXP

LINE ACTION
Return window approaching
[Start return] [This batch will sell] [Incorrect data]

OUTCOME RECEIPT
Status: Pharmacist confirmed
Result: Awaiting verified outcome
```

不可把 `Awaiting verified outcome` 改成已省下金額，除非有真實 receipt。

---

## 5. 中文 Hero 調整

中文仍保留 outcome-first headline：

```text
少丟貨，少缺貨。
讓每一盒庫存跟附近需求連起來。
```

Subtext 改掉只有「提出建議」的被動語感：

```text
uYao 連接店內庫存、效期與附近需求，主動準備並推進退貨、補貨與預留工作，只把必要決策交給藥師批准。
```

這句不能解讀為目前所有外部供應商流程均已自動完成；頁面後續必須用狀態標示哪些是 prototype、pending 或 verified。

---

## 6. English page information architecture

英文版不是中文逐字翻譯。保留相同 visual system，但縮成六個主要 section。

### Section 1 — Hero

Job：辨認 category、customer、execution model 與 human authority。

使用第 4 節 exact copy 與完整 action-loop visual。

### Section 2 — Why POS is not enough

Headline：

```text
POS records transactions. uYao runs the next workflow.
```

Comparison：

| Existing systems see | uYao adds |
|---|---|
| Completed sales | Nearby demand lost to stockouts |
| Manually maintained expiry fields | Scanned batch and expiry evidence |
| Historical inventory reports | Return, reduce, reorder, and verify actions |

Boundary：

```text
uYao complements POS, reimbursement systems, and pharmacist judgment;
it does not replace them.
```

### Section 3 — The operating system loop

Headline：

```text
One operating loop from signal to outcome.
```

Flow：

```text
01  Observe supply
    Capture item, batch, expiry, and movement signals

02  Sense demand
    Capture failed searches, notifications, reservations, and pickups

03  Run the workflow
    Prepare and advance VERIFY / RETURN / REDUCE / REORDER / RESERVE actions

04  Preserve authority
    Pharmacists approve, reject, or correct critical decisions in LINE

05  Record outcomes
    Track returns, avoided waste, reduced overstock, or completed reservations
```

避免只寫 `the agent generates suggestions`；那會讓產品看起來像 BI assistant。

### Section 4 — Starting wedge

Headline：

```text
Start before inventory becomes waste.
```

Body：

```text
uYao starts with return windows: verify the batch and expiry,
check supplier rules, prepare the action, and track the result.
```

若 supplier rules 尚未接入，visual 必須標：

```text
Supplier return rule: confirmation required
```

### Section 5 — Product proof and evidence

Headline：

```text
Built around actions, not another dashboard.
```

只展示三個 proof moments：

1. 真實 scan／parser output。
2. 可操作的 LINE action card。
3. Outcome receipt，標記 pending 或 verified。

Consumer Web 若已有真實搜尋／miss／notification screenshot，加入為第四個 proof；若沒有，顯示：

```text
Consumer demand signal · prototype
```

不可用空白 placeholder 當成完成的產品證據。

Evidence headline：

```text
What exists today.
```

Evidence ladder 只放可由 repo、測試或 pilot record 支持的狀態：

```text
✓ Barcode parsing and offline event pipeline
✓ Consumer search and demand-capture prototype
○ First in-pharmacy DataMatrix field check
○ First installed Box
○ First pharmacist-approved action
○ First verified economic outcome
○ First paying pharmacy
```

`Early pharmacy partner` 只能在有正式 partner record 時新增。

### Section 6 — Pilot CTA

Headline：

```text
Start with one pharmacy and one return workflow.
```

Body：

```text
We’re looking for independent pharmacies to validate scanning,
return windows, and pharmacist-approved LINE actions—without replacing the POS.
```

CTA：

```text
[Join the pilot]
```

Form 可維持中文藥局名稱與所在地輸入，但 labels 使用英文；聯絡方式允許 LINE ID、phone 或 email。

---

## 7. AI Operating System wording rules

### 可以說

- `AI operating system for independent pharmacies`
- `turns operational signals into workflows`
- `prepares and advances actions`
- `pharmacist-approved`
- `starts with deterministic safety and business rules`
- `prototype`、`example`、`pending`、`verified`

### 需要證據後才能說

- `automatically completes supplier returns`
- `learns from every pharmacist response`
- `optimizes reorder quantities`
- `has saved pharmacies $X`
- `runs across partner pharmacies`
- `real-time inventory`

### 禁止說

- `AI pharmacist`
- `personalized medical advice`
- `diagnoses`、`prescribes` 或 `recommends medicine to patients`
- `replaces the pharmacist`
- `fully autonomous pharmacy`
- `guaranteed availability`

### Deterministic rule 的表達

目前 baseline 的：

```text
Action agent: 依 deterministic 規則產生建議
```

改為：

```text
Starts with deterministic rules, then prepares the next action
for pharmacist approval using available operational context.
```

中文：

```text
從可驗證規則開始，結合現有營運 context 準備下一步行動，交由藥師批准。
```

這不宣稱模型已持續學習，也不把產品降格為靜態 rule engine。

---

## 8. Metadata

### 中文 `/`

Title：

```text
uYao — 獨立藥局的 AI Operating System
```

Description：

```text
uYao 主動處理獨立藥局的庫存、效期與附近需求，只把必要決策交給藥師批准。
```

### English `/en`

Title：

```text
uYao — The AI Operating System for Independent Pharmacies
```

Description：

```text
uYao turns inventory, expiry, and local demand into pharmacist-approved return, reorder, and reservation workflows.
```

### Open Graph

- `/` 與 `/en` 各有 locale-specific title、description 與 image alt。
- OG image 可共用 composition，但文字必須分語言輸出，不能把中英文疊在同一張圖。
- English canonical 指向 `/en`；中文 canonical 指向 `/`。
- 加入 `hreflang="zh-TW"`、`hreflang="en"` 與合理的 `x-default`。
- 不在 metadata 宣稱即時庫存、已部署藥局或已驗證 ROI。

---

## 9. Responsive adjustment

### Desktop ≥ 1024px

- Hero 保留 split composition；左 copy，右 action-loop visual。
- 英文 H1 約 56–64px，最多兩行。
- Category eyebrow 與 nav 不能讓 CTA 掉出 initial viewport。
- `中 / EN` 不得造成 nav 換行。

### Mobile < 768px

- 顯示順序：category → H1 → subtext → CTA → action visual。
- H1 36–44px，最多三行。
- Primary CTA full-width，secondary 為文字 link。
- Hero action card 保持可讀，不縮成裝飾縮圖。
- 語言切換留在 header；不把完整 nav 全部展開於首屏。

---

## 10. Required asset replacements

上線 `/en` 前：

1. 替換 Consumer Web 缺漏區的真實搜尋／miss／notification screenshot，或清楚標 `prototype`。
2. 確認 LINE card 是可運作 prototype screenshot 或真實 component，不是不存在的 dashboard mockup。
3. Hero 的 scan event 必須使用 parser 真實支援的欄位格式。
4. Outcome receipt 在沒有實際金額時顯示 `Awaiting verified outcome`。
5. 不增加虛構藥局、客戶 logo、testimonial 或 founder quote。

---

## 11. Implementation scope

本文件只授權後續實作者做以下內容，不授權 deploy：

```text
新增 /en route
抽出 locale-aware landing copy
保留既有 landing component hierarchy
更新中文 passive wording
更新 metadata / canonical / hreflang / OG copy
修正 partner status truth
替換或標記 Consumer Web placeholder
驗證 desktop / mobile / accessibility / build
```

不得在此 adjustment 中：

- 重做 logo 或 palette。
- 改 Consumer Web data model。
- 新增 Agent、Box、supplier integration 或 payment 功能。
- 為了英文版重新設計整套頁面。
- 自動部署或提交 YC application。

---

## 12. Acceptance criteria

### Positioning

- [ ] `/en` 首屏原文出現 `AI operating system for independent pharmacies`。
- [ ] 5 秒內可理解 Agent 在處理工作，不只是提供建議。
- [ ] pharmacist approval 被呈現為 authority boundary，而非產品摩擦。
- [ ] current wedge 是 return windows，但不把公司縮小成 expiry reminder。

### Language

- [ ] `/` 與 `/en` 分開，沒有中英並排。
- [ ] YC application 可直接使用穩定 `/en` URL。
- [ ] 中／EN 切換在 desktop 與 mobile 都可到達。
- [ ] 英文文案是 YC adaptation，不是中文逐段機械翻譯。

### Truth

- [ ] `partner`、`pilot`、`installed`、`approved action`、`verified outcome`、`paying` 各自分開。
- [ ] 沒有證據時使用 recruiting 版本 status line。
- [ ] 沒有宣稱模型會學習、全自動完成退貨或產生醫療建議。
- [ ] 所有 demo data、prototype UI 與 pending outcome 均有標示。

### Design

- [ ] 保留現有單一 green、藥籤／receipt visual grammar 與 sharp radius。
- [ ] Hero CTA 在 1440×900、834×1112、390×844、375×812 初始 viewport 可見。
- [ ] English H1 desktop 不超過兩行，mobile 不超過三行。
- [ ] Desktop nav 單行；mobile 無水平 overflow。
- [ ] LINE action card 在 mobile 仍可閱讀。

### Engineering verification

- [ ] `npm run typecheck` passes。
- [ ] `npm test` passes。
- [ ] `npm run build` passes。
- [ ] `/`、`/en`、`/find` 與既有 drug/store routes 可開啟。
- [ ] Keyboard focus、form states、WCAG AA contrast 驗證完成。
- [ ] Metadata、canonical、hreflang、OG locale 驗證完成。
- [ ] 未經使用者明確批准不 deploy。

---

## 13. Residual risks and decisions before implementation

1. **Partner truth**：實作當日是否已有可公開稱為 active pilot partner 的藥局？若無，固定使用 recruiting 文案。
2. **Consumer proof**：是否已有真實搜尋落空／通知 screenshot？若無，降級為 prototype，不製造假畫面。
3. **Agent execution boundary**：目前哪些工作只準備 action，哪些已能推進外部流程？文案必須逐項對齊。
4. **English form destination**：英文訪客填表後由誰接收？若尚未設定，保留相同內部 lead endpoint，不新增外部 SaaS。
5. **Route state**：若目前公司 landing 尚未進入 repo，先實作中文 base，再抽 copy 建 `/en`；不得維護兩套分叉 component tree。

---

## 14. Implementation handoff

實作者開始前必須回傳：

```text
Target repo and branch
Current company-landing source path
Confirmed public proof state
Selected status-line version
Consumer screenshot availability
Shared component/copy architecture
Build and browser verification commands
No-deploy boundary
```

完成後必須回傳：

```text
Files changed
Desktop/mobile screenshots
Copy truth audit
Typecheck/test/build output
Metadata/hreflang verification
Skipped checks and residual risk
```

本 spec 本身不授權改 production、部署、發布、聯絡藥局或提交 YC application。
