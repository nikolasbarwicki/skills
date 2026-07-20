# Changelog

All notable changes to this repository's skills are documented here. Versions
follow the tag on this repository, not the versions of the upstream Matt Pocock
companion skills.

## v0.2.0

Second iteration of `ship-epic`, hardening it into a harness-neutral orchestrator
that composes Matt Pocock's current model-invoked `tdd` and `code-review` skills.
Bundles six merged changes.

### Added

- **Opt-in bounded worktree parallelism** (#1, PR #12). `--parallel [N]`
  implements up to `N` independent children concurrently in run-owned git
  worktrees (`N` defaults to 2, capped at 3) while merges stay strictly serial in
  dependency order; every other open branch is rebased and fully re-gated after
  each merge. Each worktree gets its own one-time dependency install; serial
  remains the default. Recovery reconciles surviving worktrees via
  `git worktree list`.
- **Deterministic helper scripts** (#2, PR #11). Three dependency-light scripts
  (bash + `git`/`gh`) replace procedures the orchestrator previously re-derived in
  context on every run and after every compaction:
  - `scripts/resolve-order` — discover an epic's children and emit their
    dependency order; exits non-zero on cycles (`--graph <file>` runs it offline).
  - `scripts/clean-main` — assert/restore a clean checkout at the discovered
    default branch's tip, or fail loudly; preserves pre-existing changes.
  - `scripts/worktree-lease` — create, list, and remove run-owned worktrees for
    parallel implementers.
- **Harness-neutral core with Codex + Claude Code compatibility** (#5, PR #10).
  The core workflow describes semantic capabilities rather than detecting or
  branching on a harness. Adds a capability preflight, a non-destructive
  default-branch-aware checkout contract, `agents/openai.yaml` metadata,
  progressively disclosed `references/codex.md` and `references/claude-code.md`
  compatibility guides, a support matrix, a dependency-free
  `check-matt-compatibility.mjs` checker with fixtures, and a scheduled/PR GitHub
  Action that checks upstream `main`.

### Changed

- **Invoke `tdd` directly** (#3, PR #7). Implementation workers now apply the
  model-invoked `tdd` skill by name as a red → green discipline at
  human-confirmed test seams, instead of trying to invoke the user-only
  `implement` workflow. Adds a seam-map preflight that must be approved before any
  mutation, persists the approved seam map (and any NON-TDD exceptions) on the
  parent issue for recovery, and passes each worker its approved seam explicitly.
- **Use `code-review` for review gates** (#4, PR #8). Review runs from the root
  orchestrator (never a nested subagent), letting `code-review` spawn its own
  independent Standards and Spec agents. Child-PR review uses fixed point `main`;
  the epic-wide review uses `<run-start-sha>`. CI and review run concurrently
  where supported with a sequential fallback. Spec/Standards findings block;
  Fowler smell findings are advisory only, capped at three bullets. Review
  evidence is persisted per PR keyed to the reviewed head SHA and invalidated on
  every new commit.
- **Human-led architecture follow-up** (#6, PR #9). Removed the AFK architecture
  epilogue. The unattended close is now a root-owned epic-wide `code-review` loop
  followed by parent closure. `improve-codebase-architecture` is never invoked
  autonomously; it is offered only after closure, only when related PRs merged,
  and only as an explicit human-invoked follow-up. The unattended companion set is
  exactly `tdd` and `code-review`.

### Removed

- The user-only `implement` companion requirement (superseded by direct `tdd`).
- The autonomous architecture and speculative structure passes from the epilogue.

### Compatibility

- Validated baseline: Matt Pocock skills `1.1.0`.
- Codex in the ChatGPT desktop app: runtime-verified preflight smoke (stops before
  mutation).
- Claude Code: contract-verified against current official docs; no live smoke ran
  in this release.

## v0.1.0

- Initial `ship-epic` skill: autonomous GitHub epic orchestrator (serial loop).
