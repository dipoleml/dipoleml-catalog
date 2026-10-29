# GitGud Uninstaller for Cursor IDE (Windows)
# Run this script in PowerShell

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  GitGud Uninstaller for Cursor IDE  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Define paths
$GitGudInstallDir = "$env:USERPROFILE\.gitgud-cursor"
$GitGudDataDir = "$env:USERPROFILE\.gitgud"
$CursorHooksFile = "$env:USERPROFILE\.cursor\hooks.json"
$CursorRulesDir = "$env:USERPROFILE\.cursor\rules"

# Step 1: Remove hook from Cursor
Write-Host "Step 1: Removing Cursor hook..." -ForegroundColor Yellow

if (Test-Path $CursorHooksFile) {
    try {
        $config = Get-Content $CursorHooksFile -Raw | ConvertFrom-Json

        if ($config.hooks -and $config.hooks.beforeSubmitPrompt) {
            $config.hooks.beforeSubmitPrompt = @($config.hooks.beforeSubmitPrompt | Where-Object {
                !($_.command -like "*gitgud-hook.js*")
            })

            $config | ConvertTo-Json -Depth 10 | Set-Content $CursorHooksFile
            Write-Host "Removed GitGud hook from hooks.json"
        }
    }
    catch {
        Write-Host "Could not remove hook: $_" -ForegroundColor Yellow
    }
}
else {
    Write-Host "No hooks.json found"
}

Write-Host "✓ Hook removal complete" -ForegroundColor Green

# Step 2: Remove Cursor Rule
Write-Host ""
Write-Host "Step 2: Removing Cursor Rules..." -ForegroundColor Yellow

# Remove global rule
if (Test-Path "$CursorRulesDir\gitgud.mdc") {
    Remove-Item "$CursorRulesDir\gitgud.mdc" -Force
    Write-Host "✓ Removed global rule" -ForegroundColor Green
}

# Check for project rule
if (Test-Path ".cursor\rules\gitgud.mdc") {
    Write-Host "Found project-specific rule in current directory"
    $removeProject = Read-Host "Remove project rule? [y/N]"
    if ($removeProject -eq 'y' -or $removeProject -eq 'Y') {
        Remove-Item ".cursor\rules\gitgud.mdc" -Force
        Write-Host "✓ Removed project rule" -ForegroundColor Green
    }
}

# Step 3: Remove PowerShell functions
Write-Host ""
Write-Host "Step 3: Removing PowerShell functions..." -ForegroundColor Yellow

$profilePath = $PROFILE
if (Test-Path $profilePath) {
    $content = Get-Content $profilePath -Raw
    $content = $content -replace '# GitGud commands for Cursor.*?# End GitGud commands', '' -replace '\r?\n\r?\n+', "`r`n`r`n"
    Set-Content -Path $profilePath -Value $content.TrimEnd()
    Write-Host "✓ Removed commands from PowerShell profile" -ForegroundColor Green
}
else {
    Write-Host "No PowerShell profile found"
}

# Step 4: Ask about data
Write-Host ""
Write-Host "Step 4: Data management..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Your GitGud data is stored in: $GitGudDataDir" -ForegroundColor Yellow
Write-Host "This includes your streak, achievements, and statistics."
Write-Host ""
$deleteData = Read-Host "Do you want to DELETE all GitGud data? [y/N]"

if ($deleteData -eq 'y' -or $deleteData -eq 'Y') {
    Write-Host "⚠️  Warning: This will permanently delete all your GitGud progress!" -ForegroundColor Yellow
    $confirm = Read-Host "Are you sure? Type 'DELETE' to confirm"

    if ($confirm -eq 'DELETE') {
        Remove-Item $GitGudDataDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Deleted all GitGud data" -ForegroundColor Green
    }
    else {
        Write-Host "Data deletion cancelled"
    }
}
else {
    Write-Host "Your data has been preserved in $GitGudDataDir"
    Write-Host "You can manually delete it later if needed"
}

# Step 5: Remove installation directory
Write-Host ""
Write-Host "Step 5: Removing GitGud installation..." -ForegroundColor Yellow

if (Test-Path $GitGudInstallDir) {
    Remove-Item $GitGudInstallDir -Recurse -Force
    Write-Host "✓ Removed GitGud installation directory" -ForegroundColor Green
}
else {
    Write-Host "Installation directory not found"
}

# Done!
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✓ GitGud has been uninstalled" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

if (Test-Path $GitGudDataDir) {
    Write-Host "Note: Your data is still available in $GitGudDataDir"
    Write-Host "You can reinstall GitGud later to continue your streak!"
}

Write-Host ""
Write-Host "Thanks for using GitGud! Keep coding! 💪"