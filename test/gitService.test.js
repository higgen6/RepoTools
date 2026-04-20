const test = require("node:test");
const assert = require("node:assert/strict");
const { parseStatusEntries, parseTrackingSummary } = require("../src/services/gitService");

test("parseTrackingSummary reads branch and ahead behind counts", () => {
  const summary = parseTrackingSummary("## feature/repo-tools...origin/feature/repo-tools [ahead 2, behind 1]");

  assert.equal(summary.branch, "feature/repo-tools");
  assert.equal(summary.upstream, "origin/feature/repo-tools");
  assert.equal(summary.ahead, 2);
  assert.equal(summary.behind, 1);
});

test("parseStatusEntries counts staged modified untracked deleted and conflicts", () => {
  const counts = parseStatusEntries([
    "## main...origin/main",
    "M  src/app.js",
    " M README.md",
    "A  src/new.js",
    "D  src/old.js",
    "R  src/from.js -> src/to.js",
    "UU src/conflict.js",
    "?? scratch.txt"
  ].join("\n"));

  assert.deepEqual(counts, {
    staged: 4,
    modified: 1,
    untracked: 1,
    deleted: 1,
    renamed: 1,
    conflicts: 1
  });
});
