/**
 * Ask-view state (F · #535) — INSTANCE-per-page rune module, mirroring
 * lab-state.svelte.ts exactly (a module-global $state would leak across SSR
 * requests). Created in /lab/+page.svelte; the Ask view projects it, so
 * switching tabs never loses the transcript.
 *
 * The transcript is display-only and in-memory BY DESIGN: every /ask is a
 * stateless single turn ({question, locale} — no history is sent), and the UI
 * says so rather than pretending to remember.
 */
import { AskAuth, browserDeps, type AuthPhase } from './auth';
import { redirectUri } from './config';

export interface AskToolCallView {
  tool: string;
  args: Record<string, unknown>;
  result: {
    values?: Record<string, { value: number; units: string }>;
    status?: { ok: boolean; reasonKey?: string };
    assumptions?: string[];
    figure?: unknown;
    localized?: { title: string; status?: string; assumptions: string[] };
  };
}

export interface AskEntry {
  question: string;
  state: 'loading' | 'done' | 'error';
  answer?: string;
  model?: string;
  toolCalls?: AskToolCallView[];
  /** lab.ask.err-* message key for the error states. */
  errorKey?: string;
  retryAfterS?: number;
}

export interface AskState {
  readonly phase: AuthPhase;
  readonly entries: AskEntry[];
  readonly busy: boolean;
  init(): void;
  signIn(): Promise<void>;
  signOut(): void;
  ask(question: string, locale: string): Promise<void>;
}

export function createAskState(): AskState {
  let phase = $state<AuthPhase>('signed-out');
  const entries = $state<AskEntry[]>([]);
  let busy = $state(false);
  let auth: AskAuth | null = null;

  function ensureAuth(): AskAuth {
    auth ??= new AskAuth(browserDeps(), redirectUri(), (p) => {
      phase = p;
    });
    return auth;
  }

  return {
    get phase() {
      return phase;
    },
    get entries() {
      return entries;
    },
    get busy() {
      return busy;
    },

    /** Browser-only: silent refresh when a session exists (no signed-out flash). */
    init(): void {
      const a = ensureAuth();
      a.listenForRotation(window);
      if (a.hasSession()) {
        phase = 'signing-in';
        void a.refresh();
      }
    },

    async signIn(): Promise<void> {
      location.assign(await ensureAuth().beginLogin());
    },

    signOut(): void {
      ensureAuth().logout();
    },

    async ask(question: string, locale: string): Promise<void> {
      const q = question.trim();
      if (!q || busy) return;
      busy = true;
      const entry = $state<AskEntry>({ question: q, state: 'loading' });
      entries.push(entry);
      try {
        const resp = await ensureAuth().askFetch({ question: q, locale });
        if (resp.ok) {
          const body = (await resp.json()) as {
            answer: string;
            model: string;
            toolCalls: AskToolCallView[];
          };
          entry.answer = body.answer;
          entry.model = body.model;
          entry.toolCalls = body.toolCalls;
          entry.state = 'done';
          return;
        }
        entry.state = 'error';
        entry.errorKey =
          resp.status === 401
            ? 'lab.ask.err-signed-out'
            : resp.status === 403
              ? 'lab.ask.err-denied'
              : resp.status === 429
                ? 'lab.ask.err-rate'
                : resp.status === 503
                  ? 'lab.ask.err-busy'
                  : resp.status === 502
                    ? 'lab.ask.err-llm'
                    : 'lab.ask.err-generic';
        const retry = Number(resp.headers.get('retry-after'));
        if (Number.isFinite(retry) && retry > 0) entry.retryAfterS = retry;
      } catch {
        // fetch TypeError — offline or the API host unreachable.
        entry.state = 'error';
        entry.errorKey = navigator.onLine === false ? 'lab.ask.err-offline' : 'lab.ask.err-generic';
      } finally {
        busy = false;
      }
    },
  };
}
