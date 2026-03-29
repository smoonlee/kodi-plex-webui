#!/usr/bin/env pwsh
# Generates CHANGELOG.md from git tags and commit history
# Usage: .\changelog.ps1
#
# Commit message conventions (follows Conventional Commits):
#   feat: ...    → Features
#   fix: ...     → Bug Fixes
#   docs: ...    → Documentation
#   style: ...   → Styling
#   refactor: .. → Refactoring
#   perf: ...    → Performance
#   chore: ...   → Chores
#
# Workflow:
#   1. Make commits using conventional prefixes
#   2. Run .\changelog.ps1 to regenerate CHANGELOG.md
#   3. Bump version in addon.xml
#   4. Tag: git tag v1.0.0
#   5. Push: git push --tags  (triggers GitHub Actions release)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$changelogPath = Join-Path $repoRoot 'CHANGELOG.md'
$addonXml = [xml](Get-Content (Join-Path $repoRoot 'webinterface.plex' 'addon.xml'))
$currentVersion = $addonXml.addon.version

# Check git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not installed or not in PATH"
    exit 1
}

# Check we're in a git repo
$gitDir = git rev-parse --git-dir 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not a git repository. Run 'git init' first."
    exit 1
}

# Get all tags sorted by version (descending)
$tags = git tag --sort=-version:refname 2>&1 | Where-Object { $_ -match '^v\d' }

# Category mapping
$categories = [ordered]@{
    'Features'      = @()
    'Bug Fixes'     = @()
    'Documentation' = @()
    'Styling'       = @()
    'Performance'   = @()
    'Refactoring'   = @()
    'Chores'        = @()
    'Other'         = @()
}

function Get-Category($message) {
    if ($message -match '^feat(\(.+?\))?:\s*') { return 'Features' }
    if ($message -match '^fix(\(.+?\))?:\s*') { return 'Bug Fixes' }
    if ($message -match '^docs(\(.+?\))?:\s*') { return 'Documentation' }
    if ($message -match '^style(\(.+?\))?:\s*') { return 'Styling' }
    if ($message -match '^perf(\(.+?\))?:\s*') { return 'Performance' }
    if ($message -match '^refactor(\(.+?\))?:\s*') { return 'Refactoring' }
    if ($message -match '^chore(\(.+?\))?:\s*') { return 'Chores' }
    return 'Other'
}

function Clean-Message($message) {
    # Strip the conventional commit prefix
    return $message -replace '^(feat|fix|docs|style|perf|refactor|chore)(\(.+?\))?:\s*', ''
}

function Format-Section($fromRef, $toRef, $version, $date) {
    # Get commits between refs
    if ($fromRef) {
        $commits = git log --pretty=format:"%h %s" "$fromRef..$toRef" 2>&1
    } else {
        $commits = git log --pretty=format:"%h %s" $toRef 2>&1
    }

    if (-not $commits) { return "" }

    # Reset categories
    $cats = [ordered]@{}
    foreach ($key in $categories.Keys) { $cats[$key] = @() }

    foreach ($line in $commits) {
        if ($line -match '^([a-f0-9]+)\s+(.+)$') {
            $hash = $Matches[1]
            $msg = $Matches[2]
            $cat = Get-Category $msg
            $clean = Clean-Message $msg
            $cats[$cat] += "- $clean ($hash)"
        }
    }

    $output = "## [$version] - $date`n`n"
    foreach ($cat in $cats.Keys) {
        if ($cats[$cat].Count -gt 0) {
            $output += "### $cat`n`n"
            foreach ($entry in $cats[$cat]) {
                $output += "$entry`n"
            }
            $output += "`n"
        }
    }

    return $output
}

# ─── Build the changelog ─────────────────────────────────────────────────

$changelog = "# Changelog`n`nAll notable changes to the Kodi Plex Web Interface.`n`n"
$changelog += "Format based on [Keep a Changelog](https://keepachangelog.com/).`n`n"

if ($tags.Count -gt 0) {
    # Unreleased section (HEAD to latest tag)
    $latestTag = $tags[0]
    $unreleasedCommits = git log --oneline "$latestTag..HEAD" 2>&1
    if ($unreleasedCommits) {
        $section = Format-Section $latestTag "HEAD" "Unreleased (v$currentVersion)" (Get-Date -Format 'yyyy-MM-dd')
        if ($section) { $changelog += $section }
    }

    # Each tag pair
    for ($i = 0; $i -lt $tags.Count; $i++) {
        $tag = $tags[$i]
        $prevTag = if ($i + 1 -lt $tags.Count) { $tags[$i + 1] } else { $null }
        $version = $tag -replace '^v', ''
        $date = git log -1 --format="%ai" $tag 2>&1
        $date = ($date -split ' ')[0]

        $section = Format-Section $prevTag $tag $version $date
        if ($section) { $changelog += $section }
    }
} else {
    # No tags yet — dump all commits as unreleased
    $section = Format-Section $null "HEAD" "Unreleased (v$currentVersion)" (Get-Date -Format 'yyyy-MM-dd')
    if ($section) {
        $changelog += $section
    } else {
        $changelog += "## [Unreleased (v$currentVersion)]`n`nInitial development.`n"
    }
}

# Write file
$changelog | Out-File -FilePath $changelogPath -Encoding utf8 -Force
Write-Host "Changelog generated: $changelogPath" -ForegroundColor Green
