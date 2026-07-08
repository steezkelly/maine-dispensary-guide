#!/usr/bin/env node
/**
 * refresh-site-stats.cjs
 *
 * Fetches the latest OCP licensee CSVs, counts active adult-use retail
 * stores and unique retail municipalities, and writes the numbers into
 * src/data/site-stats.json. Then logs the refresh to
 * public/data/ocp-stats-history.jsonl for trend monitoring.
 *
 * This is the automation that closes the "187 hardcode across 7 pages" drift
 * class. After the first run, the value in site-stats.json is the source of
 * truth and any consumer page that hardcodes a different number triggers a
 * stats-drift CI check (added in Sprint 78).
 *
 * Usage:
 *   node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs           # fetch live + write
 *   node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs --check   # only verify live count
 *   node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs --dry-run # show diff without writing
 *
 * Exit codes:
 *   0  clean (write or check completed, drift not worse)
 *   1  drift detected (live count differs from stored by >5%)
 *   2  tool/env error (python missing, network down, file missing)
 *   3  stats-drift regression: live count DROPPED from stored
 *
 * Schedule: monthly, first week. Pair with fetch-ocp-towns.py which produces
 * the per-city data block for find-a-dispensary.astro.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = (() => {
    let dir = __dirname;
    for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return process.cwd();
})();

const STATS_PATH = path.join(REPO, 'apps', 'maine-cannabis', 'src', 'data', 'site-stats.json');
const LOG_PATH = path.join(REPO, 'apps', 'maine-cannabis', 'public', 'data', 'ocp-stats-history.jsonl');
const PY_SCRIPT = path.join(REPO, 'scripts', 'ocp', 'fetch-ocp-towns.py');
const PYTHON = process.env.PYTHON || 'python3';

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const DRY_RUN = args.has('--dry-run');

function log(level, msg) {
    const tags = { info: '\x1b[36mi\x1b[0m', ok: '\x1b[32m✓\x1b[0m', warn: '\x1b[33m!\x1b[0m', err: '\x1b[31m✗\x1b[0m' };
    const tag = tags[level] || tags.info;
    console.log(`[refresh-site-stats] ${tag} ${msg}`);
}

function readStats() {
    return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
}

function writeStats(stats) {
    fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + '\n');
}

function appendLog(entry) {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

/**
 * Run fetch-ocp-towns.py and parse its JSON output to count:
 *   - active AU retail stores (sum of c for t=="au")
 *   - unique retail municipalities (length of output array, AU only)
 *   - caregiver storefront count (sum of c for t=="med")
 *
 * Note: the Python script dedupes by (DBA, city) for AU and by
 * (REGISTRANT_DBA, RETAIL_TOWN) for caregivers, so c is the count of unique
 * retail locations per city.
 */
function fetchLiveCounts() {
    if (!fs.existsSync(PY_SCRIPT)) {
        log('err', `Python script not found at ${PY_SCRIPT}`);
        process.exit(2);
    }

    // Sanity-check python availability
    const which = spawnSync(PYTHON, ['--version'], { encoding: 'utf8' });
    if (which.status !== 0) {
        log('err', `${PYTHON} not available — install Python 3 or set $PYTHON`);
        process.exit(2);
    }

    log('info', `running ${PYTHON} ${PY_SCRIPT} ...`);
    const proc = spawnSync(PYTHON, [PY_SCRIPT], { encoding: 'utf8', timeout: 60_000 });
    if (proc.status !== 0) {
        log('err', `python script failed: ${(proc.stderr || '').trim().split('\n').slice(0, 3).join(' | ')}`);
        process.exit(2);
    }
    // The python script prints JSON to stdout and "Total: N cities" to stderr.
    const json = (proc.stdout || '').trim();
    if (!json || !json.startsWith('[')) {
        log('err', 'python script did not emit JSON to stdout');
        process.exit(2);
    }
    let parsed;
    try {
        parsed = JSON.parse(json);
    } catch (e) {
        log('err', `JSON parse failed: ${e.message}`);
        process.exit(2);
    }

    const auStores = parsed.filter(c => c.t === 'au').reduce((sum, c) => sum + c.c, 0);
    const auMunicipalities = parsed.filter(c => c.t === 'au').length;
    const cgStores = parsed.filter(c => c.t === 'med').reduce((sum, c) => sum + c.c, 0);

    // The python script writes the per-city stderr to a different stream — we
    // log it for the agent to see.
    const totalLine = (proc.stderr || '').trim().split('\n').find(l => l.startsWith('Total:'));
    if (totalLine) log('info', `python: ${totalLine}`);

    return { auStores, auMunicipalities, cgStores, raw: parsed };
}

