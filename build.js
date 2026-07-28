'use strict';

/*
 * build.js — the single, dependency-free static-site generator for kolkataff.mobi.
 *
 * Responsibilities:
 *   - render every page listed in the brief into /dist
 *   - generate sitemap.xml, 404.html, favicon/robots/_headers passthrough
 *   - enforce the FOUR-WAY SYNC RULE from one timestamp (see lib/core.pageModifiedFor)
 *   - run post-build assertions that FAIL the build if anything diverges or
 *     exceeds the performance budget
 *
 * Run:  node build.js            (real Asia/Kolkata date)
 *       KFF_TODAY=2026-07-14 node build.js   (pinned date, deterministic)
 *
 * Placeholder for social / entity-stack profile URLs. Left empty on purpose.
 * The TrustPilot review URL https://www.trustpilot.com/review/kolkataff.mobi
 * will go in here later, along with social profiles.
 */
const SAME_AS_PROFILES = [];

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const core = require('./lib/core');
const { CSS } = require('./lib/css');

// What actually ships in every <style> block: the stylesheet with its dev
// comments stripped (they are documentation for maintainers, not for the
// visitor's bandwidth — this site's audience is low-end Android). The 10KB
// CSS budget assertion measures THIS, the shipped form; the structural CSS
// assertions (ad-slot height, source-order, daygrid mechanism) keep reading
// the raw source constant, where comments are harmless.
const CSS_SHIPPED = CSS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n');
const content = require('./lib/content');

const {
  SITE, SITE_ORIGIN, ROOT, readData, getDay, resolveToday, shiftDate,
  bazisForDate, scheduleForDate, isSunday,
  dotDate, urlDate, longDate, hhmmFromDeclaredAt, expectedSingle, digitSum,
  pageModifiedFor, istIso,
} = core;

const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

// Legacy 301 redirect map — the single source of truth for dist/_redirects.
// Each group's `to` MUST be a real page in this build (asserted below); the
// `from` list is legacy/inbound URLs the old site exposed. Splats (/*) allowed.
const REDIRECT_MAP = [
  { to: '/', from: ['/index.php', '/fatafat-live-result.php', '/kolkata-ff-fatafat-result-today/', '/kolkata-ff-fatafat'] },
  { to: '/old-results/', from: ['/old-records', '/old-records/', '/Old-Records.php', '/fatafat-old-record.php', '/kolkata-fatafat-october-2024-old-record/', '/january-2022/', '/2021-chart/', '/2022-chart/', '/kolkataff-2022-results.php', '/kolkataff-2023-results.php', '/kolkataff-2022/*', '/kolkataff-2023/*', '/result/*'] },
  { to: '/patti-chart/', from: ['/0-9-all-pana.php', '/220-patti-chart/', '/kolkata-ff-fatafat-patti-list/'] },
  { to: '/how-to-play/', from: ['/how-to-play-kolkata-ff-fatafat-rules-payouts-beginners-guide/'] },
  { to: '/about/', from: ['/about-us/', '/about-us-2/', '/about'] },
  { to: '/contact/', from: ['/contact-us/', '/contact'] }, // /contact/ is canonical; only variants redirect
  { to: '/privacy/', from: ['/privacy-policy/'] },
  { to: '/terms/', from: ['/terms-of-service/'] },
  { to: '/disclaimer/', from: ['/important-disclaimers/', '/responsible-gaming/'] },
];

// DELIBERATELY_DEAD — legacy junk/spam URL families that MUST resolve to our
// 404 page (no redirect). Used only by the post-build assertion, which fails if
// any of these ever appears as a redirect target. Never add redirects for:
//   tips / lucky-number / ghosh-babu / dpboss / main-bazar / siliguri /
//   wp-content / wp-includes / feed / category / author
const DELIBERATELY_DEAD = [
  '/tips.php', '/lucky-number/', '/ghosh-babu/', '/dpboss/', '/main-bazar/', '/siliguri/',
  '/wp-content/', '/wp-includes/', '/feed/', '/category/', '/author/',
];

// Canonical FIXED-page inventory. The ONLY dynamic routes the build emits are
// /old-results/YYYY-MM/ month-archive pages (one per earlier calendar month,
// validated against the data). There are NO per-day /result/DD-MM-YYYY/ pages
// and no /old-results/page/N/ pagination — both were removed by design; the
// archive renders inline, and legacy /result/* URLs 301 to /old-results/. The
// hermetic-output assertion fails on any dist/ .html not accounted for by
// either this list or a valid month route.
const PAGE_INVENTORY = [
  '/', '/old-results/', '/patti-chart/', '/timings/', '/how-to-play/', '/faq/',
  '/about/', '/contact/', '/disclaimer/', '/terms/', '/privacy/', '/cookies/', '/404',
];

// content.SAME_AS_PROFILES is the authoritative empty placeholder; keep build's
// local constant in step with it so there is a single source of truth.
const SAMEAS = content.SAME_AS_PROFILES.length ? content.SAME_AS_PROFILES : SAME_AS_PROFILES;

// ---------------------------------------------------------------------------
// Small string helpers
// ---------------------------------------------------------------------------
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}
// Serialise JSON-LD safely: valid JSON, but with '<' escaped so a stray
// "</script>" in any string can never break out of the <script> block.
function jsonld(obj) {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

// ---------------------------------------------------------------------------
// Emitted-file bookkeeping (for post-build assertions + mtime application)
// ---------------------------------------------------------------------------
const emitted = []; // { file, route, isPublicHtml, mtime }

function writeFile(route, html, opts) {
  opts = opts || {};
  let rel;
  if (route === '/') rel = 'index.html';
  else if (route === '/404') rel = '404.html';
  else rel = route.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
  emitted.push({
    file,
    route,
    isPublicHtml: opts.isPublicHtml !== false, // default true
    mtime: opts.mtime || null,
  });
  return file;
}

// ---------------------------------------------------------------------------
// Shared chrome: nav + footer + full-document layout
// ---------------------------------------------------------------------------
// Same block-letter "FF" mark and geometry as the brand favicon.svg, colours
// inverted (white card + red glyph) so it reads clearly on the red header bar.
const BRAND_SVG =
  '<svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
  '<rect width="64" height="64" rx="14" fill="#ffffff"/>' +
  '<g fill="#DC2626">' +
  '<rect x="14" y="16" width="7" height="32"/><rect x="14" y="16" width="18" height="7"/><rect x="14" y="30" width="14" height="6"/>' +
  '<rect x="36" y="16" width="7" height="32"/><rect x="36" y="16" width="18" height="7"/><rect x="36" y="30" width="14" height="6"/>' +
  '</g></svg>';

// Top nav = hub-and-spoke. Legal pages are intentionally NOT here (footer only).
const NAV = [
  { href: '/', label: 'Home' },
  { href: '/old-results/', label: 'Old Results' },
  { href: '/patti-chart/', label: 'Patti Chart' },
  { href: '/timings/', label: 'Timings' },
  { href: '/how-to-play/', label: 'How to Play' },
];

function navHtml() {
  const links = NAV.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('');
  return (
    '<header class="site-header"><div class="wrap">' +
    `<a class="brand" href="/">${BRAND_SVG}<span>Kolkata FF</span></a>` +
    `<nav class="nav" aria-label="Main menu">${links}</nav>` +
    '</div></header>'
  );
}

// Footer link columns — one shared footerHtml() call site (in layout()) means
// this is byte-identical on every page by construction; the [template]
// assertion checksums it as a guard against future drift, not the mechanism.
const FOOTER_COLUMNS = [
  {
    label: 'Results',
    links: [
      { href: '/', label: 'Home' },
      { href: '/old-results/', label: 'Old Results' },
      { href: '/patti-chart/', label: 'Patti Chart' },
      { href: '/timings/', label: 'Timings' },
    ],
  },
  {
    label: 'Information',
    links: [
      { href: '/how-to-play/', label: 'How to Play' },
      { href: '/faq/', label: 'FAQ' },
      { href: '/about/', label: 'About' },
      { href: '/contact/', label: 'Contact' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { href: '/privacy/', label: 'Privacy' },
      { href: '/cookies/', label: 'Cookies' },
      { href: '/terms/', label: 'Terms' },
      { href: '/disclaimer/', label: 'Disclaimer' },
    ],
  },
];

function footerHtml() {
  const cols = FOOTER_COLUMNS.map((col) => {
    const links = col.links.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join('');
    return `<nav aria-label="${esc(col.label)}"><strong>${esc(col.label)}</strong>${links}</nav>`;
  }).join('');
  return (
    '<footer class="site-footer"><div class="wrap">' +
    `<div class="footer-cols">${cols}</div>` +
    '<p class="footer-legal">Informational only. Not affiliated with Kolkata FF. 18+. ' +
    'Gambling may be illegal in your jurisdiction.</p>' +
    `<p class="footer-legal">&copy; ${SITE.domain} &middot; results aggregated from publicly available sources.</p>` +
    '</div></footer>'
  );
}

// The single reserved ad slot (fixed height, empty for now, zero CLS).
const AD_SLOT =
  '<div class="ad-slot" role="complementary" aria-label="Advertisement">Advertisement</div>';

// Back-to-top button, every page. Pure progressive enhancement — no
// information is conveyed without JS, so it is server-rendered `hidden` (same
// pattern as the "Load More" button) and only revealed by the script below
// once the user has actually scrolled down.
const BACK_TO_TOP =
  '<button id="back-to-top" type="button" aria-label="Back to top" hidden>&uarr;</button>' +
  '<script>(function(){var b=document.getElementById("back-to-top");if(!b)return;' +
  'addEventListener("scroll",function(){b.hidden=scrollY<400},{passive:true});' +
  'b.onclick=function(){scrollTo({top:0,behavior:"smooth"})}})();</script>';

// Google Analytics (GA4) — the ONE deliberate, documented exception to the
// "no third-party JS" rule, added 2026-07-19 by explicit request (see
// CLAUDE.md "Analytics exception" for the full scope). Injected once here so
// every page emitted through layout() is trackable. build.js's [js] assertion
// allows only this EXACT external <script src>; dist/_headers CSP is loosened
// only for the two Google hosts this needs.
const GA_MEASUREMENT_ID = 'G-RES0GKZ8FY';
const ANALYTICS_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
const ANALYTICS_SNIPPET =
  '<!-- Google tag (gtag.js) -->\n' +
  `<script async src="${ANALYTICS_SCRIPT_SRC}"></script>\n` +
  '<script>\n' +
  '  window.dataLayer = window.dataLayer || [];\n' +
  '  function gtag(){dataLayer.push(arguments);}\n' +
  "  gtag('js', new Date());\n" +
  `  gtag('config', '${GA_MEASUREMENT_ID}');\n` +
  '</script>';

function layout({ title, description, route, graph, body, robots }) {
  const canonical = SITE.baseUrl + route;
  const head = [
    ANALYTICS_SNIPPET,
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<meta name="theme-color" content="#DC2626">',
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}">`,
    `<link rel="canonical" href="${escAttr(canonical)}">`,
    `<meta name="robots" content="${escAttr(robots || 'index,follow,max-image-preview:large')}">`,
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">',
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(description)}">`,
    `<meta property="og:url" content="${escAttr(canonical)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="en_IN">',
    `<meta property="og:site_name" content="${escAttr(SITE.name)}">`,
    `<meta property="og:image" content="${escAttr(SITE.baseUrl + '/og-image.png')}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Kolkata FF — Kolkata Fatafat Result Today">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(description)}">`,
    `<meta name="twitter:image" content="${escAttr(SITE.baseUrl + '/og-image.png')}">`,
    '<meta name="twitter:image:alt" content="Kolkata FF — Kolkata Fatafat Result Today">',
    `<style>${CSS_SHIPPED}</style>`,
    `<script type="application/ld+json">${jsonld(graph)}</script>`,
  ].join('\n');

  // AD_SLOT is a sibling AFTER </main>, not a child of it: role="complementary"
  // is a landmark, and a landmark nested inside <main> fails the
  // landmark-is-top-level a11y rule. Its own .wrap div keeps the same
  // max-width/padding it had when it shared main's wrap div.
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n' + head + '\n</head>\n<body>\n' +
    navHtml() +
    '<main><div class="wrap">\n' + body + '\n</div></main>\n' +
    '<div class="wrap">' + AD_SLOT + '</div>\n' +
    footerHtml() +
    BACK_TO_TOP +
    '\n</body>\n</html>\n'
  );
}

