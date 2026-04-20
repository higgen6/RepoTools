# RepoTools

RepoTools is a local-first web app for inspecting and working with one selected project folder at a time. It runs on `localhost`, uses a simple Express + EJS stack, and focuses on practical repo utilities instead of trying to be a full IDE or platform.

## Why it exists

RepoTools is meant to be a focused local utility:

- choose one directory
- inspect common project signals
- run npm scripts explicitly
- compare env keys safely
- search files without opening an editor
- check common local dev ports

It is intentionally not a hosted SaaS app, not a terminal replacement, and not an IDE.

## Features

- Set and validate an active working directory
- Keep a short recent-directories list in local JSON storage
- Save a short list of bookmarked folders
- Keep a small local settings profile for search and port refresh defaults
- Detect common project signals:
  - Git repositories
  - Node, Python, and Docker markers
  - README files, env files, and lockfiles
- Show a compact Git working-tree breakdown when available
- Read and run `package.json` scripts explicitly
- Stream script logs with safe polling
- Collapse or expand script logs
- Stop running scripts
- Keep lightweight recent script history per directory
- Compare `.env`, `.env.example`, and `.env.local` by keys only
- Inspect common local ports and optionally stop a process with confirmation
- Search filenames and lightweight text content inside the selected directory
- Show search counts and scan limits for responsiveness
- Filter search by extension and max results
- Preview small text files safely without turning the app into an editor
- Open the active folder or reveal a selected file in the system file browser

## Stack

- Node.js 20+
- Express
- EJS
- Tailwind CSS
- Minimal vanilla JavaScript

## Quick Start

### One-command setup

After cloning the repo, run:

```bash
npm run setup
```

That installs dependencies and builds the CSS bundle.

Then start the app:

```bash
npm start
```

Open [http://localhost:4280](http://localhost:4280)

### Helper scripts

If you prefer a small installer script:

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-local.ps1
```

macOS / Linux:

```bash
sh ./scripts/install-local.sh
```

## Development

Run the app server:

```bash
npm run dev
```

Watch Tailwind changes in a second terminal:

```bash
npm run watch:css
```

Run the service-layer tests:

```bash
npm test
```

Run the full local verification used for repo hygiene:

```bash
npm run check
```

## Project Structure

```text
RepoTools/
  .github/
    ISSUE_TEMPLATE/
    workflows/
  data/
    .gitkeep
    app-state.json (local runtime file, ignored in git)
  public/
    app.js
    styles.css
  scripts/
    install-local.ps1
    install-local.sh
  src/
    config/
      constants.js
    controllers/
      dashboardController.js
    routes/
      dashboardRoutes.js
    services/
      dashboardService.js
      directoryService.js
      envService.js
      gitService.js
      historyService.js
      inspectService.js
      portService.js
      scriptService.js
      searchService.js
      storageService.js
      systemDialogService.js
      systemPathService.js
    styles/
      tailwind.css
  test/
    *.test.js
  views/
    partials/
      footer.ejs
      head.ejs
      header.ejs
    dashboard.ejs
    error.ejs
  .editorconfig
  .gitattributes
  .gitignore
  LICENSE
  package.json
  postcss.config.js
  server.js
  tailwind.config.js
  README.md
```

## GitHub-ready notes

This repo now includes:

- `.gitignore` for dependencies, local state, and machine-specific files
- `LICENSE` with the MIT license
- `.editorconfig` and `.gitattributes` for cleaner cross-platform edits
- GitHub issue templates and a PR template
- a small GitHub Actions workflow that runs tests and the CSS build

## Notes

- RepoTools stores lightweight local state in `data/app-state.json`.
- Local state includes recent directories, bookmarks, script history, and a few small settings.
- Script execution is always explicit. Nothing runs automatically when a directory is selected.
- Env values are never shown in the UI. Only key names are compared.
- File search excludes heavy directories such as `node_modules`, `.git`, `dist`, `build`, and `coverage`.
- File previews are limited to small text-safe previews.
- Port stopping is intentionally explicit and uses a confirmation prompt in the browser.
- On supported systems, the `Browse` button opens a native folder picker. Manual path entry remains available everywhere.
- Opening folders and revealing files use the local operating system file browser.

## Windows-first behavior

The app is designed to work well on Windows first:

- npm scripts run through a conservative `cmd.exe /c npm run ...` flow
- process termination uses `tree-kill` for safer child-process cleanup
- port inspection uses `netstat` and `tasklist` on Windows
- the native folder picker uses a Windows folder dialog triggered from the local server

There is also a basic Unix fallback for port inspection using `lsof`.

## Security approach

- Active directory paths are validated before being stored
- File previews are restricted to the selected directory
- Script names are validated against `package.json`
- Env values are not exposed
- No authentication, cloud sync, telemetry, or auto-execution is included
