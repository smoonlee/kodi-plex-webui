#!/usr/bin/env pwsh
# Build script — packages the webinterface.plex addon into a zip for Kodi installation
# Usage: .\build.ps1

$ErrorActionPreference = 'Stop'

$addonDir = Join-Path $PSScriptRoot 'webinterface.plex'
$outputDir = Join-Path $PSScriptRoot 'dist'
$stagingDir = Join-Path $PSScriptRoot 'dist' 'webinterface.plex'

# Extract version from addon.xml
$addonXml = [xml](Get-Content (Join-Path $addonDir 'addon.xml'))
$version = $addonXml.addon.version
Write-Host "Version: $version" -ForegroundColor Cyan

$zipName = "webinterface.plex-v${version}.zip"
$zipPath = Join-Path $outputDir $zipName

# Generate changelog if we're in a git repo
$changelogScript = Join-Path $PSScriptRoot 'changelog.ps1'
$isGitRepo = (git rev-parse --git-dir 2>$null)
if ($isGitRepo -and (Test-Path $changelogScript)) {
    Write-Host "Generating changelog..." -ForegroundColor Cyan
    & $changelogScript
}

# Copy CHANGELOG.md into the addon folder so it ships in the zip
$changelogSrc = Join-Path $PSScriptRoot 'CHANGELOG.md'
$changelogDest = Join-Path $addonDir 'CHANGELOG.md'
if (Test-Path $changelogSrc) {
    Copy-Item $changelogSrc $changelogDest -Force
    Write-Host "Bundled CHANGELOG.md into addon" -ForegroundColor Cyan
}

# Clean previous build
if (Test-Path $outputDir) {
    Remove-Item $outputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outputDir | Out-Null

# Copy addon to staging
Write-Host "Copying to staging..." -ForegroundColor Cyan
Copy-Item $addonDir $stagingDir -Recurse

# Concatenate JS files in load order
Write-Host "Concatenating JS files..." -ForegroundColor Cyan
$jsOrder = @(
    'kodi-api.js', 'state.js', 'views.js', 'detail.js', 'player.js',
    'search.js', 'livetv.js', 'ratings.js', 'websocket.js', 'settings.js',
    'playlists.js', 'genres.js', 'photos.js', 'shortcuts.js', 'app-boot.js'
)
$jsDir = Join-Path $stagingDir 'js'
$bundlePath = Join-Path $jsDir 'app.bundle.js'
$bundleContent = $jsOrder | ForEach-Object {
    $file = Join-Path $jsDir $_
    if (Test-Path $file) {
        "// --- $_ ---"
        Get-Content $file -Raw
        ""
    }
}
$bundleContent | Set-Content $bundlePath -Encoding UTF8

# Remove individual JS files from staging
$jsOrder | ForEach-Object {
    $file = Join-Path $jsDir $_
    if (Test-Path $file) { Remove-Item $file }
}

# Update index.html to use single bundled script
$indexPath = Join-Path $stagingDir 'index.html'
$indexHtml = Get-Content $indexPath -Raw
# Replace all individual script tags with single bundle tag
$indexHtml = $indexHtml -replace '(?s)\s*<script src="js/kodi-api\.js"></script>.*?<script src="js/app-boot\.js"></script>', "`n    <script src=`"js/app.bundle.js`"></script>"
$indexHtml | Set-Content $indexPath -Encoding UTF8
Write-Host "  Bundled $($jsOrder.Count) JS files -> js/app.bundle.js" -ForegroundColor Cyan

# Create the zip (Kodi expects the addon folder as the root inside the zip)
Write-Host "Packaging addon..." -ForegroundColor Cyan
Compress-Archive -Path $stagingDir -DestinationPath $zipPath -CompressionLevel Optimal

# Clean staging
Remove-Item $stagingDir -Recurse -Force

$size = (Get-Item $zipPath).Length / 1KB
Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "  Output: $zipPath"
Write-Host "  Size:   $([math]::Round($size, 1)) KB"
Write-Host ""
Write-Host "Install in Kodi:" -ForegroundColor Yellow
Write-Host "  1. Copy $zipName to your OSMC device"
Write-Host "  2. Settings -> Add-ons -> Install from zip file"
Write-Host "  3. Select $zipName"
Write-Host "  4. Settings -> Services -> Control -> Web interface -> Select 'Plex Web Interface'"
