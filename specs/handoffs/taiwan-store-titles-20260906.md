Protocol: codex-grokbot-v1
Task-ID: jh1nresh/uyao:taiwan-store-titles-20260906
Execution: ready
Mode: engineering
Packet-Revision: v1
Target-Repo: jh1nresh/uyao
Implementation-Base-SHA: 632d5fdf4826e8a344f3a0f23cfb87e757d27ada
Executor: Tim
Return-Target: this planning PR

# Add district context to pharmacy search titles

Outcome: Make pharmacy search titles identify the actual pharmacy and its city/district before generic boilerplate, using only existing public store data.

Allowed-Paths:
- web/app/(consumer)/store/[slug]/page.tsx
- web/lib/store-seo.ts
- web/lib/store-seo.test.ts

Out-of-Scope: All other paths; Agent/chat/search-safety logic; inventory, price, medical advice or classification data changes; schema/robots/canonical expansion; mass district pages; CI/settings/dependencies; private GSC data publication; external account changes, posts and messages. Any task-specific narrower exclusion below also applies.

Must-Read:
- web/components/StoreView.tsx
- web/lib/data.ts
- web/lib/types.ts
- web/lib/i18n.ts
- web/lib/shop.ts
- web/lib/shop-index.ts
- web/lib/seo-server.ts
- web/lib/seo.ts

Evidence: generateMetadata currently emits <name>｜公開藥局資料（試營運）, while the page already shows the pharmacy name, district, address and optional phone. Chinese pharmacy URLs are indexable; English versions canonicalize to the Chinese URL. The main domain is canonical. All 16 store records exist at the base.

Parent GSC observation (2026-09-06; not a raw export): Taiwan / Web, reporting dates 2026-08-10 through 2026-09-04, 73 impressions, 2 clicks, 2.7% CTR, average position 17.9. Desktop 36 impressions/2 clicks; mobile 37/0. Visible query rows are sparse and do not account for property totals. Treat these numbers as a small pre-change observation, not causal proof or a complete query-page distribution. Average position is an aggregate, not proof that most impressions are on page two. Do not diagnose page speed from zero mobile clicks. The 9/5 changes are after this reporting cutoff.

Decisions: Chinese title example: 建利西藥房｜臺北市大同區地址與電話. Derive city/district from getArea(store.area).name using existing data, not manual duplicate maps or guessed address parsing. If phone is absent, use 地址與地圖 instead of promising a phone. Keep the layout-provided brand suffix once. Preserve store.name exactly. English may keep the current public-record title; no invented English names. Preserve description, JSON-LD, canonical, hreflang, noindex/admission and not-found behavior in this task. Do not alter source-data freshness for a title-only edit. A helper is optional only if it enables a meaningful metadata test.

## Tasks

1. Read the route and installed Next metadata documentation, then make the minimal title change.
2. Test actual generated metadata with mocked locale/headers, or a pure helper that the route really consumes. Cover a normal record, absent phone, long name, and English canonical/indexing preservation; avoid source-string-only tests.
3. Run focused gates and typecheck; inspect the returned HTML title for 建利西藥房 in a local or preview route. Ensure one brand suffix and no invented hours, live-stock or availability claims.
4. Open a separate engineering PR. Do not bundle store descriptions or mobile summary changes.

Verification: npm test --prefix web -- lib/store-seo.test.ts lib/shop-index.test.ts lib/seo.test.ts lib/store-page-boundary.test.ts; npm run typecheck --prefix web; git diff --check. Web build via local build or exact-head CI. If no new test file is needed, report equivalent actual-metadata test evidence and run existing gates. No layout change, so visual comparison N/A; inspect metadata output instead.

Acceptance: All current Chinese store titles carry accurate geography and available contact-information intent. Missing phone handled truthfully; no duplicate branding; canonical/admission/safety/English behavior preserved; changed titles visible in actual response HTML.

## Routing, authorization and concurrency

The founder requested these five Taiwan SEO optimizations as separate PRs and supplied the active Codex–Grokbot protocol: https://github.com/jh1nresh/.github/issues/1 and its profile read-back https://github.com/jh1nresh/.github/issues/1#issuecomment-5557929710. This packet authorizes its bounded implementation and separate engineering PR, not GSC/GBP submissions, external outreach, new paid tooling or deployments. It grants no additional merge authority: Elon must verify applicable recorded founder merge authority independently at the merge gate.

