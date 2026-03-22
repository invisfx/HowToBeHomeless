const fs = require('fs');
const path = require('path');

const chapters = [
  { src: 'ch01-triage.html', dst: 'ch01-triage.md', num: '01', title: null },
  { src: 'ch02-go-bag.html', dst: 'ch02-go-bag.md', num: '02', title: null },
  { src: 'ch03-prepositioning.html', dst: 'ch03-prepositioning.md', num: '03', title: null },
  { src: 'ch04-night-one.html', dst: 'ch04-night-one.md', num: '04', title: null },
  { src: 'ch05-orientation.html', dst: 'ch05-orientation.md', num: '05', title: null },
  { src: 'ch06-shelter-system.html', dst: 'ch06-shelter-system.md', num: '06', title: null },
  { src: 'ch07-vehicle-living.html', dst: 'ch07-vehicle-living.md', num: '07', title: null },
  { src: 'ch08-outside.html', dst: 'ch08-outside.md', num: '08', title: null },
  { src: 'ch09-couch-surfing.html', dst: 'ch09-couch-surfing.md', num: '09', title: null },
  { src: 'ch10-food.html', dst: 'ch10-food.md', num: '10', title: null },
  { src: 'ch11-water-hygiene.html', dst: 'ch11-water-hygiene.md', num: '11', title: null },
  { src: 'ch12-sleep.html', dst: 'ch12-sleep.md', num: '12', title: null },
];

const srcDir = path.join(__dirname, 'chapters');
const dstDir = path.join(__dirname, 'manuscript');

