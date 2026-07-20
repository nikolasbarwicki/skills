---
name: ship-epic
description: Ship every reachable child issue in a GitHub epic through tested, reviewed pull requests.
disable-model-invocation: true
---

# Ship Epic

Act as the **orchestrator**. Keep the root thread thin: resolve order, delegate bounded work, gate CI and review, merge, and persist state. Leave implementation, diagnosis, and large outputs to workers.

**Arguments**: `<parent-issue> [start-issue] [--parallel [N]]` — a parent epic issue number, an optional reachable child to start from, and an optional bounded-parallelism knob. Serial execution is the default; `--parallel` opts in with `N` defaulting to 2 and capped at 3.

**Requires** model-invocable companion skills named `tdd` and `code-review`.

Use one capability-based workflow in every harness. Compatibility setup lives in [references/codex.md](references/codex.md) and [references/claude-code.md](references/claude-code.md); those guides do not change the runtime flow.

## Capability preflight — before mutation

Complete every check before recording run-start state or changing implementation code:

1. Confirm `tdd` and `code-review` exist and are model-invocable. A user-only companion is unavailable.
2. Confirm the root can delegate a bounded worker and has capacity for the two direct review workers that `code-review` creates. Review always runs at root.
3. Confirm the active permission posture allows unattended workspace edits, git writes, and GitHub network operations. Any operation that would wait for human approval fails preflight.
4. Confirm `git` and `gh` exist; the GitHub remote, authentication, repository access, and push/PR permissions are usable.
5. Obtain confirmation of an exclusive checkout for this run. Require `git status --porcelain` to be empty, including untracked files; preserve every pre-existing change and stop when it is dirty. Record whether it starts attached or detached.
6. Discover the default branch from GitHub and fetch `origin`. Require an attached start to use that branch and a detached start to derive from it, then run [scripts/clean-main](scripts/clean-main) to synchronize to current `origin/<default-branch>` while preserving the starting style.
7. Read the applicable repository instructions and identify the baseline test, typecheck, and lint commands. Run the strongest baseline verification available, restore only outputs created by that verification, and require the checkout to be clean again.
8. Resolve every reachable child and obtain one explicit approval for the complete test-decision map in **Approve test seams**.
9. With `--parallel`, additionally confirm capacity for `N` concurrent bounded implementers alongside the two direct review workers, identify the project's one-time dependency install command (or record that none is needed), and confirm disk headroom for `N` extra checkouts with installed dependencies.

Use observational checks only. Create no sentinel workers, temporary branches, commits, remote refs, pull requests, or other persistent probe artifacts. Print a compact capability report with one row per check. Start only when every row is `PASS`; otherwise stop before implementation.

After preflight, the checkout is leased exclusively to this run. Unexpected permission or capability failures enter the circuit breaker; no worker waits indefinitely for a human. Cleanup may reset only changes made after run-start on a recorded run-created attempt branch.

## Durable state

Context may compact or the run may resume in a fresh session. Persist every resumable fact on GitHub and keep worker returns to a PR number plus at most three lines.

### Recovery

1. Re-open this skill and [prompts.md](prompts.md).
2. Read the parent and child issue comments to recover the run-start SHA, default branch, starting checkout style, dependency order, approved test decisions, merges, and blockers.
3. Reconcile the next child against GitHub: search all PRs whose body closes it. For an open PR, read its current head SHA and latest `ship-epic review gate` comment, then resume at **Gate**.
4. In parallel mode, run [scripts/worktree-lease](scripts/worktree-lease) `list` and reconcile every run-owned worktree against its child's PR state. Remove worktrees for merged or blocked children; keep the rest and resume scheduling.
5. Trust recorded GitHub state over conversation memory. Repeat capability preflight only for capabilities whose state may have changed; never repeat test-seam approval already persisted on the parent.

### What goes to the parent

- **Run start**: record the current `origin/<default-branch>` SHA, default branch, attached/detached starting style, dependency order, the execution mode (`serial` or `parallel N`), and approved test-decision table.

  | Issue | Mode | Public seam | Observed behavior | Exception reason |
  | --- | --- | --- | --- | --- |
  | #30 | TDD | `<interface>` | `<behavior>` | — |
  | #31 | NON-TDD | — | `<verification target>` | `<reason>` |
- **Child merge**: `✅ #<n> merged in PR #<pr> (<sha>).`
- **Epic review-fixer merge**: `✅ Epic review fixes merged in PR #<pr> (<sha>).`

Record failed attempts and blockers on the child issue. The two merge-comment forms are the exact related-PR set for the optional architecture follow-up.

## Resolve dependency order

Run [scripts/resolve-order](scripts/resolve-order) with the parent issue. It discovers children through native sub-issues/task lists or fallback `## Parent` references, parses native blocking edges or fallback `## Blocked by` sections, and emits the topological order with ties broken by issue number. It exits non-zero on a cycle and names every unresolvable child; stop and report them.

If `[start-issue]` is supplied, pass it as the script's second argument to start there while preserving dependency order for everything after it.

## Approve test seams

Before posting run-start state:

1. Read the parent spec and every reachable child.
2. Propose one row per child: public interface and observed behavior, reusing any parent testing strategy.
3. Wait for one explicit approval of the complete map.

Every child needs an approved seam or an explicit user-approved `NON-TDD` exception with a reason. Acceptance criteria alone never approve a seam.

