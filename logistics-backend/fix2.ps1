$f = 'views\admin-dashboard.html'
$c = [System.IO.File]::ReadAllText($f)

# ── FIX 1: Remove bad lines from saveSettings payload ────────────────────────
# These lines always send null, wiping the DB even when no file was uploaded

$badA = "`n    logo_url: logoBase64,"
$badB = "`n    background_url: isColorMode ? null : bgBase64,"
$badC = "`n    bg_hero_color: isColorMode ? (document.getElementById('set-hero-color-hex').value.trim() || null) : null,"

foreach ($bad in @($badA, $badB, $badC)) {
  if ($c.Contains($bad)) {
    $c = $c.Replace($bad, '')
    Write-Host "Removed: $($bad.Trim().Substring(0,[Math]::Min(50,$bad.Trim().Length)))"
  } else {
    Write-Host "NOT FOUND: $($bad.Trim().Substring(0,[Math]::Min(50,$bad.Trim().Length)))"
  }
}

# ── FIX 2: Replace old fixed preview panel with position:fixed + bigger size ──
$oldPanel = 'style="width:300px;flex-shrink:0;position:sticky;top:70px;"'
$newPanel = 'style="display:none;"'  # hide the inline panel, we''ll use fixed one

if ($c.Contains($oldPanel)) {
  $c = $c.Replace($oldPanel, $newPanel)
  Write-Host "Hidden inline preview panel"
} else {
  Write-Host "Inline panel style not found"
}

# ── FIX 3: Add fixed floating preview panel + live polling before </body> ──────
$beforeBody = '</body>'

$fixedPanel = @'
<!-- ── FIXED LIVE PREVIEW PANEL ─────────────────────────────── -->
<div id="lp-fixed-panel" style="display:none;position:fixed;right:24px;top:72px;width:420px;z-index:9999;font-family:'DM Sans',sans-serif;">
  <div style="background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.18);border:1.5px solid #e2e8f0;overflow:hidden;">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.06em;text-transform:uppercase;">Live Preview</span>
      <span style="font-size:10px;color:#94a3b8;">Updates as you change settings</span>
    </div>
    <!-- Browser chrome -->
    <div style="background:#f1f5f9;padding:6px 12px;display:flex;align-items:center;gap:6px;">
      <div style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;"></div>
      <div style="flex:1;background:#fff;border-radius:5px;padding:3px 9px;font-size:10px;color:#94a3b8;font-family:monospace;margin-left:6px;">logisticsos.io/workspace</div>
    </div>
    <!-- Nav bar -->
    <div id="lp-nav-bar" style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:#ffffff;transition:background .25s;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div id="lp-logo-box" style="width:28px;height:28px;border-radius:6px;background:#e2e8f0;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;">&#9679;</div>
        <span id="lp-company-name" style="font-size:13px;font-weight:700;color:#0f172a;">Company</span>
      </div>
      <span style="font-size:10px;color:#64748b;white-space:nowrap;">Client Login &rarr;</span>
    </div>
    <!-- Hero section -->
    <div id="lp-hero-section" style="height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;border-radius:10px;margin:6px;transition:background .25s;background-size:cover;background-position:center;">
      <div id="lp-hero-title" style="font-size:16px;font-weight:800;color:#fff;margin-bottom:4px;text-align:center;">Company.</div>
      <div style="font-size:9px;color:rgba(255,255,255,.55);margin-bottom:9px;text-align:center;">The central portal for logistics</div>
      <div style="font-size:9px;padding:4px 13px;border:1.5px solid rgba(255,255,255,.4);border-radius:20px;color:#fff;cursor:default;">Get Started</div>
    </div>
    <!-- Page body -->
    <div id="lp-page-body" style="padding:12px 16px;background:#f8fafc;transition:background .25s;min-height:70px;display:flex;gap:10px;align-items:flex-start;border-top:1px solid rgba(0,0,0,.04);">
      <div style="width:64px;height:44px;background:rgba(255,255,255,.35);border-radius:8px;flex-shrink:0;border:1px solid rgba(0,0,0,.06);"></div>
      <div style="flex:1;padding-top:4px;">
        <div style="height:7px;background:rgba(0,0,0,.13);border-radius:4px;width:78%;margin-bottom:5px;"></div>
        <div style="height:7px;background:rgba(0,0,0,.08);border-radius:4px;width:52%;margin-bottom:5px;"></div>
        <div style="height:7px;background:rgba(0,0,0,.05);border-radius:4px;width:35%;"></div>
      </div>
    </div>
  </div>