// ---------------------------------------------------------------------------
// JSON-LD graph builders
// ---------------------------------------------------------------------------
const GAME_ALT = ['Kolkata FF', 'KFF', 'কলকাতা ফটাফট', 'Calcutta Fatafat', 'Kolkata Fatafati', 'Kolkata Fotafot', 'KolkataFatafat'];
const SITE_ALT = ['Kolkata Fatafat', 'KFF', 'কলকাতা ফটাফট', 'Calcutta Fatafat', 'Kolkata Fatafati', 'Kolkata Fotafot', 'KolkataFatafat'];

function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': SITE.baseUrl + '/#website',
    url: SITE.baseUrl + '/',
    name: 'Kolkata FF',
    alternateName: SITE_ALT,
    inLanguage: ['en', 'bn'],
    publisher: { '@id': SITE.baseUrl + '/#org' },
  };
}
function orgNode() {
  return {
    '@type': 'Organization',
    '@id': SITE.baseUrl + '/#org',
    name: SITE.brand,
    url: SITE.baseUrl + '/',
    logo: {
      '@type': 'ImageObject',
      url: SITE.baseUrl + '/logo.png',
      width: 512,
      height: 512,
    },
    // Omit sameAs entirely until real profile URLs exist — an empty array is
    // valid but noisy, and SAME_AS_PROFILES is a documented placeholder.
    ...(SAMEAS.length ? { sameAs: SAMEAS } : {}),
  };
}
// Typed as schema.org Game (a CreativeWork subtype — still a Thing, so the
// WebPage.about reference stays valid): `gameLocation` is defined on Game and
// `contentLocation` on CreativeWork, so BOTH Place/Wikidata anchors validate
// cleanly. The earlier bare-Thing shape made validator.schema.org flag
// location/contentLocation as unrecognized for Thing.
function gameNode() {
  return {
    '@type': 'Game',
    '@id': SITE.baseUrl + '/#game',
    name: 'Kolkata Fatafat',
    alternateName: GAME_ALT,
    description: content.DEFINITIONAL_PARA,
    gameLocation: {
      '@type': 'Place',
      name: 'Kolkata, West Bengal, India',
      sameAs: 'https://www.wikidata.org/wiki/Q1348',
    },
    // Broader state-level anchor, complementary to the city-level one above.
    contentLocation: {
      '@type': 'Place',
      name: 'West Bengal, India',
      sameAs: 'https://www.wikidata.org/wiki/Q1356',
    },
  };
}
// `list` is required (no implicit default) so every call site is explicit
// about which FAQ set it means — the site now has several distinct sets
// (homepage FAQ_CORE, /faq/'s FAQ_CORE+FAQ_MORE, and per-page visible-only
// lists), and an implicit fallback risks silently rendering the wrong one.
function faqNode(id, list) {
  return {
    '@type': 'FAQPage',
    '@id': id,
    mainEntity: list.map((f) => ({
      '@type': 'Question',
      name: f.q,
      ...(f.lang ? { inLanguage: f.lang } : {}),
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
        ...(f.lang ? { inLanguage: f.lang } : {}),
      },
    })),
  };
}

function homepageGraph(pm, title, description) {
  const url = SITE.baseUrl + '/';
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(),
      orgNode(),
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name: title,
        description,
        isPartOf: { '@id': SITE.baseUrl + '/#website' },
        inLanguage: 'en',
        dateModified: pm.iso,
        about: { '@id': SITE.baseUrl + '/#game' },
        mainEntity: { '@id': url + '#faq' },
        publisher: { '@id': SITE.baseUrl + '/#org' },
      },
      gameNode(),
      faqNode(url + '#faq', content.FAQ_CORE),
    ],
  };
}

// Pages whose subject genuinely IS the game entity. These carry the #game node
// and an `about` reference, so the core entity is reinforced across the content
// network instead of being asserted on the homepage alone (entity theory: an
// entity is confirmed by consistent, connected mentions, not one declaration).
// Legal/utility pages (privacy, cookies, terms, contact, 404) are deliberately
// NOT about the game — claiming otherwise would be a false entity signal.
const GAME_TOPICAL_ROUTES = new Set([
  '/old-results/', '/patti-chart/', '/timings/', '/how-to-play/', '/faq/', '/about/', '/disclaimer/',
]);

// Shared breadcrumb builder: emits the visible <nav> and the matching
// BreadcrumbList node from ONE definition, so the markup and the structured
// data can never drift apart. `trail` is the crumbs AFTER Home, in order:
// [{ name, href }] — the last entry renders as plain text (current page).
function breadcrumb(route, trail) {
  const crumbs = trail.map((c, i) => {
    const isLast = i === trail.length - 1;
    return isLast ? `<span>${esc(c.name)}</span>` : `<a href="${escAttr(c.href)}">${esc(c.name)}</a>`;
  });
  const html =
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; ' +
    crumbs.join(' &rsaquo; ') + '</nav>';
  const node = {
    '@type': 'BreadcrumbList',
    '@id': SITE.baseUrl + route + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kolkata Fatafat result today', item: SITE.baseUrl + '/' },
      ...trail.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: c.name,
        item: SITE.baseUrl + (c.href || route),
      })),
    ],
  };
  return { html, node, ref: { '@id': SITE.baseUrl + route + '#breadcrumb' } };
}

