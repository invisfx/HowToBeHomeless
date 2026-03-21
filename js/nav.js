// Add home button to chapter navigation
document.addEventListener('DOMContentLoaded', function() {
  // Find the nav element (various patterns used across chapters)
  var nav = document.querySelector('.chapter-nav, nav');
  if (!nav) return;

  // Check if this is a chapter page (not the index)
  if (!document.querySelector('.chapter-opener, .running-header')) return;

  // Create home button
  var home = document.createElement('a');
  home.href = '../index.html';
  home.innerHTML = '&#x2302; Contents';
  home.style.cssText = 'text-decoration:none; color:var(--ink-muted,#666); font-family:var(--font-heading,Arial,sans-serif); font-size:var(--fs-sm,9pt); text-align:center; display:flex; flex-direction:column; align-items:center; gap:2pt;';

  // Style the icon
  var icon = document.createElement('span');
  icon.innerHTML = '&#x2302;';
  icon.style.cssText = 'font-size:1.6em; line-height:1;';

  var label = document.createElement('span');
  label.textContent = 'Contents';
  label.style.cssText = 'font-size:var(--fs-xs,7.5pt); text-transform:uppercase; letter-spacing:1.5pt; color:var(--ink-faint,#999);';

  home.innerHTML = '';
  home.appendChild(icon);
  home.appendChild(label);

  // Insert between prev and next links
  var links = nav.querySelectorAll('a');
  if (links.length >= 2) {
    nav.insertBefore(home, links[1]);
  } else {
    nav.appendChild(home);
  }

  // Add flex styling to nav if not already
  nav.style.display = 'flex';
  nav.style.justifyContent = 'space-between';
  nav.style.alignItems = 'flex-start';
});
