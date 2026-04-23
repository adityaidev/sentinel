import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, PROMPTS, calcCost, getClient, maybeLog } from './_shared/gemini.js';

export const config = { maxDuration: 30 };
export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'reporter');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many reporter calls', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as { swot?: unknown; rawData?: string; company?: string };
  const company = String(body.company || 'Unknown').slice(0, 200);
  const rawData = String(body.rawData || '').slice(0, 20000);

  const t0 = performance.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODELS.REPORTER,
      contents: `Company: ${company}\nSWOT Analysis: ${JSON.stringify(body.swot || {})}\nRaw Data Context: ${rawData.slice(0, 2000)}`,
      config: { systemInstruction: PROMPTS.REPORTER },
    });
    res.status(200).json({
      report: response.text || `# Report for ${company}\n\n(empty response)`,
      ...maybeLog({
        timestamp: new Date().toISOString(),
        agent: 'REPORTER',
        message: `Compiled executive report for ${company}`,
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: response.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.REPORTER, response.usageMetadata),
      }),
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
