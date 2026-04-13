<p align="center">
  <img src="public/favicon.svg" alt="Sentinel" width="100"/>
</p>

<h1 align="center">S  E  N  T  I  N  E  L</h1>

<p align="center">
  <b>Autonomous Competitive Intelligence Platform</b><br>
  <i>Stop Googling. Start Strategizing.</i>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg">
  <img alt="React" src="https://img.shields.io/badge/react-19-61DAFB?logo=react">
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-Pro_Latest-8E75B2?logo=google-gemini">
  <img alt="Vercel" src="https://img.shields.io/badge/deploy-Vercel-000?logo=vercel">
  <img alt="Supabase" src="https://img.shields.io/badge/db-Supabase-3FCF8E?logo=supabase">
</p>

---

## What Sentinel does

Sentinel is a **multi-agent orchestrator** that replaces hours of manual competitive research with minutes of autonomous analysis. Give it a target company (or a strategic question) and it will:

1. Classify your intent and generate high-signal search queries.
2. Hunt live web data through Google Search grounding.
3. Scrape + clean noise into a dense fact sheet.
4. Run a Pro-model SWOT with scored dimensions (Innovation, Market Share, Pricing Power, Brand, Velocity - each 0-100).
5. Compile a C-level markdown report.
6. Optionally draft a viral LinkedIn post.
7. Let you chat with the report (RAG over the fact sheet + live web).

Plus **Battle Mode**: pick any two saved reports to see a head-to-head radar chart + tale-of-the-tape comparison.

## Live

**[sentinel.adityaai.dev](https://sentinel.adityaai.dev)**

## Stack

| layer | tech |
|---|---|
| frontend | React 19, TypeScript 5.8 strict, Vite 6 |
| styling | Tailwind CSS (Dark Sentinel theme), custom SVG radar charts |
| AI | Gemini Pro Latest (analyst + chat), Gemini Flash Latest (router/hunter/scraper/reporter/social), Google Search grounding |
| backend | Vercel Node Functions |
| data | Supabase Postgres with row-level security |
| realtime | React-Markdown + GFM for report rendering |

## Agent chain

```
Router  - Flash  - classify intent, extract target, draft search queries
Hunter  - Flash  - Gemini + Google Search, pull high-authority sources
Scraper - Flash  - consolidate into a dense fact sheet (<4k tokens)
Analyst - Pro    - SWOT + 5-dimension scoring (0-100 each)
Reporter- Flash  - C-level markdown report
Social  - Flash  - optional LinkedIn post
Chat    - Pro    - RAG over the saved report
```

## Security

- **API key server-side only**. No `GEMINI_API_KEY` in the client bundle.
- **Per-IP rate limits**: 20 analyze/hour, 200 chat/hour, 30 per-agent/hour.
- **Supabase RLS** on every table.
- **IP hashing** (SHA-256 + salt) before any persistence.
- **CORS allowlist**, HSTS, X-Frame-Options DENY, Permissions-Policy.

See [SECURITY.md](SECURITY.md).

## Local dev

```bash
nvm use                      # node 22 from .nvmrc
npm install
cp .env.example .env.local   # fill in keys
npm run dev                  # http://localhost:3000
```

For full `vercel dev` + edge functions, use `vercel dev` instead.

## Deploy

One command:
```bash
vercel --prod
```

Full first-time setup: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## API

Every agent is an HTTP endpoint. See [docs/API.md](docs/API.md).

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Browser requirements

- Chromium 120+, Firefox 125+, Safari 17+
- Works offline for already-loaded reports (service worker shell to come)

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

Apache 2.0 - see [LICENSE](LICENSE).

---

<p align="center"><i>Built by Aditya. Powered by Gemini + Supabase + Vercel.</i></p>
