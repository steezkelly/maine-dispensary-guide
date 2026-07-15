'use strict';

function htmlDecode(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function srcsetCandidates(value) {
  return htmlDecode(value)
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function extractImgRefs(html) {
  const refs = new Set();
  const attrRe = /\b(?:src|srcset|poster)\s*=\s*(["'])(.*?)\1/gis;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    for (const token of srcsetCandidates(m[2])) refs.add(token);
  }

  const preloadRe = /<link\b(?=[^>]*\brel\s*=\s*(["'])preload\1)(?=[^>]*\bas\s*=\s*(["'])image\2)[^>]*\bhref\s*=\s*(["'])(.*?)\3[^>]*>/gis;
  while ((m = preloadRe.exec(html)) !== null) refs.add(htmlDecode(m[4]));

  const ogRe = /<meta\b(?=[^>]*\bproperty\s*=\s*(["'])og:image\1)[^>]*\bcontent\s*=\s*(["'])(.*?)\2[^>]*>/gis;
  while ((m = ogRe.exec(html)) !== null) refs.add(htmlDecode(m[3]));

  return [...refs];
}

module.exports = {
  extractImgRefs,
  srcsetCandidates,
};
