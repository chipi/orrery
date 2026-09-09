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
import {
  composeScenarioTool,
  parseScenarioArgs,
  summariseScenario,
  COMPOSE_SCENARIO_TOOL,
  type AskScenario,
} from './scenario';

// Tool-calling rounds before the guaranteed final-synthesis pass (#464 follow-up).
// A rich question ("how do I launch a rocket?") legitimately needs several
// formulas; 6 rounds gives headroom, and the synthesis pass below means the user
// always gets a narrated answer even if all rounds are spent tool-calling.
const MAX_TOOL_ROUNDS = 6;

export interface AskDeps {
  llmBaseUrl: string;
  llmApiKey: string;
  model: string;
}

export function askDepsFromEnv(): AskDeps {
  return {
    llmBaseUrl: process.env.LITELLM_BASE_URL ?? 'http://homelab:4001',
    llmApiKey: process.env.LITELLM_API_KEY ?? '',
    // A gateway ALIAS, not a provider name (operator 2026-09-06): the shared
    // prod LiteLLM maps `orrery-ask` to the actual model + the project's
    // dedicated OpenRouter key. Local dev: add the alias to the homelab
    // gateway config, or export LAB_LLM_MODEL=<an existing homelab alias>.
    model: process.env.LAB_LLM_MODEL ?? 'orrery-ask',
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
  /** The composed formula ladder (slice #541). The client recomputes + renders it;
   *  the kernel owns every number. Present once the model calls compose_scenario. */
  scenario?: AskScenario;
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

async function chat(
  deps: AskDeps,
  messages: ChatMessage[],
  withTools = true,
): Promise<ChatMessage> {
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
        // The final-synthesis pass omits tools so the model MUST answer in prose
        // (no more tool calls) — guarantees a narrated answer from the results.
        ...(withTools
          ? {
              tools: [
                // compose_scenario (slice #541) — the ladder-builder, alongside the
                // per-formula tools. Its schema is richer than a DerivedTool's scalars.
                composeScenarioTool(),
                ...allTools().map((t) => ({
                  type: 'function' as const,
                  function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema,
                  },
                })),
              ],
            }
          : {}),
      }),
    });
  } catch (e) {
    throw new LlmUnavailableError(`LLM unreachable: ${String(e)}`);
  }
  if (!resp.ok) throw new LlmUnavailableError(`LLM returned ${resp.status}`);
  let data: { choices?: { message?: ChatMessage }[] };
  try {
    data = (await resp.json()) as typeof data;
  } catch {
    // Malformed gateway body is an UPSTREAM failure class, not our 500
    // (full-arc review m-3).
    throw new LlmUnavailableError('LLM returned unparseable JSON');
  }
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new LlmUnavailableError('LLM returned no choices');
  return msg;
}

function systemPrompt(locale: string): string {
  return (
    'You are the Orrery Physics Lab assistant. You answer spaceflight-physics ' +
    'questions using ONLY the provided tools for every numeric result — never ' +
    'do arithmetic yourself; the physics kernel computes, you narrate. When a ' +
    'question needs several formulas, request them TOGETHER in as few rounds as ' +
    'possible (you may call multiple tools in one turn); reserve your final turn ' +
    'for writing the answer. Cite which tool produced each number. If no tool ' +
    'fits, say so plainly and answer conceptually without inventing numbers. ' +
    // Slice #541: extraction + the scenario ladder.
    'ALWAYS pull the quantities the user stated (e.g. "100 kg", "sub-orbit") and ' +
    'place them into the tool inputs — never leave a kernel default when the user ' +
    'gave a number. When the user wants to WORK A SCENARIO ("how do I launch a 100 kg ' +
    'payload?"), call compose_scenario ONCE with an ordered formula ladder: seed inputs ' +
    'only with the user\'s stated values, and WIRE an earlier step\'s output into a later ' +
    "step's input rather than copying any computed number yourself. " +
    `Respond in locale "${locale}".`
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
  // The latest composed ladder (slice #541). The client recomputes + renders it;
  // here we only recompute a figure-stripped summary for the model to narrate from.
  let scenario: AskScenario | undefined;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const msg = await chat(deps, messages);
    messages.push(msg);
    if (!msg.tool_calls?.length) {
      return {
        answer: msg.content ?? '',
        toolCalls,
        scenario,
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
        if (call.function.name === COMPOSE_SCENARIO_TOOL) {
          // The kernel recomputes the whole ladder (wires propagate the user's numbers);
          // the model gets a compact, figure-stripped summary to narrate from.
          scenario = parseScenarioArgs(args);
          result = { steps: summariseScenario(scenario, REGISTRY) };
        } else {
          const { result: r, localized } = callTool(REGISTRY, call.function.name, args, t);
          result = { ...r, localized };
        }
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
  // Out of tool rounds. Rather than a dead-end, force ONE final narration pass
  // with tools DISABLED so the user always gets an answer synthesized from the
  // kernel results already computed (#464 follow-up: guaranteed synthesis). Only
  // if that pass itself fails/returns nothing do we fall back to the honest
  // budget message (localized ×14, full-arc review MINOR-2).
  try {
    messages.push({
      role: 'user',
      content:
        'You have used all available tool calls. Do NOT request more tools. Write ' +
        'the final answer for the user now, using ONLY the tool results above.',
    });
    const final = await chat(deps, messages, false);
    const answer = (final.content ?? '').trim();
    if (answer) {
      return {
        answer,
        toolCalls,
        scenario,
        model: deps.model,
        requestId: randomBytes(8).toString('hex'),
      };
    }
  } catch {
    // fall through to the honest budget message
  }
  return {
    answer: t('lab.ask.budget-exhausted'),
    toolCalls,
    scenario,
    model: deps.model,
    requestId: randomBytes(8).toString('hex'),
  };
}
