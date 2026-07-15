import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

const skill = read("skills/ship-epic/SKILL.md");
const prompts = read("skills/ship-epic/prompts.md");
const openai = read("skills/ship-epic/agents/openai.yaml");
const readme = read("README.md");
const codex = read("skills/ship-epic/references/codex.md");
const claude = read("skills/ship-epic/references/claude-code.md");

test("is explicit-only in Claude and Codex", () => {
  assert.match(skill, /^disable-model-invocation: true$/m);
  assert.match(openai, /^\s*allow_implicit_invocation: false$/m);
  assert.match(openai, /default_prompt: "Use \$ship-epic/);
});

test("keeps harness mechanics out of the core workflow", () => {
  const core = `${skill}\n${prompts}`;
  for (const forbidden of [
    /general-purpose/i,
    /CLAUDE\.md/,
    /AGENTS\.md/,
    /\bOpus\b/,
    /agents\.max_depth/,
    /isolation:\s*worktree/,
    /git (?:checkout|switch) main/,
  ]) {
    assert.doesNotMatch(core, forbidden);
  }
});

test("defines the capability preflight and root-owned review", () => {
  for (const requirement of [
    /model-invocable/,
    /direct review workers/,
    /permission posture/,
    /GitHub remote, authentication, repository access, and push\/PR permissions/,
    /baseline verification/,
    /explicit approval for the complete test-decision map/,
    /Apply `code-review` \*\*at root\*\*/,
    /sequential CI then review/i,
  ]) {
    assert.match(skill, requirement);
  }
});

test("protects checkout state and discovers the default branch", () => {
  for (const requirement of [
    /exclusive checkout/,
    /preserve every pre-existing change/i,
    /Discover the default branch/,
    /attached\/detached style/,
    /origin\/<default-branch>/,
    /recorded run-owned changes/,
  ]) {
    assert.match(skill, requirement);
  }
});

test("documents verification tiers and Matt compatibility baseline", () => {
  assert.match(readme, /Matt Pocock skills `1\.1\.0`/);
  assert.match(readme, /e9fcdf95b402d360f90f1db8d776d5dd450f9234/);
  assert.match(codex, /Runtime-smoke-tested/);
  assert.match(claude, /No live Claude Code smoke test ran/);
  assert.match(readme, /Other Open Agent Skills harnesses \| Unverified/);
  assert.match(readme, /Hosted ChatGPT Work.*not verified or supported/);
  for (const dependency of [
    "improve-codebase-architecture",
    "codebase-design",
    "grilling",
    "domain-modeling",
  ]) {
    assert.match(readme, new RegExp("`" + dependency + "`"));
  }
});
