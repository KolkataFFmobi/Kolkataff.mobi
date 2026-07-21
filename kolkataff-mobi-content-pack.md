# kolkataff.mobi — Full Site Content Pack (v1, 19 Jul 2026)

## INSTRUCTIONS FOR CLAUDE CODE (read before applying)

1. Read CLAUDE.md first. This pack REPLACES placeholder prose on all pages. Do not alter tables, components, schedules, or data logic.
2. **CANONICAL FACTS below are single-source-of-truth. Every page must state them with identical values. Never paraphrase a number.** If a fact appears on 5 pages, it is byte-identical in meaning and value on all 5.
3. Visible FAQs go on every page as written. **FAQPage JSON-LD only on Homepage and /faq/** — visible-only FAQs elsewhere (schema on every page is a spam pattern; visible text still counts for semantics).
4. CONTENT-POLICY ASSERTION AMENDMENT: the build currently fails on the words tip/predict/lucky. Add a documented whitelist for the exact negative-disclaimer sentences marked ⛔ in this pack (they distance us from the old spam footprint and must survive the build). No other use of those words is permitted.
5. Bengali text is native-register; do not transliterate or machine-mangle it.
6. Keep headings exactly as given (they carry the n-gram/entity structure).

---

## CANONICAL FACTS (identical everywhere)

- **Entity:** Kolkata FF, also known as Kolkata Fatafat (Bengali: কলকাতা ফটাফট; also written Kolkata Fatafati, Kolkata Fotafot, Calcutta Fatafat, KFF).
- **Definition triple:** Kolkata Fatafat **is** a fast-cycle, number-based lottery-style game **played in** Kolkata, West Bengal, India.
- **Lineage triple:** Kolkata Fatafat **derives from** the Satta Matka tradition that began in the 1950s–60s.
- **Rounds:** 8 bazi per day Monday–Saturday; **4 bazi on Sunday**. Each bazi **produces** one Patti and one Single.
- **Patti:** a 3-digit number drawn from the standard 220-Patti set. **Single:** one digit, 0–9.
- **Derivation triple (with canonical example):** the Single **is** the last digit of the Patti's digit sum. Example: Patti 368 → 3+6+8 = 17 → Single **7**.
- **Timings (IST, approximate):** Bazi 1 ~10:03 · 2 ~11:33 · 3 ~13:03 · 4 ~14:33 · 5 ~16:03 · 6 ~17:33 · 7 ~19:03 · 8 ~20:33. Sundays end after Bazi 4 (~14:33). Declared times can vary by a few minutes; we publish the observed time with every result.
- **What this site is:** kolkataff.mobi **publishes** Kolkata FF results — today's result, yesterday's result, the last 30 days on the homepage, a 45-day old-results archive, and yearly charts — verified against multiple public sources before publication.
- ⛔ **Negative disclaimers (exact sentences, whitelisted):**
  - "kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only."
  - "Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result."
- **Status:** independent informational website; **not affiliated with** the game's operators, any lottery body, or the Government of West Bengal. Visitors must be **18+**. Participation in such games involves financial risk and its legality varies by state — check local laws.

---

# 1. HOMEPAGE (content below the 30-day section; Bengali section from previous pass stays)

## What is Kolkata FF (Kolkata Fatafat)?

Kolkata FF, also known as Kolkata Fatafat (কলকাতা ফটাফট), is a fast-cycle, number-based lottery-style game played in Kolkata, West Bengal, India. The game derives from the Satta Matka tradition that began in the 1950s–60s, but unlike a daily lottery it declares results many times a day: 8 bazi Monday–Saturday and 4 bazi on Sunday. Each bazi produces one Patti (a 3-digit number from the standard 220-Patti set) and one Single (a digit from 0–9). kolkataff.mobi publishes every declared result the moment it is confirmed — today's live table above, the last 30 days below it, and a full archive on the Old Results page.

## How to read a Kolkata FF result

Every result has two parts. The **Patti** is the 3-digit number that is drawn. The **Single** is the last digit of the Patti's digit sum. Example: Patti 368 → 3 + 6 + 8 = 17 → Single **7**. That is the entire relationship — if a website shows a Patti and Single that don't follow this rule, one of the two numbers is wrong. Our result tables show the Patti in bold with the Single beneath it, plus the time each bazi was declared in IST.

## Kolkata Fatafat result timings

Results are declared 8 times a day from roughly 10:03 to 20:33 IST, about 90 minutes apart, Monday to Saturday. On Sundays only 4 bazi run, ending around 14:33 IST. Declared times can vary by a few minutes; we publish the observed declaration time with every result. The full schedule with all 8 slots is on the Timings page.

## Why check results on kolkataff.mobi

- **Verified before published.** Every result is cross-checked against multiple public sources; when sources disagree we publish the majority-confirmed number and re-verify the next day.
- **Fast and light.** The page is built to load in under a second on any phone in West Bengal — no pop-ups, no forced app installs.
- **Complete history.** Today, yesterday, 30 days on this page, 45 days in Old Results, and yearly charts back through 2026.
- ⛔ kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. ⛔ Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.

## Kolkata FF FAQ (8 — FAQPage schema ON)

**1. What is Kolkata FF / Kolkata Fatafat?**
Kolkata FF (Kolkata Fatafat, কলকাতা ফটাফট) is a fast-cycle, number-based lottery-style game played in Kolkata, West Bengal, India, descended from the Satta Matka tradition. Results are declared 8 times a day Monday–Saturday and 4 times on Sunday.

**2. What time does the Kolkata FF result come today?**
Bazi 1 is declared around 10:03 IST and the last bazi around 20:33 IST on weekdays, roughly every 90 minutes. On Sundays the day ends after Bazi 4, around 14:33 IST. Exact times vary by a few minutes; each result on this site shows its observed declaration time.

**3. How is the Kolkata FF Single calculated from the Patti?**
The Single is the last digit of the Patti's digit sum. Example: Patti 368 → 3+6+8 = 17 → Single 7.

**4. How many bazi are played on Sunday?**
Four. Bazi 5–8 do not run on Sundays, which is why those rows show "No draw on Sundays / রবিবার বন্ধ" in our table.

**5. Where can I see old Kolkata FF results?**
The Old Results page holds the last 45 days with a date-jump search, and the Chart 2026 page holds the full year, month by month. The homepage always shows the last 30 days.

**6. Does kolkataff.mobi give tips or lucky numbers?**
⛔ No. kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. ⛔ Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.

**7. Is Kolkata FF the same as Bombay Fatafat, Delhi Fatafat, or Nasik Fatafat?**
No. Those are separately operated games in other cities that copy the Fatafat format. This website covers Kolkata FF only.

**8. Is this the official Kolkata FF website?**
No official website exists. kolkataff.mobi is an independent informational site and is not affiliated with the game's operators, any lottery body, or the Government of West Bengal. Visitors must be 18+.

---

# 2. OLD RESULTS (/old-results/) — intro above the date-jump, FAQs below the archive

## Kolkata Fatafat old results — last 45 days

This page archives the last 45 days of Kolkata FF results, newest first — the full Patti and Single for every declared bazi, in the same verified form they were published on result day. Use the date search or the month buttons to jump straight to a date; results older than this rolling window are on the yearly Chart 2026 page. Sundays show 4 bazi; official off-days are marked "Game Off."

### FAQ (5 — visible only, no schema)

**1. How far back do these old results go?** This page keeps a rolling 45 days. The complete year, month by month, is on the Chart 2026 page.
**2. Why do some dates show only 4 results?** Those are Sundays — Kolkata FF runs 4 bazi on Sunday instead of 8.
**3. Why does a date say "Game Off"?** The game did not run that day (public holidays and occasional suspensions). We mark it rather than leaving a gap.
**4. Can I check a specific date quickly?** Yes — use the date box at the top of this page and press Go; the page jumps directly to that day's table.
**5. Are old results ever corrected?** Rarely, yes. If public sources disagreed on result day, we publish the majority-confirmed number and re-verify against additional sources the next day; any correction is applied to this archive too.

---

# 3. CHART 2026 (/chart-2026/) — intro + FAQs

## Kolkata FF chart 2026 — full year record

The Kolkata Fatafat chart for 2026: every declared Patti and Single for the year, organised month by month, January through today. Use the month buttons to jump; each day follows the same format as the rest of the site — 8 bazi on weekdays, 4 on Sundays, and "Game Off" for days the game did not run.

### FAQ (5 — visible only)

**1. What is a Kolkata FF chart?** A chart is the historical record of results — every Patti and Single by date. This page is the complete 2026 record.
**2. Does the chart include Sundays and off days?** Yes. Sundays show their 4 bazi and off days are marked "Game Off," so the calendar is continuous with no missing dates.
**3. Where do this chart's numbers come from?** Every entry was verified against multiple public sources before publication, the same standard as our daily results.
**4. Will there be a Chart 2027?** Yes — each year gets its own page so the archive stays fast to load and easy to reference.
**5. Can the chart tell me what number comes next?** No. Every bazi is an independent draw; past results cannot determine future ones. ⛔ Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.

---

# 4. PATTI CHART (/patti-chart/) — intro + FAQs (existing 220-patti table stays)

## Kolkata FF Patti chart — the 220 Patti explained

Every Kolkata Fatafat result draws its Patti from a fixed set of 220 three-digit combinations. The set has three classes: **Single Patti** (all three digits different, e.g. 368), **Double Patti** (exactly one digit repeated, e.g. 448), and **Triple Patti** (all three identical — 000, 111 … 999, only ten exist). The Single shown under any Patti is always the last digit of its digit sum: 368 → 3+6+8 = 17 → 7. The reference table below groups every Patti under the Single it produces.

### FAQ (6 — visible only)

**1. What does "Patti" mean in Kolkata FF?** The Patti is the 3-digit number a bazi draws, taken from the standard 220-Patti set.
**2. What is the difference between Single, Double and Triple Patti?** Single Patti has three different digits; Double Patti repeats one digit; Triple Patti repeats all three. Triple Pattis are the rarest — only ten exist.
**3. How is the Single digit worked out from a Patti?** It is the last digit of the Patti's digit sum. Example: 368 → 17 → 7.
**4. Why are there exactly 220 Pattis?** 220 is the count of unique 3-digit combinations when digit order does not matter (digits 0–9 taken three at a time with repetition).
**5. Which Pattis map to which Single?** The table on this page lists all 220 grouped by their Single, 0 through 9.
**6. Does a Patti that hasn't appeared recently become "due"?** No. Every bazi is an independent draw; frequency history is a record, not a forecast.

---

# 5. TIMINGS (/timings/) — content around the timings table

## Kolkata FF bazi time table (IST)

Kolkata Fatafat declares results 8 times a day, Monday to Saturday, roughly every 90 minutes. The observed schedule: Bazi 1 ~10:03, Bazi 2 ~11:33, Bazi 3 ~13:03, Bazi 4 ~14:33, Bazi 5 ~16:03, Bazi 6 ~17:33, Bazi 7 ~19:03, Bazi 8 ~20:33 — all times IST and approximate; declarations can shift by a few minutes. **On Sundays only Bazi 1–4 run, ending around 14:33 IST.** Our homepage countdown always shows the next expected bazi, and every published result carries the time it was actually declared.

### FAQ (6 — visible only)

**1. What time is the first Kolkata FF result today?** Bazi 1 is declared around 10:03 IST every day the game runs.
**2. What time is the last result?** Around 20:33 IST Monday–Saturday. On Sundays the last result is Bazi 4, around 14:33 IST.
**3. Are these timings exact?** No — they are the observed pattern. Declarations can vary by a few minutes, which is why we publish the actual time next to every result.
**4. Why is there no result right now?** Either the next bazi hasn't been declared yet (check the countdown on the homepage), it's a Sunday afternoon after Bazi 4, or the game is off today.
**5. Do timings change on holidays?** On some public holidays the game doesn't run at all — those days appear as "Game Off" in the archive.
**6. What is the gap between two bazi?** About 90 minutes, which is what gives the game its "Fatafat" (quick) character.

---

# 6. HOW TO PLAY (/how-to-play/) — informational, no facilitation

## How Kolkata FF works — rules, format, and results

Kolkata Fatafat is a number-guessing game rooted in the Satta Matka tradition. Each round (bazi) draws one Patti — a 3-digit number from the 220-Patti set — and that Patti determines one Single: the last digit of its digit sum (368 → 17 → 7). Players, through local agents in and around Kolkata, West Bengal, back either a Single (0–9) or a specific Patti before a bazi is declared; a matching number wins at odds that vary by bet type — Singles pay least, Triple Pattis most, because they are hardest to hit. The game runs 8 bazi Monday–Saturday and 4 on Sunday.

This page explains the format so results make sense — it is not a guide to placing bets. ⛔ kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. Participation involves real financial risk, is restricted to adults 18+, and its legality varies by state in India — check your local laws. Play, if you play, only what you can afford to lose, and never borrow to bet.

### FAQ (6 — visible only)

**1. How does a Kolkata FF round work?** Each bazi draws a 3-digit Patti; the Single is the last digit of the Patti's digit sum. Results are declared roughly every 90 minutes, 8 times a day Monday–Saturday and 4 times on Sunday.
**2. What can be backed in a bazi?** A Single digit (0–9) or a specific Patti. Rarer outcomes pay higher odds — Triple Pattis (like 555) are the rarest of the 220-Patti set.
**3. Is Kolkata FF a game of skill?** No. Draws are independent random events; no method, pattern, or paid service can predict them. ⛔ Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.
**4. Who can play?** Adults 18 and over, where local law permits. The game's legality varies by Indian state — verify your local laws first.
**5. Is Kolkata FF legal?** It operates in a legal grey area; India's gambling laws are state-specific. This website publishes results for information only and does not organise or promote the game.
**6. Where do I check results after a bazi?** The kolkataff.mobi homepage updates within a minute of confirmation, with the last 30 days below today's table and the full archive under Old Results.

---

# 7. FAQ PAGE (/faq/) — master set (FAQPage schema ON). Keep homepage's 8 plus these:

**9. কলকাতা ফটাফট রেজাল্ট কখন আসে?**
সোম থেকে শনিবার দিনে ৮টি বাজির রেজাল্ট হয় — প্রথম বাজি সকাল ~১০:০৩, শেষ বাজি রাত ~৮:৩৩ (IST)। রবিবার মাত্র ৪টি বাজি হয়, শেষ হয় দুপুর ~২:৩৩-এ। প্রতিটি রেজাল্টের পাশে ঘোষণার সময় দেওয়া থাকে।

**10. এই ওয়েবসাইটে কি টিপস পাওয়া যায়?**
না। kolkataff.mobi শুধুমাত্র রেজাল্ট ও তথ্য প্রকাশ করে — কোনো টিপস, ভবিষ্যদ্বাণী বা পেইড নম্বর এখানে নেই। যারা "নিশ্চিত নম্বর" বিক্রি করে তারা প্রতারক — কাউকে টাকা দেবেন না।

**11. How do you verify results before publishing?**
Every result is checked against multiple independent public sources. If sources disagree, we publish the number confirmed by the majority and re-verify against additional sources the next day, correcting the archive if needed.

**12. Why does your site sometimes show a result a minute later than another site?**
Because we wait for confirmation instead of guessing early. A result on kolkataff.mobi is a verified result; we would rather be sixty seconds later than ever be wrong.

**13. What happened to the old content on this domain?**
kolkataff.mobi changed ownership in 2026 and was rebuilt from scratch as a results-only archive. The previous site's guidance content is gone permanently and none of its services are connected to us.

**14. How can I report a wrong result?**
Use the Contact page. Corrections are our highest-priority mail; verified fixes are applied to the live table and the archive, usually within hours.

---

# 8. ABOUT (/about/)

## About kolkataff.mobi

kolkataff.mobi is an independent archive of Kolkata FF (Kolkata Fatafat) results, rebuilt from the ground up in 2026 with one job: publish every declared result fast, keep it accurate, and keep the site light enough to load instantly on any phone in West Bengal.

**Our method.** Each bazi result is captured as it is declared and verified against multiple independent public sources before it appears here. When sources conflict — it happens — we publish the majority-confirmed number, flag the date internally, and re-verify the next day. The same verified numbers flow to the homepage, the 30-day table, the Old Results archive, and the yearly chart, so the site never contradicts itself.

**What we don't do.** ⛔ kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. We run no WhatsApp groups, sell no memberships, and take no money from visitors. ⛔ Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result.

**Independence.** We are not affiliated with the game's operators, any lottery body, or the Government of West Bengal. Kolkata FF is a privately run game; no official website exists, including this one.

### FAQ (5 — visible only)

**1. Who runs kolkataff.mobi?** An independent publisher. We are not the game's operators and have no connection to them.
**2. Where do your results come from?** From multiple public sources cross-checked against each other before publication; the observed declaration time is recorded with each result.
**3. Is this the same site that was on this domain before?** No. The domain changed ownership in 2026 and everything was rebuilt; the old site's content and services no longer exist.
**4. How do you make money?** The site may show advertising. We never charge visitors and never sell numbers or guidance.
**5. How can I reach you?** Through the Contact page — corrections to results get the fastest response.

---

# 9. CONTACT (/contact/)

## Contact kolkataff.mobi

**Email: contact@kolkataff.mobi** (replace with the live inbox)

The fastest way to reach us. We read everything; result corrections get answered first, usually within hours.

**What to write to us about:** a result you believe is wrong (tell us the date and bazi number — we'll re-verify against our sources and correct the archive if needed); a page that doesn't load or display properly on your phone; feedback on the archive, charts, or timings; press and business enquiries.

**What we can't help with:** number requests or guidance of any kind (⛔ kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only), disputes with agents or operators (we are not affiliated with them), and account issues on other websites.

### FAQ (5 — visible only)

**1. How do I report a wrong result?** Email the date, bazi number, and the value you saw elsewhere. We re-verify against multiple sources and correct both the live table and archive if the report checks out.
**2. How fast do you reply?** Corrections: usually within hours. Everything else: within a few days.
**3. Can you send me results on WhatsApp?** No. We run no WhatsApp or Telegram groups — anyone using this site's name on messaging apps is impersonating us.
**4. Can I advertise on kolkataff.mobi?** Business enquiries by email are welcome; guidance-selling services will be refused.
**5. Do you have social media?** Links to our official profiles appear in the site footer; any account not linked there is not us.

---

# 10. PRIVACY POLICY (/privacy/)

## Privacy Policy

*Last updated: 19 July 2026*

kolkataff.mobi ("we") is an informational website that publishes Kolkata FF results. We collect as little about you as possible.

**What we collect.** We do not require accounts, names, or phone numbers. Two categories of data exist: (1) **Analytics** — we use Google Analytics 4 to understand aggregate traffic (pages viewed, approximate location at city level, device type). GA4 sets cookies and collects your IP in truncated/anonymised form under Google's policies. (2) **Server logs** — our hosting provider (Cloudflare) records standard request logs (IP, user agent, timestamp) for security and performance.

**What we do with it.** Aggregate statistics only: which pages are read, how fast they load, where visitors come from at a regional level. We do not build individual profiles, and we never sell or share personal data with third parties beyond the processors named above.

**Advertising.** If advertising appears on this site, the ad network may use its own cookies subject to its own policy; this page will be updated to name any network before it goes live.

**Your choices.** You can block cookies in your browser; the site works fully without them. To exercise data rights (access, deletion) under applicable law, contact us via the Contact page.

**Children.** This site is intended for adults 18+ and we do not knowingly collect data from minors.

### FAQ (5 — visible only)

**1. Do I need an account to use this site?** No. There is nothing to sign up for and we never ask for your name or number.
**2. What cookies does kolkataff.mobi set?** Google Analytics 4 cookies for aggregate traffic measurement, and any strictly necessary cookies from our host. Details are on the Cookies page.
**3. Do you sell my data?** No. Aggregate analytics only; no personal data is sold or shared beyond the processors named in this policy.
**4. Can I use the site with cookies blocked?** Yes, fully — results, archives, and charts all work without cookies.
**5. How do I request deletion of my data?** Email us via the Contact page; we will handle requests under applicable law.

---

# 11. COOKIES (/cookies/)

## Cookie Policy

*Last updated: 19 July 2026*

kolkataff.mobi uses two kinds of cookies. **Analytics cookies** — set by Google Analytics 4 (names beginning `_ga`) to measure aggregate traffic: pages viewed, approximate region, device type. They expire per Google's schedule (up to 2 years) and can be blocked without affecting the site. **Strictly necessary items** — our host (Cloudflare) may set security-related cookies to protect the site from abuse. We set no advertising cookies today; if an ad network is added, this page will name it and its cookies before they go live. Manage or delete cookies any time in your browser settings — every feature of this site works with cookies disabled.

### FAQ (5 — visible only)

**1. Which cookies does this site set?** Google Analytics (`_ga*`) for aggregate stats and any security cookies from Cloudflare. Nothing else today.
**2. Can I refuse cookies?** Yes — block them in your browser; the site works fully without them.
**3. Do cookies contain my personal details?** No. Analytics cookies hold random identifiers, not your name or contact details.
**4. Will advertising add cookies later?** If an ad network is added, this page will be updated first to name the network and its cookies.
**5. How long do cookies last?** Google Analytics cookies persist up to 2 years unless you delete them earlier in your browser.

---

# 12. TERMS OF SERVICE (/terms/)

## Terms of Service

*Last updated: 19 July 2026*

**1. What this site is.** kolkataff.mobi publishes Kolkata FF (Kolkata Fatafat) results and related factual information. It is an independent informational service, not affiliated with the game's operators, any lottery body, or the Government of West Bengal.

**2. Informational use only.** Results are verified against multiple public sources before publication, but we cannot guarantee they are error-free at every moment. Content here is provided "as is" for information; any decision you make based on it is your own responsibility. ⛔ kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only.

**3. Age and law.** The site is intended for adults 18+. Games of this kind involve financial risk and their legality varies by Indian state; you are responsible for complying with the laws that apply to you.

**4. Acceptable use.** Do not scrape at abusive rates, misrepresent this site's content as your own, or impersonate kolkataff.mobi on messaging platforms or social media.

**5. Intellectual property.** Page design, text, and compiled archive are © kolkataff.mobi. Individual game results are facts and not owned by anyone; our verified compilation and presentation are ours.

**6. Liability.** To the fullest extent permitted by law, we accept no liability for losses arising from use of this site, including gaming losses, decisions based on published results, or downtime.

**7. Changes.** Terms may be updated; the date above reflects the current version. Continued use after changes is acceptance.

### FAQ (5 — visible only)

**1. Is kolkataff.mobi the official Kolkata FF site?** No official site exists; we are an independent informational archive.
**2. Can I rely on results here for money decisions?** Results are multi-source verified, but use them at your own responsibility — see clause 2.
**3. Can I republish your tables?** Individual results are facts; our compiled tables and text are copyrighted. Link to us rather than copying pages.
**4. What's the minimum age to use this site?** 18. The subject matter concerns a game restricted to adults.
**5. Where do I ask a legal or press question?** Via the Contact page — mark it "press/legal" and it will be routed accordingly.

---

# 13. DISCLAIMER (/disclaimer/)

## Disclaimer

kolkataff.mobi is an independent informational website. We are **not** affiliated with, authorised by, or connected to the operators of Kolkata FF (Kolkata Fatafat), any lottery organisation, or the Government of West Bengal. No official Kolkata FF website exists.

**On the game.** Kolkata Fatafat is a privately run, number-based game played in Kolkata, West Bengal. It involves real financial risk, is restricted to adults 18+, and its legality varies by Indian state. We publish its results for information only; nothing here is an invitation, encouragement, or facility to gamble.

**On accuracy.** Results are verified against multiple public sources before publication and corrections are applied when found, but momentary errors are possible; the declared result at the point of play, as recorded by the game's operators, always prevails over any website.

**On guidance.** ⛔ kolkataff.mobi does not publish tips, predictions, lucky numbers, or paid guidance of any kind — results and factual information only. ⛔ Never pay anyone who claims to sell winning numbers; no one can predict a Kolkata FF result. Anyone selling "guaranteed" numbers under this site's name is a fraud.

**If gambling is affecting you.** Set strict limits, never borrow to play, and talk to someone you trust if play stops feeling like entertainment. Help exists — speak to a counsellor or a trusted family member early.

### FAQ (5 — visible only)

**1. Is this website connected to the game's operators?** No. We are an independent publisher of results with no ties to operators, agents, or any government body.
**2. Do results here decide winners?** No — the operators' declared result at the point of play prevails. Our tables are a verified record for reference.
**3. Do you encourage playing Kolkata FF?** No. We document a game that exists; participation is an adult's own choice under their local laws.
**4. Someone on WhatsApp claims to be kolkataff.mobi and sells numbers — is that you?** No. We run no messaging groups and sell nothing. That is impersonation and fraud.
**5. What should I do if playing is becoming a problem?** Stop, set hard limits, and speak to someone you trust or a professional counsellor. No game is worth your financial or mental health.

---

## COVERAGE MAP vs COMPETITORS (why nothing is missing)
Competitor topics covered: game definition/history (Satta Matka lineage) ✓ · timings table + Sunday rule ✓ · Patti taxonomy incl. 220 set and triple rarity ✓ · Single derivation with worked example ✓ · old-results/chart archive usage ✓ · result-checking guide (homepage "why check here" + FAQ) ✓ · legality/18+/state-law ✓ · responsible gaming ✓ · fraud warnings (VIP/WhatsApp scams — reframed as warnings, not services) ✓ · game comparisons (Bombay/Delhi/Nasik as distinct entities) ✓ · corrections/contact path ✓ (competitors lack this — our differentiator). Deliberately excluded: tips/predictions/lucky numbers/hot-cold analysis/pattern strategy — the abandoned spam footprint.
