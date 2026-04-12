import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runRouterAgent, sendChatMessage } from '../services/geminiService';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('geminiService', () => {
  it('runRouterAgent parses target_company + analysis_type', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          target_company: 'OpenAI',
          analysis_type: 'pricing',
          search_queries: ['OpenAI pricing', 'gpt-4 pricing', 'OpenAI plans'],
          log: { timestamp: '2026-04-13T00:00:00Z', agent: 'ROUTER', message: 'ok', type: 'success' },
        }),
        { status: 200 },
      ),
    );
    const r = await runRouterAgent('Analyze OpenAI pricing');
    expect(r.target_company).toBe('OpenAI');
    expect(r.search_queries).toHaveLength(3);
    expect(r.log.agent).toBe('ROUTER');
  });

  it('sendChatMessage returns text', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          text: 'OpenAI is competitive on pricing.',
          log: { timestamp: '2026-04-13T00:00:00Z', agent: 'ANALYST', message: 'ok', type: 'success' },
        }),
        { status: 200 },
      ),
    );
    const r = await sendChatMessage('how is OpenAI priced?', 'context', []);
    expect(r.text).toContain('OpenAI');
  });

  it('throws on API error with code', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'RATE_LIMIT', message: 'slow down' } }),
        { status: 429 },
      ),
    );
    await expect(runRouterAgent('x')).rejects.toThrow('slow down');
  });
});
