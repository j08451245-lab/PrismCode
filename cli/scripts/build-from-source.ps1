param(
  [string]$InstallDir = "$env:LOCALAPPDATA\PrismCode"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "Building PrismCode from source..." -ForegroundColor Cyan

# Check if Bun is installed
if (-not (Get-Command "bun" -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Bun..." -ForegroundColor Yellow
  powershell -c "iwr -useb https://bun.sh/install.ps1 | iex"
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";$env:USERPROFILE\.bun\bin"
}

Write-Host "Installing dependencies..." -ForegroundColor Gray
Set-Location -LiteralPath $RepoRoot
bun install

Write-Host "Building binary..." -ForegroundColor Gray
bun run build:binary

# Copy to install dir
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "$RepoRoot\dist\prismcode.exe" -Destination "$InstallDir\prismcode.exe" -Force

Write-Host "PrismCode built and installed to $InstallDir" -ForegroundColor Green
