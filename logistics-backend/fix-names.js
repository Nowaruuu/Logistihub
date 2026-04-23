#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

// ── FIX 1: admin-dashboard.html — replace corrupted em dash fallbacks ─────────
const dashPath = path.join(__dirname, 'views/admin-dashboard.html');
let dash = fs.readFileSync(dashPath, 'utf8');

// Replace all single-quoted fallback strings containing the corrupted em dash
// Pattern: any '...' that contains the 3-byte UTF-8 sequence for â€" (which is
// the mojibake for — stored as Windows-1252 bytes re-encoded as UTF-8)
dash = dash.replace(
  /var date=u\.created_at\?new Date\(u\.created_at\)\.toLocaleDateString\(\):'[^']*';/,
  "var date=u.created_at?new Date(u.created_at).toLocaleDateString():'N/A';"
);
dash = dash.replace(
  /esc\(u\.full_name\|\|u\.name\|\|'[^']*'\)/,
  "esc(u.full_name||u.name||'N/A')"
);
dash = dash.replace(
  /esc\(u\.email\|\|'[^']*'\)/,
  "esc(u.email||'N/A')"
);
dash = dash.replace(
  /esc\(u\.role\|\|'[^']*'\)/,
  "esc(u.role||'N/A')"
);
fs.writeFileSync(dashPath, dash, 'utf8');
console.log('FIX1: app-users fallbacks cleaned');

// ── FIX 2: client-register.html — add tenant branding on load ────────────────
const regPath = path.join(__dirname, 'views/client-register.html');
let reg = fs.readFileSync(regPath, 'utf8');

const brandingScript = `
  <script>
    // Apply tenant branding from server-injected window.__TENANT__
    window.addEventListener('DOMContentLoaded', function() {
      var t = window.__TENANT__;
      if (!t) return;
      // Logo / company name
      var logoEl = document.querySelector('.logo');
      if (logoEl) {
        if (t.logo_url) {
          logoEl.innerHTML = '<img src="' + t.logo_url + '" style="height:38px;object-fit:contain;max-width:160px;" alt="' + (t.company_name||'') + '">';
        } else if (t.company_name) {
          logoEl.innerHTML = '<span class="material-symbols-outlined" style="font-size:28px;">package_2</span>' + t.company_name;
        }
      }
      // Primary color → buttons, focus ring, input border
      var primary = t.brand_color || '#0a1628';
      document.documentElement.style.setProperty('--primary', primary);
      // Page background
      if (t.bg_app_color) document.body.style.background = t.bg_app_color;
      // Page title
      if (t.company_name) document.title = 'Register — ' + t.company_name;
    });
  </script>`;

// Insert before </head>
if (!reg.includes('Apply tenant branding')) {
  reg = reg.replace('</head>', brandingScript + '\n</head>');
  fs.writeFileSync(regPath, reg, 'utf8');
  console.log('FIX2: register page tenant branding added');
} else {
  console.log('FIX2: already patched, skipping');
}

console.log('Done.');
