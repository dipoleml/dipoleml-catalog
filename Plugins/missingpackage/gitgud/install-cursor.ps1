# GitGud Installer for Cursor IDE (Windows)
# Run this script in PowerShell as Administrator if needed

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   GitGud Installer for Cursor IDE   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js $nodeVersion detected" -ForegroundColor Green

    $versionNum = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNum -lt 14) {
        Write-Host "⚠️  Node.js version is too old (v$versionNum)" -ForegroundColor Yellow
        Write-Host "Please upgrade to Node.js v14 or later"
        exit 1
    }
}
catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js (v14 or later) from https://nodejs.org"
    exit 1
}

# Define paths
$GitGudInstallDir = "$env:USERPROFILE\.gitgud-cursor"
$GitGudDataDir = "$env:USERPROFILE\.gitgud"
$CursorHooksFile = "$env:USERPROFILE\.cursor\hooks.json"
$CursorRulesDir = "$env:USERPROFILE\.cursor\rules"
$RepoUrl = "https://github.com/anthropics/gitgud.git"

# Step 1: Clone or update the GitGud repository
Write-Host ""
Write-Host "Step 1: Installing GitGud..." -ForegroundColor Yellow

if (Test-Path $GitGudInstallDir) {
    Write-Host "Updating existing GitGud installation..."
    Push-Location $GitGudInstallDir
    try {
        git pull origin main
    }
    catch {
        Write-Host "⚠️  Could not update. Continuing with existing version." -ForegroundColor Yellow
    }
    Pop-Location
}
else {
    Write-Host "Cloning GitGud repository..."
    try {
        git clone $RepoUrl $GitGudInstallDir
    }
    catch {
        Write-Host "❌ Failed to clone repository" -ForegroundColor Red
        Write-Host "Please check your internet connection and try again"
        exit 1
    }
}

Write-Host "✓ GitGud files installed to $GitGudInstallDir" -ForegroundColor Green

# Step 2: Create data directory
Write-Host ""
Write-Host "Step 2: Setting up data directory..." -ForegroundColor Yellow

if (!(Test-Path $GitGudDataDir)) {
    New-Item -ItemType Directory -Path $GitGudDataDir -Force | Out-Null
    Write-Host "✓ Created data directory at $GitGudDataDir" -ForegroundColor Green
}
else {
    Write-Host "✓ Data directory already exists at $GitGudDataDir" -ForegroundColor Green
}

# Step 3: Install hook
Write-Host ""
Write-Host "Step 3: Installing Cursor hook..." -ForegroundColor Yellow

# Create .cursor directory if it doesn't exist
$cursorDir = Split-Path $CursorHooksFile -Parent
if (!(Test-Path $cursorDir)) {
    New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null
}

# Backup existing hooks.json if it exists
if (Test-Path $CursorHooksFile) {
    $backupFile = "$CursorHooksFile.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $CursorHooksFile $backupFile
    Write-Host "Backed up existing hooks.json"
}

