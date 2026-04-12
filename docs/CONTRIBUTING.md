# Contributing to Sentinel

## Dev setup
```bash
git clone https://github.com/<you>/sentinel.git
cd sentinel
nvm use
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

## Branch + commit conventions
- Branch: `feat/*`, `fix/*`, `docs/*`.
- Commit: Conventional Commits (`feat:`, `fix:`, `docs:`, `perf:`, `refactor:`, `test:`, `chore:`).
- One logical change per PR.

## Pre-commit
```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Adding a new agent endpoint
1. Create `api/<name>.ts` with the `VercelRequest/VercelResponse` signature.
2. Import `checkRateLimit`, `applyRateHeaders`, `handlePreflight`, `clientIp` from `_shared`.
3. Add the agent to `ratelimit.ts LIMITS`.
4. Expose a fetch wrapper in `services/geminiService.ts`.
5. Document in `docs/API.md`.
6. Add a test.

## Working with Gemini
- Never log full prompts/responses (may contain scraped user data).
- Always use `responseSchema` for structured output.
- Validate server-side before returning to client.
- Fallback to sensible defaults if Gemini returns empty/invalid output.

## Supabase migrations
```bash
supabase migration new <description>
# edit SQL in supabase/migrations/
supabase db push
```

## Code style
- Prettier + ESLint authoritative.
- Prefer `const` > `let`. Never `var`.
- No `any` without a `// TODO: tighten` comment.
- No commented-out code.
