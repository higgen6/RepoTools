const fs = require("fs/promises");
const path = require("path");
const {
  EXCLUDED_DIRS,
  MAX_FILE_BYTES_FOR_CONTENT_SEARCH,
  MAX_PREVIEW_BYTES,
  MAX_SEARCH_DEPTH,
  MAX_SEARCH_RESULTS,
  MAX_SEARCHED_FILES
} = require("../config/constants");

function escapePreview(text) {
  return text.replace(/\0/g, "");
}

function normalizeSearchOptions(rawOptions = {}) {
  const maxResults = Number(rawOptions.maxResults);
  const extension = String(rawOptions.extension || "").trim().toLowerCase().replace(/^\./, "");

  return {
    includeContent: Boolean(rawOptions.includeContent),
    extension,
    maxResults: Number.isInteger(maxResults) && maxResults > 0
      ? Math.min(maxResults, MAX_SEARCH_RESULTS)
      : MAX_SEARCH_RESULTS
  };
}

function looksTextLike(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 256));
  let suspicious = 0;

  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13) {
      continue;
    }
    if (byte < 32 || byte === 127) {
      suspicious += 1;
    }
  }

  return suspicious < 8;
}

async function searchProjectFiles(rootDirectory, query, options = {}) {
  const normalizedQuery = query.toLowerCase();
  const normalizedOptions = typeof options === "boolean"
    ? normalizeSearchOptions({ includeContent: options })
    : normalizeSearchOptions(options);
  const results = [];
  let searchedFiles = 0;
  let filenameMatches = 0;
  let contentMatches = 0;

  async function walk(currentDirectory, depth) {
    if (depth > MAX_SEARCH_DEPTH || results.length >= normalizedOptions.maxResults || searchedFiles >= MAX_SEARCHED_FILES) {
      return;
    }

    let entries;
    try {
      entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      if (results.length >= normalizedOptions.maxResults || searchedFiles >= MAX_SEARCHED_FILES) {
        break;
      }

      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDirectory, entry.name);
      const relativePath = path.relative(rootDirectory, absolutePath);

      if (entry.isDirectory()) {
        await walk(absolutePath, depth + 1);
        continue;
      }

      searchedFiles += 1;
      if (normalizedOptions.extension) {
        const entryExtension = path.extname(entry.name).slice(1).toLowerCase();
        if (entryExtension !== normalizedOptions.extension) {
          continue;
        }
      }
      const nameMatch = entry.name.toLowerCase().includes(normalizedQuery);
      let contentMatch = false;
      let preview = "";

      if (!nameMatch && normalizedOptions.includeContent) {
        try {
          const stats = await fs.stat(absolutePath);
          if (stats.size <= MAX_FILE_BYTES_FOR_CONTENT_SEARCH) {
            const buffer = await fs.readFile(absolutePath);
            if (looksTextLike(buffer)) {
              const contents = buffer.toString("utf8");
              const index = contents.toLowerCase().indexOf(normalizedQuery);
              if (index >= 0) {
                contentMatch = true;
                const start = Math.max(index - 70, 0);
                const end = Math.min(index + 110, contents.length);
                preview = escapePreview(contents.slice(start, end)).replace(/\r?\n/g, " ");
              }
            }
          }
        } catch (error) {
          continue;
        }
      }

      if (nameMatch || contentMatch) {
        if (nameMatch) {
          filenameMatches += 1;
        } else {
          contentMatches += 1;
        }
        results.push({
          path: relativePath,
          name: entry.name,
          extension: path.extname(entry.name).slice(1).toLowerCase() || null,
          matchType: nameMatch ? "filename" : "content",
          preview
        });
      }
    }
  }

  await walk(rootDirectory, 0);
  return {
    results,
    meta: {
      totalResults: results.length,
      filenameMatches,
      contentMatches,
      searchedFiles,
      truncated: results.length >= normalizedOptions.maxResults || searchedFiles >= MAX_SEARCHED_FILES
    }
  };
}

async function getFilePreview(rootDirectory, relativePath) {
  const safeTargetPath = path.resolve(rootDirectory, relativePath);
  const relative = path.relative(rootDirectory, safeTargetPath);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw Object.assign(new Error("Unsafe path"), {
      publicMessage: "That file is outside the selected directory."
    });
  }

  const stats = await fs.stat(safeTargetPath);
  if (!stats.isFile()) {
    throw Object.assign(new Error("Not a file"), {
      publicMessage: "Only file previews are supported."
    });
  }

  const buffer = await fs.readFile(safeTargetPath);
  if (!looksTextLike(buffer)) {
    throw Object.assign(new Error("Binary file"), {
      publicMessage: "That file looks binary, so RepoTools will not preview it."
    });
  }

  return {
    path: relative,
    content: escapePreview(buffer.subarray(0, MAX_PREVIEW_BYTES).toString("utf8")),
    truncated: buffer.length > MAX_PREVIEW_BYTES
  };
}

module.exports = {
  searchProjectFiles,
  getFilePreview,
  looksTextLike,
  normalizeSearchOptions
};
