// ARKit Capacitor AR backend (#207 / RFC-021 §3) — wrapped iPhone only.
// Stub: implemented in #207 (wraps the @orrery/ar-bridge Swift plugin from #206).
// Keeps the #204 factory (getArBackend) type-safe.

import type { ArBackend } from '../ar';

export function createArkitBackend(): ArBackend {
  throw new Error('ARKit AR backend not yet implemented (#207)');
}
