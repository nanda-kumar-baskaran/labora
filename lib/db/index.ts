import type { IRepository } from "./interface";

// Use globalThis to survive Next.js hot-reload in dev mode.
// In production this is a normal module singleton.
const g = globalThis as typeof globalThis & {
  __labora_repo?: IRepository;
  __labora_repo_init?: Promise<IRepository>;
};

export async function getRepository(): Promise<IRepository> {
  // Already initialized — fast path
  if (g.__labora_repo) return g.__labora_repo;

  // Prevent concurrent init (e.g. two requests arriving before init completes)
  if (g.__labora_repo_init) return g.__labora_repo_init;

  const mode = process.env.STORAGE_MODE ?? "cloud";

  g.__labora_repo_init = (async () => {
    let repo: IRepository;
    if (mode === "local") {
      const { SqliteRepository } = await import("./sqlite-repo");
      repo = new SqliteRepository();
      await (repo as any).init();
    } else {
      const { SupabaseRepository } = await import("./supabase-repo");
      repo = new SupabaseRepository();
    }
    g.__labora_repo = repo;
    g.__labora_repo_init = undefined;
    return repo;
  })();

  return g.__labora_repo_init;
}

export function resetRepository() {
  g.__labora_repo = undefined;
  g.__labora_repo_init = undefined;
}

export type { IRepository } from "./interface";
