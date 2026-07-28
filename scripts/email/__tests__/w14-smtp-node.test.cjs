'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildBodies,
  classifySmtpFailure,
  validateCanonicalUrl,
  validateMessageId,
  validateRecipient,
} = require('../../n8n-nodes/mdg-smtp-send/lib.cjs');
const { createMdgSmtpSendClass } = require('../../n8n-nodes/mdg-smtp-send/MdgSmtpSend.node.js');

const VALID_PARAMS = Object.freeze({
  leadId: 17,
  attemptId: 29,
  attemptNumber: 1,
  fromEmail: 'Maine Dispensary Guide <leads@mainedispensaryguide.com>',
  toEmail: 'synthetic@example.test',
  subject: 'Your requested guide',
  canonicalUrl: 'https://mainedispensaryguide.com/downloads/guide.pdf',
  templateVersion: '1.0.0',
  messageId: '<mdg-w14-17-a1@mainedispensaryguide.com>',
});

async function runNode(makeTransport, overrides = {}) {
  const NodeClass = createMdgSmtpSendClass(() => makeTransport);
  const node = new NodeClass();
  const params = { ...VALID_PARAMS, ...overrides };
  return node.execute.call({
    getInputData: () => [{ json: {} }],
    getCredentials: async () => ({ host: 'mock.invalid' }),
    getNodeParameter: (name) => params[name],
  });
}

test('deterministic Message-ID must match lead and attempt', () => {
  assert.equal(validateMessageId('<mdg-w14-42-a2@mainedispensaryguide.com>', 42, 2), true);
  assert.equal(validateMessageId('<mdg-w14-42-a2@mainedispensaryguide.com>', 42, 3), false);
  assert.equal(validateMessageId('arbitrary@example.com', 42, 2), false);
});

test('recipient and canonical URL validation fail closed', () => {
  assert.equal(validateRecipient('synthetic@example.invalid'), true);
  assert.equal(validateRecipient('not-an-email'), false);
  assert.equal(validateCanonicalUrl('https://mainedispensaryguide.com/downloads/asset.pdf'), true);
  assert.equal(validateCanonicalUrl('http://mainedispensaryguide.com/downloads/asset.pdf'), false);
  assert.equal(validateCanonicalUrl('https://evil.example/downloads/asset.pdf'), false);
  assert.equal(validateCanonicalUrl('https://user:pass@mainedispensaryguide.com/downloads/asset.pdf'), false);
});

test('only proven pre-acceptance connection failures retry', () => {
  assert.equal(classifySmtpFailure({ code: 'ECONNREFUSED', command: 'CONN' }).failure_class, 'retryable_pre_acceptance');
  assert.equal(classifySmtpFailure({ code: 'EAI_AGAIN', command: 'CONN' }).failure_class, 'retryable_pre_acceptance');
  assert.equal(classifySmtpFailure({ code: 'ETIMEDOUT', command: 'CONN' }).failure_class, 'retryable_pre_acceptance');
  assert.equal(classifySmtpFailure({ responseCode: 451, command: 'RCPT TO' }).failure_class, 'retryable_pre_acceptance');
});

test('permanent pre-DATA rejection is terminal', () => {
  const result = classifySmtpFailure({ code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' });
  assert.equal(result.failure_class, 'terminal');
  assert.equal(result.error_code, 'SMTP_550');
});

test('authentication, DATA-stage, timeout-after-connect, and unknown failures do not retry', () => {
  const auth = classifySmtpFailure({ code: 'EAUTH', command: 'AUTH' });
  assert.equal(auth.outcome, 'auth_failure');
  assert.equal(auth.failure_class, 'authentication');
  assert.equal(classifySmtpFailure({ code: 'ETIMEDOUT', command: 'DATA' }).failure_class, 'uncertain');
  assert.equal(classifySmtpFailure({ code: 'ECONNRESET', command: 'DATA' }).failure_class, 'uncertain');
  assert.equal(classifySmtpFailure(new Error('opaque')).failure_class, 'uncertain');
});

test('template is static, link-only, and HTML escaped', () => {
  const bodies = buildBodies('https://mainedispensaryguide.com/downloads/a.pdf?x=1&y=2', '1.0.0');
  assert.match(bodies.text, /https:\/\/mainedispensaryguide\.com\/downloads\/a\.pdf/);
  assert.match(bodies.html, /x=1&amp;y=2/);
  assert.doesNotMatch(bodies.html, /<script/i);
  assert.doesNotMatch(bodies.html, /attachment/i);
});

test('mocked accepted submission uses deterministic Message-ID and emits no recipient', async () => {
  let sent;
  let closed = false;
  const [accepted, failed] = await runNode(() => ({
    sendMail: async (message) => {
      sent = message;
      return { messageId: VALID_PARAMS.messageId, accepted: [VALID_PARAMS.toEmail], rejected: [] };
    },
    close: () => { closed = true; },
  }));

  assert.equal(accepted.length, 1);
  assert.equal(failed.length, 0);
  assert.equal(sent.messageId, VALID_PARAMS.messageId);
  assert.equal(sent.to, VALID_PARAMS.toEmail);
  assert.equal(closed, true);
  assert.doesNotMatch(JSON.stringify(accepted), /synthetic@example\.test/);
});

test('mocked proven pre-acceptance failure routes to bounded retry output', async () => {
  const [accepted, failed] = await runNode(() => ({
    sendMail: async () => { throw Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED', command: 'CONN' }); },
    close: () => {},
  }));
  assert.equal(accepted.length, 0);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].json.failure_class, 'retryable_pre_acceptance');
  assert.equal(failed[0].json.transport_invoked, true);
});

test('mocked provider Message-ID mismatch routes to manual-review uncertainty', async () => {
  const [accepted, failed] = await runNode(() => ({
    sendMail: async () => ({ messageId: '<different@example.test>', accepted: [VALID_PARAMS.toEmail], rejected: [] }),
    close: () => {},
  }));
  assert.equal(accepted.length, 0);
  assert.equal(failed.length, 1);
  assert.equal(failed[0].json.failure_class, 'uncertain');
  assert.equal(failed[0].json.error_code, 'MESSAGE_ID_MISMATCH');
});
