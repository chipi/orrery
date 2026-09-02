/**
 * lab-api entrypoint — the only module that binds the port (mirrors
 * server/mcp/main.ts so importing index.ts never listens).
 */
import { assertProductionConfig, buildLabApi, configFromEnv, PORT } from './index';

assertProductionConfig();
const cfg = configFromEnv();
const { server } = await buildLabApi(cfg);
server.listen(PORT, () => {
  console.log(`[lab-api] listening on :${PORT} (issuer ${cfg.issuer})`);
});
