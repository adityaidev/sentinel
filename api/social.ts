import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, PROMPTS, calcCost, getClient } from './_shared/gemini.js';

export const config = { maxDuration: 30 };
export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'social');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many social calls', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as { report?: string; company?: string };
  const company = String(body.company || 'Unknown').slice(0, 200);
  const report = String(body.report || '').slice(0, 20000);
  if (!report) return jsonError(res, 'BAD_REQUEST', 'report required', 400);

  const t0 = performance.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODELS.SOCIAL,
      contents: `Generate a LinkedIn post for this report about ${company}:\n\n${report}`,
      config: { systemInstruction: PROMPTS.SOCIAL },
    });
    res.status(200).json({
      post: response.text || '',
      log: {
        timestamp: new Date().toISOString(),
        agent: 'SOCIAL_MEDIA',
        message: 'Viral social post drafted',
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: response.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.SOCIAL, response.usageMetadata),
      },
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
