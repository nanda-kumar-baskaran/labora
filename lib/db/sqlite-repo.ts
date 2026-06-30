/**
 * SQLite Repository — offline/local mode
 * Uses @libsql/client with file:// driver for on-disk persistence.
 * No RLS: offline = single-tenant install.
 * Business logic from Postgres triggers is implemented here in JS:
 *   - invoice payment sync (paid_amt, status)
 *   - status history insertion
 *   - balance_amt computation
 */
import { createClient as createLibSqlClient, type Client, type InValue } from "@libsql/client";
import { randomBytes } from "crypto";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";
import type { IRepository } from "./interface";
import type {
  DBPatient, DBDoctor, DBTestCatalog, DBOrder, DBOrderTest,
  DBReport, DBInvoice, DBPayment, DBTenant, DBUser, DBStatusHistory,
  DBReferral, ListOptions, PaginatedResult,
  OrderStatus, TestStatus, ResultFlag,
} from "./types";

/** Cast any[] to InValue[] for libsql — we control all values so this is safe */
function args(...values: unknown[]): InValue[] {
  return values as InValue[];
}

/** Build SET clause + args for dynamic UPDATE */
function buildUpdate(data: Record<string, unknown>): { set: string; vals: InValue[] } {
  const keys = Object.keys(data);
  return {
    set: keys.map(k => `${k} = ?`).join(", "),
    vals: Object.values(data) as InValue[],
  };
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** Compute balance_amt in app layer (SQLite has no generated columns pre-3.31) */
function withBalance<T extends { total_amt: number; paid_amt: number }>(
  row: T
): T & { balance_amt: number } {
  return { ...row, balance_amt: Math.max(0, row.total_amt - row.paid_amt) };
}

/** Recompute invoice status from paid vs total */
function invoiceStatus(total: number, paid: number): string {
  if (paid <= 0) return "unpaid";
  if (paid >= total - 0.01) return "paid";
  return "partial";
}

export class SqliteRepository implements IRepository {
  private db!: Client;
  private _initialized = false;

  async init(): Promise<void> {
    // Guard: only run once per process (module-level singleton in getRepository)
    if (this._initialized) return;
    this._initialized = true;

    // Resolve DB file path:
    //   LABMS_APP_DATA_DIR = directory (Electron) → append filename
    //   LOCAL_DB_PATH      = full file path (dev .env.local)
    //   fallback           = ~/.labms/labora.db
    let dbFile: string;
    if (process.env.LABMS_APP_DATA_DIR) {
      dbFile = join(process.env.LABMS_APP_DATA_DIR, "labora.db");
    } else if (process.env.LOCAL_DB_PATH) {
      dbFile = process.env.LOCAL_DB_PATH; // already a full file path
    } else {
      dbFile = join(homedir(), ".labms", "labora.db");
    }

    // Ensure parent directory exists (never create the db file path itself as a dir)
    await mkdir(dirname(dbFile), { recursive: true }).catch(() => {});

    this.db = createLibSqlClient({ url: `file:${dbFile}` });

    // Schema inlined — no readFileSync, works in any packaged environment
    const SCHEMA = `
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_label TEXT,
  changes_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  address TEXT, city TEXT, state TEXT, pincode TEXT, phone TEXT, email TEXT,
  gstin TEXT, logo_url TEXT, report_header TEXT, report_footer TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, plan TEXT NOT NULL DEFAULT 'starter',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','staff','technician','pathologist')),
  phone TEXT, email TEXT, password_hash TEXT, is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email);
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL, qualification TEXT, specialization TEXT,
  clinic_name TEXT, phone TEXT, email TEXT,
  commission_pct REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  patient_code TEXT NOT NULL, full_name TEXT NOT NULL, dob TEXT,
  age_years INTEGER, age_months INTEGER,
  gender TEXT CHECK (gender IN ('male','female','other') OR gender IS NULL),
  phone TEXT, email TEXT, address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, patient_code)
);
CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(tenant_id, phone);
CREATE TABLE IF NOT EXISTS test_catalog (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL, short_code TEXT NOT NULL, category TEXT, sample_type TEXT,
  turnaround_hrs INTEGER NOT NULL DEFAULT 24, price REAL NOT NULL, cost REAL,
  reference_range TEXT, unit TEXT, method TEXT, is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, short_code)
);
CREATE INDEX IF NOT EXISTS idx_test_tenant ON test_catalog(tenant_id);
CREATE TABLE IF NOT EXISTS sample_orders (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  sample_id TEXT NOT NULL, patient_id TEXT NOT NULL REFERENCES patients(id),
  doctor_id TEXT REFERENCES doctors(id), referred_by TEXT,
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','collected','processing','completed','cancelled')),
  collection_time TEXT, collected_by TEXT, notes TEXT, created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, sample_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON sample_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON sample_orders(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON sample_orders(tenant_id, status);
CREATE TABLE IF NOT EXISTS order_tests (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_id TEXT NOT NULL REFERENCES sample_orders(id),
  test_id TEXT NOT NULL REFERENCES test_catalog(id),
  price REAL NOT NULL, discount_pct REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled')),
  result_value TEXT, result_unit TEXT,
  result_flag TEXT CHECK (result_flag IN ('normal','low','high','critical') OR result_flag IS NULL),
  result_notes TEXT, completed_by TEXT, completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_tests_order ON order_tests(order_id);
CREATE TABLE IF NOT EXISTS sample_status_history (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_id TEXT NOT NULL REFERENCES sample_orders(id),
  from_status TEXT, to_status TEXT NOT NULL, changed_by TEXT NOT NULL, notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_status_order ON sample_status_history(order_id);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_id TEXT NOT NULL REFERENCES sample_orders(id),
  pdf_path TEXT, pdf_url TEXT, public_token TEXT UNIQUE,
  generated_by TEXT, verified_by TEXT, verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','verified','delivered')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(public_token);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  invoice_number TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES sample_orders(id),
  patient_id TEXT NOT NULL REFERENCES patients(id),
  subtotal REAL NOT NULL, discount_amt REAL NOT NULL DEFAULT 0,
  tax_amt REAL NOT NULL DEFAULT 0, total_amt REAL NOT NULL, paid_amt REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash','card','upi','netbanking','cheque','other')),
  reference_no TEXT, collected_by TEXT NOT NULL,
  payment_date TEXT NOT NULL DEFAULT (date('now')), notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_id TEXT NOT NULL REFERENCES sample_orders(id),
  doctor_id TEXT NOT NULL REFERENCES doctors(id),
  invoice_id TEXT REFERENCES invoices(id),
  commission_pct REAL NOT NULL, commission_amt REAL NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 0, paid_on TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON referrals(tenant_id, doctor_id)
`;

    const statements = SCHEMA
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    // PRAGMAs must run before batch (they can't be in a transaction)
    await this.db.execute("PRAGMA journal_mode=WAL");
    await this.db.execute("PRAGMA synchronous=NORMAL");
    await this.db.execute("PRAGMA cache_size=-32000"); // 32MB page cache
    await this.db.execute("PRAGMA temp_store=MEMORY");
    await this.db.execute("PRAGMA mmap_size=268435456"); // 256MB mmap
    await this.db.execute("PRAGMA foreign_keys=ON");

    // Use batch() to send ALL schema statements in a single round-trip (much faster than sequential)
    try {
      await this.db.batch(statements, "write");
    } catch (e: any) {
      // batch fails if ANY statement errors — fall back to sequential for robustness
      // (e.g. indexes already exist on second startup)
      for (const stmt of statements) {
        try {
          await this.db.execute(stmt);
        } catch (err: any) {
          if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
            console.error("Schema stmt failed:", stmt.slice(0, 60), err.message);
          }
        }
      }
    }

    // ── Migrations: safe ALTER TABLE for columns added after initial release ──
    // Each is wrapped in try/catch; "duplicate column" errors are silently ignored.
    const migrations = [
      `ALTER TABLE tenants ADD COLUMN report_print_mode TEXT NOT NULL DEFAULT 'digital' CHECK (report_print_mode IN ('digital','preprinted'))`,
    ];
    for (const m of migrations) {
      try { await this.db.execute(m); } catch { /* column already exists — skip */ }
    }

    // Seed default tenant if none exists
    const { rows } = await this.db.execute("SELECT COUNT(*) as c FROM tenants");
    if (Number(rows[0]?.c ?? 0) === 0) {
      await this.seedDefaultTenant();
    }
  }

  private async seedDefaultTenant(): Promise<void> {
    const id = "local-tenant-00000001";
    await this.db.execute({
      sql: `INSERT OR IGNORE INTO tenants (id, name, slug, plan) VALUES (?, ?, ?, ?)`,
      args: [id, "My Lab", "my-lab", "starter"],
    });
  }

  private row<T>(rows: any[]): T | null {
    return rows.length > 0 ? (rows[0] as T) : null;
  }

  private rows<T>(rows: any[]): T[] {
    return rows as T[];
  }

  // ── Tenants ──────────────────────────────────────────────────────
  async getTenant(tenantId: string): Promise<DBTenant | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM tenants WHERE id = ?", args: [tenantId] });
    return this.row<DBTenant>(rows);
  }

  async updateTenant(tenantId: string, data: Partial<DBTenant>): Promise<DBTenant> {
    const safe = { ...data };
    delete (safe as any).id;
    delete (safe as any).slug;
    delete (safe as any).created_at;
    (safe as any).updated_at = now();
    const { set, vals } = buildUpdate(safe as Record<string, unknown>);
    const sql = `UPDATE tenants SET ${set} WHERE id = ?`;
    await this.db.execute({ sql, args: [...vals, tenantId] as InValue[] });
    const { rows } = await this.db.execute({ sql: "SELECT * FROM tenants WHERE id = ?", args: [tenantId] });
    return this.row<DBTenant>(rows)!;
  }

  // ── Users ─────────────────────────────────────────────────────────
  async getUser(userId: string): Promise<DBUser | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] });
    return this.row<DBUser>(rows);
  }

  async getUserByEmail(email: string, tenantId: string): Promise<DBUser | null> {
    const { rows } = await this.db.execute({
      sql: "SELECT * FROM users WHERE email = ? AND tenant_id = ? AND is_active = 1",
      args: [email, tenantId],
    });
    return this.row<DBUser>(rows);
  }

  async listUsers(tenantId: string): Promise<DBUser[]> {
    const { rows } = await this.db.execute({
      sql: "SELECT id, full_name, role, phone, email, is_active, created_at FROM users WHERE tenant_id = ? ORDER BY created_at",
      args: [tenantId],
    });
    return this.rows<DBUser>(rows);
  }

  async createUser(data: Omit<DBUser, "created_at" | "updated_at">): Promise<DBUser> {
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO users (id, tenant_id, full_name, role, phone, email, password_hash, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [data.id, data.tenant_id, data.full_name, data.role, data.phone ?? null, data.email ?? null, data.password_hash ?? null, data.is_active ? 1 : 0, t, t],
    });
    return { ...data, created_at: t, updated_at: t };
  }

  async updateUser(userId: string, tenantId: string, data: Partial<DBUser>): Promise<DBUser> {
    const safe = { ...data, updated_at: now() };
    const { set, vals } = buildUpdate(safe as Record<string, unknown>);
    const sql = `UPDATE users SET ${set} WHERE id = ? AND tenant_id = ?`;
    await this.db.execute({ sql, args: [...vals, userId, tenantId] as InValue[] });
    const { rows } = await this.db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] });
    return this.row<DBUser>(rows)!;
  }

  // ── Patients ──────────────────────────────────────────────────────
  async countPatients(tenantId: string): Promise<number> {
    const { rows } = await this.db.execute({ sql: "SELECT COUNT(*) as c FROM patients WHERE tenant_id = ?", args: [tenantId] });
    return Number(rows[0]?.c ?? 0);
  }

  async listPatients(tenantId: string, search?: string, opts?: ListOptions): Promise<PaginatedResult<DBPatient>> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let sql = "SELECT * FROM patients WHERE tenant_id = ?";
    const args: any[] = [tenantId];
    if (search) {
      sql += " AND (full_name LIKE ? OR phone LIKE ? OR patient_code LIKE ?)";
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC";
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as c");
    const { rows: countRows } = await this.db.execute({ sql: countSql, args: args as InValue[] });
    const count = Number(countRows[0]?.c ?? 0);
    const { rows } = await this.db.execute({ sql: sql + " LIMIT ? OFFSET ?", args: [...args, limit, offset] as InValue[] });
    return { data: this.rows<DBPatient>(rows), count };
  }

  async getPatient(id: string, tenantId: string): Promise<DBPatient | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM patients WHERE id = ? AND tenant_id = ?", args: [id, tenantId] });
    return this.row<DBPatient>(rows);
  }

  async createPatient(data: Omit<DBPatient, "id" | "created_at" | "updated_at">): Promise<DBPatient> {
    const id = newId();
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO patients (id, tenant_id, patient_code, full_name, dob, age_years, age_months, gender, phone, email, address, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.patient_code, data.full_name, data.dob ?? null, data.age_years ?? null, data.age_months ?? null, data.gender ?? null, data.phone ?? null, data.email ?? null, data.address ?? null, t, t],
    });
    return { ...data, id, created_at: t, updated_at: t };
  }

  async updatePatient(id: string, tenantId: string, data: Partial<DBPatient>): Promise<DBPatient> {
    const safe = { ...data, updated_at: now() };
    delete (safe as any).id;
    delete (safe as any).tenant_id;
    const { set, vals } = buildUpdate(safe as Record<string, unknown>);
    const sql = `UPDATE patients SET ${set} WHERE id = ? AND tenant_id = ?`;
    await this.db.execute({ sql, args: [...vals, id, tenantId] as InValue[] });
    return (await this.getPatient(id, tenantId))!;
  }

  // ── Test Catalog ──────────────────────────────────────────────────
  async listTests(tenantId: string): Promise<DBTestCatalog[]> {
    const { rows } = await this.db.execute({
      sql: "SELECT * FROM test_catalog WHERE tenant_id = ? AND is_active = 1 ORDER BY category, name",
      args: [tenantId],
    });
    return this.rows<DBTestCatalog>(rows);
  }

  async getTest(id: string, tenantId: string): Promise<DBTestCatalog | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM test_catalog WHERE id = ? AND tenant_id = ?", args: [id, tenantId] });
    return this.row<DBTestCatalog>(rows);
  }

  async createTest(data: Omit<DBTestCatalog, "id" | "created_at">): Promise<DBTestCatalog> {
    const id = newId();
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO test_catalog (id, tenant_id, name, short_code, category, sample_type, turnaround_hrs, price, cost, reference_range, unit, method, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.name, data.short_code, data.category ?? null, data.sample_type ?? null, data.turnaround_hrs, data.price, data.cost ?? null, data.reference_range ?? null, data.unit ?? null, data.method ?? null, data.is_active ? 1 : 0, t],
    });
    return { ...data, id, created_at: t };
  }

  async updateTest(id: string, tenantId: string, data: Partial<Pick<DBTestCatalog, "name" | "short_code" | "category" | "sample_type" | "price" | "cost" | "reference_range" | "unit" | "turnaround_hrs" | "method" | "is_active">>): Promise<DBTestCatalog> {
    const { set, vals } = buildUpdate(data);
    await this.db.execute({ sql: `UPDATE test_catalog SET ${set} WHERE id = ? AND tenant_id = ?`, args: [...vals, id, tenantId] });
    const updated = await this.getTest(id, tenantId);
    if (!updated) throw new Error("Test not found after update");
    return updated;
  }

  // ── Orders ────────────────────────────────────────────────────────
  async listOrders(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<any>> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let sql = `SELECT o.*, p.full_name as patient_full_name, p.patient_code, p.phone as patient_phone, d.full_name as doctor_full_name
               FROM sample_orders o
               LEFT JOIN patients p ON o.patient_id = p.id
               LEFT JOIN doctors d ON o.doctor_id = d.id
               WHERE o.tenant_id = ?`;
    const args: any[] = [tenantId];
    if (status) { sql += " AND o.status = ?"; args.push(status); }
    const countSql = sql.replace("SELECT o.*, p.full_name as patient_full_name, p.patient_code, p.phone as patient_phone, d.full_name as doctor_full_name", "SELECT COUNT(*) as c");
    const { rows: countRows } = await this.db.execute({ sql: countSql, args: args as InValue[] });
    const count = Number(countRows[0]?.c ?? 0);
    const { rows } = await this.db.execute({ sql: sql + " ORDER BY o.created_at DESC LIMIT ? OFFSET ?", args: [...args, limit, offset] as InValue[] });
    // reshape to match Supabase join format
    const data = rows.map((r: any) => ({
      ...r,
      patient: r.patient_full_name ? { full_name: r.patient_full_name, patient_code: r.patient_code, phone: r.patient_phone } : undefined,
      doctor: r.doctor_full_name ? { full_name: r.doctor_full_name } : undefined,
      order_tests: [{ count: 0 }], // count fetched separately if needed
    }));
    return { data, count };
  }

  async getOrder(id: string, tenantId: string): Promise<any> {
    const { rows: orderRows } = await this.db.execute({ sql: "SELECT * FROM sample_orders WHERE id = ? AND tenant_id = ?", args: [id, tenantId] });
    if (!orderRows.length) return null;
    const order = orderRows[0] as any;

    const [patientRes, doctorRes, testsRes, reportsRes, invoicesRes] = await Promise.all([
      this.db.execute({ sql: "SELECT * FROM patients WHERE id = ?", args: [order.patient_id] }),
      order.doctor_id ? this.db.execute({ sql: "SELECT full_name, phone FROM doctors WHERE id = ?", args: [order.doctor_id] }) : Promise.resolve({ rows: [] }),
      this.db.execute({
        sql: `SELECT ot.*, tc.name as test_name, tc.short_code, tc.category, tc.sample_type, tc.reference_range, tc.unit, tc.price as catalog_price
              FROM order_tests ot LEFT JOIN test_catalog tc ON ot.test_id = tc.id WHERE ot.order_id = ?`,
        args: [id],
      }),
      this.db.execute({ sql: "SELECT id, status, public_token, pdf_url, pdf_path FROM reports WHERE order_id = ?", args: [id] }),
      this.db.execute({ sql: "SELECT id, invoice_number, total_amt, paid_amt, status FROM invoices WHERE order_id = ?", args: [id] }),
    ]);

    return {
      ...order,
      patient: patientRes.rows[0] ?? null,
      doctor: doctorRes.rows[0] ?? null,
      order_tests: testsRes.rows.map((r: any) => ({
        ...r,
        test: { name: r.test_name, short_code: r.short_code, category: r.category, sample_type: r.sample_type, reference_range: r.reference_range, unit: r.unit },
      })),
      reports: reportsRes.rows,
      invoices: invoicesRes.rows.map((r: any) => withBalance(r as any)),
    };
  }

  async createOrder(data: Omit<DBOrder, "id" | "created_at" | "updated_at">): Promise<DBOrder> {
    const id = newId();
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO sample_orders (id, tenant_id, sample_id, patient_id, doctor_id, referred_by, priority, status, notes, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.sample_id, data.patient_id, data.doctor_id ?? null, data.referred_by ?? null, data.priority, data.status, data.notes ?? null, data.created_by, t, t],
    });
    return { ...data, id, created_at: t, updated_at: t };
  }

  async updateOrderStatus(id: string, tenantId: string, status: OrderStatus, changedBy: string, collectedBy?: string): Promise<void> {
    // Get current status for history
    const { rows } = await this.db.execute({ sql: "SELECT status FROM sample_orders WHERE id = ?", args: [id] });
    const fromStatus = rows[0]?.status ?? null;
    const t = now();
    const updateFields: any = { status, updated_at: t };
    if (status === "collected") {
      updateFields.collection_time = t;
      updateFields.collected_by = collectedBy ?? changedBy;
    }
    const { set: orderSet, vals: orderVals } = buildUpdate(updateFields as Record<string, unknown>);
    await this.db.execute({
      sql: `UPDATE sample_orders SET ${orderSet} WHERE id = ? AND tenant_id = ?`,
      args: [...orderVals, id, tenantId] as InValue[],
    });
    // Insert status history (replaces Postgres trigger)
    await this.db.execute({
      sql: `INSERT INTO sample_status_history (id, tenant_id, order_id, from_status, to_status, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [newId(), tenantId, id, fromStatus, status, changedBy, t],
    });
  }

  async countTodayOrders(tenantId: string): Promise<number> {
    const { rows } = await this.db.execute({
      sql: "SELECT COUNT(*) as c FROM sample_orders WHERE tenant_id = ? AND created_at >= ?",
      args: [tenantId, today()],
    });
    return Number(rows[0]?.c ?? 0);
  }

  // ── Order Tests ───────────────────────────────────────────────────
  async createOrderTests(tests: Omit<DBOrderTest, "id" | "created_at">[]): Promise<void> {
    for (const t of tests) {
      await this.db.execute({
        sql: `INSERT INTO order_tests (id, tenant_id, order_id, test_id, price, discount_pct, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [newId(), t.tenant_id, t.order_id, t.test_id, t.price, t.discount_pct, t.status, now()],
      });
    }
  }

  async updateOrderTest(id: string, orderId: string, tenantId: string, data: any): Promise<void> {
    const { set, vals } = buildUpdate(data as Record<string, unknown>);
    if (!vals.length) return;
    const sql = `UPDATE order_tests SET ${set} WHERE id = ? AND order_id = ? AND tenant_id = ?`;
    await this.db.execute({ sql, args: [...vals, id, orderId, tenantId] as InValue[] });
  }

  async getOrderTests(orderId: string, tenantId: string): Promise<DBOrderTest[]> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM order_tests WHERE order_id = ? AND tenant_id = ?", args: [orderId, tenantId] });
    return this.rows<DBOrderTest>(rows);
  }

  async allTestsDone(orderId: string, tenantId: string): Promise<boolean> {
    const { rows } = await this.db.execute({ sql: "SELECT status FROM order_tests WHERE order_id = ? AND tenant_id = ?", args: [orderId, tenantId] });
    return rows.length > 0 && rows.every((r: any) => r.status === "completed" || r.status === "cancelled");
  }

  // ── Status History ────────────────────────────────────────────────
  async getStatusHistory(orderId: string): Promise<DBStatusHistory[]> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM sample_status_history WHERE order_id = ? ORDER BY created_at ASC", args: [orderId] });
    return this.rows<DBStatusHistory>(rows);
  }

  // ── Reports ───────────────────────────────────────────────────────
  async listReports(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<any>> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let sql = `SELECT r.*, o.sample_id, p.full_name as patient_name, p.patient_code
               FROM reports r
               LEFT JOIN sample_orders o ON r.order_id = o.id
               LEFT JOIN patients p ON o.patient_id = p.id
               WHERE r.tenant_id = ?`;
    const args: any[] = [tenantId];
    if (status) { sql += " AND r.status = ?"; args.push(status); }
    const countSql = sql.replace("SELECT r.*, o.sample_id, p.full_name as patient_name, p.patient_code", "SELECT COUNT(*) as c");
    const { rows: cRows } = await this.db.execute({ sql: countSql, args: args as InValue[] });
    const count = Number(cRows[0]?.c ?? 0);
    const { rows } = await this.db.execute({ sql: sql + " ORDER BY r.created_at DESC LIMIT ? OFFSET ?", args: [...args, limit, offset] as InValue[] });
    const data = rows.map((r: any) => ({
      ...r,
      order: { sample_id: r.sample_id, patient: { full_name: r.patient_name, patient_code: r.patient_code } },
    }));
    return { data, count };
  }

  async getReportByOrder(orderId: string): Promise<DBReport | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM reports WHERE order_id = ?", args: [orderId] });
    return this.row<DBReport>(rows);
  }

  async getReportByToken(token: string): Promise<any> {
    const { rows: rRows } = await this.db.execute({ sql: "SELECT * FROM reports WHERE public_token = ? AND status = 'verified'", args: [token] });
    if (!rRows.length) return null;
    const report = rRows[0] as any;
    const order = await this.getOrder(report.order_id, report.tenant_id);
    return { ...report, order };
  }

  async createReport(data: Omit<DBReport, "id" | "created_at" | "updated_at" | "public_token">): Promise<DBReport> {
    const id = newId();
    const public_token = randomBytes(16).toString("hex");
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO reports (id, tenant_id, order_id, pdf_path, pdf_url, public_token, generated_by, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.order_id, data.pdf_path ?? null, data.pdf_url ?? null, public_token, data.generated_by ?? null, data.status, t, t],
    });
    return { ...data, id, public_token, created_at: t, updated_at: t };
  }

  async updateReport(id: string, tenantId: string, data: Partial<DBReport>): Promise<void> {
    const safe = { ...data, updated_at: now() };
    delete (safe as any).id;
    delete (safe as any).tenant_id;
    const { set, vals } = buildUpdate(safe as Record<string, unknown>);
    if (!vals.length) return;
    await this.db.execute({
      sql: `UPDATE reports SET ${set} WHERE id = ? AND tenant_id = ?`,
      args: [...vals, id, tenantId] as InValue[],
    });
  }

  async countPendingReports(tenantId: string): Promise<number> {
    const { rows } = await this.db.execute({ sql: "SELECT COUNT(*) as c FROM reports WHERE tenant_id = ? AND status = 'draft'", args: [tenantId] });
    return Number(rows[0]?.c ?? 0);
  }

  // ── Invoices ──────────────────────────────────────────────────────
  async listInvoices(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<any>> {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let sql = `SELECT i.*, p.full_name as patient_full_name, p.patient_code, o.sample_id
               FROM invoices i
               LEFT JOIN patients p ON i.patient_id = p.id
               LEFT JOIN sample_orders o ON i.order_id = o.id
               WHERE i.tenant_id = ?`;
    const args: any[] = [tenantId];
    if (status) { sql += " AND i.status = ?"; args.push(status); }
    const countSql = sql.replace("SELECT i.*, p.full_name as patient_full_name, p.patient_code, o.sample_id", "SELECT COUNT(*) as c");
    const { rows: cRows } = await this.db.execute({ sql: countSql, args: args as InValue[] });
    const count = Number(cRows[0]?.c ?? 0);
    const { rows } = await this.db.execute({ sql: sql + " ORDER BY i.created_at DESC LIMIT ? OFFSET ?", args: [...args, limit, offset] as InValue[] });
    const data = rows.map((r: any) => ({
      ...withBalance(r),
      patient: { full_name: r.patient_full_name, patient_code: r.patient_code },
      order: { sample_id: r.sample_id },
    }));
    return { data, count };
  }

  async getInvoice(id: string, tenantId: string): Promise<any> {
    const { rows } = await this.db.execute({
      sql: `SELECT i.*, p.full_name as patient_full_name, p.patient_code, o.sample_id
            FROM invoices i LEFT JOIN patients p ON i.patient_id = p.id LEFT JOIN sample_orders o ON i.order_id = o.id
            WHERE i.id = ? AND i.tenant_id = ?`,
      args: [id, tenantId],
    });
    if (!rows.length) return null;
    const r = rows[0] as any;
    return { ...withBalance(r), patient: { full_name: r.patient_full_name, patient_code: r.patient_code }, order: { sample_id: r.sample_id } };
  }

  async getInvoiceByOrder(orderId: string, tenantId: string): Promise<DBInvoice | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM invoices WHERE order_id = ? AND tenant_id = ?", args: [orderId, tenantId] });
    if (!rows.length) return null;
    const row = rows[0] as unknown as DBInvoice & { total_amt: number; paid_amt: number };
    return withBalance(row) as DBInvoice;
  }

  async createInvoice(data: Omit<DBInvoice, "id" | "created_at" | "updated_at" | "balance_amt">): Promise<DBInvoice> {
    const id = newId();
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO invoices (id, tenant_id, invoice_number, order_id, patient_id, subtotal, discount_amt, tax_amt, total_amt, paid_amt, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.invoice_number, data.order_id, data.patient_id, data.subtotal, data.discount_amt, data.tax_amt, data.total_amt, data.paid_amt, data.status, data.created_by, t, t],
    });
    return { ...data, id, balance_amt: data.total_amt - data.paid_amt, created_at: t, updated_at: t };
  }

  async getTodayRevenue(tenantId: string): Promise<number> {
    const { rows } = await this.db.execute({ sql: "SELECT SUM(amount) as total FROM payments WHERE tenant_id = ? AND payment_date >= ?", args: [tenantId, today()] });
    return Number(rows[0]?.total ?? 0);
  }

  async getPendingPaymentsTotal(tenantId: string): Promise<number> {
    const { rows } = await this.db.execute({
      sql: "SELECT SUM(total_amt - paid_amt) as total FROM invoices WHERE tenant_id = ? AND status NOT IN ('paid','cancelled')",
      args: [tenantId],
    });
    return Number(rows[0]?.total ?? 0);
  }

  // ── Payments ──────────────────────────────────────────────────────
  async listPayments(invoiceId: string, tenantId: string): Promise<DBPayment[]> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM payments WHERE invoice_id = ? AND tenant_id = ? ORDER BY created_at DESC", args: [invoiceId, tenantId] });
    return this.rows<DBPayment>(rows);
  }

  async createPayment(data: Omit<DBPayment, "id" | "created_at">): Promise<DBPayment> {
    const id = newId();
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO payments (id, tenant_id, invoice_id, amount, method, reference_no, collected_by, payment_date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.invoice_id, data.amount, data.method, data.reference_no ?? null, data.collected_by, data.payment_date, data.notes ?? null, t],
    });

    // ── Business logic from Postgres trigger: update invoice paid_amt + status ──
    const { rows: pmts } = await this.db.execute({ sql: "SELECT SUM(amount) as total FROM payments WHERE invoice_id = ?", args: [data.invoice_id] });
    const totalPaid = Number(pmts[0]?.total ?? 0);
    const { rows: invRows } = await this.db.execute({ sql: "SELECT total_amt FROM invoices WHERE id = ?", args: [data.invoice_id] });
    const total = Number(invRows[0]?.total_amt ?? 0);
    const status = invoiceStatus(total, totalPaid);
    await this.db.execute({
      sql: "UPDATE invoices SET paid_amt = ?, status = ?, updated_at = ? WHERE id = ?",
      args: [totalPaid, status, t, data.invoice_id],
    });

    return { ...data, id, created_at: t };
  }

  // ── Doctors ───────────────────────────────────────────────────────
  async listDoctors(tenantId: string): Promise<DBDoctor[]> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM doctors WHERE tenant_id = ? AND is_active = 1 ORDER BY full_name", args: [tenantId] });
    return this.rows<DBDoctor>(rows);
  }

  async getDoctor(id: string, tenantId: string): Promise<DBDoctor | null> {
    const { rows } = await this.db.execute({ sql: "SELECT * FROM doctors WHERE id = ? AND tenant_id = ?", args: [id, tenantId] });
    return this.row<DBDoctor>(rows);
  }

  async createDoctor(data: Omit<DBDoctor, "id" | "created_at">): Promise<DBDoctor> {
    const id = newId();
    const t = now();
    await this.db.execute({
      sql: `INSERT INTO doctors (id, tenant_id, full_name, qualification, specialization, clinic_name, phone, email, commission_pct, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.tenant_id, data.full_name, data.qualification ?? null, data.specialization ?? null, data.clinic_name ?? null, data.phone ?? null, data.email ?? null, data.commission_pct, data.is_active ? 1 : 0, t],
    });
    return { ...data, id, created_at: t };
  }

  // ── Referrals ─────────────────────────────────────────────────────
  async createReferral(data: Omit<DBReferral, "id" | "created_at">): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO referrals (id, tenant_id, order_id, doctor_id, commission_pct, commission_amt, is_paid, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [newId(), data.tenant_id, data.order_id, data.doctor_id, data.commission_pct, data.commission_amt, data.is_paid ? 1 : 0, now()],
    });
  }

  async listReferralsByDoctor(doctorId: string, tenantId: string): Promise<any[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT r.*, o.sample_id, o.created_at as order_created_at, p.full_name as patient_name, i.total_amt
            FROM referrals r
            LEFT JOIN sample_orders o ON r.order_id = o.id
            LEFT JOIN patients p ON o.patient_id = p.id
            LEFT JOIN invoices i ON r.invoice_id = i.id
            WHERE r.doctor_id = ? AND r.tenant_id = ? ORDER BY r.created_at DESC`,
      args: [doctorId, tenantId],
    });
    return rows.map((r: any) => ({
      ...r,
      order: { sample_id: r.sample_id, created_at: r.order_created_at, patient: { full_name: r.patient_name } },
      invoice: r.total_amt ? { total_amt: r.total_amt } : null,
    }));
  }

  async getTopDoctors(tenantId: string, since: string): Promise<{ doctor_id: string; full_name: string; count: number; commission: number }[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT r.doctor_id, d.full_name, COUNT(*) as count, SUM(r.commission_amt) as commission
            FROM referrals r LEFT JOIN doctors d ON r.doctor_id = d.id
            WHERE r.tenant_id = ? AND r.created_at >= ?
            GROUP BY r.doctor_id ORDER BY count DESC LIMIT 5`,
      args: [tenantId, since],
    });
    return rows.map((r: any) => ({ doctor_id: r.doctor_id, full_name: r.full_name, count: Number(r.count), commission: Number(r.commission) }));
  }

  // ── Dashboard ─────────────────────────────────────────────────────
  async getWeeklyOrderCounts(tenantId: string, since: string): Promise<{ date: string; count: number }[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT date(created_at) as date, COUNT(*) as count FROM sample_orders WHERE tenant_id = ? AND created_at >= ? GROUP BY date(created_at)`,
      args: [tenantId, since],
    });
    return rows.map((r: any) => ({ date: r.date, count: Number(r.count) }));
  }

  async getMonthlyRevenue(tenantId: string, since: string): Promise<{ month: string; revenue: number }[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT strftime('%Y-%m', created_at) as month, SUM(paid_amt) as revenue
            FROM invoices WHERE tenant_id = ? AND created_at >= ?
            GROUP BY strftime('%Y-%m', created_at) ORDER BY month`,
      args: [tenantId, since],
    });
    return rows.map((r: any) => ({ month: r.month, revenue: Number(r.revenue ?? 0) }));
  }

  async getOrdersByStatus(tenantId: string): Promise<{ status: string; count: number }[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT status, COUNT(*) as count FROM sample_orders WHERE tenant_id = ? GROUP BY status`,
      args: [tenantId],
    });
    return rows.map((r: any) => ({ status: r.status, count: Number(r.count) }));
  }

  async getTestPopularity(tenantId: string, since: string): Promise<{ name: string; count: number }[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT tc.name, COUNT(*) as count
            FROM order_tests ot
            JOIN test_catalog tc ON ot.test_id = tc.id
            JOIN sample_orders o ON ot.order_id = o.id
            WHERE o.tenant_id = ? AND o.created_at >= ?
            GROUP BY tc.id ORDER BY count DESC LIMIT 10`,
      args: [tenantId, since],
    });
    return rows.map((r: any) => ({ name: r.name, count: Number(r.count) }));
  }

  async getRecentPatients(tenantId: string, limit: number): Promise<{ id: string; full_name: string; patient_code: string; created_at: string }[]> {
    const { rows } = await this.db.execute({
      sql: `SELECT id, full_name, patient_code, created_at FROM patients WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`,
      args: [tenantId, limit],
    });
    return rows.map((r: any) => ({ id: r.id, full_name: r.full_name, patient_code: r.patient_code, created_at: r.created_at }));
  }

  // ── Audit Log ─────────────────────────────────────────────────────
  async createAuditLog(entry: {
    tenant_id: string; actor_id: string; actor_name: string;
    action: string; entity_type: string; entity_id: string;
    entity_label?: string; changes: Record<string, { old: unknown; new: unknown }>;
  }): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO audit_log (id, tenant_id, actor_id, actor_name, action, entity_type, entity_id, entity_label, changes_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [newId(), entry.tenant_id, entry.actor_id, entry.actor_name, entry.action,
             entry.entity_type, entry.entity_id, entry.entity_label ?? null,
             JSON.stringify(entry.changes), now()],
    });
  }

  async listAuditLogs(tenantId: string, opts?: {
    entity_type?: string; entity_id?: string; actor_id?: string;
    limit?: number; offset?: number;
  }): Promise<{ data: any[]; count: number }> {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    let sql = `SELECT * FROM audit_log WHERE tenant_id = ?`;
    const args: any[] = [tenantId];
    if (opts?.entity_type) { sql += " AND entity_type = ?"; args.push(opts.entity_type); }
    if (opts?.entity_id) { sql += " AND entity_id = ?"; args.push(opts.entity_id); }
    if (opts?.actor_id) { sql += " AND actor_id = ?"; args.push(opts.actor_id); }
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as c");
    const { rows: cRows } = await this.db.execute({ sql: countSql, args: args as InValue[] });
    const count = Number(cRows[0]?.c ?? 0);
    const { rows } = await this.db.execute({ sql: sql + " ORDER BY created_at DESC LIMIT ? OFFSET ?", args: [...args, limit, offset] as InValue[] });
    return { data: rows.map((r: any) => ({ ...r, changes: JSON.parse(r.changes_json) })), count };
  }
}
