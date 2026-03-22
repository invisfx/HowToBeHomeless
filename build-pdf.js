const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function buildPDF() {
  // ── 1. Read index.html front matter ──
  let indexHTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const indexBody = indexHTML.match(/<body[^>]*>([\s\S]*)<\/body>/);
  let frontMatter = indexBody ? indexBody[1] : '';

  // Remove the script block (TOC click handlers)
  frontMatter = frontMatter.replace(/<script[\s\S]*?<\/script>/g, '');

  // ── 2. Read all chapter files in order ──
  const chaptersDir = path.join(__dirname, 'chapters');
  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    // Chapters (ch01-ch35) come first, appendices come last
    const aIsAppendix = a.startsWith('appendix');
    const bIsAppendix = b.startsWith('appendix');
    if (aIsAppendix && !bIsAppendix) return 1;
    if (!aIsAppendix && bIsAppendix) return -1;
    return a.localeCompare(b);
  });

  let chaptersBody = '';
  for (const file of files) {
    let html = fs.readFileSync(path.join(chaptersDir, file), 'utf8');
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
    if (!bodyMatch) continue;

    let body = bodyMatch[1];

    // Remove scripts
    body = body.replace(/<script[\s\S]*?<\/script>/g, '');

    // Remove nav sections (prev/next chapter links)
    body = body.replace(/<div[^>]*style="[^"]*display:\s*flex[^"]*justify-content:\s*space-between[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
    body = body.replace(/<nav[\s\S]*?<\/nav>/g, '');

    chaptersBody += body + '\n';
  }

  // ── 3. Read the CSS ──
  const css = fs.readFileSync(path.join(__dirname, 'css', 'book.css'), 'utf8');

  // ── 4. Build the combined print HTML ──
  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${css}

/* ── Print overrides ── */
html { background: #fff; }
body { padding: 0; gap: 0; display: block; }

.book-page {
  width: auto;
  box-shadow: none;
  page-break-after: always;
  page-break-inside: avoid;
  min-height: auto;
}

/* Keep content filling the page */
.page-content { flex: 1; }
.chapter-opener { flex: 1; }

/* Avoid breaking inside key elements */
.sidebar, .scenario, .takeaway { page-break-inside: avoid; }
h2, h3 { page-break-after: avoid; }

/* Hide page numbers from HTML (Chrome adds its own) */
.page-number { display: none; }

/* Hide running headers (Chrome header template handles this) */
.running-header { display: none; }
</style>
</head>
<body>

${frontMatter}

${chaptersBody}

</body></html>`;

  const outputHTML = path.join(__dirname, 'No_Quarter_print.html');
  fs.writeFileSync(outputHTML, fullHTML);
  console.log('Combined HTML created: ' + outputHTML);

  // ── 5. Launch Chrome and print to PDF ──
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  await page.goto('file:///' + outputHTML.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const outputPDF = path.join(__dirname, 'No_Quarter.pdf');
  await page.pdf({
    path: outputPDF,
    width: '6.5in',
    height: '9.25in',
    margin: { top: '0.6in', right: '0.5in', bottom: '0.6in', left: '0.6in' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:7pt;color:#999;text-align:center;width:100%;font-family:Arial,sans-serif;padding-top:4px;">No Quarter &mdash; A Survival Manual</div>',
    footerTemplate: '<div style="font-size:8pt;color:#666;text-align:center;width:100%;font-family:Arial,sans-serif;padding-bottom:4px;">Page <span class="pageNumber"></span></div>'
  });

  const stats = fs.statSync(outputPDF);
  console.log(`PDF created: ${outputPDF}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Pages estimated: ~${Math.round(stats.size / 15000)}`);

  await browser.close();
}

buildPDF().catch(err => { console.error(err); process.exit(1); });
