'use strict';

/*
 * auto-update.js — poll public result sources, cross-confirm, ingest, build.
 *
 * The unattended counterpart of add-result/freeze-day: designed to be cron'd
 * (GitHub Actions every ~15 min through the IST result day). Node stdlib only.
 *
 * Usage:
 *   node scripts/auto-update.js             # fetch, ingest, freeze, build
 *   node scripts/auto-update.js --dry-run   # fetch + report; write nothing
 *
 * SAFETY RULES (each earned by a real incident — do not weaken):
 *  1. DATED TABLES ONLY. Sources' "today" widgets are untrustworthy
 *     (kolkataff.tv's rolls to tomorrow before the day ends). Only rows under
 *     an explicit date header are read.
 *  2. TWO-SOURCE AGREEMENT. A result is published only when at least
 *     MIN_SOURCES sources agree on the patti (kolkataff.tv once carried a
 *     wrong bazi-8 for days). Disagreement => HOLD, never publish.
 *  3. TIME-GATE. A bazi is ingested only after its scheduled IST slot has
 *     passed, so a source pre-filling future slots can never leak here.
 *  4. DIGIT-SUM VALIDATION. core.validateResult on every candidate; a source
 *     single that contradicts the patti's digit sum is rejected.
 *  5. NO SILENT CORRECTIONS. If sources disagree with a result we already
 *     published, it is reported as CONFLICT and left unchanged — corrections
 *     are a human decision (exit code 2 so CI notifies).
 *  6. Freezing: any unfrozen day BEFORE today that has declared bazis is
 *     frozen (catches multi-day outages, not just yesterday).
 */

const https = require('https');
const core = require('../lib/core');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MIN_SOURCES = 2;
const TIMEOUT_MS = 25000;

// ---------------------------------------------------------------------------
// Sources. parse(html) -> { 'YYYY-MM-DD': { baziN: { patti, single|null } } }
// Parsers read ONLY explicitly dated blocks (safety rule 1).
// ---------------------------------------------------------------------------

// Month-name -> YYYY-MM-DD. Accepts "28 July 2026", "28 JULY 2026", "28 Jul 2026".
const MONTH_NAMES = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                      jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
function parseTextDate(str) {
  const m = /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/.exec(String(str || ''));
  if (!m) return null;
  const mo = MONTH_NAMES[m[2].slice(0, 3).toLowerCase()];
  if (!mo) return null;
  return `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}`;
}

// Pull the patti row and single row out of a table body and pair them by
// column. Non-numeric cells ("Tips", "-", empty) become null, which is how a
// not-yet-declared slot is represented.
function pairRows(body) {
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((r) => r[1]).filter((r) => /<td/i.test(r));
  if (!rows.length) return {};
  const cells = (row) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map((c) => c[1].replace(/<[^>]*>/g, '').replace(/&#8211;|&ndash;/g, '').trim());
  const pattis = cells(rows[0]);
  const singles = rows[1] ? cells(rows[1]) : [];
  const day = {};
  for (let i = 0; i < pattis.length && i < 8; i++) {
    if (!/^\d{3}$/.test(pattis[i])) continue;
    const sg = /^\d$/.test(singles[i] || '') ? singles[i] : null;
    day[i + 1] = { patti: pattis[i], single: sg };
  }
  return day;
}

// kolkataff.tv: per-day tables headed <h3>DD/MM/YYYY</h3>, cells are
// <h4><strong>PATTI</strong></h4><h4>SINGLE</h4> pairs in bazi order.
function parseKolkataffTv(html) {
  const out = {};
  const tableRe = /<h3>(\d{2})\/(\d{2})\/(\d{4})<\/h3>[\s\S]*?<\/thead>\s*<tbody>([\s\S]*?)<\/tbody>/g;
  let m;
  while ((m = tableRe.exec(html))) {
    const date = `${m[3]}-${m[2]}-${m[1]}`;
    const body = m[4];
    const day = {};
    let n = 0;
    const cellRe = /<h4><strong>(\d{3})<\/strong><\/h4>\s*<h4>(\d)<\/h4>/g;
    let c;
    while ((c = cellRe.exec(body))) {
      n += 1;
      day[n] = { patti: c[1], single: c[2] };
    }
    if (n > 0) out[date] = day;
  }
  // The live "today" block. It is trusted ONLY because it states its own date
  // ("(TUESDAY, 28 JULY 2026)") which is verified against the expected day by
  // the caller — that check is what neutralises this widget's known habit of
  // rolling to tomorrow before the current day is finished.
  const live = /\(\s*[A-Za-z]+DAY\s*,\s*([^)]+?)\s*\)[\s\S]*?<tbody id="today-results-body">([\s\S]*?)<\/tbody>/i.exec(html);
  if (live) {
    const d = parseTextDate(live[1]);
    const day = pairRows(live[2]);
    if (d && Object.keys(day).length) out[d] = Object.assign(out[d] || {}, day);
  }
  return out;
}

// kolkataresultff.com: month-record tables headed <th ... class="date">D Mon
// YYYY</th>, then one row of 3-digit patti <td>s in bazi order (no singles —
// derived via digit sum downstream).
function parseKolkataResultFf(html) {
  const out = {};
  const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const tableRe = /<th[^>]*class="date"[^>]*>\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\s*<\/th>([\s\S]*?)<\/tbody>/g;
  let m;
  while ((m = tableRe.exec(html))) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (!mo) continue;
    const date = `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}`;
    const body = m[4];
    const day = {};
    let n = 0;
    const cellRe = /<td[^>]*>\s*(\d{3})\s*<\/td>/g;
    let c;
    while ((c = cellRe.exec(body))) {
      n += 1;
      day[n] = { patti: c[1], single: null };
    }
    if (n > 0) out[date] = day;
  }
  // Live section, same principle: it declares its own date in .datelive.
  const live = /class="datelive[^"]*"[^>]*>\s*([^<]+?)\s*<\/div>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i.exec(html);
  if (live) {
    const d = parseTextDate(live[1]);
    const day = pairRows(live[2]);
    if (d && Object.keys(day).length) out[d] = Object.assign(out[d] || {}, day);
  }
  return out;
}

