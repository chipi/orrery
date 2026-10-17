/**
 * Observability (ADR-094) against local stub sinks — no network leaves the box.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createServer, request, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  captureError,
  DEV_SERVER_TARGETS,
  initObservability,
  instrumentRequest,
  llmMetadata,
  obsConfigFromEnv,
  recordToolCall,
  registry,
  shutdownObservability,
  trackEvent,
  withSpan,
  type ObsConfig,
} from './index';

type Hit = { method: string; url: string; headers: IncomingMessage['headers']; body: Buffer };

/** A sink that records every request it receives and answers 200. */
async function sink(): Promise<{ url: string; hits: Hit[]; close: () => Promise<void> }> {
  const hits: Hit[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      hits.push({
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers,
        body: Buffer.concat(chunks),
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    hits,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

/** An app server whose every request goes through instrumentRequest. */
async function app(route: (path: string) => string, status = 200) {
  const server: Server = createServer((req, res) => {
    void instrumentRequest(req, res, route(req.url ?? '/'), async () => {
      res.writeHead(status);
      res.end('ok');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  const get = (path: string, headers: Record<string, string> = {}) =>
    new Promise<number>((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path, headers }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      });
      req.on('error', reject);
      req.end();
    });
  return { get, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const base = (over: Partial<ObsConfig> = {}): ObsConfig => ({
  service: 'orrery-lab-api',
  environment: 'test',
  release: 'sha-abc1234',
  ...over,
});

const settle = () => new Promise((r) => setTimeout(r, 30));

afterEach(async () => {
  await shutdownObservability();
  registry.resetMetrics();
});

describe('obsConfigFromEnv', () => {
  it('a local run (no env) is dev and reports to the dev targets', () => {
    expect(obsConfigFromEnv('orrery-mcp', {})).toEqual({
      service: 'orrery-mcp',
      environment: 'dev',
      release: undefined,
      sentryDsn: DEV_SERVER_TARGETS.sentryDsn,
      otlpTracesEndpoint: DEV_SERVER_TARGETS.otlpTracesEndpoint,
      metricsPort: undefined,
      umami: { ...DEV_SERVER_TARGETS.umami, hostname: 'orrery-mcp' },
      logsPushUrl: DEV_SERVER_TARGETS.logsPushUrl,
    });
    expect(DEV_SERVER_TARGETS.sentryDsn).toMatch(/\/30$/); // orrery-dev, never prod (18)
    expect(DEV_SERVER_TARGETS.logsPushUrl).toMatch(
      /_stream_fields=app,service,environment,instance/,
    );
  });

  it('prod fails closed: no target in code, so nothing is sent', () => {
    for (const env of [{ NODE_ENV: 'production' }, { ORRERY_ENVIRONMENT: 'prod' }]) {
      const cfg = obsConfigFromEnv('orrery-lab-api', env);
      expect(cfg.environment).toBe('prod');
      expect(cfg.sentryDsn).toBeUndefined();
      expect(cfg.otlpTracesEndpoint).toBeUndefined();
      expect(cfg.umami).toBeUndefined();
      expect(cfg.logsPushUrl).toBeUndefined();
    }
  });

  it('staging uses the staging targets, never dev or prod ones, and pushes no logs', () => {
    const cfg = obsConfigFromEnv('orrery-mcp', {
      ORRERY_ENVIRONMENT: 'staging',
      NODE_ENV: 'production',
    });
    expect(cfg.environment).toBe('staging');
    expect(cfg.sentryDsn).toMatch(/@telemetry\.orrerylearn\.com\/6$/); // staging project 6
    expect(cfg.umami?.websiteId).toBe('6e7ddfce-1437-49b9-8b77-a36d3584ccad'); // staging site
    expect(cfg.logsPushUrl).toBeUndefined(); // a staging host ships stdout via Alloy
  });

  it('tests (NODE_ENV=test) never send', () => {
    const cfg = obsConfigFromEnv('orrery-mcp', { NODE_ENV: 'test' });
    expect(cfg.environment).toBe('test');
    expect(cfg.sentryDsn).toBeUndefined();
    expect(cfg.otlpTracesEndpoint).toBeUndefined();
    expect(cfg.umami).toBeUndefined();
    expect(cfg.logsPushUrl).toBeUndefined();
  });

  it('a deploy-provided target always wins, in dev too', () => {
    const cfg = obsConfigFromEnv('orrery-mcp', {
      SENTRY_DSN: 'https://k@telemetry.example/99',
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example/v1/traces',
    });
    expect(cfg.environment).toBe('dev');
    expect(cfg.sentryDsn).toBe('https://k@telemetry.example/99');
    expect(cfg.otlpTracesEndpoint).toBe('https://traces.example/v1/traces');
  });

  it('reads every signal and defaults environment from NODE_ENV', () => {
    const cfg = obsConfigFromEnv('orrery-mcp', {
      NODE_ENV: 'production',
      ORRERY_RELEASE: 'sha-1234567',
      SENTRY_DSN: 'https://k@telemetry.example/32',
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://vtraces.example/v1/traces',
      METRICS_PORT: '9464',
      UMAMI_HOST: 'https://analytics.example',
      UMAMI_WEBSITE_ID: 'site-1',
      UMAMI_HOSTNAME: 'mcp.orrerylearn.com',
    });
    expect(cfg).toMatchObject({
      environment: 'prod',
      release: 'sha-1234567',
      metricsPort: 9464,
      umami: {
        host: 'https://analytics.example',
        websiteId: 'site-1',
        hostname: 'mcp.orrerylearn.com',
      },
    });
  });

  it('needs both Umami host and site id; a half-set pair is never used', () => {
    const prod = obsConfigFromEnv('orrery-mcp', {
      NODE_ENV: 'production',
      UMAMI_HOST: 'https://a',
    });
    expect(prod.umami).toBeUndefined();
    // In dev a half-set override falls back to the complete dev pair.
    const dev = obsConfigFromEnv('orrery-mcp', { UMAMI_HOST: 'https://a' });
    expect(dev.umami?.host).toBe(DEV_SERVER_TARGETS.umami?.host);
  });
});

describe('before initObservability', () => {
  it('runs requests untouched and every helper is a no-op', async () => {
    const lines: string[] = [];
    const a = await app(() => '/x');
    expect(await a.get('/x')).toBe(200);
    await a.close();
    captureError(new Error('ignored'));
    recordToolCall('hohmann', 'ok', 0.01);
    trackEvent('tool-call', { tool: 'hohmann', outcome: 'ok' });
    expect(llmMetadata('r1', 'round-1')).toEqual({});
    expect(lines).toEqual([]);
    expect(await registry.getSingleMetricAsString('http_server_requests_total')).not.toMatch(
      /route=/,
    );
  });
});

describe('access log + request metrics', () => {
  it('logs one line per request with route and status, and skips /health', async () => {
    const lines: string[] = [];
    initObservability(base(), (l) => lines.push(l));
    const a = await app((p) => (p === '/health' ? '/health' : '/ask'), 502);
    await a.get('/ask?secret=1');
    await a.get('/health');
    await a.close();
    await settle();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[orrery-lab-api\] GET \/ask -> 502 in \d+\.\dms$/);
    const metrics = await registry.metrics();
    expect(metrics).toContain(
      'http_server_requests_total{route="/ask",method="GET",status="502"} 1',
    );
    expect(metrics).toContain('route="/health"');
    expect(metrics).not.toContain('secret');
  });

  it('serves /metrics on the internal port only', async () => {
    const probe = createServer();
    await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
    const port = (probe.address() as AddressInfo).port;
    await new Promise<void>((r) => probe.close(() => r()));
    initObservability(base({ metricsPort: port }), () => {});
    recordToolCall('hohmann', 'ok', 0.002);
    const fetchStatus = async (path: string) => {
      const res = await fetch(`http://127.0.0.1:${port}${path}`);
      return { status: res.status, body: await res.text() };
    };
    const m = await fetchStatus('/metrics');
    expect(m.status).toBe(200);
    expect(m.body).toContain('mcp_tool_calls_total{tool="hohmann",outcome="ok"} 1');
    expect(m.body).toContain('mcp_tool_duration_seconds_count');
    expect((await fetchStatus('/other')).status).toBe(404);
  });
});

describe('traces (OTLP)', () => {
  it('exports a server span, continues an inbound traceparent, and logs its trace_id', async () => {
    const otlp = await sink();
    const lines: string[] = [];
    initObservability(base({ otlpTracesEndpoint: `${otlp.url}/v1/traces` }), (l) => lines.push(l));
    const inbound = '4bf92f3577b34da6a3ce929d0e0e4736';
    const a = await app(() => '/ask');
    await a.get('/ask', { traceparent: `00-${inbound}-00f067aa0ba902b7-01` });
    await a.close();
    await settle();
    expect(lines[0]).toContain(`trace_id=${inbound}`);
    await shutdownObservability();
    expect(otlp.hits.length).toBeGreaterThan(0);
    const hit = otlp.hits[0];
    expect(hit.url).toBe('/v1/traces');
    expect(hit.headers['content-type']).toBe('application/x-protobuf');
    // The protobuf carries the service name and the span name as plain strings.
    expect(hit.body.toString('latin1')).toContain('orrery-lab-api');
    expect(hit.body.toString('latin1')).toContain('GET /ask');
    await otlp.close();
  });

  it('gives LLM metadata the active trace id, and withSpan rethrows', async () => {
    const otlp = await sink();
    initObservability(base({ otlpTracesEndpoint: `${otlp.url}/v1/traces` }), () => {});
    const meta = await withSpan('outer', {}, async () => llmMetadata('req-1', 'round-1'));
    expect(meta).toMatchObject({
      trace_name: 'orrery ask',
      session_id: 'req-1',
      generation_name: 'round-1',
      trace_release: 'sha-abc1234',
    });
    expect(meta.trace_id).toMatch(/^[0-9a-f]{32}$/);
    await expect(
      withSpan('boom', {}, async () => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');
    await shutdownObservability();
    await otlp.close();
  });
});

describe('errors (GlitchTip via @sentry/node)', () => {
  it('sends an envelope with the service tag and no request headers or user', async () => {
    const gt = await sink();
    const dsn = gt.url.replace('http://', 'http://publickey@') + '/31';
    initObservability(base({ sentryDsn: dsn }), () => {});
    captureError(new Error('kaboom'), { route: '/ask' });
    await shutdownObservability();
    // Other envelopes (client reports) can arrive too; the error rides in the one with an event item.
    const envelope = gt.hits.find(
      (h) => h.url.startsWith('/api/31/envelope') && h.body.includes('{"type":"event"'),
    );
    expect(envelope).toBeDefined();
    const text = envelope!.body.toString('utf8');
    expect(text).toContain('kaboom');
    expect(text).toContain('"service":"orrery-lab-api"');
    expect(text).toContain('"environment":"test"');
    expect(text).toContain('"release":"sha-abc1234"');
    expect(text).not.toContain('"user"');
    await gt.close();
  });
});

describe('Umami server events', () => {
  it('posts a tool-call event with only bounded fields', async () => {
    const umami = await sink();
    initObservability(
      base({
        service: 'orrery-mcp',
        umami: { host: umami.url, websiteId: 'site-1', hostname: 'mcp.orrerylearn.com' },
      }),
      () => {},
    );
    recordToolCall('hohmann', 'invalid');
    await settle();
    expect(umami.hits).toHaveLength(1);
    expect(umami.hits[0].url).toBe('/api/send');
    // The exact form probed against the homelab Umami (browser UA + sender); others get bot-dropped.
    expect(umami.hits[0].headers['user-agent']).toBe(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 orrery-mcp/1.0',
    );
    expect(JSON.parse(umami.hits[0].body.toString('utf8'))).toEqual({
      type: 'event',
      payload: {
        website: 'site-1',
        hostname: 'mcp.orrerylearn.com',
        url: '/orrery-mcp',
        name: 'tool-call',
        data: { tool: 'hohmann', outcome: 'invalid' },
      },
    });
    await umami.close();
  });

  it("logs a dropped event once (Umami's bot-filter answer is 200 beep-boop)", async () => {
    const umami = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"beep":"boop"}');
      });
    });
    await new Promise<void>((r) => umami.listen(0, '127.0.0.1', r));
    const port = (umami.address() as AddressInfo).port;
    const lines: string[] = [];
    initObservability(
      base({
        service: 'orrery-mcp',
        umami: { host: `http://127.0.0.1:${port}`, websiteId: 's', hostname: 'h' },
      }),
      (l) => lines.push(l),
    );
    recordToolCall('hohmann', 'ok');
    recordToolCall('hohmann', 'ok');
    await settle();
    expect(lines).toEqual([
      '[orrery-mcp] umami event not stored (HTTP 200 {"beep":"boop"}); later drops not logged',
    ]);
    await new Promise<void>((r) => umami.close(() => r()));
  });

  it('logs nothing when Umami stores the event', async () => {
    const umami = await sink();
    const lines: string[] = [];
    initObservability(
      base({
        service: 'orrery-mcp',
        umami: { host: umami.url, websiteId: 's', hostname: 'h' },
      }),
      (l) => lines.push(l),
    );
    recordToolCall('hohmann', 'ok');
    await settle();
    expect(lines).toEqual([]);
    await umami.close();
  });
});
