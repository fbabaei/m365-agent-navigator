#!/usr/bin/env node
// Dependency-free check of a catalog against catalog.schema.json's required
// fields and enums, plus rules a schema cannot express.
//   node tools/validate-catalog.mjs [catalog.json ...]   (default: catalog.example.json)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2);
if (!files.length) files.push(join(repo, 'catalog.example.json'));

const STATUS = ['granted', 'approved', 'available', 'blocked', 'revoked', 'unknown'];
const ACCESS = ['granted', 'blocked', 'revoked', 'unknown'];
const POSITIVE = ['granted', 'approved', 'available'];
const SECRETISH = /(password|secret|token|api[_-]?key|bearer\s+[a-z0-9]|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

function validate(catalog) {
  const errors = [];
  const warnings = [];
  const req = (cond, msg) => { if (!cond) errors.push(msg); };
  req(typeof catalog.catalog_name === 'string' && catalog.catalog_name, 'catalog_name is required');
  req(typeof catalog.scope === 'string' && catalog.scope, 'scope is required');
  const interval = catalog.review_interval_days;
  req(interval == null || (Number.isInteger(interval) && interval >= 1), 'review_interval_days must be null or a positive integer');
  req(Array.isArray(catalog.agents), 'agents must be an array');
  const seen = new Set();

  (catalog.agents || []).forEach((a, i) => {
    const at = `agents[${i}] (${a.name ?? 'unnamed'})`;
    req(a.name, `${at}: name is required`);
    req(typeof a.illustrative === 'boolean', `${at}: illustrative must be true or false`);
    req(Array.isArray(a.capabilities) && a.capabilities.length, `${at}: capabilities required`);
    req(Array.isArray(a.hosts) && a.hosts.length, `${at}: hosts required`);
    req(typeof a.action_scope === 'string', `${at}: action_scope required`);
    for (const k of ['approval', 'availability']) {
      const s = a[k];
      req(s && STATUS.includes(s.status), `${at}: ${k}.status must be one of ${STATUS.join(', ')}`);
      if (s && POSITIVE.includes(s.status)) {
        req(s.evidence, `${at}: ${k}.status is ${s.status} but evidence is empty; use unknown`);
        req(s.scope, `${at}: ${k}.status is ${s.status} but scope is empty (caller group, host, environment)`);
      }
    }
    (a.sources || []).forEach((src, j) => {
      req(ACCESS.includes(src.caller_access), `${at}: sources[${j}].caller_access must be one of ${ACCESS.join(', ')}`);
      if (src.caller_access === 'granted') {
        req(src.evidence && src.scope, `${at}: sources[${j}] granted without evidence and scope`);
      }
    });

    if (a.illustrative === false && a.capability_evidence == null) {
      warnings.push(`${at}: real entry has no capability_evidence`);
    }
    if (a.illustrative === true && !/^EXAMPLE/.test(a.name ?? '')) {
      warnings.push(`${at}: illustrative entries should start the name with "EXAMPLE"`);
    }
    if (a.reviewed_at) {
      req(/^\d{4}-\d{2}-\d{2}$/.test(a.reviewed_at), `${at}: reviewed_at must be YYYY-MM-DD`);
      if (interval && Date.parse(a.reviewed_at) + interval * 864e5 < Date.now()) {
        warnings.push(`${at}: reviewed_at is older than review_interval_days; treat affected gates as unresolved`);
      }
    } else if (interval && a.illustrative === false) {
      warnings.push(`${at}: review_interval_days is set but reviewed_at is missing`);
    }
    const key = [a.publisher, a.name, a.environment].join('|').toLowerCase();
    req(!seen.has(key), `${at}: duplicate publisher/name/environment; keep one entry per scope`);
    seen.add(key);
    if (SECRETISH.test(JSON.stringify(a))) {
      warnings.push(`${at}: contains text resembling a secret or email address; remove it before sharing`);
    }
  });
  return { errors, warnings };
}

let failed = false;
for (const file of files) {
  let catalog;
  try { catalog = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`${file}: invalid JSON: ${e.message}`); failed = true; continue; }
  const { errors, warnings } = validate(catalog);
  for (const w of warnings) console.warn(`${file}: warning: ${w}`);
  for (const e of errors) console.error(`${file}: error: ${e}`);
  if (errors.length) failed = true;
  else console.log(`${file}: ok (${(catalog.agents || []).length} entries)`);
}
process.exit(failed ? 1 : 0);
