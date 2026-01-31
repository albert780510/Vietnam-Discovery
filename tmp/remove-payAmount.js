const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const langs = fs.readdirSync(pagesDir).filter(x => !x.startsWith('.') && fs.statSync(path.join(pagesDir, x)).isDirectory());

function replaceBlock(html){
  // Handles:
  // <div class="row"> ... last5 ... </div>
  // <div> ... Amount (optional) ... payAmount ... payCurrency ... </div>
  const re = /\n\s*<div class="row">\s*\n\s*<div>\s*\n\s*<label>[^<]*末[^<]*碼[^<]*\(<\/label>|\n\s*<div class="row">[\s\S]*?<input id="last5"[\s\S]*?<\/div>\s*\n\s*<div>[\s\S]*?<input id="payAmount"[\s\S]*?<input id="payCurrency"[\s\S]*?<\/div>\s*\n\s*<\/div>/;
  // The above regex is too broad for safe use; we'll do a more structured two-step on known IDs.
  if (!html.includes('id="payAmount"')) return { html, changed:false };

  // Find the smallest chunk that contains payAmount and is inside a <div class="row"> ... </div>
  const idx = html.indexOf('id="payAmount"');
  if (idx < 0) return { html, changed:false };

  // Walk backwards to nearest '<div class="row">'
  const start = html.lastIndexOf('<div class="row">', idx);
  if (start < 0) return { html, changed:false };
  // Walk forward to closing '</div>' of that row by scanning depth.
  const slice = html.slice(start);
  let depth = 0;
  let end = -1;
  const tagRe = /<\/?div\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(slice))) {
    const tag = m[0];
    if (tag.startsWith('</')) depth -= 1;
    else depth += 1;
    if (depth === 0) { end = m.index + tag.length; break; }
  }
  if (end < 0) return { html, changed:false };

  const rowHtml = slice.slice(0, end);
  if (!rowHtml.includes('id="payAmount"')) return { html, changed:false };

  // Keep only the last5 block, drop the payAmount column.
  // Also keep payCurrency hidden input outside the row (still used by JS).
  const last5Match = rowHtml.match(/<div>\s*\n\s*<label>[\s\S]*?id="last5"[\s\S]*?<\/div>/);
  const currencyMatch = rowHtml.match(/<input id="payCurrency"[\s\S]*?>/);

  if (!last5Match) return { html, changed:false };
  const last5Block = last5Match[0];
  const currencyInput = currencyMatch ? currencyMatch[0] : '<input id="payCurrency" type="hidden" value="" />';

  const newRow = `\n            <div class="row">\n              ${last5Block.trim().replace(/^/gm,'')}\n            </div>\n            ${currencyInput}`;

  const newHtml = html.slice(0, start) + newRow + slice.slice(end);
  return { html: newHtml, changed:true };
}

let changedFiles = 0;
for (const lang of langs) {
  const f = path.join(pagesDir, lang, 'index.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const { html, changed } = replaceBlock(src);
  if (changed) {
    fs.writeFileSync(f, html);
    changedFiles++;
    console.log('updated', f);
  }
}

console.log('done. changed files:', changedFiles);
