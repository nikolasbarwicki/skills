---
name: ship-epic
description: Ship every reachable child issue in a GitHub epic autonomously. Use when the user wants to implement a whole parent/epic issue, e.g. "/ship-epic 28", "/ship-epic 28 30", or "implement the whole epic in #28".
---

# Ship Epic

You are the **orchestrator**. You never write code, read implementation files, or debug in the main thread — you resolve issue order, spawn subagents, gate on CI + review, merge, and record progress to GitHub. Staying thin is what lets this run unattended (AFK) for hours.

**Arguments**: `/ship-epic <parent-issue> [start-issue]` — parent epic issue number; optional child issue to start from (default: first in dependency order).

**Requires** these companion skills, invoked by name: `tdd`, `review`, `improve-codebase-architecture`. See the repo README for where to get them.

## Durability: state lives in GitHub, not in context

Your context **will** be compacted on a long run. Auto-compact preserves the system prompt, project memory files, and *this SKILL.md body* — but **not** `prompts.md` (a file read) and **not** large tool outputs. So:

- Keep subagent returns tiny (PR number + 3 lines). Never pull diffs, CI logs, or file contents into the main thread — that's what subagents are for. This keeps compaction rare.
- All resumable facts go to GitHub, never only to memory.
- **Recovery is a routine path, not an exception.** Whenever the `prompts.md` templates are not visibly in your context (e.g. just after a compaction or in a fresh session), run **Recovery** before acting.

### Recovery procedure

1. **Re-read** [prompts.md](prompts.md) (it does not survive compaction) and skim this file.
2. `gh issue view <parent> --comments` + `gh issue list` → re-derive run-start SHA, dependency order, approved test decisions, what's merged, and what's blocked. Copy the recovered seam or `NON-TDD` exception into the next implementer prompt.
3. **Reconcile real state** for the issue you think is "next": `gh pr list --search "Closes #<n>" --state all`. If an open PR already exists, resume from **CI gate** (step 3 of the loop), do *not* re-implement. Trust GitHub over your memory.

### What goes to GitHub

- **Run start** (only after test preflight approval): `git fetch && git rev-parse origin/main` → comment on the parent with the SHA, dependency order, and the approved test-decision table below. The SHA bounds the epilogue passes, and the table makes recovery independent of conversation context.

  | Issue | Mode | Public seam | Observed behavior | Exception reason |
  | --- | --- | --- | --- | --- |
  | #30 | TDD | `<interface>` | `<behavior>` | — |
  | #31 | NON-TDD | — | `<verification target>` | `<reason>` |
- **After every merge**: comment on parent: `✅ #<n> merged in PR #<pr> (<sha>).`
- **Failed attempt**: comment on the *child*: `Attempt N failed: <one line>.`
- **Blocked issue**: comment on the *child* + add the `blocked` label (see circuit breaker).

## Resolve the dependency order first

Child issues are **not** processed by issue number. Before the loop:

1. Discover children via the parent link (issues whose body `## Parent` references `<parent>`, or the parent's sub-issue/task list).
2. Parse each child's `## Blocked by` section → build the dependency graph → **topological sort**. Ties broken by issue number.
3. Print the resolved order (and any cycles — halt and report a cycle, it's a bug in the issues).

If `[start-issue]` is given, begin there but still respect dependency order for everything after.

## Approve test seams before mutation

After resolving the reachable child issues, run one human-in-the-loop preflight before posting the run-start comment, creating a branch, or changing code:

1. Read the parent spec and every reachable child ticket.
2. Propose a compact map for every ticket: the public interface under test and the behavior observed there. Reuse an approved testing strategy from the parent spec where one exists.
3. Present the complete map once and wait for one explicit user approval.

Every ticket must have either an approved seam or an explicit user-approved `NON-TDD` exception with a reason. One unresolved ticket stops the entire epic before mutation; never infer seam approval from ordinary acceptance criteria. After approval, persist one row per reachable ticket in the parent run-start table above.

## Per-issue loop

For each child in dependency order:

1. **Clean-state guard + sync**: ensure a clean tree on `main`. If a previous attempt left the working tree dirty or on a feature branch, discard its uncommitted changes, then `git checkout main && git pull`. The orchestrator must always start an issue from a clean `main`. (Single shared tree, serial — parallel worktree execution is a separate, more advanced mode.)
2. **Implement** (subagent): spawn a `general-purpose` subagent with the **implementer** prompt from [prompts.md](prompts.md), including that ticket's approved seam or `NON-TDD` exception. It branches from main, applies `tdd` **by name** at an approved seam using red → green vertical slices, or follows the approved exception without claiming TDD. It commits, pushes, opens a PR with `Closes #<n>`, and returns only the PR number + 3-line summary.
3. **Gate — CI and review run concurrently:**
   - **CI**: `gh pr checks <pr> --watch` bounded by a ~25-min timeout. Green → pass. Failing checks → **fix subagent**, re-watch. Stalled/queued past the timeout → treat as blocked (circuit breaker). If the repo enforces branch protection, a "merge blocked by required review" state is *not* fixable by a subagent → flag needs-human.
   - **Review**: spawn a **review subagent** (`review` skill by name, fixed point = `main`). Independent eyes — the implementer does **not** review its own work. Blocking findings → route to the **fix subagent** (same machinery as CI-red).
4. **Merge** (only when CI green *and* review clean): `gh pr merge <pr> --squash --delete-branch`, then `git checkout main && git pull`.
5. **Record**: merge comment on the parent (format above).
6. Next issue → step 1.

### Circuit breaker — skip, don't loop forever

An issue is done when its PR is merged. On failure (subagent error, CI stays red, review blocks):

- Each retry is a **fresh subagent** with a short summary of what the prior attempt tried and why it failed — never the transcript.
- After **2 failed attempts**, spawn a **re-planner** (prompt in `prompts.md`) for a different approach, then try once more.
- After **`max-attempts` (default 3, incl. the re-plan attempt)**, **stop**: post a `🚧 blocked: <reason>` comment on the child, add the `blocked` label, note it on the parent, and **move to the next issue**. Do not halt the whole run.
- **Auto-skip dependents**: when an issue is blocked/skipped, any issue that `## Blocked by` it is also skipped with `skipped: depends on blocked #<n>` — don't waste attempts on work that can't pass.

## Epilogue — after the last *reachable* issue is merged

Read the run-start SHA from the parent. Each step runs as a subagent → PR → CI green → review clean → merge → pull main:

1. **Architecture pass**: `improve-codebase-architecture` skill (by name) over `git diff <run-start-sha>..origin/main`. Implement important suggestions; skip nice-to-haves.
2. **Review pass**: `review` skill (by name) over the same range. Implement important findings.
3. **Structure pass**: reorganize into clean vertical slices per the repo's structure convention (e.g. a structure ADR, if the project has one). Pure moves + import updates, no behavior change; CI is the safety net.
4. **Close out**: `gh issue close <parent> --comment "…"` summarizing issues shipped, PRs merged, and — explicitly — **blocked/skipped issues that need a human** and follow-ups deliberately skipped.

## Hard gates (non-negotiable)

- Never merge with red CI or unresolved blocking review findings.
- Never push to `main` directly; never start an issue from a dirty tree.
- Never close the parent while a non-blocked child is still open.
- Reference skills **by name** (`tdd`, `review`, `improve-codebase-architecture`) so project overrides win — never by hardcoded path.
- Default models/effort: **Opus, medium effort** for all roles (tune per run as needed). The orchestrator's own model = the session model (launch on a capable model; it stays thin).
