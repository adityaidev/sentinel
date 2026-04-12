# Sentinel - API Reference

All endpoints live under `/api/` and run on Vercel's Node runtime.

## Common

- Origin: CORS controlled by `ALLOWED_ORIGINS` env (default `*`).
- Rate limiting: per-IP, tracked in Supabase. Response headers:
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset` (unix seconds)
  - `Retry-After` (only on 429)
- Errors: `{"error":{"code","message","retryAfterMs"?}}`

### Error codes

| code | HTTP | meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | missing/invalid payload |
| `METHOD_NOT_ALLOWED` | 405 | wrong verb |
| `RATE_LIMIT` | 429 | per-IP limit hit |
| `NOT_FOUND` | 404 | record not found |
| `UPSTREAM` | 502 | Gemini or Supabase error |

---

## POST /api/router
Parse intent + extract target company.

**Request**
```json
{"query":"Analyze OpenAI pricing"}
```
**Response (200)**
```json
{"target_company":"OpenAI","analysis_type":"pricing","search_queries":["...","...","..."],"log":{...}}
```
Rate limit: 60/hour.

---

## POST /api/hunter
Find high-signal URLs using Gemini + Google Search.

**Request** `{"company":"OpenAI","queries":["OpenAI pricing plans","..."]}`

**Response** `{"discoveredUrls":[{"url","title","snippet","content"}],"log":{...}}`

Rate limit: 30/hour. maxDuration: 45s.

---

## POST /api/scraper
Clean + consolidate a list of URLs into a fact sheet.

**Request** `{"urls":[{"url","title","content"}]}`

**Response** `{"extractedContent":"...","log":{...}}`

Rate limit: 30/hour.

---

## POST /api/analyst
Pro-model SWOT + 5-dimension scoring.

**Request** `{"content":"extracted fact sheet"}`

**Response**
```json
{
  "swot":{
    "strengths":["..."], "weaknesses":["..."], "opportunities":["..."], "threats":["..."],
    "scores":{"innovation":72,"market_share":58,"pricing_power":61,"brand_reputation":79,"velocity":83}
  },
  "log":{...}
}
```
Rate limit: 30/hour. maxDuration: 60s.

---

## POST /api/reporter
Compile C-level markdown report.

**Request** `{"swot":{...},"rawData":"fact sheet","company":"OpenAI"}`

**Response** `{"report":"# Competitive Intelligence Report: OpenAI\n...","log":{...}}`

Rate limit: 30/hour.

---

## POST /api/social
Draft viral LinkedIn post from report.

**Request** `{"report":"markdown","company":"OpenAI"}`

**Response** `{"post":"...","log":{...}}`

Rate limit: 30/hour.

---

## POST /api/chat
RAG chat about a specific report.

**Request**
```json
{"message":"How does their pricing compare to Anthropic?","context":"full report markdown","history":[{"role":"user","content":"..."},{"role":"model","content":"..."}]}
```
**Response** `{"text":"...","log":{...}}`

Rate limit: 200/hour.

---

## POST /api/reports/save
Persist a completed report and get a shareable hash.

**Request**
```json
{
  "targetCompany":"OpenAI",
  "analysisType":"pricing",
  "finalReport":"# ...",
  "swotAnalysis":{...},
  "discoveredUrls":[...],
  "socialPost":"...",
  "logs":[...]
}
```
**Response (201)** `{"id","shareHash","createdAt"}`

---

## GET /api/reports/load?hash=xxx
Load a saved report.

**Response (200)** full report object. Cached 1h at the edge.

---

## GET /api/reports/list
List the 40 most recent reports.

**Response (200)** `{"reports":[{"id","target_company","analysis_type","share_hash","swot","created_at"},...]}`

---

## GET /api/health
Uptime + model version probe.

**Response (200)**
```json
{"status":"ok","version":"1.0.0","timestamp":"...","agents":["router","hunter",...],"models":{"flash":"gemini-flash-latest","pro":"gemini-pro-latest"}}
```
