import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED = (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());

export function applyCors(res: VercelResponse, origin: string | null): void {
  const allow = ALLOWED.includes('*') || (origin && ALLOWED.includes(origin))
    ? origin || '*'
    : ALLOWED[0];
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

export function jsonError(
  res: VercelResponse,
  code: string,
  message: string,
  status = 500,
  extra: Record<string, unknown> = {},
): void {
  res.status(status).json({ error: { code, message, ...extra } });
}

export function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0]?.trim() || 'unknown';
  if (Array.isArray(fwd) && fwd[0]) return fwd[0].split(',')[0]?.trim() || 'unknown';
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string') return real;
  return req.socket?.remoteAddress || 'unknown';
}

export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  applyCors(res, (req.headers.origin as string | undefined) || null);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
