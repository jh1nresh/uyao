# Spec：Landing 載入期 hanging 修復 + hero scroll transformation

> Status: implemented on branch 2026-08-20 · iOS Safari field check pending
> Created: 2026-08-20 · Evidence: CDP 實測（本 spec「量測基準」段）
> Primary surface: `web`（uyaohealth.com/zh-tw · `app/page.tsx` → `components/landing/AgentLandingExperience.tsx`）
> Related: `specs/company-landing-page.md`（頁面結構）· `specs/company-landing-page-yc-en-adjustment.md`（/en）
> Product truth: code wins over this spec

## 問題定義

使用者感受到的「hanging page」= 載入期主執行緒被塞死 13 秒，而 Lenis 把捲動
排在主執行緒上，主執行緒忙 = 滾輪完全沒反應。**不是動畫掉幀**：穩定後 10 秒
閒置 script 只佔 3.5%，runtime 期很輕。

## 量測基準（2026-08-20，CDP，4x CPU throttle，停快取）

| 指標 | 修復前實測 | 目標 |
|---|---|---|
| ScriptDuration | 13,479 ms | **< 2,500 ms** |
| TaskDuration | 28,218 ms | < 8,000 ms |
| LayoutDuration | 2,414 ms | 不惡化 |
| loadEventEnd | 6,613 ms | < 4,000 ms |
| avatar runtime blob | 5 個 · 206 KB | **1 個 · ~42 KB** |
| 閒置期 script 佔比 | 3.5% | 不惡化 |

**Baseline-first rule**：動工前先跑一次正式 Lighthouse（mobile preset）存進
`web/.tmp/perf/` 或 PR 描述。沒有 baseline 不准 merge。上表是 CDP
`Performance.getMetrics` + blob hook 數字，Lighthouse 分數另補。

### 確認的三個成因（已讀 code 驗證）

1. **avatar runtime 編譯 5 次。** `components/avatar-lab/avatar-runtime.ts` 的
   `loadAvatarRuntime` 用 `WeakMap<data物件, Promise>` 以 data identity 當 key。
   landing 掛 5 個相異 data（sprout/sapling/flame/pepper + `footerSproutData`），
   每個 blob 都內嵌同一份 38K 字元的 `ENGINE_SOURCE`+`BROWSER_RUNTIME_SOURCE`，
   重複編譯 5 次共 206 KB。`blob:` URL 不進 HTTP cache，回訪者每次重編。
2. **20 個 avatar 實例，13 個 `playing={false}` 的靜態實例也各自掛 runtime**
   （`AgentLandingExperience.tsx` 行 499、638、709、720、738 等）。靜態實例只
   需要一組算好的 SVG path，不需要程序化引擎。
3. **Lenis 攔截 wheel**（`syntheticWheelDefaultPrevented: true` 實測）。原生捲
   動走 compositor；Lenis 捲動走主執行緒 → 載入期 13 秒完全捲不動。另
   `globals.css` 對 coarse pointer 已開原生 `scroll-behavior: smooth`，兩套平滑
   捲動並存。

## Phase 1 — 拆 blob：engine 只編譯一次（最便宜、收益最大）

改 `loadAvatarRuntime`：

- engine（`ENGINE_SOURCE` + `BROWSER_RUNTIME_SOURCE`）單獨做成一個 blob，
  module-level 只編譯一次、cache 成單一 Promise。
- data 不再串進 source 字串；改成參數傳入：engine module export
  `createAvatarFactory(data)` 之類的工廠，`mountAvatar` 內的 `DATA` 引用改為
  closure 參數。
- `WeakMap` per-data cache 可保留，但 value 只包 factory 呼叫結果，不再包含
  engine 編譯。

驗收：blob hook 實測 `runtimeBlobs: 1`，總量 ~42 KB。5 隻 avatar 動畫行為不變
（`lib/avatar-ambient.test.ts`、`lib/footer-sprout.test.ts` 全過）。

## Phase 2 — 靜態 avatar 改 build-time SVG

13 個 `playing={false}` 實例不載 runtime：

- 加一個 build/test-time script（可放 `web/scripts/`）用現有 engine 對每組
  data × animation 第一步 expression 產出靜態 SVG markup，存成
  `components/avatar-lab/static/<name>.svg.tsx`（inline component）。
- 新增 `<StaticAvatar id size />`，`AgentLandingExperience` 內所有
  `playing={false}` 的 `<Avatar>` 換成它。
- reduced-motion 使用者的動畫實例也走靜態版（現有 `reducedMotion` 分支順手收斂）。

驗收：landing 首屏外 avatar 零 runtime 載入；視覺 diff 以現有靜態第一幀為準
（幾何一致，非像素級）。

## Phase 3 — 延後動畫 avatar 編譯

僅存的動畫實例（hero manager、agent rail 選中那隻、StoreOS Strobi）：

