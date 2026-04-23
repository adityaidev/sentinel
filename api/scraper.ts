import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, calcCost, getClient, maybeLog } from './_shared/gemini.js';

export const config = { maxDuration: 30 };
export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'scraper');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many scraper calls', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as { urls?: Array<{ url?: string; title?: string; content?: string }> };
  const urls = Array.isArray(body.urls) ? body.urls.slice(0, 20) : [];
  const rawText = urls.length
    ? urls
        .map(
          (u) =>
            `Source: ${u.url || 'unknown'}\nTitle: ${u.title || 'unknown'}\nSummary: ${String(u.content || '').slice(0, 2000)}`,
        )
        .join('\n\n')
    : 'No specific URLs found. Use general knowledge about the company.';

  const t0 = performance.now();
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: MODELS.SCRAPER,
      contents: `You are a Data Engineer. Clean and consolidate the following competitive intelligence data.
Remove duplicates, noise, and marketing fluff. Preserve facts, numbers, dates, and pricing.
Keep the output concise (under 4000 tokens).

RAW DATA:
${rawText}`,
    });
    const content = (response.text && response.text.length > 0)
      ? response.text
      : 'Data extracted but no summary generated.';
    res.status(200).json({
      extractedContent: content,
      ...maybeLog({
        timestamp: new Date().toISOString(),
        agent: 'SCRAPER',
        message: `Processed ${urls.length} sources`,
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: response.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.SCRAPER, response.usageMetadata),
      }),
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
