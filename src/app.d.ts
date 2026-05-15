/// <reference types="@vite-pwa/sveltekit" />
/// <reference types="vite-plugin-pwa/svelte" />

// SvelteKit-augmented types live here. The PWA plugin's virtual
// module (virtual:pwa-register/svelte) is declared via the
// triple-slash references above.
declare global {
  /**
   * App version injected at build time by Vite's `define` from
   * package.json#version. Rendered in the site footer.
   */
  const __APP_VERSION__: string;
  /**
   * Build date (ISO 8601, YYYY-MM-DD, UTC) injected at build time by
   * Vite's `define`. Rendered in the site footer next to the version
   * so visitors can see when the live deploy was last refreshed.
   */
  const __BUILD_DATE__: string;
}

export {};
