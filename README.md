# skills

Open Agent Skills built in the style of [Matt Pocock's skills](https://github.com/mattpocock/skills).

## `ship-epic`

Explicitly invoke `ship-epic` with a GitHub parent issue. It resolves reachable children in dependency order, obtains one test-seam approval, implements each child through a bounded worker, gates every PR on CI plus independent Standards/Spec review, merges serially, and closes with one epic-wide review.

The core workflow is harness-neutral: it requires capabilities without detecting a vendor or naming a vendor's tools. Serial execution is the portable baseline; genuinely blocked children are recorded and skipped so an unattended run can finish.

### Support matrix

| Harness | Status | Invocation | Notes |
| --- | --- | --- | --- |
| Codex in the ChatGPT desktop app | Runtime-verified | `$ship-epic` | Preflight smoke verified with Codex CLI `0.144.4`; task worktrees may start detached. |
| Claude Code | Contract-verified | `/ship-epic` | Checked against current official docs; no live Claude smoke ran in this release. |
| Other Open Agent Skills harnesses | Unverified | Harness-specific | May run when every capability preflight check passes; no support claim yet. |

See the [Codex](skills/ship-epic/references/codex.md) and [Claude Code](skills/ship-epic/references/claude-code.md) compatibility guides for setup, permissions, delegation, and checkout limitations.

Hosted ChatGPT Work is a different execution environment and is not verified or supported by this release.

### Required companion skills

`ship-epic` invokes these model-invocable skills by name:

| Skill | Role |
| --- | --- |
| `tdd` | Red → green implementation at human-approved seams |
| `code-review` | Independent Standards and Spec review from a fixed point |

The validated baseline is Matt Pocock skills `1.1.0`, audited at commit [`e9fcdf95`](https://github.com/mattpocock/skills/commit/e9fcdf95b402d360f90f1db8d776d5dd450f9234). Newer versions are allowed; this repository checks current upstream names and invocation policies on pull requests and weekly.

Architecture exploration is a separate, explicitly human-led follow-up. If an epic merged related PRs, its closeout offers `improve-codebase-architecture`. That optional workflow requires `improve-codebase-architecture`, `codebase-design`, `grilling`, and `domain-modeling`; none is invoked or required by `ship-epic`.

### Deterministic helper scripts

Two bundled, dependency-light scripts (bash + `git`/`gh`) replace procedures the orchestrator previously re-derived in context on every run and after every compaction:

| Script | Role |
| --- | --- |
| [`scripts/resolve-order`](skills/ship-epic/scripts/resolve-order) | Discover an epic's children and emit their dependency order; exits non-zero on cycles. `--graph <file>` runs it offline. |
| [`scripts/clean-main`](skills/ship-epic/scripts/clean-main) | Assert/restore a clean checkout at the tip of the discovered default branch, or fail loudly. Preserves pre-existing changes; discards only run-owned changes on a named attempt branch. |

## Install

Use the [`skills`](https://github.com/vercel-labs/skills) CLI and target the active harness explicitly.

### Codex

```bash
npx skills add nikolasbarwicki/skills --skill ship-epic --agent codex
npx skills add mattpocock/skills --skill tdd --skill code-review --agent codex
```

Project skills install under `.agents/skills/`; global Codex skills use `~/.codex/skills/` with `--global`.

### Claude Code

```bash
npx skills add nikolasbarwicki/skills --skill ship-epic --agent claude-code
npx skills add mattpocock/skills --skill tdd --skill code-review --agent claude-code
```

Project skills install under `.claude/skills/`; global Claude Code skills use `~/.claude/skills/` with `--global`.

List available skills before installing:

```bash
npx skills add nikolasbarwicki/skills --list
```

## Compatibility check

Clone Matt's repository and run the dependency-free checker:

```bash
node skills/ship-epic/scripts/check-matt-compatibility.mjs /path/to/mattpocock-skills
```

It fails when `tdd` or `code-review` is missing or becomes user-only in either Claude Code or Codex. It does not run during `ship-epic` execution.

## License

[MIT](./LICENSE). Matt Pocock authored the companion skills; they remain under his repository's terms.
