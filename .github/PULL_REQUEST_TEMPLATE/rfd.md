<!-- Title: [RFD][EXECUTE] <one bounded outcome>. Complete the packet before setting Execution to ready. -->

Protocol: codex-grokbot-v1
Task-ID: REPLACE_WITH_STABLE_ID
Execution: discussion
Mode: engineering
Packet-Revision: v1
Target-Repo: REPLACE_WITH_OWNER_REPO
Implementation-Base-SHA: REPLACE_WITH_FULL_SHA
Executor: Tim
Return-Target: this planning PR

Protocol reference: https://github.com/jh1nresh/.github/issues/1

## Outcome

Describe the user-visible result and why it matters.

## Scope and decisions

- Allowed-Paths:
- Out-of-Scope:
- Must-Read: repository instructions, target, immediate callers and shared utilities.
- Decisions: include the non-obvious choices already resolved by Codex.

## Tasks and tools

- Tasks: dependency-ordered, bounded changes.
- Tools: actual tool names/arguments, commands and working directories.
- Environment: required runtime and available verification surface; never include secrets.

## Verification and acceptance

- Verification: exact commands, expected results and known baseline failures.
- Acceptance: normal behavior and relevant failure/boundary cases.
- Stop-Conditions: scope/contract conflict, unavailable verification, ambiguous ownership or duplicate task.
- Deliverable: a separate engineering PR with exact head SHA, checks and unresolved risks.

Judge dispatches only a complete, trusted ready packet and records acceptance on this PR. Tim checks existing task/agent state before launching once. Repeated pushes for the same Task-ID do not authorize a second agent. Discussion packets do not authorize execution. Handoff does not grant merge, deploy, publish or credential-change authority.
