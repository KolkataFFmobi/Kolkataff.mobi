'use strict';

/*
 * lib/core.js — shared, dependency-free helpers used by build.js and the CLIs.
 *
 * This module owns the single source of truth for:
 *   - reading/writing data/results.json
 *   - Kolkata Fatafat result validation (patti/single rule)
 *   - all IST (+05:30) date/time formatting
 *   - the ONE timestamp function behind the four-way sync rule (see pageModifiedFor)
 *
 * There is deliberately NO third-party dependency here. Node stdlib only.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'results.json');

const IST_OFFSET_MIN = 330; // +05:30, fixed. India observes no DST.

// THE canonical origin — non-www, https. This is the single constant every
// absolute URL derives from: canonical tags, sitemap <loc>, JSON-LD url/@id,
// og:url, and any internal absolute link. Nothing else in the codebase defines
// a host. Change the domain here and everywhere follows.
const SITE_ORIGIN = 'https://kolkataff.mobi';

const SITE = {
  domain: 'kolkataff.mobi',
  origin: SITE_ORIGIN,
  baseUrl: SITE_ORIGIN,
  name: 'Kolkata FF',
  brand: 'KolkataFF.mobi',
  email: 'contact@kolkataff.mobi',
};

/*
 * UNVERIFIED SEED DATA — bazi declaration times (IST). VERIFY BEFORE LAUNCH.
 * Mon–Sat: 8 rounds. Sunday: 4 rounds. These are placeholders and must be
 * confirmed against an authoritative public schedule before going live.
 */
const SCHEDULE = {
  // Monday–Saturday: 8 bazis
  weekday: ['10:03', '11:33', '13:03', '14:33', '16:03', '17:33', '19:03', '20:33'],
  // Sunday: 4 bazis (UNVERIFIED — first four slots used as seed)
  sunday: ['10:03', '11:33', '13:03', '14:33'],
};

// Flip to true MANUALLY, only after checking the SCHEDULE times above against
// authoritative live sources. deploy.js refuses to deploy while this is false.
// Do NOT change the seed times when flipping this.
const SCHEDULE_VERIFIED = false;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---------------------------------------------------------------------------
// Data IO
// ---------------------------------------------------------------------------

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  if (!data || !Array.isArray(data.days)) {
    throw new Error('results.json is malformed: expected { days: [...] }');
  }
  return data;
}

function writeData(data) {
  // Keep days sorted ascending by date so ordering is deterministic everywhere.
  data.days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getDay(data, date) {
  return data.days.find((d) => d.date === date) || null;
}

// ---------------------------------------------------------------------------
// Validation — the Kolkata Fatafat patti/single rule
// ---------------------------------------------------------------------------

function digitSum(patti) {
  return String(patti).split('').reduce((sum, ch) => sum + Number(ch), 0);
}

// The Single is the last digit of the sum of the patti's three digits.
function expectedSingle(patti) {
  return String(digitSum(patti) % 10);
}

// Returns { ok: true } or { ok: false, error: 'human-readable explanation' }.
function validateResult(patti, single) {
  const p = String(patti);
  const s = String(single);
  if (!/^[0-9]{3}$/.test(p)) {
    return { ok: false, error: `patti must be exactly 3 digits (got "${p}").` };
  }
  if (!/^[0-9]$/.test(s)) {
    return { ok: false, error: `single must be exactly 1 digit (got "${s}").` };
  }
  const exp = expectedSingle(p);
  if (s !== exp) {
    const sum = digitSum(p);
    const parts = p.split('').join(' + ');
    return {
      ok: false,
      error:
        `single "${s}" does not match patti "${p}": ` +
        `${parts} = ${sum}, last digit ${exp}, so single must be "${exp}".`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// IST date/time helpers
//
// A "date" here is a YYYY-MM-DD string representing an IST calendar day.
// An "instant" is a JS Date (an absolute point in time).
// declaredAt strings are stored as IST wall-clock with the +05:30 suffix, e.g.
//   "2026-07-14T14:33:00+05:30"  — the HH:MM in that string IS the IST time.
// ---------------------------------------------------------------------------

// Format an absolute instant as an IST ISO-8601 string with the +05:30 offset.
function istIso(instant) {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MIN * 60000);
  return shifted.toISOString().slice(0, 19) + '+05:30';
}

// Today's IST calendar date (YYYY-MM-DD). Overridable via KFF_TODAY for
// deterministic builds/tests; in production this is the real Asia/Kolkata date.
function resolveToday() {
  const override = process.env.KFF_TODAY;
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`KFF_TODAY must be YYYY-MM-DD (got "${override}").`);
    }
    return override;
  }
  return istIso(new Date()).slice(0, 10);
}

// Day of week (0=Sun..6=Sat) for an IST calendar date. Uses noon IST to stay
// clear of any midnight boundary ambiguity.
function weekdayOf(date) {
  return new Date(`${date}T12:00:00+05:30`).getUTCDay();
}

