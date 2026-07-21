'use strict';

/*
 * freeze-day — mark a day as frozen (archived) and run a full build.
 *
 * Usage:
 *   npm run freeze-day -- --date 2026-07-14
 *
 * Effect (all produced by the single build step, no divergent logic):
 *   - the day is rendered inline in the /old-results/ archive (paginated)
 *   - the homepage "Yesterday"/"Last 7 days" blocks link to it (anchor on /old-results/)
 *   - there are no per-day /result/ pages (removed by design)
 *
 * Intended to be cron'd at 00:05 IST for the day that just ended.
 */

const fs = require('fs');
const path = require('path');
const core = require('../lib/core');
const { build } = require('../build');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) out[key] = true;
      else { out[key] = val; i++; }
    }
  }
  return out;
}

function fail(msg) {
  console.error('x freeze-day rejected: ' + msg);
  console.error('  usage: npm run freeze-day -- --date YYYY-MM-DD');
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { date } = args;

  if (!core.isValidDate(String(date))) {
    fail(`--date must be a real calendar date in YYYY-MM-DD form (got "${date === true || date === undefined ? '(no value)' : date}").`);
  }

  const data = core.readData();
  const day = core.getDay(data, date);
  if (!day) {
    fail(`no data for ${date}; add results with add-result before freezing.`);
  }
  if (!Array.isArray(day.bazis) || day.bazis.length === 0) {
    fail(`${date} has no declared results; nothing to archive.`);
  }

  if (day.frozen) {
    console.log(`> ${date} was already frozen; rebuilding to keep the archive current.`);
  } else {
    day.frozen = true;
    core.writeData(data);
    console.log(`> froze ${date} (${day.bazis.length} bazi) — it will be archived.`);
  }

  const { pages, ctx } = build();

  // Confirm the frozen day now renders inline somewhere in the /old-results/ archive.
  const anchor = `id="d-${core.urlDate(date)}"`;
  const orDir = path.join(core.ROOT, 'dist', 'old-results');
  const orFiles = [];
  (function walk(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (n === 'index.html') orFiles.push(p);
    }
  })(orDir);
  const inArchive = orFiles.some((f) => fs.readFileSync(f, 'utf8').includes(anchor));

  console.log(`✔ Rebuilt ${pages} pages. Homepage updated=${ctx.pm.iso}`);
  console.log(`  ${date} in /old-results/ archive: ${inArchive ? 'yes' : 'NO'}`);
  if (!inArchive) {
    console.error('x freeze-day: day not found in the old-results archive — see above.');
    process.exit(1);
  }
}

main();
