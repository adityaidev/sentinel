import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handlePreflight, jsonError } from '../_shared/cors.js';

export const config = { maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return jsonError(res, 'METHOD_NOT_ALLOWED', 'GET only', 405);

  const hash = String(req.query.hash || '');
  if (!hash || hash.length < 8 || hash.length > 32) {
    return jsonError(res, 'BAD_REQUEST', 'hash required', 400);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError(res, 'UPSTREAM', 'DB not configured', 500);

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('reports')
      .select('*')
      .eq('share_hash', hash)
      .maybeSingle();
    if (error) return jsonError(res, 'UPSTREAM', error.message, 502);
    if (!data) return jsonError(res, 'NOT_FOUND', 'report not found', 404);

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600');
    res.status(200).json({
      id: data.id,
      shareHash: data.share_hash,
      targetCompany: data.target_company,
      analysisType: data.analysis_type,
      finalReport: data.final_report,
      swotAnalysis: data.swot,
      discoveredUrls: data.discovered_urls || [],
      socialPost: data.social_post,
      logs: data.logs || [],
      createdAt: data.created_at,
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
