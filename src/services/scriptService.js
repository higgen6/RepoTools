const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const treeKill = require("tree-kill");
const { SCRIPT_LOG_LIMIT } = require("../config/constants");
const { addScriptHistoryEntry } = require("./historyService");

const state = {
  process: null,
  scriptName: null,
  cwd: null,
  startedAt: null,
  completedAt: null,
  exitCode: null,
  status: "idle",
  logs: [],
  stopRequested: false
};

function resolveNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveScriptInvocation(scriptName) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", "run", scriptName]
    };
  }

  return {
    command: resolveNpmCommand(),
    args: ["run", scriptName]
  };
}

function appendLog(line) {
  if (!line) {
    return;
  }

  state.logs.push(line);
  if (state.logs.length > SCRIPT_LOG_LIMIT) {
    state.logs.splice(0, state.logs.length - SCRIPT_LOG_LIMIT);
  }
}

async function validateScript(rootDirectory, scriptName) {
  if (!scriptName) {
    throw Object.assign(new Error("Missing script name"), {
      publicMessage: "Choose a script before running it."
    });
  }

  const packageJsonPath = path.join(rootDirectory, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const scripts = packageJson && packageJson.scripts ? packageJson.scripts : {};

  if (!Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
    throw Object.assign(new Error("Unknown script"), {
      publicMessage: "That script is not available in this project."
    });
  }
}

async function startScript(rootDirectory, scriptName) {
  if (state.process) {
    throw Object.assign(new Error("Script already running"), {
      publicMessage: "Another script is already running. Stop it first."
    });
  }

  await validateScript(rootDirectory, scriptName);

  state.logs = [];
  const invocation = resolveScriptInvocation(scriptName);
  state.process = spawn(invocation.command, invocation.args, {
    cwd: rootDirectory,
    windowsHide: true,
    env: process.env
  });
  state.scriptName = scriptName;
  state.cwd = rootDirectory;
  state.startedAt = new Date().toISOString();
  state.completedAt = null;
  state.exitCode = null;
  state.status = "running";
  state.stopRequested = false;

  appendLog(`> npm run ${scriptName}`);

  state.process.stdout.on("data", (chunk) => {
    appendLog(chunk.toString());
  });

  state.process.stderr.on("data", (chunk) => {
    appendLog(chunk.toString());
  });

  state.process.on("error", (error) => {
    appendLog(`Process error: ${error.message}`);
    state.status = "failed";
    state.completedAt = new Date().toISOString();
    state.exitCode = null;
    addScriptHistoryEntry(state.cwd, {
      scriptName: state.scriptName,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      exitCode: state.exitCode,
      status: state.status
    });
    state.process = null;
  });

  state.process.on("close", (code) => {
    state.status = state.stopRequested ? "stopped" : (code === 0 ? "succeeded" : "failed");
    state.completedAt = new Date().toISOString();
    state.exitCode = code;
    appendLog(`Process exited with code ${code}`);
    addScriptHistoryEntry(state.cwd, {
      scriptName: state.scriptName,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      exitCode: state.exitCode,
      status: state.status
    });
    state.process = null;
    state.stopRequested = false;
  });
}

function stopRunningScript() {
  if (!state.process || !state.process.pid) {
    throw Object.assign(new Error("Nothing running"), {
      publicMessage: "There is no running script to stop."
    });
  }

  return new Promise((resolve, reject) => {
    const pid = state.process.pid;
    state.stopRequested = true;
    treeKill(pid, "SIGTERM", (error) => {
      if (error) {
        state.stopRequested = false;
        return reject(
          Object.assign(new Error("Failed to stop script"), {
            publicMessage: "RepoTools could not stop that script."
          })
        );
      }

      appendLog("Stop requested by user.");
      resolve();
    });
  });
}

function getScriptSnapshot() {
  return {
    scriptName: state.scriptName,
    cwd: state.cwd,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    exitCode: state.exitCode,
    status: state.status,
    isRunning: Boolean(state.process),
    logs: state.logs.join("")
  };
}

module.exports = {
  startScript,
  stopRunningScript,
  getScriptSnapshot
};
