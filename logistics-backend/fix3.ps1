$f = 'views\admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f)

# ── FIX 1: Clear the hidden inline panel's inner IDs so they don't conflict ───
# The inline panel (from fix-dashboard.ps1) was hidden but still has same IDs.
# Replace the inline lp-* IDs with dead versions.
$conflictIds = @(
  'id="lp-nav-bar"',
  'id="lp-logo-box"',
  'id="lp-company-name"',
  'id="lp-hero-section"',
  'id="lp-hero-title"',
  'id="lp-page-body"'
)
foreach ($id in $conflictIds) {
  $deadId = $id -replace 'id="lp-', 'id="lp-dead-'
  # Only replace the FIRST occurrence (the hidden inline panel comes first in DOM)
  $idx = $c.IndexOf($id)
  if ($idx -ge 0) {
    $c = $c.Substring(0,$idx) + $deadId + $c.Substring($idx + $id.Length)
    Write-Host "De-IDed first: $id -> $deadId"
  } else {
    Write-Host "NOT FOUND: $id"
  }
}

# ── FIX 2: Replace the updateLandingPreview in the fixed panel script ──────────
# Scope all getElementById to #lp-fixed-panel to avoid any future conflicts
$oldFn = 'function updateLandingPreview() {
  var pageCol = document.getElementById(''set-page-bg-hex'').value || ''#ffffff'';
  var heroCol = document.getElementById(''set-hero-color-hex'').value || ''#0f172a'';
  var cname   = (document.getElementById(''set-company'')||{}).value || ''Company'';

  var logoPrev = document.getElementById(''logo-preview'');
  var bgPrev   = document.getElementById(''bg-preview'');
  var logoSrc  = (logoPrev && logoPrev.dataset.base64) ||
                 (logoPrev && logoPrev.querySelector(''img'') && logoPrev.querySelector(''img'').src) || null;
  var bgSrc    = (bgPrev && bgPrev.dataset.base64) || null;

  // Nav + page body
  var nav  = document.getElementById(''lp-nav-bar'');
  var body = document.getElementById(''lp-page-body'');
  if (nav)  nav.style.background  = pageCol;
  if (body) body.style.background = pageCol;

  // Hero
  var hero = document.getElementById(''lp-hero-section'');
  if (hero) {
    if (bgSrc && bgSrc.startsWith(''data:'')) {
      hero.style.backgroundImage = ''linear-gradient(rgba(15,23,42,.55),rgba(15,23,42,.55)),url('' + bgSrc + '')'';
      hero.style.backgroundColor = '''';
    } else {
      hero.style.backgroundImage = '''';
      hero.style.background = heroCol;
    }
  }

  // Company name
  var cn = document.getElementById(''lp-company-name'');
  var tt = document.getElementById(''lp-hero-title'');
  if (cn) cn.textContent = cname;
  if (tt) tt.textContent = cname + ''.'';

  // Logo
  var lb = document.getElementById(''lp-logo-box'');
  if (lb) {
    if (logoSrc && (logoSrc.startsWith(''data:'') || logoSrc.startsWith(''http''))) {
      lb.innerHTML = ''<img src="'' + logoSrc + ''" style="width:100%;height:100%;object-fit:contain;"/>'';
      lb.style.background = ''transparent'';
    } else {
      lb.innerHTML = ''&#9679;'';
      lb.style.background = ''#e2e8f0'';
    }
  }
}'

$newFn = 'function updateLandingPreview() {
  var fp = document.getElementById(''lp-fixed-panel'');
  if (!fp) return;
  var $ = function(id){ return fp.querySelector(''#''+id); };

  var pageCol = (document.getElementById(''set-page-bg-hex'')||{}).value || ''#ffffff'';
  var heroCol = (document.getElementById(''set-hero-color-hex'')||{}).value || ''#0f172a'';
  var cname   = (document.getElementById(''set-company'')||{}).value || ''Company'';

  var logoPrev = document.getElementById(''logo-preview'');
  var bgPrev   = document.getElementById(''bg-preview'');
  var logoSrc  = (logoPrev && logoPrev.dataset.base64) ||
                 (logoPrev && logoPrev.querySelector(''img'') && logoPrev.querySelector(''img'').getAttribute(''src'')) || null;
  var bgSrc    = (bgPrev && bgPrev.dataset.base64) || null;

  // Nav + page body
  var nav  = $(''lp-nav-bar'');
  var body = $(''lp-page-body'');
  if (nav)  nav.style.background  = pageCol;
  if (body) body.style.background = pageCol;

  // Hero
  var hero = $(''lp-hero-section'');
  if (hero) {
    if (bgSrc) {
      hero.style.backgroundImage = ''linear-gradient(rgba(15,23,42,.55),rgba(15,23,42,.55)),url('' + bgSrc + '')'';
      hero.style.backgroundColor = '''';
    } else {
      hero.style.backgroundImage = '''';
      hero.style.background = heroCol;
    }
  }

  // Company name
  var cn = $(''lp-company-name'');
  var tt = $(''lp-hero-title'');
  if (cn) cn.textContent = cname;
  if (tt) tt.textContent = cname + ''.'';

  // Logo
  var lb = $(''lp-logo-box'');
  if (lb) {
    if (logoSrc && logoSrc.length > 5 && !logoSrc.includes(''undefined'')) {
      lb.innerHTML = ''<img src="'' + logoSrc + ''" style="width:100%;height:100%;object-fit:contain;"/>'';
      lb.style.background = ''transparent'';
    } else {
      lb.innerHTML = ''&#9679;'';
      lb.style.background = ''#e2e8f0'';
    }
  }
}'

if ($c.Contains($oldFn)) {
  $c = $c.Replace($oldFn, $newFn)
  Write-Host "FIX2: updateLandingPreview now scoped to #lp-fixed-panel"
} else {
  Write-Host "FIX2: old function not found - trying partial match..."
  # try just finding the function signature
  $idx = $c.IndexOf('function updateLandingPreview()')
  if ($idx -ge 0) { Write-Host "  Found at index $idx" } else { Write-Host "  NOT FOUND at all" }
}

# ── FIX 3: Also fix the FIRST updateLandingPreview (added by fix-dashboard.ps1) 
# near loadSettings - scope it to fixed panel too or just replace it entirely
$oldFirstFn = "function updateLandingPreview() {`n  var pageCol = document.getElementById('set-page-bg-hex').value || '#ffffff';"
$newFirstFn = "function updateLandingPreview_unused() {`n  var pageCol = document.getElementById('set-page-bg-hex').value || '#ffffff';"
if ($c.Contains($oldFirstFn)) {
  $c = $c.Replace($oldFirstFn, $newFirstFn)
  Write-Host "FIX3: Renamed first (unused) updateLandingPreview to avoid override"
} else {
  Write-Host "FIX3: First fn not found as LF — check CRLF"
}

[System.IO.File]::WriteAllText($f, $c)
Write-Host "`nDone. Run: git add -A && git commit && git push"
