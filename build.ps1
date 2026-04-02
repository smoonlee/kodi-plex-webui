<#
.SYNOPSIS
    Builds the webinterface.plex Kodi addon zip package.
.DESCRIPTION
    Reads the version from addon.xml and creates a distributable zip under dist/.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$addonDir = Join-Path $PSScriptRoot 'webinterface.plex'
$addonXml = Join-Path $addonDir 'addon.xml'
$distDir = Join-Path $PSScriptRoot 'dist'

# Extract version from addon.xml
[xml]$xml = Get-Content $addonXml -Raw
$version = $xml.addon.version
if (-not $version) {
    Write-Error 'Could not read version from addon.xml'
    exit 1
}

Write-Host "Building webinterface.plex v$version ..." -ForegroundColor Cyan

# Ensure dist/ exists
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

$zipName = "webinterface.plex-v${version}.zip"
$zipPath = Join-Path $distDir $zipName

# Remove old zip if present
if (Test-Path $zipPath) {
    $removed = $false
    for ($attempt = 1; $attempt -le 8; $attempt++) {
        try {
            Remove-Item $zipPath -Force -ErrorAction Stop
            $removed = $true
            break
        } catch {
            if ($attempt -eq 8) {
                throw
            }
            Start-Sleep -Milliseconds 300
        }
    }

    if (-not $removed -and (Test-Path $zipPath)) {
        throw "Could not remove existing archive: $zipPath"
    }
}

# Build a staging tree so zip root is exactly: webinterface.plex/
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("kodi-plex-webui-build-" + [guid]::NewGuid().ToString("N"))
$stagingAddonDir = Join-Path $stagingRoot 'webinterface.plex'

New-Item -ItemType Directory -Path $stagingAddonDir -Force | Out-Null
Copy-Item -Path (Join-Path $addonDir '*') -Destination $stagingAddonDir -Recurse -Force

try {
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $stagingRoot,
        $zipPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    # Validate expected addon marker exists in zip
    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $hasAddonXml = $false
        foreach ($entry in $zip.Entries) {
            if ($entry.FullName -eq 'webinterface.plex/addon.xml') {
                $hasAddonXml = $true
                break
            }
        }
        if (-not $hasAddonXml) {
            throw "Invalid package layout: missing webinterface.plex/addon.xml in archive"
        }
    } finally {
        $zip.Dispose()
    }
} finally {
    if (Test-Path $stagingRoot) {
        Remove-Item -Path $stagingRoot -Recurse -Force
    }
}

$size = (Get-Item $zipPath).Length / 1KB
Write-Host "Created: dist/$zipName ($([math]::Round($size, 1)) KB)" -ForegroundColor Green
