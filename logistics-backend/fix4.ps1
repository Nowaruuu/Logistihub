$f = 'views\admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f)
$changed = $false

# De-ID the FIRST occurrence of each lp-* id (the hidden inline panel from fix-dashboard.ps1)
# The fixed floating panel's elements come SECOND in DOM so they won't be touched
$ids = @(
  'id="lp-frame"',
  'id="lp-nav-bar"',
  'id="lp-logo-box"',
  'id="lp-company-name"',
  'id="lp-hero-section"',
  'id="lp-hero-title"',
  'id="lp-page-body"'
)

foreach ($id in $ids) {
  $deadId = $id -replace 'id="lp-', 'id="hidden-lp-'
  $idx = $c.IndexOf($id)
  if ($idx -ge 0) {
    $c = $c.Substring(0, $idx) + $deadId + $c.Substring($idx + $id.Length)
    Write-Host "OK  $id"
    $changed = $true
  } else {
    Write-Host "NF  $id"
  }
}

# Also rename first updateLandingPreview so the one from fix2.ps1 (at end of body) wins
$first = 'function updateLandingPreview() {'
$renamed = 'function _updateLandingPreviewLegacy() {'
$idx2 = $c.IndexOf($first)
if ($idx2 -ge 0) {
  $c = $c.Substring(0, $idx2) + $renamed + $c.Substring($idx2 + $first.Length)
  Write-Host "OK  renamed first updateLandingPreview"
  $changed = $true
} else {
  Write-Host "NF  first updateLandingPreview"
}

if ($changed) {
  [System.IO.File]::WriteAllText($f, $c)
  Write-Host "File written."
} else {
  Write-Host "No changes made."
}
