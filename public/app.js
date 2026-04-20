(function () {
  const state = {
    scriptPollingId: null,
    logsCollapsed: false,
    selectedPreviewPath: null,
    settings: window.__REPO_TOOLS_SETTINGS__ || {}
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function setBanner(elementId, message, variant) {
    const banner = document.getElementById(elementId);
    if (!banner) {
      return;
    }

    if (!message) {
      banner.classList.add("hidden");
      banner.textContent = "";
      return;
    }

    banner.textContent = message;
    banner.classList.remove("hidden", "bg-red-50", "text-red-700", "bg-emerald-50", "text-emerald-700");
    if (variant === "error") {
      banner.classList.add("bg-red-50", "text-red-700");
    } else {
      banner.classList.add("bg-emerald-50", "text-emerald-700");
    }

    window.clearTimeout(banner._dismissTimer);
    banner._dismissTimer = window.setTimeout(() => {
      banner.classList.add("hidden");
    }, 3500);
  }

  function dismissInitialBanners() {
    document.querySelectorAll("[data-auto-dismiss='true']").forEach((banner) => {
      window.setTimeout(() => {
        banner.remove();
      }, 3500);
    });
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Request failed.");
    }
    return payload;
  }

  function setButtonBusy(button, busyText, isBusy) {
    if (!button) {
      return;
    }

    if (isBusy) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      button.textContent = busyText;
      button.disabled = true;
      button.classList.add("opacity-60");
      return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove("opacity-60");
  }

  function renderScriptStatus(snapshot) {
    const statusLabel = $("#script-status-label");
    const logOutput = $("#script-log-output");
    const meta = $("#script-meta");
    const stopButton = $("#stop-script-button");
    const toggleLogsButton = $("#toggle-script-logs-button");
    const logPanel = $("#script-log-panel");

    if (!statusLabel || !logOutput || !meta || !stopButton || !toggleLogsButton || !logPanel) {
      return;
    }

    statusLabel.textContent = snapshot.status || "idle";
    meta.textContent = snapshot.scriptName
      ? `${snapshot.scriptName}${snapshot.cwd ? " • " + snapshot.cwd : ""}`
      : "No script run yet.";
    logOutput.textContent = snapshot.logs || "Script output will appear here.";
    stopButton.disabled = !snapshot.isRunning;
    stopButton.classList.toggle("opacity-50", !snapshot.isRunning);

    if (snapshot.isRunning && state.logsCollapsed) {
      state.logsCollapsed = false;
    }

    logPanel.classList.toggle("hidden", state.logsCollapsed);
    toggleLogsButton.textContent = state.logsCollapsed ? "Expand Logs" : "Collapse Logs";

    if (!snapshot.isRunning && state.scriptPollingId) {
      window.clearInterval(state.scriptPollingId);
      state.scriptPollingId = null;
    }
  }

  async function refreshScriptStatus() {
    try {
      const payload = await fetchJson("/api/scripts/status");
      renderScriptStatus(payload.status);
    } catch (error) {
      setBanner("script-feedback", error.message, "error");
    }
  }

  async function handleScriptRun(event) {
    const button = event.currentTarget;
    const scriptName = button.dataset.scriptName;

    try {
      setBanner("script-feedback", "", "success");
      setButtonBusy(button, "Starting...", true);
      await fetchJson("/scripts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptName })
      });
      setBanner("script-feedback", `Started ${scriptName}.`, "success");
      await refreshScriptStatus();
      if (!state.scriptPollingId) {
        state.scriptPollingId = window.setInterval(refreshScriptStatus, 2000);
      }
    } catch (error) {
      setBanner("script-feedback", error.message, "error");
    } finally {
      setButtonBusy(button, "Starting...", false);
    }
  }

  async function handleScriptStop() {
    const stopButton = $("#stop-script-button");

    try {
      setButtonBusy(stopButton, "Stopping...", true);
      await fetchJson("/scripts/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setBanner("script-feedback", "Stop requested.", "success");
      await refreshScriptStatus();
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setBanner("script-feedback", error.message, "error");
    } finally {
      setButtonBusy(stopButton, "Stopping...", false);
    }
  }

  async function refreshPorts() {
    const container = $("#ports-grid");
    const refreshButton = $("#refresh-ports-button");
    if (!container) {
      return;
    }

    container.innerHTML = '<div class="text-sm text-slate">Refreshing ports...</div>';
    setButtonBusy(refreshButton, "Refreshing...", true);

    try {
      const payload = await fetchJson("/api/ports");
      container.innerHTML = payload.ports.map((entry) => {
        const statusClass = entry.inUse ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";
        const details = entry.inUse
          ? `${entry.processName || "Unknown process"}${entry.pid ? ` • PID ${entry.pid}` : ""}`
          : "Available";
        const button = entry.inUse && entry.pid
          ? `<button class="button-secondary stop-port-button" data-pid="${entry.pid}" data-port="${entry.port}">Stop</button>`
          : "";
        return `
          <div class="rounded-xl border px-4 py-3 ${statusClass}">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold">Port ${entry.port}</div>
                <div class="mt-1 text-xs opacity-80">${details}</div>
              </div>
              ${button}
            </div>
          </div>
        `;
      }).join("");

      container.querySelectorAll(".stop-port-button").forEach((button) => {
        button.addEventListener("click", async () => {
          const pid = Number(button.dataset.pid);
          const port = button.dataset.port;
          const confirmed = window.confirm(`Stop the process using port ${port}?`);
          if (!confirmed) {
            return;
          }

          try {
            setButtonBusy(button, "Stopping...", true);
            await fetchJson("/api/ports/stop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pid })
            });
            setBanner("port-feedback", `Stopped PID ${pid}.`, "success");
            await refreshPorts();
          } catch (error) {
            setBanner("port-feedback", error.message, "error");
            setButtonBusy(button, "Stopping...", false);
          }
        });
      });
    } catch (error) {
      container.innerHTML = '<div class="text-sm text-red-700">Unable to inspect ports.</div>';
      setBanner("port-feedback", error.message, "error");
    } finally {
      setButtonBusy(refreshButton, "Refreshing...", false);
    }
  }

  function renderSearchSummary(meta, includeContent, extension) {
    const summary = $("#search-summary");
    if (!summary) {
      return;
    }

    if (!meta) {
      summary.textContent = "Enter a file or text query to search.";
      return;
    }

    const parts = [
      `${meta.totalResults} result${meta.totalResults === 1 ? "" : "s"}`,
      `${meta.filenameMatches} filename match${meta.filenameMatches === 1 ? "" : "es"}`
    ];

    if (includeContent) {
      parts.push(`${meta.contentMatches} content match${meta.contentMatches === 1 ? "" : "es"}`);
    }

    parts.push(`scanned ${meta.searchedFiles} file${meta.searchedFiles === 1 ? "" : "s"}`);

    if (extension) {
      parts.push(`filtered to .${extension}`);
    }

    if (meta.truncated) {
      parts.push("limited for responsiveness");
    }

    summary.textContent = parts.join(" • ");
  }

  function setSelectedPreviewPath(pathValue) {
    state.selectedPreviewPath = pathValue;
    const revealButton = $("#reveal-file-button");
    if (!revealButton) {
      return;
    }
    revealButton.disabled = !pathValue;
    revealButton.classList.toggle("opacity-50", !pathValue);
  }

  async function handleSearch(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const query = form.query.value.trim();
    const includeContent = form.includeContent.checked;
    const extension = form.extension.value.trim().replace(/^\./, "");
    const maxResults = form.maxResults.value;
    const resultsNode = $("#search-results");

    if (!query) {
      resultsNode.innerHTML = '<div class="text-sm text-slate">Enter a file or text query to search.</div>';
      renderSearchSummary(null, includeContent, extension);
      return;
    }

    resultsNode.innerHTML = '<div class="text-sm text-slate">Searching...</div>';
    setButtonBusy(submitButton, "Searching...", true);
    setSelectedPreviewPath(null);

    try {
      const params = new URLSearchParams({
        query,
        includeContent: String(includeContent),
        extension,
        maxResults
      });
      const payload = await fetchJson(`/api/search?${params.toString()}`);
      renderSearchSummary(payload.meta, includeContent, extension);

      if (!payload.results.length) {
        resultsNode.innerHTML = '<div class="text-sm text-slate">No matches found.</div>';
        return;
      }

      resultsNode.innerHTML = payload.results.map((item) => `
        <button class="search-result block w-full rounded-xl border border-line bg-white px-4 py-3 text-left hover:bg-mist" data-path="${encodeURIComponent(item.path)}">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-ink">${item.name}</div>
              <div class="mt-1 truncate font-mono text-xs text-slate">${item.path}</div>
            </div>
            <div class="flex items-center gap-2">
              ${item.extension ? `<span class="chip">.${item.extension}</span>` : ""}
              <span class="chip">${item.matchType}</span>
            </div>
          </div>
          ${item.preview ? `<div class="mt-2 text-xs leading-5 text-slate">${item.preview}</div>` : ""}
        </button>
      `).join("");

      resultsNode.querySelectorAll(".search-result").forEach((button) => {
        button.addEventListener("click", async () => {
          resultsNode.querySelectorAll(".search-result").forEach((result) => {
            result.classList.remove("border-pine", "bg-pineSoft");
          });
          button.classList.add("border-pine", "bg-pineSoft");

          try {
            const encodedPath = button.dataset.path;
            const decodedPath = decodeURIComponent(encodedPath);
            const previewPayload = await fetchJson(`/api/preview?path=${encodedPath}`);
            const previewNode = $("#file-preview");
            previewNode.textContent = previewPayload.preview.content;
            $("#file-preview-path").textContent = previewPayload.preview.path;
            $("#file-preview-meta").textContent = previewPayload.preview.truncated
              ? "Preview truncated for safety."
              : "Preview loaded.";
            setSelectedPreviewPath(decodedPath);
          } catch (error) {
            setBanner("search-feedback", error.message, "error");
          }
        });
      });
    } catch (error) {
      setBanner("search-feedback", error.message, "error");
      resultsNode.innerHTML = '<div class="text-sm text-red-700">Search failed.</div>';
      renderSearchSummary(null, includeContent, extension);
    } finally {
      setButtonBusy(submitButton, "Searching...", false);
    }
  }

  async function handleDirectoryPick() {
    const button = $("#pick-directory-button");
    const input = $("#directoryPath");

    try {
      setButtonBusy(button, "Opening...", true);
      const payload = await fetchJson("/api/directory/pick");
      if (!payload.selectedPath) {
        setBanner("directory-feedback", "No folder was selected.", "error");
        return;
      }

      input.value = payload.selectedPath;
      input.focus();
      setBanner("directory-feedback", "Folder selected. Save it to make it active.", "success");
    } catch (error) {
      setBanner("directory-feedback", error.message, "error");
    } finally {
      setButtonBusy(button, "Opening...", false);
    }
  }

  async function handleOpenDirectory() {
    const button = $("#open-directory-button");

    try {
      setButtonBusy(button, "Opening...", true);
      await fetchJson("/api/system/open-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      setBanner("directory-feedback", "Folder opened.", "success");
    } catch (error) {
      setBanner("directory-feedback", error.message, "error");
    } finally {
      setButtonBusy(button, "Opening...", false);
    }
  }

  async function handleRevealFile() {
    const button = $("#reveal-file-button");
    if (!state.selectedPreviewPath) {
      return;
    }

    try {
      setButtonBusy(button, "Opening...", true);
      await fetchJson("/api/system/reveal-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: state.selectedPreviewPath })
      });
      setBanner("search-feedback", "File location opened.", "success");
    } catch (error) {
      setBanner("search-feedback", error.message, "error");
    } finally {
      setButtonBusy(button, "Opening...", false);
    }
  }

  function wireCopyPath() {
    const button = $("#copy-directory-button");
    const pathNode = $("#active-directory-path");
    if (!button || !pathNode || !navigator.clipboard) {
      return;
    }

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pathNode.textContent.trim());
        setBanner("directory-feedback", "Path copied.", "success");
      } catch (error) {
        setBanner("directory-feedback", "Unable to copy the path.", "error");
      }
    });
  }

  function wireRecentDirectoryButtons() {
    document.querySelectorAll("[data-recent-directory]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById("directoryPath");
        input.value = button.dataset.recentDirectory;
        input.focus();
      });
    });
  }

  function wireLogToggle() {
    const button = $("#toggle-script-logs-button");
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      state.logsCollapsed = !state.logsCollapsed;
      const logPanel = $("#script-log-panel");
      logPanel.classList.toggle("hidden", state.logsCollapsed);
      button.textContent = state.logsCollapsed ? "Expand Logs" : "Collapse Logs";
    });
  }

  function wireSettingsDefaults() {
    const searchForm = $("#search-form");
    if (!searchForm) {
      return;
    }

    searchForm.includeContent.checked = state.settings.searchMode === "content";
    if (state.settings.searchMaxResults) {
      searchForm.maxResults.value = String(state.settings.searchMaxResults);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    dismissInitialBanners();

    document.querySelectorAll(".run-script-button").forEach((button) => {
      button.addEventListener("click", handleScriptRun);
    });

    const stopButton = $("#stop-script-button");
    if (stopButton) {
      stopButton.addEventListener("click", handleScriptStop);
    }

    const refreshPortsButton = $("#refresh-ports-button");
    if (refreshPortsButton) {
      refreshPortsButton.addEventListener("click", refreshPorts);
      if (state.settings.autoRefreshPorts) {
        refreshPorts();
      }
    }

    const searchForm = $("#search-form");
    if (searchForm) {
      searchForm.addEventListener("submit", handleSearch);
    }

    const pickDirectoryButton = $("#pick-directory-button");
    if (pickDirectoryButton) {
      pickDirectoryButton.addEventListener("click", handleDirectoryPick);
    }

    const openDirectoryButton = $("#open-directory-button");
    if (openDirectoryButton) {
      openDirectoryButton.addEventListener("click", handleOpenDirectory);
    }

    const revealFileButton = $("#reveal-file-button");
    if (revealFileButton) {
      revealFileButton.addEventListener("click", handleRevealFile);
    }

    wireCopyPath();
    wireRecentDirectoryButtons();
    wireLogToggle();
    wireSettingsDefaults();
    setSelectedPreviewPath(null);
    refreshScriptStatus();
  });
})();
