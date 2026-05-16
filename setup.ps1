# Run this once after saving index.html into this folder.
# It patches the chat widget's API call to use the server-side proxy.

param(
    [string]$IndexPath = "$PSScriptRoot\index.html"
)

if (-not (Test-Path $IndexPath)) {
    Write-Host ""
    Write-Host "ERROR: index.html not found at: $IndexPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "  1. Open the index.html document attached in your Claude conversation"
    Write-Host "  2. Save it as index.html inside this folder:"
    Write-Host "     C:\Users\Fitsum\Desktop\ProsperingCitizenWeb\"
    Write-Host "  3. Re-run this script"
    Write-Host ""
    exit 1
}

$content = Get-Content $IndexPath -Raw -Encoding UTF8

# Patch 1: Route chat widget through the secure server-side proxy
$old1 = "fetch('https://api.anthropic.com/v1/messages'"
$new1 = "fetch('/api/chat'"
$already1 = $content -match [regex]::Escape($new1)

# Patch 2: Update model to current version (server enforces this anyway, but keep in sync)
$old2 = "claude-sonnet-4-20250514"
$new2 = "claude-sonnet-4-6"
$already2 = $content -match [regex]::Escape($new2)

if ($already1 -and $already2) {
    Write-Host "index.html already patched — nothing to do." -ForegroundColor Green
    exit 0
}

if (-not $already1) {
    if ($content -notmatch [regex]::Escape($old1)) {
        Write-Host "WARNING: Could not find the fetch URL to patch. Check index.html manually." -ForegroundColor Yellow
    } else {
        $content = $content -replace [regex]::Escape($old1), $new1
        Write-Host "[OK] Chat widget URL patched: /api/chat" -ForegroundColor Green
    }
}

if (-not $already2) {
    $content = $content -replace [regex]::Escape($old2), $new2
    Write-Host "[OK] Model updated: claude-sonnet-4-6" -ForegroundColor Green
}

Set-Content $IndexPath -Value $content -Encoding UTF8 -NoNewline
Write-Host ""
Write-Host "Done! index.html is ready for deployment." -ForegroundColor Cyan
