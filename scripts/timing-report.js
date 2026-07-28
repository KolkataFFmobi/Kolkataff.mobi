'use strict';

/*
 * timing-report — what time does each bazi ACTUALLY get declared?
 *
 * The SCHEDULE in lib/core.js is unverified seed data (10:03, 11:33, ...) and
 * kolkataff.tv's own table says 10:00, 11:30, ... Nobody knows which is right.
 * This settles it with observation instead of argument.
 *
 * Usage:  npm run timing-report
 *
 * HOW IT WORKS
 * The bot polls every 5 minutes and stamps `declaredAt` when it first publishes
 * a result. For a LIVE ingest that is within one poll interval of the real
 * declaration, so the EARLIEST observation across many days closely bounds the
 * true declaration time.
 *
 * WHAT IT DELIBERATELY IGNORES
 * Backfilled results are useless here — a day caught up the next morning
 * carries that morning's timestamp, not the declaration time. Any record whose
 * declaredAt falls on a different calendar day than the result itself is
 * therefore excluded, and the count of usable samples is always reported so a
 * thin sample is never mistaken for a confident answer.
 */

const core = require('../lib/core');

const MIN_SAMPLES = 5; // below this, report but do not recommend a change

function hhmmToMin(t) { const p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
function minToHHMM(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function main() {
  const data = core.readData();
  // bazi -> [observed minute-of-day, ...] from live (same-day) ingests only
  const obs = {};
  let live = 0, skipped = 0;

  for (const day of data.days) {
    for (const b of day.bazis || []) {
      if (!b.declaredAt) continue;
      // CRITICAL: only records the bot genuinely observed count. The imported
      // history had declaredAt SYNTHESISED from the SCHEDULE constant, so
      // including it would "confirm" the schedule with data derived from the
      // schedule — circular, and it produced a confident-looking all-green
      // report with zero variance. A `sources` array is written only by a real
      // bot ingest, so it is the honest discriminator.
      if (!Array.isArray(b.sources) || !b.sources.length) { skipped++; continue; }
      const stampDate = b.declaredAt.slice(0, 10);
      if (stampDate !== day.date) { skipped++; continue; } // backfill — unusable
      const m = /T(\d{2}):(\d{2})/.exec(b.declaredAt);
      if (!m) continue;
      (obs[b.n] = obs[b.n] || []).push(Number(m[1]) * 60 + Number(m[2]));
      live++;
    }
  }

  console.log('Observed declaration times (live ingests only)');
  console.log(`  usable samples: ${live}   excluded (synthetic or backfilled): ${skipped}\n`);

  if (!live) {
    console.log('  No bot-observed results yet — only records carrying a `sources`');
    console.log('  array count, and those are written from now on. The imported');
    console.log('  history is deliberately excluded: its timestamps were generated');
    console.log('  FROM the schedule, so it cannot be used to test the schedule.');
    console.log('');
    console.log('  Re-run after the bot has covered a few full days.');
    return;
  }

  const sched = core.SCHEDULE.weekday;
  console.log('  bazi  seed   earliest  median   samples   verdict');
  const suggestions = [];
  for (let n = 1; n <= 8; n++) {
    const list = (obs[n] || []).slice().sort((a, b) => a - b);
    const seed = sched[n - 1];
    if (!list.length) {
      console.log(`  ${String(n).padStart(4)}  ${seed}   —         —        0         no data yet`);
      continue;
    }
    const earliest = list[0];
    const median = list[Math.floor(list.length / 2)];
    // The declaration must be at or before the earliest sighting; with a 5-min
    // poll the true time sits in (earliest-5, earliest].
    const lowerBound = earliest - 5;
    const seedMin = hhmmToMin(seed);
    let verdict;
    if (list.length < MIN_SAMPLES) {
      verdict = `thin sample (need ${MIN_SAMPLES})`;
    } else if (seedMin > earliest) {
      verdict = `SEED IS LATE by ~${seedMin - earliest} min`;
      suggestions.push({ n, from: seed, to: minToHHMM(Math.max(0, lowerBound)) });
    } else if (earliest - seedMin > 10) {
      verdict = `seed early by ~${earliest - seedMin} min`;
      suggestions.push({ n, from: seed, to: minToHHMM(earliest) });
    } else {
      verdict = 'seed looks right';
    }
    console.log(
      `  ${String(n).padStart(4)}  ${seed}   ${minToHHMM(earliest)}     ${minToHHMM(median)}    ${String(list.length).padStart(3)}       ${verdict}`
    );
  }

  if (suggestions.length) {
    console.log('\n  Suggested SCHEDULE.weekday (lib/core.js), based on observation:');
    for (const s of suggestions) console.log(`    bazi ${s.n}: ${s.from} -> ${s.to}`);
    console.log('\n  Review before applying — this is evidence, not an automatic change.');
    console.log('  Editing SCHEDULE also moves the countdown, the time gate, and the');
    console.log('  times quoted in page copy, so change them together.');
  } else {
    console.log('\n  No schedule change suggested from the current sample.');
  }
}

main();
