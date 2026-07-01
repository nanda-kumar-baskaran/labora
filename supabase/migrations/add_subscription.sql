-- ============================================================
-- Migration: Add subscription fields to tenants
-- Run this in Supabase SQL Editor for existing projects
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days');

-- All existing tenants get a 30-day trial from now.
-- To activate a paying tenant:
--   UPDATE tenants
--   SET subscription_status = 'active',
--       subscription_end_date = NOW() + INTERVAL '1 month'
--   WHERE id = '<tenant_id>';

COMMENT ON COLUMN tenants.subscription_status IS
  'trial | active | expired | cancelled';
COMMENT ON COLUMN tenants.subscription_end_date IS
  'UTC timestamp when the current subscription period ends';
