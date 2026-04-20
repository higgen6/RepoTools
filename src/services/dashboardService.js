const { readState, writeState } = require("./storageService");
const {
  validateDirectoryPath,
  mergeRecentDirectories,
  mergeBookmarkedDirectories,
  removeDirectoryFromList
} = require("./directoryService");
const { detectProject } = require("./inspectService");
const { getScriptSnapshot } = require("./scriptService");
const { ALLOWED_SEARCH_LIMITS, DEFAULT_SETTINGS } = require("../config/constants");
const { getRecentScriptHistory } = require("./historyService");

function getCurrentState() {
  return readState();
}

async function setActiveDirectory(inputPath) {
  const resolvedPath = await validateDirectoryPath(inputPath);
  const state = readState();

  writeState({
    ...state,
    activeDirectory: resolvedPath,
    recentDirectories: mergeRecentDirectories(state.recentDirectories, resolvedPath)
  });

  return resolvedPath;
}

async function addBookmark(inputPath) {
  const resolvedPath = await validateDirectoryPath(inputPath);
  const state = readState();

  writeState({
    ...state,
    bookmarkedDirectories: mergeBookmarkedDirectories(state.bookmarkedDirectories, resolvedPath),
    recentDirectories: mergeRecentDirectories(state.recentDirectories, resolvedPath)
  });

  return resolvedPath;
}

async function removeBookmark(inputPath) {
  const state = readState();
  const resolvedPath = inputPath ? inputPath.trim() : "";

  writeState({
    ...state,
    bookmarkedDirectories: removeDirectoryFromList(state.bookmarkedDirectories, resolvedPath)
  });

  return resolvedPath;
}

function normalizeSettings(input) {
  const searchMode = input.searchMode === "content" ? "content" : DEFAULT_SETTINGS.searchMode;
  const searchMaxResults = Number(input.searchMaxResults);
  const autoRefreshPorts = input.autoRefreshPorts === true || input.autoRefreshPorts === "true" || input.autoRefreshPorts === "on";

  return {
    searchMode,
    searchMaxResults: ALLOWED_SEARCH_LIMITS.includes(searchMaxResults) ? searchMaxResults : DEFAULT_SETTINGS.searchMaxResults,
    autoRefreshPorts
  };
}

function updateSettings(input) {
  const state = readState();
  const nextSettings = normalizeSettings(input);

  writeState({
    ...state,
    settings: nextSettings
  });

  return nextSettings;
}

function ensureDirectorySelected() {
  const state = readState();
  if (!state.activeDirectory) {
    throw Object.assign(new Error("No directory selected"), {
      publicMessage: "Choose a directory first."
    });
  }
  return state.activeDirectory;
}

async function buildDashboardViewModel(message, errorMessage) {
  const state = readState();
  const hasDirectory = Boolean(state.activeDirectory);
  let inspection = null;
  let derivedErrorMessage = errorMessage || null;

  if (hasDirectory) {
    try {
      inspection = await detectProject(state.activeDirectory);
    } catch (error) {
      derivedErrorMessage = derivedErrorMessage || "The saved directory could not be inspected. Set the folder again to continue.";
    }
  }

  return {
    pageTitle: "RepoTools",
    flashMessage: message || null,
    errorMessage: derivedErrorMessage,
    activeDirectory: state.activeDirectory,
    recentDirectories: state.recentDirectories,
    bookmarkedDirectories: state.bookmarkedDirectories,
    settings: {
      ...DEFAULT_SETTINGS,
      ...state.settings
    },
    allowedSearchLimits: ALLOWED_SEARCH_LIMITS,
    inspection,
    scriptStatus: getScriptSnapshot(),
    scriptHistory: state.activeDirectory ? getRecentScriptHistory(state.activeDirectory) : [],
    isActiveDirectoryBookmarked: state.bookmarkedDirectories.includes(state.activeDirectory)
  };
}

module.exports = {
  getCurrentState,
  setActiveDirectory,
  addBookmark,
  removeBookmark,
  updateSettings,
  ensureDirectorySelected,
  buildDashboardViewModel,
  normalizeSettings
};