// kolkataff.in: every result table (today AND history) is headed by
// <th colspan="8">D Month YYYY</th>, then a patti row and a single row — so one
// parser covers both, and every block is explicitly dated by construction.
function parseKolkataffIn(html) {
  const out = {};
  const re = /<th[^>]*colspan="8"[^>]*>\s*([^<]+?)\s*<\/th>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(html))) {
    const d = parseTextDate(m[1]);
    if (!d) continue;
    const day = pairRows(m[2]);
    if (Object.keys(day).length) out[d] = Object.assign(out[d] || {}, day);
  }
  return out;
}

const SOURCES = [
  { name: 'kolkataff.tv', url: 'https://kolkataff.tv/', parse: parseKolkataffTv },
  { name: 'kolkataresultff.com', url: 'https://kolkataresultff.com/', parse: parseKolkataResultFf },
  { name: 'kolkataff.in', url: 'https://kolkataff.in/', parse: parseKolkataffIn },
];

// ---------------------------------------------------------------------------
// stdlib fetch with UA, timeout, redirect follow
// ---------------------------------------------------------------------------
function fetchUrl(url, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = 4;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } }, (res) => {
      if (res.statusCode >= 301 && res.statusCode <= 308 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        return resolve(fetchUrl(new URL(res.headers.location, url).href, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error(`timeout fetching ${url}`)));
    req.on('error', reject);
  });
}

