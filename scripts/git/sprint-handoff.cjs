#!/usr/bin/env node
/**
 * Sprint Handoff Generator
 * Generates a structured sprint summary from git history for BOT_COLLABORATION_HUB.md
 */

const { execSync } = require('child_process');

// --- Helpers ---

function runGit(cmd, fallback = '') {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    // Strip CRLF that appears on Windows
    return result.replace(/\r\n/g, '\n').replace(/\r/g, '').trim();
  } catch (err) {
    return fallback;
  }
}

function formatDateEdt(isoString) {
  try {
    const date = new Date(isoString);
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    };
    return date.toLocaleString('en-US', options);
  } catch {
    return isoString;
  }
}

function parseAuthorFromCommit(commitHash) {
  try {
    const result = execSync(`git log -1 --format="%an" ${commitHash}`, { encoding: 'utf-8' });
    return result.replace(/\r\n/g, '\n').trim();
  } catch {
    return 'Unknown';
  }
}

function categorizeFiles(files) {
  const categories = {
    pages: [],
    components: [],
    layouts: [],
    scripts: [],
    docs: [],
    other: []
  };

  for (const file of files) {
    if (file.startsWith('src/pages/') || file.startsWith('src/content/')) {
      categories.pages.push(file);
    } else if (file.startsWith('src/components/')) {
      categories.components.push(file);
    } else if (file.startsWith('src/layouts/')) {
      categories.layouts.push(file);
    } else if (file.startsWith('scripts/')) {
      categories.scripts.push(file);
    } else if (file.endsWith('.md') || file.endsWith('.txt') || file === 'AGENTS.md' || file === 'BOT_COLLABORATION_HUB.md') {
      categories.docs.push(file);
    } else {
      categories.other.push(file);
    }
  }

  return categories;
}

function formatFileCategory(files, label) {
  if (files.length === 0) return null;
  return `  ${label.padEnd(12)} ${files.length} (${files.join(', ')})`;
}

function parseDiffSummary(diffStat) {
  if (!diffStat || diffStat === 'No previous commit' || diffStat === 'No uncommitted changes') {
    return { added: 0, removed: 0 };
  }

  // Strip git warnings about CRLF
  const cleanStat = diffStat.replace(/warning:.*LF.*replaced by CRLF.*\n?/gi, '');

  const insertionMatch = cleanStat.match(/(\d+)\s+insertion/i);
  const deletionMatch = cleanStat.match(/(\d+)\s+deletion/i);

  return {
    added: insertionMatch ? parseInt(insertionMatch[1], 10) : 0,
    removed: deletionMatch ? parseInt(deletionMatch[1], 10) : 0
  };
}

// --- Main Logic ---

