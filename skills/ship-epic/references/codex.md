# Codex compatibility

This guide maps the neutral `ship-epic` contract to Codex in the ChatGPT desktop app. It is setup documentation, not a runtime adapter.

## Install and invoke

Install project-local skills with `npx skills`:

```bash
npx skills add nikolasbarwicki/skills --skill ship-epic --agent codex
npx skills add mattpocock/skills --skill tdd --skill code-review --agent codex
```

Codex discovers project skills under `.agents/skills/` and user skills under `~/.codex/skills/`. Invoke the orchestrator explicitly with `$ship-epic`; its `agents/openai.yaml` disables implicit invocation.

## Capability mapping

| Neutral capability | Codex mapping |
| --- | --- |
| Repository instructions | Codex loads the applicable `AGENTS.md`/`AGENTS.override.md` chain automatically. |
| Bounded worker | Root uses the native subagent controls to spawn, steer, wait for, and collect one direct worker. |
| Root review | Root invokes `code-review`; its two direct agents fit the default `agents.max_depth = 1`. A child worker cannot invoke that review. |
| CI concurrency | Root may keep a bounded check watcher running while the review agents work; sequential CI then review is the safe fallback. |
| Unattended permissions | Subagents inherit the parent task's sandbox and approval posture. Preflight must reject a posture that can pause for user approval during required operations. |
| Checkout | Serial workers use the task's leased checkout. No per-worker isolation is assumed. |

## Worktree limits

A Codex task worktree is created at the app/task level and starts detached by default. It is not evidence that each subagent has a separate writable checkout. `ship-epic` therefore keeps one serial writer and supports a detached base. Bounded isolated parallelism belongs to issue #1.

The task worktree may copy selected ignored files through `.worktreeinclude`; baseline verification must still prove that dependencies and required local configuration are usable.

## Permissions

Choose a permission configuration that can complete workspace edits, git metadata writes, GitHub network calls, and tests without a human prompt. Codex supports sandbox and approval settings independently; automatic approval review can still deny unsafe actions. Preflight validates the outcome rather than prescribing a security posture.

## Verification status

Runtime-smoke-tested with Codex CLI `0.144.4` in the ChatGPT desktop environment on 2026-07-15. The smoke covers discovery and preflight and stops before implementation mutation.

## Official references

- [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Skills](https://learn.chatgpt.com/docs/build-skills)
- [Worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Sandbox and approvals](https://learn.chatgpt.com/docs/sandboxing)
