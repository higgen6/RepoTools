const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeSearchOptions, searchProjectFiles } = require("../src/services/searchService");

async function withTempDir(run) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "repotools-search-"));
  try {
    await run(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("normalizeSearchOptions sanitizes extension and max results", () => {
  const options = normalizeSearchOptions({
    includeContent: true,
    extension: ".js",
    maxResults: 999
  });

  assert.equal(options.includeContent, true);
  assert.equal(options.extension, "js");
  assert.equal(options.maxResults, 60);
});

test("searchProjectFiles finds filenames and content while honoring extension filters", async () => {
  await withTempDir(async (tempDir) => {
    await fs.writeFile(path.join(tempDir, "package.json"), '{"name":"demo"}');
    await fs.writeFile(path.join(tempDir, "notes.txt"), "server listens on port 3000");
    await fs.mkdir(path.join(tempDir, "node_modules"));
    await fs.writeFile(path.join(tempDir, "node_modules", "ignored.txt"), "package");

    const filenameSearch = await searchProjectFiles(tempDir, "package", {
      includeContent: false,
      maxResults: 20
    });

    assert.equal(filenameSearch.results.length, 1);
    assert.equal(filenameSearch.results[0].name, "package.json");

    const contentSearch = await searchProjectFiles(tempDir, "port 3000", {
      includeContent: true,
      extension: "txt",
      maxResults: 20
    });

    assert.equal(contentSearch.results.length, 1);
    assert.equal(contentSearch.results[0].path, "notes.txt");
    assert.equal(contentSearch.results[0].matchType, "content");
    assert.match(contentSearch.results[0].preview, /port 3000/);
  });
});