function generateSprintHandoff() {
  const output = [];
  output.push('=== Sprint Handoff Generator ===\n');

  // 1. Get latest commit info
  const lastCommitInfo = runGit('git log -1 --format="%H %ai"');
  if (!lastCommitInfo || lastCommitInfo.includes('fatal')) {
    output.push('ERROR: No git history found. Is this a git repository?\n');
    console.log(output.join(''));
    return;
  }

  const parts = lastCommitInfo.split(' ');
  const commitHash = parts[0];
  const isoTimestamp = parts.slice(1, 4).join(' '); // "2026-04-19 14:43:10 -0400"
  const formattedDate = formatDateEdt(isoTimestamp);
  const author = parseAuthorFromCommit(commitHash);

  output.push(`Last commit: ${commitHash.substring(0, 7)} (${formattedDate})`);
  output.push(`Author: ${author}\n`);

  // 2. Check if there's a previous commit (HEAD~1 exists)
  const hasPreviousCommit = runGit('git rev-parse HEAD~1', '') !== '';

  // 3. Get committed changes (HEAD vs HEAD~1) only if previous commit exists
  let diffStatCommitted = 'No previous commit';
  let diffFilesCommitted = '';
  if (hasPreviousCommit) {
    diffStatCommitted = runGit('git diff --stat HEAD~1', 'No previous commit');
    diffFilesCommitted = runGit('git diff --name-only HEAD~1', '');
  }

  // 4. Get uncommitted changes
  const diffStatUncommitted = runGit('git diff --stat HEAD', 'No uncommitted changes');
  const diffFilesUncommitted = runGit('git diff --name-only', '');

  // Parse committed files
  const committedFiles = diffFilesCommitted
    ? diffFilesCommitted.split('\n').filter(f => f.trim())
    : [];
  const uncommittedFiles = diffFilesUncommitted
    ? diffFilesUncommitted.split('\n').filter(f => f.trim())
    : [];

  // Deduplicate
  const allFilesSet = new Set([...committedFiles, ...uncommittedFiles]);
  const allFiles = [...allFilesSet];

  // Categorize
  const categories = categorizeFiles(allFiles);

  // Parse diff stats
  const committedStats = parseDiffSummary(diffStatCommitted);
  const uncommittedStats = parseDiffSummary(diffStatUncommitted);

  const totalFiles = allFiles.length;
  const totalAdded = committedStats.added + uncommittedStats.added;
  const totalRemoved = committedStats.removed + uncommittedStats.removed;

  output.push(`\nFiles changed: ${totalFiles}`);

  // Show categorized files
  if (categories.pages.length) output.push(formatFileCategory(categories.pages.slice(0, 10), 'Pages:'));
  if (categories.components.length) output.push(formatFileCategory(categories.components.slice(0, 5), 'Components:'));
  if (categories.layouts.length) output.push(formatFileCategory(categories.layouts.slice(0, 3), 'Layouts:'));
  if (categories.scripts.length) output.push(formatFileCategory(categories.scripts.slice(0, 5), 'Scripts:'));
  if (categories.docs.length) output.push(formatFileCategory(categories.docs.slice(0, 5), 'Docs:'));
  if (categories.other.length) output.push(formatFileCategory(categories.other.slice(0, 5), 'Other:'));

  output.push(`\nLines added/removed: +${totalAdded} / -${totalRemoved}`);

  // 4. Generate Hub Entry
  const sprintNumberMatch = runGit('git log --oneline -10', '').match(/Sprint\s+(\d+)/i);
  const sprintNumber = sprintNumberMatch ? parseInt(sprintNumberMatch[1], 10) + 1 : 49;
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  output.push('\n=== Suggested Hub Entry ===');

  const hubEntry = [
    `## 📋 SPRINT ${sprintNumber}: Sprint ${sprintNumber} Summary (${dateStr})`,
    '',
    `**[ORCHESTRATOR] ${formattedDate} EDT — Brief description of sprint work**`,
    '',
    '### What Was Done',
    ...(categories.pages.length ? [`- Pages: ${categories.pages.length} files modified (${categories.pages.slice(0, 3).join(', ')}${categories.pages.length > 3 ? '...' : ''})`] : []),
    ...(categories.components.length ? [`- Components: ${categories.components.length} files (${categories.components.slice(0, 3).join(', ')}${categories.components.length > 3 ? '...' : ''})`] : []),
    ...(categories.layouts.length ? [`- Layouts: ${categories.layouts.length} files (${categories.layouts.join(', ')})`] : []),
    ...(categories.scripts.length ? [`- Scripts: ${categories.scripts.length} tools (${categories.scripts.join(', ')})`] : []),
    ...(categories.docs.length ? [`- Documentation: ${categories.docs.length} files (${categories.docs.slice(0, 3).join(', ')}${categories.docs.length > 3 ? '...' : ''})`] : []),
    ...(totalAdded || totalRemoved ? [`- Line changes: +${totalAdded} / -${totalRemoved} across ${totalFiles} files`] : []),
    '',
    '### Files Modified',
    ...allFiles.slice(0, 10).map(f => `- \`${f}\``),
    ...(allFiles.length > 10 ? [`- ... and ${allFiles.length - 10} more`] : []),
    '',
    '### Verification',
    '- Typecheck: `npx astro check` → 0 errors',
    '- Build: `npm run build` → [X] pages',
    '',
    '### Notes',
    '- [Any caveats or follow-up items]',
    '',
    '---'
  ];

  output.push(hubEntry.join('\n'));

  return output.join('\n');
}

// --- Execute ---
try {
  const result = generateSprintHandoff();
  console.log(result);
} catch (err) {
  console.error('ERROR:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
}