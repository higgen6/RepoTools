const fs = require("fs/promises");
const path = require("path");
const { MAX_BOOKMARKED_DIRECTORIES, MAX_RECENT_DIRECTORIES } = require("../config/constants");

async function validateDirectoryPath(inputPath) {
  if (!inputPath) {
    throw Object.assign(new Error("Missing path"), {
      publicMessage: "Enter a folder path before saving."
    });
  }

  const resolvedPath = path.resolve(inputPath);
  let stats;

  try {
    stats = await fs.stat(resolvedPath);
  } catch (error) {
    throw Object.assign(new Error("Path not accessible"), {
      publicMessage: "That folder does not exist or cannot be accessed."
    });
  }

  if (!stats.isDirectory()) {
    throw Object.assign(new Error("Not a directory"), {
      publicMessage: "That path points to a file. Please choose a folder."
    });
  }

  try {
    await fs.access(resolvedPath);
  } catch (error) {
    throw Object.assign(new Error("No access"), {
      publicMessage: "RepoTools cannot access that folder."
    });
  }

  return resolvedPath;
}

function mergeRecentDirectories(recentDirectories, nextDirectory) {
  const unique = [nextDirectory, ...recentDirectories.filter((item) => item !== nextDirectory)];
  return unique.slice(0, MAX_RECENT_DIRECTORIES);
}

function mergeBookmarkedDirectories(bookmarkedDirectories, nextDirectory) {
  const unique = [nextDirectory, ...bookmarkedDirectories.filter((item) => item !== nextDirectory)];
  return unique.slice(0, MAX_BOOKMARKED_DIRECTORIES);
}

function removeDirectoryFromList(list, directoryPath) {
  return list.filter((item) => item !== directoryPath);
}

module.exports = {
  validateDirectoryPath,
  mergeRecentDirectories,
  mergeBookmarkedDirectories,
  removeDirectoryFromList
};
