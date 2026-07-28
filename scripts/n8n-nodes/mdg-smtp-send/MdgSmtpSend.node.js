'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildBodies,
  classifySmtpFailure,
  validateCanonicalUrl,
  validateMessageId,
  validateRecipient,
} = require('./lib.cjs');

let configureTransport;

function loadConfigureTransport() {
  if (configureTransport) return configureTransport;

  // W14 is pinned to the deployed n8n image digest. Reuse the image's exact
  // SMTP transport helper so credential field semantics stay identical to the
  // built-in Email Send node while adding the required Message-ID contract.
  const pnpmRoot = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm';
  const packageDirs = fs.readdirSync(pnpmRoot)
    .filter((name) => name.startsWith('n8n-nodes-base@'))
    .sort();

  for (const packageDir of packageDirs) {
    const candidate = path.join(
      pnpmRoot,
      packageDir,
      'node_modules/n8n-nodes-base/dist/nodes/EmailSend/v2/utils.js',
    );
    if (!fs.existsSync(candidate)) continue;
    const loaded = require(candidate);
    if (typeof loaded.configureTransport === 'function') {
      configureTransport = loaded.configureTransport;
      return configureTransport;
    }
  }

  throw new Error('W14 SMTP transport helper is unavailable for this pinned n8n image');
}

function createMdgSmtpSendClass(transportLoader = loadConfigureTransport) {
  return class MdgSmtpSend {
  constructor() {
    this.description = {
      displayName: 'MDG W14 SMTP Send',
      name: 'mdgSmtpSend',
      icon: 'fa:envelope',
      group: ['output'],
      version: 1,
      description: 'Single-attempt W14 SMTP submission with deterministic Message-ID',
      defaults: { name: 'MDG W14 SMTP Send' },
      inputs: ['main'],
      outputs: ['main', 'main'],
      outputNames: ['Accepted', 'Failure / Review'],
      credentials: [{ name: 'smtp', required: true }],
      properties: [
        { displayName: 'Lead ID', name: 'leadId', type: 'number', required: true, default: 0 },
        { displayName: 'Attempt ID', name: 'attemptId', type: 'number', required: true, default: 0 },
        { displayName: 'Attempt Number', name: 'attemptNumber', type: 'number', required: true, default: 0 },
        { displayName: 'From', name: 'fromEmail', type: 'string', required: true, default: '' },
        { displayName: 'To', name: 'toEmail', type: 'string', required: true, default: '' },
        { displayName: 'Subject', name: 'subject', type: 'string', required: true, default: '' },
        { displayName: 'Canonical URL', name: 'canonicalUrl', type: 'string', required: true, default: '' },
        { displayName: 'Template Version', name: 'templateVersion', type: 'string', required: true, default: '' },
        { displayName: 'Message ID', name: 'messageId', type: 'string', required: true, default: '' },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const credentials = await this.getCredentials('smtp');
    const makeTransport = transportLoader();
    const successOutput = [];
    const failureOutput = [];

    for (let index = 0; index < items.length; index += 1) {
      const leadId = this.getNodeParameter('leadId', index);
      const attemptId = this.getNodeParameter('attemptId', index);
      const attemptNumber = this.getNodeParameter('attemptNumber', index);
      const fromEmail = this.getNodeParameter('fromEmail', index);
      const toEmail = this.getNodeParameter('toEmail', index);
      const subject = this.getNodeParameter('subject', index);
      const canonicalUrl = this.getNodeParameter('canonicalUrl', index);
      const templateVersion = this.getNodeParameter('templateVersion', index);
      const messageId = this.getNodeParameter('messageId', index);

      const base = {
        lead_id: leadId,
        attempt_id: attemptId,
        attempt_number: attemptNumber,
        transport_invoked: false,
      };

      if (!validateMessageId(messageId, leadId, attemptNumber)) {
        failureOutput.push({ json: { ...base, outcome: 'terminal', failure_class: 'terminal', error_code: 'INVALID_MESSAGE_ID', error_stage: 'LOCAL_VALIDATION' } });
        continue;
      }
      if (!validateRecipient(toEmail) || !validateRecipient(String(fromEmail).replace(/^.*<([^>]+)>.*$/, '$1'))) {
        failureOutput.push({ json: { ...base, outcome: 'terminal', failure_class: 'terminal', error_code: 'INVALID_RECIPIENT', error_stage: 'LOCAL_VALIDATION' } });
        continue;
      }
      if (!validateCanonicalUrl(canonicalUrl) || !/^\d+\.\d+\.\d+$/.test(String(templateVersion))) {
        failureOutput.push({ json: { ...base, outcome: 'terminal', failure_class: 'terminal', error_code: 'INVALID_TEMPLATE_OR_URL', error_stage: 'LOCAL_VALIDATION' } });
        continue;
      }

      const bodies = buildBodies(canonicalUrl, templateVersion);
      const transporter = makeTransport(credentials, { allowUnauthorizedCerts: false });
      try {
        const info = await transporter.sendMail({
          from: fromEmail,
          to: toEmail,
          subject,
          text: bodies.text,
          html: bodies.html,
          messageId,
        });

        const providerMessageId = String(info && info.messageId || '');
        const acceptedCount = Array.isArray(info && info.accepted) ? info.accepted.length : 0;
        const rejectedCount = Array.isArray(info && info.rejected) ? info.rejected.length : 0;

        if (providerMessageId !== messageId) {
          failureOutput.push({ json: { ...base, transport_invoked: true, outcome: 'uncertain', failure_class: 'uncertain', error_code: 'MESSAGE_ID_MISMATCH', error_stage: 'PROVIDER_RESPONSE' } });
        } else if (acceptedCount === 1 && rejectedCount === 0) {
          successOutput.push({ json: { ...base, transport_invoked: true, outcome: 'success', provider_message_id: providerMessageId, accepted_count: 1, rejected_count: 0 } });
        } else if (acceptedCount === 0 && rejectedCount > 0) {
          failureOutput.push({ json: { ...base, transport_invoked: true, outcome: 'terminal', failure_class: 'terminal', error_code: 'RECIPIENT_REJECTED', error_stage: 'PROVIDER_RESPONSE' } });
        } else {
          failureOutput.push({ json: { ...base, transport_invoked: true, outcome: 'uncertain', failure_class: 'uncertain', error_code: 'AMBIGUOUS_PROVIDER_RESPONSE', error_stage: 'PROVIDER_RESPONSE' } });
        }
      } catch (error) {
        failureOutput.push({ json: { ...base, transport_invoked: true, ...classifySmtpFailure(error) } });
      } finally {
        if (transporter && typeof transporter.close === 'function') transporter.close();
      }
    }

    return [successOutput, failureOutput];
  }
  };
}

const MdgSmtpSend = createMdgSmtpSendClass();

module.exports = { MdgSmtpSend, createMdgSmtpSendClass, loadConfigureTransport };
