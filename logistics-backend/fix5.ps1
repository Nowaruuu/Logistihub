$f = 'views\admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f)

# ── FIX 1: De-ID hidden inline panel (first occurrence of each lp-* id) ───────
$ids = @('id="lp-frame"','id="lp-nav-bar"','id="lp-logo-box"','id="lp-company-name"','id="lp-hero-section"','id="lp-hero-title"','id="lp-page-body"')
foreach ($id in $ids) {
  $dead = $id -replace 'id="lp-', 'id="hidden-lp-'
  $idx = $c.IndexOf($id)
  if ($idx -ge 0) { $c = $c.Substring(0,$idx)+$dead+$c.Substring($idx+$id.Length); Write-Host "OK $id" }
  else { Write-Host "NF $id" }
}

# ── FIX 2: Rename first updateLandingPreview so fix2 version wins ─────────────
$sig1 = 'function updateLandingPreview() {'
$dead1 = 'function _ulpLegacy() {'
$i1 = $c.IndexOf($sig1)
if ($i1 -ge 0) { $c = $c.Substring(0,$i1)+$dead1+$c.Substring($i1+$sig1.Length); Write-Host "OK renamed first ulp" }
else { Write-Host "NF first ulp" }

# ── FIX 3: Remove button - send background_url:null when cleared ──────────────
# Current: only sends background_url if bgBase64 starts with data:
# Fix: also send null when bgBase64 is empty (user removed image)
$oldBgLogic = "    if (bgBase64 && bgBase64.startsWith('data:')) payload.background_url = bgBase64;"
$newBgLogic = "    if (bgBase64 && bgBase64.startsWith('data:')) payload.background_url = bgBase64;`n    else if (!bgBase64) payload.background_url = null;"
if ($c.Contains($oldBgLogic)) {
  $c = $c.Replace($oldBgLogic, $newBgLogic)
  Write-Host "OK remove fix"
} else { Write-Host "NF remove logic" }

# ── FIX 4: Track bg image in setInterval signature so preview updates ─────────
$oldSig = "  var sig = pageCol + '|' + heroCol + '|' + cname;"
$newSig = "  var bgPrevEl = document.getElementById('bg-preview'); var bgHas = bgPrevEl && bgPrevEl.dataset.base64 ? '1':'0';`n  var sig = pageCol + '|' + heroCol + '|' + cname + '|' + bgHas;"
if ($c.Contains($oldSig)) {
  $c = $c.Replace($oldSig, $newSig)
  Write-Host "OK bgHas tracking"
} else { Write-Host "NF sig line" }

[System.IO.File]::WriteAllText($f, $c)
Write-Host "Done."
