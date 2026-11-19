<#
.SYNOPSIS
  Installs the OpenCode Go Usage plugin for OpenCode Desktop.

.DESCRIPTION
  Downloads a released build and places it in the global OpenCode plugin folder,
  `%USERPROFILE%\.config\opencode\plugins\opencode-usage-gui` (or the folder under
  `XDG_CONFIG_HOME`). OpenCode discovers that folder automatically, so no
  `opencode.json` edit is needed.

  The folder is replaced in place, so running this again is also the update path.

.EXAMPLE
  irm https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/latest/download/install.ps1 | iex

.EXAMPLE
  .\install.ps1 -Version 0.1.0
#>
[CmdletBinding()]
param(
  # A release version (`0.1.0`, `v0.1.0`) or `latest`.
  [string]$Version = "latest",
  # OpenCode's config folder. Defaults to `$XDG_CONFIG_HOME/opencode` or `~/.config/opencode`.
  [string]$ConfigDir,
  # A local release archive, used to test the installer. Not needed by users.
  [string]$Archive
)

$ErrorActionPreference = "Stop"
$repo = "nguyenhoanhson797/opencode-usage-gui"
$name = "opencode-usage-gui"

function Write-Step([string]$text) {
  Write-Host "  $text"
}

if (-not $ConfigDir) {
  $base = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { Join-Path $HOME ".config" }
  $ConfigDir = Join-Path $base "opencode"
}
$pluginsDir = Join-Path $ConfigDir "plugins"
$target = Join-Path $pluginsDir $name
$staged = Join-Path $pluginsDir ".$name.new"
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("$name-" + [guid]::NewGuid().ToString("n"))

Write-Host ""
Write-Host "OpenCode Go Usage for OpenCode Desktop"

try {
  New-Item -ItemType Directory -Force -Path $pluginsDir, $temp | Out-Null

  if ($Archive) {
    $zip = $Archive
    Write-Step "Using $zip"
  } else {
    if ($Version -eq "latest") {
      $url = "https://github.com/$repo/releases/latest/download/$name.zip"
    } else {
      $tag = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
      $url = "https://github.com/$repo/releases/download/$tag/$name.zip"
    }
    $zip = Join-Path $temp "$name.zip"
    Write-Step "Downloading $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  }

  Write-Step "Unpacking"
  Expand-Archive -Path $zip -DestinationPath $temp -Force
  $source = Join-Path $temp $name
  if (-not (Test-Path (Join-Path $source "package.json"))) { $source = $temp }

  $manifest = Join-Path $source "package.json"
  $bundle = Join-Path $source "dist\gui-experimental.cjs"
  if (-not (Test-Path $manifest) -or -not (Test-Path $bundle)) {
    throw "The download is not a built plugin (package.json and dist/gui-experimental.cjs are required)."
  }

  Write-Step "Installing to $target"
  if (Test-Path $staged) { Remove-Item $staged -Recurse -Force }
  Copy-Item -Path $source -Destination $staged -Recurse -Force
  try {
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    Move-Item -Path $staged -Destination $target
  } catch {
    if (Test-Path $staged) { Remove-Item $staged -Recurse -Force -ErrorAction SilentlyContinue }
    throw "OpenCode Desktop is holding the installed files. Close Desktop, run this again, then reopen it."
  }

  $installed = Get-Content $manifest -Raw | ConvertFrom-Json
  Write-Host ""
  Write-Host "Installed $($installed.name) $($installed.version)"
  Write-Host ""
  Write-Host "  1. Open OpenCode Desktop (reopen it if it was running)."
  Write-Host "  2. Settings > Extensions > Plugins lists 'usage-desktop'."
  Write-Host "  3. Open a session and use the Usage tab, the chip, or /usage."
  Write-Host ""
  Write-Host "No config edit: OpenCode loads $pluginsDir automatically."
  Write-Host "Remove later with: Remove-Item '$target' -Recurse"
} finally {
  if (Test-Path $temp) { Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue }
}
