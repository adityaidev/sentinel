import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    agents: ['router', 'hunter', 'scraper', 'analyst', 'reporter', 'social', 'chat'],
    models: {
      flash: 'gemini-flash-latest',
      pro: 'gemini-pro-latest',
    },
  });
}
