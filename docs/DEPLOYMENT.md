# Sentinel - Deployment Guide

## Repeat deploys
```bash
git push origin main
```
Vercel auto-builds and ships.

## Initial setup (one-time)

### 1. Prerequisites
- Node 22
- A Google Gemini API key: https://aistudio.google.com/apikey
- Supabase account + CLI (`supabase login`)
- Vercel account + CLI (`vercel login`)
- GitHub CLI (`gh auth login`)

### 2. Clone + install
```bash
git clone https://github.com/<you>/sentinel.git
cd sentinel
nvm use
npm install
```

### 3. Supabase
```bash
supabase projects create sentinel --org-id <YOUR_ORG> --db-password <STRONG> --region <nearest>
supabase link --project-ref <REF>
supabase db push
supabase projects api-keys --project-ref <REF>   # copy the anon + service_role keys
```

### 4. Environment
```bash
cp .env.example .env.local
# Fill: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### 5. Vercel
```bash
vercel link --project sentinel
vercel env add GEMINI_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

### 6. Verify
```bash
# Bundle must not contain the Gemini key
curl https://<your>.vercel.app/assets/*.js | grep -iE "AIzaSy" # expect no match

# Health
curl https://<your>.vercel.app/api/health

# Smoke test a full analysis
curl -X POST https://<your>.vercel.app/api/router \
  -H "Content-Type: application/json" \
  -d '{"query":"Analyze OpenAI pricing"}'
```

## Environment variable matrix

| Var | Server | Client | Purpose |
|---|:---:|:---:|---|
| `GEMINI_API_KEY` | Y | - | Gemini REST |
| `SUPABASE_URL` | Y | - | Server DB URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Y | - | Bypasses RLS for rate-limit RPC and server inserts |
| `VITE_SUPABASE_URL` | - | Y | Browser-side |
| `VITE_SUPABASE_ANON_KEY` | - | Y | RLS-protected |
| `ALLOWED_ORIGINS` | Y | - | Comma-separated CORS allowlist |
| `IP_HASH_SALT` | Y | - | Salt for SHA-256 IP hash |

## Rollback
Vercel keeps every deployment. To revert:
```bash
vercel ls sentinel
vercel promote <deployment-url>
```

## Cost ceiling
- Vercel Free: 100 GB bandwidth / 1M invocations / 60s maxDuration
- Supabase Free: 500 MB DB / 50K MAU
- Gemini: pay-as-you-go; Pro runs ~$0.01-0.03 per full analysis (router + hunter + scraper + analyst + reporter)
