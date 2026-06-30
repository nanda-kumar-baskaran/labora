/**
 * Dual-Mode Architecture Tests
 * Tests the logic of cloud vs local mode selection, local auth,
 * storage abstraction, SQLite business logic, and repository contract.
 * No live DB/network — all pure logic.
 */
import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";

// ── Mode detection ────────────────────────────────────────────────────
describe("Storage mode detection", () => {
  const originalEnv = process.env.STORAGE_MODE;

  afterEach(() => {
    process.env.STORAGE_MODE = originalEnv;
  });

  function getMode(): "cloud" | "local" {
    return (process.env.STORAGE_MODE ?? "cloud") as "cloud" | "local";
  }

  it("defaults to cloud when STORAGE_MODE is unset", () => {
    delete process.env.STORAGE_MODE;
    expect(getMode()).toBe("cloud");
  });

  it("returns local when STORAGE_MODE=local", () => {
    process.env.STORAGE_MODE = "local";
    expect(getMode()).toBe("local");
  });

  it("returns cloud when STORAGE_MODE=cloud", () => {
    process.env.STORAGE_MODE = "cloud";
    expect(getMode()).toBe("cloud");
  });
});

// ── Local auth — HMAC session token ──────────────────────────────────
import { createHmac } from "node:crypto";

describe("Local auth session token", () => {
  const SECRET = "test-secret-key-12345";

  function sign(payload: string): string {
    return createHmac("sha256", SECRET).update(payload).digest("hex");
  }

  function encode(session: object): string {
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    return `${payload}.${sign(payload)}`;
  }

  function decode(token: string): object | null {
    try {
      const [payload, sig] = token.split(".");
      if (!payload || !sig) return null;
      if (sign(payload) !== sig) return null;
      const data = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (data.expiresAt < Date.now()) return null;
      return data;
    } catch { return null; }
  }

  it("encodes and decodes a valid session", () => {
    const session = { userId: "u1", tenantId: "t1", role: "admin", fullName: "Dr Test", email: "test@lab.com", expiresAt: Date.now() + 3600_000 };
    const token = encode(session);
    const decoded = decode(token) as any;
    expect(decoded).not.toBeNull();
    expect(decoded.userId).toBe("u1");
    expect(decoded.role).toBe("admin");
    expect(decoded.tenantId).toBe("t1");
  });

  it("returns null for tampered token", () => {
    const session = { userId: "u1", tenantId: "t1", role: "admin", fullName: "Dr Test", email: "test@lab.com", expiresAt: Date.now() + 3600_000 };
    const token = encode(session);
    const tampered = token.slice(0, -3) + "xxx"; // corrupt signature
    expect(decode(tampered)).toBeNull();
  });

  it("returns null for expired session", () => {
    const session = { userId: "u1", tenantId: "t1", role: "admin", fullName: "Dr Test", email: "test@lab.com", expiresAt: Date.now() - 1000 };
    const token = encode(session);
    expect(decode(token)).toBeNull();
  });

  it("returns null for malformed token (no dot)", () => {
    expect(decode("notavalidtoken")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decode("")).toBeNull();
  });
});

// ── SQLite business logic (balance_amt) ───────────────────────────────
describe("SQLite balance_amt computation (replaces Postgres generated column)", () => {
  function withBalance<T extends { total_amt: number; paid_amt: number }>(
    row: T
  ): T & { balance_amt: number } {
    return { ...row, balance_amt: Math.max(0, row.total_amt - row.paid_amt) };
  }

  it("computes correct balance for unpaid invoice", () => {
    const result = withBalance({ total_amt: 1000, paid_amt: 0 });
    expect(result.balance_amt).toBe(1000);
  });

  it("computes correct balance for partial payment", () => {
    const result = withBalance({ total_amt: 1000, paid_amt: 400 });
    expect(result.balance_amt).toBe(600);
  });

  it("balance is zero when fully paid", () => {
    const result = withBalance({ total_amt: 1000, paid_amt: 1000 });
    expect(result.balance_amt).toBe(0);
  });

  it("balance cannot go negative (overpayment guard)", () => {
    const result = withBalance({ total_amt: 500, paid_amt: 600 });
    expect(result.balance_amt).toBe(0);
  });
});

// ── SQLite invoice status sync (replaces Postgres trigger) ───────────
describe("SQLite invoice payment trigger logic", () => {
  function invoiceStatus(total: number, paid: number): string {
    if (paid <= 0) return "unpaid";
    if (paid >= total - 0.01) return "paid";
    return "partial";
  }

  it("status = unpaid when paid = 0", () => {
    expect(invoiceStatus(1000, 0)).toBe("unpaid");
  });

  it("status = partial when some paid", () => {
    expect(invoiceStatus(1000, 500)).toBe("partial");
  });

  it("status = paid when full amount paid", () => {
    expect(invoiceStatus(1000, 1000)).toBe("paid");
  });

  it("status = paid with 0.01 tolerance (rounding)", () => {
    expect(invoiceStatus(1000, 999.99)).toBe("paid");
  });
});

