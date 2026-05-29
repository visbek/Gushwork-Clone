# Contributing to sparrwo

Local → feature branch → **staging** → production. Every change goes through the staging environment before it reaches `sparrwo.com`.

Detailed staging setup is in [docs/STAGING.md](./docs/STAGING.md). This file is the day-to-day reference.

## TL;DR

```bash
git checkout -b feat/your-change      # branch off staging
npm run dev                            # localhost:3000
# ...code, test, run lint...
git push -u origin feat/your-change    # Vercel auto-builds a preview
gh pr create --base staging --fill     # open PR into staging (NOT main)
# ...review the Vercel preview URL, address comments...
gh pr merge --squash                   # merging to staging → deploys to staging.sparrwo

# When staging looks good, cut a release PR to main:
gh pr create --base main --head staging --title "Release: $(date +%Y-%m-%d)"
gh pr merge --squash                   # merging to main → deploys to sparrwo.com
```

## The promotion path

```
┌─────────────┐  PR into  ┌──────────────────────┐  PR into  ┌────────────────────┐
│   local     │  staging  │  staging branch      │   main    │  main → sparrwo.com│
│  (next dev) │ ────────▶ │  → staging.sparrwo   │ ────────▶ │   (production)     │
└─────────────┘           └──────────────────────┘           └────────────────────┘
       │                            ▲                                  │
       │ feature branch             │   sync staging from main         │
       │ → Vercel preview URL ──────┘   after any hotfix               │
       │                                                               │
       └─── hotfix → main directly (skip staging) ─────────────────────┘
```

Vercel watches every branch and creates a preview deployment automatically. The preview URL is posted as a comment on the PR. Two long-lived branches each trigger their own auto-deploy:
- Push to **`staging`** → `staging.sparrwo` URL
- Push to **`main`** → `sparrwo.com`

**The default flow is staging-first.** Only use `--base main` for hotfixes; see the Hotfixes section below.

## Branch naming

Use a prefix so PRs are grouped:

- `feat/...` — new feature or page
- `fix/...` — bug fix
- `refactor/...` — code reorganisation, no behaviour change
- `docs/...` — docs only
- `chore/...` — deps, config, CI

Examples: `feat/sentiment-donut`, `fix/scan-rate-limit`, `refactor/extract-engine-adapters`.

## Required local setup

1. **Node 20+** (Vercel uses Node 20).
2. **Clone + install**:
   ```bash
   git clone https://github.com/visbek/scannr.git sparrwo
   cd sparrwo
   npm install
   ```
3. **Env**: copy the team's env values into `.env.local`. Required for the scanner to actually work:
   - `ANTHROPIC_API_KEY` (always required — prompt generation)
   - `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY` (any subset of engines)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auth + DB)
   - `SERPER_API_KEY` (research data — optional but recommended)
   - `RESEND_API_KEY` (transactional email — optional)
   - `STRIPE_*` (billing — only needed for paid-tier work)

   `.env.local` is in `.gitignore`. **Never commit it.**

## Daily flow

```bash
# Start your day — branch off staging, not main
git checkout staging
git pull --rebase origin staging
git checkout -b feat/my-thing

# While coding
npm run dev                  # localhost:3000
npm test                     # unit tests (mocked, fast)
npm run lint                 # eslint
npm run build                # production build sanity check

# Live-test the agents (optional — costs real $)
npm run test:live            # all engines, gated by RUN_LIVE_TESTS=true
npm run test:live:claude     # one at a time

# Run a full scan from CLI
npx tsx scripts/scan-domain.mts example.com
```

## Pushing & opening a PR

```bash
git add -A
git commit -m "feat(scanner): add stability scoring"
git push -u origin feat/my-thing
```

Vercel will start a preview deploy. Within ~60s the bot will comment on the PR with:
- `Preview: https://sparrwo-git-feat-my-thing-<team>.vercel.app/`
- Build logs and status

Open the PR (CLI or web). **Base = `staging`**, not main. Use the template — explain *why*, link the issue, list manual test steps.

```bash
gh pr create --base staging --fill
```

### Hotfixes (skip staging)

When production has a bug that can't wait for the next staging cycle:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-thing
# fix + commit
gh pr create --base main --fill --label hotfix
# after merge, sync staging from main so it doesn't drift
git checkout staging && git pull && git merge main && git push origin staging
```

## Reviewing

- Don't merge your own PRs without at least one approval.
- Always click through the **Vercel preview URL** before approving — typecheck + lint pass ≠ feature works.
- Resolve every review comment. If you disagree, reply with reasoning rather than just dismissing.

## Merging to production

```bash
gh pr merge --squash --delete-branch
```

Or via the GitHub UI. Once merged into `main`:
1. Vercel detects the push to main
2. Production deploy starts (typically 60-90s for this repo)
3. Old deployment stays warm during cutover (zero downtime)
4. Vercel posts deployment success/failure to the PR

If a production deploy breaks something:

```bash
# Option 1: revert via GitHub
gh pr create --base main --head revert-<sha>

# Option 2: instant rollback via Vercel
# vercel.com → sparrwo → Deployments → previous → "Promote to Production"
```

Promoting an old deployment is the fastest revert (no rebuild, ~3 seconds).

## Env vars in Vercel

`.env.local` covers local dev only. Production + preview env vars live in **Vercel → Settings → Environment Variables**.

Scopes:
- **Production** — only main-branch deploys (real Stripe keys, real Supabase, real APIs)
- **Preview** — every branch deploy (can be same as production or a staging Supabase)
- **Development** — for `vercel dev` (rarely needed; we use `next dev`)

When adding a new env var:
1. Add it to `.env.local` for local dev
2. Add it to Vercel under both Production and Preview scopes
3. Reference it via `process.env.YOUR_VAR` (server) or `process.env.NEXT_PUBLIC_YOUR_VAR` (client)
4. Note the requirement in this file's "Required local setup" list

## What lives where

| Concern | Location |
|---|---|
| Agent logic (scan, brand detection, engine adapters) | [`lib/scanner/`](./lib/scanner/) — fully unit-tested |
| API routes (thin wrappers over `lib/scanner/`) | [`app/api/scan/`](./app/api/scan/) |
| Dashboard pages + shell | [`app/dashboard/`](./app/dashboard/) |
| Marketing / scanner landing | [`app/page.tsx`](./app/page.tsx) |
| UI primitives | [`components/ui/`](./components/ui/) |
| Dashboard components | [`components/dashboard/`](./components/dashboard/) |
| Tests | [`tests/unit/`](./tests/unit/) + [`tests/integration/`](./tests/integration/) |
| Architecture overview | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Product positioning | [`docs/PRODUCT.md`](./docs/PRODUCT.md) |
| Phased build plan | [`docs/ROADMAP.md`](./docs/ROADMAP.md) |

## Pre-merge checklist

Copy this into your PR description:

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes locally
- [ ] Vercel preview deploy is green
- [ ] Clicked through the preview URL and verified the change works
- [ ] If new env vars: added to Vercel Production + Preview scopes
- [ ] If new docs: linked from the relevant index page
- [ ] If schema change: migration committed in `supabase/migrations/`
- [ ] No `.env.local` or other secrets in the diff
