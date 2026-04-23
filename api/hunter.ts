import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, calcCost, getClient, maybeLog } from './_shared/gemini.js';

export const config = { maxDuration: 45 };
export const maxDuration = 45;

interface WebChunk {
  web?: { uri?: string; title?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'hunter');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many hunter calls', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as { company?: string; queries?: string[] };
  const company = String(body.company || '').slice(0, 300).trim();
  const queries = Array.isArray(body.queries) ? body.queries.slice(0, 5) : [];
  if (!company) return jsonError(res, 'BAD_REQUEST', 'company required', 400);

  const t0 = performance.now();
  try {
    const ai = getClient();
    const queryContext = queries.length ? `Specifically investigate: ${queries.join(', ')}.` : '';
    const response = await ai.models.generateContent({
      model: MODELS.HUNTER,
      contents: `Find latest official news, pricing, and feature announcements for ${company}. ${queryContext} Prioritize recent high-authority sources.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as WebChunk[];
    let urls = chunks
      .filter((c) => c.web?.uri && c.web?.title)
      .map((c) => ({
        url: c.web!.uri!,
        title: c.web!.title!,
        snippet: (response.text || '').slice(0, 200),
        content: (response.text || '').slice(0, 2000),
      }));

    if (urls.length === 0 && response.text) {
      urls = [
        {
          url: `https://google.com/search?q=${encodeURIComponent(company)}`,
          title: `${company} search`,
          snippet: response.text.slice(0, 200),
          content: response.text.slice(0, 2000),
        },
      ];
    }

    res.status(200).json({
      discoveredUrls: urls,
      ...maybeLog({
        timestamp: new Date().toISOString(),
        agent: 'HUNTER',
        message: `Discovered ${urls.length} sources via Google Search`,
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: response.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.HUNTER, response.usageMetadata),
      }),
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