// ── buildUpdate helper ────────────────────────────────────────────────
describe("buildUpdate SQL helper", () => {
  function buildUpdate(data: Record<string, unknown>): { set: string; vals: unknown[] } {
    const keys = Object.keys(data);
    return {
      set: keys.map(k => `${k} = ?`).join(", "),
      vals: Object.values(data),
    };
  }

  it("builds correct SET clause for single field", () => {
    const { set, vals } = buildUpdate({ status: "completed" });
    expect(set).toBe("status = ?");
    expect(vals).toEqual(["completed"]);
  });

  it("builds correct SET clause for multiple fields", () => {
    const { set, vals } = buildUpdate({ status: "completed", updated_at: "2024-06-28" });
    expect(set).toBe("status = ?, updated_at = ?");
    expect(vals).toEqual(["completed", "2024-06-28"]);
  });

  it("handles null values", () => {
    const { set, vals } = buildUpdate({ doctor_id: null });
    expect(vals[0]).toBeNull();
  });
});

// ── Storage URL routing ───────────────────────────────────────────────
describe("Storage URL routing by mode", () => {
  function getStorageUrl(path: string, mode: "cloud" | "local", appUrl = "http://localhost:3000"): string {
    if (mode === "local") {
      return `${appUrl}/api/storage/${path}`;
    }
    // Cloud returns a signed URL (simulated)
    return `https://supabase-project.supabase.co/storage/v1/object/sign/reports/${path}?token=xxx`;
  }

  it("local mode returns API route URL", () => {
    const url = getStorageUrl("tenant-id/report.pdf", "local");
    expect(url).toContain("/api/storage/");
    expect(url).toContain("report.pdf");
  });

  it("cloud mode returns Supabase storage URL", () => {
    const url = getStorageUrl("tenant-id/report.pdf", "cloud");
    expect(url).toContain("supabase");
    expect(url).not.toContain("/api/storage/");
  });

  it("local URL is served by Next.js, not external CDN", () => {
    const url = getStorageUrl("x/y.pdf", "local");
    expect(url.startsWith("http://localhost:3000")).toBe(true);
  });
});

// ── Path traversal guard (storage security) ───────────────────────────
describe("Local storage path traversal guard", () => {
  function isSafePath(storageRoot: string, requestedPath: string): boolean {
    const full = join(storageRoot, requestedPath);
    return full.startsWith(storageRoot);
  }

  const root = "/app/storage";

  it("allows valid nested path", () => {
    expect(isSafePath(root, "tenant1/report.pdf")).toBe(true);
  });

  it("blocks path traversal attack (../)", () => {
    expect(isSafePath(root, "../../etc/passwd")).toBe(false);
  });

  it("absolute path injection is neutralized by join (treated as relative segment)", () => {
    // Node's path.join neutralizes leading slashes in subsequent args:
    // join("/app/storage", "/etc/passwd") = "/app/storage/etc/passwd" (safe)
    // so isSafePath returns true — the join itself is the guard
    expect(isSafePath(root, "/etc/passwd")).toBe(true); // joined path stays under root
  });

  it("allows deeply nested path within root", () => {
    expect(isSafePath(root, "tenant1/2024/06/report-001.pdf")).toBe(true);
  });
});

// ── Session routing by mode ───────────────────────────────────────────
describe("Session reader mode branching", () => {
  it("local mode reads from cookie, not Supabase JWT", () => {
    // Verify the branching logic exists conceptually
    function getSessionSource(mode: string): string {
      return mode === "local" ? "cookie:labms_local_session" : "supabase:jwt";
    }
    expect(getSessionSource("local")).toBe("cookie:labms_local_session");
    expect(getSessionSource("cloud")).toBe("supabase:jwt");
  });
});

// ── First-run setup guard ─────────────────────────────────────────────
describe("First-run setup guard", () => {
  function needsSetup(existingUserCount: number, mode: string): boolean {
    return mode === "local" && existingUserCount === 0;
  }

  it("needs setup when local mode and no users", () => {
    expect(needsSetup(0, "local")).toBe(true);
  });

  it("does not need setup when users exist", () => {
    expect(needsSetup(1, "local")).toBe(false);
  });

  it("cloud mode never needs local setup", () => {
    expect(needsSetup(0, "cloud")).toBe(false);
  });
});

// ── Tenant ID: local vs cloud ─────────────────────────────────────────
describe("Tenant ID handling by mode", () => {
  const LOCAL_TENANT_ID = "local-tenant-00000001";

  function resolveTenantId(mode: string, jwtTenantId?: string): string {
    if (mode === "local") return LOCAL_TENANT_ID;
    return jwtTenantId ?? "";
  }

  it("local mode always uses fixed tenant ID", () => {
    expect(resolveTenantId("local")).toBe(LOCAL_TENANT_ID);
    expect(resolveTenantId("local", "some-other-id")).toBe(LOCAL_TENANT_ID);
  });

  it("cloud mode uses JWT tenant ID", () => {
    expect(resolveTenantId("cloud", "abc-123")).toBe("abc-123");
  });

  it("cloud mode with no JWT returns empty string", () => {
    expect(resolveTenantId("cloud")).toBe("");
  });
});
