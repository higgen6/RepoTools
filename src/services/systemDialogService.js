const { execFile } = require("child_process");

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function openWindowsFolderPicker() {
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Choose a project folder for RepoTools'",
    "$dialog.ShowNewFolderButton = $false",
    "$result = $dialog.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }"
  ].join("; ");

  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-STA", "-Command", script]);
  return stdout.trim();
}

async function openMacFolderPicker() {
  const { stdout } = await execFileAsync("osascript", [
    "-e",
    'POSIX path of (choose folder with prompt "Choose a project folder for RepoTools")'
  ]);
  return stdout.trim();
}

async function openLinuxFolderPicker() {
  const { stdout } = await execFileAsync("zenity", ["--file-selection", "--directory", "--title=Choose a project folder for RepoTools"]);
  return stdout.trim();
}

async function openDirectoryPicker() {
  try {
    if (process.platform === "win32") {
      return await openWindowsFolderPicker();
    }

    if (process.platform === "darwin") {
      return await openMacFolderPicker();
    }

    return await openLinuxFolderPicker();
  } catch (error) {
    throw Object.assign(new Error("Folder picker unavailable"), {
      publicMessage: "A native folder picker is not available on this system, so please enter the path manually."
    });
  }
}

module.exports = {
  openDirectoryPicker
};
