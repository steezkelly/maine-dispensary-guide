#!/usr/bin/env node
/**
 * orchestrate.cjs — Multi-agent task orchestrator with dependency management
 *
 * Dispatches parallel specialist agents with dependency management and Hub auto-logging.
 *
 * Usage:
 *   node scripts/agents/orchestrate.cjs --plan <task-file.json>    # Run from plan file
 *   node scripts/agents/orchestrate.cjs --interactive             # Interactive mode
 *   node scripts/agents/orchestrate.cjs --status                  # Show status of running tasks
 *   node scripts/agents/orchestrate.cjs --cancel                  # Cancel running tasks
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Agent dispatch map */
const AGENT_MAP = {
  fixer:    { subagent_type: 'fixer',     description: 'Fast bounded implementation' },
  explorer: { subagent_type: 'explorer',  description: 'Codebase search specialist' },
  observer: { subagent_type: 'observer',  description: 'Visual QA specialist' },
  librarian:{ subagent_type: 'librarian', description: 'External docs specialist' },
  oracle:   { subagent_type: 'oracle',    description: 'Strategic advisor' }
};

/** Project root (3 levels up from scripts/agents/) */
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/** Hub log path */
const HUB_PATH = path.resolve(PROJECT_ROOT, 'BOT_COLLABORATION_HUB.md');

/** Default task timeout (5 minutes) */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

// ============================================================================
// TASK QUEUE CLASS
// ============================================================================

class TaskQueue {
  /**
   * @param {Array} tasks - Array of task objects from plan file
   */
  constructor(tasks) {
    /** @type {Array} */ this.tasks = tasks.map(t => ({
      id: t.id,
      agent: t.agent,
      description: t.description,
      files: t.files || [],
      dependsOn: t.dependsOn || [],
      parallelGroup: t.parallelGroup || 'default',
      flags: t.flags || [],
      status: 'pending',
      startTime: null,
      endTime: null,
      result: null,
      error: null,
      taskHandle: null
    }));

    /** @type {string} */ this.sprint = '';
    /** @type {Array} */ this.objectives = [];
    /** @type {number} */ this.startTime = null;
    /** @type {number} */ this.endTime = null;
  }

  /**
   * Get tasks that are ready to run (all dependencies satisfied)
   * @returns {Array}
   */
  getReadyTasks() {
    return this.tasks.filter(task => {
      if (task.status !== 'pending') return false;
      // Check all dependencies are completed
      return task.dependsOn.every(depId => {
        const dep = this.tasks.find(t => t.id === depId);
        return dep && dep.status === 'completed';
      });
    });
  }

  /**
   * Group ready tasks by parallelGroup
   * @returns {Map<string, Array>}
   */
  getParallelGroups() {
    const ready = this.getReadyTasks();
    const groups = new Map();

    for (const task of ready) {
      const group = task.parallelGroup || 'default';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group).push(task);
    }

