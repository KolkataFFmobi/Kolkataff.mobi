'use strict';

// Content/copy module for kolkataff.mobi
// Publishes Kolkata Fatafat (Kolkata FF) result data aggregated from public
// sources. Informational only. Not affiliated with the game's organisers.
// No tips, no predictions, no betting facilitation anywhere in this file.
//
// Style note: visible prose in this file deliberately avoids the plain hyphen
// character (a 2026-07-19 content pass, by request) — compound modifiers are
// written as separate words ("three digit" not "three-digit") instead. Em
// dashes (—) are unaffected and still used for asides, matching house style.
// Routes, CSS, and ids are code, not prose, and keep their hyphens as normal.

// The canonical "also known as" alias list for Kolkata FF — the opening
// sentence of DEFINITIONAL_PARA is hand-written FROM this list, and the
// build's alias-frequency assertion checks each term appears in that sentence
// exactly once (no stuffing). If the sentence changes, keep this in lockstep.
const ENTITY_ALIASES = [
  'Kolkata FF', 'Kolkata Fatafat', 'কলকাতা ফটাফট', 'Kolkata Fatafati',
  'Kolkata Fotafot', 'Calcutta Fatafat', 'KolkataFatafat', 'KFF',
];

const DEFINITIONAL_PARA =
  'Kolkata FF — also written Kolkata Fatafat, কলকাতা ফটাফট, Kolkata Fatafati, Kolkata Fotafot, Calcutta Fatafat, or KolkataFatafat, and commonly abbreviated KFF — is a fast cycle, number based lottery style game played in Kolkata, West Bengal, India. Results are declared in 8 rounds (bazi) every Monday to Saturday, and 4 rounds on Sunday. This page publishes each round\'s Patti and Single number shortly after declaration, aggregated from publicly available sources. We are not affiliated with the game\'s organisers.';

const NON_AFFILIATION =
  'This is an independent, informational resource and is not affiliated with, endorsed by, or connected to the organisers of Kolkata Fatafat. Every result is cross checked against multiple public sources, and any disagreement between them is corrected in favour of the majority.';

const BENGALI_SUMMARY =
  'এই পৃষ্ঠায় আজকের কলকাতা ফটাফট (Kolkata Fatafat) ফলাফল দেখানো হয় — প্রতিটি রাউন্ডের পাত্তি ও সিঙ্গেল সংখ্যা, প্রতিটি ঘোষণার পর হালনাগাদ করা হয়। তথ্য প্রকাশ্য উৎস থেকে সংগ্রহ করা হয়েছে এবং এই সাইট খেলার আয়োজকদের সঙ্গে যুক্ত নয়।';

// Homepage Bengali-language intro section (distinct from BENGALI_SUMMARY
// above): a longer, standalone block with its own heading, positioned after
// the Last 30 Days archive. NOTE: AI-drafted Bengali — grammatically checked,
// but should get a native-speaker read before this is treated as final copy.
const BENGALI_INTRO_H2 = 'কলকাতা ফটাফট রেজাল্ট';
const BENGALI_INTRO_PARA =
  'কলকাতা ফটাফট (Kolkata Fatafat)-এর ফলাফল প্রতিদিন এই পাতায় প্রকাশ করা হয়। সোমবার থেকে শনিবার মোট আটটি বাজির ফলাফল ঘোষিত হয়, আর রবিবার চারটি বাজি চলে। প্রতিটি বাজির নির্ধারিত সময় ভারতীয় প্রমাণ সময় (IST) অনুসারে স্থির, এবং ঘোষণার পরে পাত্তি ও সিঙ্গেল সংখ্যা এখানে যোগ করা হয়। এই পাতা কোনো টিপস বা পূর্বাভাস দেয় না — শুধু ঘোষিত ফলাফল প্রকাশ করা হয়।';

