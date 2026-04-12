import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePreflight, jsonError, clientIp } from './_shared/cors.js';
import { applyRateHeaders, checkRateLimit } from './_shared/ratelimit.js';
import { MODELS, PROMPTS, calcCost, getClient } from './_shared/gemini.js';

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
    const chat = ai.chats.create({
      model: MODELS.CHAT,
      config: {
        systemInstruction: `${PROMPTS.CHAT}\n\nCONTEXT:\n${context}`,
      },
      history: history.map((h) => ({ role: h.role, parts: [{ text: h.content }] })),
    });
    const result = await chat.sendMessage({ message });
    res.status(200).json({
      text: result.text || 'No response',
      log: {
        timestamp: new Date().toISOString(),
        agent: 'ANALYST',
        message: 'Chat turn delivered',
        type: 'success',
        latencyMs: performance.now() - t0,
        tokenUsage: result.usageMetadata?.totalTokenCount || 0,
        cost: calcCost(MODELS.CHAT, result.usageMetadata),
      },
    });
  } catch (e) {
    jsonError(res, 'UPSTREAM', (e as Error).message, 502);
  }
}
