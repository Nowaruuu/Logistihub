const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const files = ['admin-dashboard.html', 'dc-dashboard.html', 'manager-dashboard.html'];

for (const file of files) {
  const fp = path.join('C:/Users/Colli/Logistihub/views', file);
  let c = fs.readFileSync(fp, 'utf8');
  console.log(`\n=== ${file} ===`);

  // Fix 1: Broken ternary in package categories: (on ? ' : '✕') → (on ? '✓' : '✕')
  c = c.replace(/\(on \? '\s*:\s*'✕'\)/g, "(on ? '✓' : '✕')");

  // Fix 2: Missing — (em-dash) in fallback strings
  // Pattern: : ';  (should be : '—';)
  c = c.replace(/: ';\r?\n/g, ": '\\u2014';\n");
  
  // Pattern: ||') should be ||'—')  in esc() calls
  c = c.replace(/\|\|'\)/g, "||'\\u2014')");
  
  // Pattern: || ')  with space
  c = c.replace(/\|\| '\)/g, "|| '\\u2014')");

  fs.writeFileSync(fp, c, 'utf8');
}

// Verify
console.log('\n=== SYNTAX CHECK ===');
for (const file of files) {
  const fp = path.join('C:/Users/Colli/Logistihub/views', file);
  const html = fs.readFileSync(fp, 'utf8');
  const parts = html.split('</script>');
  let errs = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const matches = part.match(/<script(?:\s[^>]*)?>/g);
    if (!matches) continue;
    for (const tag of matches) {
      if (tag.includes('src=')) continue;
      const idx = part.lastIndexOf(tag);
      const js = part.substring(idx + tag.length);
      if (!js.trim()) continue;
      const tmp = path.join('C:/Users/Colli/Logistihub', '_tmp.js');
      fs.writeFileSync(tmp, js, 'utf8');
      try { execSync('node --check "' + tmp + '"', {timeout:5000, stdio:'pipe'}); }
      catch(e) { 
        errs++;
        const stderr = e.stderr.toString().split('\n');
        console.log(`  ${file}: ${stderr[0]}`);
        console.log(`  ${stderr[1]}`);
      }
      try { fs.unlinkSync(tmp); } catch(e) {}
    }
  }
  console.log(`${file}: ${errs === 0 ? 'ALL OK ✓' : errs + ' ERROR(S)'}`);
}
