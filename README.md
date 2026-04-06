# sparrwo

Know where your brand lives in AI search.

sparrwo scans ChatGPT, Gemini, Claude & Perplexity to show exactly where buyers find — or miss — your brand.

## What it does

When a B2B buyer asks an AI chatbot to recommend tools in your category, does your name come up? sparrwo answers that question by running 24 real buyer-intent prompts across 4 AI engines and returning a visibility score broken down by intent stage.

- **4 AI engines** — ChatGPT, Gemini, Claude, Perplexity
- **24 buyer prompts** — mapped to informational, discovery, commercial, and transactional intent
- **ICP-aware** — prompts are generated from your actual website, targeting your specific buyer profile
- **Free scan** — no signup required

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + database)
- Claude API (prompt generation)
- OpenAI API (ChatGPT scanning)
- Perplexity API
- Google Gemini API
- Resend (email)
- Stripe (payments)
- Vercel (hosting)

## Getting started

```bash
npm install
cp .env.example .env.local   # add your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
GEMINI_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
