const fs = require('fs');
const f = 'views/admin-dashboard.html';
let d = fs.readFileSync(f, 'utf8');
const lines = d.split('\n');

// Find and replace lines 2511-2514 (the method detection block)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Online (Stripe)")) {
    // Replace lines i-1 through i+2 (the whole method block)
    const startLine = i - 1; // "var method = p.payment_method || '';"
    const endLine = i + 2;   // "method = esc(method || '—');"
    
    console.log('Replacing lines', startLine+1, 'to', endLine+1);
    console.log('OLD:');
    for (let j = startLine; j <= endLine; j++) console.log('  ', lines[j].trimEnd());
    
    // Get the indent
    const indent = lines[startLine].match(/^(\s*)/)[1];
    
    lines[startLine] = indent + "var method = p.payment_method || '';";
    lines[i] = indent + "var methodLabels = {'gcash':'GCash','card':'Card','paymaya':'PayMaya','grab_pay':'GrabPay','billease':'BillEase','dob':'Online Banking'};";
    lines[i+1] = indent + "if (method && methodLabels[method.toLowerCase()]) method = methodLabels[method.toLowerCase()];";
    // Insert new line and adjust
    const newLines = [
      indent + "var method = p.payment_method || '';",
      indent + "var methodLabels = {'gcash':'GCash','card':'Card','paymaya':'PayMaya','grab_pay':'GrabPay','billease':'BillEase','dob':'Online Banking'};",
      indent + "if (method && methodLabels[method.toLowerCase()]) method = methodLabels[method.toLowerCase()];",
      indent + "else if (method) method = method.charAt(0).toUpperCase() + method.slice(1);",
      indent + "if (!method && p.paymongo_checkout_id) method = 'PayMongo';",
      indent + "method = esc(method || '\u2014');"
    ];
    
    lines.splice(startLine, endLine - startLine + 1, ...newLines);
    
    console.log('NEW:');
    newLines.forEach(l => console.log('  ', l.trimEnd()));
    break;
  }
}

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('DONE');
