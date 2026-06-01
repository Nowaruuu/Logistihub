const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const file = 'C:/Users/Colli/Logistihub/views/admin-dashboard.html';
const html = fs.readFileSync(file, 'utf8');

// Properly extract all script blocks using the HTML parser approach
// Split by </script> and find inline <script> tags
const scriptBlocks = [];
const parts = html.split('</script>');

for (let i = 0; i < parts.length; i++) {
  const part = parts[i];
  
  // Find <script> that's NOT external (no src=)
  // Could be <script> or <script attr>
  const matches = part.match(/<script(?:\s[^>]*)?>/g);
  if (!matches) continue;
  
  for (const tag of matches) {
    if (tag.includes('src=')) continue;
    
    const idx = part.lastIndexOf(tag);
    const js = part.substring(idx + tag.length);
    if (!js.trim()) continue;
    
    // Calculate line number
    const beforeScript = html.substring(0, html.indexOf(part) + idx);
    const lineNum = beforeScript.split('\n').length;
    
    scriptBlocks.push({ lineNum, js, tag });
  }
}

console.log('Found ' + scriptBlocks.length + ' inline script blocks\n');

// Write each to a temp file and test with node --check
const tmpDir = path.join('C:/Users/Colli/Logistihub', 'tmp_scripts');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

let errors = 0;
for (let i = 0; i < scriptBlocks.length; i++) {
  const b = scriptBlocks[i];
  const tmpFile = path.join(tmpDir, `script_${i}_line${b.lineNum}.js`);
  fs.writeFileSync(tmpFile, b.js, 'utf8');
  
  try {
    execSync(`node --check "${tmpFile}"`, { timeout: 5000, stdio: 'pipe' });
    // console.log(`Script #${i+1} (line ${b.lineNum}): OK`);
  } catch(e) {
    errors++;
    const stderr = e.stderr ? e.stderr.toString() : '';
    console.log(`Script #${i+1} (line ${b.lineNum}): ERROR`);
    console.log(`  ${stderr.split('\n').slice(0, 3).join('\n  ')}`);
    
    // Find the offending line
    const match = stderr.match(/:(\d+)/);
    if (match) {
      const errLine = parseInt(match[1]);
      const jsLines = b.js.split('\n');
      if (jsLines[errLine - 1]) {
        console.log(`  Offending line (JS line ${errLine}, file line ~${b.lineNum + errLine}):`)
        console.log(`  >>> ${jsLines[errLine - 1].substring(0, 150)}`);
        // Show hex of chars around position
        const errCol = stderr.match(/:(\d+):(\d+)/);
        if (errCol) {
          const col = parseInt(errCol[2]);
          const line = jsLines[errLine - 1];
          console.log(`  Col ${col}: charCode=${line.charCodeAt(col)} char=${JSON.stringify(line[col])}`);
          console.log(`  Context: ...${line.substring(Math.max(0,col-10), col+10)}...`);
        }
      }
    }
    console.log('');
  }
}

console.log(`\nTotal: ${errors} errors out of ${scriptBlocks.length} scripts`);

// Cleanup
try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
