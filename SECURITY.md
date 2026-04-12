# Security Policy

## Reporting a Vulnerability

If you discover a security issue in Sentinel, please do not open a public issue. Open a private security advisory on GitHub or email the maintainer.

We will acknowledge within 48 hours and provide a remediation timeline within 7 days.

## Supported Versions

Only the main branch and the currently deployed production release receive security patches.

## In Scope

- Gemini API key exposure in client code
- Authentication / authorization bypass
- Injection attacks against server endpoints
- Rate-limit / quota circumvention
- PII leakage via generated content

## Out of Scope

- Rate limiting of public endpoints under load testing (expected to throttle)
- Model hallucinations or incorrect competitive analysis
- Third-party services (Gemini, Supabase, Vercel) - report to respective vendors
