#!/usr/bin/env node
// harness-kit CLI. Thin Node wrapper around setup/*.sh and helpers.
// Subcommands: install, update, uninstall, status, version, help.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PKG_ROOT = path.resolve(__dirname, '..');

function pkgVersion() {
  try {
    return fs.readFileSync(path.join(PKG_ROOT, 'VERSION'), 'utf8').trim();
  } catch {
    return '0.0.0';
  }
}

function targetVersion(target) {
  try {
    return fs.readFileSync(path.join(target, '.claude/.hk-version'), 'utf8').trim();
  } catch {
    return null;
  }
}

function resolveTarget(arg) {
  return path.resolve(arg || process.cwd());
}

function runBash(scriptName, target) {
  const script = path.join(PKG_ROOT, 'setup', scriptName);
  if (!fs.existsSync(script)) {
    console.error(`setup script missing: ${script}`);
    process.exit(1);
  }
  const r = spawnSync('bash', [script, target], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

function cmdInstall(target) {
  runBash('install.sh', target);
}

function cmdUpdate(target) {
  runBash('update.sh', target);
}

function cmdUninstall(target) {
  const claudeDir = path.join(target, '.claude');
  if (!fs.existsSync(claudeDir)) {
    console.log(`nothing to remove at ${target}`);
    return;
  }
  const v = targetVersion(target);
  if (!v) {
    console.log(`no .hk-version found at ${target}. refusing to delete .claude/ blindly.`);
    process.exit(1);
  }
  const toRemove = [
    '.claude/plugins/product-manager',
    '.claude/plugins/staff-software-engineer',
    '.claude/commands/product-manager',
    '.claude/commands/sse',
    '.claude/commands/pipeline',
    '.claude/agents/product-manager.md',
    '.claude/agents/staff-software-engineer.md',
    '.claude/hooks/status-line.sh',
    '.claude/hooks/pipeline-prompt.sh',
    '.claude/hooks/pipeline-postwrite.sh',
    '.claude/hooks/pipeline-postedit.sh',
    '.claude/hooks/pipeline-session-start.sh',
    '.claude/hooks/activity-pre-read.sh',
    '.claude/scripts/pipeline.py',
    '.claude/scripts/activity.py',
    '.claude/scripts/pr-monitor.py',
    '.claude/scripts/stage-card.md',
    '.claude/.pipeline-state.json',
    '.claude/.pr-monitor-state.json',
    '.claude/.activity',
    '.claude/settings.json',
    '.claude/.hk-version',
  ];
  for (const rel of toRemove) {
    const p = path.join(target, rel);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`removed ${rel}`);
    }
  }
  console.log(`uninstalled harness-kit v${v} from ${target}`);
  console.log(`note: .claude/conventions/ and outputs/ kept. delete manually if desired.`);
}

function cmdStatus(target) {
  const v = targetVersion(target);
  const srcV = pkgVersion();
  if (!v) {
    console.log(`not installed at ${target}`);
    console.log(`source version: ${srcV}`);
    return;
  }
  console.log(`installed: v${v}`);
  console.log(`source:    v${srcV}${v === srcV ? '' : '  (run: hk update)'}`);
  const statusLine = path.join(target, '.claude/hooks/status-line.sh');
  if (fs.existsSync(statusLine)) {
    const r = spawnSync('bash', [statusLine], { cwd: target, encoding: 'utf8' });
    if (r.stdout) console.log(`pipeline:  ${r.stdout.trim()}`);
  }
}

function cmdVersion() {
  console.log(pkgVersion());
}

function cmdHelp() {
  console.log(`hk - harness-kit CLI (v${pkgVersion()})

usage:
  hk install [target]     install plugins into target repo (default: cwd)
  hk update  [target]     pull latest source and reinstall
  hk uninstall [target]   remove installed plugins from target
  hk status  [target]     show installed version + active pipeline stage
  hk version              source version
  hk help                 this message

after install, restart Claude Code and use:
  /product-manager:prd | :prp | :run
  /sse:plan | :dev | :test | :pr | :pr-monitor | :run
  /pipeline:continue | :reset`);
}

function main() {
  const [, , cmd, arg] = process.argv;
  const target = resolveTarget(arg);
  switch (cmd) {
    case 'install':   return cmdInstall(target);
    case 'update':    return cmdUpdate(target);
    case 'uninstall': return cmdUninstall(target);
    case 'status':    return cmdStatus(target);
    case 'version':
    case '--version':
    case '-v':        return cmdVersion();
    case 'help':
    case '--help':
    case '-h':
    case undefined:   return cmdHelp();
    default:
      console.error(`unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
}

main();