Use the active route: Codex plans; 森貝爾 transports this RFD to Elon only; Elon validates trusted author/live source head/full packet and Task-ID deduplication, writes and reads back Actor: Elon / Status: accepted, then closes this planning PR and queues one Tim implementation. Never merge this planning PR or delete its branch. Closing after acceptance is not engineering completion. At most TWO active implementation/repair/review tasks across the route; park extras. All five are independent at the pinned base; preserve sibling PR changes and report any same-line conflict. Do not duplicate workers or create new listeners, polling jobs, accounts or integrations.

Tim uses the existing Cursor CloudAgent route only after the accepted receipt. The prior live uYao #271 handoff used this binding; inspect the actual runtime schema before calling:

```javascript
CallDynamicTool({
  namespace: "cursor", toolName: "CloudAgent",
  arguments: {
    action: "launch", repo: "https://github.com/jh1nresh/uyao",
    starting_ref: "632d5fdf4826e8a344f3a0f23cfb87e757d27ada",
    prompt: FULL_PACKET_WITH_ACTUAL_SOURCE_PR_HEAD_AND_ACCEPTED_RECEIPT,
    title: TASK_TITLE
  }
})
```

FULL_PACKET_WITH_ACTUAL_SOURCE_PR_HEAD_AND_ACCEPTED_RECEIPT and TASK_TITLE above are adapter variables: Tim must replace them with this complete packet and live values; never send a placeholder or URL-only prompt. If that tool is unavailable, record blocked instead of inventing a route. Preserve configured model defaults; no extra implementation agents. Existing SCM/Elon relay may handle PRs/receipts without credential changes. Use completion events, not a new polling loop.

Worker shell tools: run the listed git/npm/Python/HTTP commands from the actual isolated repository root (not the user's /Users checkout); GitHub reads via gh pr view <actual PR> --repo jh1nresh/uyao --json headRefOid,body,comments,state and gh pr checks <actual PR> --repo jh1nresh/uyao. Install web dependencies only if absent using npm ci --prefix web with no lockfile edit. Read AGENTS.md and web/AGENTS.md if present, specs/aeo-v1.md, web/package.json and the task-specific Must-Read. For Next code, read installed docs in web/node_modules/next/dist/docs before editing. Missing local Codex skills do not authorize installing skills or widening scope.

Codex baseline on the pinned commit: npm test --prefix web -- lib/seo.test.ts lib/aeo.test.ts lib/shop-index.test.ts lib/sitemap.test.ts lib/partners.test.ts lib/store-page-boundary.test.ts PASSED (6 files, 113 tests). Full suite/typecheck/build were not run by Codex for these planning-only changes; implementation verification is still required. The main user checkout has unrelated uncommitted Agent/CLI work; do not touch, stash or reset it.

## Return and stop conditions

Deliverable: ONE separate engineering PR against main for this Task-ID, linked back to this source RFD. Do not copy this planning document into the engineering branch. Include exact implementation head, scoped diff, actual verification and skipped checks. 森貝爾 independently reviews that head and posts PASS/PASS-with-residual/FAIL. Elon owns authorized merge/closeout only after matching-head review, required CI green, current base eligibility and no blocking findings; any tip move invalidates the review. Never claim merge, deploy, index, citation or traffic outcomes without corresponding live evidence.

Return a receipt on this source PR: Protocol, Task-ID, Packet-Revision, Source-Head-SHA, Actor, Status, actual Agent-ID, Implementation-PR, Implementation-Head-SHA, Verification and residuals. No fabricated accepted receipt by Codex/Tim/Judge; acceptance belongs to Elon.

Stop-Conditions: inaccessible base/repo; unavailable accepted receipt/tool; ambiguous same-task ownership; need for changes outside Allowed-Paths; contradictory data or a new medical/privacy/authority decision; unavailable meaningful verification. Queue capacity delays are queued, not failure. Record the exact issue and needed decision without launching duplicate work. External GSC/GBP actions and real partner outreach remain pending owner steps, not implementation blockers for the preparation deliverables.
