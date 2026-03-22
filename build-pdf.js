const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function buildPDF() {
  // Combine all chapters into one flowing HTML
  const chaptersDir = path.join(__dirname, 'chapters');
  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.html')).sort();

  let combinedBody = '';

  for (const file of files) {
    let html = fs.readFileSync(path.join(chaptersDir, file), 'utf8');

    // Extract content between <body> tags
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
    if (!bodyMatch) continue;

    let body = bodyMatch[1];

    // Remove script tags
    body = body.replace(/<script[\s\S]*?<\/script>/g, '');

    // Remove page-number divs
    body = body.replace(/<div class="page-number">.*?<\/div>/g, '');

    // Remove running-header divs
    body = body.replace(/<div class="running-header">[\s\S]*?<\/div>\s*<\/div>/g, '');

    // Remove nav sections
    body = body.replace(/<nav[\s\S]*?<\/nav>/g, '');
    body = body.replace(/<div class="book-page[^"]*"[^>]*style[^>]*>[\s\S]*?<nav[\s\S]*?<\/div>/g, '');

    // Convert book-page divs to simple divs
    body = body.replace(/<div class="book-page[^"]*"[^>]*>/g, '<div class="chapter-section">');

    // Add page break before chapter opener
    body = body.replace(/<div class="chapter-section">\s*<div class="chapter-opener"/g,
      '<div class="chapter-section page-break"><div class="chapter-opener"');

    combinedBody += body + '\n';
  }

  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: 6.5in 9.25in;
    margin: 0.5in 0.5in 0.5in 0.6in;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #1a1a1a;
  }

  .page-break { page-break-before: always; }
  .chapter-section { margin-bottom: 0; }

  /* Remove fixed page styling */
  .book-page, .chapter-section {
    width: auto !important;
    min-height: auto !important;
    height: auto !important;
    box-shadow: none !important;
    padding: 0 !important;
    position: static !important;
    background: transparent !important;
  }

  /* Chapter opener */
  .chapter-opener { padding-top: 0.5in !important; }
  .part-label {
    font-size: 8pt; font-weight: 600; text-transform: uppercase;
    letter-spacing: 2pt; color: #999; margin-bottom: 4pt;
  }
  .chapter-number {
    font-size: 9pt; font-weight: 600; text-transform: uppercase;
    letter-spacing: 2pt; color: #2E4057; margin-bottom: 2pt;
  }
  .chapter-opener h1 {
    font-size: 24pt; font-weight: 800; line-height: 1.15;
    margin-bottom: 4pt;
  }
  .ch-subtitle {
    font-size: 10pt; font-style: italic; color: #666;
    margin-bottom: 12pt;
  }

  /* Two-column content */
  .page-content {
    column-count: 2;
    column-gap: 0.25in;
    column-rule: 0.25pt solid #ddd;
  }

  .page-content p { margin-bottom: 4pt; text-align: left; }
  .page-content p + p { text-indent: 1.5em; }
  .page-content h2 + p, .page-content h3 + p,
  .page-content ul + p, .page-content ol + p,
  .page-content .sidebar + p { text-indent: 0; }

  .page-content .drop-cap { text-indent: 0; }
  .page-content .drop-cap::first-letter {
    float: left; font-size: 2.4em; line-height: 0.82;
    padding-right: 3pt; padding-top: 2pt; font-weight: 800; color: #2E4057;
  }

  h2 { font-size: 14pt; font-weight: 700; margin: 10pt 0 4pt;
    column-span: all; }
  h3 { font-size: 9pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6pt; margin: 8pt 0 2pt; color: #333; }

  ul, ol { margin: 3pt 0 6pt; padding-left: 1.2em; }
  li { margin-bottom: 2pt; line-height: 1.35; }

  blockquote {
    margin: 4pt 0; padding: 3pt 8pt;
    border-left: 2pt solid #2E4057;
    font-style: italic; color: #444;
  }

  hr { border: none; text-align: center; margin: 8pt 0; column-span: all; }
  hr::before { content: '\\2022  \\2022  \\2022'; color: #999; font-size: 9pt; }

  /* Sidebars */
  .sidebar {
    margin: 5pt 0; padding: 6pt 8pt; border-radius: 2pt;
    border-left: 3pt solid; font-size: 9.5pt; line-height: 1.35;
    break-inside: avoid;
  }
  .sidebar-label {
    font-weight: 700; font-size: 7.5pt; text-transform: uppercase;
    letter-spacing: 1pt; margin-bottom: 3pt;
  }
  .sidebar p { text-indent: 0 !important; margin-bottom: 3pt; }
  .sidebar ul { margin: 2pt 0 3pt; padding-left: 1.1em; }
  .sidebar li { margin-bottom: 1pt; }

  .sidebar.psych { background: #E8EDF4; border-color: #9FB3CF; }
  .sidebar.psych .sidebar-label { color: #2E4057; }
  .sidebar.game { background: #F5F0E4; border-color: #C9B980; }
  .sidebar.game .sidebar-label { color: #6B5A2E; }
  .sidebar.gear { background: #EAF2EB; border-color: #8CB89A; }
  .sidebar.gear .sidebar-label { color: #2A5A36; }
  .sidebar.warning { background: #FDF3ED; border-color: #D4956A; }
  .sidebar.warning .sidebar-label { color: #8A4E2A; }
  .sidebar.tip { background: #F0F7F1; border-color: #7AB88A; }
  .sidebar.tip .sidebar-label { color: #2A5A36; }

  /* Scenario */
  .scenario { margin: 5pt 0; border: 0.5pt solid #B0ACA0; border-radius: 2pt;
    overflow: hidden; break-inside: avoid; }
  .scenario-header { background: #1A1A1A; color: #fff; padding: 5pt 8pt; }
  .scenario-header .scenario-label { font-size: 6pt; text-transform: uppercase;
    letter-spacing: 1.5pt; color: rgba(255,255,255,0.5); }
  .scenario-header .scenario-title { font-size: 9pt; font-weight: 700; }
  .scenario-body { background: #EEEEE8; padding: 6pt 8pt; font-size: 9.5pt; }
  .scenario-body p { text-indent: 0 !important; margin-bottom: 3pt; }
  .scenario-body .constraints { list-style: none; padding: 0; display: flex;
    flex-wrap: wrap; gap: 3pt; margin-bottom: 5pt; }
  .scenario-body .constraints li { font-size: 6.5pt; font-weight: 600;
    background: rgba(0,0,0,0.07); padding: 1pt 4pt; border-radius: 1pt; color: #444; }

  /* Takeaway */
  .takeaway { margin: 6pt 0; padding: 6pt 8pt; background: #F0EDE6;
    border: 1pt solid #B0A890; border-left: 3pt solid #1A1A1A;
    border-radius: 2pt; font-size: 9.5pt; break-inside: avoid; column-span: all; }
  .takeaway .takeaway-label { font-size: 7pt; text-transform: uppercase;
    letter-spacing: 1.5pt; color: #666; font-weight: 700; margin-bottom: 4pt; }
  .takeaway p { text-indent: 0 !important; margin-bottom: 2pt; }
  .takeaway ul { column-count: 2; column-gap: 10pt; padding-left: 1.1em; }
  .takeaway li { margin-bottom: 2pt; }

  .xref { font-size: 9pt; color: #2E4057; text-decoration: none; }

  /* No page numbers or running headers in PDF - Chrome adds those */
</style>
</head>
<body>

<!-- Title Page -->
<div style="text-align:center; padding-top: 3in;">
  <div style="font-size: 30pt; font-weight: 800; margin-bottom: 8pt;">NO QUARTER</div>
  <div style="font-size: 14pt; font-style: italic; color: #666; margin-bottom: 20pt;">A Survival Manual</div>
  <div style="font-size: 12pt; margin-bottom: 40pt;">by Doug Addy</div>
  <div style="font-size: 8pt; color: #999; text-transform: uppercase; letter-spacing: 2pt;">Working Draft &mdash; March 2026</div>
</div>

<div class="page-break"></div>

${combinedBody}

</body></html>`;

  const outputHTML = path.join(__dirname, 'How_To_Be_Homeless_print.html');
  fs.writeFileSync(outputHTML, fullHTML);
  console.log('Combined HTML created');

  // Launch Chrome and print to PDF
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  await page.goto('file:///' + outputHTML.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  const outputPDF = path.join(__dirname, 'How_To_Be_Homeless.pdf');
  await page.pdf({
    path: outputPDF,
    width: '6.5in',
    height: '9.25in',
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.6in' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:7pt;color:#999;text-align:center;width:100%;font-family:Arial">No Quarter &mdash; A Survival Manual</div>',
    footerTemplate: '<div style="font-size:8pt;color:#666;text-align:center;width:100%;font-family:Arial">Page <span class="pageNumber"></span></div>'
  });

  console.log(`PDF created: ${outputPDF}`);
  const stats = fs.statSync(outputPDF);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

  await browser.close();
}

buildPDF().catch(err => { console.error(err); process.exit(1); });
