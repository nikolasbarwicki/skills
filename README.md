# skills

Agent skills for [Claude Code](https://code.claude.com), built in the style of
[Matt Pocock's skills](https://github.com/mattpocock/skills).

## Skills

### `ship-epic`

Autonomously ship an entire GitHub epic end to end. You give it a parent/epic
issue; it resolves the child issues' dependency order, implements each one in a
fresh subagent (test-first), opens a PR, gates on CI **and** an independent
review, merges, and repeats — then runs architecture/review/structure epilogue
passes and closes the parent. Genuinely-blocked issues are **skipped with a
report**, not looped on forever, so an unattended (AFK) run finishes gracefully.

Design highlights:

- **Thin orchestrator.** The main thread never writes code — it spawns
  subagents and gates. All resumable state lives in GitHub, so the run survives
  context compaction over multi-hour sessions.
- **Dependency-aware.** Children are processed in topological order parsed from
  each issue's `## Blocked by` section; dependents of a blocked issue are
  auto-skipped.
- **Circuit breaker.** After a configurable number of attempts (incl. one
  re-plan), an issue is marked `blocked` and the run moves on.
- **Independent review.** Review runs as a separate subagent (not self-review),
  concurrently with the CI wait.

Usage:

```
/ship-epic <parent-issue> [start-issue]
```

#### Companion skills (required)

`ship-epic` invokes these skills **by name**. Install them too — the originals
live in [Matt Pocock's skills repo](https://github.com/mattpocock/skills):

| Skill | Role |
| --- | --- |
| `implement` | Implements a slice (uses `tdd` at seams), then commits |
| `tdd` | Red-green-refactor, vertical slices |
| `review` | Two-axis (Standards + Spec) diff review |
| `improve-codebase-architecture` | Architecture pass in the epilogue |

You can substitute your own equivalently-named skills; `ship-epic` references
them by name so your project's versions win automatically.

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

**Heads up:** `ship-epic` invokes its companion skills (`implement`, `tdd`,
`review`, `improve-codebase-architecture`) by name — installing `ship-epic`
alone does not pull them. Add them separately from
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
