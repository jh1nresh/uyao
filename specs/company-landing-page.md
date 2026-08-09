# Spec：uYao 公司 Landing Page

> Status: implemented 2026-08-09（branch `claude/uyao-landing-impl-d893db`）
> Created: 2026-08-09 · Design: claude.ai/design `uYao Landing.dc.html`（project b3cc7815）
> Primary surface: `web-landing`
> Audience: 獨立藥局決策者、YC／投資人、產業合作方；secondary: 找藥消費者
> Supersedes positioning in: `specs/landing-page-prompt.md`
> Adjusted by: `specs/company-landing-page-yc-en-adjustment.md`（AI OS 定位 + /en，2026-08-09）
> Product truth: code and current pilot evidence win over this design spec

## 落地決策（founder review 四項）

1. **Route**：`/` 作公司 landing；消費者產品搬 `/find`（route group `(consumer)`，URL 不變其餘不動）。
2. **Hero headline**：`少丟貨，少缺貨。讓每一盒庫存跟附近需求連起來。`
3. **Primary proof**：return-window LINE action（hero 的 Supply → Action → Outcome 閉環）。
4. **Evidence state**：只公開 repo／測試層級；共同創辦人現場經驗仍標 ○（整理中）。Evidence date: 2026-08-09。

## 一句話定位

> uYao 是台灣獨立藥局的 demand-connected inventory agent。它從店內掃描與附近搜尋取得供需
> 訊號，在 LINE 提出退貨、減量、補貨與預留行動，由藥師批准，並記錄實際追回、避免或增加的
> 經濟結果。

## Route 分工

```text
/                  公司 landing：問題、閉環、證據與試點（app/page.tsx）
/find              消費者找藥產品入口（原首頁整頁搬移，搜尋/地區行為不變）
/drug /store /search /category  消費者下游路由，不動
/pharmacy          藥局試點詳情與表單（保留，logo 與「看消費端」連結改指 /find）
```

## 頁面結構（實作對照）

| Section | 內容 | 實作 |
|---|---|---|
| Nav | logo + 怎麼運作/#how · 目前進度/#progress · 附近找藥→/find · 申請試點/#pilot；mobile 只剩 logo+CTA | `app/page.tsx` |
| Hero | H1 + subtext + 雙 CTA + status line；visual = scan event → LINE return card → outcome receipt，一次性 3 段進場動畫（reduced-motion 直接靜態） | `components/landing/HeroLoop.tsx` |
| POS gap | comparison strip 3 rows；mobile 改 paired rows | `app/page.tsx` |
| 閉環 | 01–05 不對稱流程（03 Action agent 加重 + VERIFY/RETURN/REDUCE/REORDER/RESERVE chips） | `app/page.tsx` |
| Wedge | return-window timeline（退貨規則標「待確認供應商退貨規則」，不寫 30 天） | `app/page.tsx` |
| Demand | copy + Consumer Web 截圖 placeholder（誠實留白：`缺：Consumer Web 真實搜尋／落空通知截圖`） | `app/page.tsx` |
| LINE proof | RETURN REVIEW（規則待確認）+ REORDER REVIEW（示範資料）兩張卡 | `app/page.tsx` |
| Evidence | ✓/○ ladder 8 項 + evidence date | `app/page.tsx` |
| Pilot CTA | 深色 end-cap；表單 name*/area/contact* + 問題 chips（選填）→ POST /api/pilot（新增 problems 白名單欄位） | `components/landing/PilotCtaForm.tsx` |
| Footer | logo + 附近找藥/申請試點/聯絡方式 + 法規聲明 | `app/page.tsx` |

## Truth 禁區（沿用，逐字檢查過）

- 不宣稱即時庫存、已省金額、paying customers、AI 自動決定藥品安全。
- 所有示範資料標 `PROTOTYPE · 示範資料` 或 `規則待確認`。
- Evidence ✓ 只給 repo／測試支持的項目；未完成標 ○ 不隱藏。
- 不做 pricing table、虛構 testimonial、logo wall。
- uYao 不取代 POS／健保申報／藥師判斷；不做藥品網路販售。

## Design tokens

沿用 `web/tailwind.config.ts` 既有 tokens（ink/surface/line/green 系）；品牌 mark 用
`components/CrossMark.tsx`（v2 stroke u/y 合體字形，kit：`public/brand/uyao-mark-v2-x-safe.svg`，**不是**設計稿裡的舊綠十字）。深色 end-cap
用 `bg-ink`；僅深色區用到的 `#A9B5AA` `#3DD68C` `#F2B8B5` 與 amber 標籤 `#C9A227/#8A6A00`
以 arbitrary value 存在，不進 tokens。Radius 一律 sharp；motion 只有 hero 一次性進場
120–200ms。

## 驗證紀錄（2026-08-09）

- `tsc --noEmit` ✓ · `npm test` 51/51 ✓ · `npm run build` ✓（全路由照舊生成）
- 1280/834/390 無水平 overflow；834 hero CTA 在 initial viewport；390 H1 34px、LINE card 350px 可讀
- 表單：空值 inline error、送出 loading、成功 inline success；`.data/pilot.jsonl` 記錄含 problems
- `/` 不掛消費端試營運橫幅（`(consumer)/layout.tsx` 才掛）；全站 noindex 不變

## 完整原始 spec

定稿文案、benchmark 分析（Pointy/Afresh/Sierra）、responsive/motion/a11y 細則見
claude.ai/design 專案 `uploads/company-landing-page.md`（project b3cc7815-f6cd-4a4b-b6a5-89b851e85ca2）。
本檔是實作後的落地版；兩者衝突時以本檔與 code 為準。
