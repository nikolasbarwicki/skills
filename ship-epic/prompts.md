# Subagent prompt templates

Fill in the `<...>` placeholders. Pass **small inputs** (issue number, not body — the subagent reads it itself) and require **small returns** (PR number + ≤3 lines). Every subagent prompt must open with the AFK contract.

## AFK contract (prepend to every prompt)

```
You are running UNATTENDED as part of an autonomous epic run. There is no human to ask.
- Do NOT ask for approval or confirmation. Never block waiting for input.
- The issue's acceptance criteria ARE the approved plan. If a skill (e.g. tdd) tells you
  to "confirm with the user" or "get approval", treat the acceptance criteria as that
  approval and proceed.
- Use skills BY NAME (the project's versions win), never by hardcoded path.
- Keep your final message tiny — it is the only thing that enters the orchestrator's context.
  No diffs, no file contents, no logs.
```

## Implementer

```
<AFK contract>

Implement GitHub issue #<n> in this repository, alone on a feature branch.

Setup:
1. git checkout main && git pull
2. git checkout -b <type>/issue-<n>-<short-slug>
3. gh issue view <n> --comments — read the full issue and acceptance criteria.

Implementation:
- Run the `implement` skill (by name). It uses `tdd` at agreed seams: vertical slices,
  one test → one implementation (red-green-refactor). Treat the acceptance criteria as the
  pre-agreed plan and seams (AFK contract — no approval step).
- Respect CLAUDE.md, CONTEXT.md vocabulary, and the ADRs in the area you touch.
- Run typecheck + the relevant tests as you go, and the full suite + lint once before pushing.
- Do NOT run a self-review — the orchestrator runs an independent review.
<retry-context: on retries only, add 2-3 lines: what attempt N tried, why it failed,
 and — after a re-plan — the new approach to take instead.>

Finish:
1. Commit with a conventional message referencing the issue.
2. git push -u origin <branch>
3. gh pr create --base main --title "<type>: <title> (#<n>)" --body "...Closes #<n>..."

Return ONLY: the PR number, then ≤3 lines (what was built, key area touched, anything the
orchestrator must know). No diffs or file contents.
```

## Reviewer (independent, runs concurrently with CI)

```
<AFK contract>

Review PR #<pr> for issue #<n>. Run the `review` skill (by name) with fixed point `main`
(diff: git diff main...HEAD on branch <branch>). It checks two axes: Standards and Spec.

Return ONLY: a verdict line `BLOCKING` or `CLEAN`, then for BLOCKING up to 5 bullets — each
the file + the one-line problem (Standards or Spec). No essays. If CLEAN, just say so.
```

## CI fixer (also used for blocking review findings)

```
<AFK contract>

PR #<pr> (branch <branch>) for issue #<n> needs fixes.

1. git checkout <branch> && git pull
2. For CI: gh pr checks <pr> → fetch failing logs with gh run view <run-id> --log-failed.
   For review findings: the orchestrator lists them below.
3. Fix the ROOT CAUSE. Do not delete or weaken tests to make CI pass — if a test is genuinely
   wrong, fix it and say so in the commit message.
4. Run the failing checks (and relevant tests) locally until green, then push to the same branch.

Failing checks / blocking findings from orchestrator:
<one line each>

Return ONLY: 2-3 lines — root cause, what changed, confidence it's fixed.
```

## Re-planner (after 2 failed attempts)

```
<AFK contract>

Issue #<n> has failed 2 implementation attempts. Diagnose and propose a DIFFERENT approach.

1. gh issue view <n> --comments — note the failed-attempt comments.
2. Inspect the branch diff (git diff main...<branch>) and the latest CI failure logs.
3. Decide: under-specified issue, wrong approach, or environmental/test-infra problem?

Return ONLY: a concise plan (≤10 lines) for a fresh attempt — what to do differently and why
it will succeed. If you conclude the issue is genuinely un-shippable autonomously (needs a
product decision, external credential, or blocked upstream), say `RECOMMEND BLOCK: <reason>`
so the orchestrator can trip the circuit breaker. Do not write code.
```

## Epilogue passes (architecture / review)

```
<AFK contract>

Run the `<improve-codebase-architecture | review>` skill (by name) against the changes in:
git diff <run-start-sha>..origin/main  (for `review`, fixed point = <run-start-sha>)

Then implement the IMPORTANT findings only (correctness, structure, depth — skip cosmetic
nits). Work on a branch <chore/...> from latest main, run tests + lint, push, open a PR
against main titled "<chore: … (epic #<parent>)>".

Return ONLY: the PR number and a short bullet list of findings implemented vs skipped
(one-line reason each).
```
