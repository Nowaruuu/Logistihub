const fs = require('fs');
const files = ['admin-dashboard.html', 'dc-dashboard.html', 'manager-dashboard.html'];

for (const f of files) {
  const fp = 'C:/Users/Colli/Logistihub/views/' + f;
  let content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  let fixes = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern 1: '>₱ was here but stripped: '> + Number(' or similar
    // Fix: restore ₱ before + Number/amount/price etc
    
    // Look for ">\s*+" patterns in JS strings that indicate stripped ₱
    const fixed = line.replace(/(['"])>\s*\+\s*(Number|parseFloat|esc|amount|total|cyclePrice)/g, (m, q, varName) => {
      fixes++;
      return q + '>₱' + q + ' + ' + varName;
    });
    
    if (fixed !== line) {
      lines[i] = fixed;
      console.log(f + ':' + (i+1) + ' FIXED: ' + fixed.trim().substring(0, 120));
    }
  }
  
  if (fixes > 0) {
    fs.writeFileSync(fp, lines.join('\n'), 'utf8');
    console.log(f + ': ' + fixes + ' ₱ symbols restored\n');
  }
}

// Now verify JS syntax
console.log('\n=== SYNTAX CHECK ===');
const html = fs.readFileSync('C:/Users/Colli/Logistihub/views/admin-dashboard.html', 'utf8');
const scriptMatches = html.match(/<script>[\s\S]*?<\/script>/g) || [];
let num = 0;
for (const s of scriptMatches) {
  num++;
  const js = s.replace(/<\/?script>/g, '');
  try { new Function(js); } catch(e) {
    console.log('Script #' + num + ': ' + e.message);
  }
}
console.log('Checked ' + num + ' scripts');
