'use strict';

const ALLOWED_HOST = 'mainedispensaryguide.com';
const MESSAGE_ID_RE = /^<mdg-w14-(\d+)-a(\d+)@mainedispensaryguide\.com>$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function token(value, fallback = 'UNCLASSIFIED') {
  const clean = String(value || fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, '_')
    .slice(0, 64);
  return clean || fallback;
}

function validateMessageId(value, leadId, attemptNumber) {
  const match = MESSAGE_ID_RE.exec(String(value || ''));
  return Boolean(
    match &&
    String(leadId) === match[1] &&
    String(attemptNumber) === match[2]
  );
}

function validateRecipient(value) {
  return EMAIL_RE.test(String(value || ''));
}

function validateCanonicalUrl(value) {
  try {
    const parsed = new URL(String(value || ''));
    return parsed.protocol === 'https:' &&
      parsed.hostname === ALLOWED_HOST &&
      parsed.pathname.toLowerCase().endsWith('.pdf') &&
      parsed.username === '' &&
      parsed.password === '';
  } catch {
    return false;
  }
}

function smtpStage(error) {
  return token(error && error.command, 'UNKNOWN');
}

function classifySmtpFailure(error) {
  const code = token(error && error.code);
  const stage = smtpStage(error);
  const responseCode = Number(error && error.responseCode);

  if (code === 'EAUTH' || stage === 'AUTH' || responseCode === 535) {
    return { outcome: 'auth_failure', failure_class: 'authentication', error_code: code, error_stage: stage };
  }

  const connectionStage = stage === 'CONN' || stage === 'UNKNOWN';
  if (connectionStage && ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return { outcome: 'retryable_pre_acceptance', failure_class: 'retryable_pre_acceptance', error_code: code, error_stage: stage };
  }
  if (stage === 'CONN' && code === 'ETIMEDOUT') {
    return { outcome: 'retryable_pre_acceptance', failure_class: 'retryable_pre_acceptance', error_code: code, error_stage: stage };
  }

  const preDataStage = [
    'CONN', 'EHLO', 'HELO', 'STARTTLS',
    'MAIL_FROM', 'MAIL FROM', 'RCPT_TO', 'RCPT TO',
  ].includes(stage);
  if (preDataStage && [421, 429, 450, 451, 452].includes(responseCode)) {
    return {
      outcome: 'retryable_pre_acceptance',
      failure_class: 'retryable_pre_acceptance',
      error_code: `SMTP_${responseCode}`,
      error_stage: stage,
    };
  }
  if (preDataStage && responseCode >= 500 && responseCode <= 599) {
    return {
      outcome: 'terminal',
      failure_class: 'terminal',
      error_code: `SMTP_${responseCode}`,
      error_stage: stage,
    };
  }

  // DATA, dot-termination, socket closure after submission may have reached the
  // provider. Unknown errors are equally unsafe to resend.
  return { outcome: 'uncertain', failure_class: 'uncertain', error_code: code, error_stage: stage };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildBodies(canonicalUrl, templateVersion) {
  const url = escapeHtml(canonicalUrl);
  const version = escapeHtml(templateVersion);
  return {
    text: [
      'Thanks for requesting this Maine Dispensary Guide resource.',
      '',
      `Download it here: ${canonicalUrl}`,
      '',
      'This educational resource is not legal, medical, or financial advice.',
      `Template: mdg_asset_link/${templateVersion}`,
    ].join('\n'),
    html: [
      '<p>Thanks for requesting this Maine Dispensary Guide resource.</p>',
      `<p><a href="${url}">Download your requested resource</a></p>`,
      '<p><small>This educational resource is not legal, medical, or financial advice.</small></p>',
      `<p><small>Template: mdg_asset_link/${version}</small></p>`,
    ].join(''),
  };
}

module.exports = {
  buildBodies,
  classifySmtpFailure,
  token,
  validateCanonicalUrl,
  validateMessageId,
  validateRecipient,
};
