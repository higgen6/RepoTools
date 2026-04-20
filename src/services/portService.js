const { execFile } = require("child_process");
const treeKill = require("tree-kill");
const { COMMON_PORTS } = require("../config/constants");

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function getWindowsPorts() {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"]);
  const lines = stdout.split(/\r?\n/);
  const usedPorts = new Map();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] !== "TCP") {
      continue;
    }

    const localAddress = parts[1];
    const state = parts[3];
    const pid = Number(parts[4]);

    if (!["LISTENING", "ESTABLISHED"].includes(state)) {
      continue;
    }

    const portText = localAddress.split(":").pop();
    const port = Number(portText);
    if (!Number.isInteger(port) || !COMMON_PORTS.includes(port)) {
      continue;
    }

    if (!usedPorts.has(port)) {
      usedPorts.set(port, { port, inUse: true, pid, processName: null });
    }
  }

  if (usedPorts.size === 0) {
    return COMMON_PORTS.map((port) => ({ port, inUse: false, pid: null, processName: null }));
  }

  const pidList = [...new Set([...usedPorts.values()].map((entry) => entry.pid).filter(Boolean))];
  const processMap = await getWindowsProcessNames(pidList);

  return COMMON_PORTS.map((port) => {
    const entry = usedPorts.get(port);
    if (!entry) {
      return { port, inUse: false, pid: null, processName: null };
    }

    return {
      ...entry,
      processName: processMap.get(entry.pid) || null
    };
  });
}

async function getWindowsProcessNames(pidList) {
  if (!pidList.length) {
    return new Map();
  }

  const { stdout } = await execFileAsync("tasklist", ["/FO", "CSV", "/NH"]);
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const processMap = new Map();

  for (const line of lines) {
    const columns = line.split('","').map((item) => item.replace(/^"|"$/g, ""));
    const imageName = columns[0];
    const pid = Number(columns[1]);

    if (pidList.includes(pid)) {
      processMap.set(pid, imageName);
    }
  }

  return processMap;
}

async function getUnixPorts() {
  const { stdout } = await execFileAsync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]);
  const lines = stdout.split(/\r?\n/).slice(1);
  const usedPorts = new Map();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) {
      continue;
    }

    const processName = parts[0];
    const pid = Number(parts[1]);
    const localAddress = parts[8];
    const portText = localAddress.split(":").pop();
    const port = Number(portText);

    if (!COMMON_PORTS.includes(port) || usedPorts.has(port)) {
      continue;
    }

    usedPorts.set(port, { port, inUse: true, pid, processName });
  }

  return COMMON_PORTS.map((port) => usedPorts.get(port) || {
    port,
    inUse: false,
    pid: null,
    processName: null
  });
}

async function getPortSnapshot() {
  try {
    if (process.platform === "win32") {
      return await getWindowsPorts();
    }

    return await getUnixPorts();
  } catch (error) {
    return COMMON_PORTS.map((port) => ({
      port,
      inUse: false,
      pid: null,
      processName: null,
      unavailable: true
    }));
  }
}

function stopProcessByPid(pid) {
  return new Promise((resolve, reject) => {
    treeKill(pid, "SIGTERM", (error) => {
      if (error) {
        return reject(
          Object.assign(new Error("Failed to stop process"), {
            publicMessage: "RepoTools could not stop that process."
          })
        );
      }
      resolve();
    });
  });
}

module.exports = {
  getPortSnapshot,
  stopProcessByPid
};
