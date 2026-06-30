-- ============================================================
-- LabMS SQLite Schema (offline / local mode)
-- Compatible with @libsql/client file:// driver
-- Key differences from Postgres schema:
--   - No UUIDs: use TEXT with application-generated IDs
--   - No JSONB: use TEXT
--   - No generated columns (balance_amt computed in app)
--   - No PL/pgSQL triggers: logic moved to SqliteRepository
--   - No RLS: single-tenant offline install
--   - No pg-specific types: BOOLEAN=INTEGER(0/1), NUMERIC=REAL
-- ============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ── TENANTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  phone           TEXT,
  email           TEXT,
  gstin           TEXT,
  logo_url        TEXT,
  report_header   TEXT,
  report_footer   TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  plan            TEXT NOT NULL DEFAULT 'starter',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── USERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','staff','technician','pathologist')),
  phone           TEXT,
  email           TEXT,
  password_hash   TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email);

-- ── DOCTORS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  full_name       TEXT NOT NULL,
  qualification   TEXT,
  specialization  TEXT,
  clinic_name     TEXT,
  phone           TEXT,
  email           TEXT,
  commission_pct  REAL NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id);

-- ── PATIENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  patient_code    TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  dob             TEXT,
  age_years       INTEGER,
  age_months      INTEGER,
  gender          TEXT CHECK (gender IN ('male','female','other') OR gender IS NULL),
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, patient_code)
);
CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(tenant_id, phone);

-- ── TEST CATALOG ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_catalog (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  short_code      TEXT NOT NULL,
  category        TEXT,
  sample_type     TEXT,
  turnaround_hrs  INTEGER NOT NULL DEFAULT 24,
  price           REAL NOT NULL,
  cost            REAL,
  reference_range TEXT,
  unit            TEXT,
  method          TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, short_code)
);
CREATE INDEX IF NOT EXISTS idx_test_tenant ON test_catalog(tenant_id);

-- ── SAMPLE ORDERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_orders (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  sample_id       TEXT NOT NULL,
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  doctor_id       TEXT REFERENCES doctors(id),
  referred_by     TEXT,
  priority        TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status          TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','collected','processing','completed','cancelled')),
  collection_time TEXT,
  collected_by    TEXT,
  notes           TEXT,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, sample_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON sample_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON sample_orders(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON sample_orders(tenant_id, status);

-- ── ORDER TESTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tests (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  order_id        TEXT NOT NULL REFERENCES sample_orders(id),
  test_id         TEXT NOT NULL REFERENCES test_catalog(id),
  price           REAL NOT NULL,
  discount_pct    REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled')),
  result_value    TEXT,
  result_unit     TEXT,
  result_flag     TEXT CHECK (result_flag IN ('normal','low','high','critical') OR result_flag IS NULL),
  result_notes    TEXT,
  completed_by    TEXT,
  completed_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_tests_order ON order_tests(order_id);

-- ── STATUS HISTORY ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_status_history (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  order_id        TEXT NOT NULL REFERENCES sample_orders(id),
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  changed_by      TEXT NOT NULL,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_status_order ON sample_status_history(order_id);

-- ── REPORTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  order_id        TEXT NOT NULL REFERENCES sample_orders(id),
  pdf_path        TEXT,
  pdf_url         TEXT,
  public_token    TEXT UNIQUE,
  generated_by    TEXT,
  verified_by     TEXT,
  verified_at     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','verified','delivered')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(public_token);

-- ── INVOICES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  invoice_number  TEXT NOT NULL,
  order_id        TEXT NOT NULL REFERENCES sample_orders(id),
  patient_id      TEXT NOT NULL REFERENCES patients(id),
  subtotal        REAL NOT NULL,
  discount_amt    REAL NOT NULL DEFAULT 0,
  tax_amt         REAL NOT NULL DEFAULT 0,
  total_amt       REAL NOT NULL,
  paid_amt        REAL NOT NULL DEFAULT 0,
  -- balance_amt is computed in application layer (no generated columns in SQLite < 3.31)
  status          TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);

-- ── PAYMENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  invoice_id      TEXT NOT NULL REFERENCES invoices(id),
  amount          REAL NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('cash','card','upi','netbanking','cheque','other')),
  reference_no    TEXT,
  collected_by    TEXT NOT NULL,
  payment_date    TEXT NOT NULL DEFAULT (date('now')),
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ── REFERRALS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  order_id        TEXT NOT NULL REFERENCES sample_orders(id),
  doctor_id       TEXT NOT NULL REFERENCES doctors(id),
  invoice_id      TEXT REFERENCES invoices(id),
  commission_pct  REAL NOT NULL,
  commission_amt  REAL NOT NULL,
  is_paid         INTEGER NOT NULL DEFAULT 0,
  paid_on         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON referrals(tenant_id, doctor_id);
