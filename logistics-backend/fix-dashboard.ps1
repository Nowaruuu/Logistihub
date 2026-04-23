$f = 'views\admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f)

# ── FIX 1: Remove duplicate CRLF previewLogo+previewBackground block ──────────
# The CRLF duplicates appear as "}function previewLogo" (no newline separator)
$dupStart = "}function previewLogo(input) {`r`n  if (!input.files || !input.files[0]) return;`r`n  var reader = new FileReader();`r`n  reader.onload = function(e) {`r`n    var preview = document.getElementById('logo-preview');`r`n    preview.innerHTML = '<img src=""' + e.target.result + '"" style=""width:100%;height:100%;object-fit:cover;border-radius:8px;""/>';`r`n    preview.dataset.base64 = e.target.result;`r`n  };`r`n  reader.readAsDataURL(input.files[0]);`r`n}`r`nfunction previewBackground(input) {`r`n  if (!input.files || !input.files[0]) return;`r`n  var reader = new FileReader();`r`n  reader.onload = function(e) {`r`n    var preview = document.getElementById('bg-preview');`r`n    preview.innerHTML = '<img src=""' + e.target.result + '"" style=""width:100%;height:100%;object-fit:cover;border-radius:8px;""/>';`r`n    preview.dataset.base64 = e.target.result;`r`n  };`r`n  reader.readAsDataURL(input.files[0]);`r`n}"
$dupReplace = "}"
if ($c.Contains($dupStart)) {
  $c = $c.Replace($dupStart, $dupReplace)
  Write-Host "FIX1: Removed duplicate previewLogo/previewBackground"
} else {
  Write-Host "FIX1: Duplicate block not found (may already be fixed)"
}

# ── FIX 2: Fix saveSettings payload ───────────────────────────────────────────
# Remove logo_url, background_url, bg_hero_color from hardcoded payload
# and replace with conditional logic after the payload closing brace

# Step 2a: remove the 3 bad lines from the payload object
$badLine1 = "`r`n    logo_url: logoBase64,"
$badLine2 = "`r`n    background_url: isColorMode ? null : bgBase64,"
$badLine3 = "`r`n    bg_hero_color: isColorMode ? (document.getElementById('set-hero-color-hex').value.trim() || null) : null,"

if ($c.Contains($badLine1)) {
  $c = $c.Replace($badLine1, '')
  Write-Host "FIX2a: Removed logo_url from payload"
} else { Write-Host "FIX2a: logo_url line not found with CRLF" }

if ($c.Contains($badLine2)) {
  $c = $c.Replace($badLine2, '')
  Write-Host "FIX2b: Removed background_url from payload"
} else { Write-Host "FIX2b: background_url line not found with CRLF" }

if ($c.Contains($badLine3)) {
  $c = $c.Replace($badLine3, '')
  Write-Host "FIX2c: Removed bg_hero_color from payload"
} else { Write-Host "FIX2c: bg_hero_color line not found with CRLF" }

# Step 2b: After the payload closing brace and before var btn=event.target, inject conditional logic
$afterPayload = "  };`r`n  var btn = event.target;"
$newAfterPayload = "  };`n  // Only include logo if freshly uploaded this session (prevents wiping existing DB value)`n  if (logoBase64 && logoBase64.startsWith('data:')) payload.logo_url = logoBase64;`n  // Background: clear image when switching to color; only send bg if new file was picked`n  if (isColorMode) {`n    payload.background_url = null;`n    var _hc = (document.getElementById('set-hero-color-hex')||{}).value;`n    if (_hc) payload.bg_hero_color = _hc;`n  } else {`n    payload.bg_hero_color = null;`n    if (bgBase64 && bgBase64.startsWith('data:')) payload.background_url = bgBase64;`n  }`n  var btn = event.target;"

if ($c.Contains($afterPayload)) {
  $c = $c.Replace($afterPayload, $newAfterPayload)
  Write-Host "FIX2d: Injected conditional logo/bg logic after payload"
} else { Write-Host "FIX2d: payload close+btn not found" }

# ── FEATURE: Live landing page mini preview ───────────────────────────────────

# Step 3a: Change settings form to flex layout with preview panel on right
$oldFormCard = '<div class="form-card" style="max-width:700px;">'
$newFormCard = '<div style="display:flex;gap:20px;align-items:flex-start;max-width:1100px;">
  <div class="form-card" style="flex:1;min-width:0;">'

