const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'chapters');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const titles = [
  'Where to Park', 'Where to Camp', 'How to Get Free Food',
  'Online Fundraising', 'Community Fridges', 'Free WiFi',
  'Places People Sleep', 'Hygiene Hacks', 'Advanced Sleep',
  'Smokeless Fire', 'Food Preservation', 'Advanced Urban',
  'Tax Filing', 'COBRA vs', 'Hiding Homelessness',
  'Keep Your Vehicle', 'Storage Unit', 'Self-Defense',
  'Natural Disasters', 'Keeping Relationships', 'Cashing Out Life',
  'Accessing Retirement', 'The Exit Number', 'Pre-Eviction Action',
  'Go-Bag Packing', 'First Night Survival', 'First Week Setup',
  'Benefits Application', 'Hydration and Electrolytes',
  'Emergency Hotlines', 'Shelter and Housing', 'Government Benefits',
  'Veterans', 'Legal Help', 'Employment'
];

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const title of titles) {
    // Look for page-content divs (without existing column-count override)
    // that contain one of our resource page titles within the next 500 chars
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      '(<div class="page-content">)([\\s\\S]{0,500}?' + escaped + ')',
      'g'
    );
    const newContent = content.replace(re, '<div class="page-content" style="column-count:1;">$2');
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed: ' + file);
    totalFixed++;
  }
}

console.log('Total files fixed: ' + totalFixed);
