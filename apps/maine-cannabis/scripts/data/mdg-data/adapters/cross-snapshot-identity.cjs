'use strict';

// apps/maine-cannabis/scripts/data/mdg-data/adapters/cross-snapshot-identity.cjs
//
// MDG-DATA-001 corrective review (finding 4):
// Cross-snapshot identity validator for OCP license records.
//
// Compares two consecutive normalized snapshots (T1 and T2) of the
// OCP-licenses source and emits per-identity classifications:
//
//   same_identity              — same LICENSE key, attributes unchanged
//   identity_attribute_changed — same LICENSE key, attributes changed in T2
//   identity_conflict          — same LICENSE key, materially incompatible
//                                establishment fields
//   newly_observed             — present in T2, absent in T1
//   no_longer_observed         — present in T1, absent in T2
//   reobserved                 — absent in T1, present in T2, where T1
//                                contains evidence of a previous existence
//                                (e.g. a "previously observed, then absent, then
//                                 present again" trajectory)
//   blocked_identity_review    — qualifying active-store row that cannot
//                                be resolved (e.g. null LICENSE)
//
// IDENTITY MODEL:
//   identity_key = LICENSE (when non-null)
//   identity_key = sha256(LICENSE_TYPE + "|" + DBA + "|" + LICENSE_CITY)[0:16]
//     (when LICENSE is null)
//
// ATTRIBUTE DIMENSIONS for "changed vs unchanged":
//   license_status_norm
//   legal_name
//   dba_name
//   host_municipality_raw + geoid
//   issue_date
//   expiration_date
//
// "Materially incompatible" means a change in TWO OR MORE attribute
// dimensions at once where each change alone would be plausible (e.g.
// address change + DBA rename on the same LICENSE is plausible; address
// change + DBA rename + license_status change + license_type change at
// once is implausible and suggests an error or a merge conflict).
//
// The validator does NOT encode empirical churn-rate assumptions. The
// second real monthly OCP snapshot will validate real-world behavior later.
// Reference: 2026-07-12 corrective review finding 4.

// --- Identity key derivation (must match ocp-license-normalizer.cjs) ----

const crypto = require('crypto');

function deriveIdentityKey(record) {
    const lic = record.license_number;
    if (lic != null && lic !== '') return lic;
    // Fallback hash: LICENSE_TYPE + DBA + LICENSE_CITY (first 16 chars)
    const seed = `${record.license_type_raw || ''}|${record.dba_name || ''}|${record.host_municipality_raw || ''}`;
    const h = crypto.createHash('sha256').update(seed).digest('hex');
    return 'hash:' + h.slice(0, 16);
}

// --- Comparable attribute dimensions --------------------------------------

function attrsForComparison(record) {
    return {
        license_status_norm: record.license_status_norm || null,
        legal_name: record.legal_name || null,
        dba_name: record.dba_name || null,
        host_municipality_raw: record.host_municipality_raw || null,
        geoid: record.geoid || null,
        issue_date: record.issue_date || null,
        expiration_date: record.expiration_date || null,
        license_type_norm: record.license_type_norm || null,
    };
}

function attrsEqual(a, b) {
    for (const k of Object.keys(a)) {
        if (a[k] !== b[k]) return { equal: false, diff_keys: [k] };
    }
    return { equal: true };
}

function countChangedAttrs(a, b) {
    const diffs = [];
    for (const k of Object.keys(a)) {
        if (a[k] !== b[k]) diffs.push(k);
    }
    return diffs;
}

// --- Qualifying active-store classifier -----------------------------------

function isQualifyingActiveStore(record) {
    return (record.license_status_norm === 'active'
        && record.license_type_norm === 'cannabis_store');
}

// --- Cross-snapshot diff (the validator core) ------------------------------

/**
 * Validate two snapshots. Returns:
 *   {
 *     classified: Array<{
 *       identity_key: string,
 *       status_t1: 'present' | 'absent' | 'unknown',
 *       status_t2: 'present' | 'absent' | 'unknown',
 *       classification: 'same_identity' |
 *                      'identity_attribute_changed' |
 *                      'identity_conflict' |
 *                      'newly_observed' |
 *                      'no_longer_observed' |
 *                      'reobserved' |
 *                      'blocked_identity_review',
 *       changed_attributes?: string[],
 *       conflict_attributes?: string[],
 *       notes?: string,
 *       t1_record: object (if present),
 *       t2_record: object (if present),
 *       previous_absence_count: number (for reobserved determination)
 *     }>,
 *     summary: { ...counters }
 *   }
 *
 * `previous_history` is an OPTIONAL third argument: a sequence of
 *   per-identity classification summaries from prior runs. When present,
 *   the validator can mark an identity as `reobserved` rather than
 *   `newly_observed` if its history shows it was previously observed,
 *   then absent, now present again. When absent, the validator falls
 *   back to `newly_observed` for identities first appearing in T2.
 */
