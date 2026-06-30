-- ============================================================
-- SEED DATA — Demo tenant + sample test catalog
-- Run AFTER schema.sql in SQL Editor
-- Replace 'YOUR_USER_UUID' with the actual UUID from Auth → Users
-- ============================================================

-- 1. Create demo tenant
INSERT INTO tenants (id, name, slug, address, city, state, pincode, phone, email, gstin, report_header, report_footer, plan)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Shree Pathology Lab',
  'shree-path-lab',
  '12, Medical Complex, MG Road',
  'Mumbai',
  'Maharashtra',
  '400001',
  '+91 22 2345 6789',
  'info@shreepathlab.com',
  '27AAAAA0000A1Z5',
  'NABL Accredited | ISO 15189:2012 | Est. 1998',
  'Shree Pathology Lab | Report verified by licensed pathologist',
  'starter'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Link admin user to tenant
-- ⚠️  Replace 'YOUR_USER_UUID' with real UUID from Supabase → Auth → Users
-- INSERT INTO users (id, tenant_id, full_name, role)
-- VALUES ('YOUR_USER_UUID', 'aaaaaaaa-0000-0000-0000-000000000001', 'Lab Admin', 'admin');

-- 3. Sample test catalog (Haematology)
INSERT INTO test_catalog (tenant_id, name, short_code, category, sample_type, price, cost, reference_range, unit, turnaround_hrs, method)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Complete Blood Count', 'CBC', 'Haematology', 'EDTA Blood', 250, 80, 'RBC: 4.5-5.5M/µL', 'M/µL', 4, 'Automated Analyzer'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Haemoglobin', 'HGB', 'Haematology', 'EDTA Blood', 80, 20, '13.5-17.5 (M), 12.0-15.5 (F)', 'g/dL', 2, 'Cyanmethemoglobin'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ESR (Erythrocyte Sedimentation Rate)', 'ESR', 'Haematology', 'EDTA Blood', 60, 15, '0-15 (M), 0-20 (F)', 'mm/hr', 2, 'Westergren'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Platelet Count', 'PLT', 'Haematology', 'EDTA Blood', 100, 25, '1.5-4.0 lakh/µL', 'lakh/µL', 4, 'Automated'),
  -- Biochemistry
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Blood Sugar Fasting', 'BSF', 'Biochemistry', 'Serum', 70, 20, '70-100 mg/dL', 'mg/dL', 2, 'GOD-POD'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Blood Sugar Post-Prandial', 'BSPP', 'Biochemistry', 'Serum', 70, 20, '<140 mg/dL', 'mg/dL', 2, 'GOD-POD'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'HbA1c (Glycated Haemoglobin)', 'HBA1C', 'Biochemistry', 'EDTA Blood', 350, 120, '<5.7% (Normal), 5.7-6.4% (Pre-diabetic)', '%', 4, 'HPLC'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Liver Function Test', 'LFT', 'Biochemistry', 'Serum', 400, 130, 'SGOT: 10-40, SGPT: 7-56', 'U/L', 6, 'Kinetic'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Kidney Function Test', 'KFT', 'Biochemistry', 'Serum', 350, 110, 'Creatinine: 0.7-1.3 mg/dL', 'mg/dL', 6, 'Jaffe'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Serum Creatinine', 'CREAT', 'Biochemistry', 'Serum', 100, 30, '0.7-1.3 (M), 0.6-1.1 (F)', 'mg/dL', 4, 'Jaffe'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Uric Acid', 'URICAC', 'Biochemistry', 'Serum', 120, 35, '3.5-7.2 (M), 2.6-6.0 (F)', 'mg/dL', 4, 'Uricase'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Lipid Profile', 'LIPID', 'Biochemistry', 'Serum', 400, 130, 'Total Cholesterol: <200 mg/dL', 'mg/dL', 6, 'Enzymatic'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Thyroid Profile (T3, T4, TSH)', 'TFT', 'Biochemistry', 'Serum', 600, 200, 'TSH: 0.4-4.0 mIU/L', 'mIU/L', 8, 'CLIA'),
  -- Urine
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Urine Routine & Microscopy', 'URINE', 'Clinical Pathology', 'Urine', 80, 20, 'pH: 5.0-8.0', '', 2, 'Manual'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Urine Culture & Sensitivity', 'URINEC', 'Microbiology', 'Urine (Mid-stream)', 400, 120, 'No growth = Normal', '', 48, 'Culture'),
  -- Serology
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Dengue NS1 Antigen', 'DENGNS1', 'Serology', 'Serum', 500, 180, 'Negative', '', 4, 'ELISA'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Typhoid IgM (Widal)', 'WIDAL', 'Serology', 'Serum', 150, 45, 'Titer <1:20 = Negative', '', 4, 'Slide Agglutination'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'HIV 1 & 2 (ELISA)', 'HIV', 'Serology', 'Serum', 200, 60, 'Non-reactive = Normal', '', 4, 'ELISA'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'HBsAg (Hepatitis B)', 'HBSAG', 'Serology', 'Serum', 150, 45, 'Non-reactive = Normal', '', 4, 'ELISA'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'CRP (C-Reactive Protein)', 'CRP', 'Serology', 'Serum', 150, 45, '<5 mg/L', 'mg/L', 4, 'Turbidimetry')
ON CONFLICT (tenant_id, short_code) DO NOTHING;

-- 4. Sample doctors
INSERT INTO doctors (tenant_id, full_name, qualification, specialization, clinic_name, phone, commission_pct)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Dr. Rajesh Sharma', 'MBBS, MD', 'General Physician', 'Sharma Clinic', '+91 98765 11111', 10),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Dr. Priya Patel', 'MBBS, MD (Gynaecology)', 'Gynaecologist', 'Patel Hospital', '+91 98765 22222', 8),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Dr. Amit Verma', 'MBBS', 'General Physician', 'City Medical Centre', '+91 98765 33333', 5)
ON CONFLICT DO NOTHING;