# Merge hook configuration
$hookCommand = "node `"$GitGudInstallDir\cursor\gitgud-hook.js`""

if (Test-Path $CursorHooksFile) {
    # Parse existing hooks.json
    $config = Get-Content $CursorHooksFile -Raw | ConvertFrom-Json

    if (!$config.hooks) {
        $config | Add-Member -NotePropertyName "hooks" -NotePropertyValue @{} -Force
    }
    if (!$config.hooks.beforeSubmitPrompt) {
        $config.hooks | Add-Member -NotePropertyName "beforeSubmitPrompt" -NotePropertyValue @() -Force
    }

    # Check if GitGud hook already exists
    $exists = $config.hooks.beforeSubmitPrompt | Where-Object { $_.command -like "*gitgud-hook.js*" }

    if (!$exists) {
        $config.hooks.beforeSubmitPrompt += @{command = $hookCommand}
        Write-Host "Added GitGud hook"
    }
    else {
        Write-Host "GitGud hook already exists"
    }

    $config | ConvertTo-Json -Depth 10 | Set-Content $CursorHooksFile
}
else {
    # Create new hooks.json
    @{
        version = 1
        hooks = @{
            beforeSubmitPrompt = @(
                @{command = $hookCommand}
            )
        }
    } | ConvertTo-Json -Depth 10 | Set-Content $CursorHooksFile
}

Write-Host "✓ Cursor hook installed" -ForegroundColor Green

# Step 4: Install Cursor Rule
Write-Host ""
Write-Host "Step 4: Installing Cursor Rule..." -ForegroundColor Yellow

Write-Host "Where would you like to install the GitGud rule?"
Write-Host "  1) Global (all projects) - $CursorRulesDir"
Write-Host "  2) Current project only - .cursor\rules"
Write-Host "  3) Skip rule installation"
Write-Host ""
$ruleChoice = Read-Host "Choose [1-3]"

switch ($ruleChoice) {
    "1" {
        $rulesDir = $CursorRulesDir
        if (!(Test-Path $rulesDir)) {
            New-Item -ItemType Directory -Path $rulesDir -Force | Out-Null
        }
        Copy-Item "$GitGudInstallDir\cursor\rules\gitgud.mdc" "$rulesDir\" -Force
        Write-Host "✓ Rule installed globally" -ForegroundColor Green
    }
    "2" {
        $rulesDir = ".cursor\rules"
        if (!(Test-Path $rulesDir)) {
            New-Item -ItemType Directory -Path $rulesDir -Force | Out-Null
        }
        Copy-Item "$GitGudInstallDir\cursor\rules\gitgud.mdc" "$rulesDir\" -Force
        Write-Host "✓ Rule installed in current project" -ForegroundColor Green
    }
    "3" {
        Write-Host "⚠️  Skipping rule installation" -ForegroundColor Yellow
        Write-Host "Note: Without the rule, the AI won't enforce training mode"
    }
    default {
        Write-Host "Invalid choice. Skipping rule installation." -ForegroundColor Red
    }
}

# Step 5: Test installation
Write-Host ""
Write-Host "Step 5: Testing installation..." -ForegroundColor Yellow

try {
    $testInput = '{"prompt":"test"}'
    $testInput | node "$GitGudInstallDir\cursor\gitgud-hook.js" 2>$null | Out-Null
    Write-Host "✓ Hook test successful" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Hook test failed - please check Node.js installation" -ForegroundColor Yellow
}

# Step 6: Create PowerShell functions
Write-Host ""
Write-Host "Step 6: Setting up commands..." -ForegroundColor Yellow

$profilePath = $PROFILE
Write-Host "Would you like to add GitGud commands to your PowerShell profile?"
Write-Host "Profile location: $profilePath"
$addCommands = Read-Host "Add commands? [y/N]"

if ($addCommands -eq 'y' -or $addCommands -eq 'Y') {
    # Ensure profile exists
    if (!(Test-Path $profilePath)) {
        New-Item -ItemType File -Path $profilePath -Force | Out-Null
    }

    # Remove old functions if they exist
    $content = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
    $content = $content -replace '# GitGud commands for Cursor.*?# End GitGud commands', '' -replace '\r?\n\r?\n+', "`r`n`r`n"

    # Add new functions
    $functions = @"

# GitGud commands for Cursor
function gg-complete { node "$GitGudInstallDir\scripts\complete-task.js" @args }
function gg-stats { node "$GitGudInstallDir\scripts\stats.js" @args }
function gg-config { node "$GitGudInstallDir\scripts\config.js" @args }
function gg-reset { node "$GitGudInstallDir\scripts\reset.js" @args }
# End GitGud commands
"@

    $content = $content.TrimEnd() + "`r`n" + $functions
    Set-Content -Path $profilePath -Value $content

    Write-Host "✓ Commands added to PowerShell profile" -ForegroundColor Green
    Write-Host "Run '. `$PROFILE' or restart PowerShell to use them"
}
else {
    Write-Host "You can manually run commands from: $GitGudInstallDir\scripts\"
}

# Create batch files for easier command line access
Write-Host ""
Write-Host "Creating batch files for command prompt access..."

$batchDir = "$GitGudInstallDir\bin"
if (!(Test-Path $batchDir)) {
    New-Item -ItemType Directory -Path $batchDir -Force | Out-Null
}

# Create batch files
@"
@echo off
node "$GitGudInstallDir\scripts\complete-task.js" %*
"@ | Set-Content "$batchDir\gg-complete.bat"

@"
@echo off
node "$GitGudInstallDir\scripts\stats.js" %*
"@ | Set-Content "$batchDir\gg-stats.bat"

@"
@echo off
node "$GitGudInstallDir\scripts\config.js" %*
"@ | Set-Content "$batchDir\gg-config.bat"

@"
@echo off
node "$GitGudInstallDir\scripts\reset.js" %*
"@ | Set-Content "$batchDir\gg-reset.bat"

Write-Host "✓ Batch files created in $batchDir" -ForegroundColor Green

# Done!
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✓ GitGud installation complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  gg-complete - Mark current task as complete"
Write-Host "  gg-stats    - View your statistics"
Write-Host "  gg-config   - Configure GitGud settings"
Write-Host "  gg-reset    - Reset data (use with caution)"
Write-Host ""
Write-Host "GitGud will assign a coding task every 10 requests."
Write-Host "Complete tasks to maintain your streak!"
Write-Host ""
Write-Host "To uninstall, run: $GitGudInstallDir\uninstall-cursor.ps1"
Write-Host ""
Write-Host "Note: You may need to add $batchDir to your PATH"
Write-Host "to use commands from Command Prompt."