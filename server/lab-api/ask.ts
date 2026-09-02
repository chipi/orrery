/**
 * lab-api /ask core (D · #533 · pre-review D) — the T4 server half.
 *
 * Direct kernel import, NOT an MCP loopback: the same schemas `deriveTools`
 * gives the MCP door become the LLM's function-calling schema here — one
 * registry, both doors, and the honesty line holds because the KERNEL computes
 * every number while the LLM only selects tools and narrates. `callTool` keeps
 * its validate-REJECT posture; a rejected call's reason is fed back to the LLM
 * as the tool result so it can correct itself, never silently clamped.
 *
 * Unlike the S4 MCP door, /ask is NOT gated to the transfer domain — the
 * ask-box serves the whole Lab (that gate is an MCP-surface staging decision,
 * lifted in S6).
 *
 * LiteLLM is OpenAI-compatible; base URL + key are env (server-side only,
 * never surfaced to the SPA). Non-streaming JSON in D; SSE is an F option.
 */
import { randomBytes } from 'node:crypto';
import { REGISTRY } from '$lib/physics/registry';
import { deriveTools, callTool, type DerivedTool } from '../mcp/registry-tools';
import { makeT, resolveLocale } from '../mcp/i18n';

const MAX_TOOL_ROUNDS = 4;

export interface AskDeps {
  llmBaseUrl: string;
  llmApiKey: string;
  model: string;
}

export function askDepsFromEnv(): AskDeps {
  return {
    llmBaseUrl: process.env.LITELLM_BASE_URL ?? 'http://homelab:4001',
    llmApiKey: process.env.LITELLM_API_KEY ?? '',
    model: process.env.LAB_LLM_MODEL ?? 'claude-haiku-4-5',
  };
}

export interface AskToolCall {
  tool: string;
  args: Record<string, unknown>;
  /** Verbatim FormulaResult (or the rejection text the LLM saw). */
  result: unknown;
}

export interface AskResponse {
  answer: string;
  toolCalls: AskToolCall[];
  model: string;
  requestId: string;
}

export class LlmUnavailableError extends Error {}

let toolCache: DerivedTool[] | null = null;

function allTools(): DerivedTool[] {
  toolCache ??= deriveTools(REGISTRY, { t: makeT('en-US') });
  return toolCache;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

async function chat(deps: AskDeps, messages: ChatMessage[]): Promise<ChatMessage> {
  let resp: Response;
  try {
    resp = await fetch(`${deps.llmBaseUrl}/chat/completions`, {
      method: 'POST',
      // A hung LiteLLM (tailnet blip) must not strand /ask sockets (MINOR-3).
      signal: AbortSignal.timeout(60_000),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${deps.llmApiKey}`,
      },
      body: JSON.stringify({
        model: deps.model,
        messages,
        tools: allTools().map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.inputSchema },
        })),
      }),
    });
  } catch (e) {
    throw new LlmUnavailableError(`LLM unreachable: ${String(e)}`);
  }
  if (!resp.ok) throw new LlmUnavailableError(`LLM returned ${resp.status}`);
  const data = (await resp.json()) as { choices?: { message?: ChatMessage }[] };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new LlmUnavailableError('LLM returned no choices');
  return msg;
}

function systemPrompt(locale: string): string {
  return (
    'You are the Orrery Physics Lab assistant. You answer spaceflight-physics ' +
    'questions using ONLY the provided tools for every numeric result — never ' +
    'do arithmetic yourself; the physics kernel computes, you narrate. Cite ' +
    'which tool produced each number. If no tool fits, say so plainly and ' +
    `answer conceptually without inventing numbers. Respond in locale "${locale}".`
  );
}

export async function ask(
  question: string,
  rawLocale: unknown,
  deps: AskDeps,
): Promise<AskResponse> {
  const locale = resolveLocale(rawLocale);
  const t = makeT(locale);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(locale) },
    { role: 'user', content: question },
  ];
  const toolCalls: AskToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const msg = await chat(deps, messages);
    messages.push(msg);
    if (!msg.tool_calls?.length) {
      return {
        answer: msg.content ?? '',
        toolCalls,
        model: deps.model,
        requestId: randomBytes(8).toString('hex'),
      };
    }
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      let resultText: string;
      let result: unknown;
      try {
        args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        const { result: r, localized } = callTool(REGISTRY, call.function.name, args, t);
        result = { ...r, localized };
        resultText = JSON.stringify(result);
      } catch (e) {
        // Rejections (validate-REJECT, unknown tool, bad JSON) go BACK to the
        // LLM verbatim — it can correct the call; we never fix args for it.
        result = { error: String(e instanceof Error ? e.message : e) };
        resultText = JSON.stringify(result);
      }
      toolCalls.push({ tool: call.function.name, args, result });
      messages.push({ role: 'tool', content: resultText, tool_call_id: call.id });
    }
  }
  // Out of rounds — one last narration pass without tools would still need a
  // request; instead answer honestly with what the kernel produced.
  return {
    answer: 'Tool-call budget exhausted before a final answer; results above are kernel-computed.',
    toolCalls,
    model: deps.model,
    requestId: randomBytes(8).toString('hex'),
  };
}
