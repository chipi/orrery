/**
 * Mobile runtime environment switcher (ADR-083). INTERNAL builds only.
 *
 * `__MOBILE_INTERNAL__` (Vite `define`, set by `MOBILE_INTERNAL=1` at build) gates
 * the whole feature:
 *   • false — web + App Store **release** builds → the app uses its single baked
 *     tier (`PUBLIC_*` / `STREAM_ORIGIN`); this module is inert. Existing behavior,
 *     untouched.
 *   • true — internal / TestFlight / simulator builds → the operator flips the
 *     target at runtime. ONE selection moves assets AND telemetry together (see
 *     asset-url.ts, sentry.ts, analytics.ts).
 *
 * Model: the target is read at STARTUP (module-eval / init). Flipping it persists
 * the choice; **relaunch to apply** — which also matches the `@sentry/capacitor`
 * native sink, which binds once at startup (ADR-083 caveat).
 *
 * On-device tiers are **staging + prod only** — the dev tier is the tailnet
 * `homelab` (ADR-082), unreachable from a device. The values below are PUBLIC
 * (they ship in every deployed bundle — see `/_app/env.js` on prod/staging), so
 * committing them leaks nothing (ADR-083).
 */

// Vite define; guarded so this module is import-safe under vitest (where the
// define is applied) and any context where it might be absent.
declare const __MOBILE_INTERNAL__: boolean;

export const MOBILE_INTERNAL: boolean =
  typeof __MOBILE_INTERNAL__ !== 'undefined' && __MOBILE_INTERNAL__ === true;

export type TargetEnv = 'staging' | 'prod';

export interface TargetConfig {
  /** Where the mobile bundle streams images/audio/other-locale bundles from. */
  streamOrigin: string;
  /** GlitchTip DSN — the project id in the path selects the tier (6=staging, 4=prod). */
  sentryDsn: string;
  sentryEnvironment: TargetEnv;
  umamiHost: string;
  umamiWebsiteId: string;
}

export const TARGET_ENVS = ['staging', 'prod'] as const;

/** Public per-tier config (verified from the live prod/staging bundles). */
const CONFIG: Record<TargetEnv, TargetConfig> = {
  staging: {
    streamOrigin: 'https://chipi.github.io/orrery',
    sentryDsn: 'https://bb3908e53882411cb896caa31072a4db@telemetry.orrerylearn.com/6',
    sentryEnvironment: 'staging',
    umamiHost: 'https://analytics.orrerylearn.com',
    umamiWebsiteId: '6e7ddfce-1437-49b9-8b77-a36d3584ccad',
  },
  prod: {
    streamOrigin: 'https://www.orrerylearn.com',
    sentryDsn: 'https://9b69bd7985fa4ce59cecdbb5c9f7febe@telemetry.orrerylearn.com/4',
    sentryEnvironment: 'prod',
    umamiHost: 'https://analytics.orrerylearn.com',
    umamiWebsiteId: '4a25d8da-63a1-4ef7-b9d3-1b6b8c8a6bce',
  },
};

const STORAGE_KEY = 'orrery.targetEnv';
const DEFAULT_ENV: TargetEnv = 'staging'; // internal default = the safe sandbox

/**
 * The active target for internal builds — from `localStorage`, defaulting to
 * staging. SSR / no-storage safe (returns the default on any failure). In
 * non-internal builds callers gate on `MOBILE_INTERNAL` and never call this.
 */
export function getTargetEnv(): TargetEnv {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'prod' ? 'prod' : v === 'staging' ? 'staging' : DEFAULT_ENV;
  } catch {
    return DEFAULT_ENV;
  }
}

/** Persist the target. Takes effect on the next launch (see module header). */
export function setTargetEnv(env: TargetEnv): void {
  try {
    localStorage.setItem(STORAGE_KEY, env);
  } catch {
    /* storage unavailable — no-op */
  }
}

/** Resolved config for the active target (internal builds). */
export function targetConfig(): TargetConfig {
  return CONFIG[getTargetEnv()];
}
