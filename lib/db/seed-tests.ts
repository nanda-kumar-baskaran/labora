/**
 * Built-in test catalog seed data
 * Sources: ICMR, NABL, Lal PathLabs, Metropolis, Thyrocare, Apollo247, PMC
 * Reference ranges: India-specific adult values
 * Prices: Indicative MRP (2025), editable by lab admin
 */
export const SEED_TESTS = [
  // ─── HAEMATOLOGY ──────────────────────────────────────────────
  { name: "Complete Blood Count", short_code: "CBC", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "See panel sub-tests", unit: "Panel", price: 250, turnaround_hrs: 4 },
  { name: "Haemoglobin", short_code: "HB", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "13.0-17.5 (M) / 12.0-15.5 (F)", unit: "g/dL", price: 80, turnaround_hrs: 2 },
  { name: "Total Leucocyte Count", short_code: "TLC", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "4.0-11.0", unit: "×10⁹/L", price: 80, turnaround_hrs: 2 },
  { name: "Platelet Count", short_code: "PLT", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "150-400", unit: "×10⁹/L", price: 80, turnaround_hrs: 2 },
  { name: "Red Blood Cell Count", short_code: "RBC", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "4.5-5.5 (M) / 3.5-4.5 (F)", unit: "million/µL", price: 80, turnaround_hrs: 2 },
  { name: "Mean Corpuscular Volume", short_code: "MCV", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "80-100", unit: "fL", price: 80, turnaround_hrs: 2 },
  { name: "Erythrocyte Sedimentation Rate", short_code: "ESR", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "0-15 (M) / 0-20 (F)", unit: "mm/hr", price: 80, turnaround_hrs: 2 },
  { name: "Packed Cell Volume / Haematocrit", short_code: "PCV", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "38.8-46.4 (M) / 35.4-44.4 (F)", unit: "%", price: 80, turnaround_hrs: 2 },
  { name: "Differential Leucocyte Count", short_code: "DLC", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "Neutrophils 40-70% / Lymphocytes 20-40% / Monocytes 2-8%", unit: "%", price: 100, turnaround_hrs: 3 },
  { name: "Peripheral Blood Smear", short_code: "PBS", category: "Haematology", sample_type: "Blood (EDTA)", reference_range: "Normocytic normochromic RBCs; no abnormal cells", unit: "Qualitative", price: 150, turnaround_hrs: 4 },

  // ─── BIOCHEMISTRY ─────────────────────────────────────────────
  { name: "Fasting Blood Glucose", short_code: "FBG", category: "Biochemistry", sample_type: "Plasma (Fluoride)", reference_range: "70-99", unit: "mg/dL", price: 60, turnaround_hrs: 2 },
  { name: "Serum Creatinine", short_code: "SCREAT", category: "Biochemistry", sample_type: "Serum", reference_range: "0.7-1.3 (M) / 0.6-1.1 (F)", unit: "mg/dL", price: 80, turnaround_hrs: 3 },
  { name: "Serum Uric Acid", short_code: "SUA", category: "Biochemistry", sample_type: "Serum", reference_range: "3.5-7.2 (M) / 2.6-6.0 (F)", unit: "mg/dL", price: 80, turnaround_hrs: 3 },
  { name: "Blood Urea Nitrogen", short_code: "BUN", category: "Biochemistry", sample_type: "Serum", reference_range: "7-25", unit: "mg/dL", price: 80, turnaround_hrs: 3 },
  { name: "Serum Urea", short_code: "UREA", category: "Biochemistry", sample_type: "Serum", reference_range: "15-45", unit: "mg/dL", price: 80, turnaround_hrs: 3 },
  { name: "C-Reactive Protein", short_code: "CRP", category: "Biochemistry", sample_type: "Serum", reference_range: "<6", unit: "mg/L", price: 250, turnaround_hrs: 4 },
  { name: "Serum Amylase", short_code: "AMY", category: "Biochemistry", sample_type: "Serum", reference_range: "30-110", unit: "U/L", price: 200, turnaround_hrs: 4 },
  { name: "Serum Lipase", short_code: "LPS", category: "Biochemistry", sample_type: "Serum", reference_range: "0-60", unit: "U/L", price: 350, turnaround_hrs: 4 },

  // ─── LIVER FUNCTION ───────────────────────────────────────────
  { name: "Liver Function Test Panel", short_code: "LFT", category: "Liver Function", sample_type: "Serum", reference_range: "See panel sub-tests", unit: "Panel", price: 500, turnaround_hrs: 6 },
  { name: "Alanine Aminotransferase (SGPT)", short_code: "ALT", category: "Liver Function", sample_type: "Serum", reference_range: "7-40 (F) / 7-55 (M)", unit: "U/L", price: 100, turnaround_hrs: 4 },
  { name: "Aspartate Aminotransferase (SGOT)", short_code: "AST", category: "Liver Function", sample_type: "Serum", reference_range: "8-33 (F) / 8-48 (M)", unit: "U/L", price: 100, turnaround_hrs: 4 },
  { name: "Alkaline Phosphatase", short_code: "ALP", category: "Liver Function", sample_type: "Serum", reference_range: "35-125", unit: "U/L", price: 100, turnaround_hrs: 4 },
  { name: "Gamma-Glutamyl Transferase", short_code: "GGT", category: "Liver Function", sample_type: "Serum", reference_range: "0-50 (M) / 0-30 (F)", unit: "U/L", price: 150, turnaround_hrs: 4 },
  { name: "Total Bilirubin", short_code: "T-BIL", category: "Liver Function", sample_type: "Serum", reference_range: "0.2-1.2", unit: "mg/dL", price: 80, turnaround_hrs: 4 },
  { name: "Direct Bilirubin", short_code: "D-BIL", category: "Liver Function", sample_type: "Serum", reference_range: "0.0-0.3", unit: "mg/dL", price: 80, turnaround_hrs: 4 },
  { name: "Serum Albumin", short_code: "ALB", category: "Liver Function", sample_type: "Serum", reference_range: "3.5-5.0", unit: "g/dL", price: 100, turnaround_hrs: 4 },
  { name: "Total Protein", short_code: "TP", category: "Liver Function", sample_type: "Serum", reference_range: "6.0-8.3", unit: "g/dL", price: 80, turnaround_hrs: 4 },

  // ─── KIDNEY FUNCTION ──────────────────────────────────────────
  { name: "Kidney Function Test Panel", short_code: "KFT", category: "Kidney Function", sample_type: "Serum", reference_range: "See panel sub-tests", unit: "Panel", price: 500, turnaround_hrs: 6 },
  { name: "Serum Sodium", short_code: "NA", category: "Kidney Function", sample_type: "Serum", reference_range: "136-145", unit: "mEq/L", price: 120, turnaround_hrs: 3 },
  { name: "Serum Potassium", short_code: "K", category: "Kidney Function", sample_type: "Serum", reference_range: "3.5-5.0", unit: "mEq/L", price: 120, turnaround_hrs: 3 },
  { name: "Serum Chloride", short_code: "CL", category: "Kidney Function", sample_type: "Serum", reference_range: "98-107", unit: "mEq/L", price: 100, turnaround_hrs: 3 },
  { name: "Serum Phosphorus", short_code: "PHOS", category: "Kidney Function", sample_type: "Serum", reference_range: "2.5-4.5", unit: "mg/dL", price: 100, turnaround_hrs: 3 },
  { name: "Serum Calcium", short_code: "CA", category: "Kidney Function", sample_type: "Serum", reference_range: "8.5-10.5", unit: "mg/dL", price: 100, turnaround_hrs: 3 },

  // ─── THYROID ──────────────────────────────────────────────────
  { name: "Thyroid Stimulating Hormone", short_code: "TSH", category: "Thyroid", sample_type: "Serum", reference_range: "0.45-4.50", unit: "µIU/mL", price: 350, turnaround_hrs: 6 },
  { name: "Free Triiodothyronine", short_code: "FT3", category: "Thyroid", sample_type: "Serum", reference_range: "2.0-4.4", unit: "pg/mL", price: 250, turnaround_hrs: 6 },
  { name: "Free Thyroxine", short_code: "FT4", category: "Thyroid", sample_type: "Serum", reference_range: "0.7-1.9", unit: "ng/dL", price: 250, turnaround_hrs: 6 },
  { name: "Total T3", short_code: "T3", category: "Thyroid", sample_type: "Serum", reference_range: "80-200", unit: "ng/dL", price: 200, turnaround_hrs: 6 },
  { name: "Total T4", short_code: "T4", category: "Thyroid", sample_type: "Serum", reference_range: "5.0-12.0", unit: "µg/dL", price: 200, turnaround_hrs: 6 },
  { name: "Anti-Thyroid Peroxidase Antibody", short_code: "ANTI-TPO", category: "Thyroid", sample_type: "Serum", reference_range: "<34", unit: "IU/mL", price: 500, turnaround_hrs: 12 },
  { name: "Thyroid Profile (T3, T4, TSH)", short_code: "TFT", category: "Thyroid", sample_type: "Serum", reference_range: "See panel sub-tests", unit: "Panel", price: 550, turnaround_hrs: 6 },

  // ─── LIPID PROFILE ────────────────────────────────────────────
  { name: "Lipid Profile Panel", short_code: "LP", category: "Lipid Profile", sample_type: "Serum (fasting 10-12 hr)", reference_range: "See panel sub-tests", unit: "Panel", price: 400, turnaround_hrs: 6 },
  { name: "Total Cholesterol", short_code: "TC", category: "Lipid Profile", sample_type: "Serum", reference_range: "<200", unit: "mg/dL", price: 80, turnaround_hrs: 4 },
  { name: "HDL Cholesterol", short_code: "HDL-C", category: "Lipid Profile", sample_type: "Serum", reference_range: "≥40 (M) / ≥50 (F)", unit: "mg/dL", price: 100, turnaround_hrs: 4 },
  { name: "LDL Cholesterol", short_code: "LDL-C", category: "Lipid Profile", sample_type: "Serum", reference_range: "<100", unit: "mg/dL", price: 100, turnaround_hrs: 4 },
  { name: "Triglycerides", short_code: "TG", category: "Lipid Profile", sample_type: "Serum (fasting)", reference_range: "<150", unit: "mg/dL", price: 80, turnaround_hrs: 4 },

  // ─── DIABETES ─────────────────────────────────────────────────
  { name: "Glycated Haemoglobin", short_code: "HBAIC", category: "Diabetes", sample_type: "Blood (EDTA)", reference_range: "<5.7", unit: "%", price: 380, turnaround_hrs: 6 },
  { name: "Postprandial Blood Glucose (2-hr)", short_code: "PPBG", category: "Diabetes", sample_type: "Plasma (Fluoride)", reference_range: "<140", unit: "mg/dL", price: 60, turnaround_hrs: 2 },
  { name: "Fasting Insulin", short_code: "INS-F", category: "Diabetes", sample_type: "Serum", reference_range: "2.6-24.9", unit: "µIU/mL", price: 500, turnaround_hrs: 6 },
  { name: "C-Peptide (Fasting)", short_code: "C-PEP", category: "Diabetes", sample_type: "Serum", reference_range: "0.8-3.5", unit: "ng/mL", price: 700, turnaround_hrs: 8 },

  // ─── URINE ANALYSIS ───────────────────────────────────────────
  { name: "Urine Routine Examination", short_code: "URE", category: "Urine Analysis", sample_type: "Urine (mid-stream, morning)", reference_range: "See panel sub-tests", unit: "Panel", price: 120, turnaround_hrs: 3 },
  { name: "Urine Culture and Sensitivity", short_code: "UCS", category: "Urine Analysis", sample_type: "Urine (mid-stream, clean catch)", reference_range: "<10,000 CFU/mL", unit: "CFU/mL", price: 400, turnaround_hrs: 48 },
  { name: "Urine Microalbumin (Spot ACR)", short_code: "U-ACR", category: "Urine Analysis", sample_type: "Urine (random spot)", reference_range: "<30", unit: "µg/mg creatinine", price: 500, turnaround_hrs: 6 },
  { name: "24-Hour Urine Protein", short_code: "24H-UPROT", category: "Urine Analysis", sample_type: "Urine (24-hour collection)", reference_range: "<150", unit: "mg/24hr", price: 300, turnaround_hrs: 6 },
  { name: "Urine Pregnancy Test (hCG)", short_code: "UPT", category: "Urine Analysis", sample_type: "Urine (first morning)", reference_range: "Negative", unit: "Qualitative", price: 80, turnaround_hrs: 1 },

  // ─── HORMONES ─────────────────────────────────────────────────
  { name: "Testosterone (Total)", short_code: "TEST", category: "Hormones", sample_type: "Serum (8-10 AM)", reference_range: "2.8-8.0 (M) / 0.06-0.68 (F)", unit: "ng/mL", price: 600, turnaround_hrs: 8 },
  { name: "Estradiol", short_code: "E2", category: "Hormones", sample_type: "Serum", reference_range: "12.4-166 (follicular) / 43.8-211 (luteal)", unit: "pg/mL", price: 700, turnaround_hrs: 8 },
  { name: "Follicle Stimulating Hormone", short_code: "FSH", category: "Hormones", sample_type: "Serum", reference_range: "2.59-15.12 (F follicular) / 1.27-19.26 (M)", unit: "mIU/mL", price: 500, turnaround_hrs: 8 },
  { name: "Luteinizing Hormone", short_code: "LH", category: "Hormones", sample_type: "Serum", reference_range: "2.75-20.68 (F) / 1.7-8.6 (M)", unit: "mIU/mL", price: 500, turnaround_hrs: 8 },
  { name: "Prolactin", short_code: "PRL", category: "Hormones", sample_type: "Serum (morning, non-stressed)", reference_range: "5.13-37.35 (F) / 3.46-19.4 (M)", unit: "ng/mL", price: 500, turnaround_hrs: 8 },
  { name: "Anti-Müllerian Hormone", short_code: "AMH", category: "Hormones", sample_type: "Serum", reference_range: "1.0-3.5", unit: "ng/mL", price: 1800, turnaround_hrs: 24 },
  { name: "Morning Cortisol", short_code: "CORT", category: "Hormones", sample_type: "Serum (8-9 AM)", reference_range: "4.71-19.64", unit: "µg/dL", price: 600, turnaround_hrs: 8 },
  { name: "DHEA-Sulphate", short_code: "DHEAS", category: "Hormones", sample_type: "Serum", reference_range: "80-560 (M) / 35-430 (F)", unit: "µg/dL", price: 700, turnaround_hrs: 8 },

  // ─── INFECTIOUS DISEASE ───────────────────────────────────────
  { name: "HIV 1 & 2 Antibody/Antigen", short_code: "HIV", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Qualitative", price: 300, turnaround_hrs: 6 },
  { name: "Hepatitis B Surface Antigen", short_code: "HBSAG", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Qualitative", price: 250, turnaround_hrs: 4 },
  { name: "Hepatitis C Antibody", short_code: "ANTI-HCV", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Qualitative", price: 400, turnaround_hrs: 6 },
  { name: "VDRL Test (Syphilis)", short_code: "VDRL", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Titer", price: 150, turnaround_hrs: 4 },
  { name: "Widal Test (Typhoid)", short_code: "WIDAL", category: "Infectious Disease", sample_type: "Serum", reference_range: "O antigen <1:80 / H antigen <1:160", unit: "Titer", price: 150, turnaround_hrs: 4 },
  { name: "Malaria Parasite (Peripheral Smear)", short_code: "MP", category: "Infectious Disease", sample_type: "Blood (thick + thin smear)", reference_range: "No malarial parasites seen", unit: "Qualitative", price: 120, turnaround_hrs: 3 },
  { name: "Malaria Rapid Antigen Test", short_code: "MRDT", category: "Infectious Disease", sample_type: "Blood (EDTA)", reference_range: "Negative", unit: "Qualitative", price: 200, turnaround_hrs: 1 },
  { name: "Dengue NS1 Antigen", short_code: "DENG-NS1", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Qualitative", price: 500, turnaround_hrs: 4 },
  { name: "Dengue IgM/IgG Antibody", short_code: "DENG-AB", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Qualitative", price: 700, turnaround_hrs: 6 },
  { name: "COVID-19 Antigen Rapid Test", short_code: "COVID-AG", category: "Infectious Disease", sample_type: "Nasopharyngeal Swab", reference_range: "Negative", unit: "Qualitative", price: 300, turnaround_hrs: 1 },
  { name: "Typhoid IgM (Card/Rapid)", short_code: "TYPHI-IG", category: "Infectious Disease", sample_type: "Serum", reference_range: "Non-Reactive", unit: "Qualitative", price: 250, turnaround_hrs: 2 },

  // ─── VITAMINS & MINERALS ──────────────────────────────────────
  { name: "25-Hydroxy Vitamin D", short_code: "VIT-D", category: "Vitamins & Minerals", sample_type: "Serum", reference_range: "≥30", unit: "ng/mL", price: 1000, turnaround_hrs: 12 },
  { name: "Vitamin B12 (Cobalamin)", short_code: "VIT-B12", category: "Vitamins & Minerals", sample_type: "Serum", reference_range: "200-800", unit: "pg/mL", price: 700, turnaround_hrs: 12 },
  { name: "Serum Iron", short_code: "S-IRON", category: "Vitamins & Minerals", sample_type: "Serum (fasting, morning)", reference_range: "59-158 (M) / 37-145 (F)", unit: "µg/dL", price: 200, turnaround_hrs: 6 },
  { name: "Serum Ferritin", short_code: "FERR", category: "Vitamins & Minerals", sample_type: "Serum", reference_range: "20-250 (M) / 12-150 (F)", unit: "ng/mL", price: 600, turnaround_hrs: 6 },
  { name: "Total Iron Binding Capacity", short_code: "TIBC", category: "Vitamins & Minerals", sample_type: "Serum", reference_range: "250-450", unit: "µg/dL", price: 200, turnaround_hrs: 6 },
  { name: "Folic Acid", short_code: "FOL", category: "Vitamins & Minerals", sample_type: "Serum", reference_range: "3.0-17.0", unit: "ng/mL", price: 600, turnaround_hrs: 12 },
  { name: "Vitamin A (Retinol)", short_code: "VIT-A", category: "Vitamins & Minerals", sample_type: "Serum (fasting, protect from light)", reference_range: "0.30-0.70", unit: "mg/L", price: 1200, turnaround_hrs: 24 },

  // ─── TUMOR MARKERS ────────────────────────────────────────────
  { name: "Prostate Specific Antigen (Total)", short_code: "PSA", category: "Tumor Markers", sample_type: "Serum", reference_range: "<4.0 (age-specific: 40-49yr <2.1, 50-59yr <3.4)", unit: "ng/mL", price: 600, turnaround_hrs: 8 },
  { name: "Alpha-Fetoprotein", short_code: "AFP", category: "Tumor Markers", sample_type: "Serum", reference_range: "<15", unit: "ng/mL", price: 800, turnaround_hrs: 8 },
  { name: "Carcinoembryonic Antigen", short_code: "CEA", category: "Tumor Markers", sample_type: "Serum", reference_range: "<2.5 (non-smoker) / <5.0 (smoker)", unit: "ng/mL", price: 700, turnaround_hrs: 8 },
  { name: "CA 125", short_code: "CA125", category: "Tumor Markers", sample_type: "Serum", reference_range: "<35", unit: "U/mL", price: 800, turnaround_hrs: 8 },
  { name: "CA 19-9", short_code: "CA199", category: "Tumor Markers", sample_type: "Serum", reference_range: "<37", unit: "U/mL", price: 900, turnaround_hrs: 8 },
  { name: "CA 15-3 (Breast Cancer)", short_code: "CA153", category: "Tumor Markers", sample_type: "Serum", reference_range: "<30", unit: "U/mL", price: 900, turnaround_hrs: 8 },

  // ─── COAGULATION ──────────────────────────────────────────────
  { name: "Prothrombin Time / INR", short_code: "PT-INR", category: "Coagulation", sample_type: "Plasma (Citrate)", reference_range: "11-14 sec / INR: 0.8-1.2", unit: "sec / ratio", price: 200, turnaround_hrs: 4 },
  { name: "Activated Partial Thromboplastin Time", short_code: "APTT", category: "Coagulation", sample_type: "Plasma (Citrate)", reference_range: "25-35", unit: "sec", price: 200, turnaround_hrs: 4 },
  { name: "D-Dimer", short_code: "D-DIM", category: "Coagulation", sample_type: "Plasma (Citrate)", reference_range: "<0.5", unit: "µg/mL FEU", price: 800, turnaround_hrs: 4 },
  { name: "Fibrinogen", short_code: "FIB", category: "Coagulation", sample_type: "Plasma (Citrate)", reference_range: "200-400", unit: "mg/dL", price: 500, turnaround_hrs: 6 },

  // ─── CARDIAC MARKERS ──────────────────────────────────────────
  { name: "Troponin I (High Sensitivity)", short_code: "HS-TROP-I", category: "Cardiac Markers", sample_type: "Serum", reference_range: "<16 (M) / <11 (F)", unit: "ng/L", price: 1200, turnaround_hrs: 2 },
  { name: "Creatine Kinase-MB", short_code: "CK-MB", category: "Cardiac Markers", sample_type: "Serum", reference_range: "<6.3 (M) / <4.4 (F)", unit: "ng/mL", price: 500, turnaround_hrs: 4 },
  { name: "NT-proBNP", short_code: "BNPP", category: "Cardiac Markers", sample_type: "Serum", reference_range: "<125 (age <75yr) / <450 (age ≥75yr)", unit: "pg/mL", price: 2500, turnaround_hrs: 6 },
  { name: "LDH (Lactate Dehydrogenase)", short_code: "LDH", category: "Cardiac Markers", sample_type: "Serum", reference_range: "120-246", unit: "U/L", price: 200, turnaround_hrs: 4 },
];
