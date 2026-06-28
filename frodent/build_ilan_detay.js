const fs = require('fs');
const path = require('path');

const BASE = 'C:\\Users\\Zımbacı\\Desktop\\epinhesabim3-project\\frodent';
const indexPath = path.join(BASE, 'index.html');
const detailPath = path.join(BASE, 'ilan-detay.html');

const index = fs.readFileSync(indexPath, 'utf8');
let detail = fs.readFileSync(detailPath, 'utf8');

function extractBetween(str, start, end) {
  const s = str.indexOf(start);
  if (s === -1) return '';
  const e = str.indexOf(end, s + start.length);
  if (e === -1) return '';
  return str.slice(s, e + end.length);
}

function extractStyle() {
  const start = index.indexOf('<style>');
  const end = index.indexOf('</style>', start);
  if (start === -1 || end === -1) return '';
  return index.slice(start + 7, end).trim();
}

function extractBody() {
  const start = index.indexOf('<body>');
  const end = index.lastIndexOf('</body>');
  if (start === -1 || end === -1) return '';
  return index.slice(start + 6, end);
}

function extractElementByClass(body, className) {
  const startMarker = `class="${className}"`;
  let start = body.indexOf(startMarker);
  if (start === -1) return '';
  // find the opening tag start
  let tagStart = body.lastIndexOf('<', start);
  if (tagStart === -1) return '';
  // find the tag name
  const tagMatch = body.slice(tagStart, start + startMarker.length).match(/<(\w+)/);
  if (!tagMatch) return '';
  const tagName = tagMatch[1];
  // find closing tag from after the opening tag, respecting nesting
  let pos = start + startMarker.length;
  let depth = 0;
  while (true) {
    const nextOpen = body.indexOf(`<${tagName}`, pos);
    const nextClose = body.indexOf(`</${tagName}>`, pos);
    if (nextClose === -1) return '';
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + tagName.length + 1;
    } else {
      if (depth === 0) {
        return body.slice(tagStart, nextClose + tagName.length + 3);
      }
      depth--;
      pos = nextClose + tagName.length + 3;
    }
  }
}

function extractScript() {
  const scripts = [];
  let pos = 0;
  while (true) {
    const start = index.indexOf('<script>', pos);
    if (start === -1) break;
    const end = index.indexOf('</script>', start);
    if (end === -1) break;
    scripts.push(index.slice(start + 8, end).trim());
    pos = end + 9;
  }
  return scripts.join('\n\n');
}

const allCss = extractStyle();
const bodyHtml = extractBody();
const headerHtml = extractElementByClass(bodyHtml, 'frontend-header');
const mobileBottomHtml = extractElementByClass(bodyHtml, 'mobile-bottom-menu');
const mobileMenuHtml = extractElementByClass(bodyHtml, 'mobile-menu');
const allJs = extractScript();

// Replace placeholders in detail
function replacePlaceholder(content, marker, replacement) {
  const re = new RegExp(`\\/\\*\\s*${marker}\\s*\\*\\/`);
  if (content.search(re) === -1) {
    // try HTML comment form
    const reHtml = new RegExp(`<!--\\s*${marker}\\s*-->`);
    return content.replace(reHtml, replacement);
  }
  return content.replace(re, replacement);
}

detail = replacePlaceholder(detail, 'HEADER_PLACEHOLDER_CSS', allCss);
detail = replacePlaceholder(detail, 'MOBILE_BOTTOM_MENU_PLACEHOLDER_CSS', '');
detail = replacePlaceholder(detail, 'MOBILE_MENU_PLACEHOLDER_CSS', '');
detail = replacePlaceholder(detail, 'HEADER_PLACEHOLDER_HTML', headerHtml);
detail = replacePlaceholder(detail, 'MOBILE_BOTTOM_MENU_PLACEHOLDER_HTML', mobileBottomHtml);
detail = replacePlaceholder(detail, 'MOBILE_MENU_PLACEHOLDER_HTML', mobileMenuHtml);
detail = replacePlaceholder(detail, 'HEADER_PLACEHOLDER_JS', allJs);
detail = replacePlaceholder(detail, 'MOBILE_BOTTOM_MENU_PLACEHOLDER_JS', '');
detail = replacePlaceholder(detail, 'MOBILE_MENU_PLACEHOLDER_JS', '');

fs.writeFileSync(detailPath, detail, 'utf8');
console.log('ilan-detay.html rebuilt with header/mobile menu from index.html');
