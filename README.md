# skills

Agent skills for [Claude Code](https://code.claude.com), built in the style of
[Matt Pocock's skills](https://github.com/mattpocock/skills).

## Skills

### `ship-epic`

Autonomously ship an entire GitHub epic end to end. You give it a parent/epic
issue; it resolves the child issues' dependency order, implements each one in a
fresh subagent (test-first), opens a PR, gates on CI **and** an independent
review, merges, and repeats — then runs one epic-wide review and closes the
parent. Genuinely-blocked issues are **skipped with a report**, not looped on
forever, so an unattended (AFK) run finishes gracefully.

Design highlights:

- **Thin orchestrator.** The main thread never writes code — it spawns
  subagents and gates. All resumable state lives in GitHub, so the run survives
  context compaction over multi-hour sessions.
- **Dependency-aware.** Children are processed in topological order parsed from
  each issue's `## Blocked by` section; dependents of a blocked issue are
  auto-skipped.
- **Human-approved test seams.** Before the AFK run mutates anything, one
  preflight confirms the public seam for every child—or an explicit non-TDD
  exception—and persists the map in GitHub for recovery.
- **Circuit breaker.** After a configurable number of attempts (incl. one
  re-plan), an issue is marked `blocked` and the run moves on.
- **Independent review.** The root orchestrator applies `code-review`, which
  isolates Standards and Spec in separate agents. Its SHA-bound verdict runs
  concurrently with CI where supported and is never self-review.

Usage:

```
/ship-epic <parent-issue> [start-issue]
```

#### Companion skills (required)

`ship-epic` invokes these skills **by name**. Install them too — the originals
live in [Matt Pocock's skills repo](https://github.com/mattpocock/skills):

| Skill | Role |
| --- | --- |
| `tdd` | Red → green implementation at pre-approved seams, one vertical slice at a time |
| `code-review` | Two-axis Standards + Spec review in independent agents |

You can substitute your own equivalently-named skills; `ship-epic` references
them by name so your project's versions win automatically.

#### Optional architecture follow-up

Architecture exploration is deliberately separate from the unattended epic
run. After the parent closes, `ship-epic` offers a human-led follow-up when the
epic merged at least one related PR. Explicitly invoke
`improve-codebase-architecture` and give it the recorded child and epic-review
fixer PRs. Their combined diffs are its initial hot paths; it may inspect
surrounding modules needed to understand them.

This optional workflow has its own upstream dependencies:
`improve-codebase-architecture`, `codebase-design`, `grilling`, and
`domain-modeling`. Install them from
[Matt Pocock's skills repo](https://github.com/mattpocock/skills) before invoking
the follow-up. They are not required or checked by `ship-epic`.

## Install

The quickest way is the [`skills`](https://github.com/vercel-labs/skills) CLI,
which copies the skill into `.claude/skills/` for you:

```bash
# project-local (./.claude/skills/)
npx skills add nikolasbarwicki/skills

# or globally (~/.claude/skills/)
npx skills add -g nikolasbarwicki/skills
```

List or pick specific skills:

```bash
npx skills add nikolasbarwicki/skills --list
npx skills add nikolasbarwicki/skills --skill ship-epic
```

**Heads up:** `ship-epic` invokes its companion skills (`tdd` and `code-review`)
by name — installing `ship-epic` alone does not pull them. Add them separately from
[Matt Pocock's skills repo](https://github.com/mattpocock/skills).

### Manual install

Skills are also discovered from `~/.claude/skills/` (user) or a repo's
`.claude/skills/` (project). Symlink the skill you want:

```bash
git clone https://github.com/nikolasbarwicki/skills.git
ln -s "$PWD/skills/skills/ship-epic" ~/.claude/skills/ship-epic
```

Then invoke it in Claude Code with `/ship-epic`.

## License

[MIT](./LICENSE). The companion skills are authored by Matt Pocock and licensed
under his repository's terms — this repo only links to them.