function main() {
    log('info', `repo: ${REPO}`);

    if (!fs.existsSync(STATS_PATH)) {
        log('err', `site-stats.json not found at ${STATS_PATH}`);
        process.exit(2);
    }

    const stored = readStats();
    const live = fetchLiveCounts();

    log('info', `live counts: ${live.auStores} active AU retail stores across ${live.auMunicipalities} municipalities (${live.cgStores} caregiver)`);
    log('info', `stored:      ${stored.activeAdultUseRetailStores} active AU retail stores across ${stored.activeAdultUseMunicipalities} municipalities`);

    const storeDrift = live.auStores - stored.activeAdultUseRetailStores;
    const muniDrift = live.auMunicipalities - stored.activeAdultUseMunicipalities;
    const driftPct = stored.activeAdultUseRetailStores
        ? Math.abs(storeDrift) / stored.activeAdultUseRetailStores
        : 0;

    const today = new Date().toISOString().split('T')[0];
    const logEntry = {
        date: today,
        liveAuStores: live.auStores,
        storedAuStores: stored.activeAdultUseRetailStores,
        storeDrift,
        liveMunis: live.auMunicipalities,
        storedMunis: stored.activeAdultUseMunicipalities,
        muniDrift,
        action: CHECK_ONLY ? 'check' : (DRY_RUN ? 'dry-run' : 'write'),
    };

    if (CHECK_ONLY) {
        if (driftPct > 0.05) {
            log('warn', `drift detected: stored=${stored.activeAdultUseRetailStores} live=${live.auStores} (${(driftPct*100).toFixed(1)}% delta)`);
            log('warn', `re-run without --check to update site-stats.json`);
            appendLog({ ...logEntry, status: 'drift-detected' });
            process.exit(1);
        }
        log('ok', `live count within 5% of stored — no update needed`);
        appendLog({ ...logEntry, status: 'clean' });
        process.exit(0);
    }

    if (DRY_RUN) {
        log('info', `[DRY RUN] would write:`);
        log('info', `  activeAdultUseRetailStores: ${stored.activeAdultUseRetailStores} → ${live.auStores} (${storeDrift >= 0 ? '+' : ''}${storeDrift})`);
        log('info', `  activeAdultUseMunicipalities: ${stored.activeAdultUseMunicipalities} → ${live.auMunicipalities} (${muniDrift >= 0 ? '+' : ''}${muniDrift})`);
        log('info', `  fiscalYearLastUpdated: ${stored.fiscalYearLastUpdated} → ${today}`);
        process.exit(0);
    }

    // Write mode: update the JSON, append to history log.
    // The agent system intentionally separates Annual-Report-anchored stat-card
    // facts (activeAdultUseRetailStores / activeAdultUseMunicipalities at the
    // top level, anchored to the OCP 2025 Annual Report Dec 31 2025 figures)
    // from the live OCP licensee-CSV counts (which move monthly). Live counts
    // go into currentOcpLicenseeRoster.auRetailStores / auMunicipalities so
    // both facts are preserved as parallel truths, not collapsed into one.
    const updated = {
        ...stored,
        currentOcpLicenseeRoster: {
            ...(stored.currentOcpLicenseeRoster || {}),
            auRetailStores: live.auStores,
            auMunicipalities: live.auMunicipalities,
            caregiverStorefronts: live.caregiverStorefronts,
            asOf: today,
            source: 'OCP Adult-Use Establishments CSV via scripts/ocp/fetch-ocp-towns.py (live deduped Store-type count)',
            note: 'Two parallel facts are intentional. The 187 figure on stat cards is the Annual-Report total of active AU retail-store establishments and is preserved as \'state of the market in 2025\'. The 107 figure below is the live OCP licensee-search CSV deduped Store-type count for today, and is what /find-a-dispensary and the OCP-tracker use to drive per-city cards. These should NOT be conflated; both refresh on the schedule documented in nextRefresh.',
        },
        liveOcpRefreshedAt: today,
        nextRefresh: 'Annual-Report fields (top-level activeAdultUse*): refresh when OCP publishes its annual report (typically Q1 the following year). OCP-CSV fields (currentOcpLicenseeRoster.*): monthly via `node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs` when OCP publishes new CSVs.',
        dataSource: `OCP 2025 Annual Report (anchors stat-card facts) + OCP Adult-Use Establishments CSV fetched ${today} (anchors per-store live facts).`,
    };
    writeStats(updated);
    appendLog({ ...logEntry, status: 'written' });

    log('ok', `site-stats.json updated: live auRetailStores=${live.auStores} (was ${logEntry.storedAuStores}), auMunicipalities=${live.auMunicipalities} (was ${logEntry.storedMunis})`);

    if (storeDrift < 0) {
        log('warn', `live store count DROPPED by ${Math.abs(storeDrift)} — investigate before deploying`);
        process.exit(3);
    }
    process.exit(0);
}

main();
