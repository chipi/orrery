/**
 * Server-side observability for lab-api and mcp (ADR-094): errors → GlitchTip,
 * traces → VictoriaTraces (OTLP), metrics → /metrics on an internal port,
 * one access-log line per request, Umami server events.
 *
 * Off until `initObservability()` runs (each service's main.ts only), and each
 * signal only when its env is set — so tests, CI image smoke runs and forks
 * send nothing. The servers ship as one esbuild bundle with no node_modules,
 * so there is no require-hook auto-instrumentation: spans are opened here.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import * as Sentry from '@sentry/node';
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { Counter, Histogram, Registry } from 'prom-client';

export type ServiceName = 'orrery-lab-api' | 'orrery-mcp';

export interface ObsConfig {
  service: ServiceName;
  environment: string;
  /** `sha-<7>` (homelab ADR-0010), from ORRERY_RELEASE. */
  release?: string;
  sentryDsn?: string;
  otlpTracesEndpoint?: string;
  metricsPort?: number;
  umami?: { host: string; websiteId: string; hostname: string };
}

export function obsConfigFromEnv(service: ServiceName, env = process.env): ObsConfig {
  const umamiHost = env.UMAMI_HOST?.trim();
  const umamiSite = env.UMAMI_WEBSITE_ID?.trim();
  return {
    service,
    environment: env.ORRERY_ENVIRONMENT || (env.NODE_ENV === 'production' ? 'prod' : 'dev'),
    release: env.ORRERY_RELEASE || undefined,
    sentryDsn: env.SENTRY_DSN || undefined,
    otlpTracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || undefined,
    metricsPort: env.METRICS_PORT ? Number(env.METRICS_PORT) : undefined,
    umami:
      umamiHost && umamiSite
        ? { host: umamiHost, websiteId: umamiSite, hostname: env.UMAMI_HOSTNAME || service }
        : undefined,
  };
}

interface State {
  cfg: ObsConfig;
  log: (line: string) => void;
  sentry: boolean;
  tracing: boolean;
  provider?: TracerProvider;
  metricsServer?: Server;
}

let state: State | null = null;

/** Every series the services export. One registry per process; tests read it too. */
export const registry = new Registry();
const requests = new Counter({
  name: 'http_server_requests_total',
  help: 'HTTP requests by route, method and status.',
  labelNames: ['service', 'route', 'method', 'status'] as const,
  registers: [registry],
});
const requestDuration = new Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'HTTP request latency by route, method and status.',
  labelNames: ['service', 'route', 'method', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [registry],
});
const toolCalls = new Counter({
  name: 'mcp_tool_calls_total',
  help: 'Physics tool calls by tool and outcome (ok | invalid | unknown | busy | error).',
  labelNames: ['service', 'tool', 'outcome'] as const,
  registers: [registry],
});
const toolDuration = new Histogram({
  name: 'mcp_tool_duration_seconds',
  help: 'Physics tool compute time by tool.',
  labelNames: ['service', 'tool'] as const,
  buckets: [0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

const tracer = () => trace.getTracer('orrery-server');

/** Paths that are never traced or access-logged (probes and scrapes would drown the signal). */
const QUIET_PATHS = new Set(['/health', '/metrics']);

export function initObservability(
  cfg: ObsConfig,
  log: (line: string) => void = (l) => console.log(l),
): void {
  if (state) return;
  state = { cfg, log, sentry: false, tracing: false };

  if (cfg.sentryDsn) {
    Sentry.init({
      dsn: cfg.sentryDsn,
      environment: cfg.environment,
      release: cfg.release,
      // Errors only: traces go to VictoriaTraces through the tracer below.
      skipOpenTelemetrySetup: true,
      registerEsmLoaderHooks: false,
      sendDefaultPii: false,
      beforeSend(event) {
        // No headers, cookies, bodies or user identity ever leave the process.
        if (event.request) {
          delete event.request.headers;
          delete event.request.cookies;
          delete event.request.data;
          delete event.request.query_string;
        }
        delete event.user;
        return event;
      },
    });
    Sentry.setTag('service', cfg.service);
    state.sentry = true;
  }

  if (cfg.otlpTracesEndpoint) {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    const provider = new TracerProvider({
      resource: resourceFromAttributes({
        'service.name': cfg.service,
        'deployment.environment': cfg.environment,
        ...(cfg.release ? { 'service.version': cfg.release } : {}),
      }),
      spanProcessors: [
        new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({ url: cfg.otlpTracesEndpoint }),
        }),
      ],
    });
    trace.setGlobalTracerProvider(provider);
    state.provider = provider;
    state.tracing = true;
  }

  if (cfg.metricsPort !== undefined) {
    state.metricsServer = createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/metrics') {
        void registry.metrics().then((body) => {
          res.writeHead(200, { 'content-type': registry.contentType });
          res.end(body);
        });
        return;
      }
      res.writeHead(404);
      res.end();
    }).listen(cfg.metricsPort);
  }
}