    return groups;
  }

  /**
   * Log task completion to BOT_COLLABORATION_HUB.md
   * @param {Object} task
   */
  logToHub(task) {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    const agentInfo = AGENT_MAP[task.agent] || { subagent_type: task.agent, description: 'Unknown' };
    const resultSummary = task.result
      ? (task.result.substring(0, 200) + (task.result.length > 200 ? '...' : ''))
      : (task.error || 'No result');

    const filesStr = task.files && task.files.length > 0
      ? task.files.join(', ')
      : 'N/A';

    const entry = [
      `## 📋 TASK ${task.id.toUpperCase()} — ${timestamp}`,
      '',
      `**Agent:** ${agentInfo.subagent_type}`,
      `**Description:** ${task.description}`,
      `**Result:** ${resultSummary}`,
      `**Files touched:** ${filesStr}`,
      '',
      '---'
    ].join('\n');

    try {
      const existing = fs.existsSync(HUB_PATH) ? fs.readFileSync(HUB_PATH, 'utf8') : '';
      fs.writeFileSync(HUB_PATH, existing + '\n' + entry + '\n');
    } catch (err) {
      console.error(`[WARN] Could not write to Hub: ${err.message}`);
    }
  }

  /**
   * Dispatch a single task to the appropriate agent
   * @param {Object} task
   * @returns {Promise<string>} task_id
   */
  async runTask(task) {
    task.status = 'running';
    task.startTime = Date.now();

    const agentInfo = AGENT_MAP[task.agent];
    if (!agentInfo) {
      task.status = 'failed';
      task.error = `Unknown agent type: ${task.agent}`;
      task.endTime = Date.now();
      return null;
    }

    console.log(`  ▶ ${task.id}: ${task.description}`);

    try {
      // Build prompt with task details
      const prompt = [
        task.description,
        '',
        'Files to work on:',
        ...task.files.map(f => `  - ${f}`),
        '',
        task.flags.includes('screenshot') ? 'Note: This task requires screenshot verification.' : ''
      ].filter(Boolean).join('\n');

      // Use background_task to dispatch (fire-and-forget, returns task_id immediately)
      // Note: This requires the task tool from the environment
      const taskId = await background_task({
        agent: agentInfo.subagent_type,
        description: task.description,
        prompt: prompt
      });

      task.taskHandle = taskId;
      return taskId;

    } catch (err) {
      task.status = 'failed';
      task.error = err.message;
      task.endTime = Date.now();
      return null;
    }
  }

  /**
   * Wait for a task to complete
   * @param {Object} task
   * @param {number} timeout
   * @returns {Promise<void>}
   */
  async waitForTask(task, timeout = DEFAULT_TIMEOUT_MS) {
    if (!task.taskHandle) {
      task.status = 'failed';
      task.error = 'No task handle';
      return;
    }

    try {
      const result = await background_output({
        task_id: task.taskHandle,
        timeout: timeout
      });

      task.result = result;
      task.status = 'completed';
      task.endTime = Date.now();

      const duration = Math.round((task.endTime - task.startTime) / 1000);
      console.log(`  ✅ ${task.id} complete (${duration}s)`);

      // Auto-log to Hub
      this.logToHub(task);

    } catch (err) {
      task.status = 'failed';
      task.error = err.message;
      task.endTime = Date.now();
      console.log(`  ❌ ${task.id} failed: ${err.message}`);
    }
  }

  /**
   * Run all tasks in the queue, respecting dependencies and parallel groups
   */
  async runAll() {
    this.startTime = Date.now();

    console.log(`\n🚀 Starting ${this.sprint} — ${this.tasks.length} tasks\n`);

    // Run until all tasks are in terminal state
    while (true) {
      const groups = this.getParallelGroups();

      if (groups.size === 0) {
        // Check if we're done or blocked
        const pending = this.tasks.filter(t => t.status === 'pending');
        const failed = this.tasks.filter(t => t.status === 'failed');

        if (pending.length === 0) break; // All done

        // If there are pending tasks but none are ready, some dependency failed
        if (pending.length > 0 && failed.length > 0) {
          console.log(`\n⚠️  ${pending.length} task(s) blocked by failed dependencies`);
          // Mark blocked tasks as failed
          for (const task of pending) {
            task.status = 'failed';
            task.error = 'Dependency failed';
          }
          break;
        }
      }

      // Process each parallel group
      for (const [groupName, groupTasks] of groups) {
        console.log(`📦 Group "${groupName}": dispatching ${groupTasks.length} task(s)...\n`);

        // Dispatch all tasks in group concurrently
        const dispatchPromises = groupTasks.map(task => this.runTask(task));
        await Promise.all(dispatchPromises);

        // Wait for all tasks in group to complete
        const waitPromises = groupTasks.map(task => this.waitForTask(task));
        await Promise.all(waitPromises);

        console.log('');
      }
    }

    this.endTime = Date.now();
  }

  /**
   * Generate summary report
   */
  summarize() {
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const failed = this.tasks.filter(t => t.status === 'failed').length;
    const totalDuration = Math.round((this.endTime - this.startTime) / 1000);

    console.log('=== Orchestration Summary ===');
    console.log(`Completed: ${completed} | Failed: ${failed}`);
    console.log(`Total time: ${totalDuration}s`);
    console.log('');

    if (failed > 0) {
      console.log('Failed tasks:');
      for (const task of this.tasks.filter(t => t.status === 'failed')) {
        console.log(`  ❌ ${task.id}: ${task.error || 'unknown error'}`);
      }
      console.log('');
    }

    if (completed === this.tasks.length) {
      console.log('✅ All tasks complete');
    } else {
      console.log('⚠️  Some tasks did not complete');
    }

    return { completed, failed, totalDuration };
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    command: null,
    planFile: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--plan' && args[i + 1]) {
      options.command = 'plan';
      options.planFile = args[++i];
    } else if (arg === '--interactive') {
      options.command = 'interactive';
    } else if (arg === '--status') {
      options.command = 'status';
    } else if (arg === '--cancel') {
      options.command = 'cancel';
    } else if (arg === '--help' || arg === '-h') {
      options.command = 'help';
    }
  }

  // Default to help if no command
  if (!options.command) {
    options.command = args.length === 0 ? 'help' : 'plan';
    if (options.command === 'plan') {
      options.planFile = args[0]; // First positional arg is plan file
    }
  }

  return options;
}

