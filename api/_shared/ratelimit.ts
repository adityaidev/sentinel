import { createClient } from '@supabase/supabase-js';

const LIMITS: Record<string, { max: number; windowSec: number }> = {
  router: { max: 60, windowSec: 3600 },
  hunter: { max: 30, windowSec: 3600 },
  scraper: { max: 30, windowSec: 3600 },
  analyst: { max: 30, windowSec: 3600 },
  reporter: { max: 30, windowSec: 3600 },
  social: { max: 30, windowSec: 3600 },
  chat: { max: 200, windowSec: 3600 },
  analyze: { max: 20, windowSec: 3600 },
  default: { max: 120, windowSec: 3600 },
};

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
  retryAfterMs?: number;
}

function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function checkRateLimit(ip: string, endpoint: string): Promise<RateLimitResult> {
  const cfg = LIMITS[endpoint] || LIMITS.default;
  const now = Date.now();
  const windowMs = cfg.windowSec * 1000;
  try {
    const sb = admin();
    const { data, error } = await sb.rpc('rate_limit_hit', {
      p_ip: ip,
      p_endpoint: endpoint,
      p_window_ms: windowMs,
      p_max: cfg.max,
    });
    if (error) {
      console.warn('rate_limit fail-open:', error.message);
      return { ok: true, remaining: cfg.max, resetMs: now + windowMs };
    }
    const row = Array.isArray(data) ? data[0] : data;
    const count = row?.count ?? 0;
    const windowStart = row?.window_start ? new Date(row.window_start).getTime() : now;
    const remaining = Math.max(0, cfg.max - count);
    const resetMs = windowStart + windowMs;
    return {
      ok: count <= cfg.max,
      remaining,
      resetMs,
      retryAfterMs: count > cfg.max ? Math.max(1000, resetMs - now) : undefined,
    };
  } catch (e) {
    console.warn('rate_limit exception fail-open:', (e as Error).message);
    return { ok: true, remaining: cfg.max, resetMs: now + windowMs };
  }
}

export function applyRateHeaders(
  res: { setHeader: (k: string, v: string) => void },
  rl: RateLimitResult,
): void {
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(rl.resetMs / 1000)));
  if (rl.retryAfterMs) res.setHeader('Retry-After', String(Math.ceil(rl.retryAfterMs / 1000)));
}
