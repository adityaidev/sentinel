import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, PROMPTS, calcCost, getClient } from './_shared/gemini.js';

export const config = { maxDuration: 30 };
export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'router');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many router calls', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as { query?: string };
  const query = String(body.query || '').slice(0, 4000).trim();
  if (!query) return jsonError(res, 'BAD_REQUEST', 'query required', 400);

  const t0 = performance.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODELS.ROUTER,
      contents: query,
      config: {
        systemInstruction: PROMPTS.ROUTER,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            target_company: { type: Type.STRING },
            analysis_type: { type: Type.STRING },
            search_queries: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['target_company', 'analysis_type', 'search_queries'],
        },
      },
    });
    const parsed = JSON.parse(response.text || '{}');
    res.status(200).json({
      target_company: parsed.target_company || 'Unknown',
      analysis_type: parsed.analysis_type || 'general',
      search_queries: Array.isArray(parsed.search_queries) ? parsed.search_queries.slice(0, 5) : [],
      log: {
        timestamp: new Date().toISOString(),
        agent: 'ROUTER',
        message: `Identified target: ${parsed.target_company} (${parsed.analysis_type})`,
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: response.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.ROUTER, response.usageMetadata),
      },
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