if ($c.Contains($oldFormCard)) {
  $c = $c.Replace($oldFormCard, $newFormCard)
  Write-Host "FEAT1: Settings form wrapped in flex"
} else { Write-Host "FEAT1: form-card open not found" }

# Step 3b: Close the extra div wrapping (before </div> that closes form-card in settings screen)
# The settings screen ends with the closing </div> of form-card then </div> of screen
$oldFormClose = '    </div>`n  </div>`r`n`r`n  </div>`r`n</div>'
# Actually let's target the save button area more precisely
$oldSaveBtn = '        <div style="display:flex;justify-content:flex-end;margin-top:4px;">
          <button class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
        </div>
      </div>
    </div>'

$newSaveBtn = '        <div style="display:flex;justify-content:flex-end;margin-top:4px;">
          <button class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- ── LIVE LANDING PAGE PREVIEW ────────────────────── -->
    <div style="width:300px;flex-shrink:0;position:sticky;top:70px;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">Live Preview</div>
      <div style="border-radius:12px;overflow:hidden;border:1.5px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,.07);font-family:inherit;">
        <!-- Browser chrome -->
        <div style="background:#f1f5f9;padding:6px 10px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:5px;">
          <div style="width:7px;height:7px;border-radius:50%;background:#ef4444;"></div>
          <div style="width:7px;height:7px;border-radius:50%;background:#f59e0b;"></div>
          <div style="width:7px;height:7px;border-radius:50%;background:#22c55e;"></div>
          <div style="flex:1;background:#fff;border-radius:4px;padding:2px 6px;font-size:9px;color:#94a3b8;font-family:monospace;margin-left:4px;">logisticsos.io/workspace</div>
        </div>
        <!-- Nav -->
        <div id="lp-nav-bar" style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:#fff;transition:background .3s;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div id="lp-logo-box" style="width:22px;height:22px;border-radius:5px;background:#e2e8f0;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;">&#9679;</div>
            <span id="lp-company-name" style="font-size:11px;font-weight:700;color:#0f172a;">Company</span>
          </div>
          <span style="font-size:9px;color:#64748b;white-space:nowrap;">Client Login &rarr;</span>
        </div>
        <!-- Hero -->
        <div id="lp-hero-section" style="height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;border-radius:8px;margin:5px;transition:background .3s;background-size:cover;background-position:center;">
          <div id="lp-hero-title" style="font-size:13px;font-weight:800;color:#fff;margin-bottom:3px;text-align:center;">Company.</div>
          <div style="font-size:7px;color:rgba(255,255,255,.55);margin-bottom:7px;text-align:center;">The central portal for logistics</div>
          <div style="font-size:7px;padding:3px 10px;border:1px solid rgba(255,255,255,.35);border-radius:20px;color:#fff;">Get Started</div>
        </div>
        <!-- Page body -->
        <div id="lp-page-body" style="padding:10px 12px;background:#f8fafc;transition:background .3s;min-height:60px;display:flex;gap:8px;align-items:flex-start;">
          <div style="width:56px;height:38px;background:rgba(255,255,255,.35);border-radius:6px;flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="height:6px;background:rgba(0,0,0,.12);border-radius:3px;width:80%;margin-bottom:4px;"></div>
            <div style="height:6px;background:rgba(0,0,0,.08);border-radius:3px;width:55%;"></div>
          </div>
        </div>
      </div>
      <p style="font-size:10px;color:#94a3b8;margin-top:6px;text-align:center;">Updates as you change settings</p>
    </div>

  </div>'

if ($c.Contains($oldSaveBtn)) {
  $c = $c.Replace($oldSaveBtn, $newSaveBtn)
  Write-Host "FEAT2: Preview panel HTML injected"
} else { Write-Host "FEAT2: save button close block not found" }

# ── FIX 3: Hook updateLandingPreview into previewLogo and previewBackground ───
$oldLogoOnLoad = "    preview.dataset.base64 = e.target.result;`n  };`n  reader.readAsDataURL(input.files[0]);`n}`nfunction previewBackground"
$newLogoOnLoad = "    preview.dataset.base64 = e.target.result;`n    updateLandingPreview();`n  };`n  reader.readAsDataURL(input.files[0]);`n}`nfunction previewBackground"
if ($c.Contains($oldLogoOnLoad)) {
  $c = $c.Replace($oldLogoOnLoad, $newLogoOnLoad)
  Write-Host "FIX3a: updateLandingPreview hooked into previewLogo"
} else { Write-Host "FIX3a: previewLogo onload end not found" }

