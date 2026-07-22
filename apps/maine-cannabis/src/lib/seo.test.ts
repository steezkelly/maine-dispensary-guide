import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_META_DESCRIPTION_LENGTH,
  truncateMetaDescription,
} from './seo.ts';

function descriptionCutAfter(words: string): string {
  const beforeCut = ` ${words} part`;
  const prefixLength = MAX_META_DESCRIPTION_LENGTH - 1 - beforeCut.length;
  return `${'x'.repeat(prefixLength)}${beforeCut}ial context that forces truncation`;
}

test('truncateMetaDescription removes a connector exposed by truncation', () => {
  const result = truncateMetaDescription(descriptionCutAfter('and'));

  assert.equal(result, `${'x'.repeat(150)}.`);
  assert.ok(result.length <= MAX_META_DESCRIPTION_LENGTH);
});

test('truncateMetaDescription removes chained connectors exposed by truncation', () => {
  const result = truncateMetaDescription(descriptionCutAfter('for the'));

  assert.equal(result, `${'x'.repeat(146)}.`);
  assert.ok(result.length <= MAX_META_DESCRIPTION_LENGTH);
});

test('truncateMetaDescription preserves descriptions within the limit', () => {
  const description = 'A complete description that is already within the limit.';

  assert.equal(truncateMetaDescription(description), description);
});
