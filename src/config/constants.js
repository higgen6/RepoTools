const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const STATE_FILE = path.join(DATA_DIR, "app-state.json");
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "out"
]);
const COMMON_PORTS = [3000, 3001, 4173, 5000, 5173, 5432, 6379, 8000, 8080];
const MAX_RECENT_DIRECTORIES = 8;
const MAX_BOOKMARKED_DIRECTORIES = 8;
const MAX_SCRIPT_HISTORY_PER_DIRECTORY = 8;
const MAX_SEARCH_RESULTS = 60;
const MAX_PREVIEW_BYTES = 8192;
const MAX_FILE_BYTES_FOR_CONTENT_SEARCH = 1024 * 256;
const MAX_SEARCH_DEPTH = 8;
const MAX_SEARCHED_FILES = 4000;
const SCRIPT_LOG_LIMIT = 1200;
const ALLOWED_SEARCH_LIMITS = [20, 40, 60];
const DEFAULT_SETTINGS = {
  searchMode: "filename",
  searchMaxResults: 40,
  autoRefreshPorts: true
};

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  STATE_FILE,
  EXCLUDED_DIRS,
  COMMON_PORTS,
  MAX_RECENT_DIRECTORIES,
  MAX_BOOKMARKED_DIRECTORIES,
  MAX_SCRIPT_HISTORY_PER_DIRECTORY,
  MAX_SEARCH_RESULTS,
  MAX_PREVIEW_BYTES,
  MAX_FILE_BYTES_FOR_CONTENT_SEARCH,
  MAX_SEARCH_DEPTH,
  MAX_SEARCHED_FILES,
  SCRIPT_LOG_LIMIT,
  ALLOWED_SEARCH_LIMITS,
  DEFAULT_SETTINGS
};
