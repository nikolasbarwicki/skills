import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checker = path.join(
  root,
  "skills/ship-epic/scripts/check-matt-compatibility.mjs",
);

function run(fixture) {
  return spawnSync(process.execPath, [checker, path.join(root, "tests/fixtures", fixture)], {
    encoding: "utf8",
  });
}

test("accepts model-invocable tdd and code-review skills", () => {
  const result = run("valid");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /compatible/i);
});

test("rejects a missing companion", () => {
  const result = run("missing-code-review");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required companion skill: code-review/);
});

test("rejects a renamed companion declared at the expected path", () => {
  const result = run("renamed-review");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /code-review.*declares name "review"/i);
});

test("rejects a Claude user-only companion", () => {
  const result = run("claude-user-only");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tdd.*disable-model-invocation/i);
});

test("rejects a Codex user-only companion", () => {
  const result = run("codex-user-only");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /code-review.*allow_implicit_invocation/i);
});
