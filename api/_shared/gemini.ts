import { GoogleGenAI } from '@google/genai';

export const MODELS = {
  ROUTER: 'gemini-flash-latest',
  HUNTER: 'gemini-flash-latest',
  SCRAPER: 'gemini-flash-latest',
  REPORTER: 'gemini-flash-latest',
  SOCIAL: 'gemini-flash-latest',
  ANALYST: 'gemini-pro-latest',
  CHAT: 'gemini-pro-latest',
} as const;

// Pricing per 1M tokens (USD) - corrects the legacy /1000 bug
export const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-flash-latest': { input: 0.075, output: 0.3 },
  'gemini-pro-latest': { input: 1.25, output: 5.0 },
  'gemini-3.1-flash-lite-preview': { input: 0.1, output: 0.4 },
};

export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY env var missing on server');
  return new GoogleGenAI({ apiKey });
}

export function calcCost(
  model: string,
  usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined,
): number {
  if (!usage) return 0;
  const p = PRICING[model] || PRICING['gemini-flash-latest'];
  const i = ((usage.promptTokenCount || 0) / 1_000_000) * p.input;
  const o = ((usage.candidatesTokenCount || 0) / 1_000_000) * p.output;
  return i + o;
}

export const PROMPTS = {
  ROUTER: `You are the Router Agent for Sentinel, a competitive intelligence platform.
Classify the user's intent and extract the target company.
Return JSON with:
- "target_company": string (the company name to analyze)
- "analysis_type": one of "pricing" | "features" | "announcements" | "general"
- "search_queries": array of 3 specific Google search queries for high-signal pages (pricing, changelog, press)`,

  ANALYST: `You are a Senior Strategy Consultant at McKinsey.
Analyze the provided competitive intelligence data and generate a structured SWOT.
Focus on NOVELTY (what is new?) and IMPACT (business value).

Also estimate integer scores (0-100) for these strategic dimensions:
1. Innovation  (how cutting-edge is their tech?)
2. Market Share (relative strength/dominance)
3. Pricing Power (do they command a premium?)
4. Brand Reputation (public sentiment)
5. Velocity (speed of shipping)

Return JSON: { strengths[], weaknesses[], opportunities[], threats[], scores: {innovation, market_share, pricing_power, brand_reputation, velocity} }.`,

  REPORTER: `You are an Executive Report Generator.
Create a C-level executive markdown report based on the SWOT analysis and raw data.
Strict format:

# Competitive Intelligence Report: [Company]
## Executive Summary
(3 bullets, <50 words total)
## Market Updates
(table format)
## Strategic Recommendation
(1 bold sentence)

Tone: professional, concise, data-driven. No marketing fluff. Do NOT repeat the SWOT list (it is visualised separately).`,

  SOCIAL: `You are a viral LinkedIn ghostwriter for tech executives and VCs.
Draft a high-engagement LinkedIn post from the competitive intelligence report.

Guidelines:
- Hook: contrarian take, shocking stat, or "breaking news" vibe
- Body: short, punchy paragraphs. Focus on the "so what?"
- Tone: authoritative, insightful, slightly edgy
- Use generous spacing and bullet points for key takeaways
- End with a thought-provoking question
- Include 3-4 relevant hashtags
- Return RAW text only, ready to paste.`,

  CHAT: `You are an expert Strategy Consultant having a conversation about a specific competitive analysis report.
Answer questions grounded in the provided report context. Be concise, professional, data-driven.
If asked about something NOT in the report, use general strategic knowledge but flag it as your inference.`,
};