// ---------------------------------------------------------------------------
// Homepage extra prose sections (2026-07-19 content pass), positioned after
// the Last 30 Days section and the Bengali intro, before the Timings table.
// Each is {h2, bodyHtml}. Rendered by build.js's renderHomepage.
// ---------------------------------------------------------------------------
const HOMEPAGE_SECTIONS = [
  {
    id: 'what-is-kolkata-ff',
    h2: 'What is Kolkata FF (Kolkata Fatafat)?',
    bodyHtml:
      '<p>Kolkata FF, also known as Kolkata Fatafat (<span lang="bn">কলকাতা ফটাফট</span>), is a fast cycle, number based lottery style game played in Kolkata, West Bengal, India. The game comes from the Satta Matka tradition that began in the 1950s and 60s, but unlike a daily lottery it declares results many times a day: 8 bazi Monday to Saturday and 4 bazi on Sunday. Each bazi produces one Patti (a three digit number from the standard <a href="/patti-chart/">220 Patti set</a>) and one Single (a digit from 0 to 9). kolkataff.mobi publishes every declared result the moment it is confirmed: today\'s live table above, the last 30 days below it, and a full archive on the <a href="/old-results/">Old Results</a> page.</p>',
  },
  {
    id: 'how-to-read-a-result',
    h2: 'How to read a Kolkata FF result',
    bodyHtml:
      '<p>Every result has two parts. The Patti is the three digit number that is drawn. The Single is the last digit of the Patti\'s digit sum. Example: Patti 368 → 3 + 6 + 8 = 17 → Single 7. That is the entire relationship: if a website shows a Patti and Single that do not follow this rule, one of the two numbers is wrong. Our result tables show the Patti in bold with the Single beside it, plus the time each bazi was declared in IST.</p>',
  },
  {
    id: 'result-timings-summary',
    h2: 'Kolkata Fatafat result timings',
    bodyHtml:
      '<p>Results are declared 8 times a day from about 10:03 to 20:33 IST, roughly 90 minutes apart, Monday to Saturday. On Sundays only 4 bazi run, ending at about 14:33 IST. Declared times can vary by a few minutes, and we publish the observed declaration time with every result. The full schedule with all 8 slots is on the <a href="/timings/">Timings</a> page.</p>',
  },
  {
    id: 'why-check-here',
    h2: 'Why check results on kolkataff.mobi',
    bodyHtml:
      '<ul>' +
      '<li><strong>Published fast, then cross checked.</strong> Each round is published as soon as a trusted source declares it, then cross checked against the other sources; if they agree on a different number, ours is corrected automatically to the majority value.</li>' +
      '<li><strong>Fast and light.</strong> The page is built to load in under a second on any phone in West Bengal: no popups, no forced app installs.</li>' +
      '<li><strong>A complete history.</strong> Today, yesterday, the last 30 days on this page, and the full archive by month on the Old Results page.</li>' +
      '<li>kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.</li>' +
      '</ul>',
  },
];

// ---------------------------------------------------------------------------
// FAQ architecture: FAQ_CORE (8) has FAQPage schema on the homepage; the
// combined FAQ_CORE + FAQ_MORE (14 total) has FAQPage schema on /faq/, which
// is the master list. Every other page's `faq` array (below, on each PAGES
// entry, and OLD_RESULTS_FAQ) is rendered as visible dt/dd text only, with NO
// FAQPage JSON-LD — putting the same schema on every page is a spam pattern;
// the visible text alone still carries the semantic/entity value.
// ---------------------------------------------------------------------------
const FAQ_CORE = [
  {
    q: 'What is Kolkata FF / Kolkata Fatafat?',
    a: 'Kolkata FF (Kolkata Fatafat, কলকাতা ফটাফট) is a fast cycle, number based lottery style game played in Kolkata, West Bengal, India, that comes from the Satta Matka tradition. Results are declared 8 times a day Monday to Saturday and 4 times on Sunday.'
  },
  {
    q: 'What time does the Kolkata FF result come today?',
    a: 'Bazi 1 is declared at about 10:03 IST and the last bazi at about 20:33 IST on weekdays, roughly every 90 minutes. On Sundays the day ends after Bazi 4, at about 14:33 IST. Exact times can vary by a few minutes, and each result on this site shows the time it was actually declared.'
  },
  {
    q: 'How is the Kolkata FF Single calculated from the Patti?',
    a: 'The Single is the last digit of the Patti\'s digit sum. For example, Patti 368: 3 + 6 + 8 = 17, so the Single is 7.'
  },
  {
    q: 'How many bazi are played on Sunday?',
    a: 'Four. Bazi 5 through 8 do not run on Sundays, which is why those rows show "No draw on Sundays / রবিবার বন্ধ" in our table.'
  },
  {
    q: 'Where can I see old Kolkata FF results?',
    a: 'The Old Results page holds a full archive of every day on record, organised by month, with a date search to jump straight to any day. The homepage always shows the last 30 days.'
  },
  {
    q: 'Does kolkataff.mobi give tips or lucky numbers?',
    a: 'No. kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.'
  },
  {
    q: 'Is Kolkata FF the same as Bombay Fatafat, Delhi Fatafat, or Nasik Fatafat?',
    a: 'No. Those are separately operated games in other cities that copy the Fatafat format. This website covers Kolkata FF only.'
  },
  {
    q: 'Is this the official Kolkata FF website?',
    a: 'No official website exists. kolkataff.mobi is an independent informational site and is not affiliated with the game\'s operators, any lottery body, or the Government of West Bengal. Visitors must be 18+.'
  },
];

