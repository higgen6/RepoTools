const fs = require("fs");
const path = require("path");
const { DATA_DIR, DEFAULT_SETTINGS, STATE_FILE } = require("../config/constants");

const DEFAULT_STATE = {
  activeDirectory: "",
  recentDirectories: [],
  bookmarkedDirectories: [],
  scriptHistory: {},
  settings: DEFAULT_SETTINGS
};

function ensureStorageFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
  }
}

function readState() {
  ensureStorageFile();

  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      recentDirectories: Array.isArray(parsed.recentDirectories) ? parsed.recentDirectories : [],
      bookmarkedDirectories: Array.isArray(parsed.bookmarkedDirectories) ? parsed.bookmarkedDirectories : [],
      scriptHistory: parsed.scriptHistory && typeof parsed.scriptHistory === "object" ? parsed.scriptHistory : {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {})
      }
    };
  } catch (error) {
    console.error("[RepoTools] Failed to read state, using defaults.", error);
    return { ...DEFAULT_STATE };
  }
}

function writeState(nextState) {
  ensureStorageFile();
  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2));
}

module.exports = {
  ensureStorageFile,
  readState,
  writeState,
  DEFAULT_STATE
};
