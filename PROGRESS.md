# Build Progress

## Status: Week 1 — Free Scanner

## Done
- [x] Node.js installed
- [x] VS Code + Claude Code set up
- [x] CLAUDE.md memory file created
- [x] .gitignore created
- [x] Next.js project scaffold
- [x] Landing page with domain input (dark theme, interactive)
- [x] Scanner API — generate-prompts (fetches real website content, passes to Claude)
- [x] Scanner API — run (parallel prompt execution, all 4 engines)
- [x] Results page with score + per-engine breakdown
- [x] Gemini integration fixed (model: gemini-2.5-flash, direct fetch)
- [x] Industry detection fixed (fetches actual website content before calling Claude)
- [x] Speed fixed (all 24 prompts run in parallel per engine, staggered within engine, ~60-90s total)
- [x] Brand detection improved (domain root, full domain, URL variations, case-insensitive)
- [x] 24 prompts in 3 layers: Generic (8) + Specific (8) + Long-tail (8)
- [x] Results table shows layer badges (Generic/Specific/Long-tail) with section group headers

## V2 ICP Scanner — IN PROGRESS (2026-04-03)
- [x] generate-prompts upgraded: Claude now returns full ICP JSON
  - businessProfile: companyName, whatTheySell, industry, geography, businessModel
  - icp: primaryBuyer, buyerLocation, buyerCompanySize, buyerPainPoint, buyerContext
  - prompts: 4 categories × 6 = 24 buyer-intent prompts
  - Categories: informational / discovery / commercial / transactional
  - Prompts are long, conversational, LLM-style questions (not keyword phrases)
- [x] run/route.ts updated: accepts ICP structure, flattens to 24 prompts, tracks category per result
  - Uses businessProfile.companyName for brand detection
  - Returns categoryScores per intent stage
- [x] page.tsx updated:
  - ICP Summary card above engine scores (company, what they do, buyer, pain)
  - Results table split into 4 intent sections with appearance counts + % per section
  - Insights panel: strongest intent, biggest gap, actionable recommendation
- [x] Brand detection working with smart text matching (single API call + detectBrand())
- [x] Company name cleaning: strips "by Person Name" and "- tagline" patterns
- [x] Brand-specific prompts: discovery/transactional include 2-3 branded/navigational queries
- [x] Domain normalization: strips https://, www., trailing slash (consistent cache keys)
- [x] 24h in-memory prompt cache keyed by normalized domain
- [x] Year references removed from prompts (timeless queries only)
- [x] nocache query param available for manual cache-busting (?nocache=true)

## Blocked on (need before proceeding)
- Supabase account (Phase 2)
- OpenAI API key (optional — ChatGPT engine)
- Perplexity API key (optional — Perplexity engine)

## Decisions made
- Using Next.js 14 App Router
- Supabase for database + auth (Phase 2)
- Claude Haiku for cheap monitoring tasks
- Claude Sonnet for content generation
- Targeting Series A B2B SaaS companies
- Gemini model: gemini-2.5-flash (1.5-flash not available on this key)
- All prompts run in parallel (not sequential) for speed
