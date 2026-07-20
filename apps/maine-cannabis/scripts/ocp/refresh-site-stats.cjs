#!/usr/bin/env node
/**
 * refresh-site-stats.cjs
 *
 * Fetches the latest OCP licensee CSVs, counts active adult-use retail
 * stores and unique retail municipalities, and writes the numbers into
 * src/data/site-stats.json. Then logs the refresh to
 * public/data/ocp-stats-history.jsonl for trend monitoring.
 *
 * This automation prevents annual-report retailer-count drift across reader pages
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
 * Run fetch-ocp-towns.py and parse its JSON output plus stderr metadata to count:
 *   - active AU retail stores and unique retail municipalities from display rows
 *   - complete deduplicated caregiver storefront and municipality counts from
 *     the script's Counts metadata, including caregiver locations in AU towns
 *
 * The display gives adult-use rows priority for a shared municipality; it is
 * therefore not a valid source for the total caregiver count.
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
    // The Python script prints JSON to stdout and source metadata to stderr.
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
    const stderrLines = (proc.stderr || '').trim().split('\n');
    const countsLine = stderrLines.find(line => line.startsWith('Counts:'));
    let counts;
    try {
        counts = JSON.parse(countsLine?.slice('Counts:'.length).trim() || '');
    } catch (e) {
        log('err', `python script did not report valid count metadata: ${e.message}`);
        process.exit(2);
    }
    if (!Number.isInteger(counts.caregiverStorefronts) || counts.caregiverStorefronts < 0 ||
        !Number.isInteger(counts.caregiverMunicipalities) || counts.caregiverMunicipalities < 0) {
        log('err', 'python script reported invalid caregiver count metadata');
        process.exit(2);
    }
    const cgStores = counts.caregiverStorefronts;
    const cgMunicipalities = counts.caregiverMunicipalities;
    const sourceDateLine = stderrLines.find(line => line.startsWith('Source date:'));
    const sourceDate = sourceDateLine?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!sourceDate) {
        log('err', 'python script did not report an ISO source date');
        process.exit(2);
    }
    log('info', `python: ${sourceDateLine}`);

    return { auStores, auMunicipalities, cgStores, cgMunicipalities, asOf: sourceDate, raw: parsed };
}

function main() {
    log('info', `repo: ${REPO}`);

    if (!fs.existsSync(STATS_PATH)) {
        log('err', `site-stats.json not found at ${STATS_PATH}`);
        process.exit(2);
    }

    const stored = readStats();
    const storedLive = stored.currentOcpLicenseeRoster || {};
    const live = fetchLiveCounts();

    log('info', `live counts: ${live.auStores} active AU retail stores across ${live.auMunicipalities} municipalities (${live.cgStores} caregiver storefronts across ${live.cgMunicipalities} municipalities) as of ${live.asOf}`);
    log('info', `stored live roster: ${storedLive.auRetailStores ?? 'n/a'} active AU retail stores across ${storedLive.auMunicipalities ?? 'n/a'} municipalities as of ${storedLive.asOf ?? 'n/a'}`);

    const storeDrift = live.auStores - (storedLive.auRetailStores ?? live.auStores);
    const muniDrift = live.auMunicipalities - (storedLive.auMunicipalities ?? live.auMunicipalities);
    const driftPct = storedLive.auRetailStores
        ? Math.abs(storeDrift) / storedLive.auRetailStores
        : 0;

    const checkedAt = new Date().toISOString().split('T')[0];
    const logEntry = {
        date: checkedAt,
        sourceAsOf: live.asOf,
        liveAuStores: live.auStores,
        storedAuStores: storedLive.auRetailStores,
        storeDrift,
        liveMunis: live.auMunicipalities,
        storedMunis: storedLive.auMunicipalities,
        muniDrift,
        action: CHECK_ONLY ? 'check' : (DRY_RUN ? 'dry-run' : 'write'),
    };

    if (CHECK_ONLY) {
        if (driftPct > 0.05) {
            log('warn', `drift detected: stored=${storedLive.auRetailStores ?? 'n/a'} live=${live.auStores} (${(driftPct*100).toFixed(1)}% delta)`);
            log('warn', `re-run without --check to update site-stats.json`);
            appendLog({ ...logEntry, status: 'drift-detected' });
            process.exit(1);
        }
        log('ok', `live count within 5% of stored — no update needed`);
        appendLog({ ...logEntry, status: 'clean' });
        process.exit(0);
    }

    if (DRY_RUN) {
        log('info', '[DRY RUN] would write:');
        log('info', `  currentOcpLicenseeRoster.auRetailStores: ${storedLive.auRetailStores ?? 'n/a'} → ${live.auStores} (${storeDrift >= 0 ? '+' : ''}${storeDrift})`);
        log('info', `  currentOcpLicenseeRoster.auMunicipalities: ${storedLive.auMunicipalities ?? 'n/a'} → ${live.auMunicipalities} (${muniDrift >= 0 ? '+' : ''}${muniDrift})`);
        log('info', `  currentOcpLicenseeRoster.caregiverStorefronts: ${storedLive.caregiverStorefronts ?? 'n/a'} → ${live.cgStores}`);
        log('info', `  currentOcpLicenseeRoster.caregiverMunicipalities: ${storedLive.caregiverMunicipalities ?? 'n/a'} → ${live.cgMunicipalities}`);
        log('info', `  currentOcpLicenseeRoster.asOf: ${storedLive.asOf ?? 'n/a'} → ${live.asOf}`);
        process.exit(0);
    }

    // Preserve Annual-Report-anchored stat-card facts at the top level. Monthly
    // live OCP licensee-CSV counts belong only in currentOcpLicenseeRoster.
    const updated = {
        ...stored,
        currentOcpLicenseeRoster: {
            ...storedLive,
            auRetailStores: live.auStores,
            auMunicipalities: live.auMunicipalities,
            caregiverStorefronts: live.cgStores,
            caregiverMunicipalities: live.cgMunicipalities,
            asOf: live.asOf,
            source: 'OCP Adult-Use Establishments and Medical-Use Registrant CSVs via scripts/ocp/fetch-ocp-towns.py (live deduped storefront counts)',
            note: `Two parallel facts are intentional. The ${stored.activeAdultUseRetailStores} figure is the Annual-Report total of active AU retail-store establishments at year-end 2025. The dated live roster records ${live.auStores} deduplicated AU Store entries in ${live.auMunicipalities} municipalities and ${live.cgStores} deduplicated caregiver storefronts in ${live.cgMunicipalities} municipalities as of ${live.asOf}. These sources use different dates and definitions and must not be conflated.`,
        },
        liveOcpRefreshedAt: checkedAt,
        nextRefresh: 'Annual-report fields refresh when OCP publishes its annual report (typically Q1 the following year). OCP-CSV fields refresh monthly via `node apps/maine-cannabis/scripts/ocp/refresh-site-stats.cjs` when OCP publishes new CSVs.',
        dataSource: `OCP 2025 Annual Report (stat-card facts) + OCP Adult-Use Establishments and Medical-Use Registrant CSVs fetched ${live.asOf} (dated live-roster facts).`,
    };
    writeStats(updated);
    appendLog({ ...logEntry, status: 'written' });

    log('ok', `site-stats.json updated: live auRetailStores=${live.auStores} (was ${logEntry.storedAuStores}), auMunicipalities=${live.auMunicipalities} (was ${logEntry.storedMunis}), sourceAsOf=${live.asOf}`);

    if (storeDrift < 0) {
        log('warn', `live store count DROPPED by ${Math.abs(storeDrift)} — investigate before deploying`);
        process.exit(3);
    }
    process.exit(0);
}

main();
