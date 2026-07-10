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

      expect(() => {
        initWebglRecovery();
      }).not.toThrow();

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
});
