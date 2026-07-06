// Side-effect module: load a gitignored repo-root `.env` into process.env for
// CLI scripts (e.g. ANTHROPIC_API_KEY for the vision quality-gate). Uses the
// Node built-in loader (Node ≥20.12) — no dependency. Ambient env vars already
// set take precedence over the file, and a missing/malformed .env is a no-op
// (scripts then fall back to whatever is already in the environment).
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch {
    /* malformed .env — ignore, keep ambient env */
  }
}
