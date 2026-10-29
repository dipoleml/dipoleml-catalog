param(
  [string]$Target = (Get-Location).Path
)

node scripts/install-apply.js --target $Target
