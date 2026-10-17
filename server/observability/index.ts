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
import { createLogPusher, teeConsole, type LogPusher } from './log-push';

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
  /** VictoriaLogs jsonline URL; set only where no Alloy ships stdout (dev). */
  logsPushUrl?: string;
}

interface TierTargets {
  sentryDsn?: string;
  otlpTracesEndpoint?: string;
  logsPushUrl?: string;
  umami?: { host: string; websiteId: string };
}

// The telemetry ladder (ADR-082 + its 2026-10-17 amendment), same rule as the browser
// bundle. A deploy-provided value always wins. Otherwise only dev and staging have
// built-in targets; prod has none in code, so a prod run missing a target sends
// nothing for it (fail closed, never to another tier), and tests never send.
// - dev: a local run, through the tailnet TLS nodes that only the operator's machines
//   reach (anyone else's run sends nothing). Errors share the web's dev project 30,
//   separated by the `service` tag. Logs are pushed directly (no Alloy on laptops).
// - staging: no server runs there today (GitHub Pages is static); these make a future
//   staging server consistent from day one. Errors and Umami go through the public
//   edges (as the staging web does); traces need a tailnet box. No log push: a
//   staging host would ship stdout with Alloy, like prod.
// DSN keys are public ingest keys, the same ones the browser bundles ship.
export const TIER_TARGETS: Record<string, TierTargets> = {
  dev: {
    sentryDsn: 'https://183d550946d24740a87983a1b75d86ee@glitchtip.tail6d0ed4.ts.net/30',
    otlpTracesEndpoint: 'https://vtraces.tail6d0ed4.ts.net/insert/opentelemetry/v1/traces',
    logsPushUrl:
      'https://vlogs.tail6d0ed4.ts.net/insert/jsonline?_stream_fields=app,service,environment,instance&_msg_field=_msg&_time_field=_time',
    // "Orrery (dev)" (created 2026-10-17, operator decision): dev activity is tracked.
    umami: {
      host: 'https://umami.tail6d0ed4.ts.net',
      websiteId: '90cbabf7-ae88-45c9-a417-0cd808749602',
    },
  },
  staging: {
    sentryDsn: 'https://bb3908e53882411cb896caa31072a4db@telemetry.orrerylearn.com/6',
    otlpTracesEndpoint: 'https://vtraces.tail6d0ed4.ts.net/insert/opentelemetry/v1/traces',
    umami: {
      host: 'https://analytics.orrerylearn.com',
      websiteId: '6e7ddfce-1437-49b9-8b77-a36d3584ccad',
    },
  },
};

/** Kept for callers/tests that name the dev rung directly. */
export const DEV_SERVER_TARGETS = TIER_TARGETS.dev;

/**
 * The tier: ORRERY_ENVIRONMENT when set (deploys set it); otherwise the images'
 * NODE_ENV=production is prod, vitest's NODE_ENV=test is test, and anything else
 * (a local run) is dev.
 */
export function obsTier(env: NodeJS.ProcessEnv = process.env): string {
  if (env.ORRERY_ENVIRONMENT) return env.ORRERY_ENVIRONMENT;
  if (env.NODE_ENV === 'production') return 'prod';
  if (env.NODE_ENV === 'test') return 'test';
  return 'dev';
}

export function obsConfigFromEnv(service: ServiceName, env = process.env): ObsConfig {
  const umamiHost = env.UMAMI_HOST?.trim();
  const umamiSite = env.UMAMI_WEBSITE_ID?.trim();
  const environment = obsTier(env);
  const tier: TierTargets = TIER_TARGETS[environment] ?? {};
  const umami = umamiHost && umamiSite ? { host: umamiHost, websiteId: umamiSite } : tier.umami;
  return {
    service,
    environment,
    release: env.ORRERY_RELEASE || undefined,
    sentryDsn: env.SENTRY_DSN || tier.sentryDsn,
    otlpTracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || tier.otlpTracesEndpoint,
    metricsPort: env.METRICS_PORT ? Number(env.METRICS_PORT) : undefined,
    umami: umami ? { ...umami, hostname: env.UMAMI_HOSTNAME || service } : undefined,
    logsPushUrl: env.ORRERY_LOGS_PUSH_URL || tier.logsPushUrl,
  };
}