// WebPage-only graph (legal + simple info pages), with optional extra nodes.
// webPageProps: optional extra properties spread into the WebPage node (e.g.
// mainEntity or breadcrumb @id references to nodes passed via extraNodes).
// websiteNode/orgNode are included on EVERY page so isPartOf/publisher always
// resolve within the page's own graph — previously they existed only on the
// homepage, leaving a dangling @id on the other 18 pages.
function pageGraph(route, title, description, extraNodes, webPageProps) {
  const url = SITE.baseUrl + route;
  const isGameTopical = GAME_TOPICAL_ROUTES.has(route);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(),
      orgNode(),
      {
        '@type': 'WebPage',
        '@id': url + '#webpage',
        url,
        name: title,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': SITE.baseUrl + '/#website' },
        publisher: { '@id': SITE.baseUrl + '/#org' },
        // Reinforce the core entity on every page that is genuinely about it.
        ...(isGameTopical ? { about: { '@id': SITE.baseUrl + '/#game' } } : {}),
        ...(webPageProps || {}),
      },
      // The #game node must exist in the same graph for `about` to resolve.
      ...(isGameTopical ? [gameNode()] : []),
      ...(extraNodes || []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Result-table rendering (homepage today + archive days)
// ---------------------------------------------------------------------------
function bazisByNumber(day) {
  const map = {};
  if (day && Array.isArray(day.bazis)) {
    for (const b of day.bazis) map[b.n] = b;
  }
  return map;
}

// Bazi-per-row table: one row per bazi (columns = Patti | Single | Result),
// which fits a 360px viewport with no horizontal scroll. The Bazi row-header
// carries the scheduled time so undeclared rounds still show their time next to
// the "—" in Patti/Single. <th scope> semantics + bilingual headers preserved.
// The .table-scroll wrapper stays as an overflow floor for very narrow devices.
function renderResultTable(day, date, caption) {
  const n = bazisForDate(date); // draws actually happening today: 4 on Sunday, 8 otherwise
  const sched = scheduleForDate(date);
  const map = bazisByNumber(day);

  const rows = [];
  // Always render all 8 rows (matches renderDayGrid's convention) so the
  // table is visually consistent every day. Rows beyond `n` — Sunday's
  // non-existent Bazi 5-8 — are never "Awaiting result": that label is
  // reserved for a draw actually coming today. They get an explicit no-draw
  // status instead, with no scheduled-time badge (Sunday's schedule has only
  // 4 entries, so there isn't one). This text is Sunday-specific because
  // bazisForDate currently only reduces the count on Sundays; revisit the
  // copy if a future schedule change adds another reduced-round day.
  for (let i = 1; i <= 8; i++) {
    const b = map[i];
    const rowId = `rh-b${i}`;
    const time = sched[i - 1];
    const timeBadge = time ? ` <span class="bz-time">&middot; ${esc(time)}</span>` : '';
    // Each data cell carries headers="{column-th} {row-th}" so its meaning is
    // machine-readable on BOTH axes (which bazi × which of Patti/Single/Result),
    // beyond the scope=row/col that already covers the simple grid case.
    const rowHead = `<th scope="row" id="${rowId}"><span class="bz">Bazi ${i}</span>${timeBadge}</th>`;
    if (i > n) {
      rows.push(
        `<tr>${rowHead}` +
        `<td headers="ch-patti ${rowId}"><span class="dash">&mdash;</span></td>` +
        `<td headers="ch-single ${rowId}"><span class="dash">&mdash;</span></td>` +
        `<td headers="ch-result ${rowId}"><span class="pending">No draw on Sundays / <span lang="bn">রবিবার বন্ধ</span></span></td></tr>`
      );
    } else if (b) {
      const hhmm = hhmmFromDeclaredAt(b.declaredAt);
      rows.push(
        `<tr>${rowHead}` +
        `<td headers="ch-patti ${rowId}"><span class="patti">${esc(b.patti)}</span></td>` +
        `<td headers="ch-single ${rowId}"><span class="single-pill">${esc(b.single)}</span></td>` +
        `<td class="res-cell" headers="ch-result ${rowId}"><svg class="ok" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">` +
        '<path d="M2.5 8.5l3.4 3.4 7.6-8" fill="none" stroke="#15803D" stroke-width="2.4"/></svg> ' +
        `${esc(b.patti)}-${esc(b.single)}` +
        `<time class="updated" datetime="${escAttr(b.declaredAt)}">Updated ${esc(hhmm)} IST</time></td></tr>`
      );
    } else {
      rows.push(
        `<tr>${rowHead}` +
        `<td headers="ch-patti ${rowId}"><span class="dash">&mdash;</span></td>` +
        `<td headers="ch-single ${rowId}"><span class="dash">&mdash;</span></td>` +
        `<td headers="ch-result ${rowId}"><span class="pending">Awaiting result</span></td></tr>`
      );
    }
  }

  // Caption is sr-only: the "Today's result" h2 already visibly labels this
  // table, and a visible caption here would be net-new content sitting right
  // above the centerpiece table — pushing against the strict 360px fold rule
  // (H1 + LIVE badge + today table must fit with no scroll). The full explicit
  // caption text still exists for assistive tech via the accessible name.
  return (
    '<div class="table-scroll"><table id="kolkata-ff-result-today" class="result-table">' +
    `<caption class="visually-hidden">${esc(caption)}</caption>` +
    '<thead><tr>' +
    '<th scope="col" id="ch-bazi">Bazi / <span lang="bn">বাজি</span></th>' +
    '<th scope="col" id="ch-patti">Patti / <span lang="bn">পাত্তি</span></th>' +
    '<th scope="col" id="ch-single">Single / <span lang="bn">সিঙ্গেল</span></th>' +
    '<th scope="col" id="ch-result">Result / <span lang="bn">রেজাল্ট</span></th>' +
    '</tr></thead>' +
    `<tbody>${rows.join('')}</tbody></table></div>`
  );
}

// One <td> for a day-grid data row: the visible value (or an en-dash for an
// undeclared/Sunday-empty slot), plus a per-cell sr-only label ("Patti 3: ",
// "Single 3: not declared") so a screen reader identifies each of the 8 cells
// without needing a separate header column/row (the day's date is the table's
// <caption>, and the exact 8-cell-per-row shape leaves no room for one).
function dayGridCell(cssClass, kind, n, value) {
  if (value == null) {
    return `<td class="${cssClass} dg-empty"><span class="visually-hidden">${kind} ${n}: not declared</span>&ndash;</td>`;
  }
  return `<td class="${cssClass}"><span class="visually-hidden">${kind} ${n}: </span>${esc(value)}</td>`;
}

// Shared compact day-grid: ONE <table> per day, used everywhere except
// today's centerpiece result table (homepage Yesterday block, homepage Last
// 30 Days, /old-results/). Always exactly 8 columns regardless of weekday, so
// every day in a list renders the same width — a Sunday's non-existent bazis
// 5-8 simply show the same "not declared" dash as any other undeclared slot.
// A day with day.status === 'game_off' renders a single merged row instead.
function renderDayGrid(day, date, opts) {
  opts = opts || {};
  const idAttr = opts.id ? ` id="${escAttr(opts.id)}"` : '';
  const dateLabel = esc(longDate(date));
  const gameOff = !!(day && day.status === 'game_off');

  let bodyRows;
  if (gameOff) {
    bodyRows = '<tr><td colspan="8" class="game-off">Game Off</td></tr>';
  } else {
    const map = bazisByNumber(day);
    const pattiCells = [];
    const singleCells = [];
    for (let i = 1; i <= 8; i++) {
      const b = map[i];
      pattiCells.push(dayGridCell('dg-patti', 'Patti', i, b ? b.patti : null));
      singleCells.push(dayGridCell('dg-single', 'Single', i, b ? b.single : null));
    }
    bodyRows = `<tr>${pattiCells.join('')}</tr><tr>${singleCells.join('')}</tr>`;
  }

  // The date is the table's <caption> (more semantic than a colspan th, and it
  // no longer scrolls away): styled as the visible red date bar, made
  // sticky+viewport-centred in CSS (.dg-date on .dg-scroll). The "Kolkata
  // Fatafat result " prefix is sr-only, so the visible bar stays just the date
  // while the accessible name / caption text remains the full explicit string.
  return (
    `<div class="table-scroll dg-scroll"><table class="daygrid"${idAttr}>` +
    `<caption class="dg-date"><span class="visually-hidden">Kolkata Fatafat result </span>${dateLabel}</caption>` +
    `<tbody>${bodyRows}</tbody>` +
    '</table></div>'
  );
}

// ---------------------------------------------------------------------------
// Schedule + chart tables (computed, explanatory — never predictive)
// ---------------------------------------------------------------------------
// opts: { startN=1, id?, caption? }. The round cell is a <th scope="row">
// (it identifies the row); each declaration time is wrapped in <time datetime>
// (a valid time-of-day value — HTML <time> does not take a zone offset on a
// bare time, so IST is stated in the visible text and the table caption).
function scheduleTable(times, dayLabel, opts) {
  opts = opts || {};
  const startN = opts.startN || 1;
  const idAttr = opts.id ? ` id="${escAttr(opts.id)}"` : '';
  const caption = opts.caption || `Kolkata FF Bazi Time Table (IST) — ${dayLabel}`;
  const rows = times
    .map((t, i) =>
      `<tr><th scope="row">Bazi ${startN + i}</th>` +
      `<td><time datetime="${escAttr(t)}">${esc(t)} IST</time></td></tr>`)
    .join('');
  return (
    `<div class="table-scroll"><table class="sched"${idAttr}>` +
    `<caption>${esc(caption)}</caption>` +
    '<thead><tr><th scope="col">Round</th><th scope="col">Time</th></tr></thead>' +
    `<tbody>${rows}</tbody></table></div>`
  );
}

// The full 220-Patti set, grouped by the Single each produces. COMPUTED (all
// multisets of 3 digits 0-9, C(12,3)=220), never hand-maintained. Display
// convention matches the game's own (and our results data): digits ascending
// with 0 sorting last — {0,3,9} -> "390", {0,0,7} -> "700", {0,0,0} -> "000".
// A complete enumeration reference, explicitly NOT a prediction of anything.
function patti220BySingle() {
  const groups = Array.from({ length: 10 }, () => []);
  let total = 0;
  for (let a = 0; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      for (let c = b; c <= 9; c++) {
        const disp = [a, b, c].sort((x, y) => (x || 10) - (y || 10)).join('');
        groups[(a + b + c) % 10].push(disp);
        total++;
      }
    }
  }
  if (total !== 220) throw new Error(`patti220BySingle generated ${total} pattis, expected 220`);
  for (let s = 0; s <= 9; s++) {
    if (groups[s].length !== 22) throw new Error(`Single ${s} has ${groups[s].length} pattis, expected 22`);
  }
  return groups;
}

function patti220Table() {
  const groups = patti220BySingle();
  const rows = groups
    .map((pattis, s) =>
      `<tr><th scope="row"><span class="single-pill">${s}</span></th>` +
      `<td class="patti-list">${pattis.join(' ')}</td></tr>`)
    .join('');
  return (
    '<div class="table-scroll"><table id="kolkata-ff-220-patti" class="chart-table">' +
    '<caption>Kolkata FF Patti Chart &ndash; all 220 Patti grouped by the Single they produce</caption>' +
    '<thead><tr><th scope="col">Single</th><th scope="col">Patti (22 per Single)</th></tr></thead>' +
    `<tbody>${rows}</tbody></table></div>`
  );
}

// Explanatory patti->single derivation reference. Computed, verified, and
// explicitly NOT a prediction of any result.
function chartDerivationTable() {
  const rows = [];
  for (let s = 0; s <= 9; s++) {
    let picked = null;
    for (let p = 109; p <= 999; p++) {
      const ps = String(p);
      if (digitSum(ps) % 10 === s && digitSum(ps) >= 10) { picked = ps; break; }
    }
    if (!picked) {
      for (let p = 100; p <= 999; p++) {
        const ps = String(p);
        if (digitSum(ps) % 10 === s) { picked = ps; break; }
      }
    }
    const sum = digitSum(picked);
    const parts = picked.split('').join(' + ');
    rows.push(
      `<tr><th scope="row">${esc(picked)}</th><td>${parts} = ${sum}</td><td><span class="single-pill">${s}</span></td></tr>`
    );
  }
  return (
    '<div class="table-scroll"><table id="kolkata-ff-patti-chart" class="chart-table">' +
    '<caption>Kolkata FF Patti Chart &ndash; how each Single (0&ndash;9) is derived from its Patti</caption>' +
    '<thead><tr><th scope="col">Patti (example)</th><th scope="col">Sum of digits</th>' +
    '<th scope="col">Single</th></tr></thead>' +
    `<tbody>${rows.join('')}</tbody></table></div>`
  );
}

// ---------------------------------------------------------------------------
// FAQ rendering (shared by homepage block and /faq/)
// ---------------------------------------------------------------------------
// Wrap contiguous Bengali-script runs in <span lang="bn"> so screen readers
// switch voice for inline Bengali inside English copy. Applied to ESCAPED
// visible-HTML text only — JSON-LD keeps the plain string (markup would be
// wrong there). Entries already rendered under a lang="bn" element skip this.
function wrapBn(escapedText) {
  return escapedText.replace(/[ঀ-৿][ঀ-৿ ]*[ঀ-৿]|[ঀ-৿]/g,
    (m) => `<span lang="bn">${m}</span>`);
}

function faqHtml(list) {
  const items = list.map((f) => {
    const langAttr = f.lang ? ` lang="${f.lang}"` : '';
    const q = f.lang ? esc(f.q) : wrapBn(esc(f.q));
    const a = f.lang ? esc(f.a) : wrapBn(esc(f.a));
    return `<dt${langAttr}>${q}</dt><dd${langAttr}>${a}</dd>`;
  }).join('\n');
  return `<dl class="faq">\n${items}\n</dl>`;
}

// ---------------------------------------------------------------------------
// NEXT-RESULT strip: server-rendered baseline (no-JS) + a tiny inline vanilla
// countdown enhancement. No framework, no fetch/XHR. Fixed height in CSS => CLS 0.
// The SCHEDULE is the single source; its times are injected into the script.
// Label is "Next (approx):" until core.SCHEDULE_VERIFIED flips to true.
// ---------------------------------------------------------------------------
function nextResultStrip(ctx) {
  const buildInstant = ctx.buildInstant;
  const label = core.SCHEDULE_VERIFIED ? 'Next:' : 'Next (approx):';
  const toMin = (t) => { const p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); };
  const W = core.SCHEDULE.weekday.map(toMin);
  const S = core.SCHEDULE.sunday.map(toMin);

  // Baseline: next bazi relative to the build instant, in IST.
  const istNow = new Date(buildInstant.getTime() + 330 * 60000);
  const sched = istNow.getUTCDay() === 0 ? core.SCHEDULE.sunday : core.SCHEDULE.weekday;
  const curMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
  let bn = 1, btime = sched[0], rolled = true;
  for (let i = 0; i < sched.length; i++) {
    if (toMin(sched[i]) > curMin) { bn = i + 1; btime = sched[i]; rolled = false; break; }
  }
  if (rolled) {
    const tmr = new Date(buildInstant.getTime() + 330 * 60000 + 86400000);
    const ts = tmr.getUTCDay() === 0 ? core.SCHEDULE.sunday : core.SCHEDULE.weekday;
    bn = 1; btime = ts[0];
  }
  const baseText = `Bazi ${bn} at ${btime} IST`;

  const js =
    `(function(){var W=[${W}],S=[${S}],` +
    `t=document.getElementById('nx-t'),c=document.getElementById('nx-c');if(!t||!c)return;` +
    `function z(x){return(x<10?'0':'')+x}` +
    `function tick(){var d=new Date(Date.now()+19800000),a=d.getUTCDay()===0?S:W,` +
    `cur=d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds(),g=-1,n=1,i;` +
    `for(i=0;i<a.length;i++){if(a[i]*60>cur){g=a[i]*60;n=i+1;break}}` +
    `var diff,slot;if(g<0){var e=new Date(Date.now()+19800000+86400000),b=(e.getUTCDay()===0?S:W)[0];diff=86400-cur+b*60;n=1;slot=b}else{diff=g-cur;slot=a[n-1]}` +
    `var nt='Bazi '+n+' at '+z(Math.floor(slot/60))+':'+z(slot%60)+' IST';` +
    `if(t.textContent!==nt)t.textContent=nt;` +
    `c.textContent=z(Math.floor(diff/3600))+':'+z(Math.floor(diff/60)%60)+':'+z(diff%60)}` +
    `tick();setInterval(tick,1000);})();`;

  // The live region wraps ONLY the label + slow-changing baseline (#nx-t,
  // change-guarded, updates ≈8×/day) — root-cause fix, not just aria-hidden:
  // role="status" carries an implicit aria-atomic="true", so ANY node inside
  // it can trigger a re-announcement of the whole region. Keeping the
  // per-second counter (#nx-c) structurally OUTSIDE this span (not merely
  // aria-hidden inside it) means it can never trigger that, on any AT.
  return (
    '<div class="next-strip" id="next-result-countdown">' +
    '<span role="status" aria-live="polite">' +
    `<span class="next-label">${label}</span>` +
    `<span class="next-base" id="nx-t">${esc(baseText)}</span>` +
    '</span>' +
    '<span class="next-cd" id="nx-c" aria-hidden="true"></span>' +
    '</div>' +
    `<script>${js}</script>`
  );
}

