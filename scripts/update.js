'use strict';

/*
 * update.js — the real 8x/day operator workflow in one command:
 * record a result (validate + write + build) and then deploy.
 *
 * Usage:  npm run update -- --date 2026-07-14 --bazi 3 --patti 148 --single 3
 *
 * Arguments after `--` are passed straight through to add-result.js. If the
 * result is invalid (add-result exits non-zero), deploy is NOT run. Deploy then
 * applies its own guards (dummy-data / SCHEDULE_VERIFIED) before publishing.
 */

const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../lib/core');

const node = process.execPath;
const here = __dirname;
const passthrough = process.argv.slice(2);

// 1. Record the result (add-result validates, writes results.json, rebuilds).
const add = spawnSync(node, [path.join(here, 'add-result.js'), ...passthrough], {
  stdio: 'inherit',
  cwd: core.ROOT,
});
if (add.status !== 0) {
  console.error('x update: add-result failed — result not recorded, not deploying.');
  process.exit(add.status == null ? 1 : add.status);
}

// 2. Deploy (rebuilds + applies deploy guards + wrangler).
const dep = spawnSync(node, [path.join(here, 'deploy.js')], {
  stdio: 'inherit',
  cwd: core.ROOT,
});
process.exit(dep.status == null ? 1 : dep.status);
