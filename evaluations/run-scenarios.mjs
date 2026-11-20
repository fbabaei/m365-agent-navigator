#!/usr/bin/env node
// Runs evaluations/scenarios.json against the repository agent profiles through
// Copilot CLI and checks the JSON event trace as well as the final answer.
//
//   node evaluations/run-scenarios.mjs [--repeat 3] [--case id] [--profile name]
//                                      [--live] [--baseline] [--out dir]
//
// --live      also run cases marked live (needs signed-in Work IQ; allows only
//             workiq list_agents and ask).
// --baseline  run the same prompts with no custom agent and save the answers
//             for a blinded paired review; assertions are not applied.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const repeat = Number(value('repeat', '1'));
const onlyCase = value('case');
const onlyProfile = value('profile');
const live = flag('live');
const baseline = flag('baseline');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = value('out', join(repo, 'evaluations', 'runs', stamp));
mkdirSync(outDir, { recursive: true });

const { cases } = JSON.parse(readFileSync(join(here, 'scenarios.json'), 'utf8'));

function copilotCommand() {
  const ps1 = process.env.COPILOT_PS1 ||
    (process.env.APPDATA && join(process.env.APPDATA, 'npm', 'copilot.ps1'));
  if (process.platform === 'win32' && ps1 && existsSync(ps1)) {
    return { cmd: 'powershell', pre: ['-NoProfile', '-File', ps1] };
  }
  return { cmd: 'copilot', pre: [] };
}

function runCopilot(testCase) {
  const { cmd, pre } = copilotCommand();
  const args = [...pre, '--trust-folder', '--no-custom-instructions',
    '--disable-builtin-mcps', '--no-ask-user', '--output-format', 'json'];
  if (!baseline) args.push('--agent', testCase.profile);
  for (const t of ['shell', 'write', 'read', 'memory', 'url']) args.push('--deny-tool', t);
  if (live && testCase.live && !baseline) {
    args.push('--allow-tool', 'workiq(list_agents)', '--allow-tool', 'workiq(ask)');
  } else {
    args.push('--deny-tool', 'workiq');
  }
  args.push('-p', testCase.prompt);
  const res = spawnSync(cmd, args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const events = [];
  for (const line of (res.stdout || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* non-JSON noise */ }
  }
  return { events, status: res.status, stderr: res.stderr };
}

function summarize(events) {
  const answers = events.filter((e) => e.type === 'assistant.message' && e.data?.content)
    .map((e) => e.data.content);
  const tools = events.filter((e) => e.type === 'tool.execution_start')
    .map((e) => e.data.toolName);
  return { answer: answers.join('\n\n'), tools };
}

function check(testCase, { answer, tools }) {
  const failures = [];
  for (const re of testCase.mustMatch || []) {
    if (!new RegExp(re, 'i').test(answer)) failures.push(`missing /${re}/`);
  }
  for (const re of testCase.mustNotMatch || []) {
    if (new RegExp(re, 'i').test(answer)) failures.push(`forbidden /${re}/`);
  }
  if (typeof testCase.maxToolCalls === 'number' && tools.length > testCase.maxToolCalls) {
    failures.push(`tool calls ${tools.length} > ${testCase.maxToolCalls}: ${tools.join(', ')}`);
  }
  for (const [name, limit] of Object.entries(testCase.toolLimits || {})) {
    const n = tools.filter((t) => t === name).length;
    if (n > limit) failures.push(`${name} called ${n} > ${limit}`);
  }
  for (const [name, min] of Object.entries(testCase.toolMin || {})) {
    const n = tools.filter((t) => t === name).length;
    if (n < min) failures.push(`${name} called ${n} < ${min}`);
  }
  if (!answer.trim()) failures.push('empty answer');
  return failures;
}

const selected = cases.filter((c) =>
  (!onlyCase || c.id === onlyCase) &&
  (!onlyProfile || c.profile === onlyProfile) &&
  (live || !c.live));

const rows = [];
let errors = 0;
for (const testCase of selected) {
  let passes = 0;
  for (let i = 1; i <= repeat; i++) {
    const run = runCopilot(testCase);
    const summary = summarize(run.events);
    // A nonzero exit with no answer is a runtime error, not a behavior failure.
    const infraError = run.status !== 0 && !summary.answer.trim();
    const failures = infraError ? [] : baseline ? [] : check(testCase, summary);
    if (infraError) errors++;
    else if (!failures.length) passes++;
    writeFileSync(join(outDir, `${testCase.id}.${i}.json`),
      JSON.stringify({ id: testCase.id, run: i, failures, infraError, ...summary,
        exit: run.status, stderr: (run.stderr || '').slice(0, 2000) }, null, 2));
    console.log(`${infraError ? 'ERROR' : failures.length ? 'FAIL' : baseline ? 'SAVED' : 'PASS'} ` +
      `${testCase.id} #${i}` + (failures.length ? ` - ${failures.join('; ')}` : ''));
  }
  rows.push({ id: testCase.id, passes, repeat });
}

const totalPass = rows.reduce((a, r) => a + r.passes, 0);
const total = rows.reduce((a, r) => a + r.repeat, 0);
console.log(`\n${baseline ? 'Saved' : 'Passed'} ${totalPass}/${total} runs` +
  `${errors ? ` (${errors} runtime errors, not counted as passes)` : ''}. Output: ${outDir}`);
writeFileSync(join(outDir, 'summary.json'),
  JSON.stringify({ stamp, repeat, live, baseline, errors, rows }, null, 2));
process.exit(!baseline && totalPass < total ? 1 : 0);
