function extractAttr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function htmlTags(html, tagName) {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<${escaped}\\b[^>]*>`, 'gi')) || [];
}

function srcsetCandidates(value) {
  return value.split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function extractRenderedImageRefs(html) {
  const refs = new Set();
  const add = (value, isSrcset = false) => {
    for (const ref of isSrcset ? srcsetCandidates(value) : [value]) {
      if (ref) refs.add(ref);
    }
  };

  // Preserve document order so reports stay deterministic and callers can
  // identify the first rendered reference exactly as it appeared in HTML.
  const tagRe = /<(img|source|video|link|meta)\b[^>]*>/gi;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const tag = match[0];
    if (tagName === 'img' || tagName === 'source') {
      add(extractAttr(tag, 'src'));
      add(extractAttr(tag, 'srcset'), true);
    } else if (tagName === 'video') {
      add(extractAttr(tag, 'poster'));
    } else if (tagName === 'link') {
      if (extractAttr(tag, 'rel').toLowerCase() === 'preload' && extractAttr(tag, 'as').toLowerCase() === 'image') {
        add(extractAttr(tag, 'href'));
      }
    } else if (tagName === 'meta' && extractAttr(tag, 'property').toLowerCase() === 'og:image') {
      add(extractAttr(tag, 'content'));
    }
  }
  return [...refs];
}

function metaContent(html, attribute, value) {
  for (const tag of htmlTags(html, 'meta')) {
    if (extractAttr(tag, attribute).toLowerCase() === value.toLowerCase()) return extractAttr(tag, 'content');
  }
  return '';
}

module.exports = { extractAttr, extractRenderedImageRefs, metaContent };