// ---------------------------------------------------------------------------
// Page renderers
// ---------------------------------------------------------------------------
function renderHomepage(ctx) {
  const { today, todayDay, pm, archives } = ctx;
  // Title date format intentionally matches the H1's "(D Month YYYY)" (not the
  // table caption's dotDate) — see the [h1-date] assertion, which checks both.
  const title = `Kolkata FF – Kolkata Fatafat Result Today (${longDate(today)}) Live`;
  // Bazi count is interpolated (4 on Sunday, 8 otherwise) so the SERP/OG
  // snippet never contradicts the page's own table caption on a Sunday.
  const nToday = bazisForDate(today);
  const description =
    `Kolkata FF (Kolkata Fatafat) result today ${longDate(today)} — all ${nToday} bazi live with Patti and Single, ` +
    `verified from multiple sources. Timings 10:03–20:33 IST, Sunday 4 bazi, last 30 days chart.`;

  // Yesterday
  const yDate = shiftDate(today, -1);
  const yDay = getDay(ctx.data, yDate);

  // Last 30 Days = most recent frozen archive days (excluding today), newest
  // first. `archives` itself is in results.json file order (ascending/oldest
  // first) — must go through archivesDesc() to actually get newest-first, or
  // this silently returns the OLDEST days instead (a real bug caught in QA).
  const last30 = archivesDesc(ctx).filter((d) => d.date !== today).slice(0, 30);

  const parts = [];

  // (2) H1 (date from the same `today` var) -> LIVE badge + date -> NEXT strip
  parts.push(`<h1>Kolkata FF &ndash; Kolkata Fatafat Result Today (${esc(longDate(today))})</h1>`);
  parts.push(
    '<div class="live-row"><span class="live-badge">LIVE</span> ' +
    `<time datetime="${escAttr(today)}">${esc(longDate(today))}</time> ` +
    `<span class="muted">&middot; updated <time datetime="${escAttr(pm.iso)}">${esc(pm.hhmm)} IST</time></span></div>`
  );
  parts.push(nextResultStrip(ctx));

  // (3) Today's result table. Caption keeps the date (four-way-sync invariant:
  // caption date derives from the same `today`) and the real bazi count
  // (nToday = 4 on Sunday, 8 otherwise — never a hard-coded 8).
  parts.push('<section class="card" id="todays-result" aria-labelledby="todays-result-h">');
  parts.push('<h2 id="todays-result-h">Today\'s result</h2>');
  parts.push(
    renderResultTable(todayDay, today, `Kolkata FF – Kolkata Fatafat Result Today (${dotDate(today)}) — all ${nToday} Bazi (Patti and Single).`)
  );
  parts.push('</section>');

  // (4) Definitional paragraph (verbatim; the Bengali alias gets a lang="bn"
  // wrap in the visible HTML only — JSON-LD reuses the plain string).
  // Heading-less region → aria-label.
  parts.push(`<section class="card" aria-label="What Kolkata Fatafat is"><p class="lead">${wrapBn(esc(content.DEFINITIONAL_PARA))}</p></section>`);

  // (5) Yesterday block
  if (yDay && yDay.bazis && yDay.bazis.length) {
    parts.push('<section class="card" id="yesterday-result" aria-labelledby="yesterday-result-h"><h2 id="yesterday-result-h">Yesterday\'s result</h2>');
    parts.push(renderDayGrid(yDay, yDate, { id: 'yesterday-result-table' }));
    if (yDay.frozen) {
      parts.push(
        `<p><a href="/old-results/#d-${urlDate(yDate)}">Kolkata Fatafat result ${esc(longDate(yDate))}</a></p>`
      );
    }
    parts.push('</section>');
  }

  // (5b) Last 30 Days — positioned right after Yesterday (still well after the
  // centerpiece today-table), replaces the old "Last 7 days" links list.
  parts.push('<section id="last-30-days-results" aria-labelledby="last-30-days-results-h"><h2 id="last-30-days-results-h">Kolkata Fatafat Last 30 Days Results</h2>');
  if (last30.length) {
    for (const d of last30) {
      parts.push(`<div class="card">${renderDayGrid(d, d.date, { id: `d-${urlDate(d.date)}` })}</div>`);
    }
  } else {
    parts.push('<p class="muted">No archived results yet.</p>');
  }
  parts.push('<p class="view-all"><a class="btn" href="/old-results/">View All Old Results</a></p>');
  parts.push('</section>');

  // (5c) Bengali-language intro section — distinct from the shorter Bengali
  // summary block further down (7); this one has its own heading.
  parts.push('<section class="card" aria-labelledby="bengali-intro">');
  parts.push(`<h2 id="bengali-intro" lang="bn">${esc(content.BENGALI_INTRO_H2)}</h2>`);
  parts.push(`<p class="lang-bn" lang="bn">${esc(content.BENGALI_INTRO_PARA)}</p>`);
  parts.push('</section>');

  // (5d) Extra homepage prose sections (2026-07-19 content pass): what the
  // game is, how to read a result, a timings summary, and why check here.
  for (const s of content.HOMEPAGE_SECTIONS) {
    parts.push(`<section class="card" aria-labelledby="${s.id}-h">`);
    parts.push(`<h2 id="${s.id}-h">${esc(s.h2)}</h2>`);
    parts.push(s.bodyHtml);
    parts.push('</section>');
  }

  // (6) Timings table (anchor id=timings)
  parts.push('<section class="card" id="timings" aria-labelledby="timings-h"><h2 id="timings-h">Kolkata Fatafat timings</h2>');
  parts.push(scheduleTable(core.SCHEDULE.weekday, 'Monday to Saturday', { startN: 1, id: 'kolkata-ff-bazi-timings' }));
  parts.push(
    `<p class="muted">Sunday has 4 rounds at ${core.SCHEDULE.sunday.map(esc).join(', ')} IST. ` +
    `See the full <a href="/timings/">Kolkata Fatafat timings</a> page. ` +
    `Times are indicative and subject to change.</p>`
  );
  parts.push('</section>');

  // (7) Bengali summary. Heading-less region → aria-label (in the page language).
  parts.push(
    `<section class="card" aria-label="Kolkata Fatafat summary in Bengali"><p class="lang-bn" lang="bn">${esc(content.BENGALI_SUMMARY)}</p></section>`
  );

  // (8) FAQ — FAQ_CORE only; the fuller FAQ_CORE+FAQ_MORE set (with its own
  // FAQPage schema) lives on /faq/.
  parts.push('<section class="card" id="faq" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>');
  parts.push(faqHtml(content.FAQ_CORE));
  parts.push(
    `<p class="muted">More on the <a href="/faq/">Kolkata Fatafat FAQ</a> and ` +
    `<a href="/how-to-play/">How Kolkata Fatafat works</a>.</p>`
  );
  parts.push('</section>');

  const graph = homepageGraph(pm, title, description);
  const html = layout({ title, description, route: '/', graph, body: parts.join('\n') });
  writeFile('/', html, { mtime: pm.mtime });
}

// Contiguous available-date ranges (ascending array of YYYY-MM-DD -> array of
// [startDate, endDate] pairs). Used by the date-jump script's client-side
// "nearest earlier available date" fallback — a tiny, build-time-computed
// table instead of listing all individual dates.
function computeRanges(datesAsc) {
  if (!datesAsc.length) return [];
  const ranges = [];
  let start = datesAsc[0];
  let prev = datesAsc[0];
  for (let i = 1; i < datesAsc.length; i++) {
    const d = datesAsc[i];
    if (shiftDate(prev, 1) === d) {
      prev = d;
      continue;
    }
    ranges.push([start, prev]);
    start = d;
    prev = d;
  }
  ranges.push([start, prev]);
  return ranges;
}

// Date-jump nav: a native input[type=date] + button (no <form> — see the
// site-wide "no forms" rule) that navigates to the right month page + day
// anchor. No-JS users get the always-visible month-links row below it, which
// is real primary navigation on its own, not merely a fallback.
function dateJumpHtml(ranges, monthUrlMap, minDate, maxDate) {
  const rangesJs = '[' + ranges.map((r) => `["${r[0]}","${r[1]}"]`).join(',') + ']';
  const monthUrlsJs = '{' + Object.keys(monthUrlMap).map((mk) => `"${mk}":"${monthUrlMap[mk]}"`).join(',') + '}';
  const js =
    `(function(){var R=${rangesJs},M=${monthUrlsJs};` +
    `var i=document.getElementById('dj-input'),b=document.getElementById('dj-go');if(!i||!b)return;` +
    `b.onclick=function(){var d=i.value;if(!d)return;var best=null,k;` +
    `for(k=0;k<R.length;k++){if(d>=R[k][0]&&d<=R[k][1]){best=d;break}` +
    `if(d>R[k][1]&&(!best||R[k][1]>best))best=R[k][1]}` +
    `if(!best)best=R[0][0];var mk=best.slice(0,7),url=M[mk]||'/old-results/',p=best.split('-');` +
    `location.href=url+'#d-'+p[2]+'-'+p[1]+'-'+p[0];};})();`;
  return (
    '<nav class="date-jump" aria-label="Jump to a date">' +
    `<label for="dj-input">Jump to date</label>` +
    `<input type="date" id="dj-input" min="${escAttr(minDate)}" max="${escAttr(maxDate)}">` +
    '<button type="button" id="dj-go" aria-label="Go to selected date">Go</button>' +
    '</nav>' +
    `<script>${js}</script>`
  );
}

const OLD_RESULTS_CHUNK_SIZE = 10;

// Client-side pagination for a month's day-cards: ALL days are always in the
// HTML (no fetch, no new URLs, fully crawlable/no-JS-readable) grouped into
// chunks of 10. Inline JS hides every chunk but the first ON LOAD ONLY — never
// server-rendered as hidden — so a no-JS user sees every day and the Load More
// button (server-rendered with the `hidden` attribute) stays hidden. JS also
// reveals the chunk containing the URL's #d-DD-MM-YYYY anchor, on load and on
// hashchange, before scrolling — so external/date-jump/month links always work.
function paginatedDaysHtml(days) {
  const chunks = [];
  for (let i = 0; i < days.length; i += OLD_RESULTS_CHUNK_SIZE) {
    chunks.push(days.slice(i, i + OLD_RESULTS_CHUNK_SIZE));
  }
  const chunkHtml = chunks
    .map((chunk) => {
      const cards = chunk
        .map((d) => `<div class="card">${renderDayGrid(d, d.date, { id: `d-${urlDate(d.date)}` })}</div>`)
        .join('');
      return `<div class="day-chunk">${cards}</div>`;
    })
    .join('');

  if (chunks.length <= 1) return chunkHtml; // nothing to paginate; no script needed

  const js =
    "(function(){var C=[].slice.call(document.querySelectorAll('.day-chunk')),b=document.getElementById('load-more');" +
    'if(!C.length)return;var shown=1;' +
    'function upd(){for(var i=1;i<C.length;i++)C[i].hidden=i>=shown;if(b)b.hidden=shown>=C.length}' +
    'function reveal(n){shown=Math.max(shown,n);upd()}' +
    'upd();if(b)b.onclick=function(){reveal(shown+1)};' +
    'function fromHash(){var h=location.hash;if(!h)return;var el=document.querySelector(h);if(!el)return;' +
    'for(var i=0;i<C.length;i++)if(C[i].contains(el)){reveal(i+1);el.scrollIntoView();break}}' +
    "addEventListener('hashchange',fromHash);fromHash();})();";

  return (
    chunkHtml +
    '<p class="view-all"><button type="button" id="load-more" class="btn" hidden>Load More</button></p>' +
    `<script>${js}</script>`
  );
}

function renderOldResultsHub(ctx) {
  const desc = archivesDesc(ctx); // newest first
  // 2026-07-19: deliberately NOT "last 45 days" (a content pack assumed a
  // rolling 45 day window; the real archive is unlimited, paginated by month
  // back to the first frozen day — see content.OLD_RESULTS_INTRO). Title/H1
  // dropped the day-count claim for the same reason; flagged for the user.
  const description0 =
    'Kolkata Fatafat old results, newest first — full Patti and Single for every declared bazi. Date search, Sunday 4 bazi days and Game Off days marked.';

  if (!desc.length) {
    const route = '/old-results/';
    const title = 'Kolkata FF Old Results – Fatafat Old Result Chart';
    const body =
      '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <span>Old Results</span></nav>' +
      '<h1>Kolkata Fatafat Old Results</h1>' +
      `<p>${esc(content.OLD_RESULTS_INTRO)}</p>` +
      content.OLD_RESULTS_LINKS +
      '<p class="muted">No archived results yet.</p>';
    const extra = [{
      '@type': 'BreadcrumbList',
      '@id': SITE.baseUrl + route + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kolkata Fatafat result today', item: SITE.baseUrl + '/' },
        { '@type': 'ListItem', position: 2, name: 'Old Results', item: SITE.baseUrl + '/old-results/' },
      ],
    }];
    const graph = pageGraph(route, title, description0, extra);
    writeFile(route, layout({ title, description: description0, route, graph, body }), { mtime: ctx.buildInstant });
    return;
  }

  const asc = desc.slice().reverse(); // oldest first
  const ranges = computeRanges(asc.map((d) => d.date));
  const minDate = asc[0].date;
  const maxDate = ctx.today;

  // Group into months, preserving newest-first order (Map preserves insertion order).
  const byMonth = new Map();
  for (const d of desc) {
    const mk = core.monthKey(d.date);
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk).push(d);
  }
  const monthKeys = [...byMonth.keys()]; // newest month first
  const latestMonthKey = monthKeys[0];
  const monthRoute = (mk) => (mk === latestMonthKey ? '/old-results/' : `/old-results/${mk}/`);
  const monthUrlMap = {};
  for (const mk of monthKeys) monthUrlMap[mk] = monthRoute(mk);

  const monthLinksHtml = (currentMk) => {
    const items = monthKeys.map((mk) => {
      const label = core.monthLabel(mk);
      if (mk === currentMk) return `<span class="cur" aria-current="page">${esc(label)}</span>`;
      return `<a href="${monthRoute(mk)}#month-${mk}">${esc(label)}</a>`;
    });
    return `<nav class="month-links" aria-label="Browse by month">${items.join('')}</nav>`;
  };

  for (const mk of monthKeys) {
    const route = monthRoute(mk);
    const isLatest = mk === latestMonthKey;
    const label = core.monthLabel(mk);
    const title = isLatest
      ? 'Kolkata FF Old Results – Fatafat Old Result Chart'
      : `Kolkata Fatafat Results — ${label} | Kolkata FF Archive`;
    const description = isLatest
      ? description0
      : `Kolkata Fatafat results for ${label}: full Patti and Single for every declared round, day by day.`;

    const parts = [];
    const crumbTail = isLatest
      ? '<span>Old Results</span>'
      : `<a href="/old-results/">Old Results</a> &rsaquo; <span>${esc(label)}</span>`;
    parts.push(`<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; ${crumbTail}</nav>`);
    parts.push(`<h1 id="month-${mk}">Kolkata Fatafat Old Results${isLatest ? '' : ' &ndash; ' + esc(label)}</h1>`);
    parts.push(`<p>${esc(content.OLD_RESULTS_INTRO)}</p>`);
    parts.push(content.OLD_RESULTS_LINKS);
    parts.push(dateJumpHtml(ranges, monthUrlMap, minDate, maxDate));
    parts.push(monthLinksHtml(mk));

    // The day-cards list is a content block named by the page's own <h1>.
    parts.push(`<section aria-labelledby="month-${mk}">`);
    parts.push(paginatedDaysHtml(byMonth.get(mk)));
    parts.push('</section>');

    // Visible-only FAQ (2026-07-19 content pass) — no FAQPage schema here;
    // only the homepage and /faq/ carry that.
    parts.push('<section class="card" aria-labelledby="old-results-faq-h"><h2 id="old-results-faq-h">Frequently asked questions</h2>');
    parts.push(faqHtml(content.OLD_RESULTS_FAQ));
    parts.push('</section>');

    const breadcrumbItems = isLatest
      ? [
          { '@type': 'ListItem', position: 1, name: 'Kolkata Fatafat result today', item: SITE.baseUrl + '/' },
          { '@type': 'ListItem', position: 2, name: 'Old Results', item: SITE.baseUrl + '/old-results/' },
        ]
      : [
          { '@type': 'ListItem', position: 1, name: 'Kolkata Fatafat result today', item: SITE.baseUrl + '/' },
          { '@type': 'ListItem', position: 2, name: 'Old Results', item: SITE.baseUrl + '/old-results/' },
          { '@type': 'ListItem', position: 3, name: label, item: SITE.baseUrl + route },
        ];
    const extra = [{ '@type': 'BreadcrumbList', '@id': SITE.baseUrl + route + '#breadcrumb', itemListElement: breadcrumbItems }];
    const graph = pageGraph(route, title, description, extra, {
      breadcrumb: { '@id': SITE.baseUrl + route + '#breadcrumb' },
    });
    const html = layout({ title, description, route, graph, body: parts.join('\n') });
    writeFile(route, html, { mtime: ctx.buildInstant });
  }
}

