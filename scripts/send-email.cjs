#!/usr/bin/env node
/**
 * send-email.cjs — Purelymail SMTP email sender for Maine Dispensary Guide
 *
 * Usage:
 *   node scripts/send-email.cjs --to "recipient@example.com" --subject "Subject" --body "Body text"
 *   node scripts/send-email.cjs --to "recipient@example.com" --template "intro" --vars '{"name":"John"}'
 *
 * Credentials: stored in repo-local env file
 *   config/credentials/mainedispensaryguide.env (format: EMAIL|APP_PASSWORD or env keys)
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CREDENTIALS_PATHS = [
  process.env.MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS,
  process.env.EMAIL_PIPELINE_CREDENTIALS,
  process.env.PURELYMAIL_CREDENTIALS_FILE,
  path.join(PROJECT_ROOT, 'config', 'credentials', 'mainedispensaryguide.env'),
  '/home/steve/Documents/purelymail-smtp.txt'
].filter(Boolean);
const DEFAULT_FROM = 'Steve <steve@mainedispensaryguide.com>';
const TRACKING_FILE = path.join(PROJECT_ROOT, 'public', 'data', 'email-tracking.json');
const SENT_MAIL_DIR = path.join(PROJECT_ROOT, 'public', 'data', 'sent-mail');

// Load credentials from secure file
function loadCredentials() {
  for (const credentialsPath of CREDENTIALS_PATHS) {
    if (!fs.existsSync(credentialsPath)) {
      continue;
    }
    const content = fs.readFileSync(credentialsPath, 'utf-8').trim();
    const parsed = parseCredentialsFile(content, credentialsPath);
    if (parsed) {
      return parsed;
    }
    throw new Error(`Invalid credentials format in ${credentialsPath}.`);
  }

  const searched = CREDENTIALS_PATHS.map((p) => `  - ${p}`).join('\n');
  throw new Error(
    `No valid credentials file found.\n` +
    `Checked the following locations:\n${searched}\n\n` +
    `Expected format: EMAIL|APP_PASSWORD (legacy single-line)\n` +
    `or\n` +
    `SMTP_EMAIL=steve@mainedispensaryguide.com\nSMTP_PASSWORD=your-app-password`
  );
}

function parseCredentialsFile(content, source) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (!lines.length) return null;

  const pairs = Object.create(null);
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && value) pairs[key] = value;
  }

  const email =
    pairs.EMAIL ||
    pairs.SMTP_EMAIL ||
    pairs.SMTP_USER ||
    pairs.USER ||
    pairs.MAI_EMAIL;
  const password =
    pairs.PASSWORD ||
    pairs.SMTP_PASSWORD ||
    pairs.APP_PASSWORD ||
    pairs.PM_PASSWORD ||
    pairs.TOKEN;
  if (email && password) return { email, password, source };

  if (lines.length === 1 && lines[0].includes('|')) {
    const [emailValue, passwordValue] = lines[0].split('|');
    if (emailValue && passwordValue) {
      return {
        email: emailValue,
        password: passwordValue,
        source
      };
    }
  }

  return null;
}

// Warm-up email templates
const TEMPLATES = {
  intro: {
    subject: 'Quick intro — Maine cannabis entrepreneur resource',
    body: (vars) => `Hi ${vars.name},

I'm Steve, founder of the Maine Dispensary Guide (mainedispensaryguide.com). We help entrepreneurs navigate Maine's cannabis licensing, operations, and compliance.

I came across your work and wanted to introduce myself. I'm building connections in Maine's cannabis space and would love to learn more about what you're working on.

Would you be open to a brief call sometime?

Best,
Steve`
  },
  valueShare: {
    subject: 'Maine dispensary license guide — might be useful for your clients',
    body: (vars) => `Hi ${vars.name},

I recently published a detailed guide on Maine's OCP dispensary licensing process — covering all 4 cultivation tiers, municipal requirements, and the application timeline.

Thought it might be helpful to share with your clients navigating Maine's rules. No strings attached, just figured it might save them some research time.

Take a look if you're curious: mainedispensaryguide.com/guides/maine-dispensary-license

Best,
Steve`
  },
  question: {
    subject: 'Quick question about the Maine cannabis market',
    body: (vars) => `Hi ${vars.name},

I'm working on the Maine Dispensary Guide and researching municipal opt-in patterns across Maine. I noticed ${vars.reason || 'your work in Maine\'s cannabis space'} and had a quick question:

${vars.question || 'What\'s your sense for how Portland dispensaries are handling the adult-use transition?'}

Would appreciate any thoughts you might have. Happy to share what we're building if useful: mainedispensaryguide.com/guides/maine-cannabis-market

Thanks,
Steve`
  },
  recentUpdate: {
    subject: 'New guide: Maine cannabis market analysis — thought of you',
    body: (vars) => `Hi ${vars.name},

Quick update — I just published a new guide on Maine's cannabis market analysis covering ${vars.topic || 'municipal opt-in patterns, startup costs, and licensing process'}.

Given your work in ${vars.area || 'Maine cannabis'}, I thought this might be relevant. Happy to hear any feedback: mainedispensaryguide.com/guides/maine-cannabis-market

Hope you're doing well.

Best,
Steve`
  },
  networking: {
    subject: 'Connecting — Maine cannabis entrepreneur resource',
    body: (vars) => `Hi ${vars.name},

I'm Steve, founder of the Maine Dispensary Guide (mainedispensaryguide.com) — an informational resource for entrepreneurs navigating Maine's cannabis market.

No pitch today, just wanted to introduce myself and put a face to the name. I come across a lot of Maine cannabis contacts in my work and your name keeps coming up.

Would love to connect and learn more about what you're working on. Here's our official resources page for reference: mainedispensaryguide.com/resources/maine-cannabis-official-resources

Best,
Steve`
  }
};

// Parse command line arguments
function parseArgs(args) {
  const result = { values: {}, positionals: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.values[key] = args[i + 1];
        i++;
      } else {
        result.values[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.values[key] = args[i + 1];
        i++;
      } else {
        result.values[key] = true;
      }
    } else {
      result.positionals.push(arg);
    }
  }
  return result;
}

// Send email
async function sendEmail({ to, subject, body, from = DEFAULT_FROM }) {
  const credentials = loadCredentials();

  // Try port 465 (SSL) first, fallback to port 587 (STARTTLS)
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.purelymail.com',
      port: 465,
      secure: true, // SSL/TLS
      auth: {
        user: credentials.email,
        pass: credentials.password
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000
    });
    // Test connection
    await transporter.verify();
    console.log('  Connection (port 465 SSL): OK');
  } catch (err) {
    console.log(`  Port 465 failed (${err.code || err.message}), trying 587 STARTTLS...`);
    transporter = nodemailer.createTransport({
      host: 'smtp.purelymail.com',
      port: 587,
      secure: false, // Will use STARTTLS
      auth: {
        user: credentials.email,
        pass: credentials.password
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000
    });
    try {
      await transporter.verify();
      console.log('  Connection (port 587 STARTTLS): OK');
    } catch (err2) {
      console.error(`  Port 587 also failed: ${err2.message}`);
      throw err2;
    }
  }

  const mailOptions = {
    from,
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
    bcc: 'steve@mainedispensaryguide.com'
  };

  const result = await transporter.sendMail(mailOptions);
  return result;
}

// Save sent email as .eml file for local archive
function saveSentEmail({ to, subject, body, from, messageId }) {
  try {
    if (!fs.existsSync(SENT_MAIL_DIR)) {
      fs.mkdirSync(SENT_MAIL_DIR, { recursive: true });
    }
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}_${messageId.replace(/[<>()]/g, '').substring(0, 16)}.eml`;
    const eml = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      '',
      body
    ].join('\r\n');
    fs.writeFileSync(path.join(SENT_MAIL_DIR, filename), eml, 'utf-8');
    console.log(`  ✓ Saved to: ${filename}`);
  } catch (err) {
    console.error(`  ⚠ Could not save .eml: ${err.message}`);
  }
}

// Auto-log sent email to tracking database
function logSentEmail({ to, template, messageId }) {
  try {
    if (!fs.existsSync(TRACKING_FILE)) return;
    const data = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
    const match = to.match(/^(.+?)\s*<(.+)>$/);
    const name = match ? match[1].trim() : to;
    const email = match ? match[2].trim() : to;
    const entry = {
      id: data.emails.length + 1,
      date: new Date().toISOString().split('T')[0],
      recipient: name,
      email: email,
      org: '',
      template: template || 'unknown',
      messageId: messageId || '',
      status: 'sent',
      response: 'pending',
      notes: ''
    };
    data.emails.push(entry);
    data.total_sent = data.emails.length;
    data.total_pending = data.emails.filter(e => e.response === 'pending').length;
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
    console.log(`  ✓ Logged to tracking database`);
  } catch (err) {
    console.error(`  ⚠ Could not log to tracking: ${err.message}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
send-email.cjs — Purelymail SMTP email sender

Usage:
  node scripts/send-email.cjs --to "email@example.com" --subject "Subject" --body "Body text"
  node scripts/send-email.cjs --to "email@example.com" --template "intro" --vars '{"name":"John"}'

Templates: intro, valueShare, question, recentUpdate, networking

Options:
  --to <email>        Recipient email address (required)
  --subject <text>    Email subject (required if no template)
  --body <text>      Email body text (required if no template)
  --template <name>   Use a template instead of subject/body
  --vars <json>      Variables for template (JSON string)
  --from <text>      From address (default: Steve <steve@mainedispensaryguide.com>)
  --dry-run          Print email without sending

Credentials:
  Set one of:
    - MAINE_DISPENSARYGUIDE_SMTP_CREDENTIALS
    - EMAIL_PIPELINE_CREDENTIALS
    - PURELYMAIL_CREDENTIALS_FILE
  or edit:
    config/credentials/mainedispensaryguide.env
  Format (supported):
    SMTP_EMAIL=steve@mainedispensaryguide.com
    SMTP_PASSWORD=your-app-password
    OR legacy: email|password on one line
`);
    process.exit(0);
  }

  const parsed = parseArgs(args);
  const { values } = parsed;

  // Dry run mode
  if (values['dry-run']) {
    let subject, body;
    if (values.template) {
      if (!TEMPLATES[values.template]) {
        console.error(`Error: Unknown template "${values.template}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
        process.exit(1);
      }
      const template = TEMPLATES[values.template];
      const vars = JSON.parse(values.vars || '{}');
      subject = template.subject;
      body = template.body(vars);
    } else {
      subject = values.subject || '(no subject)';
      body = values.body || '(no body)';
    }
    console.log('[DRY RUN] Would send email:');
    console.log(`  To: ${values.to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${body}`);
    process.exit(0);
  }

  // Validation
  if (!values.to) {
    console.error('Error: --to is required');
    process.exit(1);
  }

  let subject, body;

  if (values.template) {
    if (!TEMPLATES[values.template]) {
      console.error(`Error: Unknown template "${values.template}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
      process.exit(1);
    }
    const template = TEMPLATES[values.template];
    const vars = JSON.parse(values.vars || '{}');
    subject = template.subject;
    body = template.body(vars);
  } else {
    if (!values.subject || !values.body) {
      console.error('Error: --subject and --body are required (or use --template)');
      process.exit(1);
    }
    subject = values.subject;
    body = values.body;
  }

  try {
    console.log(`Sending email to ${values.to}...`);
    const result = await sendEmail({
      to: values.to,
      subject,
      body,
      from: values.from
    });
    console.log(`✓ Email sent successfully`);
    console.log(`  MessageId: ${result.messageId}`);
    logSentEmail({ to: values.to, template: values.template, messageId: result.messageId });
    saveSentEmail({ to: values.to, subject, body, from: values.from, messageId: result.messageId });
    return result;
  } catch (error) {
    console.error(`✗ Failed to send email: ${error.message}`);
    if (error.code === 'EAUTH') {
      console.error('  Authentication failed. Check your credentials in purelymail-smtp.txt');
      console.error('  Format: email|password (one line, pipe-separated)');
      console.error('  Note: Use an App Password from Purelymail if 2FA is enabled');
    }
    process.exit(1);
  }
}

main();
