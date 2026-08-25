/**
 * FilesystemBackend — durable offline storage via Capacitor Filesystem (RFC-040
 * §3 Contract B). Writes into `Directory.Data` under an `offline/` root, so the
 * data is app-owned, survives relaunches + storage pressure (NOT an evictable
 * browser cache), and shows under iOS "Documents & Data" / Android "User data".
 *
 * Relative manifest URLs (`/images/foo/01-1280.webp`) map to `offline/images/...`.
 * `resolve()` returns a `Capacitor.convertFileSrc(...)` URL an <img>/audio can load.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { StorageBackend } from './storage-backend';

const ROOT = 'offline';
const DIR = Directory.Data;
const pathFor = (relUrl: string) => `${ROOT}${relUrl.startsWith('/') ? '' : '/'}${relUrl}`;

/** Blob → base64 (Filesystem.writeFile wants a base64 string for binary on native). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      // reader.result is a data: URL — strip the `data:<mime>;base64,` prefix.
      const s = reader.result as string;
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export class FilesystemBackend implements StorageBackend {
  readonly kind = 'filesystem' as const;
  readonly available = Capacitor.isNativePlatform();

  async has(relUrl: string): Promise<boolean> {
    try {
      await Filesystem.stat({ path: pathFor(relUrl), directory: DIR });
      return true;
    } catch {
      return false;
    }
  }

  async write(relUrl: string, data: Blob): Promise<void> {
    await Filesystem.writeFile({
      path: pathFor(relUrl),
      data: await blobToBase64(data),
      directory: DIR,
      recursive: true, // create intermediate dirs
    });
  }

  async resolve(relUrl: string): Promise<string | null> {
    try {
      const { uri } = await Filesystem.getUri({ path: pathFor(relUrl), directory: DIR });
      return Capacitor.convertFileSrc(uri);
    } catch {
      return null;
    }
  }

  async size(): Promise<number> {
    return this.#dirBytes(ROOT);
  }

  async clear(): Promise<void> {
    try {
      await Filesystem.rmdir({ path: ROOT, directory: DIR, recursive: true });
    } catch {
      // already gone — clearing is idempotent.
    }
  }

  /** Recursively sum the byte sizes under a directory (readdir + stat). */
  async #dirBytes(path: string): Promise<number> {
    let total = 0;
    let entries: { name: string; type: string; size: number }[];
    try {
      ({ files: entries } = await Filesystem.readdir({ path, directory: DIR }));
    } catch {
      return 0; // no offline data yet
    }
    for (const e of entries) {
      if (e.type === 'directory') total += await this.#dirBytes(`${path}/${e.name}`);
      else total += e.size ?? 0;
    }
    return total;
  }
}
