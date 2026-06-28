const fs = require('fs');
const path = require('path');

const BASE = 'C:\\Users\\Zımbacı\\Desktop\\epinhesabim3-project\\frodent';
const indexPath = path.join(BASE, 'index.html');
const detailPath = path.join(BASE, 'ilan-detay.html');

const index = fs.readFileSync(indexPath, 'utf8');
let detail = fs.readFileSync(detailPath, 'utf8');

function extractBetween(str, startTag, endTag, fromIndex = 0) {
  const start = str.indexOf(startTag, fromIndex);
  if (start === -1) return { before: '', content: '', after: str };
  const contentStart = start + startTag.length;
  const end = str.indexOf(endTag, contentStart);
  if (end === -1) return { before: str.slice(0, start + startTag.length), content: '', after: '' };
  return {
    before: str.slice(0, start + startTag.length),
    content: str.slice(contentStart, end),
    after: str.slice(end)
  };
}

function extractHeader(str) {
  const marker = 'class="frontend-header"';
  let start = str.indexOf(marker);
  if (start === -1) return '';
  let tagStart = str.lastIndexOf('<', start);
  if (tagStart === -1) return '';
  const closeTag = '</header>';
  let end = str.indexOf(closeTag, tagStart);
  if (end === -1) return '';
  return str.slice(tagStart, end + closeTag.length);
}

// 1. Replace header HTML in ilan-detay.html with the one from index.html
const indexHeader = extractHeader(index);
const detailHeader = extractHeader(detail);
if (indexHeader && detailHeader) {
  detail = detail.replace(detailHeader, indexHeader);
  console.log('Replaced header HTML. New length:', indexHeader.length);
} else {
  console.log('Could not replace header. indexHeader:', indexHeader.length, 'detailHeader:', detailHeader.length);
}

// 2. Merge index.html inline CSS into ilan-detay.html style block (index CSS first, then existing detail CSS)
const indexStyle = extractBetween(index, '<style>', '</style>');
const detailStyle = extractBetween(detail, '<style>', '</style>');
if (indexStyle.content && detailStyle.content) {
  const merged = indexStyle.before + '\n' + indexStyle.content + '\n\n/* ----- detail page styles ----- */\n' + detailStyle.content + detailStyle.after;
  detail = detailStyle.before + merged.slice(indexStyle.before.length);
  console.log('Merged CSS. index CSS length:', indexStyle.content.length, 'detail CSS length:', detailStyle.content.length);
} else {
  console.log('Could not merge CSS. indexStyle:', !!indexStyle.content, 'detailStyle:', !!detailStyle.content);
}

fs.writeFileSync(detailPath, detail, 'utf8');
console.log('Done.');
