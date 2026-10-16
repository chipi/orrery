/**
 * lab-api entrypoint — the only module that binds the port (mirrors
 * server/mcp/main.ts so importing index.ts never listens). Observability
 * starts here too, so tests that build the server stay silent (ADR-094).
 */
import { initObservability, obsConfigFromEnv } from '../observability';
import { assertProductionConfig, buildLabApi, configFromEnv, PORT } from './index';

assertProductionConfig();
initObservability(obsConfigFromEnv('orrery-lab-api'));
const cfg = configFromEnv();
const { server } = await buildLabApi(cfg);
server.listen(PORT, () => {
  console.log(`[lab-api] listening on :${PORT} (issuer ${cfg.issuer})`);
});
