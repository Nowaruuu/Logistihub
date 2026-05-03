const fs = require('fs');

const files = [
  'views/dc-dashboard.html',
  'views/manager-dashboard.html', 
  'views/admin-dashboard.html'
];

files.forEach(f => {
  if (!fs.existsSync(f)) { console.log('SKIP:', f); return; }
  let d = fs.readFileSync(f, 'utf8');
  let o = d;
  
  // The broken arrow is: â (U+00E2) followed by † (U+2020) followed by ' (U+2019) 
  // which is the double-encoded form of → (U+2192)
  const brokenArrow = '\u00E2\u2020\u2019';
  const goodArrow = '\u2192';
  
  // The broken ellipsis: â (U+00E2) followed by €¦ characters
  const brokenEllipsis = '\u00E2\u20AC\u00A6';
  const goodEllipsis = '\u2026';
  
  // Broken em-dash
  const brokenDash1 = '\u00E2\u20AC\u201C';
  const brokenDash2 = '\u00E2\u20AC\u0093';
  const goodDash = '\u2014';
  
  // Broken peso sign
  const brokenPeso = '\u00E2\u201A\u00B1';
  const goodPeso = '\u20B1';

  d = d.split(brokenArrow).join(goodArrow);
  d = d.split(brokenEllipsis).join(goodEllipsis);
  d = d.split(brokenDash1).join(goodDash);
  d = d.split(brokenDash2).join(goodDash);
  d = d.split(brokenPeso).join(goodPeso);

  if (d !== o) {
    fs.writeFileSync(f, d, 'utf8');
    console.log('FIXED:', f);
  } else {
    console.log('OK:', f, '(no changes needed)');
  }
});
