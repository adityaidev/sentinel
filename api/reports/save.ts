import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handlePreflight, jsonError, clientIp } from '../_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from '../_shared/ratelimit.js';

export const config = { maxDuration: 15 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'default');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Save limit hit', 429, { retryAfterMs: rl.retryAfterMs });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError(res, 'UPSTREAM', 'DB not configured', 500);

  const body = req.body as {
    targetCompany?: string;
    analysisType?: string;
    finalReport?: string;
    swotAnalysis?: unknown;
    discoveredUrls?: unknown;
    socialPost?: string;
    logs?: unknown;
  };

  if (!body?.targetCompany || !body?.finalReport) {
    return jsonError(res, 'BAD_REQUEST', 'targetCompany + finalReport required', 400);
  }

  const shareHash = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('reports')
      .insert({
        target_company: String(body.targetCompany).slice(0, 200),
        analysis_type: String(body.analysisType || 'general').slice(0, 80),
        share_hash: shareHash,
        final_report: String(body.finalReport).slice(0, 200000),
        swot: body.swotAnalysis || null,
        discovered_urls: body.discoveredUrls || [],
        social_post: body.socialPost || null,
        logs: body.logs || [],
        ip_hash: await hashIp(clientIp(req)),
      })
      .select('id, share_hash, created_at')
      .single();
    if (error) return jsonError(res, 'UPSTREAM', error.message, 502);
    res.status(201).json({
      id: data.id,
      shareHash: data.share_hash,
      createdAt: data.created_at,
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT || 'sentinel'));
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
