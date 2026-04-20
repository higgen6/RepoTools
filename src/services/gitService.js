const { execFile } = require("child_process");

function execGit(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseTrackingSummary(statusOutput) {
  const firstLine = statusOutput.split(/\r?\n/)[0] || "";
  const branchMatch = firstLine.match(/^## (.+?)(?:\.\.\.([^\s]+))?(?: \[(.+)\])?$/);
  const branch = branchMatch ? branchMatch[1] : null;
  const upstream = branchMatch ? branchMatch[2] || null : null;
  const tracking = branchMatch ? branchMatch[3] || "" : "";
  const aheadMatch = tracking.match(/ahead (\d+)/);
  const behindMatch = tracking.match(/behind (\d+)/);

  return {
    branch,
    upstream,
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0
  };
}

function parseStatusEntries(statusOutput) {
  const lines = statusOutput.split(/\r?\n/).slice(1).filter(Boolean);
  const counts = {
    staged: 0,
    modified: 0,
    untracked: 0,
    deleted: 0,
    renamed: 0,
    conflicts: 0
  };

  for (const line of lines) {
    const x = line[0];
    const y = line[1];

    if (x === "?" && y === "?") {
      counts.untracked += 1;
      continue;
    }

    if (x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D")) {
      counts.conflicts += 1;
      continue;
    }

    if (x !== " " && x !== "?") {
      counts.staged += 1;
    }

    if (y !== " ") {
      if (y === "D" || x === "D") {
        counts.deleted += 1;
      } else if (x === "R" || y === "R") {
        counts.renamed += 1;
      } else {
        counts.modified += 1;
      }
      continue;
    }

    if (x === "D") {
      counts.deleted += 1;
    } else if (x === "R") {
      counts.renamed += 1;
    }
  }

  return counts;
}

async function getGitSummary(rootDirectory, hasGitDirectory) {
  if (!hasGitDirectory) {
    try {
      await execGit(["rev-parse", "--is-inside-work-tree"], rootDirectory);
    } catch (error) {
      return {
        branch: null,
        statusLine: null,
        changedFiles: 0,
        clean: null,
        isGitRepo: false
      };
    }
  }

  try {
    await execGit(["rev-parse", "--is-inside-work-tree"], rootDirectory);
  } catch (error) {
    return {
      branch: null,
      statusLine: null,
      changedFiles: 0,
      clean: null,
      isGitRepo: false
    };
  }

  try {
    const [{ stdout: branchOut }, { stdout: statusOut }, { stdout: porcelainOut }] = await Promise.all([
      execGit(["branch", "--show-current"], rootDirectory),
      execGit(["status", "--short"], rootDirectory),
      execGit(["status", "--porcelain=1", "-b"], rootDirectory)
    ]);

    const trimmedStatus = statusOut.trim();
    const changedFiles = trimmedStatus ? trimmedStatus.split(/\r?\n/).length : 0;
    const trackingSummary = parseTrackingSummary(porcelainOut.trim());
    const statusCounts = parseStatusEntries(porcelainOut.trim());
    const trackingParts = [];

    if (trackingSummary.upstream) {
      trackingParts.push(`tracking ${trackingSummary.upstream}`);
    }
    if (trackingSummary.ahead) {
      trackingParts.push(`ahead ${trackingSummary.ahead}`);
    }
    if (trackingSummary.behind) {
      trackingParts.push(`behind ${trackingSummary.behind}`);
    }

    return {
      branch: branchOut.trim() || trackingSummary.branch || null,
      upstream: trackingSummary.upstream,
      ahead: trackingSummary.ahead,
      behind: trackingSummary.behind,
      trackingSummary: trackingParts.length ? trackingParts.join(", ") : null,
      statusLine: changedFiles === 0 ? "Working tree clean" : `${changedFiles} changed item${changedFiles === 1 ? "" : "s"}`,
      changedFiles,
      statusCounts,
      clean: changedFiles === 0,
      isGitRepo: true
    };
  } catch (error) {
    return {
      branch: null,
      upstream: null,
      ahead: 0,
      behind: 0,
      trackingSummary: null,
      statusLine: "Git data unavailable",
      changedFiles: null,
      statusCounts: null,
      clean: null,
      isGitRepo: true
    };
  }
}

module.exports = {
  getGitSummary,
  parseTrackingSummary,
  parseStatusEntries
};
