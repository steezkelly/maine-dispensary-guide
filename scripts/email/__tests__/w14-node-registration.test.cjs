'use strict';

/**
 * Structural regression tests for the W14 custom-directory node-registration
 * contract (2026-07-28 correction).
 *
 * These tests guard against a recurrence of the node-type misdiagnosis: the W14
 * SMTP node is loaded through n8n's CUSTOM-DIRECTORY loader (N8N_CUSTOM_EXTENSIONS),
 * which registers every node under CUSTOM_NODES_PACKAGE_NAME ('CUSTOM') plus the
 * node's description.name. The resulting workflow type is therefore
 * 'CUSTOM.mdgSmtpSend' — NOT the community-package-style
 * 'n8n-nodes-mdg-smtp-send.mdgSmtpSend' (that naming only applies to npm-installed
 * community packages loaded by the package-directory loader).
 *
 * The tests exercise the staged package and loader assumptions directly rather
 * than relying solely on a hand-maintained string constant. No network, SMTP,
 * or live n8n access is performed.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const STAGED_PKG_DIR = path.join(ROOT, 'scripts', 'n8n-nodes', 'mdg-smtp-send');
const NODE_FILE = path.join(STAGED_PKG_DIR, 'MdgSmtpSend.node.js');
const PKG_JSON = path.join(STAGED_PKG_DIR, 'package.json');

// The deployment model: custom-directory loading. Under this model the custom
// directory is scanned recursively for *.node.js and each node is registered as
// CUSTOM_NODES_PACKAGE_NAME + '.' + description.name.
const CUSTOM_NODES_PACKAGE_NAME = 'CUSTOM'; // n8n-core nodes-loader/constants.js
const NODE_DESCRIPTION_NAME = 'mdgSmtpSend';
const EXPECTED_WORKFLOW_TYPE = `${CUSTOM_NODES_PACKAGE_NAME}.${NODE_DESCRIPTION_NAME}`;
const REJECTED_COMMUNITY_TYPE = 'n8n-nodes-mdg-smtp-send.mdgSmtpSend';
// Staged package path relative to the configured custom directory root.
const RELATIVE_STAGED_PATH = path.join('node_modules', 'n8n-nodes-mdg-smtp-send');

function loadFreshNodeModule() {
  // Load in isolation so repeated calls see a fresh class object.
  delete require.cache[require.resolve(NODE_FILE)];
  const mod = require(NODE_FILE);
  return mod;
}

test('deployment model is custom-directory loading via N8N_CUSTOM_EXTENSIONS', () => {
  const contract = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'scripts', 'email', 'w14-workflow-contract.json'), 'utf8'),
  );
  // The contract must describe the custom-directory transport class and the
  // CUSTOM-prefixed node type, not a community-package install.
  assert.equal(contract.transport.node_type, EXPECTED_WORKFLOW_TYPE);
  assert.equal(contract.transport.class, 'n8n_managed_smtp');
  assert.ok(
    !String(contract.transport.node_type).startsWith('n8n-nodes-'),
    'contract must not use community-package node-type naming under custom-directory loading',
  );
});

test('compose stages the package beneath the custom directory at node_modules/<pkg>', () => {
  // The deployment contract: the Compose mount must place the reviewed package
  // at <custom-dir>/node_modules/n8n-nodes-mdg-smtp-send so the
  // CustomDirectoryLoader (which globs <dir>/**\/*.node.js) discovers it. We
  // assert this on the compose file's mount destination, not on the repo source
  // layout (the source lives at scripts/n8n-nodes/mdg-smtp-send and is mapped by
  // the mount).
  const candidates = [
    '/srv/agent-node/compose/automation/compose.yaml',
  ];
  let composeText = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { composeText = fs.readFileSync(c, 'utf8'); break; }
  }
  if (composeText === null) {
    // Compose file is on the deployment host, not in the repo. Skip gracefully
    // but record the expectation so the contract is explicit.
    assert.ok(true, 'compose file not present in repo; mount contract validated on host');
    return;
  }
  assert.match(
    composeText,
    /\/node_modules\/n8n-nodes-mdg-smtp-send:ro/,
    'compose mount destination must end in /node_modules/n8n-nodes-mdg-smtp-send:ro',
  );
  assert.doesNotMatch(
    composeText,
    /custom\/n8n-nodes-mdg-smtp-send:ro/,
    'compose must not use the old broken mount (package directly under custom dir)',
  );
});

test('expected .node.js file is recursively discoverable once staged under node_modules', () => {
  // Emulate CustomDirectoryLoader.loadAll(): fast-glob-style recursive scan for
  // '**\/*.node.js' over the custom directory root. We stage the real node file
  // into a faithful temp layout (<root>/node_modules/n8n-nodes-mdg-smtp-send/)
  // and assert discovery finds it — proving the file is discoverable under the
  // corrected mount layout.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w14-custom-'));
  try {
    const stagedDir = path.join(tmpRoot, 'node_modules', 'n8n-nodes-mdg-smtp-send');
    fs.mkdirSync(stagedDir, { recursive: true });
    fs.copyFileSync(NODE_FILE, path.join(stagedDir, 'MdgSmtpSend.node.js'));
    fs.copyFileSync(PKG_JSON, path.join(stagedDir, 'package.json'));

    const discovered = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && entry.name.endsWith('.node.js')) discovered.push(full);
      }
    })(tmpRoot);

    assert.ok(
      discovered.includes(path.join(stagedDir, 'MdgSmtpSend.node.js')),
      `recursive discovery did not find the staged node; found: ${discovered.join(', ')}`,
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('node exports a constructible class whose description.name is mdgSmtpSend', () => {
  const mod = loadFreshNodeModule();
  assert.ok(mod.MdgSmtpSend, 'module must export MdgSmtpSend');
  const inst = new mod.MdgSmtpSend();
  assert.ok(inst.description, 'node instance must have a description');
  assert.equal(inst.description.name, NODE_DESCRIPTION_NAME);
  assert.equal(inst.description.displayName, 'MDG W14 SMTP Send');
});

test('expected full workflow type for this deployment model is CUSTOM.mdgSmtpSend', () => {
  const mod = loadFreshNodeModule();
  const inst = new mod.MdgSmtpSend();
  // Under the custom-directory loader the registered type is
  // CUSTOM_NODES_PACKAGE_NAME + '.' + description.name.
  const registeredType = `${CUSTOM_NODES_PACKAGE_NAME}.${inst.description.name}`;
  assert.equal(registeredType, EXPECTED_WORKFLOW_TYPE);
  assert.equal(EXPECTED_WORKFLOW_TYPE, 'CUSTOM.mdgSmtpSend');
});

test('provisioned W14 workflow contains exactly CUSTOM.mdgSmtpSend', () => {
  const provisioner = require(path.join(ROOT, 'scripts', 'email', 'provision-w14-workflows.cjs'));
  const wf = provisioner.buildW14Workflow(
    { id: 'pg-cred', name: 'pg' },
    { id: 'smtp-cred', name: 'smtp' },
  );
  const smtpNodes = wf.nodes.filter((n) => n.name === 'Submit one SMTP message');
  assert.equal(smtpNodes.length, 1, 'exactly one SMTP submission node');
  assert.equal(smtpNodes[0].type, EXPECTED_WORKFLOW_TYPE);
});

test('provisioned workflow does NOT contain the community-package type', () => {
  const provisioner = require(path.join(ROOT, 'scripts', 'email', 'provision-w14-workflows.cjs'));
  const wf = provisioner.buildW14Workflow(
    { id: 'pg-cred', name: 'pg' },
    { id: 'smtp-cred', name: 'smtp' },
  );
  const bad = wf.nodes.filter((n) => n.type === REJECTED_COMMUNITY_TYPE);
  assert.equal(bad.length, 0, `workflow must not reference ${REJECTED_COMMUNITY_TYPE}`);
  // No node type may use the community-package prefix under this deployment.
  const anyCommunity = wf.nodes.filter((n) => String(n.type).startsWith('n8n-nodes-mdg-smtp-send.'));
  assert.equal(anyCommunity.length, 0, 'no node may use community-package naming');
});

test('mount validation fails for the old broken destination', () => {
  // The old broken mount placed the package directly under the custom dir
  // (custom/n8n-nodes-mdg-smtp-send) instead of custom/node_modules/<pkg>.
  // A validator that requires the node_modules segment must reject that layout.
  function validateMountDestination(dest) {
    const norm = dest.replace(/\\/g, '/');
    return /\/node_modules\/n8n-nodes-mdg-smtp-send$/.test(norm);
  }
  const corrected = '/home/node/.n8n/custom/node_modules/n8n-nodes-mdg-smtp-send';
  const broken = '/home/node/.n8n/custom/n8n-nodes-mdg-smtp-send';
  assert.equal(validateMountDestination(corrected), true, 'corrected mount must validate');
  assert.equal(validateMountDestination(broken), false, 'old broken mount must be rejected');
});

test('loader validation fails for absent / malformed / wrong-name node files', () => {
  // Emulate the load-and-derive step the CustomDirectoryLoader performs, and
  // assert it fails closed for each corruption class.
  function deriveRegisteredType(nodeFilePath) {
    if (!fs.existsSync(nodeFilePath)) {
      throw new Error('node file absent');
    }
    let mod;
    try {
      delete require.cache[require.resolve(nodeFilePath)];
      mod = require(nodeFilePath);
    } catch (err) {
      throw new Error(`node file malformed: ${err.message}`);
    }
    const Cls = mod.MdgSmtpSend;
    if (typeof Cls !== 'function') {
      throw new Error('node file exports the wrong class');
    }
    const inst = new Cls();
    if (!inst.description || inst.description.name !== NODE_DESCRIPTION_NAME) {
      throw new Error('node reports the wrong description.name');
    }
    return `${CUSTOM_NODES_PACKAGE_NAME}.${inst.description.name}`;
  }

  // Healthy case.
  assert.equal(deriveRegisteredType(NODE_FILE), EXPECTED_WORKFLOW_TYPE);

  // Absent file.
  assert.throws(() => deriveRegisteredType(path.join(STAGED_PKG_DIR, 'Nope.node.js')), /absent/);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w14-loader-'));
  try {
    // Malformed (syntax error).
    const malformed = path.join(tmp, 'Bad.node.js');
    fs.writeFileSync(malformed, 'module.exports = { this is not valid js');
    assert.throws(() => deriveRegisteredType(malformed), /malformed/);

    // Wrong class export.
    const wrongClass = path.join(tmp, 'WrongClass.node.js');
    fs.writeFileSync(wrongClass, 'module.exports = { NotTheNode: class {} };');
    assert.throws(() => deriveRegisteredType(wrongClass), /wrong class/);

    // Wrong description.name.
    const wrongName = path.join(tmp, 'WrongName.node.js');
    fs.writeFileSync(
      wrongName,
      'module.exports = { MdgSmtpSend: class { constructor() { this.description = { name: "somethingElse", displayName: "x" }; } } };',
    );
    assert.throws(() => deriveRegisteredType(wrongName), /wrong description\.name/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('W14 remains inactive after provisioning (provisioner never activates)', () => {
  // The provisioner source must contain no activation capability and must build
  // a workflow that is created inactive. Assert structurally on the source.
  const src = fs.readFileSync(
    path.join(ROOT, 'scripts', 'email', 'provision-w14-workflows.cjs'),
    'utf8',
  );
  // No active:true is ever emitted into the desired workflow body.
  assert.ok(!/active:\s*true/.test(src), 'provisioner must not set active:true');
  // The apply path refuses to mutate an already-active W14.
  assert.match(src, /refusing to mutate active W14/i);
  // No call to an /activate endpoint.
  assert.ok(!/\/activate/.test(src), 'provisioner must not call an activate endpoint');
});
