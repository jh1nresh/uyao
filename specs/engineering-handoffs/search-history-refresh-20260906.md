Protocol: codex-grokbot-v1
Task-ID: uyao-search-history-refresh-20260906
Execution: ready
Mode: engineering
Packet-Revision: v1
Target-Repo: jh1nresh/uyao
Implementation-Base-SHA: 3cb7009c13adcf531732ba624c137244d05fbcb4
Executor: Tim
Return-Target: this planning PR

# Keep refreshed search results in the current conversation turn

Outcome: When the latest search query is unchanged but its result summary refreshes, update that latest turn instead of displaying the same question again in Earlier questions. This is a user-authorized small uYao improvement and the first real engineering trial of the GitHub handoff. Codex has investigated and fixed the requirements; Tim owns implementation through one CloudAgent, Judge checks delivery, and Codex reviews the actual engineering PR. Protocol: https://github.com/jh1nresh/.github/issues/1

## Scope and context

Allowed-Paths:
- web/lib/search-conversation.ts
- web/lib/search-conversation.test.ts

Out-of-Scope: UI redesign, search ranking, symptom/safety/allergy rules, storage keys or persistence scope, parsing/truncation rules, new dependencies, other repos, credentials, merge/deploy/publish, branch deletion, editing this planning branch. This request grants no merge authority. Ordinary code-PR verification must return evidence only, not a merge request.

Must-Read: root AGENTS.md, web/AGENTS.md, both allowed files, web/components/SearchConversationHistory.tsx, web/app/(consumer)/search/page.tsx (SearchConversationHistory call and currentSummary), web/lib/reservation-intake.ts (query length constant only), web/package.json, web/vitest.config.ts. Follow applicable repo instructions; do not install missing local Codex-only skills into the cloud. This pure TypeScript helper uses no Next APIs; installed Next docs are only relevant if needed, and Next source is outside scope.

Repo is public. No secrets or private brain contents are supplied or needed. Canonical Codex checkout was clean at inspection; work in the CloudAgent's isolated checkout. One implementation owner; no subordinate implementation agents. Preserve configured model defaults.

## Evidence and decisions

On base 3cb7009, advanceShopSearchConversation compares both latest.query and latest.summary before appending. Codex executed the real TypeScript module (TypeScript transpilation in memory, no source edit): history [{query:"維他命 C",summary:"舊結果摘要"}] plus current {query:"維他命 C",summary:"更新的結果摘要"} produced two turns and the old question in previous. SearchConversationHistory runs this helper whenever query OR summary changes, so the duplicate is visible through its actual consumer. Existing two tests pass, but omit changed-summary refresh.

Decisions:
- Compare the cleaned current query with the immediately latest cleaned query, using existing exact/case-sensitive semantics.
- Same latest query: replace/update that latest turn with the cleaned current turn, even when summary changes; do not append.
- Different latest query: append normally. A → B → A is a real three-turn sequence and must remain so; do not globally dedupe.
- Keep MAX_TURNS=4, previous excluding current, validation/corrupt-history behavior, input immutability and trimming/truncation unchanged. No new abstraction or dependency is needed.

## Tasks and acceptance

1. In the existing test file, add a regression for same query + changed summary. Demonstrate it fails against the original implementation before the fix.
2. Make the smallest helper change implementing the decisions.
3. Verify changed summary replaces only the latest turn; earlier distinct turn(s) remain unchanged; identical reload is idempotent; A→B→A remains; four-turn cap and corrupt-history tests still pass. Include a trimmed-query equivalent case using the existing normalizer. Tests should assert externally visible previous/turns, not source strings.
4. Run focused tests, the web test suite and typecheck. Do not change production code to conceal unrelated baseline failures. Report any failed command completely enough to diagnose.
5. Commit only the two allowed paths on a separate implementation branch, push and open one engineering PR against main with title "fix: avoid duplicate search history on summary refresh". Reference this planning PR and Task-ID. No [RFD][EXECUTE] prefix on the implementation PR. Include what changed, tests, exact head and residual risks. Do not merge.

Verification (working directory: repository root; adapt only the actual checkout path):
- If web/node_modules is absent: npm ci --prefix web (do not change lockfile).
- npm test --prefix web -- lib/search-conversation.test.ts
- npm test --prefix web
- npm run typecheck --prefix web
- git diff --check
- GitHub web CI on exact implementation head; build evidence may be CI. No browser/simulator is needed: this changes only the bounded pure history state used by an unchanged UI.

Baseline: Codex ran the focused command on the base; 1 file / 2 tests passed. Full suite/typecheck baseline not yet run by Codex. Security receipt: low-risk local display-state correction; reviewed reachable helper+consumer, no new input source/network/permission/storage lifetime, medical logic unchanged. No security-sensitive parser/import changes. Distribution proof: internal collaboration trial and unmerged UX fix; public proof draft N/A until a shipped feature exists.

## Exact tool route for Tim

Judge: fetch live PR body/head, verify trusted write author and Target-Repo, matching Task-ID receipts, persist accepted on THIS planning PR and read back its URL BEFORE notifying Tim. Existing Elon GH read/write relay is allowed when bot gh is unauthenticated. Do not infer current packet from old receipts.

Tim: check this Task-ID in current task/CloudAgent records. Use exactly one existing Cursor CloudAgent:

```javascript
CallDynamicTool({
  namespace: "cursor",
  toolName: "CloudAgent",
  arguments: {
    action: "launch",
    repo: "https://github.com/jh1nresh/uyao",
    starting_ref: "3cb7009c13adcf531732ba624c137244d05fbcb4",
    prompt: "The full text of this packet, plus the actual source planning PR URL, source head SHA and accepted receipt URL. Use branch codex/search-history-refresh; implement only the two allowed paths, run the named checks and open the separate engineering PR.",
    title: "uYao search history refresh"
  }
})
```

Replace the descriptive prompt string with this full packet; do not launch with only a URL. Preserve actual tool/model defaults. Read actual returned Agent-ID; do not invent it. Record running receipt on the source PR with Agent-ID and source head. Tim's /workspace Linux gh is unauthenticated; use CloudAgent's existing Cursor SCM for clone/push/PR and the existing Elon relay for receipts. No credential changes.

Completion wakes Tim. Use at most a needed `CallDynamicTool({namespace:"cursor",toolName:"CloudAgent",arguments:{action:"get",agent_id:"actual returned id"}})` or `dump` to inspect evidence; do not routine-poll or launch a second agent. Review the relevant transcript sections, not only the last line.

Deliverable: one separate engineering PR plus a completed/blocked source-PR receipt containing Protocol, Task-ID, Packet-Revision, actual Source-Head-SHA, Actor/Status, Agent-ID, Implementation-PR, Implementation-Head-SHA, exact test results/CI URLs, skipped checks and residual risks. Judge posts a review PASS/FAIL on that engineering PR with the reviewed head, WITHOUT routing a merge request. Codex is the final reviewer for this trial. Stop-Conditions: inaccessible repo/base, existing active same-task agent or ambiguous ownership, missing accepted receipt, need to touch outside allowed files, unavailable verification, or new product/medical decisions. Report a concrete blocker; no silent fallback or duplicate implementation.