## Serial child loop

For each child in dependency order:

1. **Sync the leased checkout**: run [scripts/clean-main](scripts/clean-main) with the recorded default branch and attached/detached style. It fetches `origin`, returns to the current `origin/<default-branch>`, and fails loudly instead of touching a dirty tree. On a failed run-created attempt branch, pass `--reset-attempt <branch>` so it discards only its recorded run-owned changes before syncing.
2. **Implement**: delegate one bounded worker with the **Implementer** template from [prompts.md](prompts.md), the default branch, and that child's approved test decision. It creates a feature branch from `origin/<default-branch>`, applies `tdd` by name at an approved seam using red → green vertical slices (or follows the approved exception), commits, pushes, and opens a PR with `Closes #<n>`.
3. **Gate — root owns CI and review**:
   - Resolve the current PR head SHA. Run bounded CI watching concurrently with root review when supported. Sequential CI then review is the fallback.
   - Green CI passes. Failing CI routes to a fresh fixer worker. CI stalled beyond the configured bound (default about 25 minutes) enters the circuit breaker.
   - Apply `code-review` **at root** with fixed point `origin/<default-branch>` and issue `#<n>` as the Spec source. The skill creates its own direct Standards and Spec workers; never wrap it in another worker.
   - Persist and classify the result under **Review gate policy**. Blocking findings route to a fresh fixer. Any new commit restarts CI and both review axes for the new head.
4. **Merge** only after green CI and a valid clean review: squash-merge and delete the remote branch, then run [scripts/clean-main](scripts/clean-main) to sync the leased checkout to the new `origin/<default-branch>` using its recorded style.
5. **Record** the child merge on the parent and continue.

### Review gate policy — SHA-bound

Keep Standards and Spec separate:

- **Blocking**: missing, partial, incorrect, or out-of-scope Spec behavior; violations of documented repository standards.
- **Advisory**: at most three Fowler smell judgments. Record them without blocking or automatically fixing them.

Post or update one PR comment using the **Review gate comment** in [prompts.md](prompts.md). A `CLEAN` verdict is valid only when its recorded head equals the PR's current head.

### Circuit breaker

- Retry failures with a fresh worker and a two- or three-line summary of the prior attempt.
- After two failed attempts, delegate the **Re-planner** template, then make one different final attempt.
- After `max-attempts` (default 3), comment `🚧 blocked: <reason>` on the child, add the `blocked` label, record it on the parent, and continue.
- Skip every dependent of a blocked child with `skipped: depends on blocked #<n>`.

## Parallel child mode — opt-in

With `--parallel [N]`, only implementation overlaps; gating and merging stay exactly as serial. Serial remains the default.

### Scheduling

- A child is **ready** when it is not blocked or skipped and every blocker is merged. Ready children are pairwise independent — no dependency path can connect two of them — so they may be implemented concurrently.
- Keep at most `N` implementers active. To start a child, run [scripts/worktree-lease](scripts/worktree-lease) `add`, which creates a run-owned worktree detached at the current `origin/<default-branch>` and runs the recorded dependency install command once inside it. Every worktree gets its own one-time install; shared or linked dependency directories are unsupported.
- Each implementer receives its worktree path and works only inside it. The leased primary checkout stays reserved for the orchestrator.

### Strictly serial merges

- Gate and merge in the recorded dependency order: the earliest unmerged child merges first, even when a later child's PR is already gated.
- After each merge, remove the merged child's worktree with `worktree-lease remove`, sync the primary checkout with [scripts/clean-main](scripts/clean-main), then rebase every other open PR branch onto the new `origin/<default-branch>` by delegating the **Parallel rebase** template inside that child's worktree.
- A rebased head is a new head: restart CI and both review axes under the SHA-bound review gate policy.

### Failure handling

- Rebase conflicts and failures count as attempts under the circuit breaker; retries get a fresh worker in the same worktree.
- When a child becomes blocked, remove its worktree with `worktree-lease remove --discard` and continue; its dependents are skipped as in serial mode.
- If parallel preflight or scheduling degrades — capacity, disk, or install failures — fall back to the serial loop for the remaining children and record the fallback on the parent.

## Epilogue

1. Apply `code-review` at root with fixed point `<run-start-sha>` and the parent as Spec context. Persist the two-axis verdict on the parent for the reviewed `origin/<default-branch>` SHA.
2. For blocking findings, delegate the **Epilogue review fixer**, gate and merge its PR through the normal policy, record it on the parent, and repeat the epic-wide review. Finish only with `CLEAN` for the current default-branch SHA.
3. Close the parent after the final review is clean. Wait for closure to succeed.
4. Derive the exact related-PR set from parent merge comments. Post the durable closeout summary and return it to the user, including shipped issues, related PRs, and blocked/skipped children.
   - With related PRs, offer explicit human invocation of `improve-codebase-architecture`, initially focused on their combined diffs and allowed to inspect surrounding modules. Create no artifact automatically.
   - With no related PRs, state that no architecture follow-up applies.

## Hard gates

- Merge only with green CI and a SHA-current clean review.
- Keep `code-review` at root and invoke companions only by name.
- Preserve pre-existing checkout changes and use only the discovered default branch.
- Close the parent only after every non-blocked reachable child is closed and the epic-wide review is clean.
