# Automation setup — one-time steps (~15 minutes)

Everything code-side is done and committed. These are the account-side steps
only you can do. After step 4 the site updates itself around the clock.

## 1. Create the GitHub repo and push (5 min)

1. github.com → New repository → name it (e.g. `kolkataff-mobi`), **Private**,
   NO readme/gitignore (the repo already has everything). Create.
2. In Terminal:

   ```bash
   cd /Users/kalrajvirk/Claude/Projects/FF
   git remote add origin https://github.com/YOUR_USERNAME/kolkataff-mobi.git
   git push -u origin main
   ```

   (If git asks who you are, it will prompt for your GitHub login — use a
   Personal Access Token as the password if prompted.)

Do NOT drag-and-drop files through the GitHub web page — that is what kept
producing broken uploads (`/FF/dist/...` nesting, dropped `_headers`).
`git push` preserves everything exactly.

## 2. Connect Cloudflare Pages to the repo (3 min) — RECOMMENDED

Dashboard → Workers & Pages → your Pages project → Settings → Builds &
deployments → connect to the GitHub repo:

- Build command: `node build.js`
- Build output directory: `dist`

From then on EVERY push (manual or from the bot) deploys automatically and
correctly — no more manual uploads ever, and the "only 8 files went live"
problem is structurally impossible.

> Alternative if you skip this step: add the three secrets below and the
> workflow deploys via wrangler instead. Either path works; connecting the
> repo is simpler and also deploys your own manual pushes.

## 3. Add repo secrets (only needed for the wrangler path, skip if you did 2)

GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → "Cloudflare Pages: Edit" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard, right sidebar of any zone page |
| `CF_PAGES_PROJECT` | The Pages project name exactly as shown in Workers & Pages |

## 4. Verify the bazi schedule, then flip the deploy guard (when ready)

Deploys stay OFF (results still get fetched + committed) until you:

1. Watch 2-3 live declarations and confirm the real times against
   `SCHEDULE` in `lib/core.js` (seed says first bazi 10:03; kolkataff.tv's
   banner claims 10:20 — someone is wrong, and the auto-updater's observed
   `declaredAt` timestamps in data/results.json will tell you who within a
   day or two of running).
2. Correct `SCHEDULE` if needed, flip `SCHEDULE_VERIFIED` to `true` in
   `lib/core.js`, commit, push.

From that moment the pipeline is fully hands-off: fetch → 2-source confirm →
validate → commit → deploy, every 15 minutes through the IST result day.

## What the bot will and won't do

- WILL: add new 2-source-confirmed results, freeze finished days, rebuild,
  commit, deploy (once unlocked), and fail loudly (email from GitHub) on any
  source conflict or build-assertion failure.
- WON'T: publish single-source values, publish future bazi slots, overwrite
  an already-published result, or deploy dummy/unverified-schedule builds.
- Manual entry still works exactly as before (`npm run add-result`) for
  anything unusual — just `git push` afterwards.
