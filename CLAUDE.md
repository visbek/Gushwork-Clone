# sparrwo — Claude Code Memory File

## What this project is
A B2B SaaS tool that helps growth-stage SaaS companies 
(Series A, $1M-$5M ARR) track if their brand appears in 
ChatGPT, Perplexity, and Gemini when buyers search for 
their category.

## Tech stack
- Next.js 14 with App Router
- TypeScript (strict mode always)
- Tailwind CSS + shadcn/ui
- Supabase (database + auth)
- Claude API (content generation)
- OpenAI API (ChatGPT monitoring)
- Perplexity API (Perplexity monitoring)
- Stripe (payments)
- Resend (emails)
- Deployed on Vercel

## Folder structure
- app/(marketing)/ → public pages (landing, pricing)
- app/(dashboard)/ → protected pages (requires login)
- app/api/ → all API routes
- components/ui/ → shadcn components
- components/scanner/ → scanner feature components
- components/dashboard/ → dashboard feature components
- lib/ → supabase.ts, anthropic.ts, openai.ts, utils.ts
- types/ → TypeScript types

## Core rules — always follow these
1. NEVER hardcode API keys. Always use process.env.VARIABLE_NAME
2. NEVER commit .env.local file
3. Always use TypeScript — no plain JavaScript files
4. Always use Tailwind for styling — no inline styles or CSS files
5. Every API route must check if the user is authenticated 
   before doing anything
6. Always handle errors — never leave try/catch blocks empty
7. Mobile responsive by default — always think mobile first
8. When in doubt, ask before writing code

## What we are building (in order)
Phase 1 (Week 1): Free AI visibility scanner — user enters 
domain, gets a score showing if they appear in AI search

Phase 2 (Week 2): Auth + payments + basic dashboard

Phase 3 (Week 3): Daily monitoring engine + weekly email digest

Phase 4 (Week 4): AI content generator to fix visibility gaps

## Current phase
PHASE 1 — V2 ICP Scanner (in progress)

## Scanner architecture (V2)
The free scanner now uses ICP-based intent scanning:
1. Fetch website (3-URL fallback, real HTML extraction)
2. Claude analyzes and returns: businessProfile + icp + 24 prompts in 4 intent categories
3. 4 categories × 6 prompts = 24 total, run across 4 AI engines in parallel
4. Results show ICP card, per-category breakdown, and actionable insights

Prompt categories:
- informational: buyer learning about the problem/category
- discovery: buyer looking for vendors/solutions
- commercial: buyer comparing options
- transactional: buyer ready to purchase

Response shape from generate-prompts:
{
  businessProfile: { companyName, whatTheySell, industry, geography, businessModel },
  icp: { primaryBuyer, buyerLocation, buyerCompanySize, buyerPainPoint, buyerContext },
  prompts: { informational: [6], discovery: [6], commercial: [6], transactional: [6] }
}

## ICP (target customer)
Series A B2B SaaS companies, $1M-$5M ARR, small marketing 
team of 1-3 people, no dedicated SEO hire, feeling pain 
that competitors show up in ChatGPT but they don't

## Pricing
- Free: basic scan, no account needed
- Starter: $49/mo — 20 prompts, 4 AI engines, weekly report
- Growth: $149/mo — 100 prompts, content generation
- Pro: $299/mo — unlimited, full CMS, API access

## Security rules
- All secrets in .env.local only
- .env.local is in .gitignore — never commit it
- Use Supabase Row Level Security on all tables
- Validate all user inputs before processing
- Rate limit the free scanner (max 3 scans per IP per day)

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
