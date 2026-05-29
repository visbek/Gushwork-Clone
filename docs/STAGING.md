# Staging environment

A long-lived branch + Vercel deployment for testing changes before they reach production. **Every change to sparrwo lands on staging first.**

```
┌────────────┐  PR    ┌──────────────────────────────┐  PR    ┌────────────────────┐
│  feature   │ ─────▶ │  staging branch              │ ─────▶ │  main = production │
│  branches  │        │  → staging.sparrwo (Vercel)  │        │  → sparrwo.com     │
└────────────┘        └──────────────────────────────┘        └────────────────────┘
                              ▲                                        │
                              │           rollback / sync              │
                              └────────────────────────────────────────┘
```

## URLs

| Environment | Branch | Vercel URL |
|---|---|---|
| **Production** | `main` | `sparrwo.com` (or `scannr-<team>.vercel.app`) |
| **Staging** | `staging` | `scannr-staging-<team>.vercel.app` (set in Vercel) |
| **Preview** | any PR | auto-generated per PR by Vercel |

## One-time setup — Vercel side (5 minutes)

Do this once, then never again.

### 1. Create a second Vercel project for staging

A separate project keeps staging env vars + deployment history isolated from production. Highly recommended over the "same project, different branch" pattern.

1. Go to https://vercel.com/new
2. **Import Git Repository** → select `visbek/scannr`
   - If the staging branch will live on `nagarmohnish/scannr-upstream` (the fork) instead, import that
3. **Project name**: `sparrwo-staging` (anything; it becomes the subdomain)
4. **Framework Preset**: Next.js (auto-detected)
5. **Root Directory**: leave as repo root
6. **Build & Output Settings**: leave defaults
7. Click **Deploy**

The first deploy will run against `main` by default. We'll fix that next.

### 2. Pin the project to the `staging` branch

1. Open the new `sparrwo-staging` project
2. **Settings → Git → Production Branch** → change from `main` to **`staging`**
3. Save

Now every push to `staging` triggers a new staging deploy. PRs into `staging` get their own preview URLs.

### 3. Set environment variables

Copy your production env vars from the production project, but use **staging** values where they exist (staging Supabase, separate Stripe test keys, etc.).

Required:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
SERPER_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Scope each one to **Production** (production = staging branch in this Vercel project) and **Preview** (PR previews of staging branch).

Recommended staging-only values:
- A separate Supabase project (`sparrwo-staging`) so test scans don't pollute production data
- Stripe test mode keys
- Resend in test mode or a separate audience
- Same AI engine keys are fine (no separate billing needed for low-volume staging)

### 4. (Optional) Custom subdomain

If you have `sparrwo.com`:
1. **Settings → Domains → Add** → `staging.sparrwo.com`
2. Add the CNAME record in your DNS provider
3. Done — staging is live at `staging.sparrwo.com`

## Daily workflow

```bash
# 1. Start from latest staging
git checkout staging
git pull origin staging

# 2. Branch for your change
git checkout -b feat/my-thing

# 3. Code + commit locally
npm run dev                  # localhost:3000
npm test                     # unit tests pass
git add -A
git commit -m "feat: thing"

# 4. Push & open PR — base: staging (NOT main)
git push -u origin feat/my-thing
gh pr create --base staging --fill

# Vercel posts a preview URL on the PR. Test there first.

# 5. Once approved & merged into staging — auto-deploys to staging.sparrwo
#    Test the staging.sparrwo URL end-to-end.

# 6. When staging looks good for a release, promote to production:
gh pr create --base main --head staging --title "Release: <date>"
# Review the staging→main diff (should already be tested code).
# Merge → Vercel deploys to sparrwo.com.
```

## Promoting staging → production

Two patterns; pick whichever fits the release cadence.

### Pattern A — Continuous promotion (small teams, fast)
Every merge into `staging` is intended for production within hours. Open a release PR daily or per-feature:

```bash
gh pr create --base main --head staging --title "Release: $(date +%Y-%m-%d)"
```

### Pattern B — Batched releases (larger teams, weekly)
`staging` accumulates multiple features. Cut a release PR weekly. Tag the merge:

```bash
gh pr create --base main --head staging --title "Release v0.X"
gh pr merge --squash
git checkout main && git pull
git tag v0.X && git push --tags
```

## Hotfix flow

When production has a bug that can't wait for the next staging cycle:

```bash
# 1. Branch off main directly
git checkout main
git pull origin main
git checkout -b hotfix/critical-thing

# 2. Fix it, test locally
git commit -m "hotfix: critical thing"

# 3. PR to main directly — skip staging
gh pr create --base main --fill --label hotfix

# 4. After merge, sync staging from main so it doesn't lag
git checkout staging
git pull origin staging
git merge main
git push origin staging
```

## Syncing staging from main

If main gets ahead of staging (hotfixes, direct admin merges), sync regularly:

```bash
git checkout staging
git pull origin staging
git merge main          # or: git rebase main, if you prefer linear history
git push origin staging
```

## Rolling back

### Roll back staging
```bash
# Find the last-known-good commit
git log staging --oneline

# Reset
git checkout staging
git reset --hard <sha>
git push --force-with-lease origin staging   # Vercel redeploys
```

Or via Vercel UI: **sparrwo-staging → Deployments → previous good one → Promote to Production**.

### Roll back production
Use Vercel UI for instant rollback — no rebuild needed:
**sparrwo → Deployments → previous good one → Promote to Production**

This is ~3 seconds vs. ~90 seconds for a code revert + rebuild.

## What lives only in staging (not production)

- Test data in staging Supabase
- Stripe test transactions
- Resend test email audience
- Optional: `NEXT_PUBLIC_STAGING_BANNER=true` env to show a "STAGING" ribbon site-wide
- Optional: looser rate limits for QA volume

## Common mistakes

1. **Pushing feature branches to main** — should be `--base staging` first
2. **Forgetting to sync staging from main after hotfixes** — causes drift
3. **Using production Supabase from staging** — pollutes real data; always use a separate project
4. **Force-pushing to main** — never. Use revert PRs or Vercel rollback instead

## What I (Claude) can / can't help with

- ✅ Open PRs into staging or main from feature branches
- ✅ Check PR status, Vercel preview URL, build logs
- ✅ Revert via PR
- ❌ Configure Vercel settings (env vars, custom domains) — needs your Vercel auth
- ❌ Direct deploy via Vercel CLI — needs your token
