export enum AgentRole {
  ROUTER = 'ROUTER',
  HUNTER = 'HUNTER',
  SCRAPER = 'SCRAPER',
  ANALYST = 'ANALYST',
  REPORTER = 'REPORTER',
  SOCIAL = 'SOCIAL_MEDIA',
}

export interface LogEntry {
  timestamp: string;
  agent: AgentRole;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  latencyMs?: number;
  tokenUsage?: number;
  cost?: number;
}

export interface WorkflowStats {
  totalWorkflows: number;
  successRate: number;
  avgExecutionTimeMs: number;
  totalTokens: number;
  totalCost: number;
  lastExecutionTimeMs: number;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  snippet: string;
}

export interface StrategicScores {
  innovation: number;
  market_share: number;
  pricing_power: number;
  brand_reputation: number;
  velocity: number;
}

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  scores: StrategicScores;
}

export interface AgentState {
  workflowId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentAgent: AgentRole | null;
  targetCompany: string;
  analysisType: string;
  discoveredUrls: ScrapedContent[];
  extractedContent: string;
  swotAnalysis: SWOT | null;
  finalReport: string | null;
  socialPost?: string | null;
  logs: LogEntry[];
  timestamp?: string;
  shareHash?: string;
}

export interface ApiError {
  code: 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'UPSTREAM' | 'UNKNOWN';
  message: string;
  retryAfterMs?: number;
}