$oldBgOnLoad = "    preview.dataset.base64 = e.target.result;`n  };`n  reader.readAsDataURL(input.files[0]);`n}`n`n// FillList"
$newBgOnLoad = "    preview.dataset.base64 = e.target.result;`n    updateLandingPreview();`n  };`n  reader.readAsDataURL(input.files[0]);`n}`n`n// FillList"
if ($c.Contains($oldBgOnLoad)) {
  $c = $c.Replace($oldBgOnLoad, $newBgOnLoad)
  Write-Host "FIX3b: updateLandingPreview hooked into previewBackground"
} else { Write-Host "FIX3b: previewBackground onload end not found" }

# ── Add updateLandingPreview() function before loadSettings ───────────────────
$beforeLoadSettings = "`nfunction loadSettings() {"
$updateFn = @"

function updateLandingPreview() {
  var pageCol = document.getElementById('set-page-bg-hex').value || '#ffffff';
  var heroCol = document.getElementById('set-hero-color-hex').value || '#0f172a';
  var cname   = (document.getElementById('set-company')||{}).value || 'Company';
  var logoPrev = document.getElementById('logo-preview');
  var bgPrev   = document.getElementById('bg-preview');
  var logoSrc = (logoPrev && logoPrev.dataset.base64) || (logoPrev && logoPrev.querySelector('img') && logoPrev.querySelector('img').src) || null;
  var bgSrc   = (bgPrev && bgPrev.dataset.base64) || null;

  // Nav + page body background
  var nav = document.getElementById('lp-nav-bar');
  var body = document.getElementById('lp-page-body');
  if (nav)  nav.style.background  = pageCol;
  if (body) body.style.background = pageCol;

  // Hero background
  var hero = document.getElementById('lp-hero-section');
  if (hero) {
    if (bgSrc && bgSrc.startsWith('data:')) {
      hero.style.backgroundImage = 'linear-gradient(rgba(15,23,42,.55),rgba(15,23,42,.55)), url(' + bgSrc + ')';
      hero.style.backgroundColor = '';
    } else {
      hero.style.backgroundImage = '';
      hero.style.background = heroCol;
    }
  }

  // Company name
  var cnEl = document.getElementById('lp-company-name');
  var ttEl = document.getElementById('lp-hero-title');
  if (cnEl) cnEl.textContent = cname;
  if (ttEl) ttEl.textContent = cname + '.';

  // Logo
  var lb = document.getElementById('lp-logo-box');
  if (lb) {
    if (logoSrc) {
      lb.innerHTML = '<img src="' + logoSrc + '" style="width:100%;height:100%;object-fit:contain;"/>';
    } else {
      lb.innerHTML = '&#9679;';
      lb.style.background = '#e2e8f0';
    }
  }
}
function loadSettings() {
"@
if ($c.Contains($beforeLoadSettings)) {
  $c = $c.Replace($beforeLoadSettings, $updateFn)
  Write-Host "FEAT3: updateLandingPreview() function added"
} else { Write-Host "FEAT3: loadSettings function start not found" }

# ── Call updateLandingPreview at end of loadSettings ─────────────────────────
$oldLoadEnd = "      updateColorPreview();`r`n      applyBranding(d);`r`n    }).catch(function(){});"
$newLoadEnd = "      updateColorPreview();`r`n      applyBranding(d);`r`n      updateLandingPreview();`r`n    }).catch(function(){});"
if ($c.Contains($oldLoadEnd)) {
  $c = $c.Replace($oldLoadEnd, $newLoadEnd)
  Write-Host "FEAT4: updateLandingPreview() called at end of loadSettings"
} else { Write-Host "FEAT4: loadSettings end not found" }

# ── Hook company name input to live preview ───────────────────────────────────
$oldCompanyInput = 'id="set-company" type="text"/>'
$newCompanyInput = 'id="set-company" type="text" oninput="updateLandingPreview()"/>'
if ($c.Contains($oldCompanyInput)) {
  $c = $c.Replace($oldCompanyInput, $newCompanyInput)
  Write-Host "FEAT5: company name input hooked to updateLandingPreview"
} else { Write-Host "FEAT5: company input not found" }

[System.IO.File]::WriteAllText($f, $c)
Write-Host "`nDone writing file."
