$ErrorActionPreference = "Stop"

Write-Host "Installing RepoTools dependencies and building assets..." -ForegroundColor Cyan
npm run setup

Write-Host ""
Write-Host "RepoTools is ready." -ForegroundColor Green
Write-Host "Start it with: npm start" -ForegroundColor Green