- runtime 載入改為 IntersectionObserver 進 viewport 後 + `requestIdleCallback`
  （fallback `setTimeout 200ms`），確保排在 LCP 之後。
- 載入前先渲染 Phase 2 的靜態 SVG 佔位，換入時不跳版（同一 host 節點 swap）。

驗收：cold load 時 avatar runtime 編譯不出現在 LCP 前的 long task；hero 靜態
第一幀立即可見。

## Phase 4 — Lenis 重評（gate：量完 Phase 1–3 再決定）

- 重跑量測基準表。若 ScriptDuration < 2,500 ms：Lenis 可留，但移除與
  `globals.css` coarse-pointer 原生 smooth 的重複。
- 若仍 > 2,500 ms 或滾輪仍有可感延遲：整個移除 Lenis（`lenis` dependency +
  init 代碼），捲動回 compositor。此為止血預設，不是失敗狀態。

## Phase 5（gated）— hero scroll transformation（reel 視覺增強）

**前置條件：Phase 1–4 全部驗收 + 新 baseline 記錄後才動工。**

- 效果：hero visual 隨捲動從 full-bleed 收成 contained card（`min(1120px,92vw)`），
  背景色往 warm off-white 移。
- 實作：純 CSS `animation-timeline: view()`（compositor、零 JS），
  `@supports not (animation-timeline: view())` fallback = 無動畫靜態版。
- **iOS Safari 支援先實測再排工**：藥局老闆主力瀏覽器。不支援時 fallback 即
  最終狀態，可接受才做。
- reel 其餘元素（heavy display + small mono 配對、三色上限）已由
  `editorial-display` + `.num` 滿足，不重做。

## Non-goals（明確不做，未來 agent 不要重提）

- 游標自走導覽動畫（reel #3）：baseline 髒的時候量不出影響；Phase 5 之後另開 spec。
- canvas / pinned scroll / 影格序列 / autoplay video hero。
- 字型瘦身（314 KB · 5 檔）：已知次要問題，另開 task，不混進本 spec。
- 換掉 avatar 視覺系統或改設計 tokens。
- `/en` 路由的獨立量測（本 spec 只驗 `/zh-tw`，/en 結構相同順帶受益）。

## 驗證

```bash
cd web && npx tsc --noEmit && npm test && npm run build
```

加上：

1. Lighthouse mobile before/after（同機器同 preset）。
2. CDP 複測：4x throttle + 停快取，重跑量測基準表全欄位。
3. blob hook 複測：`URL.createObjectURL` 計數 = 1。
4. 手動：cold load 立刻滾動滾輪，載入期捲動不得無反應。
5. `prefers-reduced-motion` 檢查：全部 avatar 靜態、無 runtime 載入。

跳過任何一項要在 PR 寫明原因，不得沉默跳過。

## 開放問題

- [x] Lighthouse baseline 已錄（mobile preset，local production build）。
- [ ] `animation-timeline: view()` iOS Safari 實測（Phase 5 前置）。
- [x] avatar-lab AGPL-3.0 授權邊界未改，`NOTICE.md` 已補 shared blob 與 static
      export 結構。

## 實作紀錄（2026-08-20）

同一台機器、local production build、mobile Lighthouse preset。baseline 為
`/zh-tw`；final 使用結構相同、共用同一個 `AgentLandingExperience` 的 `/en`，
因目前 local production middleware 對 `/zh-tw` 形成既有的 rewrite / canonical
redirect loop。未把該路由問題混入本次修復：

| 指標 | baseline | final |
|---|---:|---:|
| Lighthouse performance | 81 | 87 |
| LCP | 4,598 ms | 3,975 ms |
| TBT | 90 ms | 34 ms |
| CLS | 0 | 0 |

同一個 CDP script、4x CPU throttle、停快取、導航後等待 20 秒：

| 指標 | baseline | final |
|---|---:|---:|
| ScriptDuration | 4,697 ms | **2,317 ms** |
| TaskDuration | 7,235 ms | **3,750 ms** |
| LayoutDuration | 325 ms | **120 ms** |
| loadEventEnd | 621 ms | **323 ms** |
| avatar runtime blob | 5 個 · 211,222 bytes | **1 個 · 38,086 bytes** |

- 4x CPU cold load 在導航後 75 ms 送出 wheel，頁面到 `scrollY=700`，沒有 hanging。
- reduced-motion：19 個 avatar 全部為 static，runtime blob 為 0。
- Lenis 保留：final ScriptDuration 已低於 2,500 ms gate；現行 Lenis 只在
  `pointer: fine` 載入，coarse pointer 的 native smooth 是互斥 fallback。相同
  設定複測為 2,231 ms。
- Hero transformation 使用 `animation-timeline: view()`，只連動 transform / opacity；
  不支援或 reduced-motion 時直接顯示 1120px / 92vw contained final state。
- 真機 iOS Safari 尚未完成，因此不能把該瀏覽器的 scroll animation 支援列為已驗證。
