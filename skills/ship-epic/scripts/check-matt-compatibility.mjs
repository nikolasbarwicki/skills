#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [root] = process.argv.slice(2);

if (!root) {
  console.error("Usage: check-matt-compatibility.mjs <matt-skills-root>");
  process.exit(2);
}

for (const name of ["tdd", "code-review"]) {
  const skill = path.join(root, "skills", "engineering", name, "SKILL.md");
  if (!existsSync(skill)) {
    console.error(`Missing required companion skill: ${name}`);
    process.exit(1);
  }

  const contents = readFileSync(skill, "utf8");
  const frontmatter = contents.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/)?.[1] ?? "";
  const declaredName = frontmatter.match(
    /^name:\s*["']?([^"'#\s]+)["']?\s*$/m,
  )?.[1];
  if (declaredName !== name) {
    console.error(
      `${name} declares name "${declaredName ?? "<missing>"}"; expected "${name}"`,
    );
    process.exit(1);
  }

  if (/^disable-model-invocation:\s*true\s*$/m.test(frontmatter)) {
    console.error(
      `${name} is user-only in Claude: disable-model-invocation must not be true`,
    );
    process.exit(1);
  }

  const openaiMetadata = path.join(
    root,
    "skills",
    "engineering",
    name,
    "agents",
    "openai.yaml",
  );
  if (
    existsSync(openaiMetadata) &&
    /^\s*allow_implicit_invocation:\s*false\s*$/m.test(
      readFileSync(openaiMetadata, "utf8"),
    )
  ) {
    console.error(
      `${name} is user-only in Codex: allow_implicit_invocation must not be false`,
    );
    process.exit(1);
  }
}

console.log("Matt skills are compatible with ship-epic.");
