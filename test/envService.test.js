const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEnvSections, parseEnvKeys } = require("../src/services/envService");

test("parseEnvKeys extracts valid keys and ignores comments", () => {
  const keys = parseEnvKeys([
    "# comment",
    "APP_KEY=value",
    " export ALSO_VALID=yes",
    "export API_URL=https://example.com",
    "INVALID-KEY=value",
    "EMPTY=",
    ""
  ].join("\n"));

  assert.deepEqual(keys, ["ALSO_VALID", "API_URL", "APP_KEY", "EMPTY"]);
});

test("buildEnvSections groups env differences clearly", () => {
  const sections = buildEnvSections({
    ".env.example": ["A", "B", "C"],
    ".env": ["A", "EXTRA_ENV"],
    ".env.local": ["A", "B", "EXTRA_LOCAL"]
  });

  assert.deepEqual(sections.exampleMissingFromActual, ["C"]);
  assert.deepEqual(sections.exampleMissingFromEnv, ["B", "C"]);
  assert.deepEqual(sections.exampleMissingFromLocal, ["C"]);
  assert.deepEqual(sections.actualExtraVsExample, ["EXTRA_ENV", "EXTRA_LOCAL"]);
  assert.deepEqual(sections.sharedAcrossAll, ["A"]);
});
