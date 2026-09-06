Protocol: codex-grokbot-v1
Task-ID: jh1nresh/uyao:taiwan-indexing-measurement-20260906
Execution: ready
Mode: engineering
Packet-Revision: v1
Target-Repo: jh1nresh/uyao
Implementation-Base-SHA: 632d5fdf4826e8a344f3a0f23cfb87e757d27ada
Executor: Tim
Return-Target: this planning PR

# Verify Taiwan indexing and record a search measurement baseline

Outcome: Make the 2026-09-05 SEO changes measurable: deliver a dated public indexability inspection and a practical Taiwan GSC comparison runbook. This is the preparation/report portion of recommendation 1, not a claim of indexing or traffic improvement.

Allowed-Paths:
- docs/seo/taiwan-indexing-measurement-20260906.md

Out-of-Scope: All other paths; Agent/chat/search-safety logic; inventory, price, medical advice or classification data changes; schema/robots/canonical expansion; mass district pages; CI/settings/dependencies; private GSC data publication; external account changes, posts and messages. Any task-specific narrower exclusion below also applies.

Must-Read:
- web/app/sitemap.ts
- web/app/robots.ts
- web/lib/seo-server.ts
- web/lib/seo.ts
- web/lib/shop-index.ts
- web/lib/aeo.ts
- web/scripts/gsc-content-gap.py

Evidence: The live sitemap inspected in the parent task contains 94 URLs: 12 guide URLs, 50 item URLs, 2 category URLs and 16 pharmacy URLs (counts include locales where present). Being in a sitemap is not proof of Google indexing. The existing gsc-content-gap.py clusters aggregate query CSVs and must not be used to invent daily before/after or query-to-page joins. Some prose in specs/aeo-v1.md still calls store pages excluded; live shop-index.ts admits Chinese public-record store pages. Follow the current executable gate and flag that stale prose in the report; do not broaden into a spec rewrite.

Parent GSC observation (2026-09-06; not a raw export): Taiwan / Web, reporting dates 2026-08-10 through 2026-09-04, 73 impressions, 2 clicks, 2.7% CTR, average position 17.9. Desktop 36 impressions/2 clicks; mobile 37/0. Visible query rows are sparse and do not account for property totals. Treat these numbers as a small pre-change observation, not causal proof or a complete query-page distribution. Average position is an aggregate, not proof that most impressions are on page two. Do not diagnose page speed from zero mobile clicks. The 9/5 changes are after this reporting cutoff.

Decisions: No production code change, no new crawler, scheduler, analytics dependency, indexing API, or blanket lastmod bump. Reuse direct HTTP reads and the existing GSC UI/export process. Private GSC exports/screenshots stay out of this public PR. Use only the aggregate baseline below. Unknown indexing status must say unknown.

## Tasks

1. Inspect the canonical homepage, nearby-medicine guide, and 建利西藥房 / 美得心藥局 / 樂活健保藥局 public pages. Record retrieval UTC time, HTTP status and redirect chain, canonical, robots meta and X-Robots-Tag if present, sitemap membership and lastmod. Percent-encode Chinese URL paths correctly. No GSC login is needed for these public checks.
2. Document the exact read-only GSC workflow: property sc-domain:uyaohealth.com; country Taiwan; Web search; compare equal-length, completed reporting windows with the same filters. Use the observed reporting cutoff and a confirmed deployment/recrawl date; do not fabricate a post-change cohort before data arrives. Keep query, page, device and date exports separate unless GSC actually provides a joint dimension export.
3. Preserve the dated parent baseline below with its limitations. Recommend reading the current URL Inspection status of the five URLs. List a manual request-indexing step as pending operator action, not something this worker performs; do not use Google's Indexing API for these pages.
4. Specify the three decisions: non-brand Taiwan impressions, count of pages with impressions, and mobile CTR within comparable query/page and position ranges. If joint breakdown or sample size is insufficient, mark unmeasurable/observe rather than infer zero. Do not sum anonymized query rows into property totals or infer that average position means most impressions have that rank.
5. Open one documentation engineering PR with the report, checks actually run, and pending GSC-only evidence clearly identified.

Verification: Direct HTTP inspection of the five pages and sitemap; verify links in the Markdown; git diff --check. Read-only authenticated GSC evidence is optional only if already available in the worker; absence is an explicit pending item, not a reason to fabricate. No product build/browser gate for this docs-only change.

Acceptance: One reproducible dated report; all five public URLs accounted for; report distinguishes crawlable, sitemap-listed, indexed, recrawled and measured; no false causal claim; no production files or external submissions changed.

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
