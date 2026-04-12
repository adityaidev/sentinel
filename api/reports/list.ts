import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handlePreflight, jsonError } from '../_shared/cors.js';

export const config = { maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return jsonError(res, 'METHOD_NOT_ALLOWED', 'GET only', 405);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError(res, 'UPSTREAM', 'DB not configured', 500);

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('reports')
      .select('id, target_company, analysis_type, share_hash, swot, created_at')
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) return jsonError(res, 'UPSTREAM', error.message, 502);
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.status(200).json({ reports: data || [] });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
