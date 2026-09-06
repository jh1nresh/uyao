Protocol: codex-grokbot-v1
Task-ID: jh1nresh/uyao:taiwan-partner-citations-20260906
Execution: ready
Mode: engineering
Packet-Revision: v1
Target-Repo: jh1nresh/uyao
Implementation-Base-SHA: 632d5fdf4826e8a344f3a0f23cfb87e757d27ada
Executor: Tim
Return-Target: this planning PR

# Prepare pharmacy-verified local citation materials

Outcome: Prepare a concrete local citation packet for the existing confirmed partner pharmacies, so the owner can verify business information and choose appropriate genuine external references. This is preparation for recommendation 5, not a claim that backlinks or Business Profiles have changed.

Allowed-Paths:
- docs/seo/partner-citation-kit-20260906.md

Out-of-Scope: All other paths; Agent/chat/search-safety logic; inventory, price, medical advice or classification data changes; schema/robots/canonical expansion; mass district pages; CI/settings/dependencies; private GSC data publication; external account changes, posts and messages. Any task-specific narrower exclusion below also applies.

Must-Read:
- web/lib/partners.ts
- web/lib/partner-stores.ts
- web/lib/stores.generated.json
- web/lib/types.ts
- web/lib/hours.ts
- web/lib/shop.ts
- web/components/StoreView.tsx
- web/app/(consumer)/store/[slug]/page.tsx

Evidence: PARTNER_PHARMACIES defines 16 explicitly confirmed partners. Store records carry mixed FDA/NHI/Google/manual provenance, address, optional phone, mapsUrl and hoursSource. Some Google URLs are search queries rather than verified place identities. Public listing and partnership do not prove live stock or permission to manage a pharmacy Google Business Profile.

Parent GSC observation (2026-09-06; not a raw export): Taiwan / Web, reporting dates 2026-08-10 through 2026-09-04, 73 impressions, 2 clicks, 2.7% CTR, average position 17.9. Desktop 36 impressions/2 clicks; mobile 37/0. Visible query rows are sparse and do not account for property totals. Treat these numbers as a small pre-change observation, not causal proof or a complete query-page distribution. Average position is an aggregate, not proof that most impressions are on page two. Do not diagnose page speed from zero mobile clicks. The 9/5 changes are after this reporting cutoff.

Decisions: Deliver a dated Markdown kit only; do not send messages, edit external websites/GBP, request reviews, buy placements or create listings. Read public Google guidance from https://support.google.com/business/answer/7091 and https://support.google.com/business/answer/3038177 before writing. Recommend the pharmacy official website for its primary website field; do not replace it with a third-party uYao directory URL. Suggest the uYao page as an optional factual reference where the pharmacy owner determines it is suitable. Do not claim a reciprocal link, affiliation with Google, review score or live-stock service. No personal owner/contact data beyond the business info already public on StoreView.

## Tasks

1. Produce a table for all and only confirmed PARTNER_PHARMACIES. Resolve each slug against store data, then include exact business name, district, address, existing public business phone or 缺資料／待店家確認, percent-encoded canonical uYao record URL, current map link, and an explicit 店家尚未核對 status.
2. Mark map links that are only Google search queries as needing identity verification; never treat these as verified GBP IDs. Mark hours according to hoursSource; NHI dispensing windows must not be copied into actual opening hours. Do not invent missing phones or hours.
3. Include a short Traditional Chinese factual link-text example per business (name + district + 地址與聯絡資訊, adjusted if data absent), with no promotional medical claims. Include a generic unsent owner-verification request template clearly labeled 草稿／未寄送, not written as already authorized or sent.
4. Give the operator a concise next-step checklist: pharmacy owner verifies name/address/phone/category/hours, checks its own GBP, chooses an appropriate owned-site reference, and records resulting public URL/date only after real action. Current rows remain pending.
5. Verify row identities and fields against the current base and spot-check canonical HTTP destinations; open one docs-only engineering PR with the evidence. Do not create automated outreach or any new external-account integration.

Verification: Compare table keys to PARTNER_PHARMACIES and store records; verify every canonical link format/unique slug and no /en store duplicates; inspect at least three canonical HTTP responses and record dates. Check missing-data and NHI-hour labeling against hours.ts. git diff --check. No product build required for docs only; any public check unable to run must be marked unverified.

Acceptance: All confirmed partner records have a usable truthful verification/link packet; missing and unverified fields explicit; no unlisted partnership assertions or personal owner names; no outbound contact, GBP write, review manipulation or claimed backlink completion.

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
