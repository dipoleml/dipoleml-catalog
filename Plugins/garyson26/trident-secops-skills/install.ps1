#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Copies the canonical skills/ tree into an agent's discovery directory.
.DESCRIPTION
    Feature parity with install.sh. Replaces each skill directory
    individually, so unrelated skills already present in the destination
    are left alone.
.EXAMPLE
    ./install.ps1 -Platform codex
.EXAMPLE
    ./install.ps1 -Platform claude -Yes
.EXAMPLE
    ./install.ps1 -Platform codex -Project C:\path\to\your\project
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('codex', 'claude', 'gemini')]
    [string]$Platform,

    [string]$Project,

    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
if (-not (Test-Path (Join-Path $repoRoot 'skills')) -or
    -not (Test-Path (Join-Path $repoRoot 'gemini-extension.json'))) {
    Write-Error 'Must be run from the repository root (skills/ and gemini-extension.json not found).'
    exit 1
}

$rel = switch ($Platform) {
    'codex' { '.agents/skills' }
    'claude' { '.claude/skills' }
    'gemini' { '.gemini/skills' }
}

$targetBase = if ($Project) { $Project } else { $HOME }
$dest = Join-Path $targetBase $rel
$source = Join-Path $repoRoot 'skills'
$skillDirs = @(Get-ChildItem -Path $source -Directory)

Write-Host "Platform:    $Platform"
Write-Host "Source:      $source"
Write-Host "Destination: $dest"
Write-Host "Skills:      $($skillDirs.Count)"
Write-Host ''

if (-not $Yes) {
    $reply = Read-Host 'Proceed? [y/N]'
    if ($reply -notmatch '^(y|Y|yes|YES)$') {
        Write-Host 'Aborted.'
        exit 1
    }
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($dir in $skillDirs) {
    $targetDir = Join-Path $dest $dir.Name
    if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
    Copy-Item -Recurse -Path $dir.FullName -Destination $targetDir
}

Write-Host "Installed $($skillDirs.Count) skills to $dest"