</div>

<script>
// ── Show preview only on Settings screen ─────────────────────────────────────
(function(){
  var _origGo2 = window.go;
  window.go = function(id, navBtn) {
    _origGo2(id, navBtn);
    var panel = document.getElementById('lp-fixed-panel');
    if (panel) panel.style.display = (id === 'settings') ? 'block' : 'none';
  };
})();

// ── Live preview updater ──────────────────────────────────────────────────────
var _lpCache = {};
function updateLandingPreview() {
  var pageCol = document.getElementById('set-page-bg-hex').value || '#ffffff';
  var heroCol = document.getElementById('set-hero-color-hex').value || '#0f172a';
  var cname   = (document.getElementById('set-company')||{}).value || 'Company';

  var logoPrev = document.getElementById('logo-preview');
  var bgPrev   = document.getElementById('bg-preview');
  var logoSrc  = (logoPrev && logoPrev.dataset.base64) ||
                 (logoPrev && logoPrev.querySelector('img') && logoPrev.querySelector('img').src) || null;
  var bgSrc    = (bgPrev && bgPrev.dataset.base64) || null;

  // Nav + page body
  var nav  = document.getElementById('lp-nav-bar');
  var body = document.getElementById('lp-page-body');
  if (nav)  nav.style.background  = pageCol;
  if (body) body.style.background = pageCol;

  // Hero
  var hero = document.getElementById('lp-hero-section');
  if (hero) {
    if (bgSrc && bgSrc.startsWith('data:')) {
      hero.style.backgroundImage = 'linear-gradient(rgba(15,23,42,.55),rgba(15,23,42,.55)),url(' + bgSrc + ')';
      hero.style.backgroundColor = '';
    } else {
      hero.style.backgroundImage = '';
      hero.style.background = heroCol;
    }
  }

  // Company name
  var cn = document.getElementById('lp-company-name');
  var tt = document.getElementById('lp-hero-title');
  if (cn) cn.textContent = cname;
  if (tt) tt.textContent = cname + '.';

  // Logo
  var lb = document.getElementById('lp-logo-box');
  if (lb) {
    if (logoSrc && (logoSrc.startsWith('data:') || logoSrc.startsWith('http'))) {
      lb.innerHTML = '<img src="' + logoSrc + '" style="width:100%;height:100%;object-fit:contain;"/>';
      lb.style.background = 'transparent';
    } else {
      lb.innerHTML = '&#9679;';
      lb.style.background = '#e2e8f0';
    }
  }
}

// Poll every 120ms for changes to FillList hidden inputs
setInterval(function() {
  var pageCol = (document.getElementById('set-page-bg-hex')||{}).value || '';
  var heroCol = (document.getElementById('set-hero-color-hex')||{}).value || '';
  var appCol  = (document.getElementById('set-bg-app-hex')||{}).value || '';
  var sideCol = (document.getElementById('set-bg-sidebar-hex')||{}).value || '';
  var cname   = (document.getElementById('set-company')||{}).value || '';
  var sig = pageCol + '|' + heroCol + '|' + cname;
  if (sig !== _lpCache.sig) {
    _lpCache.sig = sig;
    updateLandingPreview();
  }
}, 120);
</script>
</body>
'@

if ($c.Contains($beforeBody)) {
  $c = $c.Replace($beforeBody, $fixedPanel)
  Write-Host "Fixed floating preview panel injected before </body>"
} else {
  Write-Host "ERROR: </body> not found"
}

[System.IO.File]::WriteAllText($f, $c)
Write-Host "`nDone. Run: git add -A && git commit -m 'fix: live preview fixed-right, payload safe-save' && git push"