function renderFaqPage(ctx) {
  const route = '/faq/';
  const title = 'Kolkata FF FAQ – Kolkata Fatafat Questions Answered';
  const description =
    'Answers on Kolkata FF: result timings IST, Sunday schedule, Patti to Single rule, ' +
    'old result charts, verification method, and why this site publishes results only.';
  // The master FAQ set: FAQ_CORE (also on the homepage) plus FAQ_MORE (only
  // here). This page's FAQPage schema covers all of it, matching what's visible.
  const faqList = content.FAQ_CORE.concat(content.FAQ_MORE);
  const body =
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <span>FAQ</span></nav>' +
    '<h1 id="faq-page-h">Kolkata FF &ndash; Frequently Asked Questions</h1>' +
    '<section aria-labelledby="faq-page-h">' +
    faqHtml(faqList) +
    '<p class="muted">See also <a href="/how-to-play/">How Kolkata Fatafat works</a> and ' +
    '<a href="/patti-chart/">Kolkata Fatafat patti chart</a>.</p>' +
    '</section>';
  // BreadcrumbList mirrors the visible breadcrumb (Home › FAQ) — the archive
  // pages already pair theirs; /faq/ was the one breadcrumbed page without it.
  const faqExtra = [
    faqNode(SITE.baseUrl + route + '#faq', faqList),
    {
      '@type': 'BreadcrumbList',
      '@id': SITE.baseUrl + route + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kolkata Fatafat result today', item: SITE.baseUrl + '/' },
        { '@type': 'ListItem', position: 2, name: 'FAQ', item: SITE.baseUrl + route },
      ],
    },
  ];
  const graph = pageGraph(route, title, description, faqExtra, {
    mainEntity: { '@id': SITE.baseUrl + route + '#faq' },
    breadcrumb: { '@id': SITE.baseUrl + route + '#breadcrumb' },
  });
  writeFile(route, layout({ title, description, route, graph, body }), { mtime: ctx.buildInstant });
}

// Content pages backed by lib/content.PAGES; chart + timings get computed tables.
function renderContentPage(slug, ctx) {
  const route = `/${slug}/`;
  const page = content.PAGES[slug];
  if (!page) throw new Error(`content.PAGES missing "${slug}"`);
  // Breadcrumb on every content page (the homepage is the root — a breadcrumb
  // there would be a self-referential trail, so it deliberately has none).
  const crumb = breadcrumb(route, [{ name: page.h1, href: route }]);
  // h1 gets a stable id="page-title"; each content page's outer <section> (in
  // lib/content.js) is aria-labelledby="page-title", naming that region by the
  // page's own title. Appended computed-table sections get their own h2 id.
  let body = `${crumb.html}\n<h1 id="page-title">${esc(page.h1)}</h1>\n${page.bodyHtml}`;

  if (slug === 'patti-chart') {
    // The full 220-Patti table FIRST (it is what the title/description/prose
    // promise), then the worked derivation examples.
    body +=
      '\n<section class="card" aria-labelledby="patti-220-h"><h2 id="patti-220-h">The 220 Patti grouped by Single</h2>' +
      patti220Table() + '</section>' +
      '\n<section class="card" aria-labelledby="patti-ref-h"><h2 id="patti-ref-h">Patti to Single: worked examples</h2>' +
      chartDerivationTable() + '</section>';
  }
  if (slug === 'about') {
    // Brand banner — placed well below the fold (after all About prose), so it
    // never competes with the centerpiece rule on any other page. Explicit
    // width/height => zero CLS; loading="lazy" since it's off-screen at load.
    body +=
      '\n<figure class="brand-figure"><img src="/banner.jpg" width="1200" height="400" loading="lazy" ' +
      'alt="Kolkata FF logo and the Kolkata Fatafat Result Today wordmark on a dark banner"></figure>';
  }
  if (slug === 'timings') {
    body +=
      '\n<section class="card" aria-labelledby="timings-sched-h"><h2 id="timings-sched-h">Bazi declaration schedule</h2>' +
      scheduleTable(core.SCHEDULE.weekday, 'Monday to Saturday', { startN: 1, id: 'kolkata-ff-bazi-timings' }) +
      scheduleTable(core.SCHEDULE.sunday, 'Sunday', { startN: 1 }) +
      '<p class="muted">Times are indicative seed values and subject to change; ' +
      'verify against official declarations.</p>' +
      '</section>';
  }

  // Per-page FAQ (2026-07-19 content pass): visible only, deliberately NO
  // FAQPage JSON-LD here — schema on every page is a spam pattern. Only the
  // homepage and /faq/ carry FAQPage structured data.
  if (page.faq) {
    body +=
      '\n<section class="card" aria-labelledby="faq-h"><h2 id="faq-h">Frequently asked questions</h2>' +
      faqHtml(page.faq) +
      '</section>';
  }

  const graph = pageGraph(route, page.title, page.description, [crumb.node], { breadcrumb: crumb.ref });
  const html = layout({ title: page.title, description: page.description, route, graph, body });
  writeFile(route, html, { mtime: ctx.buildInstant });
}

function render404(ctx) {
  const title = 'Page not found | Kolkata FF';
  const description = 'The page you requested was not found on kolkataff.mobi.';
  const body =
    '<h1>Page not found</h1>' +
    '<p>Sorry, that page does not exist. Try the <a href="/">Kolkata Fatafat result today</a> ' +
    'or browse <a href="/old-results/">Kolkata Fatafat old results</a>.</p>';
  const graph = pageGraph('/404.html', title, description);
  // 404 is excluded from sitemap.xml and marked noindex; still emit valid JSON-LD.
  writeFile('/404', layout({ title, description, route: '/404.html', graph, body, robots: 'noindex' }), {
    mtime: ctx.buildInstant,
    isPublicHtml: true,
  });
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------
function archivesDesc(ctx) {
  return ctx.archives.slice().sort((a, b) => (a.date > b.date ? -1 : 1)); // newest first
}

// Manually maintained "last content edit" date per static page (route ->
// YYYY-MM-DD). Bump the date HERE when you actually edit that page's title,
// description, H1, or body copy — sitemap <lastmod> for these pages must
// NEVER be derived from build time, so a rebuild with no content change
// produces the exact same lastmod every time (checked post-build).
const CONTENT_LASTMOD = {
  '/patti-chart/': '2026-07-19',
  '/timings/': '2026-07-19',
  '/how-to-play/': '2026-07-19',
  '/faq/': '2026-07-19',
  '/about/': '2026-07-19',
  '/contact/': '2026-07-19',
  '/disclaimer/': '2026-07-19',
  '/terms/': '2026-07-19',
  '/privacy/': '2026-07-19',
  '/cookies/': '2026-07-19',
};

// /old-results/'s lastmod is the latest declaredAt among all frozen (archived)
// days — purely data-derived, never build time, so a rebuild with no new or
// edited result produces the same lastmod every time. Falls back to pm.iso
// only in the empty-archive edge case (no day has ever been frozen yet).
function lastArchiveChange(ctx) {
  let best = null;
  for (const d of ctx.archives) {
    for (const b of (d.bazis || [])) {
      if (b.declaredAt && (!best || Date.parse(b.declaredAt) > Date.parse(best))) best = b.declaredAt;
    }
  }
  return best;
}

function buildSitemap(ctx) {
  const { pm } = ctx;
  const urls = [];
  const add = (loc, lastmod) => urls.push({ loc, lastmod });

  // Homepage — lastmod MUST equal the homepage JSON-LD dateModified (pm.iso).
  add(SITE.baseUrl + '/', pm.iso);

  // Old-results — lastmod tracks the archive DATA, not the build instant.
  add(SITE.baseUrl + '/old-results/', lastArchiveChange(ctx) || pm.iso);

  // Other static/info/legal pages — the manually tracked content-edit date.
  // Month-archive pages (/old-results/YYYY-MM/) are deliberately NOT listed:
  // the sitemap is exactly the fixed canonical page set, nothing dynamic —
  // those pages still exist and are still crawlable via the month-links nav
  // on every old-results page, just not sitemap-listed.
  for (const [route, date] of Object.entries(CONTENT_LASTMOD)) {
    add(SITE.baseUrl + route, `${date}T00:00:00+05:30`);
  }

  const body = urls
    .map((u) => `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${esc(u.lastmod)}</lastmod>\n  </url>`)
    .join('\n');
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>\n';

  const file = path.join(DIST, 'sitemap.xml');
  fs.writeFileSync(file, xml, 'utf8');
  return { file, xml };
}

// ---------------------------------------------------------------------------
// dist/_redirects (Cloudflare Pages format) — generated from REDIRECT_MAP.
// ---------------------------------------------------------------------------
function buildRedirects() {
  const lines = [
    '# Legacy 301 redirects (Cloudflare Pages _redirects format).',
    '# Generated from REDIRECT_MAP in build.js — do not hand-edit.',
  ];
  for (const g of REDIRECT_MAP) {
    for (const from of g.from) lines.push(`${from} ${g.to} 301`);
  }
  const txt = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(DIST, '_redirects'), txt, 'utf8');
  return txt;
}

// ---------------------------------------------------------------------------
// Static passthrough (favicon.svg, robots.txt, _headers) from /public
// ---------------------------------------------------------------------------
function copyPublic(ctx) {
  if (!fs.existsSync(PUBLIC)) return;
  for (const name of fs.readdirSync(PUBLIC)) {
    const src = path.join(PUBLIC, name);
    const dest = path.join(DIST, name);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      fs.utimesSync(dest, ctx.buildInstant, ctx.buildInstant);
    }
  }
}

// ---------------------------------------------------------------------------
// Post-build assertions — the build FAILS (throws) if any of these break.
// ---------------------------------------------------------------------------
function assert(cond, msg) {
  if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
}

// Recursively list every file under a directory.
function walkFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

// Banned content-policy terms. Word-bounded so ordinary words that merely
// CONTAIN these letters (e.g. "multiple" contains "tip") never match.
const POLICY_BANNED = [
  /\btips?\b/i,          // tip, tips
  /\bpredict\w*/i,       // predict, prediction(s), predicting, ...
  /\blucky\b/i,
  /ghosh\s+babu/i,
  /\bsure\s+number\b/i,
  /\btarget\s+number\b/i,
];

// The ONLY sentences permitted to contain a banned word — each one states that
// the site does NOT provide tips/predictions. Matched as EXACT literal strings
// (no pattern loosening). If page copy changes, update this list in lockstep.
const POLICY_ALLOW = [
  'This page does not predict or state any upcoming number.',
  'This chart does not predict, suggest, or recommend any numbers.',
  'We do not provide tips, predictions, or suggested numbers of any kind.',
  'This site does not provide tips, predictions, or advice about the game.',
  'Explanatory only, not a prediction.',
  'Informational only, with no tips or betting.',
  // 2026-07-19 content pass. This core phrase (deliberately without the
  // trailing "— results..." clause) is used both mid-sentence and inside a
  // parenthetical aside on the Contact page, with different terminal
  // punctuation each time — matching just the phrase itself, punctuation
  // agnostic, is more robust than enumerating every trailing-punctuation variant.
  'kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind',
  'Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.',
  'Does kolkataff.mobi give tips or lucky numbers?',
  'No. Draws are independent random events; no method, pattern, or paid service can predict them.',
  'Results published for information only — no tips, no predictions, 18+ audience.',
];