interface State {
  cfg: ObsConfig;
  log: (line: string) => void;
  sentry: boolean;
  tracing: boolean;
  provider?: TracerProvider;
  metricsServer?: Server;
  umamiDropReported?: boolean;
  logPusher?: LogPusher;
  untee?: () => void;
}

let state: State | null = null;

/** Every series the services export. One registry per process; tests read it too. */
export const registry = new Registry();
const requests = new Counter({
  name: 'http_server_requests_total',
  help: 'HTTP requests by route, method and status.',
  labelNames: ['route', 'method', 'status'] as const,
  registers: [registry],
});
const requestDuration = new Histogram({
  name: 'http_server_request_duration_seconds',
  help: 'HTTP request latency by route, method and status.',
  labelNames: ['route', 'method', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [registry],
});
const toolCalls = new Counter({
  name: 'mcp_tool_calls_total',
  help: 'Physics tool calls by tool and outcome (ok | invalid | unknown | busy | error).',
  labelNames: ['tool', 'outcome'] as const,
  registers: [registry],
});
const toolDuration = new Histogram({
  name: 'mcp_tool_duration_seconds',
  help: 'Physics tool compute time by tool.',
  labelNames: ['tool'] as const,
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

  // Dev only by default: no Alloy on a laptop, so ship our own stdout (access lines
  // included, via the console tee) to VictoriaLogs. Prod/staging never set this.
  if (cfg.logsPushUrl) {
    state.logPusher = createLogPusher({
      url: cfg.logsPushUrl,
      service: cfg.service,
      environment: cfg.environment,
    });
    state.untee = teeConsole(state.logPusher);
  }

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
  s.untee?.();
  await Promise.all([
    s.logPusher?.stop(),
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
    const labels = { route, method, status: String(status) };
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
  toolCalls.inc({ tool, outcome });
  if (seconds !== undefined) toolDuration.observe({ tool }, seconds);
  trackEvent('tool-call', { tool, outcome });
}

/**
 * One Umami server-side event (fire-and-forget). Callers pass only bounded
 * values — never user ids, arguments or prompt text.
 */
export function trackEvent(name: string, data: Record<string, string>): void {
  const s = state;
  const umami = s?.cfg.umami;
  if (!s || !umami) return;
  void fetch(`${umami.host}/api/send`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: {
      'content-type': 'application/json',
      'user-agent': umamiUserAgent(s.cfg.service),
    },
    body: JSON.stringify({
      type: 'event',
      payload: {
        website: umami.websiteId,
        hostname: umami.hostname,
        url: `/${s.cfg.service}`,
        name,
        data,
      },
    }),
  })
    .then(async (res) => {
      // Umami's bot filter answers a dropped event with 200 {"beep":"boop"}.
      const body = await res.text();
      if (!res.ok || body.includes('beep'))
        reportUmamiDrop(s, `HTTP ${res.status} ${body.slice(0, 80)}`);
    })
    .catch((e) => reportUmamiDrop(s, String(e)));
}

/**
 * Umami's bot filter discards non-browser user agents (it answers 200
 * {"beep":"boop"} and stores nothing), so the server sends a browser UA with
 * its own name appended. This exact form was probed against the homelab Umami
 * on 2026-10-16 and stored; `<name>/1.0 (+server-side)` and
 * `Mozilla/5.0 (compatible; …)` were both dropped.
 */
export function umamiUserAgent(service: string): string {
  return (
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    `Chrome/141.0.0.0 Safari/537.36 ${service}/1.0`
  );
}

/** Log the first dropped Umami event per process, so a silent drop can't go unnoticed again. */
function reportUmamiDrop(s: State, reason: string): void {
  if (s.umamiDropReported) return;
  s.umamiDropReported = true;
  s.log(`[${s.cfg.service}] umami event not stored (${reason}); later drops not logged`);
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
