'use strict';
/**
 * apps/maine-cannabis/scripts/data/mdg-data/tests/q3-2026-source-pool.test.cjs
 *
 * Focused test for the Q3 2026 source pool. Each assertion
 * (a) verifies the existence of a research file at the
 * documented path and (b) verifies the presence of a specific
 * verified figure inside that file. These assertions exist so
 * that any future operator who moves, renames, or silently edits
 * a Q3 source-pool file gets a specific, attributable failure
 * instead of an end-of-pipeline "this chart looks wrong" failure.
 *
 * The test does NOT verify that the figures are correct against
 * the live OCP dashboard. Re-verification against primary
 * sources is the editor's job; the test verifies only that the
 * frozen source-pool artifacts still contain the figures that
 * were verified on 2026-07-22.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
// __dirname = .../apps/maine-cannabis/scripts/data/mdg-data/tests
// up 5: tests -> mdg-data -> data -> scripts -> apps -> <repo>

let pass = 0, fail = 0;
function check(name, fn) {
    try { fn(); process.stderr.write('  ok  ' + name + '\n'); pass++; }
    catch (err) { process.stderr.write('  FAIL ' + name + ': ' + err.message + '\n'); fail++; }
}

function existsRepoRelative(rel) {
    return fs.existsSync(path.join(REPO, rel));
}

function readRepoFile(rel) {
    return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

// --- 1. Q3 source-pool index and reference doc exist and are well-formed ---

check('docs/research/q3-2026-INDEX.md exists', () => {
    assert.ok(existsRepoRelative('docs/research/q3-2026-INDEX.md'),
        'missing docs/research/q3-2026-INDEX.md');
});

check('q3-2026-INDEX.md distinguishes CSV file lines from data rows', () => {
    const txt = readRepoFile('docs/research/q3-2026-INDEX.md');
    const expectedCounts = [
        ['ocp-au-licenses-2026-06-01.csv', 1584, 1583],
        ['ocp-med-caregivers-2026-06-01.csv', 1415, 1414],
        ['ocp-med-establishments-2026-06-01.csv', 805, 804],
    ];

    for (const [file, fileLines, dataRows] of expectedCounts) {
        const indexLine = txt.split('\n').find(line => line.includes(file));
        assert.ok(indexLine, `q3-2026-INDEX.md missing ${file}`);
        assert.ok(indexLine.includes(`${fileLines.toLocaleString('en-US')} file lines`),
            `${file} index entry should state ${fileLines.toLocaleString('en-US')} file lines`);
        assert.ok(indexLine.includes(`${dataRows.toLocaleString('en-US')} data rows + header`),
            `${file} index entry should state ${dataRows.toLocaleString('en-US')} data rows + header`);
        assert.ok(!/raw rows/i.test(indexLine),
            `${file} index entry must not use ambiguous "raw rows" terminology`);
    }
});

check('docs/research/q3-2026-source-pool.md exists', () => {
    assert.ok(existsRepoRelative('docs/research/q3-2026-source-pool.md'),
        'missing docs/research/q3-2026-source-pool.md');
});

check('q3-2026-source-pool.md states the anchor edition (live OCP dashboard)', () => {
    const txt = readRepoFile('docs/research/q3-2026-source-pool.md');
    // The doc uses "live OCP adult-use retail-sales dashboard edition" — match
    // the live-OCP-dashboard phrase, not a particular conjunction.
    assert.ok(/live OCP[^.]*dashboard edition/.test(txt),
        'q3-2026-source-pool.md does not mention the live OCP dashboard anchor edition');
    assert.ok(/246\.817/.test(txt) || /246,817/.test(txt),
        'q3-2026-source-pool.md does not cite the $246.817M dashboard figure');
});

check('q3-2026-source-pool.md states the data cutoff 2026-07-22', () => {
    const txt = readRepoFile('docs/research/q3-2026-source-pool.md');
    assert.ok(/2026-07-22/.test(txt),
        'q3-2026-source-pool.md does not state the data cutoff 2026-07-22');
});

// --- 2. Maine market-data SOURCE-MATRIX contains the verified June 2026 + H1 2026 figures ---

check('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md exists', () => {
    assert.ok(existsRepoRelative('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md'),
        'missing SOURCE-MATRIX.md');
});

const REQUIRED_JUNE_FIGURES = [
    ['$20,688,125', 'OCP June 2026 adult-use sales'],
    ['425,839',     'OCP June 2026 receipt transactions'],
    ['$6.04',       'OCP June 2026 average bud/flower price per gram'],
];

for (const [figure, label] of REQUIRED_JUNE_FIGURES) {
    check(`SOURCE-MATRIX.md contains June 2026 figure: ${label} (${figure})`, () => {
        const txt = readRepoFile('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md');
        assert.ok(txt.includes(figure),
            `SOURCE-MATRIX.md missing verified figure "${figure}" for ${label}`);
    });
}

const REQUIRED_YTD_FIGURES = [
    ['$119,954,243', 'OCP Jan–Jun 2026 adult-use sales'],
    ['2,439,812',    'OCP Jan–Jun 2026 receipt transactions'],
    ['$6.10',        'OCP Jan–Jun 2026 YTD average bud/flower price per gram'],
];

for (const [figure, label] of REQUIRED_YTD_FIGURES) {
    check(`SOURCE-MATRIX.md contains H1 2026 figure: ${label} (${figure})`, () => {
        const txt = readRepoFile('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md');
        assert.ok(txt.includes(figure),
            `SOURCE-MATRIX.md missing verified figure "${figure}" for ${label}`);
    });
}

check('SOURCE-MATRIX.md preserves the freeze-statutory edition label', () => {
    const txt = readRepoFile('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md');
    assert.ok(/frozen statutory edition/i.test(txt),
        'SOURCE-MATRIX.md should explicitly preserve the frozen statutory edition label');
});

check('SOURCE-MATRIX.md preserves the "preliminary" status label for dashboard figures', () => {
    const txt = readRepoFile('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md');
    assert.ok(/preliminary/i.test(txt),
        'SOURCE-MATRIX.md should explicitly mark OCP dashboard figures as preliminary');
});

check('SOURCE-MATRIX.md preserves the medical caregiver 1,412 / 1,414 reconciliation flag', () => {
    const txt = readRepoFile('apps/maine-cannabis/docs/research/q3-2026-data/SOURCE-MATRIX.md');
    assert.ok(/1,412/.test(txt) && /1,414/.test(txt),
        'SOURCE-MATRIX.md should preserve both 1,412 (dashboard card) and 1,414 (roster CSV) caregiver counts');
});

// --- 3. Raw CSV/XLSX data snapshots exist and are non-empty ---

const DATA_FILES = [
    ['apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.csv',
        'MRS May 2026 cannabis sales CSV'],
    ['apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.xlsx',
        'MRS May 2026 cannabis sales XLSX'],
    ['apps/maine-cannabis/docs/research/q3-2026-data/ocp-au-licenses-2026-06-01.csv',
        'OCP adult-use licenses CSV (2026-06-01)'],
    ['apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-caregivers-2026-06-01.csv',
        'OCP medical caregivers CSV (2026-06-01)'],
    ['apps/maine-cannabis/docs/research/q3-2026-data/ocp-med-establishments-2026-06-01.csv',
        'OCP medical establishments CSV (2026-06-01)'],
];

for (const [rel, label] of DATA_FILES) {
    check(`${label} exists and has non-zero size`, () => {
        const full = path.join(REPO, rel);
        assert.ok(fs.existsSync(full), `${rel} does not exist`);
        const stat = fs.statSync(full);
        assert.ok(stat.size > 0, `${rel} is empty (0 bytes)`);
    });
}

check('MRS May 2026 XLSX worksheet dimension covers populated cells', () => {
    const rel = 'apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.xlsx';
    const sheetXml = execFileSync('unzip', ['-p', path.join(REPO, rel), 'xl/worksheets/sheet1.xml'], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
    });
    const dimension = sheetXml.match(/<dimension[^>]*ref="([^"]+)"/);
    assert.ok(dimension, 'MRS XLSX sheet1.xml is missing a worksheet dimension');
    assert.ok(/^A1:[A-Z]+[1-9][0-9]*$/.test(dimension[1]),
        `MRS XLSX worksheet dimension should cover its populated range, got ${dimension[1]}`);

    const cellRefs = [...sheetXml.matchAll(/<c[^>]* r="([A-Z]+)([0-9]+)"/g)];
    assert.ok(cellRefs.length > 0, 'MRS XLSX sheet1.xml contains no cell references');
    const columnNumber = label => [...label].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
    const dimensionEnd = dimension[1].match(/^A1:([A-Z]+)([0-9]+)$/);
    const maxColumn = Math.max(...cellRefs.map(match => columnNumber(match[1])));
    const maxRow = Math.max(...cellRefs.map(match => Number(match[2])));
    assert.equal(columnNumber(dimensionEnd[1]), maxColumn,
        `MRS XLSX worksheet dimension ends at column ${dimensionEnd[1]}, but populated cells reach column number ${maxColumn}`);
    assert.equal(Number(dimensionEnd[2]), maxRow,
        `MRS XLSX worksheet dimension ends at row ${dimensionEnd[2]}, but populated cells reach row ${maxRow}`);
});

check('MRS May 2026 CSV contains the Medical and Adult-use columns and Year/Month rows', () => {
    const txt = readRepoFile('apps/maine-cannabis/docs/research/q3-2026-data/mrs-may-2026-cannabis-sales.csv');
    assert.ok(/Year/.test(txt) && /Month/.test(txt) && /Medical/.test(txt) && /Adult use/i.test(txt),
        'MRS CSV header row missing one of Year, Month, Medical, Adult use');
});

check('OCP adult-use licenses CSV contains the standard header row', () => {
    // Read only the first ~1KB to avoid loading the full 460KB file
    const fd = fs.openSync(path.join(REPO, 'apps/maine-cannabis/docs/research/q3-2026-data/ocp-au-licenses-2026-06-01.csv'), 'r');
    const buf = Buffer.alloc(2048);
    fs.readSync(fd, buf, 0, 2048, 0);
    fs.closeSync(fd);
    const header = buf.toString('utf8');
    assert.ok(/LICENSE/.test(header) && /LICENSE_CATEGORY/.test(header) && /LICENSE_STATUS/.test(header),
        'OCP adult-use licenses CSV missing standard columns (LICENSE / LICENSE_CATEGORY / LICENSE_STATUS)');
});

// --- 4. Legal/regulatory source matrix contains OCP 18-691 CMR ch. 40 and the P.L. 2025 ch. 764 ---

check('Legal/regulatory matrix exists', () => {
    assert.ok(existsRepoRelative('docs/research/q3-2026-legal-regulatory-source-matrix.md'),
        'missing docs/research/q3-2026-legal-regulatory-source-matrix.md');
});

check('Legal/regulatory matrix cites 18-691 CMR ch. 40 effective date (2024-11-06)', () => {
    const txt = readRepoFile('docs/research/q3-2026-legal-regulatory-source-matrix.md');
    // The matrix uses "18-691 CMR chapters 5 and 40" (plural "chapters");
    // match either the singular ch. 40 or the multi-chapter form.
    assert.ok(/18-691\s*CMR\s*ch(?:apter)?s?\s*(?:\d|5 and 40)/i.test(txt),
        'legal/regulatory matrix should reference 18-691 CMR chapter 40 (or chapters 5 and 40)');
    assert.ok(/2024-11-06/.test(txt),
        'legal/regulatory matrix should state the 18-691 CMR ch. 40 effective date 2024-11-06');
});

check('Legal/regulatory matrix cites P.L. 2025, ch. 764 / LD 1488 edible testing change', () => {
    const txt = readRepoFile('docs/research/q3-2026-legal-regulatory-source-matrix.md');
    assert.ok(/P\.L\. 2025, ch\. 764/.test(txt),
        'legal/regulatory matrix should reference P.L. 2025, ch. 764');
    assert.ok(/LD 1488/.test(txt),
        'legal/regulatory matrix should reference LD 1488');
    assert.ok(/2026-04-19/.test(txt),
        'legal/regulatory matrix should state the emergency effective date 2026-04-19');
});

check('Legal/regulatory matrix cites the 2026-07-29 effective-date cluster', () => {
    const txt = readRepoFile('docs/research/q3-2026-legal-regulatory-source-matrix.md');
    assert.ok(/2026-07-29/.test(txt),
        'legal/regulatory matrix should reference the 2026-07-29 ordinary effective date');
});

// --- 5. Industry/national-context matrix exists and contains the four required-rewrite flags ---

check('National/industry context matrix exists', () => {
    assert.ok(existsRepoRelative('docs/research/market-stats-national-source-matrix-2026-07-22.md'),
        'missing docs/research/market-stats-national-source-matrix-2026-07-22.md');
});

check('National/industry matrix flags 4 required rewrites (hemp, broader rescheduling, wholesale spot, CO/CA)', () => {
    const txt = readRepoFile('docs/research/market-stats-national-source-matrix-2026-07-22.md');
    // §8.2 of the matrix names four required rewrites
    assert.ok(/H\.?R\.? ?7024|H\.?R\.? ?7010/.test(txt),
        'national/industry matrix should reference H.R. 7024 / H.R. 7010 hemp delay bills');
    assert.ok(/wholesale spot/i.test(txt) && /Cannabis Benchmarks/.test(txt),
        'national/industry matrix should call out the wholesale-spot refresh against Cannabis Benchmarks');
});

process.stderr.write('\nq3-2026-source-pool.test.cjs: ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail === 0 ? 0 : 1);
