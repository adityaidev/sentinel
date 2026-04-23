import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, PROMPTS, calcCost, getClient, maybeLog } from './_shared/gemini.js';

export const config = { maxDuration: 30 };
export const maxDuration = 30;

interface ChatReq {
  message?: string;
  context?: string;
  history?: Array<{ role: string; content: string }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return jsonError(res, 'METHOD_NOT_ALLOWED', 'POST only', 405);

  const rl = await checkRateLimit(clientIp(req), 'chat');
  applyRateHeaders(res, rl);
  if (!rl.ok) return jsonError(res, 'RATE_LIMIT', 'Too many chat messages', 429, { retryAfterMs: rl.retryAfterMs });

  const body = (req.body || {}) as ChatReq;
  const message = String(body.message || '').slice(0, 4000).trim();
  const context = String(body.context || '').slice(0, 20000);
  if (!message) return jsonError(res, 'BAD_REQUEST', 'message required', 400);

  const history = Array.isArray(body.history)
    ? body.history
        .filter((h) => h && typeof h.content === 'string' && (h.role === 'user' || h.role === 'model'))
        .slice(-20)
    : [];

  const t0 = performance.now();
  try {
    const ai = getClient();
    // Use direct generateContent so we can combine Google Search grounding
    // with chat history - ai.chats.create doesn't expose tools config cleanly.
    const contents = [
      ...history.map((h) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const result = await ai.models.generateContent({
      model: MODELS.CHAT,
      contents,
      config: {
        systemInstruction: `${PROMPTS.CHAT}\n\nREPORT CONTEXT:\n${context}`,
        tools: [{ googleSearch: {} }],
      },
    });
    res.status(200).json({
      text: result.text || 'No response',
      ...maybeLog({
        timestamp: new Date().toISOString(),
        agent: 'ANALYST',
        message: 'Chat turn delivered',
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: result.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.CHAT, result.usageMetadata),
      }),
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