const FAQ_MORE = [
  {
    q: 'কলকাতা ফটাফট রেজাল্ট কখন আসে?',
    a: 'সোম থেকে শনিবার দিনে ৮টি বাজির রেজাল্ট হয় — প্রথম বাজি সকাল ~১০:০৩, শেষ বাজি রাত ~৮:৩৩ (IST)। রবিবার মাত্র ৪টি বাজি হয়, শেষ হয় দুপুর ~২:৩৩ এ। প্রতিটি রেজাল্টের পাশে ঘোষণার সময় দেওয়া থাকে।',
    lang: 'bn'
  },
  {
    q: 'এই ওয়েবসাইটে কি টিপস পাওয়া যায়?',
    a: 'না। kolkataff.mobi শুধুমাত্র রেজাল্ট ও তথ্য প্রকাশ করে — কোনো টিপস, ভবিষ্যদ্বাণী বা পেইড নম্বর এখানে নেই। যারা নিশ্চিত নম্বর বিক্রি করে তারা প্রতারক — কাউকে টাকা দেবেন না।',
    lang: 'bn'
  },
  {
    q: 'How do you verify results before publishing?',
    a: 'Every result is checked against multiple independent public sources. If sources disagree, we publish the number confirmed by the majority and verify it again against additional sources the next day, correcting the archive if needed.'
  },
  {
    q: 'Why does your site sometimes show a result a minute later than another site?',
    a: 'Because we wait for confirmation instead of guessing early. A result on kolkataff.mobi is a verified result; we would rather be sixty seconds later than ever be wrong.'
  },
  {
    q: 'What happened to the old content on this domain?',
    a: 'kolkataff.mobi changed ownership in 2026 and was rebuilt from scratch as a results only archive. The previous site\'s guidance content is gone permanently and none of its services are connected to us.'
  },
  {
    q: 'How can I report a wrong result?',
    a: 'Use the Contact page. Corrections are our top priority; verified fixes are applied to the live table and the archive, usually within hours.'
  },
];

// Old Results (/old-results/) intro paragraph + visible-only FAQ. The real
// archive already covers every day on record via month pagination (not a
// rolling 45 day window), so this copy is written to match that, not the
// shorter window some drafts assume.
const OLD_RESULTS_INTRO =
  'This page archives every Kolkata FF result on record, newest first, organised by month, with the full Patti and Single for every declared bazi in the same checked form they were published on result day. Use the date search or the month buttons to jump straight to a date. Sundays show 4 bazi; official off days are marked "Game Off."';

// Rendered as RAW html (not esc()'d) directly after OLD_RESULTS_INTRO — kept
// separate because the intro string itself is escaped at its call sites, so
// markup must never be embedded in it.
const OLD_RESULTS_LINKS =
  '<p>For the rounds declared today, see the <a href="/">Kolkata Fatafat result today</a>. To check which Single any Patti in this archive produces, use the <a href="/patti-chart/">Kolkata FF Patti chart</a>, and for the time each bazi is declared see the <a href="/timings/">Kolkata FF bazi time table</a>.</p>';

const OLD_RESULTS_FAQ = [
  {
    q: 'How far back do these results go?',
    a: 'Every day on record, starting from the first day this archive was published, organised month by month; use the month buttons or the date search to jump to any period.'
  },
  {
    q: 'Why do some dates show only 4 results?',
    a: 'Those are Sundays. Kolkata FF runs 4 bazi on Sunday instead of 8.'
  },
  {
    q: 'Why does a date say "Game Off"?',
    a: 'The game did not run that day, for example on public holidays or occasional suspensions. We mark it rather than leaving a gap.'
  },
  {
    q: 'Can I check a specific date quickly?',
    a: 'Yes. Use the date box at the top of this page and press Go; the page jumps directly to that day\'s table.'
  },
  {
    q: 'Are old results ever corrected?',
    a: 'Rarely, yes. If public sources disagreed on result day, we publish the number confirmed by the majority and verify it again against additional sources the next day; any correction is applied to this archive too.'
  },
];

const SAME_AS_PROFILES = [];

