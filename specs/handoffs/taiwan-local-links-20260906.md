Protocol: codex-grokbot-v1
Task-ID: jh1nresh/uyao:taiwan-local-links-20260906
Execution: ready
Mode: engineering
Packet-Revision: v1
Target-Repo: jh1nresh/uyao
Implementation-Base-SHA: 632d5fdf4826e8a344f3a0f23cfb87e757d27ada
Executor: Tim
Return-Target: this planning PR

# Link existing pharmacy records from home and the nearby guide

Outcome: Let people and crawlers reach the existing pharmacy records through clear district-grouped text links on the homepage and nearby-medicine guide.

Allowed-Paths:
- web/components/PharmacyDirectoryLinks.tsx
- web/lib/pharmacy-directory.test.ts
- web/app/(consumer)/app/page.tsx
- web/app/guides/find-medicine-nearby/page.tsx
- web/lib/aeo.ts
- web/lib/shop-index.ts

Out-of-Scope: All other paths; Agent/chat/search-safety logic; inventory, price, medical advice or classification data changes; schema/robots/canonical expansion; mass district pages; CI/settings/dependencies; private GSC data publication; external account changes, posts and messages. Any task-specific narrower exclusion below also applies.

Must-Read:
- web/components/SiteFooter.tsx
- web/components/landing/PartnerMarquee.tsx
- web/lib/data.ts
- web/lib/i18n.ts
- web/lib/shop.ts
- web/lib/types.ts
- web/lib/shop-index.test.ts
- web/lib/aeo.test.ts
- web/lib/shop-home-contract.test.ts

Evidence: Homepage PartnerMarquee currently renders pharmacy names as spans; nearby guide has a generic homepage CTA without individual pharmacy record links. Records and Chinese store sitemap entries already exist. Area selection is a query parameter, not a dedicated indexable area page.

Parent GSC observation (2026-09-06; not a raw export): Taiwan / Web, reporting dates 2026-08-10 through 2026-09-04, 73 impressions, 2 clicks, 2.7% CTR, average position 17.9. Desktop 36 impressions/2 clicks; mobile 37/0. Visible query rows are sparse and do not account for property totals. Treat these numbers as a small pre-change observation, not causal proof or a complete query-page distribution. Average position is an aggregate, not proof that most impressions are on page two. Do not diagnose page speed from zero mobile clicks. The 9/5 changes are after this reporting cutoff.

Decisions: Use one small server-rendered component with ordinary anchors/Next Links generated from allStores and existing area data. Group the 16 records by their actual area; label each link with pharmacy name and district. Use canonical /zh-tw/store/<slug> for both locales because only Chinese store records are admitted. Label English guidance clearly without fabricating translated pharmacy names. Place the homepage list below existing primary content and above the footer; preserve the cabinet header, hero/search and marquee. This static list is the accessible path; do not add focusable links to a moving duplicated marquee. No new district routes, filter URLs in sitemap, client JS, controls or expanded catalog data.

## Tasks

1. Implement the shared compact pharmacy link section in existing visual tokens with wrapping names and at least 44px touch targets. One visible link per actual record; heading describes currently listed pharmacies, not every pharmacy in the area. Explain public listing is not live stock or proof of partnership.
2. Add the component to the homepage and existing nearby guide in both locales. Keep original direct answer, FAQ and professional-confirmation boundaries. Do not change the homepage's search/Agent interactions.
3. Update only the affected guide dateModified and homepage copy freshness if visible copy changes, using the actual content-edit date. Preserve store snapshot date and unrelated dates. The allowed aeo.ts change is restricted to findMedicineNearby's dateModified; shop-index.ts to SHOP_HOME_COPY_UPDATED.
4. Test rendered anchor destinations/counts against allStores, proper escaping of Chinese slugs, no query parameters or duplicate hidden anchors, and both locales. Verify server HTML contains anchors without JavaScript.
5. Inspect desktop and mobile (390px, 1440px) in both locales for overflow/wrapping, keyboard focus and one destination navigation. Open one separate engineering PR with screenshots and commands.

Verification: npm test --prefix web -- lib/pharmacy-directory.test.ts lib/shop-index.test.ts lib/aeo.test.ts lib/sitemap.test.ts lib/shop-home-contract.test.ts; npm run typecheck --prefix web; git diff --check. Local preview: npm run dev --prefix web; routes /zh-tw, /en, /zh-tw/guides/find-medicine-nearby, /en/guides/find-medicine-nearby. Use the available isolated browser tool for 390px/1440px verification; record actual tool/runtime and close owned resources. Exact-head web CI/build required for engineering delivery.

Acceptance: Existing records reachable from both entry points via server-rendered canonical links; no new doorway pages; desktop/mobile and both locales readable; no hero/search regression; correct scope of freshness updates and tests.

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
