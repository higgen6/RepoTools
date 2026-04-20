const { MAX_SCRIPT_HISTORY_PER_DIRECTORY } = require("../config/constants");
const { readState, writeState } = require("./storageService");

function getRecentScriptHistory(directoryPath) {
  const state = readState();
  return Array.isArray(state.scriptHistory[directoryPath]) ? state.scriptHistory[directoryPath] : [];
}

function addScriptHistoryEntry(directoryPath, entry) {
  if (!directoryPath) {
    return;
  }

  const state = readState();
  const existing = Array.isArray(state.scriptHistory[directoryPath]) ? state.scriptHistory[directoryPath] : [];
  const nextEntries = [entry, ...existing].slice(0, MAX_SCRIPT_HISTORY_PER_DIRECTORY);

  writeState({
    ...state,
    scriptHistory: {
      ...state.scriptHistory,
      [directoryPath]: nextEntries
    }
  });
}

module.exports = {
  getRecentScriptHistory,
  addScriptHistoryEntry
};
