# Sentinel - Architecture

```
                    ┌──────────────────────────────────────┐
                    │          Browser (React SPA)         │
                    │                                      │
                    │  App.tsx ── services/geminiService   │
                    │             (fetch /api/*)           │
                    │  components/                         │
                    │   ├── Sidebar                        │
                    │   ├── AgentVisualizer                │
                    │   ├── ReportView ── ReportChat       │
                    │   ├── HistoryView                    │
                    │   └── ComparisonView                 │
                    └────────────────┬─────────────────────┘
                                     │ HTTPS
                                     ▼
                    ┌──────────────────────────────────────┐
                    │        Vercel Node Functions         │
                    │                                      │
                    │  /api/router     /api/hunter         │
                    │  /api/scraper    /api/analyst        │
                    │  /api/reporter   /api/social         │
                    │  /api/chat       /api/health         │
                    │  /api/reports/{save,load,list}       │
                    └──────┬────────────────────┬──────────┘
                           │                    │
                           ▼                    ▼
                 ┌──────────────────┐  ┌────────────────────┐
                 │   Gemini API     │  │   Supabase         │
                 │                  │  │                    │
                 │  pro-latest      │  │  reports (RLS)     │
                 │  flash-latest    │  │  rate_limits (RPC) │
                 │  (+ googleSearch)│  │  telemetry         │
                 └──────────────────┘  └────────────────────┘
```

## Agent chain (`/api/*`)

Order of a full analysis:
```
query ── router ── {target_company, analysis_type, search_queries}
                 │
                 ├──── hunter ── {discoveredUrls[]}  (Gemini + Google Search grounding)
                 │
                 ├──── scraper ── {extractedContent}  (clean/consolidate)
                 │
                 ├──── analyst ── {swot, scores[5]}  (Pro model for reasoning)
                 │
                 ├──── reporter ── {markdown report}
                 │
                 └──── [optional] social ── {LinkedIn post}
```

All endpoints:
- Run on Vercel Node runtime with `maxDuration` tuned per agent
- Enforce per-IP rate limits via Supabase RPC
- CORS controlled by `ALLOWED_ORIGINS`
- Return an `{..., log: LogEntry}` shape so the client can animate the workflow

## Data storage

`reports` is the single source of truth:

| column | type | purpose |
|---|---|---|
| id | uuid | primary key |
| share_hash | text (unique) | 12-char slug for `/?r=<hash>` |
| target_company | text | the analyzed company |
| analysis_type | text | pricing / features / announcements / general |
| final_report | text | markdown |
| swot | jsonb | `{strengths, weaknesses, opportunities, threats, scores}` |
| discovered_urls | jsonb | array of `{url, title, content, snippet}` |
| social_post | text | optional LinkedIn draft |
| logs | jsonb | per-agent LogEntry array |
| user_id | uuid | optional, references `auth.users` |
| ip_hash | text | SHA-256(ip+salt) for abuse traceability without PII |
| created_at | timestamptz | indexed desc |

RLS:
- `reports_public_read` (public select by share_hash) - anyone can open shared reports
- `reports_user_insert` (user == auth.uid OR anonymous) - save scoped to owner
- `reports_user_delete` (auth.uid() == user_id) - only owner can delete

`rate_limits` is locked to service_role access via the `rate_limit_hit` RPC.

## Models

- **pro-latest** for the Analyst (SWOT + scoring) and Chat - reasoning quality matters.
- **flash-latest** for Router, Hunter, Scraper, Reporter, Social - fast mechanical tasks.

Why not `gemini-3-pro-preview`? It is dead on the public API key namespace we tested with. `gemini-pro-latest` resolves to the live GA Pro endpoint and is ~2x faster at similar quality.

## Performance budget

| Endpoint | P50 | P99 | Budget |
|---|---|---|---|
| router | 2s | 5s | 30s |
| hunter | 8s | 20s | 45s |
| scraper | 3s | 8s | 30s |
| analyst | 10s | 25s | 60s |
| reporter | 4s | 10s | 30s |
| social | 3s | 7s | 30s |
| chat | 2s | 6s | 30s |

## Security

- `GEMINI_API_KEY` server-only
- Supabase service role never ships to the browser
- All user input length-capped and control-character stripped at the API boundary
- IP hashed (SHA-256 + salt) before insert
- X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin
