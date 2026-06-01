const fs = require('fs');
const path = require('path');

const files = ['admin-dashboard.html', 'dc-dashboard.html', 'manager-dashboard.html'];
const viewsDir = path.join(__dirname, 'views');

for (const file of files) {
  const fp = path.join(viewsDir, file);
  let c = fs.readFileSync(fp, 'utf8');

  // 1. Fix "View all " (missing arrow) → "View all →"
  c = c.replace(/View all\s*<\/button>/g, 'View all →</button>');
  c = c.replace(/View all\s*<\/a>/g, 'View all →</a>');

  // 2. Fix "Manage " → "Manage →"
  c = c.replace(/Manage\s*<\/button>/g, 'Manage →</button>');

  // 3. Fix the package category checkmark/cross on line ~3111
  // Current broken: (on ? ' : '?')
  // Should be: (on ? '✓' : '✕')
  c = c.replace(
    /\(on \? '.*?' : '.*?'\) \+ '<\/span>/g,
    "(on ? '✓' : '✕') + '</span>"
  );

  // 4. Fix Deny button text
  c = c.replace(/>\s*Deny<\/button>/g, '>✕ Deny</button>');
  // Don't double-fix
  c = c.replace(/✕ ✕/g, '✕');

  // 5. Fix "Admin Confirmed" column — check what it does
  // Will handle separately

  fs.writeFileSync(fp, c, 'utf8');
  console.log(`${file}: symbols fixed`);
}

console.log('Done!');
