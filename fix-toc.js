const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const pageMap = {
  '1': 8, '2': 22, '3': 32, '4': 39, '5': 48,
  '6': 57, '7': 66, '8': 77, '9': 87,
  '10': 96, '11': 107, '12': 117,
  '13': 125, '14': 135, '15': 146, '16': 153,
  '17': 161, '18': 170, '19': 178, '20': 186,
  '21': 193, '22': 200,
  '23': 208, '24': 215, '25': 224,
  '26': 232, '27': 240, '28': 247,
  '29': 254, '30': 261, '31': 269,
  '32': 274, '33': 281, '34': 288, '35': 295
};

for (const [num, page] of Object.entries(pageMap)) {
  // Match toc-num with this number, then find toc-page within 200 chars
  const pattern = new RegExp(
    '(<span class="toc-num">' + num + '<\\/span>[\\s\\S]{0,200}?<span class="toc-page">)\\d+',
    'g'
  );
  html = html.replace(pattern, '$1' + page);
}

// Fix appendix page numbers
html = html.replace(
  /(<span class="app-letter">A<\/span>[^<]*<span class="toc-page">)\d+/,
  '$1303'
);
html = html.replace(
  /(<span class="app-letter">B<\/span>[^<]*<span class="toc-page">)\d+/,
  '$1311'
);

// Fix front matter page number (now one TOC page instead of two)
html = html.replace(
  /<div class="page-number">vii<\/div>/,
  '<div class="page-number">vi</div>'
);

fs.writeFileSync('index.html', html);
console.log('TOC page numbers updated');
