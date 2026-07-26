#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sourceRoot = path.resolve(__dirname, '../../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdg-pre-push-ref-'));
try {
  const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
      cwd: temp,
      encoding: 'utf8',
      ...options,
    });
    if (result.status !== 0) {
      throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${result.stdout}${result.stderr}`);
    }
    return result;
  };

  run('git', ['init', '-q']);
  run('git', ['config', 'user.email', 'test@example.invalid']);
  run('git', ['config', 'user.name', 'MDG Hook Test']);
  fs.writeFileSync(path.join(temp, 'seed.txt'), 'seed\n');
  run('git', ['add', 'seed.txt']);
  run('git', ['commit', '-qm', 'seed']);
  run('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD']);

  fs.mkdirSync(path.join(temp, '.githooks'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'scripts/git'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'bin'), { recursive: true });
  fs.copyFileSync(path.join(sourceRoot, '.githooks/pre-push'), path.join(temp, '.githooks/pre-push'));
  fs.chmodSync(path.join(temp, '.githooks/pre-push'), 0o755);
  fs.writeFileSync(path.join(temp, 'scripts/git/pre-push-verify.cjs'), '// test stub target\n');

  const capture = path.join(temp, 'node-args.txt');
  const nodeStub = path.join(temp, 'bin/node');
  fs.writeFileSync(nodeStub, '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$CAPTURE"\n');
  fs.chmodSync(nodeStub, 0o755);

  const sha = run('git', ['rev-parse', 'HEAD']).stdout.trim();
  const zero = '0'.repeat(40);
  const hookInput = `refs/heads/feature/test ${sha} refs/heads/feature/test ${zero}\n`;
  const result = spawnSync('bash', ['.githooks/pre-push'], {
    cwd: temp,
    input: hookInput,
    encoding: 'utf8',
    env: { ...process.env, CAPTURE: capture, PATH: `${path.join(temp, 'bin')}:${process.env.PATH}` },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`verifying exact update refs/heads/feature/test \\(${sha}\\) against refs/heads/feature/test \\(${sha}\\)`));
  const capturedArgs = fs.readFileSync(capture, 'utf8');
  assert.match(capturedArgs, new RegExp(`--ref=${sha}`));
  assert.match(capturedArgs, new RegExp(`--target=${sha}`));
  console.log('pre-push new-branch exact-base-and-target regression: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
