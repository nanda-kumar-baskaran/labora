import type { IStorage } from "./interface";

let _storage: IStorage | null = null;

export async function getStorage(): Promise<IStorage> {
  if (_storage) return _storage;
  const mode = process.env.STORAGE_MODE ?? "cloud";
  if (mode === "local") {
    const { LocalStorage } = await import("./local-storage");
    _storage = new LocalStorage();
  } else {
    const { SupabaseStorage } = await import("./supabase-storage");
    _storage = new SupabaseStorage("reports");
  }
  return _storage;
}

export function resetStorage() { _storage = null; }
export type { IStorage } from "./interface";
