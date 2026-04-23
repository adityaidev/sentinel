import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Type } from '@google/genai';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, PROMPTS, calcCost, getClient, maybeLog } from './_shared/gemini.js';

export const config = { maxDuration: 60 };
export const maxDuration = 60;

const DEFAULT_SCORES = {
  innovation: 50,
  market_share: 50,
  pricing_power: 50,
  brand_reputation: 50,
  velocity: 50,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'analyst');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many analyst calls', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as { content?: string };
  const content = String(body.content || '').slice(0, 30000).trim();
  const safe = content.length > 10 ? content : 'No data available for analysis.';

  const t0 = performance.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODELS.ANALYST,
      contents: `Data: ${safe}`,
      config: {
        systemInstruction: PROMPTS.ANALYST,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            threats: { type: Type.ARRAY, items: { type: Type.STRING } },
            scores: {
              type: Type.OBJECT,
              properties: {
                innovation: { type: Type.INTEGER },
                market_share: { type: Type.INTEGER },
                pricing_power: { type: Type.INTEGER },
                brand_reputation: { type: Type.INTEGER },
                velocity: { type: Type.INTEGER },
              },
              required: ['innovation', 'market_share', 'pricing_power', 'brand_reputation', 'velocity'],
            },
          },
          required: ['strengths', 'weaknesses', 'opportunities', 'threats', 'scores'],
        },
      },
    });

    let swot;
    try {
      swot = JSON.parse(response.text || '{}');
      if (!swot.scores) swot.scores = DEFAULT_SCORES;
    } catch {
      swot = {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        scores: DEFAULT_SCORES,
      };
    }
    res.status(200).json({
      swot,
      ...maybeLog({
        timestamp: new Date().toISOString(),
        agent: 'ANALYST',
        message: `SWOT generated. Avg score: ${Math.round(Object.values(swot.scores as Record<string, number>).reduce((a, b) => a + b, 0) / 5)}`,
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: response.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.ANALYST, response.usageMetadata),
      }),
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