function isSunday(date) {
  return weekdayOf(date) === 0;
}

// Number of bazis scheduled for a given IST date (Sunday=4, otherwise 8).
function bazisForDate(date) {
  return isSunday(date) ? 4 : 8;
}

// Scheduled declaration times for a given IST date.
function scheduleForDate(date) {
  return isSunday(date) ? SCHEDULE.sunday : SCHEDULE.weekday;
}

// The IST HH:MM contained in a stored declaredAt string (which is already IST).
function hhmmFromDeclaredAt(declaredAt) {
  const m = /T(\d{2}:\d{2})/.exec(declaredAt);
  if (!m) throw new Error(`Cannot read HH:MM from declaredAt "${declaredAt}".`);
  return m[1];
}

// ---------------------------------------------------------------------------
// Date display formats (all derived from a YYYY-MM-DD IST date)
// ---------------------------------------------------------------------------

function parseYmd(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Expected YYYY-MM-DD, got "${date}".`);
  return { y: m[1], mo: m[2], d: m[3] };
}

// True only for a real, existing calendar date in YYYY-MM-DD form. Rejects both
// bad format and calendar-impossible values (e.g. 2026-13-45, 2026-02-30).
function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const y = Number(date.slice(0, 4));
  const mo = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// 14.07.2026
function dotDate(date) {
  const { y, mo, d } = parseYmd(date);
  return `${d}.${mo}.${y}`;
}

// 14-07-2026 (used in /result/DD-MM-YYYY/ URLs)
function urlDate(date) {
  const { y, mo, d } = parseYmd(date);
  return `${d}-${mo}-${y}`;
}

// Convert a DD-MM-YYYY URL segment back to a YYYY-MM-DD date.
function fromUrlDate(seg) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(seg);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// 14 July 2026
function longDate(date) {
  const { y, mo, d } = parseYmd(date);
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
}

// Add/subtract whole days from an IST date, returning YYYY-MM-DD.
function shiftDate(date, deltaDays) {
  const base = new Date(`${date}T12:00:00+05:30`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return istIso(base).slice(0, 10);
}

// "2026-07" — the calendar-month key a date belongs to (used to group the
// old-results archive into one page per month).
function monthKey(date) {
  const { y, mo } = parseYmd(date);
  return `${y}-${mo}`;
}

// "2026-07" -> "July 2026"
function monthLabel(mk) {
  const m = /^(\d{4})-(\d{2})$/.exec(mk);
  if (!m) throw new Error(`Expected YYYY-MM, got "${mk}".`);
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

// ---------------------------------------------------------------------------
// THE FOUR-WAY SYNC TIMESTAMP
//
// pageModifiedFor(day) returns the single canonical "last modified" moment for
// the homepage (or an archive page) representing `day`. Every consumer of this
// value MUST use the returned .iso verbatim so that:
//   1. homepage JSON-LD WebPage.dateModified
//   2. sitemap.xml <lastmod> for that page
//   3. the visible "Updated HH:MM IST" chrome
//   4. the /dist file mtime (via .mtime)
// are byte-for-byte derived from the same instant. If a day has declared
// bazis, the timestamp is the latest declaredAt among them; otherwise it falls
// back to the provided build instant.
// ---------------------------------------------------------------------------

function pageModifiedFor(day, buildInstant) {
  const declared = (day && day.bazis ? day.bazis : []).filter(
    (b) => b && b.declaredAt
  );
  if (declared.length > 0) {
    // Latest declaredAt wins. Compare as absolute instants; keep the exact
    // original string for .iso to preserve byte-identity across all four sinks.
    let best = declared[0];
    let bestMs = Date.parse(best.declaredAt);
    for (const b of declared) {
      const ms = Date.parse(b.declaredAt);
      if (ms > bestMs) {
        best = b;
        bestMs = ms;
      }
    }
    return {
      iso: best.declaredAt,
      hhmm: hhmmFromDeclaredAt(best.declaredAt),
      mtime: new Date(bestMs),
    };
  }
  const inst = buildInstant || new Date();
  const iso = istIso(inst);
  return { iso, hhmm: iso.slice(11, 16), mtime: inst };
}

module.exports = {
  ROOT,
  DATA_FILE,
  SITE,
  SITE_ORIGIN,
  SCHEDULE,
  SCHEDULE_VERIFIED,
  MONTHS,
  readData,
  writeData,
  getDay,
  digitSum,
  expectedSingle,
  validateResult,
  istIso,
  resolveToday,
  weekdayOf,
  isSunday,
  bazisForDate,
  scheduleForDate,
  hhmmFromDeclaredAt,
  dotDate,
  urlDate,
  fromUrlDate,
  longDate,
  shiftDate,
  monthKey,
  monthLabel,
  isValidDate,
  pageModifiedFor,
};
