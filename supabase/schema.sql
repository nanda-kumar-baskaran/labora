-- ============================================================
-- LabMS Postgres Schema (cloud / Supabase mode)
-- Run this FIRST in Supabase SQL Editor, then run seed.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── TENANTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  plan            TEXT NOT NULL DEFAULT 'starter',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USERS ──────────────────────────────────────────────────────────
-- id matches Supabase Auth user UUID
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY,   -- same as auth.users.id
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','staff','technician','pathologist')),
  phone           TEXT,
  email           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email);

-- ── DOCTORS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  qualification   TEXT,
  specialization  TEXT,
  clinic_name     TEXT,
  phone           TEXT,
  email           TEXT,
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id);

-- ── PATIENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_code    TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  dob             DATE,
  age_years       INTEGER,
  age_months      INTEGER,
  gender          TEXT CHECK (gender IN ('male','female','other')),
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, patient_code)
);
CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(tenant_id, phone);

-- ── TEST CATALOG ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  short_code      TEXT NOT NULL,
  category        TEXT,
  sample_type     TEXT,
  turnaround_hrs  INTEGER NOT NULL DEFAULT 24,
  price           NUMERIC(10,2) NOT NULL,
  cost            NUMERIC(10,2),
  reference_range TEXT,
  unit            TEXT,
  method          TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, short_code)
);
CREATE INDEX IF NOT EXISTS idx_test_tenant ON test_catalog(tenant_id);

-- ── SAMPLE ORDERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sample_id       TEXT NOT NULL,
  patient_id      UUID NOT NULL REFERENCES patients(id),
  doctor_id       UUID REFERENCES doctors(id),
  referred_by     TEXT,
  priority        TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status          TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','collected','processing','completed','cancelled')),
  collection_time TIMESTAMPTZ,
  collected_by    TEXT,
  notes           TEXT,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, sample_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON sample_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON sample_orders(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON sample_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON sample_orders(tenant_id, created_at DESC);

-- ── ORDER TESTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES sample_orders(id) ON DELETE CASCADE,
  test_id         UUID NOT NULL REFERENCES test_catalog(id),
  price           NUMERIC(10,2) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled')),
  result_value    TEXT,
  result_unit     TEXT,
  result_flag     TEXT CHECK (result_flag IN ('normal','low','high','critical')),
  result_notes    TEXT,
  completed_by    UUID,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_tests_order ON order_tests(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tests_tenant ON order_tests(tenant_id);

-- ── STATUS HISTORY ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES sample_orders(id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  changed_by      UUID NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_order ON sample_status_history(order_id);

-- Auto-insert status history when order status changes
CREATE OR REPLACE FUNCTION fn_order_status_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO sample_status_history (tenant_id, order_id, from_status, to_status, changed_by)
    VALUES (NEW.tenant_id, NEW.id, OLD.status, NEW.status, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_history ON sample_orders;
CREATE TRIGGER trg_order_status_history
  AFTER UPDATE ON sample_orders
  FOR EACH ROW EXECUTE FUNCTION fn_order_status_history();

-- ── REPORTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES sample_orders(id) ON DELETE CASCADE,
  pdf_path        TEXT,
  pdf_url         TEXT,
  public_token    TEXT UNIQUE,
  generated_by    UUID,
  verified_by     UUID,
  verified_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','verified','delivered')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_token ON reports(public_token);
CREATE INDEX IF NOT EXISTS idx_reports_order ON reports(order_id);

-- ── INVOICES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  order_id        UUID NOT NULL REFERENCES sample_orders(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  subtotal        NUMERIC(10,2) NOT NULL,
  discount_amt    NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amt         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amt       NUMERIC(10,2) NOT NULL,
  paid_amt        NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_amt     NUMERIC(10,2) GENERATED ALWAYS AS (total_amt - paid_amt) STORED,
  status          TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

-- ── PAYMENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('cash','card','upi','netbanking','cheque','other')),
  reference_no    TEXT,
  collected_by    UUID NOT NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);

-- Auto-update invoice paid_amt and status when payment added
CREATE OR REPLACE FUNCTION fn_invoice_payment_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  total NUMERIC;
  paid  NUMERIC;
BEGIN
  SELECT total_amt INTO total FROM invoices WHERE id = NEW.invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO paid FROM payments WHERE invoice_id = NEW.invoice_id;
  UPDATE invoices SET
    paid_amt = paid,
    status = CASE
      WHEN paid >= total THEN 'paid'
      WHEN paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_payment_update ON payments;
CREATE TRIGGER trg_invoice_payment_update
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_invoice_payment_update();

-- ── REFERRALS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES sample_orders(id),
  doctor_id       UUID NOT NULL REFERENCES doctors(id),
  invoice_id      UUID REFERENCES invoices(id),
  commission_pct  NUMERIC(5,2) NOT NULL,
  commission_amt  NUMERIC(10,2) NOT NULL,
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  paid_on         DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON referrals(tenant_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_order ON referrals(order_id);

-- ── AUDIT LOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id        UUID NOT NULL,
  actor_name      TEXT NOT NULL,
  action          TEXT NOT NULL,   -- 'create','update','delete','verify', etc.
  entity_type     TEXT NOT NULL,   -- 'patient','order','report', etc.
  entity_id       TEXT NOT NULL,
  entity_label    TEXT,
  changes_json    TEXT,            -- JSON string of {field: {old, new}}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(tenant_id, entity_type, entity_id);

-- ── UPDATED_AT triggers ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','users','patients','sample_orders','reports','invoices'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()', t);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- JWT must contain tenant_id claim (set by custom-access-token hook)
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_catalog       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Helper: extract tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT NULLIF((auth.jwt() -> 'tenant_id')::TEXT, 'null')::UUID;
$$;

-- tenants: user can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
  FOR ALL USING (id = auth.tenant_id());

-- All other tables: scoped to tenant_id from JWT
CREATE POLICY tenant_isolation ON users              FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON doctors            FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON patients           FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON test_catalog       FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON sample_orders      FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON order_tests        FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON sample_status_history FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON invoices           FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON payments           FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON referrals          FOR ALL USING (tenant_id = auth.tenant_id());
CREATE POLICY tenant_isolation ON audit_log          FOR ALL USING (tenant_id = auth.tenant_id());

-- Reports: authenticated users see their tenant's reports
-- Public token reports are served via admin client (bypasses RLS) in /api/r/[token]
CREATE POLICY tenant_isolation ON reports            FOR ALL USING (tenant_id = auth.tenant_id());

-- Service role bypasses RLS automatically (used for admin ops and edge functions)

-- ── STORAGE BUCKET ────────────────────────────────────────────────────
-- Run in SQL Editor (or create manually in Storage dashboard):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT DO NOTHING;

-- Storage RLS: only authenticated users of the same tenant can access their reports
-- Bucket name: 'reports', path convention: '{tenant_id}/{filename}'
CREATE POLICY "tenant_reports_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.tenant_id()::TEXT);

CREATE POLICY "tenant_reports_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.tenant_id()::TEXT);

CREATE POLICY "tenant_reports_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'reports' AND (storage.foldername(name))[1] = auth.tenant_id()::TEXT);