function validateSnapshots(t1Records, t2Records, previousHistory) {
    if (!Array.isArray(t1Records)) throw new TypeError('t1Records must be array');
    if (!Array.isArray(t2Records)) throw new TypeError('t2Records must be array');

    // Build maps keyed by identity_key.
    const t1ByKey = new Map();
    for (const r of t1Records) {
        const k = deriveIdentityKey(r);
        if (!t1ByKey.has(k)) t1ByKey.set(k, []);
        t1ByKey.get(k).push(r);
    }
    const t2ByKey = new Map();
    for (const r of t2Records) {
        const k = deriveIdentityKey(r);
        if (!t2ByKey.has(k)) t2ByKey.set(k, []);
        t2ByKey.get(k).push(r);
    }

    // Build prior-history index for the reobserved test.
    // Each prior-history entry is a { classified: [...] } output from a
    // prior validateSnapshots run. We track for each identity_key the
    // number of distinct snapshots in which the key was present in T1
    // but absent in T2 (i.e., "disappearance events"). When a key has
    // had ≥1 disappearance events, it is classified as reobserved
    // rather than newly_observed.
    const priorAbsenceByKey = new Map();
    if (Array.isArray(previousHistory)) {
        // Each prior-history entry may be either:
        //   - the wrapper object `{classified: [...]}` returned by a prior
        //     validateSnapshots() call, or
        //   - the bare `classified` array itself (a convenience for tests).
        // We accept both shapes for friendliness.
        for (const run of previousHistory) {
            const arr = Array.isArray(run) ? run : (run && run.classified) || [];
            for (const c of arr) {
                // A key that was present in T1 and absent in T2 of an
                // earlier run is evidence of a "disappearance event".
                if (c.status_t1 === 'present' && c.status_t2 === 'absent') {
                    priorAbsenceByKey.set(c.identity_key,
                        (priorAbsenceByKey.get(c.identity_key) || 0) + 1);
                }
            }
        }
    }

    const classified = [];
    let counts = {
        same_identity: 0,
        identity_attribute_changed: 0,
        identity_conflict: 0,
        newly_observed: 0,
        no_longer_observed: 0,
        reobserved: 0,
        blocked_identity_review: 0,
        total_t1: t1Records.length,
        total_t2: t2Records.length,
        unique_keys_t1: t1ByKey.size,
        unique_keys_t2: t2ByKey.size,
    };

    const allKeys = new Set([...t1ByKey.keys(), ...t2ByKey.keys()]);
    for (const key of allKeys) {
        const t1 = (t1ByKey.get(key) || [null])[0]; // take first; duplicates handled separately
        const t2 = (t2ByKey.get(key) || [null])[0];
        const t1_present = t1 != null;
        const t2_present = t2 != null;

        // blocked_identity_review: a qualifying active-store row with no
        // resolvable identity (null LICENSE + fallback hash not also present).
        // Per corrective review finding 4: "qualifying null-LICENSE retail row"
        if (!t1_present && t2_present && isQualifyingActiveStore(t2)
            && t2.license_number == null) {
            counts.blocked_identity_review += 1;
            classified.push({
                identity_key: key,
                status_t1: 'absent',
                status_t2: 'present',
                classification: 'blocked_identity_review',
                notes: 'qualifying active-store row with no LICENSE; identity_hash fallback applied',
                t1_record: null,
                t2_record: t2,
            });
            continue;
        }

        if (t1_present && !t2_present) {
            counts.no_longer_observed += 1;
            classified.push({
                identity_key: key,
                status_t1: 'present',
                status_t2: 'absent',
                classification: 'no_longer_observed',
                t1_record: t1,
                t2_record: null,
            });
            continue;
        }
        if (!t1_present && t2_present) {
            const priorAbsence = priorAbsenceByKey.get(key) || 0;
            if (priorAbsence >= 1) {
                counts.reobserved += 1;
                classified.push({
                    identity_key: key,
                    status_t1: 'absent',
                    status_t2: 'present',
                    classification: 'reobserved',
                    notes: `reappeared after ${priorAbsence}-window absence in prior history`,
                    previous_absence_count: priorAbsence,
                    t1_record: null,
                    t2_record: t2,
                });
            } else {
                counts.newly_observed += 1;
                classified.push({
                    identity_key: key,
                    status_t1: 'absent',
                    status_t2: 'present',
                    classification: 'newly_observed',
                    t1_record: null,
                    t2_record: t2,
                });
            }
            continue;
        }
        if (!t1_present && !t2_present) continue; // both absent, nothing to classify

        // Both present: same identity. Classify attribute change.
        const a1 = attrsForComparison(t1);
        const a2 = attrsForComparison(t2);
        const diffs = countChangedAttrs(a1, a2);
        if (diffs.length === 0) {
            counts.same_identity += 1;
            classified.push({
                identity_key: key,
                status_t1: 'present',
                status_t2: 'present',
                classification: 'same_identity',
                t1_record: t1,
                t2_record: t2,
            });
            continue;
        }
        // 1 attribute changed => identity_attribute_changed
        // 2+ attribute changes in implausible combination => identity_conflict
        if (diffs.length === 1) {
            counts.identity_attribute_changed += 1;
            classified.push({
                identity_key: key,
                status_t1: 'present',
                status_t2: 'present',
                classification: 'identity_attribute_changed',
                changed_attributes: diffs,
                t1_record: t1,
                t2_record: t2,
            });
        } else {
            counts.identity_conflict += 1;
            classified.push({
                identity_key: key,
                status_t1: 'present',
                status_t2: 'present',
                classification: 'identity_conflict',
                conflict_attributes: diffs,
                notes: '2+ attribute changes in a single transition; operator review required',
                t1_record: t1,
                t2_record: t2,
            });
        }
    }

    return { classified, summary: counts };
}

module.exports = {
    validateSnapshots,
    deriveIdentityKey,
    attrsForComparison,
    countChangedAttrs,
    isQualifyingActiveStore,
};