// http:// URIs that are XML/SVG namespace identifiers (never fetched by a
// browser) — the only http:// permitted in the output.
const HTTP_NS_ALLOW = ['http://www.w3.org/', 'http://www.sitemaps.org/'];

// Binary asset extensions — excluded from the text/UTF-8/URL scan.
const BINARY_EXT = new Set(['.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2']);

function runAssertions(ctx) {
  const results = [];

  // (A) FOUR-WAY SYNC: homepage dateModified == sitemap homepage lastmod.
  const homeHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const dmMatch = homeHtml.match(/"dateModified":\s*"([^"]+)"/);
  assert(dmMatch, 'homepage JSON-LD has no dateModified');
  const homeDateModified = dmMatch[1];

  const sitemapXml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const homeUrlBlock = sitemapXml.match(
    new RegExp('<url>\\s*<loc>' + escRe(SITE.baseUrl + '/') + '</loc>\\s*<lastmod>([^<]+)</lastmod>')
  );
  assert(homeUrlBlock, 'sitemap has no homepage <url> entry with lastmod');
  const homeLastmod = homeUrlBlock[1];

  assert(
    homeDateModified === homeLastmod,
    `sync mismatch: homepage dateModified "${homeDateModified}" != sitemap lastmod "${homeLastmod}"`
  );
  assert(
    homeDateModified === ctx.pm.iso,
    `sync mismatch: emitted dateModified "${homeDateModified}" != canonical pm.iso "${ctx.pm.iso}"`
  );

  // File mtime of index.html must reflect the same instant (to the second).
  const homeMtime = fs.statSync(path.join(DIST, 'index.html')).mtime;
  assert(
    Math.abs(homeMtime.getTime() - ctx.pm.mtime.getTime()) < 1000,
    `sync mismatch: index.html mtime ${istIso(homeMtime)} != pm ${istIso(ctx.pm.mtime)}`
  );
  results.push(`[sync] dateModified == sitemap lastmod == pm.iso == ${homeDateModified}; mtime aligned`);

  // (B) JSON-LD parse: every ld+json block in every emitted HTML file.
  let blocks = 0;
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(html))) {
      blocks++;
      try {
        JSON.parse(m[1]);
      } catch (err) {
        throw new Error(`ASSERTION FAILED: invalid JSON-LD in ${e.route}: ${err.message}`);
      }
    }
  }
  results.push(`[json-ld] parsed ${blocks} JSON-LD block(s) across ${emitted.length} page(s) — all valid`);

  // (C) JS DISCIPLINE: no external/third-party JS EXCEPT the one documented
  // GA4 gtag.js loader (exact URL match only — any other external script still
  // fails the build); first-party inline JS only, <=2KB per page, no
  // fetch/XHR/network. JSON-LD data blocks are exempt.
  let maxInline = 0;
  let analyticsScriptSeen = 0;
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m, inlineBytes = 0;
    while ((m = re.exec(html))) {
      const attrs = m[1], jsBody = m[2];
      if (/type="application\/ld\+json"/.test(attrs)) continue; // structured-data block
      const srcMatch = /\bsrc="([^"]*)"/.exec(attrs);
      if (srcMatch) {
        assert(srcMatch[1] === ANALYTICS_SCRIPT_SRC,
          `external <script src> found in ${e.route} — third-party JS is forbidden except the documented GA4 analytics exception (got "${srcMatch[1]}")`);
        assert(/\basync\b/.test(attrs), `analytics <script src> in ${e.route} must be async (per the documented snippet)`);
        analyticsScriptSeen++;
        continue; // no inline body to scan/budget on the loader tag itself
      }
      assert(
        !/\btype\s*=/.test(attrs) || /type="(text\/javascript|module|application\/javascript)"/.test(attrs),
        `unexpected <script type> in ${e.route}: ${attrs.trim()}`
      );
      assert(
        !/\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\b/.test(jsBody) && !/\bimport\s*\(/.test(jsBody),
        `inline script in ${e.route} must not use fetch/XHR/network calls`
      );
      inlineBytes += Buffer.byteLength(jsBody, 'utf8');
    }
    assert(inlineBytes <= 2048, `${e.route} inline JS ${inlineBytes} B exceeds 2KB per-page budget`);
    if (inlineBytes > maxInline) maxInline = inlineBytes;
  }
  assert(analyticsScriptSeen === emitted.length,
    `GA4 analytics script must be present on every emitted page (found on ${analyticsScriptSeen}/${emitted.length}) — "every page should be trackable"`);
  results.push(`[js] no external <script src> except the documented GA4 loader (present on all ${analyticsScriptSeen} pages); inline first-party JS <= 2KB/page (max seen ${maxInline} B), no fetch/XHR`);

  // (D) Performance budget. Homepage ceiling raised 60KB -> 100KB to fit the
  // Last 30 Days archive section (per competitor-consensus UX); CSS budget
  // is unchanged (that section reuses the existing .daygrid/.card styles).
  const homeBytes = Buffer.byteLength(homeHtml, 'utf8');
  assert(homeBytes <= 100 * 1024, `homepage ${homeBytes} bytes exceeds 100KB budget`);
  const cssBytes = Buffer.byteLength(CSS_SHIPPED, 'utf8'); // budget = shipped bytes, not source
  assert(cssBytes <= 10 * 1024, `inline CSS ${cssBytes} bytes exceeds 10KB budget`);
  results.push(
    `[budget] homepage ${homeBytes} B (<= 102400), inline CSS ${cssBytes} B (<= 10240)`
  );

  // (E) Sanity: homepage has canonical, viewport, one ad slot, definitional para.
  assert(/<link rel="canonical"/.test(homeHtml), 'homepage missing canonical');
  assert(/name="viewport"/.test(homeHtml), 'homepage missing viewport');
  assert((homeHtml.match(/class="ad-slot"/g) || []).length === 1, 'homepage must have exactly one ad slot');
  assert(homeHtml.includes(esc(content.DEFINITIONAL_PARA.slice(0, 40))), 'homepage missing definitional paragraph');
  results.push('[sanity] canonical, viewport, single ad-slot, definitional paragraph present');

  // (F) CANONICAL DOMAIN integrity — one origin, canonical == sitemap 1:1.
  const allDistFiles = walkFiles(DIST);
  // F1: every sitemap <loc> is under the single canonical origin.
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(locs.length > 0, 'sitemap has no <loc> entries');
  for (const loc of locs) {
    assert(loc === SITE_ORIGIN + '/' || loc.startsWith(SITE_ORIGIN + '/'),
      `sitemap loc not under SITE_ORIGIN (${SITE_ORIGIN}): ${loc}`);
  }
  // F2: each FIXED canonical page has exactly one canonical == its sitemap
  // loc, 1:1. Every emitted page must still have exactly one canonical tag,
  // but two categories are excluded from the 1:1 SITEMAP match specifically:
  //   - /404 (noindex, not indexable)
  //   - /old-results/YYYY-MM/ month-archive pages (still real, canonical,
  //     crawlable pages — reachable via the month-links nav on every
  //     old-results page — but the sitemap is exactly the fixed canonical
  //     page set, nothing dynamic; see buildSitemap)
  const isMonthArchive = (route) => /^\/old-results\/\d{4}-\d{2}\/$/.test(route);
  const canonicals = [];
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    const cs = html.match(/<link rel="canonical" href="[^"]+">/g) || [];
    assert(cs.length === 1, `${e.route} must have exactly one canonical (found ${cs.length})`);
    if (e.route === '/404' || isMonthArchive(e.route)) continue;
    canonicals.push(/href="([^"]+)"/.exec(cs[0])[1]);
  }
  const locSet = new Set(locs);
  const canSet = new Set(canonicals);
  assert(locs.length === locSet.size, 'duplicate <loc> in sitemap.xml');
  assert(canonicals.length === canSet.size, 'duplicate canonical across pages');
  assert(
    locSet.size === canSet.size &&
      [...canSet].every((c) => locSet.has(c)) &&
      [...locSet].every((l) => canSet.has(l)),
    `canonical/sitemap not 1:1 (canonicals=${canonicals.length}, locs=${locs.length})`
  );
  // F3: no localhost, no www. of our domain, no insecure/foreign http:// (XML/SVG
  // namespaces excepted); every file valid UTF-8 with no U+FFFD (mojibake canary).
  for (const f of allDistFiles) {
    const rel = path.relative(DIST, f);
    if (BINARY_EXT.has(path.extname(f).toLowerCase())) continue; // binary asset: skip text scan
    let txt;
    try {
      txt = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(f));
    } catch (err) {
      throw new Error(`ASSERTION FAILED: invalid UTF-8 in dist/${rel}`);
    }
    assert(!txt.includes(String.fromCharCode(0xfffd)), `U+FFFD replacement char (mojibake) in dist/${rel}`);
    assert(!/localhost/i.test(txt), `"localhost" leaked into dist/${rel}`);
    assert(!/www\.kolkataff\.mobi/i.test(txt), `www. host of our own domain in dist/${rel}`);
    for (const m of txt.matchAll(/http:\/\/[^\s"'<>)]+/gi)) {
      assert(HTTP_NS_ALLOW.some((p) => m[0].startsWith(p)),
        `insecure/foreign http:// URL in dist/${rel}: ${m[0]}`);
    }
  }
  results.push(
    `[canonical] ${canonicals.length} canonicals == ${locs.length} sitemap locs (1:1), all under ${SITE_ORIGIN}; ` +
    `no localhost/http/www leaks; all UTF-8, no U+FFFD`
  );

  // (G) CONTENT POLICY — no tips/predictions outside the exact allowlist.
  let scanned = 0;
  for (const e of emitted) {
    let txt = fs.readFileSync(e.file, 'utf8');
    scanned++;
    for (const phrase of POLICY_ALLOW) txt = txt.split(phrase).join(' ');
    for (const re of POLICY_BANNED) {
      const m = re.exec(txt);
      if (m) {
        const at = Math.max(0, m.index - 40);
        throw new Error(
          `ASSERTION FAILED: content policy — banned term "${m[0]}" in ${e.route}: ` +
          `"...${txt.slice(at, m.index + m[0].length + 40).replace(/\s+/g, ' ').trim()}..."`
        );
      }
    }
  }
  results.push(
    `[content-policy] scanned ${scanned} pages — no tips/predict/lucky/ghosh-babu/sure-number/target-number outside the disclaimer allowlist`
  );

  // (H) AD SLOT — fixed 250px height in CSS, at most one slot per page.
  assert(/\.ad-slot\{[^}]*height:\s*250px/.test(CSS), 'ad-slot missing fixed 250px height in inline CSS');
  for (const e of emitted) {
    const cnt = (fs.readFileSync(e.file, 'utf8').match(/class="ad-slot"/g) || []).length;
    assert(cnt <= 1, `${e.route} has ${cnt} ad slots (max 1)`);
  }
  results.push('[ad-slot] fixed 250px height in CSS; <= 1 slot per page');

  // (I) HTML LANG sanity.
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    assert(/<html lang="en">/.test(html), `${e.route} missing <html lang="en">`);
  }
  assert(/lang="bn"/.test(homeHtml), 'homepage missing any lang="bn" attribute');
  results.push('[lang] every page <html lang="en">; homepage has lang="bn" (UTF-8 verified in [canonical])');

  // (J) LEGACY REDIRECTS — targets exist, no chains, none point to dead paths.
  const redirTxt = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8');
  const rules = redirTxt
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => { const p = l.split(/\s+/); return { from: p[0], to: p[1], code: p[2] }; });
  assert(rules.length > 0, '_redirects has no rules');
  const routeSet = new Set(emitted.map((e) => e.route)); // '/', '/patti-chart/', '/result/…/', …
  const deadSet = new Set(DELIBERATELY_DEAD);
  const targets = new Set(rules.map((r) => r.to));
  const sources = rules.map((r) => r.from);
  assert(sources.length === new Set(sources).size, 'duplicate source path in _redirects');
  for (const r of rules) {
    assert(r.code === '301', `redirect for ${r.from} is not a 301 (got ${r.code})`);
    assert(routeSet.has(r.to), `redirect target does not exist in build: ${r.from} -> ${r.to}`);
    assert(!deadSet.has(r.to), `redirect target points to a DELIBERATELY_DEAD path: ${r.to}`);
    assert(!deadSet.has(r.from), `DELIBERATELY_DEAD path is being redirected (must 404): ${r.from}`);
  }
  // No chains: no redirect target is itself a redirect source.
  for (const t of targets) {
    assert(!sources.includes(t), `redirect chain: target ${t} is also a redirect source`);
  }
  results.push(
    `[redirects] ${rules.length} legacy 301s -> ${targets.size} existing targets; no chains; ` +
    `none point to deliberately-dead paths`
  );

  // (K) VISIBLE DATE AGREEMENT — H1 date == <title> date == the single `today`.
  // Title and H1 both use the "(D Month YYYY)" form (2026-07-19: title moved
  // off dotDate to match H1 exactly, so this regenerates daily in lockstep).
  const tM = homeHtml.match(/<title>[^<]*?\((\d{1,2}) ([A-Za-z]+) (\d{4})\)[^<]*<\/title>/);
  assert(tM, 'homepage <title> has no "(D Month YYYY)" date');
  const tMonthIdx = core.MONTHS.indexOf(tM[2]);
  assert(tMonthIdx >= 0, `title month not recognised: ${tM[2]}`);
  const titleDate = `${tM[3]}-${String(tMonthIdx + 1).padStart(2, '0')}-${String(tM[1]).padStart(2, '0')}`;
  const hM = homeHtml.match(/<h1>[^<]*\((\d{1,2}) ([A-Za-z]+) (\d{4})\)<\/h1>/);
  assert(hM, 'homepage <h1> has no "(D Month YYYY)" date');
  const mIdx = core.MONTHS.indexOf(hM[2]);
  assert(mIdx >= 0, `H1 month not recognised: ${hM[2]}`);
  const h1Date = `${hM[3]}-${String(mIdx + 1).padStart(2, '0')}-${String(hM[1]).padStart(2, '0')}`;
  assert(titleDate === h1Date, `visible-date mismatch: H1 (${h1Date}) != title (${titleDate})`);
  assert(titleDate === ctx.today, `visible date (${titleDate}) != build today (${ctx.today})`);
  results.push(`[h1-date] H1 date == title date == today (${ctx.today})`);

  // (L) HERMETIC OUTPUT — no orphaned files can survive a build. dist/ is wiped
  // at build start, so this is normally trivially true; the assertion makes any
  // future regression (a stray write, a stale page, a rogue generator) fail loud.
  const emittedRoutes = new Set(emitted.map((e) => e.route));
  for (const r of PAGE_INVENTORY) {
    assert(emittedRoutes.has(r), `PAGE_INVENTORY page missing from build output: ${r}`);
  }
  const classify = (route) => {
    if (PAGE_INVENTORY.includes(route)) return 'fixed';
    if (/^\/old-results\/\d{4}-\d{2}\/$/.test(route)) return 'month-archive';
    return null;
  };
  for (const e of emitted) {
    assert(classify(e.route), `emitted page not in canonical inventory (orphan generator?): ${e.route}`);
  }
  // Every .html physically present in dist/ must have been produced by THIS build.
  const distHtml = walkFiles(DIST).filter((f) => f.toLowerCase().endsWith('.html'));
  const emittedFileSet = new Set(emitted.map((e) => e.file));
  for (const f of distHtml) {
    assert(emittedFileSet.has(f), `orphaned .html in dist/ not produced by this build: ${path.relative(DIST, f)}`);
  }
  assert(distHtml.length === emitted.length, `dist/ has ${distHtml.length} .html files but the build emitted ${emitted.length}`);
  // Per-day archive pages were removed — dist/result/ must not exist at all.
  assert(!fs.existsSync(path.join(DIST, 'result')), 'dist/result/ must not exist (per-day archive pages removed; the archive is inline on /old-results/)');
  results.push(
    `[hermetic] ${distHtml.length} .html == ${emitted.length} emitted (fixed ${PAGE_INVENTORY.length}); no /result/ pages; no orphaned output`
  );

  // (M) SOURCE ORDER = VISUAL ORDER — no CSS technique may render content in a
  // different order than it appears in the DOM. The one narrow, documented
  // exception is the sr-only ".visually-hidden" utility, which removes an
  // element from the VISUAL layout without moving anything else — that is not
  // a reordering technique, so it is stripped out before this scan runs.
  const cssNoSrOnly = CSS.replace(/\.visually-hidden\{[^}]*\}/, '');
  assert(!/\border\s*:/i.test(cssNoSrOnly), 'CSS contains an "order:" declaration — source order must equal visual order');
  assert(!/flex-direction\s*:\s*(row|column)-reverse/i.test(cssNoSrOnly), 'CSS reverses flex-direction — source order must equal visual order');
  assert(!/position\s*:\s*absolute/i.test(cssNoSrOnly), 'CSS uses position:absolute outside the documented sr-only exception — source order must equal visual order');
  results.push('[source-order] no order/flex-reverse/absolute-repositioning in CSS outside the documented sr-only exception');

  // (N) TEMPLATE CONSISTENCY — header/footer fragments are byte-identical
  // (proven via checksum) across every single emitted page.
  const headerHashes = new Map();
  const footerHashes = new Map();
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    const hm = html.match(/<header class="site-header">[\s\S]*?<\/header>/);
    const fm = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
    assert(hm, `${e.route} missing <header class="site-header">`);
    assert(fm, `${e.route} missing <footer class="site-footer">`);
    const hh = crypto.createHash('sha256').update(hm[0]).digest('hex');
    const fh = crypto.createHash('sha256').update(fm[0]).digest('hex');
    if (!headerHashes.has(hh)) headerHashes.set(hh, []);
    headerHashes.get(hh).push(e.route);
    if (!footerHashes.has(fh)) footerHashes.set(fh, []);
    footerHashes.get(fh).push(e.route);
  }
  assert(
    headerHashes.size === 1,
    headerHashes.size > 1
      ? `header fragment differs across pages (${headerHashes.size} distinct versions) — e.g. ${[...headerHashes.values()][1][0]}`
      : ''
  );
  assert(
    footerHashes.size === 1,
    footerHashes.size > 1
      ? `footer fragment differs across pages (${footerHashes.size} distinct versions) — e.g. ${[...footerHashes.values()][1][0]}`
      : ''
  );
  results.push(
    `[template] header checksum ${[...headerHashes.keys()][0].slice(0, 12)}… and footer checksum ` +
    `${[...footerHashes.keys()][0].slice(0, 12)}… byte-identical across all ${emitted.length} pages`
  );

  // (O) CENTERPIECE — the today-result table is the centerpiece component; the
  // ad slot (and everything else that trails it in the template) must never
  // sit above it, and must never sit above the page's own <h1>, on any page.
  // The homepage Last 30 Days section must also never precede it, in DOM or
  // (by construction, since layout has no reordering CSS) visually.
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    const rtIdx = html.indexOf('class="result-table"');
    if (rtIdx !== -1) {
      const h1Idx = html.indexOf('<h1');
      assert(h1Idx !== -1 && h1Idx < rtIdx, `${e.route}: today-result table appears before the page's own <h1>`);
      const last30Idx = html.indexOf('id="last-30-days-results"');
      if (last30Idx !== -1) {
        assert(last30Idx > rtIdx, `${e.route}: Last 30 Days section appears before the today-result table`);
      }
    }
    const adIdx = html.indexOf('class="ad-slot"');
    if (adIdx === -1) continue;
    const h1Idx = html.indexOf('<h1');
    assert(h1Idx !== -1 && adIdx > h1Idx, `${e.route}: ad slot appears before the page's own <h1>`);
    if (rtIdx !== -1) assert(adIdx > rtIdx, `${e.route}: ad slot appears before the today-result table`);
  }
  results.push('[centerpiece] ad slot and the Last 30 Days section never precede the today-result table or the page h1, on any page');

  // (P) OLD-RESULTS PERMANENT COMPONENTS — the date-jump nav and month-links
  // row are PROTECTED, permanent parts of every old-results page (fixed
  // canonical + every month-archive page). A future pass that accidentally
  // drops them fails the build instead of silently shipping a regression.
  const oldResultsRoutes = emitted.filter(
    (e) => e.route === '/old-results/' || /^\/old-results\/\d{4}-\d{2}\/$/.test(e.route)
  );
  assert(oldResultsRoutes.length > 0, 'no /old-results/ pages were emitted');
  for (const e of oldResultsRoutes) {
    const html = fs.readFileSync(e.file, 'utf8');
    assert(/class="date-jump"/.test(html), `${e.route}: missing the permanent date-jump nav (input[type=date] + Go)`);
    assert(/class="month-links"/.test(html), `${e.route}: missing the permanent month-links row`);
  }
  results.push(`[old-results-nav] date-jump + month-links present on all ${oldResultsRoutes.length} old-results pages`);

  // (Q) SEMANTIC MARKUP — every component's PURPOSE must be machine-readable
  // from the markup alone. Enforces: exactly one <main>/<h1> per page; every
  // <table> has a <caption>; every <section> is a NAMED region (aria-labelledby
  // pointing at a heading id, or aria-label for a heading-less block); and every
  // aria-labelledby reference resolves to an id that actually exists on the page.
  let sectionCount = 0, tableCount = 0;
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');

    const mains = (html.match(/<main[\s>]/g) || []).length;
    assert(mains === 1, `${e.route}: expected exactly one <main> (found ${mains})`);
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    assert(h1s === 1, `${e.route}: expected exactly one <h1> (found ${h1s})`);

    // Every <table> carries a <caption> naming it (no nested tables in output).
    for (const t of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)) {
      tableCount++;
      assert(/<caption[\s>]/.test(t[1]), `${e.route}: a <table> is missing a <caption>`);
    }

    // IDs are unique per page (duplicates break aria-labelledby, anchors, a11y).
    const idList = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const ids = new Set(idList);
    assert(ids.size === idList.length,
      `${e.route}: duplicate id(s) — ${idList.filter((v, i) => idList.indexOf(v) !== i).join(', ')}`);
    // Referential integrity: every aria-labelledby target id exists on the page.
    for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
      for (const ref of m[1].trim().split(/\s+/)) {
        assert(ids.has(ref), `${e.route}: aria-labelledby="${ref}" does not resolve to an existing id`);
      }
    }
    // Same check for the today-result table's two-axis headers="..." tokens
    // (renderResultTable) — a dangling reference here silently breaks the
    // row×column association for screen readers, same failure mode as above.
    for (const m of html.matchAll(/headers="([^"]+)"/g)) {
      for (const ref of m[1].trim().split(/\s+/)) {
        assert(ids.has(ref), `${e.route}: headers="${ref}" does not resolve to an existing id`);
      }
    }

    // Every <section> is a named region (aria-labelledby OR aria-label).
    for (const s of html.matchAll(/<section\b([^>]*)>/g)) {
      sectionCount++;
      assert(/\saria-labelledby="/.test(s[1]) || /\saria-label="/.test(s[1]),
        `${e.route}: a <section> is an unnamed region (needs aria-labelledby or aria-label)`);
    }
  }

  // Element-choice spot-checks on the homepage: a semantic element (not a bare
  // div) is used where one is correct — nav, table, status region, time.
  assert(/<nav class="nav" aria-label="Main menu">/.test(homeHtml),
    'homepage top nav must be <nav aria-label="Main menu">');
  assert(/<table id="kolkata-ff-result-today" class="result-table">/.test(homeHtml),
    'today result must be <table id="kolkata-ff-result-today">');
  assert(/id="next-result-countdown"/.test(homeHtml),
    'next-result strip must carry id="next-result-countdown"');
  // The live region must wrap ONLY the label+baseline (#nx-t), never the
  // per-second counter (#nx-c) — locks in the aria-live scoping fix so the
  // fast-mutating node can't drift back inside an atomic live region.
  const liveRegionMatch = /<span role="status" aria-live="polite">[\s\S]*?<span class="next-base" id="nx-t">[\s\S]*?<\/span>\s*<\/span>/.exec(homeHtml);
  assert(liveRegionMatch,
    'countdown live region (role=status aria-live=polite) must wrap the label + #nx-t baseline');
  assert(!/id="nx-c"/.test(liveRegionMatch[0]),
    'the per-second counter (#nx-c) must NOT be inside the aria-live region (would re-announce every second)');
  assert(/updated <time datetime="/.test(homeHtml),
    'homepage "updated" timestamp must be inside a <time datetime>');
  assert(/<div class="ad-slot"[^>]*aria-label="Advertisement"/.test(homeHtml),
    'ad slot must carry aria-label="Advertisement"');

  results.push(
    `[semantic] one <main>/<h1> per page; ${tableCount} tables all have <caption>; ` +
    `${sectionCount} sections all named; all aria-labelledby resolve; homepage landmark spot-checks pass`
  );

  // (R) COMPACT-TABLE DATE HEADER — each day's date is a styled, VISIBLE
  // <caption class="dg-date">, made sticky + viewport-centred in CSS, NEVER a
  // colspan <th> that scrolls away with the 8 columns. Locks in the date-header
  // centering fix and the CSS mechanism (container query + sticky) behind it.
  assert(/\.dg-scroll\{[^}]*container-type:\s*inline-size/.test(CSS),
    '.dg-scroll must establish an inline-size container query (for the sticky caption width)');
  assert(
    /\.dg-date\{[^}]*position:\s*sticky/.test(CSS) &&
      /\.dg-date\{[^}]*100cqw/.test(CSS) &&
      /\.dg-date\{[^}]*text-align:\s*center/.test(CSS),
    '.dg-date caption must be position:sticky, width:100cqw, text-align:center (viewport-centred date bar)'
  );
  let dgTables = 0;
  for (const e of emitted) {
    const html = fs.readFileSync(e.file, 'utf8');
    // The date header is never a <th> any more — it moved to the caption.
    assert(!/<th\b[^>]*class="[^"]*\bdg-date\b/.test(html),
      `${e.route}: day-grid date must be a <caption>, not a <th class="dg-date">`);
    // Every day-grid <table> has a VISIBLE <caption class="dg-date"> that still
    // carries the full "Kolkata Fatafat result {date}" accessible name. Match
    // by class TOKEN (not a positional literal) so an attribute reorder or an
    // extra class token can never silently zero this loop to a no-op — the
    // same reason (Q) above uses a token-agnostic <table\b[^>]*> form.
    for (const t of html.matchAll(/<table\b[^>]*\bclass="[^"]*\bdaygrid\b[^"]*"[^>]*>([\s\S]*?)<\/table>/g)) {
      dgTables++;
      assert(/<caption class="dg-date">/.test(t[1]),
        `${e.route}: a day-grid table lacks a visible <caption class="dg-date">`);
      assert(/Kolkata Fatafat result /.test(t[1]),
        `${e.route}: a day-grid caption is missing its "Kolkata Fatafat result {date}" accessible name`);
    }
  }
  assert(dgTables > 0, 'no day-grid tables found in the build output — (R) verified nothing');
  results.push(
    `[daygrid-date] ${dgTables} day-grid dates are visible sticky <caption class="dg-date"> (not scrolling th); CSS mechanism present`
  );

  // (S) ENTITY ALIAS FREQUENCY — the "also known as" sentence in
  // DEFINITIONAL_PARA must state each canonical alias exactly once: present
  // (the extension actually happened) and not duplicated/stuffed. Checked
  // against the SOURCE constant (not scanned HTML) because DEFINITIONAL_PARA
  // legitimately appears twice on the homepage (visible prose + JSON-LD
  // description) — a page-wide text scan would double-count by construction.
  for (const alias of content.ENTITY_ALIASES) {
    const count = countAliasOccurrences(content.DEFINITIONAL_PARA, alias);
    assert(count === 1,
      `entity alias "${alias}" appears ${count} time(s) in DEFINITIONAL_PARA (expected exactly 1)`);
  }
  results.push(
    `[alias-frequency] all ${content.ENTITY_ALIASES.length} entity aliases appear exactly once in the also-known-as sentence`
  );

  // (S2) 220-PATTI MEMBERSHIP — every declared patti in the data must be a
  // member of the canonical 220-Patti set (as rendered on /patti-chart/).
  // Catches both data-entry typos and any drift in the generator's convention.
  const patti220 = new Set(patti220BySingle().flat());
  let pattiChecked = 0;
  for (const d of ctx.archives.concat(ctx.todayDay ? [ctx.todayDay] : [])) {
    for (const b of (d.bazis || [])) {
      pattiChecked++;
      assert(patti220.has(b.patti),
        `${d.date} bazi ${b.n}: patti "${b.patti}" is not in the canonical 220-Patti set (data typo or generator drift)`);
    }
  }
  results.push(`[patti-220] all ${pattiChecked} declared pattis are members of the canonical 220-Patti set`);

  // (T) OLD-RECORDS REDIRECT — both the slash and no-slash legacy path must
  // 301 to /old-results/ (added after a GSC check found both forms inbound).
  for (const from of ['/old-records', '/old-records/']) {
    const rule = rules.find((r) => r.from === from);
    assert(rule, `_redirects is missing a rule for legacy path "${from}"`);
    assert(rule.to === '/old-results/', `"${from}" must redirect to /old-results/ (got "${rule.to}")`);
    assert(rule.code === '301', `"${from}" redirect must be a 301 (got "${rule.code}")`);
  }
  results.push('[old-records-redirect] both /old-records and /old-records/ 301 to /old-results/');

  // (U) SITEMAP + ROBOTS AUDIT — the sitemap is exactly the fixed canonical
  // page set (homepage + old-results + every CONTENT_LASTMOD page): no
  // month-archive pages, no anchors, no legacy/asset URLs, trailing-slash
  // form. lastmod is never build time for these routes — checked
  // structurally: CONTENT_LASTMOD pages carry a fixed date-only stamp, and
  // old-results carries a real declaredAt pulled from the archive data.
  const expectedSitemapCount = 2 + Object.keys(CONTENT_LASTMOD).length; // homepage + old-results + statics
  assert(
    locs.length === expectedSitemapCount,
    `sitemap has ${locs.length} <url> entries, expected exactly ${expectedSitemapCount} ` +
    `(the fixed canonical page set — /chart-2026/ is deliberately not among them; it does not exist yet)`
  );
  for (const loc of locs) {
    assert(!loc.includes('#'), `sitemap loc must not include an anchor: ${loc}`);
    assert(loc.endsWith('/'), `sitemap loc must be in trailing-slash form: ${loc}`);
  }
  // Every sitemap loc resolves to a real emitted page whose OWN canonical is
  // exactly that loc — the build-time equivalent of "returns 200 with itself
  // as canonical" for a static host (Cloudflare Pages serves any existing
  // file with 200; there is no live server to query during the build).
  const emittedByRoute = new Map(emitted.map((e) => [SITE.baseUrl + e.route, e]));
  for (const loc of locs) {
    const e = emittedByRoute.get(loc);
    assert(e, `sitemap loc does not resolve to an emitted page: ${loc}`);
    const html = fs.readFileSync(e.file, 'utf8');
    const canon = /<link rel="canonical" href="([^"]+)">/.exec(html);
    assert(canon && canon[1] === loc, `${loc}: page's own canonical (${canon && canon[1]}) does not match its sitemap loc`);
  }
  // lastmod stability.
  const urlBlocks = [...sitemapXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)];
  const lastmodByLoc = new Map(urlBlocks.map((m) => [m[1], m[2]]));
  for (const [route, date] of Object.entries(CONTENT_LASTMOD)) {
    const lm = lastmodByLoc.get(SITE.baseUrl + route);
    assert(lm === `${date}T00:00:00+05:30`, `${route}: lastmod is not the fixed CONTENT_LASTMOD stamp (got "${lm}")`);
  }
  const orLastmod = lastmodByLoc.get(SITE.baseUrl + '/old-results/');
  const allDeclaredAt = new Set(ctx.archives.flatMap((d) => (d.bazis || []).map((b) => b.declaredAt)));
  assert(
    allDeclaredAt.has(orLastmod) || orLastmod === ctx.pm.iso,
    `/old-results/: lastmod "${orLastmod}" is neither a real declaredAt from the archive nor the empty-archive fallback`
  );
  // robots.txt: allow-all, exactly one Sitemap line, no Disallow, no crawl-delay.
  const robotsTxt = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  assert(/^User-agent:\s*\*/m.test(robotsTxt), 'robots.txt must allow all user-agents');
  assert(/^Allow:\s*\/\s*$/m.test(robotsTxt), 'robots.txt must have "Allow: /"');
  assert(!/^Disallow:/m.test(robotsTxt), 'robots.txt must have no Disallow rules');
  assert(!/^Crawl-delay:/im.test(robotsTxt), 'robots.txt must have no Crawl-delay directive');
  const sitemapLines = robotsTxt.match(/^Sitemap:.*$/gm) || [];
  assert(sitemapLines.length === 1, `robots.txt must have exactly one Sitemap line (found ${sitemapLines.length})`);
  assert(
    sitemapLines[0].trim() === `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    `robots.txt Sitemap line is wrong: "${sitemapLines[0]}"`
  );
  // Basic sitemap.xml well-formedness (no XML parser in a stdlib-only build):
  // correct declaration, balanced <url> tags, and no unescaped bare "&".
  assert(sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'sitemap.xml must start with the XML declaration');
  const openUrl = (sitemapXml.match(/<url>/g) || []).length;
  const closeUrl = (sitemapXml.match(/<\/url>/g) || []).length;
  assert(
    openUrl === closeUrl && openUrl === locs.length,
    `sitemap.xml <url> tags unbalanced or miscounted (open=${openUrl}, close=${closeUrl}, locs=${locs.length})`
  );
  assert(!/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/.test(sitemapXml), 'sitemap.xml has an unescaped "&" — invalid XML');
  results.push(
    `[sitemap-robots] sitemap has exactly ${locs.length} fixed-page entries (no month-archive/anchor/legacy URLs), ` +
    `each resolves + self-canonical-matches; lastmod stable (not build time); robots.txt allow-all with one Sitemap line`
  );

  return results;
}

// Count non-overlapping occurrences of `alias` in `haystack`, treating a match
// as real only if neither neighbouring character is a Latin letter/digit —
// e.g. "Kolkata Fatafat" must NOT match as a false prefix inside "Kolkata
// Fatafati". Plain \b regex word-boundaries are unreliable here because
// Bengali-script aliases aren't \w characters, so boundaries are checked by
// hand instead of relying on regex \b.
function countAliasOccurrences(haystack, alias) {
  const isLatinWordChar = (ch) => ch !== undefined && /[A-Za-z0-9]/.test(ch);
  let count = 0;
  let idx = 0;
  while (true) {
    idx = haystack.indexOf(alias, idx);
    if (idx === -1) break;
    const before = haystack[idx - 1];
    const after = haystack[idx + alias.length];
    if (!isLatinWordChar(before) && !isLatinWordChar(after)) count++;
    idx += alias.length;
  }
  return count;
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
function build() {
  const buildInstant = new Date();
  const today = resolveToday();
  const data = readData();
  const todayDay = getDay(data, today) || { date: today, frozen: false, bazis: [] };
  // A frozen day belongs in the archive if it has real declared bazis, OR is
  // explicitly marked game_off (no bazis array at all, per the upstream source
  // convention) — the day-grid component renders that as a merged "Game Off"
  // row. Without the status check here, a game_off day would be silently
  // dropped before it ever reached the renderer, making that row unreachable.
  const archives = data.days.filter((d) => d.frozen && ((Array.isArray(d.bazis) && d.bazis.length) || d.status === 'game_off'));
  const pm = pageModifiedFor(todayDay, buildInstant);

  const ctx = { data, today, todayDay, archives, pm, buildInstant };

  // Hermetic build: empty dist/ COMPLETELY before regenerating. dist/ is pure
  // build output — nothing may survive between builds (public/ is re-copied).
  // The [hermetic] post-build assertion guarantees no orphaned file can remain.
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Pages
  renderHomepage(ctx);
  renderOldResultsHub(ctx);
  renderFaqPage(ctx);
  for (const slug of ['how-to-play', 'patti-chart', 'timings', 'about', 'contact', 'disclaimer', 'terms', 'privacy', 'cookies']) {
    renderContentPage(slug, ctx);
  }
  render404(ctx);

  // sitemap + legacy redirects + passthrough
  buildSitemap(ctx);
  buildRedirects();
  copyPublic(ctx);

  // Dummy-data deploy guard: if results.json still carries the DUMMY marker,
  // the build SUCCEEDS (local testing is fine) but stamps dist/.dummy-data so
  // deploy.js can refuse. Real results (no _note) leave no stamp.
  const isDummy = /DUMMY/i.test(String(data._note || ''));
  if (isDummy) {
    fs.writeFileSync(
      path.join(DIST, '.dummy-data'),
      'DUMMY seed data: data/results.json _note contains "DUMMY". Do NOT deploy.\n' +
      'Replace results.json with real results and remove the _note before deploying.\n'
    );
  }

  // Apply per-file mtimes (homepage + archives carry their sync timestamp).
  for (const e of emitted) {
    if (e.mtime) fs.utimesSync(e.file, e.mtime, e.mtime);
  }

  // Assertions (throw on failure => non-zero exit)
  const checks = runAssertions(ctx);

  return { ctx, checks, pages: emitted.length, dummy: isDummy };
}

if (require.main === module) {
  try {
    const { checks, pages, ctx } = build();
    console.log(`✔ Build OK — ${pages} HTML pages, today=${ctx.today}, updated=${ctx.pm.iso}`);
    for (const c of checks) console.log('  ' + c);
  } catch (err) {
    console.error('x BUILD FAILED');
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { build };
