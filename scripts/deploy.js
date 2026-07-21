'use strict';

/*
 * deploy.js — build, then deploy dist/ to Cloudflare Pages, with hard guards.
 *
 * Usage:  npm run deploy
 *
 * Refuses to deploy (clear error, non-zero exit) when:
 *   - the build fails any assertion
 *   - dist/.dummy-data exists (results.json still carries the DUMMY marker)
 *   - lib/core.SCHEDULE_VERIFIED is false (bazi times not yet verified)
 * Only if all guards pass does it run `npx wrangler pages deploy dist`.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../lib/core');
const { build } = require('../build');

function refuse(msg) {
  console.error('x deploy refused: ' + msg);
  process.exit(1);
}

function main() {
  // 1. Build (runs every post-build assertion; throws on failure).
  let res;
  try {
    res = build();
  } catch (err) {
    console.error('x deploy aborted: build failed its assertions.');
    console.error('  ' + err.message);
    process.exit(1);
  }
  console.log(`> build OK — ${res.pages} pages, updated ${res.ctx.pm.iso}`);

  const dist = path.join(core.ROOT, 'dist');

  // 2. Never deploy dummy results.
  if (fs.existsSync(path.join(dist, '.dummy-data'))) {
    refuse(
      'dist/.dummy-data present — data/results.json still contains the DUMMY marker. ' +
      'Replace it with real results (remove the _note field) before deploying.'
    );
  }

  // 3. Never deploy while the bazi schedule is unverified.
  if (!core.SCHEDULE_VERIFIED) {
    refuse(
      'lib/core.js SCHEDULE_VERIFIED is false — verify the bazi times against ' +
      'authoritative live sources and flip it to true before deploying.'
    );
  }

  // 4. All guards passed — deploy.
  console.log('> guards passed; deploying dist/ to Cloudflare Pages via wrangler...');
  const r = spawnSync('npx', ['wrangler', 'pages', 'deploy', 'dist'], {
    stdio: 'inherit',
    cwd: core.ROOT,
  });
  if (r.error) {
    console.error('x wrangler failed to launch: ' + r.error.message);
    process.exit(1);
  }
  process.exit(r.status == null ? 1 : r.status);
}

main();
