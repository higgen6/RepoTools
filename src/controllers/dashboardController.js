const {
  buildDashboardViewModel,
  setActiveDirectory,
  ensureDirectorySelected,
  addBookmark,
  removeBookmark,
  getCurrentState,
  updateSettings
} = require("../services/dashboardService");
const { startScript, stopRunningScript, getScriptSnapshot } = require("../services/scriptService");
const { getPortSnapshot, stopProcessByPid } = require("../services/portService");
const { searchProjectFiles, getFilePreview } = require("../services/searchService");
const { openDirectoryPicker } = require("../services/systemDialogService");
const { openPath, revealPath } = require("../services/systemPathService");
const path = require("path");

async function renderDashboard(req, res, next) {
  try {
    const viewModel = await buildDashboardViewModel(req.query.message, req.query.error);
    res.render("dashboard", viewModel);
  } catch (error) {
    next(error);
  }
}

async function updateDirectory(req, res) {
  const inputPath = String(req.body.directoryPath || "").trim();

  try {
    await setActiveDirectory(inputPath);
    res.redirect("/?message=Directory updated successfully.");
  } catch (error) {
    const message = error.publicMessage || "Unable to set that directory.";
    res.redirect(`/?error=${encodeURIComponent(message)}`);
  }
}

async function toggleBookmark(req, res) {
  const directoryPath = String(req.body.directoryPath || "").trim() || getCurrentState().activeDirectory;
  const action = String(req.body.action || "").trim();

  try {
    if (action === "remove") {
      await removeBookmark(directoryPath);
      return res.redirect("/?message=Bookmark removed.");
    }

    await addBookmark(directoryPath);
    res.redirect("/?message=Bookmark saved.");
  } catch (error) {
    const message = error.publicMessage || "Unable to update bookmarks.";
    res.redirect(`/?error=${encodeURIComponent(message)}`);
  }
}

function saveSettings(req, res) {
  try {
    updateSettings(req.body);
    res.redirect("/?message=Settings saved.");
  } catch (error) {
    const message = error.publicMessage || "Unable to save settings.";
    res.redirect(`/?error=${encodeURIComponent(message)}`);
  }
}

async function runScript(req, res) {
  try {
    const activeDirectory = ensureDirectorySelected();
    const scriptName = String(req.body.scriptName || "").trim();
    await startScript(activeDirectory, scriptName);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to start that script."
    });
  }
}

async function stopScript(req, res) {
  try {
    await stopRunningScript();
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to stop the running script."
    });
  }
}

function getScriptStatus(req, res) {
  res.json({
    ok: true,
    status: getScriptSnapshot()
  });
}

async function getPorts(req, res) {
  try {
    res.json({
      ok: true,
      ports: await getPortSnapshot()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Unable to inspect local ports right now."
    });
  }
}

async function stopPortProcess(req, res) {
  try {
    const pid = Number(req.body.pid);
    if (!Number.isInteger(pid) || pid <= 0) {
      throw Object.assign(new Error("Invalid PID"), { publicMessage: "A valid process id is required." });
    }

    await stopProcessByPid(pid);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to stop that process."
    });
  }
}

async function searchFiles(req, res) {
  try {
    const activeDirectory = ensureDirectorySelected();
    const state = getCurrentState();
    const query = String(req.query.query || "").trim();
    const includeContent = String(req.query.includeContent || "") === "true";
    const extension = String(req.query.extension || "").trim();
    const maxResults = Number(req.query.maxResults || state.settings.searchMaxResults);

    if (!query) {
      return res.json({
        ok: true,
        results: [],
        meta: {
          totalResults: 0,
          filenameMatches: 0,
          contentMatches: 0,
          searchedFiles: 0,
          truncated: false
        }
      });
    }

    const search = await searchProjectFiles(activeDirectory, query, {
      includeContent,
      extension,
      maxResults
    });
    res.json({ ok: true, ...search });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to search files."
    });
  }
}

async function openActiveDirectory(req, res) {
  try {
    const activeDirectory = ensureDirectorySelected();
    await openPath(activeDirectory);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to open that folder."
    });
  }
}

async function revealSelectedFile(req, res) {
  try {
    const activeDirectory = ensureDirectorySelected();
    const relativePath = String(req.body.path || "").trim();

    if (!relativePath) {
      throw Object.assign(new Error("Missing file path"), {
        publicMessage: "Choose a file result first."
      });
    }

    const targetPath = path.resolve(activeDirectory, relativePath);
    const relative = path.relative(activeDirectory, targetPath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw Object.assign(new Error("Unsafe path"), {
        publicMessage: "That file is outside the selected directory."
      });
    }

    await revealPath(targetPath);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to reveal that file."
    });
  }
}

async function pickDirectory(req, res) {
  try {
    const selectedPath = await openDirectoryPicker();
    if (!selectedPath) {
      return res.json({ ok: true, selectedPath: null });
    }

    res.json({ ok: true, selectedPath });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "A native folder picker is not available here."
    });
  }
}

async function previewFile(req, res) {
  try {
    const activeDirectory = ensureDirectorySelected();
    const relativePath = String(req.query.path || "").trim();

    if (!relativePath) {
      throw Object.assign(new Error("Missing file path"), {
        publicMessage: "Choose a file result to preview."
      });
    }

    const preview = await getFilePreview(activeDirectory, relativePath);
    res.json({ ok: true, preview });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.publicMessage || "Unable to preview that file."
    });
  }
}

module.exports = {
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
};
