$f = 'views\admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f)

# 1. Restore the function name
$c = $c.Replace('function _ulpLegacy() {', 'function updateLandingPreview() {')
Write-Host "Restored updateLandingPreview name"

# 2. Update the getElementById calls inside the function to match renamed DOM IDs
$fixes = @(
  @("getElementById('lp-nav-bar')",       "getElementById('hidden-lp-nav-bar')")
  @("getElementById('lp-page-body')",      "getElementById('hidden-lp-page-body')")
  @("getElementById('lp-hero-section')",   "getElementById('hidden-lp-hero-section')")
  @("getElementById('lp-company-name')",   "getElementById('hidden-lp-company-name')")
  @("getElementById('lp-hero-title')",     "getElementById('hidden-lp-hero-title')")
  @("getElementById('lp-logo-box')",       "getElementById('hidden-lp-logo-box')")
)
foreach ($pair in $fixes) {
  if ($c.Contains($pair[0])) {
    $c = $c.Replace($pair[0], $pair[1])
    Write-Host "Fixed: $($pair[0])"
  } else {
    Write-Host "NF:    $($pair[0])"
  }
}

# 3. Fix bgSrc check - also allow non-data: URLs (loaded from DB)
$oldCheck = "if (bgSrc && bgSrc.startsWith('data:')) {"
$newCheck = "if (bgSrc && bgSrc.length > 5) {"
if ($c.Contains($oldCheck)) {
  $c = $c.Replace($oldCheck, $newCheck)
  Write-Host "Fixed bgSrc check (allow any non-empty URL)"
} else {
  Write-Host "NF bgSrc check"
}

[System.IO.File]::WriteAllText($f, $c)
Write-Host "Done."
