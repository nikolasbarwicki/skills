# Claude Code compatibility

This guide maps the neutral `ship-epic` contract to Claude Code. It is setup documentation, not a runtime adapter.

## Install and invoke

Install project-local skills with `npx skills`:

```bash
npx skills add nikolasbarwicki/skills --skill ship-epic --agent claude-code
npx skills add mattpocock/skills --skill tdd --skill code-review --agent claude-code
```

Claude Code discovers project skills under `.claude/skills/` and user skills under `~/.claude/skills/`. Invoke the orchestrator explicitly with `/ship-epic`; `disable-model-invocation: true` prevents implicit invocation.

## Capability mapping

| Neutral capability | Claude Code mapping |
| --- | --- |
| Repository instructions | Claude Code loads applicable `CLAUDE.md` project memory automatically. |
| Bounded worker | Root uses a direct subagent and waits for its compact return. No named agent type is required by the core. |
| Root review | Root invokes `code-review`. Claude subagents cannot spawn subagents, so a child worker cannot own review. |
| CI concurrency | Root may use a bounded background task while review runs; sequential CI then review is the safe fallback. |
| Unattended permissions | Background subagents use already granted permissions and auto-deny calls that would prompt. Preflight must reject a posture that cannot complete required operations unattended. |
| Checkout | Serial workers use the leased checkout. Parallel workers use orchestrator-managed git worktrees created by the bundled `worktree-lease` script; subagent-level worktree isolation is not used. |

## Worktree limits

Claude Code can isolate a subagent with `isolation: worktree`, and `.worktreeinclude` can copy selected ignored files. `ship-epic` intentionally does not use that feature: its parallel mode creates worktrees itself with the harness-neutral [`worktree-lease`](../scripts/worktree-lease) script and hands each worker an explicit path, so the same contract runs on every harness and worktrees survive compaction via `git worktree list`.

The default worktree root is `<toplevel>.worktrees`, a sibling of the primary checkout. Grant that directory as an additional working directory (or pass `--root` with a permitted path) so parallel workers can edit and run tests there without prompting. Each worktree gets a one-time dependency install; `.worktreeinclude`-style copying is not a substitute for it.

## Permissions

Configure the parent session so required edits, git operations, GitHub calls, and tests do not prompt a background worker. Claude permission modes and allow/deny rules remain the user's security boundary; preflight validates capability without selecting a mode.

## Verification status

Contract-verified against current official Claude Code documentation on 2026-07-15. No live Claude Code smoke test ran in this release.

## Official references

- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Skills](https://code.claude.com/docs/en/slash-commands)
- [Worktrees](https://code.claude.com/docs/en/worktrees)
- [Permission modes](https://code.claude.com/docs/en/permission-modes)
