'use strict';
const fs = require('fs');
const path = require('path');

const CROSSWALK_PATH = path.join(__dirname, 'ocp-census-crosswalk.json');

function loadCrosswalk(p) {
    const file = p || CROSSWALK_PATH;
    let reg;
    try { reg = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (err) {
        const e = new Error('crosswalk parse: ' + err.message);
        e.code = 'CROSSWALK_PARSE_ERROR';
        throw e;
    }
    const errs = validate(reg);
    if (errs.length) {
        const e = new Error('crosswalk invalid: ' + errs.join('; '));
        e.code = 'CROSSWALK_INVALID';
        throw e;
    }
    return reg;
}

function validate(cw) {
    const errs = [];
    if (cw.schema_version !== 1) errs.push('schema_version must be 1');
    if (!Array.isArray(cw.aliases)) errs.push('aliases must be an array');
    if (!Array.isArray(cw.unmatched_queue)) errs.push('unmatched_queue must be an array');
    const aliasValues = new Set();
    const geoidRe = /^[0-9]{10}$/;
    for (const a of cw.aliases || []) {
        if (!a.source_value) errs.push('alias missing source_value');
        if (!a.normalized_value) errs.push('alias missing normalized_value');
        if (!['exact_alias', 'manual'].includes(a.match_method)) {
            errs.push(`alias ${a.source_value} bad match_method: ${a.match_method}`);
        }
        if (a.geoid !== null && a.geoid !== undefined && !geoidRe.test(a.geoid)) {
            errs.push(`alias ${a.source_value} geoid not 10-digit: ${a.geoid}`);
        }
        if (a.reviewed !== true) errs.push(`alias ${a.source_value} reviewed must be true`);
        if (aliasValues.has(a.source_value)) errs.push(`duplicate alias: ${a.source_value}`);
        aliasValues.add(a.source_value);
    }
    for (const u of cw.unmatched_queue || []) {
        if (aliasValues.has(u)) errs.push(`unmatched_queue contains alias value: ${u}`);
    }
    return errs;
}

/**
 * Resolve an OCP LICENSE_CITY surface form to its crosswalk entry.
 * Returns { source_value, normalized_value, geoid, match_method, reviewed, note }
 * or { source_value, normalized_value: null, geoid: null, match_method: null,
 *       reviewed: false, note: 'unmatched', unmatched: true }.
 */
function resolve(cw, ocpCity) {
    const v = String(ocpCity || '').trim();
    for (const a of cw.aliases) {
        if (a.source_value === v) {
            return Object.assign({}, a, { unmatched: false });
        }
    }
    return {
        source_value: v,
        normalized_value: null,
        geoid: null,
        match_method: null,
        reviewed: false,
        note: 'unmatched',
        unmatched: true
    };
}

module.exports = { loadCrosswalk, resolve, validate, CROSSWALK_PATH };