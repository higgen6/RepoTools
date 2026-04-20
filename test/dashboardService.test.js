const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSettings } = require("../src/services/dashboardService");

test("normalizeSettings keeps supported values and defaults invalid input", () => {
  const valid = normalizeSettings({
    searchMode: "content",
    searchMaxResults: "20",
    autoRefreshPorts: "on"
  });

  assert.deepEqual(valid, {
    searchMode: "content",
    searchMaxResults: 20,
    autoRefreshPorts: true
  });

  const fallback = normalizeSettings({
    searchMode: "weird",
    searchMaxResults: "777"
  });

  assert.deepEqual(fallback, {
    searchMode: "filename",
    searchMaxResults: 40,
    autoRefreshPorts: false
  });
});
