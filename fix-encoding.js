const fs = require('fs');
const path = require('path');

const files = ['admin-dashboard.html', 'dc-dashboard.html', 'manager-dashboard.html'];

for (const file of files) {
  const fp = path.join(__dirname, 'views', file);
  let c = fs.readFileSync(fp, 'utf8');
  const before = (c.match(/Ã/g) || []).length;
  
  // Fix corrupted comment decorators: // Ã¢"" SECTION NAME Ã¢"""...
  c = c.replace(/\/\/\s*Ã[^"\n]*""\s*([A-Z][A-Za-z\s&/]+?)\s*Ã[^"\n]*"*\r?\n/g, 
    (match, name) => '// ── ' + name.trim() + ' ──\n');
  
  // Fix corrupted HTML comment decorators  
  c = c.replace(/<!--\s*Ã[^-]*?([A-Z][A-Z\s/&]+[A-Z])\s*Ã[^-]*?-->/g,
    (match, name) => '<!-- ── ' + name.trim() + ' ── -->');
  
  // Fix remaining Ã¢ sequences in strings (pickup/dropoff dots)
  // Ã¢ followed by a space = was supposed to be a bullet/marker → use ●
  c = c.replace(/Ã¢\s+/g, '● ');
  c = c.replace(/Ã¢/g, '');
  
  // Fix remaining Ã followed by specific patterns
  c = c.replace(/Ã/g, '');
  
  const after = (c.match(/Ã/g) || []).length;
  fs.writeFileSync(fp, c, 'utf8');
  console.log(`${file}: ${before} → ${after} Ã chars`);
}

// Also fix the CSS files that may have corruption
const cssDir = path.join(__dirname, 'public', 'css');
for (const cssFile of fs.readdirSync(cssDir)) {
  const fp = path.join(cssDir, cssFile);
  let c = fs.readFileSync(fp, 'utf8');
  const before = (c.match(/Ã/g) || []).length;
  if (before > 0) {
    c = c.replace(/Ã[^\s;{}]*/g, '');
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`CSS ${cssFile}: ${before} → 0 Ã chars`);
  }
}

// Now re-verify JS syntax
const html = fs.readFileSync(path.join(__dirname, 'views', 'admin-dashboard.html'), 'utf8');
const re = /<script(?:\s[^>]*)?>(([\s\S])*?)<\/script>/gi;
let m;
let num = 0;
let errors = 0;
while ((m = re.exec(html)) !== null) {
  num++;
  if (m[0].includes('src=')) continue;
  try { new Function(m[1]); } catch(e) { 
    errors++;
    console.log('STILL BROKEN Script #' + num + ': ' + e.message); 
  }
}
console.log(`JS syntax check: ${errors} errors in ${num} scripts`);
