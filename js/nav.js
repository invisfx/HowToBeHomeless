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

// Auto-highlight URLs and phone numbers
document.addEventListener('DOMContentLoaded', function() {
  // Walk all text nodes in page-content areas
  var containers = document.querySelectorAll('.page-content');
  containers.forEach(function(container) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function(node) {
      var text = node.textContent;
      // Skip if inside a link, sidebar-label, or already highlighted
      if (node.parentElement.closest('a, .web-url, .phone-num, .sidebar-label, h1, h2, h3')) return;
      if (!text.trim()) return;

      // Match URLs: word.word patterns like findhelp.org, 211.org, healthcare.gov/path
      // Match phone numbers: 1-800-XXX-XXXX, 1-888-XXX-XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX, 211, 911, 988
      var urlPattern = /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|gov|edu|net|info|io)(?:\/[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]*)?)\b/g;
      var phonePattern = /\b(1-\d{3}-\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\(\d{3}\)\s?\d{3}-\d{4}|1-\d{3}-\d{3}-\d{4})\b/g;
      var shortPattern = /\b(211|911|988)\b/g;

      // Check if this text has any matches
      var hasUrl = urlPattern.test(text);
      urlPattern.lastIndex = 0;
      var hasPhone = phonePattern.test(text);
      phonePattern.lastIndex = 0;
      var hasShort = shortPattern.test(text);
      shortPattern.lastIndex = 0;

      if (!hasUrl && !hasPhone && !hasShort) return;

      // Build replacement HTML
      var html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Replace URLs first
      html = html.replace(urlPattern, '<span class="web-url">$1</span>');
      // Replace phone numbers
      html = html.replace(phonePattern, '<span class="phone-num">$1</span>');
      // Replace short codes (only standalone 211, 911, 988)
      html = html.replace(/\b(211|911|988)\b/g, function(match) {
        // Don't re-wrap if already inside a span
        return '<span class="phone-num">' + match + '</span>';
      });

      var span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    });
  });
});
