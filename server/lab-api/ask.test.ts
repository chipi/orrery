/**
 * /ask with a stubbed LiteLLM (pre-review F4): the KERNEL's callTool produces
 * the numbers (deterministic — asserted against a direct registry call), the
 * LLM narration is passthrough, and LLM-down maps to LlmUnavailableError.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { REGISTRY } from '$lib/physics/registry';
import { ask, LlmUnavailableError, type AskDeps } from './ask';
import { callTool } from '../mcp/registry-tools';
import { makeT } from '../mcp/i18n';

let stub: Server;
let deps: AskDeps;
/** Scripted assistant turns, consumed in order. */
let script: unknown[] = [];
let received: { authorization?: string; toolNames?: string[] }[] = [];

beforeAll(async () => {
  stub = createServer((req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString()) as {
        tools?: { function: { name: string } }[];
      };
      received.push({
        authorization: req.headers.authorization,
        toolNames: body.tools?.map((t) => t.function.name),
      });
      const turn = script.shift();
      if (turn === undefined) {
        res.writeHead(500);
        res.end('script exhausted');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: turn }] }));
    })();
  });
  await new Promise<void>((r) => stub.listen(0, '127.0.0.1', r));
  const port = (stub.address() as { port: number }).port;
  deps = { llmBaseUrl: `http://127.0.0.1:${port}`, llmApiKey: 'test-key', model: 'test-model' };
});

afterAll(() => {
  stub?.close();
});

describe('ask', () => {
  it('LLM selects a tool, the kernel computes, narration is passthrough', async () => {
    script = [
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            function: { name: 'interplanetary-transfer', arguments: '{}' },
          },
        ],
      },
      { role: 'assistant', content: 'The kernel says the transfer takes X days.' },
    ];
    received = [];
    const out = await ask('How long to Mars?', 'en-US', deps);

    expect(out.answer).toBe('The kernel says the transfer takes X days.');
    expect(out.model).toBe('test-model');
    expect(out.toolCalls).toHaveLength(1);
    expect(out.toolCalls[0].tool).toBe('interplanetary-transfer');
    // Deterministic: identical to calling the kernel directly.
    const direct = callTool(REGISTRY, 'interplanetary-transfer', {}, makeT('en-US'));
    expect(out.toolCalls[0].result).toEqual({ ...direct.result, localized: direct.localized });
    // The full registry (no S4 domain gate) went out as the function schema.
    expect(received[0].toolNames).toContain('interplanetary-transfer');
    expect(received[0].authorization).toBe('Bearer test-key');
  });

  it('a validate-REJECTED call is fed back to the LLM, never clamped', async () => {
    script = [
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call-1',
            function: {
              name: 'interplanetary-transfer',
              arguments: '{"notAField": 12}',
            },
          },
        ],
      },
      { role: 'assistant', content: 'Retried conceptually.' },
    ];
    const out = await ask('bad call', 'en-US', deps);
    expect(out.toolCalls[0].result).toHaveProperty('error');
    expect(String((out.toolCalls[0].result as { error: string }).error)).toMatch(/notAField/);
    expect(out.answer).toBe('Retried conceptually.');
  });

  it('no tool picked → plain answer, empty toolCalls', async () => {
    script = [{ role: 'assistant', content: 'Conceptual answer, no numbers.' }];
    const out = await ask('what is a Hohmann transfer?', 'en-US', deps);
    expect(out.toolCalls).toEqual([]);
    expect(out.answer).toBe('Conceptual answer, no numbers.');
  });

  it('LLM down → LlmUnavailableError', async () => {
    const dead: AskDeps = { ...deps, llmBaseUrl: 'http://127.0.0.1:1' };
    await expect(ask('anything', 'en-US', dead)).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it('tool-round budget exhausts honestly', async () => {
    const toolTurn = {
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'c', function: { name: 'interplanetary-transfer', arguments: '{}' } }],
    };
    script = [toolTurn, toolTurn, toolTurn, toolTurn];
    const out = await ask('loop forever', 'en-US', deps);
    expect(out.toolCalls).toHaveLength(4);
    expect(out.answer).toMatch(/budget exhausted/);
  });
});
