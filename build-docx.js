const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak
} = require('docx');

// ── Parse HTML content from chapter files ──
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&larr;/g, '\u2190').replace(/&rarr;/g, '\u2192')
    .replace(/&deg;/g, '\u00B0').replace(/&times;/g, '\u00D7')
    .replace(/&middot;/g, '\u00B7').replace(/&bull;/g, '\u2022')
    .replace(/&#x25B6;/g, '\u25B6').replace(/&#x265F;/g, '\u265F')
    .replace(/&#x26A0;/g, '\u26A0').replace(/&#x2714;/g, '\u2714')
    .replace(/&#x1F392;/g, '\uD83C\uDF92').replace(/&#x2302;/g, '\u2302')
    .replace(/&#x201C;/g, '\u201C').replace(/&#x201D;/g, '\u201D')
    .replace(/&#x2019;/g, '\u2019').replace(/&#x2018;/g, '\u2018')
    .replace(/\s+/g, ' ').trim();
}

function parseInlineRuns(html) {
  const runs = [];
  // Split on <strong> and <em> tags
  const parts = html.split(/(<\/?(?:strong|b|em|i)>)/);
  let bold = false, italic = false;
  for (const part of parts) {
    if (part === '<strong>' || part === '<b>') { bold = true; continue; }
    if (part === '</strong>' || part === '</b>') { bold = false; continue; }
    if (part === '<em>' || part === '<i>') { italic = true; continue; }
    if (part === '</em>' || part === '</i>') { italic = false; continue; }
    const text = stripTags(part);
    if (text) {
      runs.push(new TextRun({ text, bold, italics: italic, font: 'Arial', size: 22 }));
    }
  }
  return runs;
}

function extractContent(html) {
  const elements = [];

  // Extract chapter title info
  const partMatch = html.match(/class="part-label"[^>]*>(.*?)<\/div>/s);
  const chNumMatch = html.match(/class="chapter-number"[^>]*>(.*?)<\/div>/s);
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  const subtitleMatch = html.match(/class="ch-subtitle"[^>]*>(.*?)<\/div>/s);

  if (partMatch) {
    elements.push({ type: 'part-label', text: stripTags(partMatch[1]) });
  }
  if (h1Match) {
    const title = chNumMatch ? stripTags(chNumMatch[1]) + ': ' + stripTags(h1Match[1]) : stripTags(h1Match[1]);
    elements.push({ type: 'chapter-title', text: title });
  }
  if (subtitleMatch) {
    elements.push({ type: 'subtitle', text: stripTags(subtitleMatch[1]) });
  }

  // Extract page-content blocks
  const contentBlocks = html.match(/<div class="page-content">([\s\S]*?)<\/div>\s*\n\s*<div class="page-number[^"]*">/g);
  if (!contentBlocks) return elements;

  for (const block of contentBlocks) {
    // Process h2 headings
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gs;
    // Process h3 headings
    const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gs;
    // Process paragraphs
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gs;
    // Process list items
    const liRegex = /<li>([\s\S]*?)<\/li>/gs;
    // Process sidebars
    const sidebarRegex = /<div class="sidebar (\w+)">([\s\S]*?)<\/div>\s*(?=<|$)/gs;
    // Process scenarios
    const scenarioRegex = /<div class="scenario">([\s\S]*?)<\/div>\s*<\/div>/gs;
    // Process takeaways
    const takeawayRegex = /<div class="takeaway">([\s\S]*?)<\/div>\s*(?=<|\s*$)/gs;
    // Process ordered lists
    const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gs;

    // Simple line-by-line extraction
    const lines = block.split('\n');
    let inSidebar = false, sidebarType = '', sidebarContent = [];
    let inScenario = false, scenarioContent = [];
    let inTakeaway = false, takeawayContent = [];
    let inOl = false, olCounter = 0;
    let inUl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and structural elements
      if (!line || line.startsWith('<div class="page-content">') || line.startsWith('</div>')) continue;
      if (line.startsWith('<div class="page-number')) continue;
      if (line.startsWith('<nav') || line.startsWith('</nav>') || line.startsWith('<a href=')) continue;
      if (line.startsWith('<span class="nav-')) continue;
      if (line.startsWith('<script')) continue;
      if (line.startsWith('<div class="running-header">') || line.startsWith('<span class="rh-')) continue;

      // Sidebar detection
      if (line.match(/class="sidebar (\w+)"/)) {
        inSidebar = true;
        sidebarType = line.match(/class="sidebar (\w+)"/)[1];
        sidebarContent = [];
        continue;
      }

      // Scenario detection
      if (line.includes('class="scenario"') || line.includes('class="scenario-header"')) {
        inScenario = true;
        scenarioContent = [];
        continue;
      }

      // Takeaway detection
      if (line.includes('class="takeaway"')) {
        inTakeaway = true;
        takeawayContent = [];
        continue;
      }

      // End sidebar/scenario/takeaway
      if ((inSidebar || inScenario || inTakeaway) && line === '</div>') {
        if (inSidebar) {
          elements.push({ type: 'sidebar', sidebarType, content: sidebarContent });
          inSidebar = false;
        } else if (inScenario) {
          elements.push({ type: 'scenario', content: scenarioContent });
          inScenario = false;
        } else if (inTakeaway) {
          elements.push({ type: 'takeaway', content: takeawayContent });
          inTakeaway = false;
        }
        continue;
      }

      // Collect sidebar/scenario/takeaway content
      if (inSidebar || inScenario || inTakeaway) {
        const target = inSidebar ? sidebarContent : inScenario ? scenarioContent : takeawayContent;
        if (line.match(/class="sidebar-label"/)) {
          const labelText = stripTags(lines.slice(i, i + 4).join(' '));
          target.push({ type: 'label', text: labelText });
        } else if (line.match(/class="scenario-label"/)) {
          target.push({ type: 'label', text: stripTags(line) });
        } else if (line.match(/class="scenario-title"/)) {
          target.push({ type: 'scenario-title', text: stripTags(line) });
        } else if (line.match(/class="takeaway-label"/)) {
          target.push({ type: 'label', text: stripTags(line) });
        } else if (line.startsWith('<p')) {
          target.push({ type: 'p', html: line });
        } else if (line.startsWith('<li>') || line.startsWith('<li ')) {
          target.push({ type: 'li', html: line });
        }
        continue;
      }

      // Regular content
      if (line.startsWith('<h2')) {
        elements.push({ type: 'h2', text: stripTags(line) });
      } else if (line.startsWith('<h3')) {
        elements.push({ type: 'h3', text: stripTags(line) });
      } else if (line.startsWith('<p')) {
        elements.push({ type: 'p', html: line });
      } else if (line.startsWith('<li>') || line.startsWith('<li ')) {
        elements.push({ type: 'li', html: line });
      } else if (line.startsWith('<ol')) {
        inOl = true;
        olCounter = 0;
      } else if (line.startsWith('</ol')) {
        inOl = false;
      } else if (line.startsWith('<ul')) {
        inUl = true;
      } else if (line.startsWith('</ul')) {
        inUl = false;
      } else if (line.startsWith('<blockquote') || line.includes('<blockquote')) {
        // Get blockquote content
        const bqText = stripTags(line);
        if (bqText) elements.push({ type: 'blockquote', text: bqText });
      } else if (line.startsWith('<hr')) {
        elements.push({ type: 'hr' });
      }
    }
  }

  return elements;
}

// ── Build Word document ──
async function buildDoc() {
  const chaptersDir = path.join(__dirname, 'chapters');
  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.html')).sort();

  console.log(`Processing ${files.length} chapter files...`);

  const allSections = [];
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };

  // Numbering config for bullets and numbers
  const numberingConfig = [
    {
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '\u2022',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } }
      }]
    },
    {
      reference: 'numbers',
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: '%1.',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } }
      }]
    }
  ];

  // Process each chapter
  let isFirstChapter = true;
  const children = [];

  // Title page
  children.push(
    new Paragraph({ spacing: { before: 3000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'NO QUARTER', bold: true, font: 'Arial', size: 56 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'A Field Manual for Starting from Nothing', italics: true, font: 'Arial', size: 28, color: '666666' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [new TextRun({ text: 'by Doug Addy', font: 'Arial', size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Working Draft \u2014 March 2026', font: 'Arial', size: 18, color: '999999' })]
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  for (const file of files) {
    const html = fs.readFileSync(path.join(chaptersDir, file), 'utf8');
    const elements = extractContent(html);

    if (!isFirstChapter) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    isFirstChapter = false;

    for (const el of elements) {
      switch (el.type) {
        case 'part-label':
          children.push(new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: el.text.toUpperCase(), font: 'Arial', size: 16, color: '999999', bold: true })]
          }));
          break;

        case 'chapter-title':
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 100, after: 100 },
            children: [new TextRun({ text: el.text, bold: true, font: 'Arial', size: 36 })]
          }));
          break;

        case 'subtitle':
          children.push(new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: el.text, italics: true, font: 'Arial', size: 22, color: '666666' })]
          }));
          break;

        case 'h2':
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [new TextRun({ text: el.text, bold: true, font: 'Arial', size: 28 })]
          }));
          break;

        case 'h3':
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 60 },
            children: [new TextRun({ text: el.text.toUpperCase(), bold: true, font: 'Arial', size: 20, color: '333333' })]
          }));
          break;

        case 'p':
          children.push(new Paragraph({
            spacing: { after: 80 },
            children: parseInlineRuns(el.html)
          }));
          break;

        case 'li':
          children.push(new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            spacing: { after: 40 },
            children: parseInlineRuns(el.html)
          }));
          break;

        case 'blockquote':
          children.push(new Paragraph({
            spacing: { before: 100, after: 100 },
            indent: { left: 720 },
            border: { left: { style: BorderStyle.SINGLE, size: 6, color: '2E4057', space: 8 } },
            children: [new TextRun({ text: el.text, italics: true, font: 'Arial', size: 22, color: '444444' })]
          }));
          break;

        case 'hr':
          children.push(new Paragraph({
            spacing: { before: 200, after: 200 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '\u2022  \u2022  \u2022', font: 'Arial', size: 18, color: '999999' })]
          }));
          break;

        case 'sidebar': {
          const sidebarColors = {
            psych: { fill: 'E8EDF4', border: '9FB3CF', label: '2E4057' },
            game: { fill: 'F5F0E4', border: 'C9B980', label: '6B5A2E' },
            gear: { fill: 'EAF2EB', border: '8CB89A', label: '2A5A36' },
            warning: { fill: 'FDF3ED', border: 'D4956A', label: '8A4E2A' },
            tip: { fill: 'F0F7F1', border: '7AB88A', label: '2A5A36' }
          };
          const colors = sidebarColors[el.sidebarType] || sidebarColors.tip;
          const sidebarParagraphs = [];

          for (const item of el.content) {
            if (item.type === 'label') {
              sidebarParagraphs.push(new Paragraph({
                children: [new TextRun({ text: item.text, bold: true, font: 'Arial', size: 16, color: colors.label })]
              }));
            } else if (item.type === 'p') {
              sidebarParagraphs.push(new Paragraph({
                spacing: { after: 40 },
                children: parseInlineRuns(item.html)
              }));
            } else if (item.type === 'li') {
              sidebarParagraphs.push(new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                spacing: { after: 20 },
                children: parseInlineRuns(item.html)
              }));
            }
          }

          if (sidebarParagraphs.length === 0) {
            sidebarParagraphs.push(new Paragraph({ children: [new TextRun('')] }));
          }

          children.push(new Table({
            width: { size: 8640, type: WidthType.DXA },
            columnWidths: [8640],
            rows: [new TableRow({
              children: [new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                  left: { style: BorderStyle.SINGLE, size: 6, color: colors.border }
                },
                width: { size: 8640, type: WidthType.DXA },
                shading: { fill: colors.fill, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 160, right: 160 },
                children: sidebarParagraphs
              })]
            })]
          }));
          break;
        }

        case 'scenario': {
          const scenarioParagraphs = [];
          for (const item of el.content) {
            if (item.type === 'label') {
              scenarioParagraphs.push(new Paragraph({
                children: [new TextRun({ text: 'SCENARIO', bold: true, font: 'Arial', size: 14, color: 'FFFFFF' })]
              }));
            } else if (item.type === 'scenario-title') {
              scenarioParagraphs.push(new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: item.text, bold: true, font: 'Arial', size: 20, color: 'FFFFFF' })]
              }));
            } else if (item.type === 'p') {
              scenarioParagraphs.push(new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: stripTags(item.html), font: 'Arial', size: 20, color: 'FFFFFF' })]
              }));
            } else if (item.type === 'li') {
              scenarioParagraphs.push(new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                spacing: { after: 20 },
                children: [new TextRun({ text: stripTags(item.html), font: 'Arial', size: 18, color: 'FFFFFF' })]
              }));
            }
          }

          if (scenarioParagraphs.length === 0) {
            scenarioParagraphs.push(new Paragraph({ children: [new TextRun('')] }));
          }

          children.push(new Table({
            width: { size: 8640, type: WidthType.DXA },
            columnWidths: [8640],
            rows: [new TableRow({
              children: [new TableCell({
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: '1A1A1A' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: '1A1A1A' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: '1A1A1A' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: '1A1A1A' }
                },
                width: { size: 8640, type: WidthType.DXA },
                shading: { fill: '1A1A1A', type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                children: scenarioParagraphs
              })]
            })]
          }));
          break;
        }

        case 'takeaway': {
          const takeawayParagraphs = [];
          for (const item of el.content) {
            if (item.type === 'label') {
              takeawayParagraphs.push(new Paragraph({
                children: [new TextRun({ text: 'KEY TAKEAWAYS', bold: true, font: 'Arial', size: 16, color: '666666' })]
              }));
            } else if (item.type === 'p') {
              takeawayParagraphs.push(new Paragraph({
                spacing: { after: 40 },
                children: parseInlineRuns(item.html)
              }));
            } else if (item.type === 'li') {
              takeawayParagraphs.push(new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                spacing: { after: 20 },
                children: parseInlineRuns(item.html)
              }));
            }
          }

          if (takeawayParagraphs.length === 0) {
            takeawayParagraphs.push(new Paragraph({ children: [new TextRun('')] }));
          }

          children.push(new Table({
            width: { size: 8640, type: WidthType.DXA },
            columnWidths: [8640],
            rows: [new TableRow({
              children: [new TableCell({
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'B0A890' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B0A890' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'B0A890' },
                  left: { style: BorderStyle.SINGLE, size: 6, color: '1A1A1A' }
                },
                width: { size: 8640, type: WidthType.DXA },
                shading: { fill: 'F0EDE6', type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 160, right: 160 },
                children: takeawayParagraphs
              })]
            })]
          }));
          break;
        }
      }
    }
  }

  const doc = new Document({
    numbering: { config: numberingConfig },
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } }
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 100, after: 100 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 300, after: 100 }, outlineLevel: 1 }
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 20, bold: true, font: 'Arial', color: '333333' },
          paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 9360, height: 13320 }, // 6.5" x 9.25"
          margin: { top: 720, right: 720, bottom: 720, left: 864 } // 0.5" outer, 0.6" inner
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'No Quarter \u2014 A Field Manual for Starting from Nothing', font: 'Arial', size: 14, color: '999999' })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '666666' })]
          })]
        })
      },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, 'How_To_Be_Homeless.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Word document created: ${outputPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(0)} KB`);
}

buildDoc().catch(err => { console.error(err); process.exit(1); });