/**
 * Show help text
 */
function showHelp() {
  console.log(`
orchestrate.cjs — Multi-agent task orchestrator

Usage:
  node scripts/agents/orchestrate.cjs --plan <task-file.json>    # Run from plan file
  node scripts/agents/orchestrate.cjs --interactive             # Interactive mode
  node scripts/agents/orchestrate.cjs --status                    # Show status of running tasks
  node scripts/agents/orchestrate.cjs --cancel                    # Cancel running tasks

Plan File Format:
  {
    "sprint": "SPRINT 49",
    "objectives": ["Fix 17 broken links", "Expand thin content pages"],
    "tasks": [
      {
        "id": "task-1",
        "agent": "fixer",
        "description": "Fix broken internal links in guide files",
        "files": ["src/pages/guides/*.astro"],
        "dependsOn": [],
        "parallelGroup": "link-fix"
      }
    ]
  }

Agent Types:
  fixer     - Fast bounded implementation
  explorer  - Codebase search specialist
  observer  - Visual QA specialist
  librarian - External docs specialist
  oracle    - Strategic advisor
`);
}

/**
 * Show status (placeholder for running tasks)
 */
function showStatus() {
  console.log('No active tasks');
}

/**
 * Cancel running tasks (placeholder)
 */
function cancelTasks() {
  console.log('No running tasks to cancel');
}

/**
 * Run orchestration from a plan file
 * @param {string} planFile
 */
async function runFromPlan(planFile) {
  const fullPath = path.resolve(planFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Plan file not found: ${fullPath}`);
    process.exit(1);
  }

  let planData;
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    planData = JSON.parse(content);
  } catch (err) {
    console.error(`Error parsing plan file: ${err.message}`);
    process.exit(1);
  }

  const { sprint = 'Unnamed Sprint', objectives = [], tasks = [] } = planData;

  console.log(`\n📋 Sprint: ${sprint}`);
  if (objectives.length > 0) {
    console.log('Objectives:');
    for (const obj of objectives) {
      console.log(`  • ${obj}`);
    }
  }
  console.log('');

  const queue = new TaskQueue(tasks);
  queue.sprint = sprint;
  queue.objectives = objectives;

  await queue.runAll();
  const summary = queue.summarize();

  // Exit code 1 if any task failed
  process.exit(summary.failed > 0 ? 1 : 0);
}

/**
 * Interactive mode (placeholder - would prompt for task details)
 */
async function runInteractive() {
  console.log('Interactive mode not yet implemented.');
  console.log('Use --plan <task-file.json> to run from a plan file.');
  process.exit(1);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  switch (options.command) {
    case 'help':
      showHelp();
      break;

    case 'status':
      showStatus();
      break;

    case 'cancel':
      cancelTasks();
      break;

    case 'plan':
      if (!options.planFile) {
        console.error('Error: --plan requires a plan file path');
        showHelp();
        process.exit(1);
      }
      await runFromPlan(options.planFile);
      break;

    case 'interactive':
      await runInteractive();
      break;

    default:
      showHelp();
  }
}

// ============================================================================
// EXPORTS & BOOTSTRAP
// ============================================================================

// Export for testing
module.exports = { TaskQueue, AGENT_MAP, HUB_PATH };

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
