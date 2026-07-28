#!/usr/bin/env node
'use strict';

/**
 * Child helper for the atomic-acquisition concurrency test (OPS-06B-HARDEN-R1 §7).
 * N children synchronize at a file barrier, then each attempts to acquire the
 * SAME branch with a DIFFERENT acquisition_id. Each writes its outcome to a
 * per-child result file. Exactly one must succeed.
 *
 * env: BW_REPO, BW_BRANCH, BW_HEAD, BW_TOKEN, BW_RESULT, BW_BARRIER, BW_N, BW_TTL
 */

const fs = require('node:fs');
const path = require('node:path');
const WRITER = require('../../mdg-branch-writer.cjs');

function gitStub(repoDir, args) {
  if (args[0] === 'rev-parse' && args[1] === '--git-common-dir') return '.git';
  if (args[0] === 'ls-remote') return `${process.env.BW_HEAD}\trefs/heads/${process.env.BW_BRANCH}`;
  throw new Error(`unexpected git args: ${args.join(' ')}`);
}

function barrierWait(dir, id, n) {
  // Each child atomically creates its own arrival marker, then spins until all N
  // markers exist. Per-child files avoid any read-modify-write race.
  const marker = path.join(dir, `arrived-${id}`);
  try {
    fs.writeFileSync(marker, String(process.pid), { flag: 'wx' });
  } catch (error) {
    // Already marked (idempotent).
  }
  const start = Date.now();
  while (true) {
    let present = 0;
    for (let i = 0; i < n; i += 1) {
      if (fs.existsSync(path.join(dir, `arrived-${i}`))) present += 1;
    }
    if (present >= n) break;
    if (Date.now() - start > 30000) throw new Error('barrier timeout');
  }
}

function main() {
  const repo = process.env.BW_REPO;
  const branch = process.env.BW_BRANCH;
  const token = process.env.BW_TOKEN;
  const resultFile = process.env.BW_RESULT;
  const barrierDir = process.env.BW_BARRIER;
  const id = Number(process.env.BW_ID || '0');
  const n = Number(process.env.BW_N || '2');
  const ttl = Number(process.env.BW_TTL || '60');

  barrierWait(barrierDir, id, n);

  let outcome;
  try {
    WRITER.acquireWriter(repo, {
      branch,
      writer_label: `writer-${token}`,
      acquisition_id: token,
      expected_remote_head: process.env.BW_HEAD,
      ttlMinutes: ttl,
    }, { git: gitStub });
    outcome = { token, ok: true };
  } catch (error) {
    outcome = { token, ok: false, code: String(error.message).split(':')[0] };
  }
  fs.writeFileSync(resultFile, JSON.stringify(outcome));
}

main();
