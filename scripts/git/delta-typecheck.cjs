const { execSync } = require('child_process');

const projectRoot = 'C:/Users/Steve/OpenCode Projects/project-1';

console.log('=== Delta TypeCheck ===\n');

try {
    // 1. Get list of changed files from git (includes uncommitted)
    const gitCmd = 'git diff --name-only HEAD';
    const rawOutput = execSync(gitCmd, {
        cwd: projectRoot,
        encoding: 'utf-8',
        shell: true
    });

    const allFiles = rawOutput.split('\n').filter(f => f.trim());

    // 2. Filter to only .astro and .ts files
    const changedFiles = allFiles.filter(f =>
        f.endsWith('.astro') || f.endsWith('.ts')
    );

    if (changedFiles.length === 0) {
        console.log('No .astro or .ts files changed since last commit.\n');
        console.log('Result: 0 errors, 0 warnings');
        process.exit(0);
    }

    console.log(`Changed files (${changedFiles.length}):`);
    changedFiles.forEach(f => console.log(`  ${f}`));
    console.log();

    // 3. Note about astro check limitation
    console.log('Note: astro check does not support per-file checking.');
    console.log('Running full typecheck and filtering results for changed files...\n');

    // 4. Run astro check once (it checks all files)
    console.log('--- Running astro check ---\n');

    let checkOutput = '';
    let checkError = null;
    let exitCode = 0;

    try {
        checkOutput = execSync('npx astro check', {
            cwd: projectRoot,
            encoding: 'utf-8',
            shell: true,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large output
            timeout: 300000 // 5 min timeout
        });
    } catch (err) {
        exitCode = err.status || 1;
        checkOutput = (err.stdout || '') + (err.stderr || '');
        checkError = err;
    }

    // 5. Build set of changed file basenames for matching
    const changedFileSet = new Set(
        changedFiles.map(f => f.replace(/\\/g, '/').split('/').pop())
    );

    // 6. Parse output — find lines referencing changed files
    const outputLines = checkOutput.split('\n');
    const relevantLines = [];
    let collectingForFile = null;

    for (const line of outputLines) {
        // Detect file header lines (e.g., "src/pages/market-stats.astro:")
        const fileHeaderMatch = line.match(/^([\w/\\.-]+\.(?:astro|ts)):\s*$/);
        if (fileHeaderMatch) {
            const headerFile = fileHeaderMatch[1].replace(/\\/g, '/').split('/').pop();
            if (changedFileSet.has(headerFile)) {
                collectingForFile = headerFile;
                relevantLines.push(`\n[${fileHeaderMatch[1]}]`);
            } else {
                collectingForFile = null;
            }
            continue;
        }

        // Detect inline file:line references (e.g., "src/pages/guides/bangor-dispensary-guide.astro:1:262:")
        const inlineFileMatch = line.match(/^([\w/\\.-]+\.(?:astro|ts)):/);
        if (inlineFileMatch && !fileHeaderMatch) {
            const inlineFile = inlineFileMatch[1].replace(/\\/g, '/').split('/').pop();
            if (changedFileSet.has(inlineFile)) {
                collectingForFile = inlineFile;
                if (!relevantLines.some(r => r.includes(`[${inlineFileMatch[1]}]`))) {
                    relevantLines.push(`\n[${inlineFileMatch[1]}]`);
                }
            }
        }

        // Collect lines for a changed file
        if (collectingForFile) {
            relevantLines.push(line);
            // Stop after blank line or result summary line
            if (line.trim() === '' || line.includes('Result (') || line.startsWith('Result')) {
                collectingForFile = null;
            }
        }
    }

    // 7. Count errors/warnings from relevant lines
    const relevantText = relevantLines.join('\n');
    const errorMatches = relevantText.match(/\berror\b/gi) || [];
    const warningMatches = relevantText.match(/\bwarning\b/gi) || [];

    // Filter to only lines that have actual error/warning markers (not word "error" in text)
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const line of relevantLines) {
        if (line.match(/\(\d+\s+errors?\)/i)) {
            const m = line.match(/\((\d+)\s+errors?\)/i);
            totalErrors += m ? parseInt(m[1], 10) : 0;
        }
        if (line.match(/\(\d+\s+warnings?\)/i)) {
            const m = line.match(/\((\d+)\s+warnings?\)/i);
            totalWarnings += m ? parseInt(m[1], 10) : 0;
        }
    }

    // Count individual error/warning references if no summary found
    if (totalErrors === 0 && totalWarnings === 0) {
        totalErrors = errorMatches.length;
        totalWarnings = warningMatches.length;
    }

    // 8. Display results
    if (relevantLines.length > 0) {
        console.log('Errors/Warnings in changed files:');
        console.log(relevantLines.join('\n').substring(0, 3000));
        if (relevantLines.join('\n').length > 3000) {
            console.log('\n... (output truncated)');
        }
        console.log();
    }

    if (checkError && exitCode !== 0) {
        console.log('[astro check exited with non-zero code — see full output above]\n');
    }

    console.log('Changed files checked: ', changedFiles.length);
    console.log();
    console.log(`Result: ${totalErrors} errors, ${totalWarnings} warnings`);

    process.exit(exitCode);

} catch (err) {
    // Handle case where git command fails (no commits yet, not a git repo, etc.)
    if (err.message && (err.message.includes('fatal') || err.message.includes('not a git'))) {
        console.error('Git error:', err.message.split('\n')[0]);
        console.log('\nNote: Run this script from a git repository with at least one commit.');
    } else {
        console.error('Error:', err.message);
    }
    console.log('\nResult: Unable to complete check');
    process.exit(1);
}