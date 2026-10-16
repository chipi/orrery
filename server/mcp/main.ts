/**
 * Process entry for the Orrery MCP server — dev: `npx tsx server/mcp/main.ts`.
 * Observability starts here only, so tests that start the server stay silent (ADR-094).
 */
import { initObservability, obsConfigFromEnv } from '../observability';
import { startServer } from './index';

initObservability(obsConfigFromEnv('orrery-mcp'));
startServer();