// HTML entity replacements
function decodeEntities(text) {
  return text
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&frac12;/g, '\u00BD')
    .replace(/&deg;/g, '\u00B0')
    .replace(/&times;/g, '\u00D7')
    .replace(/&minus;/g, '\u2212')
    .replace(/&sect;/g, '\u00A7')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&larr;/g, '\u2190')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&thinsp;/g, '\u2009')
    .replace(/&frac14;/g, '\u00BC')
    .replace(/&frac34;/g, '\u00BE')
    .replace(/&#x26A0;/g, '\u26A0')
    .replace(/&#x265F;/g, '\u265F')
    .replace(/&#x2714;/g, '\u2714')
    .replace(/&#x25B6;/g, '\u25B6')
    .replace(/&#x1F392;/g, '\uD83C\uDF92')
    .replace(/&#x1F3AF;/g, '\uD83C\uDFAF')
    .replace(/&#x[0-9A-Fa-f]+;/g, (m) => {
      const code = parseInt(m.slice(3, -1), 16);
      return String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)));
}

function convertHtmlToMarkdown(html, chNum) {
  let md = '';

  // Remove everything before <body>
  html = html.replace(/[\s\S]*?<body[^>]*>/i, '');
  // Remove script tags
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove </body></html>
  html = html.replace(/<\/body>[\s\S]*/i, '');

  // Remove Notes pages (pages with just lines for notes)
  html = html.replace(/<div class="book-page[^"]*">\s*<div class="page-content"[^>]*>\s*<h2[^>]*>Notes<\/h2>[\s\S]*?<\/div>\s*<\/div>/gi, '');
  // Also catch notes pages with different structure
  html = html.replace(/<div class="book-page[^"]*">\s*<div class="page-content"[^>]*>\s*<h2[^>]*>Notes<\/h2>[\s\S]*?<\/div>\s*<div class="page-number[^"]*"><\/div>\s*<\/div>/gi, '');

  // Remove checklist pages
  html = html.replace(/<div class="book-page[^"]*checklist[^"]*">[\s\S]*?(?=<div class="book-page|$)/gi, '');

  // Remove page-number divs
  html = html.replace(/<div class="page-number[^"]*">.*?<\/div>/gi, '');

  // Remove running-header divs
  html = html.replace(/<div class="running-header">[\s\S]*?<\/div>/gi, '');

  // Remove chapter-nav (both div and nav elements, both class names)
  html = html.replace(/<(?:div|nav) class="chapter-nav"[^>]*>[\s\S]*?<\/(?:div|nav)>/gi, '');
  html = html.replace(/<(?:div|nav) class="ch-nav"[^>]*>[\s\S]*?<\/(?:div|nav)>/gi, '');

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Extract chapter title from h1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const chTitle = h1Match ? decodeEntities(h1Match[1].replace(/<[^>]+>/g, '').trim()) : `Chapter ${chNum}`;

  // Extract chapter number text
  const chNumMatch = html.match(/<div class="chapter-number">([\s\S]*?)<\/div>/i);
  const chNumText = chNumMatch ? decodeEntities(chNumMatch[1].replace(/<[^>]+>/g, '').trim()) : `Chapter ${parseInt(chNum)}`;

  // Extract subtitle
  const subMatch = html.match(/<div class="ch-subtitle">([\s\S]*?)<\/div>/i);
  const subtitle = subMatch ? decodeEntities(subMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

  // Extract part label
  const partMatch = html.match(/<div class="part-label">([\s\S]*?)<\/div>/i);
  const partLabel = partMatch ? decodeEntities(partMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

  // Build header
  md += `# ${chNumText}: ${chTitle} {#ch${chNum}}\n\n`;
  if (subtitle) {
    md += `*${subtitle}*\n\n`;
  }

  // Remove the chapter opener structural elements (already extracted)
  html = html.replace(/<div class="part-label">[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<div class="chapter-number">[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
  html = html.replace(/<div class="ch-subtitle">[\s\S]*?<\/div>/gi, '');

  // Remove all book-page / page-content wrapper divs but keep content
  // We need to process sidebars, scenarios, takeaways before stripping divs

  // Process sidebars
  html = html.replace(/<div class="sidebar[^"]*game[^"]*">\s*<div class="sidebar-label">\s*<span class="icon">[^<]*<\/span>\s*([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SIDEBAR_GAME%%%${cleanLabel}%%%${content}%%%END_SIDEBAR%%%\n`;
  });

  html = html.replace(/<div class="sidebar[^"]*warning[^"]*">\s*<div class="sidebar-label">\s*<span class="icon">[^<]*<\/span>\s*([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SIDEBAR_WARNING%%%${cleanLabel}%%%${content}%%%END_SIDEBAR%%%\n`;
  });

  html = html.replace(/<div class="sidebar[^"]*psych[^"]*">\s*<div class="sidebar-label">\s*<span class="icon">[^<]*<\/span>\s*([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SIDEBAR_PSYCH%%%${cleanLabel}%%%${content}%%%END_SIDEBAR%%%\n`;
  });

  html = html.replace(/<div class="sidebar[^"]*gear[^"]*">\s*<div class="sidebar-label">\s*<span class="icon">[^<]*<\/span>\s*([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SIDEBAR_GEAR%%%${cleanLabel}%%%${content}%%%END_SIDEBAR%%%\n`;
  });

  html = html.replace(/<div class="sidebar[^"]*tip[^"]*">\s*<div class="sidebar-label">\s*<span class="icon">[^<]*<\/span>\s*([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SIDEBAR_TIP%%%${cleanLabel}%%%${content}%%%END_SIDEBAR%%%\n`;
  });

  // Catch any remaining sidebars with a generic pattern
  html = html.replace(/<div class="sidebar[^"]*">\s*<div class="sidebar-label">\s*<span class="icon">[^<]*<\/span>\s*([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SIDEBAR_OTHER%%%${cleanLabel}%%%${content}%%%END_SIDEBAR%%%\n`;
  });

  // Process scenarios (structure: scenario > scenario-header > scenario-label + scenario-title, then scenario-body)
  html = html.replace(/<div class="scenario">\s*<div class="scenario-header">\s*<div class="scenario-label">[^<]*<\/div>\s*<div class="scenario-title">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="scenario-body">([\s\S]*?)<\/div>\s*<\/div>/gi, (match, title, body) => {
    const cleanTitle = decodeEntities(title.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SCENARIO%%%${cleanTitle}%%%${body}%%%END_SCENARIO%%%\n`;
  });

  // Fallback: simpler scenario pattern
  html = html.replace(/<div class="scenario">\s*<div class="scenario-label">([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%SCENARIO%%%${cleanLabel}%%%${content}%%%END_SCENARIO%%%\n`;
  });

  // Process takeaways
  html = html.replace(/<div class="takeaway">\s*<div class="takeaway-label">([\s\S]*?)<\/div>([\s\S]*?)<\/div>/gi, (match, label, content) => {
    const cleanLabel = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    return `\n%%%TAKEAWAY%%%${cleanLabel}%%%${content}%%%END_TAKEAWAY%%%\n`;
  });

  // Now strip all remaining div tags
  html = html.replace(/<div[^>]*>/gi, '');
  html = html.replace(/<\/div>/gi, '');

  // Convert headings
  html = html.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (m, c) => `\n## ${c.replace(/<[^>]+>/g, '').trim()}\n\n`);
  html = html.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (m, c) => `\n### ${c.replace(/<[^>]+>/g, '').trim()}\n\n`);
  html = html.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (m, c) => `\n#### ${c.replace(/<[^>]+>/g, '').trim()}\n\n`);

  // Convert links to chapter cross-references
  html = html.replace(/<a[^>]*href="ch(\d+)-[^"]*\.html"[^>]*>([\s\S]*?)<\/a>/gi, (m, num, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/[←→]/g, '').trim();
    return `[${cleanText}](#ch${num.padStart(2, '0')})`;
  });

  // Convert other links
  html = html.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    if (href.startsWith('#')) return `[${cleanText}](${href})`;
    return `[${cleanText}](${href})`;
  });

  // Convert web-url spans to plain text
  html = html.replace(/<span class="web-url">([\s\S]*?)<\/span>/gi, (m, c) => c.trim());

  // Convert phone-num spans to plain text
  html = html.replace(/<span class="phone-num">([\s\S]*?)<\/span>/gi, (m, c) => c.trim());

  // Convert strong/b
  html = html.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, (m, c) => `**${c.trim()}**`);

  // Convert em/i
  html = html.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, (m, c) => `*${c.trim()}*`);

  // Convert ordered lists
  html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, content) => {
    let counter = 0;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, c) => {
      counter++;
      const text = c.replace(/<[^>]+>/g, '').trim();
      return `${counter}. ${text}\n`;
    });
    return `\n${items}\n`;
  });

  // Convert unordered lists
  html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, c) => {
      const text = c.replace(/<[^>]+>/g, '').trim();
      return `- ${text}\n`;
    });
    return `\n${items}\n`;
  });

  // Convert paragraphs
  html = html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (m, c) => {
    const text = c.replace(/<[^>]+>/g, '').trim();
    if (!text) return '';
    return `${text}\n\n`;
  });

  // Convert <br> tags
  html = html.replace(/<br\s*\/?>/gi, '\n');

  // Remove any remaining HTML tags
  html = html.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  html = decodeEntities(html);

  // Now process the placeholder markers

  // Process SIDEBAR markers
  html = html.replace(/%%%SIDEBAR_GAME%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SIDEBAR%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> **\u265F ${cleanLabel}**\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  html = html.replace(/%%%SIDEBAR_WARNING%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SIDEBAR%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> **\u26A0 ${cleanLabel}**\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  html = html.replace(/%%%SIDEBAR_PSYCH%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SIDEBAR%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> **\u25B6 ${cleanLabel}**\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  html = html.replace(/%%%SIDEBAR_GEAR%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SIDEBAR%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> **\uD83C\uDF92 ${cleanLabel}**\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  html = html.replace(/%%%SIDEBAR_TIP%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SIDEBAR%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> **\u2714 ${cleanLabel}**\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  html = html.replace(/%%%SIDEBAR_OTHER%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SIDEBAR%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> **${cleanLabel}**\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  // Process SCENARIO markers
  html = html.replace(/%%%SCENARIO%%%([\s\S]*?)%%%([\s\S]*?)%%%END_SCENARIO%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    const lines = cleanContent.split('\n').filter(l => l.trim()).map(l => l.trimStart());
    return `\n> *Scenario: ${cleanLabel}*\n${lines.map(l => `> ${l}`).join('\n')}\n\n`;
  });

  // Process TAKEAWAY markers
  html = html.replace(/%%%TAKEAWAY%%%([\s\S]*?)%%%([\s\S]*?)%%%END_TAKEAWAY%%%/g, (m, label, content) => {
    const cleanContent = processInnerContent(content);
    const cleanLabel = decodeEntities(label.trim());
    return `\n**${cleanLabel}**\n\n${cleanContent}\n\n`;
  });

  // Strip leading whitespace from each line (HTML indentation artifacts)
  html = html.split('\n').map(line => line.trimStart()).join('\n');

  // Clean up multiple blank lines
  html = html.replace(/\n{3,}/g, '\n\n');

  // Remove blank lines between list items (keep lists tight) - repeat to catch all
  for (let i = 0; i < 5; i++) {
    html = html.replace(/(^- .+)\n\n(- )/gm, '$1\n$2');
    html = html.replace(/(^\d+\. .+)\n\n(\d+\. )/gm, '$1\n$2');
  }

  // Remove blank lines between blockquote lines
  for (let i = 0; i < 5; i++) {
    html = html.replace(/(^> .+)\n\n(> )/gm, '$1\n$2');
  }

  // Clean up multiple blank lines again after list compaction
  html = html.replace(/\n{3,}/g, '\n\n');

  // Trim
  html = html.trim() + '\n';

  return md + html;
}

function processInnerContent(content) {
  // Strip HTML tags from sidebar/scenario/takeaway inner content
  let text = content;

  // Convert inner HTML elements
  text = text.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, (m, c) => `**${c.trim()}**`);
  text = text.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, (m, c) => `*${c.trim()}*`);
  text = text.replace(/<span class="web-url">([\s\S]*?)<\/span>/gi, (m, c) => c.trim());
  text = text.replace(/<span class="phone-num">([\s\S]*?)<\/span>/gi, (m, c) => c.trim());

  // Convert lists inside sidebars
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, content) => {
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, c) => {
      const t = c.replace(/<[^>]+>/g, '').trim();
      return `- ${t}\n`;
    });
    return `\n${items}`;
  });

  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, content) => {
    let counter = 0;
    const items = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, c) => {
      counter++;
      const t = c.replace(/<[^>]+>/g, '').trim();
      return `${counter}. ${t}\n`;
    });
    return `\n${items}`;
  });

  // Convert paragraphs
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (m, c) => {
    const t = c.replace(/<[^>]+>/g, '').trim();
    return t ? `${t}\n` : '';
  });

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode entities
  text = decodeEntities(text);

  return text.trim();
}

// Process each chapter
for (const ch of chapters) {
  const srcPath = path.join(srcDir, ch.src);
  const dstPath = path.join(dstDir, ch.dst);

  console.log(`Converting ${ch.src} -> ${ch.dst}`);

  const html = fs.readFileSync(srcPath, 'utf-8');
  const markdown = convertHtmlToMarkdown(html, ch.num);

  fs.writeFileSync(dstPath, markdown, 'utf-8');
  console.log(`  Written: ${dstPath}`);
}

console.log('\nDone! All 12 chapters converted.');