const PAGES = {
  'how-to-play': {
    title: 'How to Play Kolkata FF – Rules, Patti & Single Explained',
    description: 'How Kolkata Fatafat works: each bazi draws one Patti from the 220 Patti set; the Single is the last digit of its digit sum. Rules, bet types, odds logic and 18+ risk facts.',
    h1: 'How Kolkata FF Works – Rules, Format, and Results',
    bodyHtml: `<section aria-labelledby="page-title">
<p>Kolkata Fatafat is a number guessing game rooted in the Satta Matka tradition. Each round, called a bazi, draws one Patti, a three digit number from the <a href="/patti-chart/">220 Patti set</a>, and that Patti determines one Single: the last digit of its digit sum (368 &rarr; 17 &rarr; 7). Players, through local agents in and around Kolkata, West Bengal, back either a Single (0 to 9) or a specific Patti before a bazi is declared; a matching number wins at odds that vary by bet type, with Singles paying the least and Triple Pattis paying the most, because they are the hardest to hit. The game runs 8 bazi Monday to Saturday and 4 on Sunday, at the times listed on the <a href="/timings/">Kolkata FF timings</a> page.</p>
<p>This page explains the format so results make sense. It is not a guide to placing bets. kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind &mdash; results and factual information only. Participation involves real financial risk, is restricted to adults 18+, and its legality varies by state in India, so check your local laws. Play, if you play, only what you can afford to lose, and never borrow to bet.</p>
<h2 id="what-is-a-bazi">What is a bazi in Kolkata FF?</h2>
<p>A bazi is one round of Kolkata Fatafat. Each bazi produces exactly one Patti and one Single, declared at its own scheduled time. There are 8 bazi from Monday to Saturday and 4 bazi on Sunday, so a full week contains 52 declared rounds. Every result on this site is recorded against the bazi number it belongs to.</p>
<h2 id="what-is-a-patti">What is a Patti in Kolkata Fatafat?</h2>
<p>A Patti is the three digit number a bazi draws, always taken from the fixed set of 220 combinations listed on the <a href="/patti-chart/">Kolkata FF Patti chart</a>. A Patti belongs to one of three classes: Single Patti (all three digits different, such as 368), Double Patti (one digit repeated, such as 448), and Triple Patti (all three digits identical, such as 555, of which only ten exist).</p>
<h2 id="what-is-a-single">What is a Single in Kolkata FF?</h2>
<p>A Single is the one digit value, from 0 to 9, that every Patti produces. It is shown directly beneath the Patti in each result, and it is derived by arithmetic rather than drawn separately.</p>
<h2 id="how-single-is-calculated">How is the Single calculated from the Patti?</h2>
<p>The Single is the last digit of the sum of the Patti's three digits. Add the digits together, then take the final digit of that total. For the Patti 368: 3 + 6 + 8 = 17, and the last digit of 17 is 7, so the Single is 7. This rule never varies, which means any published Patti and Single pair can be checked against it, and a pair that fails the check is a misprint somewhere.</p>
<p class="notice">${NON_AFFILIATION}</p>
</section>`,
    faq: [
      { q: 'How does a Kolkata FF round work?', a: 'Each bazi draws a three digit Patti; the Single is the last digit of the Patti\'s digit sum. Results are declared roughly every 90 minutes, 8 times a day Monday to Saturday and 4 times on Sunday.' },
      { q: 'What can be backed in a bazi?', a: 'A Single digit (0 to 9) or a specific Patti. Rarer outcomes pay higher odds; Triple Pattis, like 555, are the rarest of the 220 Patti set.' },
      { q: 'Is Kolkata FF a game of skill?', a: 'No. Draws are independent random events; no method, pattern, or paid service can predict them. Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.' },
      { q: 'Who can play?', a: 'Adults 18 and over, where local law permits. The game\'s legality varies by Indian state, so verify your local laws first.' },
      { q: 'Is Kolkata FF legal?', a: 'It operates in a legal grey area; India\'s gambling laws are specific to each state. This website publishes results for information only and does not organise or promote the game.' },
      { q: 'Where do I check results after a bazi?', a: 'The kolkataff.mobi homepage updates within a minute of confirmation, with the last 30 days below today\'s table and the full archive under Old Results.' },
    ]
  },

  'patti-chart': {
    title: 'Kolkata FF Patti Chart – 220 Patti List with Single Digit',
    description: 'The 220 Patti of Kolkata Fatafat grouped by Single: Single, Double and Triple Patti explained, with the rule — Single is the last digit of the Patti\'s digit sum (368 → 17 → 7).',
    h1: 'Kolkata FF Patti Chart – The 220 Patti Explained',
    bodyHtml: `<section aria-labelledby="page-title">
<p>Every Kolkata Fatafat result draws its Patti from a fixed set of 220 three digit combinations. The set has three classes: Single Patti, where all three digits are different (for example 368); Double Patti, where exactly one digit repeats (for example 448); and Triple Patti, where all three digits are identical (000, 111, and so on through 999, only ten in total). The Single shown under any Patti is always the last digit of its digit sum: 368 &rarr; 3 + 6 + 8 = 17 &rarr; 7. The reference table below groups every Patti under the Single it produces.</p>
<p>To see the Patti and Single actually declared in each round, open the <a href="/">Kolkata Fatafat result today</a> page, or browse every earlier day in the <a href="/old-results/">Kolkata Fatafat old results</a> archive. For a fuller explanation of how a bazi produces its Patti and Single, read <a href="/how-to-play/">how Kolkata FF works</a>.</p>
</section>`,
    faq: [
      { q: 'What does "Patti" mean in Kolkata FF?', a: 'The Patti is the three digit number a bazi draws, taken from the standard 220 Patti set.' },
      { q: 'What is the difference between Single, Double and Triple Patti?', a: 'Single Patti has three different digits; Double Patti repeats one digit; Triple Patti repeats all three. Triple Pattis are the rarest, with only ten in the whole set.' },
      { q: 'How is the Single digit worked out from a Patti?', a: 'It is the last digit of the Patti\'s digit sum. Example: 368 gives 17, so the Single is 7.' },
      { q: 'Why are there exactly 220 Pattis?', a: 'That is the count of unique three digit combinations when digit order does not matter, using the digits 0 to 9 taken three at a time with repetition allowed.' },
      { q: 'Which Pattis map to which Single?', a: 'The table on this page lists all 220, grouped by their Single, 0 through 9.' },
      { q: 'Does a Patti that has not appeared recently become "due"?', a: 'No. Every bazi is an independent draw; frequency history is a record, not a forecast.' },
    ]
  },

  'timings': {
    title: 'Kolkata FF Timings – Fatafat Bazi Time Table Today (IST)',
    description: 'Kolkata Fatafat result timings: 8 bazi from ~10:03 to ~20:33 IST Monday–Saturday, every 90 minutes. Sunday only Bazi 1–4, ending ~14:33. Observed times shown with every result.',
    h1: 'Kolkata FF Bazi Time Table (IST)',
    bodyHtml: `<section aria-labelledby="page-title">
<p>Kolkata Fatafat declares results 8 times a day, Monday to Saturday, roughly every 90 minutes. The observed schedule is Bazi 1 at about 10:03, Bazi 2 at about 11:33, Bazi 3 at about 13:03, Bazi 4 at about 14:33, Bazi 5 at about 16:03, Bazi 6 at about 17:33, Bazi 7 at about 19:03, and Bazi 8 at about 20:33, all times IST and approximate, since declarations can shift by a few minutes. On Sundays only Bazi 1 through 4 run, ending at about 14:33 IST. Our <a href="/">homepage countdown</a> always shows the next expected bazi, and every published result carries the time it was actually declared.</p>
<p>Once a round is declared at its scheduled time, its numbers appear on the <a href="/">Kolkata Fatafat result today</a> page within minutes, and the finished day joins the <a href="/old-results/">Kolkata Fatafat old results</a> archive. To understand what the Patti and Single in each declaration mean, read <a href="/how-to-play/">how Kolkata FF works</a>.</p>
</section>`,
    faq: [
      { q: 'What time is the first Kolkata FF result today?', a: 'Bazi 1 is declared at about 10:03 IST every day the game runs.' },
      { q: 'What time is the last result?', a: 'At about 20:33 IST Monday to Saturday. On Sundays the last result is Bazi 4, at about 14:33 IST.' },
      { q: 'Are these timings exact?', a: 'No, they are the observed pattern. Declarations can vary by a few minutes, which is why we publish the actual time next to every result.' },
      { q: 'Why is there no result right now?', a: 'Either the next bazi has not been declared yet (check the countdown on the homepage), it is a Sunday afternoon after Bazi 4, or the game is off today.' },
      { q: 'Do timings change on holidays?', a: 'On some public holidays the game does not run at all; those days appear as "Game Off" in the archive.' },
      { q: 'What is the gap between two bazi?', a: 'About 90 minutes, which is what gives the game its fast, "Fatafat" character.' },
    ]
  },

  'about': {
    title: 'About kolkataff.mobi – Verified Kolkata FF Results',
    description: 'kolkataff.mobi is an independent Kolkata Fatafat results archive: every bazi checked against multiple sources before publication. Results and facts only — nothing sold.',
    h1: 'About kolkataff.mobi',
    bodyHtml: `<section aria-labelledby="page-title">
<h2>About kolkataff.mobi</h2>
<p>kolkataff.mobi is an independent archive of Kolkata FF (Kolkata Fatafat) results, rebuilt from the ground up in 2026 with one job: publish every declared result fast, keep it accurate, and keep the site light enough to load instantly on any phone in West Bengal.</p>
<h2>Our method</h2>
<p>Each bazi result is captured as it is declared and checked against multiple independent public sources before it appears here. When sources conflict, we publish the number confirmed by the majority, flag the date internally, and verify it again the next day. The same verified numbers flow to the homepage, the 30 day table, and the <a href="/old-results/">Old Results</a> archive, so the site never contradicts itself.</p>
<h2>What we do not do</h2>
<p>kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind &mdash; results and factual information only. We run no WhatsApp groups, sell no memberships, and take no money from visitors. Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.</p>
<h2>Independence</h2>
<p>We are not affiliated with the game's operators, any lottery body, or the Government of West Bengal. Kolkata FF is a privately run game; no official website exists, including this one.</p>
<p class="notice">${NON_AFFILIATION}</p>
</section>`,
    faq: [
      { q: 'Who runs kolkataff.mobi?', a: 'An independent publisher. We are not the game\'s operators and have no connection to them.' },
      { q: 'Where do your results come from?', a: 'From multiple public sources checked against each other before publication; the observed declaration time is recorded with each result.' },
      { q: 'Is this the same site that was on this domain before?', a: 'No. The domain changed ownership in 2026 and everything was rebuilt; the old site\'s content and services no longer exist.' },
      { q: 'How do you make money?', a: 'The site may show advertising. We never charge visitors and never sell numbers or guidance.' },
      { q: 'How can I reach you?', a: 'Through the Contact page; corrections to results get the fastest response.' },
    ]
  },

  'contact': {
    title: 'Contact kolkataff.mobi – Report a Kolkata FF Result Error',
    description: 'Contact the kolkataff.mobi team. Result corrections answered first — send the date and bazi number and we verify again against multiple sources within hours.',
    h1: 'Contact kolkataff.mobi',
    bodyHtml: `<section aria-labelledby="page-title">
<p>This is an informational website with no contact forms and no telephone number. The only way to reach us is by email: <a href="mailto:contact@kolkataff.mobi">contact@kolkataff.mobi</a>. We read everything, and result corrections get answered first, usually within hours.</p>
<p><strong>What to write to us about:</strong> a result you believe is wrong (tell us the date and bazi number so we can verify it again against our sources and correct the archive if needed); a page that does not load or display properly on your phone; feedback on the archive or timings; press and business enquiries.</p>
<p><strong>What we cannot help with:</strong> number requests or guidance of any kind (kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind &mdash; results and factual information only), disputes with agents or operators (we are not affiliated with them), and account issues on other websites.</p>
<p>Before writing in about a number, it is worth checking the <a href="/">Kolkata Fatafat result today</a> page, since each round appears there within minutes of being declared, and the <a href="/old-results/">Kolkata Fatafat old results</a> archive for any earlier date.</p>
</section>`,
    faq: [
      { q: 'How do I report a wrong result?', a: 'Email the date, bazi number, and the value you saw elsewhere. We verify it again against multiple sources and correct both the live table and the archive if the report checks out.' },
      { q: 'How fast do you reply?', a: 'Corrections: usually within hours. Everything else: within a few days.' },
      { q: 'Can you send me results on WhatsApp?', a: 'No. We run no WhatsApp or Telegram groups; anyone using this site\'s name on messaging apps is impersonating us.' },
      { q: 'Can I advertise on kolkataff.mobi?', a: 'Business enquiries by email are welcome; guidance selling services will be refused.' },
      { q: 'Do you have social media?', a: 'Not yet. If official profiles are added in future, links will appear in the site footer; any other account using our name is not us.' },
    ]
  },

  'disclaimer': {
    title: 'Disclaimer – Independent Kolkata FF Results | kolkataff.mobi',
    description: 'kolkataff.mobi is not affiliated with Kolkata Fatafat operators or any authority. Results published for information only — no tips, no predictions, 18+ audience.',
    h1: 'Disclaimer',
    bodyHtml: `<section aria-labelledby="page-title">
<p>kolkataff.mobi is an independent informational website. We are <strong>not</strong> affiliated with, authorised by, or connected to the operators of Kolkata FF (Kolkata Fatafat), any lottery organisation, or the Government of West Bengal. No official Kolkata FF website exists.</p>
<h2>On the game</h2>
<p>Kolkata Fatafat is a privately run, number based game played in Kolkata, West Bengal. It involves real financial risk, is restricted to adults 18+, and its legality varies by Indian state. We publish its results for information only; nothing here is an invitation, encouragement, or facility to gamble.</p>
<h2>On accuracy</h2>
<p>Results are cross checked against multiple public sources and corrected automatically when those sources agree on a different number, but momentary errors are possible; the declared result at the point of play, as recorded by the game's operators, always prevails over any website.</p>
<h2>On guidance</h2>
<p>kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind &mdash; results and factual information only. Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result. Anyone selling guaranteed numbers under this site's name is committing fraud.</p>
<h2>If gambling is affecting you</h2>
<p>Set strict limits, never borrow to play, and talk to someone you trust if play stops feeling like entertainment. Help exists; speak to a counsellor or a trusted family member early.</p>
<p>Everything this disclaimer covers applies to the <a href="/">Kolkata Fatafat result today</a> page, the <a href="/old-results/">Kolkata Fatafat old results</a> archive, and the <a href="/patti-chart/">Kolkata FF Patti chart</a> alike.</p>
<p class="notice">${NON_AFFILIATION}</p>
</section>`,
    faq: [
      { q: 'Is this website connected to the game\'s operators?', a: 'No. We are an independent publisher of results with no ties to operators, agents, or any government body.' },
      { q: 'Do results here decide winners?', a: 'No. The operators\' declared result at the point of play prevails. Our tables are a verified record for reference.' },
      { q: 'Do you encourage playing Kolkata FF?', a: 'No. We document a game that exists; participation is an adult\'s own choice under their local laws.' },
      { q: 'Someone on WhatsApp claims to be kolkataff.mobi and sells numbers, is that you?', a: 'No. We run no messaging groups and sell nothing. That is impersonation and fraud.' },
      { q: 'What should I do if playing is becoming a problem?', a: 'Stop, set hard limits, and speak to someone you trust or a professional counsellor. No game is worth your financial or mental health.' },
    ]
  },

  'terms': {
    title: 'Terms of Service – kolkataff.mobi',
    description: 'Terms for using kolkataff.mobi: independent informational Kolkata FF results archive, 18+ audience, informational use only, no affiliation with game operators.',
    h1: 'Terms of Service',
    bodyHtml: `<section aria-labelledby="page-title">
<p class="muted"><em>Last updated: 19 July 2026</em></p>
<h2>What this site is</h2>
<p>kolkataff.mobi publishes Kolkata FF (Kolkata Fatafat) results and related factual information. It is an independent informational service, not affiliated with the game's operators, any lottery body, or the Government of West Bengal.</p>
<h2>Informational use only</h2>
<p>Results are cross checked against multiple public sources and corrected when a disagreement is found, but we cannot guarantee they are free of errors at every moment. Content here is provided as is for information; any decision you make based on it is your own responsibility. kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind &mdash; results and factual information only.</p>
<h2>Age and law</h2>
<p>The site is intended for adults 18+. Games of this kind involve financial risk, and their legality varies by Indian state; you are responsible for complying with the laws that apply to you.</p>
<h2>Acceptable use</h2>
<p>Do not scrape this site at abusive rates, misrepresent its content as your own, or impersonate kolkataff.mobi on messaging platforms or social media.</p>
<h2>Intellectual property</h2>
<p>Page design, text, and the compiled archive are copyright kolkataff.mobi. Individual game results are facts and are not owned by anyone; our verified compilation and presentation are ours.</p>
<h2>Liability</h2>
<p>To the fullest extent permitted by law, we accept no liability for losses arising from use of this site, including gaming losses, decisions based on published results, or downtime.</p>
<h2>Changes</h2>
<p>Terms may be updated; the date on this page reflects the current version. Continued use of the site after a change means you accept the updated terms.</p>
<p>These terms cover everything published here, including the <a href="/">Kolkata Fatafat result today</a> page and the <a href="/old-results/">Kolkata Fatafat old results</a> archive.</p>
</section>`,
    faq: [
      { q: 'Is kolkataff.mobi the official Kolkata FF site?', a: 'No official site exists; we are an independent informational archive.' },
      { q: 'Can I rely on results here for money decisions?', a: 'Results are checked against multiple sources, but use them at your own responsibility.' },
      { q: 'Can I republish your tables?', a: 'Individual results are facts; our compiled tables and text are copyrighted. Link to us rather than copying pages.' },
      { q: 'What is the minimum age to use this site?', a: '18. The subject matter concerns a game restricted to adults.' },
      { q: 'Where do I ask a legal or press question?', a: 'Via the Contact page; mark it press or legal and it will be routed accordingly.' },
    ]
  },

  'privacy': {
    title: 'Privacy Policy – kolkataff.mobi',
    description: 'What kolkataff.mobi collects and why: no accounts, no personal profiles — Google Analytics 4 aggregate stats and standard server logs only. Your choices explained.',
    h1: 'Privacy Policy',
    bodyHtml: `<section aria-labelledby="page-title">
<p class="muted"><em>Last updated: 19 July 2026</em></p>
<h2>What we collect</h2>
<p>kolkataff.mobi does not require accounts, names, or phone numbers. Two categories of data exist. Analytics: we use Google Analytics 4 to understand aggregate traffic, such as pages viewed, approximate location at city level, and device type; GA4 sets cookies and collects your IP address in a truncated or anonymised form under Google's own policies. Server logs: our hosting provider, Cloudflare, records standard request logs (IP address, user agent, and timestamp) for security and performance.</p>
<h2>What we do with it</h2>
<p>Aggregate statistics only: which pages are read, how fast they load, and where visitors come from at a regional level. We do not build individual profiles, and we never sell or share personal data with third parties beyond the processors named above.</p>
<h2>Advertising</h2>
<p>If advertising appears on this site, the ad network may use its own cookies subject to its own policy; this page will be updated to name any network before it goes live.</p>
<h2>Your choices</h2>
<p>You can block cookies in your browser, and the site works fully without them. To exercise data rights such as access or deletion under applicable law, contact us via the <a href="/contact/">Contact page</a>.</p>
<h2>Children</h2>
<p>This site is intended for adults 18+ and we do not knowingly collect data from minors.</p>
</section>`,
    faq: [
      { q: 'Do I need an account to use this site?', a: 'No. There is nothing to sign up for, and we never ask for your name or number.' },
      { q: 'What cookies does kolkataff.mobi set?', a: 'Google Analytics 4 cookies for aggregate traffic measurement, plus any strictly necessary cookies from our host. Details are on the Cookies page.' },
      { q: 'Do you sell my data?', a: 'No. Aggregate analytics only; no personal data is sold or shared beyond the processors named in this policy.' },
      { q: 'Can I use the site with cookies blocked?', a: 'Yes, fully. Results, archives, and charts all work without cookies.' },
      { q: 'How do I request deletion of my data?', a: 'Email us via the Contact page; we will handle requests under applicable law.' },
    ]
  },

  'cookies': {
    title: 'Cookie Policy – kolkataff.mobi',
    description: 'Cookies on kolkataff.mobi: Google Analytics (_ga) for aggregate traffic and Cloudflare security items only. No ad cookies today; the site works fully with cookies blocked.',
    h1: 'Cookie Policy',
    bodyHtml: `<section aria-labelledby="page-title">
<p class="muted"><em>Last updated: 19 July 2026</em></p>
<h2>Cookies we use now</h2>
<p>kolkataff.mobi uses two kinds of cookies. Analytics cookies are set by Google Analytics 4, with names starting "ga", to measure aggregate traffic such as pages viewed, approximate region, and device type; they expire on Google's own schedule, up to two years, and can be blocked without affecting the site. Strictly necessary items may be set by our host, Cloudflare, to protect the site from abuse.</p>
<h2>Future advertising cookies</h2>
<p>We set no advertising cookies today. If an ad network is added, this page will name it and its cookies before they go live.</p>
<h2>Controlling cookies</h2>
<p>Manage or delete cookies any time in your browser settings; every feature of this site works with cookies disabled, including the <a href="/">Kolkata Fatafat result today</a> table and the <a href="/old-results/">Kolkata Fatafat old results</a> archive.</p>
</section>`,
    faq: [
      { q: 'Which cookies does this site set?', a: 'Google Analytics cookies for aggregate stats, and any security cookies from Cloudflare. Nothing else today.' },
      { q: 'Can I refuse cookies?', a: 'Yes. Block them in your browser; the site works fully without them.' },
      { q: 'Do cookies contain my personal details?', a: 'No. Analytics cookies hold random identifiers, not your name or contact details.' },
      { q: 'Will advertising add cookies later?', a: 'If an ad network is added, this page will be updated first to name the network and its cookies.' },
      { q: 'How long do cookies last?', a: 'Google Analytics cookies can persist up to two years unless you delete them earlier in your browser.' },
    ]
  }
};

module.exports = {
  ENTITY_ALIASES,
  DEFINITIONAL_PARA,
  NON_AFFILIATION,
  BENGALI_SUMMARY,
  BENGALI_INTRO_H2,
  BENGALI_INTRO_PARA,
  HOMEPAGE_SECTIONS,
  FAQ_CORE,
  FAQ_MORE,
  OLD_RESULTS_INTRO,
  OLD_RESULTS_LINKS,
  OLD_RESULTS_FAQ,
  SAME_AS_PROFILES,
  PAGES
};
