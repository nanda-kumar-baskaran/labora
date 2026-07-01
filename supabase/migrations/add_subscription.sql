-- ============================================================
-- Migration: Add subscription fields to tenants
-- Run this in Supabase SQL Editor for existing projects
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT NOT NULL DEFAULT 'expired'
    CHECK (subscription_status IN ('trial','active','expired','cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ NOT NULL DEFAULT '2000-01-01T00:00:00Z';

-- New labs start as expired (blocked) by default.
-- When a lab pays, run:
--   UPDATE tenants
--   SET subscription_status = 'active',
--       subscription_end_date = NOW() + INTERVAL '1 month'
--   WHERE slug = '<lab-slug>';
--
-- To find a lab's slug:
--   SELECT id, name, slug, subscription_status, subscription_end_date FROM tenants;

COMMENT ON COLUMN tenants.subscription_status IS
  'trial | active | expired | cancelled — new labs start expired until payment';
COMMENT ON COLUMN tenants.subscription_end_date IS
  'UTC timestamp when the current subscription period ends';
