#!/usr/bin/env node
/**
 * track-email.cjs — Log sent emails to the tracking database
 *
 * Usage:
 *   node scripts/track-email.cjs --add --to "name <email@org.com>" --org "Org Name" --template "intro"
 *   node scripts/track-email.cjs --reply 3 --notes "Replied positively, wants a call"
 *   node scripts/track-email.cjs --list
 */

const fs = require('fs');
const path = require('path');

const TRACKING_FILE = path.join(__dirname, '..', 'public', 'data', 'email-tracking.json');

// Read tracking data
function loadData() {
  if (!fs.existsSync(TRACKING_FILE)) {
    throw new Error(`Tracking file not found: ${TRACKING_FILE}`);
  }
  return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
}

// Save tracking data
function saveData(data) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
}

// Parse --add command
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
    } else {
      result.positionals.push(arg);
    }
  }
  return result;
}

// Add a new email entry
function addEmail({ to, org, template, messageId, notes }) {
  const data = loadData();

  // Parse name and email from "Name <email@domain.com>" format
  const match = to.match(/^(.+?)\s*<(.+)>$/);
  const name = match ? match[1].trim() : to;
  const email = match ? match[2].trim() : to;

  const newEntry = {
    id: data.emails.length + 1,
    date: new Date().toISOString().split('T')[0],
    recipient: name,
    email: email,
    org: org || '',
    template: template || 'unknown',
    messageId: messageId || '',
    status: 'sent',
    response: 'pending',
    notes: notes || ''
  };

  data.emails.push(newEntry);
  data.total_sent = data.emails.length;
  data.total_pending = data.emails.filter(e => e.response === 'pending').length;
  saveData(data);

  console.log(`✓ Logged email #${newEntry.id} to ${name} (${email})`);
  return newEntry;
}

// Update response status
function updateResponse(id, response, notes) {
  const data = loadData();
  const email = data.emails.find(e => e.id === parseInt(id));
  if (!email) {
    console.error(`Email #${id} not found`);
    process.exit(1);
  }

  email.response = response;
  if (notes) email.notes = notes;

  data.total_pending = data.emails.filter(e => e.response === 'pending').length;
  data.total_replied = data.emails.filter(e => e.response === 'replied').length;
  saveData(data);

  console.log(`✓ Updated email #${id}: response=${response}`);
}

// List all emails
function listEmails() {
  const data = loadData();
  console.log(`\nEmail Outreach Tracking — ${data.campaign}`);
  console.log(`Domain: ${data.domain} | Sender: ${data.sender}`);
  console.log(`Total: ${data.total_sent} sent | ${data.total_pending} pending | ${data.total_replied || 0} replied\n`);
  console.log('ID  Date       Recipient               Organization                  Template   Response');
  console.log('─'.repeat(90));
  data.emails.forEach(e => {
    console.log(`${String(e.id).padEnd(3)} ${e.date}   ${e.recipient.padEnd(25)} ${(e.org||'').padEnd(30)} ${e.template.padEnd(10)} ${e.response}`);
  });
  console.log('');
}

// Main
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
track-email.cjs — Email Outreach Tracking

Usage:
  node scripts/track-email.cjs --add --to "Name <email@domain.com>" --org "Org" --template "intro" --msgid "xxx"
  node scripts/track-email.cjs --reply 3 --response "replied" --notes "Had a nice chat"
  node scripts/track-email.cjs --list

Options:
  --add              Add a new sent email
  --to <email>       Recipient (format: "Name <email@domain.com>")
  --org <name>       Organization name
  --template <name>  Template used (intro, valueShare, question, recentUpdate, networking)
  --msgid <id>       SMTP MessageId
  --reply <id>       Mark email #id as having received a response
  --response <type>  Response type: replied, opened, bounced, declined
  --notes <text>     Notes about the interaction
  --list             List all tracked emails
`);
    process.exit(0);
  }

  const { values, positionals } = parseArgs(args);

  if (values.list) {
    listEmails();
  } else if (values.add) {
    addEmail({
      to: values.to,
      org: values.org,
      template: values.template,
      messageId: values.msgid,
      notes: values.notes
    });
  } else if (values.reply) {
    updateResponse(values.reply, values.response || 'replied', values.notes);
  } else {
    console.error('Use --add, --reply, or --list');
    process.exit(1);
  }
}

main();