// Has bazi n's scheduled IST slot passed for this date? (safety rule 3)
function slotPassed(date, n, nowMs) {
  const sched = core.scheduleForDate(date);
  const t = sched[n - 1];
  if (!t) return false; // beyond this day's schedule (e.g. bazi 5-8 on Sunday)
  return nowMs >= Date.parse(`${date}T${t}:00+05:30`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date();
  const today = core.resolveToday();

  // Look back over a WINDOW, not just yesterday+today, so a multi-day outage
  // (CI down, laptop off, sources briefly unreachable) self-heals on the next
  // run instead of leaving a permanent hole in the archive. The sources carry
  // roughly 10 and 30 dated days respectively, so a 10-day default is fully
  // covered by both; older gaps need a manual add-result pass. Override with
  // `--days N` for a one-off deeper catch-up.
  const daysArgIdx = process.argv.indexOf('--days');
  const LOOKBACK = daysArgIdx !== -1 ? Math.max(1, Number(process.argv[daysArgIdx + 1]) || 1) : 10;
  const targetDates = [];
  for (let i = LOOKBACK; i >= 0; i--) targetDates.push(core.shiftDate(today, -i));

  console.log(`auto-update @ ${core.istIso(now)} IST — window ${targetDates[0]} .. ${today} (${targetDates.length} days)${dryRun ? ' [DRY RUN]' : ''}`);

  // 1. Fetch all sources (a failed source degrades coverage, not the run —
  //    but with fewer than MIN_SOURCES up, nothing can confirm, so we stop).
  const fetched = [];
  for (const s of SOURCES) {
    try {
      const html = await fetchUrl(s.url);
      const days = s.parse(html);
      const parsedDates = Object.keys(days).sort();
      console.log(`  [${s.name}] ok — parsed ${parsedDates.length} dated day(s), latest: ${parsedDates.slice(-3).join(', ')}`);
      fetched.push({ name: s.name, days });
    } catch (err) {
      console.error(`  [${s.name}] FAILED: ${err.message}`);
    }
  }
  if (fetched.length < MIN_SOURCES) {
    console.error(`x fewer than ${MIN_SOURCES} sources reachable — nothing can be confirmed; aborting without changes`);
    process.exit(2);
  }

  // 2. Reconcile per (date, bazi) with all safety rules.
  const data = core.readData();
  const added = [];
  const held = [];
  const conflicts = [];
  const acknowledged = [];
  const ack = Array.isArray(data._acknowledged_conflicts) ? data._acknowledged_conflicts : [];

  for (const date of targetDates) {
    const maxBazi = core.bazisForDate(date);
    let day = core.getDay(data, date);
    for (let n = 1; n <= maxBazi; n++) {
      const existing = day && Array.isArray(day.bazis) ? day.bazis.find((b) => b.n === n) : null;

      // Candidate values from each source that has this date+bazi.
      const cands = [];
      for (const src of fetched) {
        const v = src.days[date] && src.days[date][n];
        if (v) cands.push({ src: src.name, patti: v.patti, single: v.single });
      }
      if (!cands.length) continue;

      // Existing result: verify agreement, report drift, never overwrite (rule 5).
      if (existing) {
        const disagree = cands.filter((c) => c.patti !== existing.patti);
        if (disagree.length) {
          // A source can be persistently wrong about one historical value (see
          // _acknowledged_conflicts in results.json). Re-raising a settled
          // dispute on every run would make the job permanently red and bury
          // real conflicts, so an EXACT match against an acknowledged entry is
          // reported as ACK and does not fail the run. Any change — a
          // different disputed value, a different source — is a NEW conflict
          // and still fails loudly.
          const ackd = ack.find((a) =>
            a.date === date && Number(a.bazi) === n && String(a.published) === String(existing.patti) &&
            disagree.every((d) => String((a.sources || {})[d.src]) === String(d.patti)) &&
            disagree.length === Object.keys(a.sources || {}).length);
          const detail = disagree.map((d) => `${d.src} shows ${d.patti}`).join(', ');
          if (ackd) {
            acknowledged.push(`${date} bazi ${n}: ${detail} vs published ${existing.patti} — known and settled (${ackd.resolution})`);
          } else {
            conflicts.push(`${date} bazi ${n}: published ${existing.patti}-${existing.single} but ` +
              detail + ' — left unchanged, needs human review');
          }
        }
        continue;
      }

      if (!slotPassed(date, n, now.getTime())) {
        held.push(`${date} bazi ${n}: source shows a value but the ${core.scheduleForDate(date)[n - 1]} IST slot has not passed — time-gated (rule 3)`);
        continue;
      }

      // Two-source agreement on the patti (rule 2).
      const byPatti = {};
      for (const c of cands) (byPatti[c.patti] = byPatti[c.patti] || []).push(c);
      const agreed = Object.entries(byPatti).find(([, list]) => list.length >= MIN_SOURCES);
      if (!agreed) {
        if (Object.keys(byPatti).length > 1) {
          conflicts.push(`${date} bazi ${n}: sources disagree — ` +
            cands.map((c) => `${c.src}=${c.patti}`).join(', ') + ' — held');
        } else {
          held.push(`${date} bazi ${n}: only ${cands.length} source(s) carry it (${cands[0].src}=${cands[0].patti}) — waiting for confirmation`);
        }
        continue;
      }
      const patti = agreed[0];

      // Single: displayed one must match the digit-sum rule; else derive (rule 4).
      const displayed = agreed[1].map((c) => c.single).find((s) => s != null);
      const single = displayed != null ? displayed : core.expectedSingle(patti);
      const check = core.validateResult(patti, single);
      if (!check.ok) {
        conflicts.push(`${date} bazi ${n}: ${patti}-${single} fails validation (${check.error}) — held`);
        continue;
      }

      if (!day) {
        day = { date, frozen: false, bazis: [] };
        data.days.push(day);
      }
      if (!Array.isArray(day.bazis)) day.bazis = [];
      day.bazis.push({ n, patti, single, declaredAt: core.istIso(now) });
      day.bazis.sort((a, b) => a.n - b.n);
      added.push(`${date} bazi ${n}: ${patti}-${single} (${agreed[1].length} sources)`);
    }
  }

  // 3. Freeze every unfrozen pre-today day that has declared results (rule 6).
  const frozen = [];
  for (const d of data.days) {
    if (!d.frozen && d.date < today && Array.isArray(d.bazis) && d.bazis.length) {
      d.frozen = true;
      frozen.push(d.date);
    }
  }

  // 4. Report + persist + build.
  for (const l of added) console.log('  ADDED   ' + l);
  for (const l of frozen) console.log('  FROZE   ' + l);
  for (const l of held) console.log('  HELD    ' + l);
  for (const l of acknowledged) console.log('  ACK      ' + l);
  for (const l of conflicts) console.log('  CONFLICT ' + l);

  const changed = added.length + frozen.length > 0;
  if (dryRun) {
    console.log(`dry run — no changes written (would ${changed ? 'update' : 'do nothing'})`);
  } else if (changed) {
    core.writeData(data);
    const { build } = require('../build');
    const { pages, ctx } = build();
    console.log(`✔ ${added.length} result(s) added, ${frozen.length} day(s) frozen; rebuilt ${pages} pages (updated=${ctx.pm.iso})`);
  } else {
    console.log('no new confirmed results — nothing to do');
  }

  // Exit 2 on conflicts so CI surfaces them (a HELD single-source entry is
  // normal mid-day state and stays exit 0 — the next poll rechecks it).
  if (conflicts.length) process.exit(2);
}

main().catch((err) => {
  console.error('x auto-update failed: ' + (err && err.stack || err));
  process.exit(1);
});
