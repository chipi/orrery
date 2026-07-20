// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initWebglRecovery } from './webgl-recovery';
import { Capacitor } from '@capacitor/core';

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

// Mock @capacitor/app — the native path dynamically imports it for the
// appStateChange listener. Without this the real plugin would call
// registerPlugin() on the mocked core (which omits it) and reject the
// fire-and-forget import as an unhandled rejection under CI timing.
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) },
}));

import { App } from '@capacitor/app';

// The Capacitor App.addListener type is a set of strict overloads; vi.mocked()
// preserves them, making mockImplementation's handler param infer as never.
// Cast once here to a loose signature for all per-test mockImplementation calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addListenerMock = App.addListener as unknown as {
  mockImplementation: (fn: (...args: any[]) => any) => void;
};

describe('initWebglRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('browser build', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    });

    it('returns a function when not on native platform', () => {
      const result = initWebglRecovery();
      expect(typeof result).toBe('function');
    });

    it('returned function is safe to call', () => {
      const teardown = initWebglRecovery();
      expect(() => teardown()).not.toThrow();
    });

    it('does not attach event listeners on browser', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      initWebglRecovery();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function),
        true,
      );
      addEventListenerSpy.mockRestore();
    });
  });

  describe('native platform', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it('attaches event listeners on native platform', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const teardown = initWebglRecovery();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function),
        true,
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextrestored',
        expect.any(Function),
        true,
      );
      teardown();
      addEventListenerSpy.mockRestore();
    });

    it('calls preventDefault on webglcontextlost', () => {
      const teardown = initWebglRecovery();

      const event = new Event('webglcontextlost', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      teardown();
      preventDefaultSpy.mockRestore();
    });

    it('removes listeners when destroyed', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const teardown = initWebglRecovery();

      teardown();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextlost',
        expect.any(Function),
        true,
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextrestored',
        expect.any(Function),
        true,
      );
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('teardown / destroy', () => {
    it('can be called multiple times safely', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      const teardown = initWebglRecovery();

      expect(() => {
        teardown();
        teardown();
      }).not.toThrow();
    });

    it('prevents operations after teardown', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const teardown = initWebglRecovery();

      // Note: location.reload can't be easily mocked as it's a descriptor,
      // but we can verify the listener is removed
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      teardown();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webglcontextrestored',
        expect.any(Function),
        true,
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('multiple canvases', () => {
    it('checks all canvas elements', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      const canvas1 = document.createElement('canvas');
      const canvas2 = document.createElement('canvas');
      document.body.appendChild(canvas1);
      document.body.appendChild(canvas2);

      let teardown!: () => void;
      expect(() => {
        teardown = initWebglRecovery();
      }).not.toThrow();
      teardown();

      document.body.removeChild(canvas1);
      document.body.removeChild(canvas2);
    });
  });

  describe('edge cases', () => {
    it('handles missing canvas gracefully', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      expect(() => {
        const teardown = initWebglRecovery();
        teardown();
      }).not.toThrow();
    });

    it('handles canvas without getContext', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      const canvas = document.createElement('canvas');
      (canvas as { getContext: unknown }).getContext = null;
      document.body.appendChild(canvas);

      expect(() => {
        const teardown = initWebglRecovery();
        teardown();
      }).not.toThrow();

      document.body.removeChild(canvas);
    });
  });

  // ── anyContextLost via appStateChange ─────────────────────────────────
  describe('anyContextLost + appStateChange integration', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      // Re-establish the App.addListener mock so it is callable after
      // vi.clearAllMocks() strips the implementation in the outer beforeEach.
      vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() } as never);
    });

    it('reloads when foregrounded and a canvas context is lost', async () => {
      // Stub location.reload (jsdom does not implement it).
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      // Create a canvas whose WebGL context reports isContextLost() = true.
      const canvas = document.createElement('canvas');
      const fakeGl = {
        isContextLost: () => true,
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(fakeGl as unknown as WebGL2RenderingContext);
      document.body.appendChild(canvas);

      // Object wrapper avoids TypeScript narrowing let-assigned closures to never.
      const capture: { handler: ((arg: { isActive: boolean }) => void) | null } = { handler: null };
      addListenerMock.mockImplementation(
        async (event: string, handler: (arg: { isActive: boolean }) => void) => {
          if (event === 'appStateChange') {
            capture.handler = handler;
          }
          return { remove: vi.fn() };
        },
      );

      const teardown = initWebglRecovery();
      await new Promise((r) => setTimeout(r, 0));

      if (capture.handler) capture.handler({ isActive: true });
      expect(reloadSpy).toHaveBeenCalledOnce();

      teardown();
      document.body.removeChild(canvas);
    });

    it('does NOT reload when foregrounded but no context is lost', async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      const canvas = document.createElement('canvas');
      const healthyGl = { isContextLost: () => false };
      vi.spyOn(canvas, 'getContext').mockReturnValue(
        healthyGl as unknown as WebGL2RenderingContext,
      );
      document.body.appendChild(canvas);

      const capture: { handler: ((arg: { isActive: boolean }) => void) | null } = { handler: null };
      addListenerMock.mockImplementation(
        async (event: string, handler: (arg: { isActive: boolean }) => void) => {
          if (event === 'appStateChange') {
            capture.handler = handler;
          }
          return { remove: vi.fn() };
        },
      );

      const teardown = initWebglRecovery();
      await new Promise((r) => setTimeout(r, 0));

      if (capture.handler) capture.handler({ isActive: true });
      expect(reloadSpy).not.toHaveBeenCalled();

      teardown();
      document.body.removeChild(canvas);
    });

    it('does NOT reload when appStateChange fires with isActive=false', async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      const capture: { handler: ((arg: { isActive: boolean }) => void) | null } = { handler: null };
      addListenerMock.mockImplementation(
        async (event: string, handler: (arg: { isActive: boolean }) => void) => {
          if (event === 'appStateChange') {
            capture.handler = handler;
          }
          return { remove: vi.fn() };
        },
      );

      const teardown = initWebglRecovery();
      await new Promise((r) => setTimeout(r, 0));

      if (capture.handler) capture.handler({ isActive: false });
      expect(reloadSpy).not.toHaveBeenCalled();

      teardown();
    });

    it('does NOT reload after teardown even if webglcontextrestored fires', () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      const teardown = initWebglRecovery();
      teardown();

      document.dispatchEvent(new Event('webglcontextrestored', { bubbles: true }));
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('detects lost context via webgl (webgl2 not available, fallback to webgl)', async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      // Canvas: getContext('webgl2') → null; getContext('webgl') → lost context
      const canvas = document.createElement('canvas');
      const lostGl = { isContextLost: () => true };
      vi.spyOn(canvas, 'getContext').mockImplementation((type) => {
        if (type === 'webgl2') return null;
        if (type === 'webgl') return lostGl as unknown as WebGL2RenderingContext;
        return null;
      });
      document.body.appendChild(canvas);

      const capture: { handler: ((arg: { isActive: boolean }) => void) | null } = { handler: null };
      addListenerMock.mockImplementation(
        async (event: string, handler: (arg: { isActive: boolean }) => void) => {
          if (event === 'appStateChange') {
            capture.handler = handler;
          }
          return { remove: vi.fn() };
        },
      );

      const teardown = initWebglRecovery();
      await new Promise((r) => setTimeout(r, 0));

      if (capture.handler) capture.handler({ isActive: true });
      expect(reloadSpy).toHaveBeenCalledOnce();

      teardown();
      document.body.removeChild(canvas);
    });
  });
});
