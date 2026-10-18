#!/usr/bin/env node
/**
 * Syntax-check all project JS files (and package scripts) with node --check.
 * Exit code 1 if any file fails.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const skip = new Set(['node_modules', '.git', '.mimocode', 'games', 'tapety', 'images', 'icons']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = walk(root);
let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    console.log('OK  ', path.relative(root, f));
  } catch (e) {
    failed++;
    console.error('FAIL', path.relative(root, f));
    console.error(String(e.stderr || e.message));
  }
}
console.log(`\nChecked ${files.length} files, ${failed} failed.`);
process.exit(failed ? 1 : 0);