/** Flush spans and errors; for shutdown and tests. */
export async function shutdownObservability(): Promise<void> {
  if (!state) return;
  const s = state;
  state = null;
  await Promise.all([
    s.provider?.shutdown(),
    s.sentry ? Sentry.close(2000) : undefined,
    s.metricsServer
      ? new Promise<void>((resolve) => s.metricsServer!.close(() => resolve()))
      : undefined,
  ]);
  if (s.tracing) {
    trace.disable();
    context.disable();
    propagation.disable();
  }
}

/** The active trace id (32 hex), when tracing is on. */
export function currentTraceId(): string | undefined {
  const ctx = trace.getSpan(context.active())?.spanContext();
  return ctx && trace.isSpanContextValid(ctx) ? ctx.traceId : undefined;
}

/** Report an error to GlitchTip (no-op when Sentry is off). */
export function captureError(e: unknown, tags: Record<string, string> = {}): void {
  if (!state?.sentry) return;
  Sentry.withScope((scope) => {
    for (const [k, v] of Object.entries(tags)) scope.setTag(k, v);
    const traceId = currentTraceId();
    if (traceId) scope.setTag('trace_id', traceId);
    Sentry.captureException(e);
  });
}

/**
 * Run `fn` in a child span of the active one. A thrown error marks the span
 * failed and propagates.
 */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: (span: Span) => Promise<T> | T,
): Promise<T> {
  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn(span);
    } catch (e) {
      span.recordException(e as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw e;
    } finally {
      span.end();
    }
  });
}

/**
 * Instrument one HTTP request: a server span (continuing an inbound
 * `traceparent`), request metrics, and one access-log line. `route` must come
 * from a fixed set (it's a metric label). `run` executes inside the span.
 */
export async function instrumentRequest(
  req: IncomingMessage,
  res: ServerResponse,
  route: string,
  run: () => Promise<void>,
): Promise<void> {
  const s = state;
  if (!s) return run();
  const method = req.method ?? 'GET';
  const path = (req.url ?? '/').split('?', 1)[0];
  const quiet = QUIET_PATHS.has(path);
  const started = process.hrtime.bigint();
  const parent = propagation.extract(context.active(), req.headers);
  const span = quiet
    ? undefined
    : tracer().startSpan(
        `${method} ${route}`,
        {
          kind: SpanKind.SERVER,
          attributes: { 'http.request.method': method, 'http.route': route },
        },
        parent,
      );
  const traceId = span?.spanContext().traceId;

  res.once('close', () => {
    const status = res.statusCode;
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    const labels = { service: s.cfg.service, route, method, status: String(status) };
    requests.inc(labels);
    requestDuration.observe(labels, seconds);
    if (span) {
      span.setAttribute('http.response.status_code', status);
      if (status >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
    }
    if (!quiet) {
      const valid = traceId && trace.isSpanContextValid(span!.spanContext());
      s.log(
        `[${s.cfg.service}] ${method} ${route} -> ${status} in ${(seconds * 1000).toFixed(1)}ms` +
          (valid ? ` trace_id=${traceId}` : ''),
      );
    }
  });

  const ctx = span ? trace.setSpan(parent, span) : parent;
  return context.with(ctx, run);
}

export type ToolOutcome = 'ok' | 'invalid' | 'unknown' | 'busy' | 'error';

/** Count and time one physics-tool call; emits the Umami event too. */
export function recordToolCall(tool: string, outcome: ToolOutcome, seconds?: number): void {
  const s = state;
  if (!s) return;
  toolCalls.inc({ service: s.cfg.service, tool, outcome });
  if (seconds !== undefined) toolDuration.observe({ service: s.cfg.service, tool }, seconds);
  trackEvent('tool-call', { tool, outcome });
}

/**
 * One Umami server-side event (fire-and-forget). Callers pass only bounded
 * values — never user ids, arguments or prompt text.
 */
export function trackEvent(name: string, data: Record<string, string>): void {
  const umami = state?.cfg.umami;
  if (!umami) return;
  void fetch(`${umami.host}/api/send`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: {
      'content-type': 'application/json',
      // Umami drops requests without a browser-like user agent.
      'user-agent': `Mozilla/5.0 (compatible; ${state!.cfg.service})`,
    },
    body: JSON.stringify({
      type: 'event',
      payload: {
        website: umami.websiteId,
        hostname: umami.hostname,
        url: `/${state!.cfg.service}`,
        name,
        data,
      },
    }),
  }).catch(() => {});
}

/**
 * LiteLLM `metadata` for one LLM call, so Langfuse joins it to this request's
 * trace. `requestId` groups one /ask's calls; it is per request, never a user id.
 */
export function llmMetadata(requestId: string, generationName: string): Record<string, string> {
  const s = state;
  if (!s) return {};
  const traceId = currentTraceId();
  return {
    ...(traceId ? { trace_id: traceId } : {}),
    trace_name: 'orrery ask',
    session_id: requestId,
    generation_name: generationName,
    ...(s.cfg.release ? { trace_release: s.cfg.release } : {}),
  };
}

/** A short random id for correlating one request's work (16 hex). */
export function newRequestId(): string {
  return randomBytes(8).toString('hex');
}
