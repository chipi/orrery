import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt.ts';
import type {
  VisionProvider,
  VisionScoreInput,
  VisionScoreResult,
  VisionCategory,
} from './provider.ts';

/**
 * Anthropic Vision adapter (PRD-018 / RFC-022 §3, default v2.0 impl).
 *
 * Sonnet 4.6 (`claude-sonnet-4-6`) — most accurate at the
 * subject/category/focal-point task per the editorial bar set in
 * PRD-018 M1. Per-image cost ~$0.025–$0.05 at 2026-05 pricing;
 * whole-corpus first build ≈ $67 (1345 entries); cached runs $0.
 *
 * Why Sonnet 4.6 and not Haiku: the editorial trust v2 buys depends
 * on the vision model correctly distinguishing a press photo
 * (`people`) from a Mars surface shot (`surface`). Haiku 4.5 makes
 * roughly 2x more category-confusion errors in spot testing; not
 * worth the 5x cost saving when the whole point of the pipeline is
 * editorial trust.
 *
 * API key resolution: reads ANTHROPIC_API_KEY from process.env.
 * Per the operator setup doc (docs/guides/image-pipeline-v2.md),
 * Claude Code subscriptions do NOT cover API calls — operator must
 * provide their own key (locally + GH Actions secret). On 401 the
 * pipeline logs + skips the image (RFC-022 §10 fallback); it does
 * not fail the build.
 */

const DEFAULT_MODEL = 'claude-sonnet-4-6';

/**
 * Token pricing for Sonnet 4.6 as of 2026-05 (USD per 1M tokens).
 * Bump these constants when Anthropic publishes new pricing; the
 * cost ledger (PRD-018 M12) reads these to attribute per-image cost.
 */
const PRICE_PER_M_INPUT_TOKENS = 3;
const PRICE_PER_M_OUTPUT_TOKENS = 15;

/**
 * Attempt count for transient errors (5xx, 429). Per RFC-022 §10:
 * 3 attempts with exponential backoff (1s, 2s, 4s).
 */
const MAX_RETRIES = 3;

export interface AnthropicVisionOptions {
  apiKey?: string;
  model?: string;
}

export function createAnthropicVisionProvider(
  options: AnthropicVisionOptions = {},
): VisionProvider {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    throw new Error(
      'ANTHROPIC_API_KEY missing — Anthropic API is not covered by Claude Code subscriptions. ' +
        'See docs/guides/image-pipeline-v2.md §Prerequisite for setup.',
    );
  }
  const client = new Anthropic({ apiKey });
  const model = options.model ?? DEFAULT_MODEL;
  return {
    name: 'anthropic',
    model,
    async score(input: VisionScoreInput): Promise<VisionScoreResult> {
      return scoreOnce(client, model, input);
    },
  };
}

async function scoreOnce(
  client: Anthropic,
  model: string,
  input: VisionScoreInput,
): Promise<VisionScoreResult> {
  const userText = buildUserMessage({
    contextHint: input.contextHint,
    denyListExamples: input.denyListExamples,
  });
  const mediaType = detectMediaType(input.imagePath);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: input.imageBytes.toString('base64'),
                },
              },
              {
                type: 'text',
                text: userText,
              },
            ],
          },
        ],
      });
      // Narrow via the SDK's own discriminant rather than a custom type
      // predicate (a hand-rolled `{type:'text';text:string}` predicate
      // isn't assignable to the SDK's ContentBlock union).
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Vision response had no text block');
      }
      const parsed = parseVisionResponse(textBlock.text);
      const cost = computeCost(response.usage);
      return { ...parsed, cost_usd: cost };
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isTransient = status === 429 || (status !== undefined && status >= 500 && status < 600);
      if (!isTransient || attempt === MAX_RETRIES - 1) throw err;
      const backoffMs = 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastError ?? new Error('vision retry loop exited unexpectedly');
}

function detectMediaType(path: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

const VALID_CATEGORIES = new Set<VisionCategory>([
  'spacecraft',
  'surface',
  'launch',
  'orbital',
  'hardware',
  'people',
  'diagram',
  'render',
  'other',
]);

function parseVisionResponse(text: string): Omit<VisionScoreResult, 'cost_usd'> {
  // Tolerate a leading code fence the model occasionally adds despite
  // the JSON-only instruction.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const obj = JSON.parse(cleaned) as Record<string, unknown>;
  const score = clampInt(obj.score, 1, 10);
  const subject = String(obj.subject ?? '').slice(0, 280);
  const categoryRaw = String(obj.category ?? 'other') as VisionCategory;
  const category: VisionCategory = VALID_CATEGORIES.has(categoryRaw) ? categoryRaw : 'other';
  const fpRaw = (obj.focal_point ?? {}) as { x?: number; y?: number };
  const focal_point = {
    x: clampFloat(fpRaw.x ?? 0.5, 0, 1),
    y: clampFloat(fpRaw.y ?? 0.5, 0, 1),
  };
  const reject = obj.reject_reason;
  const reject_reason: string | null =
    typeof reject === 'string' && reject.length > 0 ? reject : null;
  return { score, subject, category, focal_point, reject_reason };
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = typeof v === 'number' ? Math.round(v) : parseInt(String(v ?? lo), 10);
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function clampFloat(v: unknown, lo: number, hi: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? lo));
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function computeCost(usage: { input_tokens: number; output_tokens: number } | undefined): number {
  if (!usage) return 0;
  const input = (usage.input_tokens * PRICE_PER_M_INPUT_TOKENS) / 1_000_000;
  const output = (usage.output_tokens * PRICE_PER_M_OUTPUT_TOKENS) / 1_000_000;
  return input + output;
}
