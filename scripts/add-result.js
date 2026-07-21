'use strict';

/*
 * add-result — validate and record one bazi result, then run a full build.
 *
 * Usage:
 *   npm run add-result -- --date 2026-07-14 --bazi 3 --patti 148 --single 3
 *
 * Validation (rejects with an explanation on failure):
 *   - patti must be exactly 3 digits
 *   - single must be exactly 1 digit
 *   - single must equal the last digit of the sum of the patti's digits
 */

const core = require('../lib/core');
const { build } = require('../build');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = val;
        i++;
      }
    }
  }
  return out;
}

function fail(msg) {
  console.error('x add-result rejected: ' + msg);
  console.error('  usage: npm run add-result -- --date YYYY-MM-DD --bazi N --patti PPP --single S');
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { date, bazi, patti, single } = args;

  if (!core.isValidDate(String(date))) {
    fail(`--date must be a real calendar date in YYYY-MM-DD form (got "${date === true || date === undefined ? '(no value)' : date}").`);
  }
  // A value-less "--bazi" parses to true; String(true) or a multi-digit/0 value
  // must be rejected, not silently coerced (Number(true) === 1).
  const baziRaw = bazi === true || bazi === undefined ? '' : String(bazi);
  if (!/^[1-8]$/.test(baziRaw)) {
    fail(`--bazi must be a single digit 1..8 (got "${baziRaw || '(no value)'}").`);
  }
  const n = Number(baziRaw);
  const maxBazi = core.bazisForDate(date);
  if (n > maxBazi) {
    fail(`${date} has only ${maxBazi} bazis (it is a ${core.isSunday(date) ? 'Sunday' : 'weekday'}); bazi ${n} is out of range.`);
  }
  if (patti === undefined || single === undefined) {
    fail('both --patti and --single are required.');
  }

  const check = core.validateResult(String(patti), String(single));
  if (!check.ok) {
    fail(check.error);
  }

  // Upsert into results.json
  const data = core.readData();
  let day = core.getDay(data, date);
  if (!day) {
    day = { date, frozen: false, bazis: [] };
    data.days.push(day);
  }
  if (!Array.isArray(day.bazis)) day.bazis = [];

  const declaredAt = core.istIso(new Date());
  const existing = day.bazis.find((b) => b.n === n);
  const record = { n, patti: String(patti), single: String(single), declaredAt };
  let action;
  if (existing) {
    Object.assign(existing, record);
    action = 'updated';
  } else {
    day.bazis.push(record);
    day.bazis.sort((a, b) => a.n - b.n);
    action = 'added';
  }

  core.writeData(data);
  console.log(`> ${action} ${date} bazi ${n}: patti ${patti}, single ${single} (declaredAt ${declaredAt})`);

  // Full rebuild — the four-way sync happens inside build().
  const { pages, ctx } = build();
  console.log(`✔ Rebuilt ${pages} pages. Homepage updated=${ctx.pm.iso}`);
}

main();
