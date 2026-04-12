# Changelog

## [1.0.0] - 2026-04-13

### Added
- **Server-side Gemini proxy** - 7 Vercel Node functions (router, hunter, scraper, analyst, reporter, social, chat) + 3 report endpoints (save, load, list) + health probe. API key never reaches the browser.
- **Supabase integration** - `reports` table with share_hash, rate_limits with atomic RPC, telemetry, row-level security on all tables.
- **Rate limiting** - per-IP: 20 analyze/hour, 200 chat/hour, 30 hunter/scraper/analyst/reporter/social per hour. Exponential backoff retry on 429/5xx, no retry on 504.
- **Share links** - saved reports reachable at `/?r=<hash>`.
- **Strict TypeScript**, ESLint, Prettier, Vitest, GitHub Actions CI.
- **Accessibility** - focus-visible rings, `prefers-reduced-motion`, noscript fallback.
- **SEO / PWA** - manifest.json, favicon.svg, robots.txt, sitemap.xml, Open Graph and Twitter cards, noscript.
- **Full doc suite** - README, ARCHITECTURE, DEPLOYMENT, API, CONTRIBUTING, SECURITY, CHANGELOG, LICENSE.

### Changed
- **Migrated Gemini models**: `gemini-2.5-flash` -> `gemini-flash-latest`, `gemini-3-pro-preview` -> `gemini-pro-latest` (the old preview endpoint is dead).
- **Pricing calculation fixed**: was dividing by 1_000 (should be per-1M) - reported costs were 1000x too low. Now correct.
- **History storage**: localStorage-only -> Supabase-backed. Share links, no data loss on cache clear.
- **Chat**: moved from client-side `ai.chats.create` to `/api/chat` with explicit history payload.

### Fixed
- API key leak via `vite.config.ts` define block.
- Stale-state bug in `handleAnalyze` (spreading old `state` instead of latest).
- Missing `AbortController` - client requests now cancellable.
- Import map + CDN Tailwind (now bundled through Vite build).

### Security
- `GEMINI_API_KEY` is server-only.
- Supabase service-role key is server-only; browser uses anon key protected by RLS.
- All user input length-capped and validated at API boundary.
- IP hashing before storing in rate_limits.
- Permissions-Policy header disables camera/mic/geolocation (unused).
