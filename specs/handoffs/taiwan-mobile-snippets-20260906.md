Protocol: codex-grokbot-v1
Task-ID: jh1nresh/uyao:taiwan-mobile-snippets-20260906
Execution: ready
Mode: engineering
Packet-Revision: v1
Target-Repo: jh1nresh/uyao
Implementation-Base-SHA: 632d5fdf4826e8a344f3a0f23cfb87e757d27ada
Executor: Tim
Return-Target: this planning PR

# Make catalog search descriptions useful before truncation

Outcome: Put the actual product identity and available page information before repetitive boilerplate in product search descriptions; keep one truthful description for mobile and desktop.

Allowed-Paths:
- web/app/(consumer)/drug/[slug]/page.tsx
- web/lib/catalog-search-description.ts
- web/lib/catalog-search-description.test.ts

Out-of-Scope: All other paths; Agent/chat/search-safety logic; inventory, price, medical advice or classification data changes; schema/robots/canonical expansion; mass district pages; CI/settings/dependencies; private GSC data publication; external account changes, posts and messages. Any task-specific narrower exclusion below also applies.

Must-Read:
- web/components/ProductDetails.tsx
- web/components/StoreBuyBox.tsx
- web/lib/data.ts
- web/lib/pending.ts
- web/lib/i18n.ts
- web/lib/seo.ts
- web/lib/shop-index.ts
- web/lib/types.ts
- web/lib/catalog.test.ts

Evidence: Product descriptions repeat 合作藥局提供並收錄於 uYao 試營運目錄 before explaining page information. generateMetadata has partner-source/public-source/no-source branches; one English branch calls every public-source item non-drug regardless of classification. The small mobile GSC sample is 37 impressions/0 clicks, which does not prove a mobile technical defect or establish a CTR target. Homepage and nearby-guide metadata were just updated; leave them stable for measurement.

Parent GSC observation (2026-09-06; not a raw export): Taiwan / Web, reporting dates 2026-08-10 through 2026-09-04, 73 impressions, 2 clicks, 2.7% CTR, average position 17.9. Desktop 36 impressions/2 clicks; mobile 37/0. Visible query rows are sparse and do not account for property totals. Treat these numbers as a small pre-change observation, not causal proof or a complete query-page distribution. Average position is an aggregate, not proof that most impressions are on page two. Do not diagnose page speed from zero mobile clicks. The 9/5 changes are after this reporting cutoff.

Decisions: Edit product descriptions only; preserve current product titles and H1, canonical/hreflang/admission, public record source facts and UI. Prefer a short first sentence such as <exact name and known spec>：查看品項資料、來源與藥局聯絡方式, but mention contacts or ingredients only if the real page exposes them for that item. If no contact matches exist, say how to leave a finding request only if that UI is actually present. Follow with concise pharmacy-confirmation/no-live-stock boundary. Use existing labels and conditions; no guessed product categories, therapeutic claims, stock/price/24h promise or district inference from ?area=. English uses existing manufacturer-provided name only. No device-specific metadata, cloaking, or SEO text hidden from users. Metadata length is a practical editorial constraint, not a Google guarantee.

## Tasks

1. Trace each metadata branch against the corresponding actual product render. Construct a small helper if useful to share tested decisions. Retain known name/spec first; omit placeholders rather than advertise missing details.
2. Include sourced ingredients/contact intent only where real data and page content support it. Keep source attribution and the requirement to ask a pharmacy. Never infer 非藥品 solely from the existence of drug.source.
3. Test partner/public/no-source, pending classification, absent ingredients, missing nameEn, missing contacts, and long product labels in Chinese and English. No test should imply all catalog records are approved medicines or available at a pharmacy.
4. Inspect actual metadata and corresponding visible content for three representative product pages (sourced, partner, placeholder). Use the same returned content across mobile/desktop and maintain noindex for unadmitted records.
5. Open one separate engineering PR with before/after description examples and verification. Actual click improvement remains unmeasured until recrawl and sufficient GSC data.

Verification: npm test --prefix web -- lib/catalog-search-description.test.ts lib/catalog.test.ts lib/seo.test.ts lib/shop-index.test.ts lib/store-page-boundary.test.ts; npm run typecheck --prefix web; git diff --check; build through local build or exact-head CI. Inspect actual HTML description and visible product information on representative routes; no CSS/layout changes so visual redesign QA N/A.

Acceptance: Descriptions lead with accurate identity and useful present content; every promise supported by that product page; no invented classification or availability; missing-data/locale/canonical/indexing boundaries tested; no unsupported CTR claim.

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
