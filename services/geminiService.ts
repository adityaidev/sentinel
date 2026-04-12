import { AgentRole, LogEntry, ScrapedContent, SWOT } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

const NO_RETRY = new Set([400, 401, 403, 404, 413, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, init);
      if (NO_RETRY.has(res.status)) return res;
      if (res.status === 429 || res.status >= 500) {
        const body = await res.clone().json().catch(() => null);
        const retryAfter =
          body?.error?.retryAfterMs ||
          Number(res.headers.get('retry-after')) * 1000 ||
          Math.min(10_000, 2 ** attempt * 500);
        if (attempt < maxRetries - 1) {
          await sleep(retryAfter);
          attempt++;
          continue;
        }
      }
      return res;
    } catch (e) {
      if ((init.signal as AbortSignal | undefined)?.aborted) throw e;
      if (attempt >= maxRetries - 1) throw e;
      await sleep(Math.min(10_000, 2 ** attempt * 500));
      attempt++;
    }
  }
  throw new Error('Request failed after retries');
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Invalid JSON (HTTP ${res.status})`);
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } }).error;
    const e = new Error(err?.message || `HTTP ${res.status}`);
    (e as Error & { code?: string }).code = err?.code;
    throw e;
  }
  return body as T;
}

async function post<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetchWithBackoff(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return parseOrThrow<T>(res);
}

function hydrateLog(l: unknown): LogEntry {
  const log = l as Partial<LogEntry> & { agent?: string };
  return {
    timestamp: log.timestamp || new Date().toISOString(),
    agent: (log.agent as AgentRole) || AgentRole.ROUTER,
    message: log.message || '',
    type: (log.type as LogEntry['type']) || 'info',
    latencyMs: log.latencyMs,
    tokenUsage: log.tokenUsage,
    cost: log.cost,
  };
}

export async function runRouterAgent(
  query: string,
  signal?: AbortSignal,
): Promise<{ target_company: string; analysis_type: string; search_queries: string[]; log: LogEntry }> {
  const r = await post<{
    target_company: string;
    analysis_type: string;
    search_queries: string[];
    log: unknown;
  }>('/router', { query }, signal);
  return { ...r, log: hydrateLog(r.log) };
}

export async function runHunterAgent(
  company: string,
  queries: string[],
  signal?: AbortSignal,
): Promise<{ discoveredUrls: ScrapedContent[]; log: LogEntry }> {
  const r = await post<{ discoveredUrls: ScrapedContent[]; log: unknown }>(
    '/hunter',
    { company, queries },
    signal,
  );
  return { ...r, log: hydrateLog(r.log) };
}

export async function runScraperAgent(
  urls: ScrapedContent[],
  signal?: AbortSignal,
): Promise<{ extractedContent: string; log: LogEntry }> {
  const r = await post<{ extractedContent: string; log: unknown }>(
    '/scraper',
    { urls },
    signal,
  );
  return { ...r, log: hydrateLog(r.log) };
}

export async function runAnalystAgent(
  content: string,
  signal?: AbortSignal,
): Promise<{ swot: SWOT; log: LogEntry }> {
  const r = await post<{ swot: SWOT; log: unknown }>('/analyst', { content }, signal);
  return { ...r, log: hydrateLog(r.log) };
}

export async function runReporterAgent(
  swot: SWOT,
  rawData: string,
  company: string,
  signal?: AbortSignal,
): Promise<{ report: string; log: LogEntry }> {
  const r = await post<{ report: string; log: unknown }>(
    '/reporter',
    { swot, rawData, company },
    signal,
  );
  return { ...r, log: hydrateLog(r.log) };
}

export async function runSocialAgent(
  report: string,
  company: string,
  signal?: AbortSignal,
): Promise<{ post: string; log: LogEntry }> {
  const r = await post<{ post: string; log: unknown }>(
    '/social',
    { report, company },
    signal,
  );
  return { ...r, log: hydrateLog(r.log) };
}

export async function sendChatMessage(
  message: string,
  context: string,
  history: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
): Promise<{ text: string; log: LogEntry }> {
  const r = await post<{ text: string; log: unknown }>(
    '/chat',
    { message, context, history },
    signal,
  );
  return { ...r, log: hydrateLog(r.log) };
}

export async function saveReport(report: {
  targetCompany: string;
  analysisType: string;
  finalReport: string;
  swotAnalysis: unknown;
  discoveredUrls: unknown;
  socialPost?: string | null;
  logs: unknown;
}): Promise<{ id: string; shareHash: string; createdAt: string }> {
  return post('/reports/save', report);
}

export async function loadReport(hash: string): Promise<{
  id: string;
  shareHash: string;
  targetCompany: string;
  analysisType: string;
  finalReport: string;
  swotAnalysis: SWOT;
  discoveredUrls: ScrapedContent[];
  socialPost?: string;
  logs: LogEntry[];
  createdAt: string;
}> {
  const res = await fetch(`${API_BASE}/reports/load?hash=${encodeURIComponent(hash)}`);
  return parseOrThrow(res);
}

export async function listReports(): Promise<
  Array<{
    id: string;
    target_company: string;
    analysis_type: string;
    share_hash: string;
    swot: SWOT;
    created_at: string;
  }>
> {
  const res = await fetch(`${API_BASE}/reports/list`);
  const data = await parseOrThrow<{ reports: Array<{
    id: string;
    target_company: string;
    analysis_type: string;
    share_hash: string;
    swot: SWOT;
    created_at: string;
  }> }>(res);
  return data.reports || [];
}
