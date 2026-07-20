import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resolveOrder = path.join(root, "skills/ship-epic/scripts/resolve-order");
const cleanMain = path.join(root, "skills/ship-epic/scripts/clean-main");

const run = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: "utf8", ...options });

const writeGraph = (lines) => {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "graph-")), "graph.tsv");
  writeFileSync(file, lines.map((line) => line.join("\t")).join("\n") + "\n");
  return file;
};

test("resolve-order emits dependency order with number tie-breaks", () => {
  const graph = writeGraph([
    [32, "30,31", "Third"],
    [30, "-", "First"],
    [29, "-", "Independent"],
    [31, "30", "Second"],
  ]);
  const result = run(resolveOrder, ["--graph", graph]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.stdout.trimEnd().split("\n"),
    ["29\tIndependent", "30\tFirst", "31\tSecond", "32\tThird"],
  );
});

test("resolve-order starts at [start-issue] preserving later order", () => {
  const graph = writeGraph([
    [30, "-", "First"],
    [31, "30", "Second"],
    [32, "31", "Third"],
  ]);
  const result = run(resolveOrder, ["--graph", graph, "31"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trimEnd().split("\n"), ["31\tSecond", "32\tThird"]);
});

test("resolve-order flags cycles and exits non-zero", () => {
  const graph = writeGraph([
    [1, "2", "A"],
    [2, "1", "B"],
    [3, "-", "C"],
  ]);
  const result = run(resolveOrder, ["--graph", graph]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cycle detected/);
  assert.match(result.stderr, /#1 #2/);
});

test("resolve-order ignores edges that leave the child set", () => {
  const graph = writeGraph([
    [10, "999", "Only child"],
  ]);
  const result = run(resolveOrder, ["--graph", graph]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trimEnd(), "10\tOnly child");
});

const makeFixtureRepo = () => {
  const base = mkdtempSync(path.join(tmpdir(), "clean-main-"));
  const origin = path.join(base, "origin.git");
  const work = path.join(base, "work");
  const git = (cwd, ...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  execFileSync("git", ["init", "-q", "--bare", "--initial-branch=trunk", origin]);
  execFileSync("git", ["clone", "-q", origin, work]);
  git(work, "config", "user.email", "test@example.com");
  git(work, "config", "user.name", "Test");
  git(work, "checkout", "-qb", "trunk");
  git(work, "commit", "-q", "--allow-empty", "-m", "init");
  git(work, "push", "-q", "origin", "trunk");
  return { work, git };
};

test("clean-main leaves a clean attached checkout at origin tip", () => {
  const { work, git } = makeFixtureRepo();
  const result = run(cleanMain, ["--default-branch", "trunk", "--style", "attached"], {
    cwd: work,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK attached at origin\/trunk/);
  assert.equal(git(work, "status", "--porcelain"), "");
  assert.equal(git(work, "rev-parse", "HEAD"), git(work, "rev-parse", "origin/trunk"));
});

test("clean-main fails loudly on a dirty tree and preserves the changes", () => {
  const { work, git } = makeFixtureRepo();
  writeFileSync(path.join(work, "precious.txt"), "keep me");
  const result = run(cleanMain, ["--default-branch", "trunk"], { cwd: work });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /dirty/);
  assert.match(git(work, "status", "--porcelain"), /precious\.txt/);
});

test("clean-main resets only a matching run-created attempt branch", () => {
  const { work, git } = makeFixtureRepo();
  git(work, "checkout", "-qb", "feat/issue-9-attempt");
  writeFileSync(path.join(work, "run-owned.txt"), "discard me");

  const wrongBranch = run(
    cleanMain,
    ["--default-branch", "trunk", "--reset-attempt", "other-branch"],
    { cwd: work },
  );
  assert.equal(wrongBranch.status, 1);

  const result = run(
    cleanMain,
    ["--default-branch", "trunk", "--reset-attempt", "feat/issue-9-attempt", "--style", "attached"],
    { cwd: work },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(work, "status", "--porcelain"), "");
  assert.equal(git(work, "rev-parse", "--abbrev-ref", "HEAD"), "trunk");
});

test("clean-main preserves a detached checkout style", () => {
  const { work, git } = makeFixtureRepo();
  const result = run(cleanMain, ["--default-branch", "trunk", "--style", "detached"], {
    cwd: work,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK detached/);
  assert.equal(git(work, "rev-parse", "--abbrev-ref", "HEAD"), "HEAD");
});

test("clean-main refuses to rewrite a diverged local default branch", () => {
  const { work, git } = makeFixtureRepo();
  git(work, "commit", "-q", "--allow-empty", "-m", "local-only divergence base");
  git(work, "push", "-q", "origin", "trunk");
  git(work, "reset", "-q", "--hard", "HEAD~1");
  git(work, "commit", "-q", "--allow-empty", "-m", "diverged local commit");
  const result = run(cleanMain, ["--default-branch", "trunk", "--style", "attached"], {
    cwd: work,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /diverged/);
});
