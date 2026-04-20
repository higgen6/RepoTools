const { execFile } = require("child_process");

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

async function openPath(targetPath) {
  if (process.platform === "win32") {
    await execFileAsync("explorer.exe", [targetPath]);
    return;
  }

  if (process.platform === "darwin") {
    await execFileAsync("open", [targetPath]);
    return;
  }

  await execFileAsync("xdg-open", [targetPath]);
}

async function revealPath(targetPath) {
  if (process.platform === "win32") {
    await execFileAsync("explorer.exe", ["/select,", targetPath]);
    return;
  }

  if (process.platform === "darwin") {
    await execFileAsync("open", ["-R", targetPath]);
    return;
  }

  await execFileAsync("xdg-open", [targetPath]);
}

module.exports = {
  openPath,
  revealPath
};
