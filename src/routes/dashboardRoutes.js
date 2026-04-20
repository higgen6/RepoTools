const express = require("express");
const {
  renderDashboard,
  updateDirectory,
  toggleBookmark,
  saveSettings,
  runScript,
  stopScript,
  pickDirectory,
  openActiveDirectory,
  revealSelectedFile,
  getScriptStatus,
  getPorts,
  stopPortProcess,
  searchFiles,
  previewFile
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", renderDashboard);
router.post("/directory", updateDirectory);
router.post("/directory/bookmark", toggleBookmark);
router.post("/settings", saveSettings);
router.post("/scripts/run", runScript);
router.post("/scripts/stop", stopScript);
router.get("/api/directory/pick", pickDirectory);
router.post("/api/system/open-directory", openActiveDirectory);
router.post("/api/system/reveal-file", revealSelectedFile);
router.get("/api/scripts/status", getScriptStatus);
router.get("/api/ports", getPorts);
router.post("/api/ports/stop", stopPortProcess);
router.get("/api/search", searchFiles);
router.get("/api/preview", previewFile);

module.exports = router;
