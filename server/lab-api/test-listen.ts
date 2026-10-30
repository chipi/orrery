import { createServer, type Server } from 'node:http';

/**
 * Start a server whose config must name its own URL (the lab-api issuer) before it
 * is built. Learning a free port by binding 0 and closing leaves a window in which a
 * parallel test file can take that port (EADDRINUSE, seen 2026-10-31), so try again
 * on a fresh port when it happens.
 */
export async function listenOnFreePort(build: (port: number) => Promise<Server>): Promise<Server> {
  for (let attempt = 0; ; attempt++) {
    const probe = createServer();
    await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
    const port = (probe.address() as { port: number }).port;
    await new Promise<void>((r) => probe.close(() => r()));
    const server = await build(port);
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.off('error', reject);
          resolve();
        });
      });
      return server;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || attempt >= 4) throw e;
    }
  }
}
