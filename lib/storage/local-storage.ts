import { writeFile, mkdir, unlink } from "fs/promises";
import { join, dirname } from "path";
import type { IStorage } from "./interface";

function getStorageRoot(): string {
  // Electron sets LABMS_APP_DATA_DIR to a writable user-data dir
  if (process.env.LABMS_APP_DATA_DIR) {
    return join(process.env.LABMS_APP_DATA_DIR, "storage");
  }
  return process.env.LOCAL_STORAGE_PATH ?? join(process.cwd(), "storage");
}

export class LocalStorage implements IStorage {
  async upload(path: string, buffer: Buffer, contentType: string): Promise<string> {
    const fullPath = join(getStorageRoot(), path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return path;
  }

  async getUrl(path: string, expiresInSeconds?: number): Promise<string> {
    // Served by /api/storage/[...path] route
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${appUrl}/api/storage/${path}`;
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(getStorageRoot(), path);
    try { await unlink(fullPath); } catch { /* ignore if not found */ }
  }
}
