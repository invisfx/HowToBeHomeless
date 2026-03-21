const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'chapters');

// Define correct chapter order (chapters first, appendices last)
const order = [
  'ch01-triage.html', 'ch02-go-bag.html', 'ch03-prepositioning.html',
  'ch04-night-one.html', 'ch05-orientation.html',
  'ch06-shelter-system.html', 'ch07-vehicle-living.html', 'ch08-outside.html', 'ch09-couch-surfing.html',
  'ch10-food.html', 'ch11-water-hygiene.html', 'ch12-sleep.html',
  'ch13-income.html', 'ch14-benefits.html', 'ch15-panhandling.html', 'ch16-legal.html',
  'ch17-physical-health.html', 'ch18-mental-health.html', 'ch19-violence.html', 'ch20-populations.html',
  'ch21-phone-alive.html', 'ch22-phone-tool.html',
  'ch23-survival-kit.html', 'ch24-water-power-heat.html', 'ch25-urban-improvisation.html',
  'ch26-prioritizing-exit.html', 'ch27-getting-housed.html', 'ch28-staying-housed.html',
  'ch29-best-worst-places.html', 'ch30-climate-zones.html', 'ch31-legal-landscapes.html',
  'ch32-your-brain.html', 'ch33-identity.html', 'ch34-traps.html', 'ch35-resilience.html',
  'appendix-legal-rights.html', 'appendix-resources.html'
];

// Front matter pages (index.html): 7 pages
let offset = 7;

for (const file of order) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const pages = (content.match(/class="book-page/g) || []).length;

  // Remove any existing counter-reset on body in this file
  // and add a style tag that sets the counter offset
  const counterStyle = `<style>body { counter-reset: page-counter ${offset}; }</style>`;

  if (content.includes('<style>body { counter-reset:')) {
    // Replace existing
    content = content.replace(/<style>body \{ counter-reset:.*?<\/style>/, counterStyle);
  } else {
    // Insert after <head> opening or before </head>
    content = content.replace('</head>', counterStyle + '\n</head>');
  }

  fs.writeFileSync(filePath, content);
  console.log(`${file}: pages ${offset + 1}-${offset + pages}`);
  offset += pages;
}

console.log(`\nTotal book pages: ${offset}`);
