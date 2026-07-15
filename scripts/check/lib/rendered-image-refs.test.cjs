const assert = require('node:assert/strict');
const test = require('node:test');
const { extractRenderedImageRefs } = require('./rendered-image-refs.cjs');

test('extracts every srcset candidate alongside rendered image references', () => {
  const refs = extractRenderedImageRefs(`
    <picture><source srcset='/images/first.webp 640w, /images/second.webp 1280w'></picture>
    <img src='/images/fallback.jpg'>
    <video poster='/images/poster.jpg'></video>
    <link as='image' href='/images/preload.jpg' rel='preload'>
    <meta content='/images/social.jpg' property='og:image'>
  `);

  assert.deepEqual(refs, [
    '/images/first.webp',
    '/images/second.webp',
    '/images/fallback.jpg',
    '/images/poster.jpg',
    '/images/preload.jpg',
    '/images/social.jpg',
  ]);
});
