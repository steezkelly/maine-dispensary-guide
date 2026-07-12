/**
 * lib/registry.cjs
 *
 * Loader and validator for the MDG-DATA-001 source registry.
 *
 * Inputs:
 *   - Default registry path:
 *       apps/maine-cannabis/scripts/data/mdg-data/sources.json
 *   - Override: REGISTRY_PATH env var
 *
 * Output:
 *   - sources: array of registered sources (validated)
 *   - getSource(id): throws if id is unknown
 *
 * Validation enforces (Ticket 001 acceptance):
 *   - schema_version === 1
 *   - each source has: source_id, family, authoritative_page_url,
 *     adapter_version, schema_policy, freshness_policy
 *   - acs vintage pinned to 2024 with variable B01003_001E
 *   - no hard-coded OCP CSV filename pattern
 *
 * Process output contract (AGENT-EXECUTION-CONTRACT.md):
 *   - human diagnostics to stderr
 *   - final non-empty stdout line is one compact JSON event
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REGISTRY_PATH = path.join(
    __dirname, '..', 'sources.json'
);

function loadRegistry(registryPath) {
    const p = registryPath || process.env.REGISTRY_PATH || DEFAULT_REGISTRY_PATH;
    let raw;
    try {
        raw = fs.readFileSync(p, 'utf8');
    } catch (err) {
        const ev = {
            schema_version: 1,
            component: 'mdg-data',
            command: 'registry',
            status: 'failed',
            code: 'REGISTRY_NOT_FOUND',
            retryable: false,
            message: `Registry file not found: ${p}`
        };
        process.stderr.write(`registry: cannot read ${p}: ${err.message}\n`);
        process.stdout.write(JSON.stringify(ev) + '\n');
        process.exit(64);
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        const ev = {
            schema_version: 1,
            component: 'mdg-data',
            command: 'registry',
            status: 'failed',
            code: 'REGISTRY_PARSE_ERROR',
            retryable: false,
            message: `Registry JSON parse error: ${err.message}`
        };
        process.stderr.write(`registry: JSON parse error: ${err.message}\n`);
        process.stdout.write(JSON.stringify(ev) + '\n');
        process.exit(64);
    }

    const errors = validate(parsed);
    if (errors.length > 0) {
        const ev = {
            schema_version: 1,
            component: 'mdg-data',
            command: 'registry',
            status: 'failed',
            code: 'REGISTRY_INVALID',
            retryable: false,
            message: errors.join('; ')
        };
        process.stderr.write(`registry: validation failed: ${errors.join('; ')}\n`);
        process.stdout.write(JSON.stringify(ev) + '\n');
        process.exit(64);
    }

    return parsed;
}

function validate(reg) {
    const errs = [];
    if (reg.schema_version !== 1) {
        errs.push(`schema_version must be 1, got ${reg.schema_version}`);
    }
    if (!Array.isArray(reg.sources) || reg.sources.length === 0) {
        errs.push('sources must be a non-empty array');
        return errs;
    }
    const seen = new Set();
    for (const s of reg.sources) {
        const required = [
            'source_id', 'family', 'authoritative_page_url',
            'adapter_version', 'schema_policy', 'freshness_policy'
        ];
        for (const k of required) {
            if (!(k in s)) errs.push(`source missing ${k}`);
        }
        if (seen.has(s.source_id)) {
            errs.push(`duplicate source_id: ${s.source_id}`);
        }
        seen.add(s.source_id);

        // ACS pin
        if (s.source_id === 'census_acs5_population') {
            if (!s.acs || s.acs.vintage !== 2024) {
                errs.push('census_acs5_population.acs.vintage must be exactly 2024');
            }
            if (!s.acs || s.acs.variable_id !== 'B01003_001E') {
                errs.push('census_acs5_population.acs.variable_id must be exactly B01003_001E');
            }
        }

        // No hard-coded April-2026 OCP CSV path
        const j = JSON.stringify(s);
        if (j.includes('2026_04_01') || j.includes('2026-04-01')) {
            errs.push(`source ${s.source_id} hard-codes an April 2026 OCP URL`);
        }
    }
    return errs;
}

function getSource(reg, sourceId) {
    const s = reg.sources.find(x => x.source_id === sourceId);
    if (!s) {
        const ev = {
            schema_version: 1,
            component: 'mdg-data',
            command: 'registry',
            status: 'failed',
            code: 'UNKNOWN_SOURCE_ID',
            retryable: false,
            message: `Unknown source_id: ${sourceId}`
        };
        process.stderr.write(`registry: unknown source_id ${sourceId}\n`);
        process.stdout.write(JSON.stringify(ev) + '\n');
        process.exit(64);
    }
    return s;
}

function listSourceIds(reg) {
    return reg.sources.map(s => s.source_id).sort();
}

module.exports = { loadRegistry, getSource, listSourceIds, validate, DEFAULT_REGISTRY_PATH };