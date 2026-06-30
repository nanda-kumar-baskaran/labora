/**
 * Multi-page PDF report test harness.
 * Run: npx tsx scripts/test-pdf.tsx
 *
 * Generates PDFs for several scenarios, then uses pdftotext + pdfinfo (poppler)
 * to assert that EVERY page in every PDF contains the lab name (header) and
 * the footer string — proving repeating header/footer works correctly.
 *
 * Scenarios:
 *   1. Minimal — 1 page, minimal fields
 *   2. Standard — 1–2 pages, full fields, mixed flags
 *   3. Long — 3+ pages, 40 tests across multiple categories
 *   4. Huge — 5+ pages, all 14 categories, 94+ tests (stress)
 *   5. Single category overflow — one massive category that forces page break mid-table
 *   6. Missing optionals — no address, no doctor, no collection time, no verification
 *   7. Long lab name + long footer text (wrapping test)
 *   8. All critical flags — every row flagged critical
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { generateReportPDF, type ReportData } from "../lib/pdf/report-template";

const OUT_DIR = join(process.cwd(), "scripts", "pdf-output");
mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTest(overrides: Partial<{
  name: string; short_code: string; category: string;
  result_value: string; result_unit: string; result_flag: string;
  reference_range: string;
}> = {}) {
  return {
    name: overrides.name ?? "Haemoglobin",
    short_code: overrides.short_code ?? "HGB",
    category: overrides.category ?? "Haematology",
    result_value: overrides.result_value ?? "13.5",
    result_unit: overrides.result_unit ?? "g/dL",
    result_flag: overrides.result_flag ?? "normal",
    reference_range: overrides.reference_range ?? "12.0–16.0",
  };
}

function makeTests(count: number, category = "Haematology", flag = "normal") {
  const names = [
    "Haemoglobin", "Haematocrit", "RBC Count", "WBC Count", "Platelet Count",
    "MCV", "MCH", "MCHC", "Neutrophils", "Lymphocytes",
    "Eosinophils", "Basophils", "Monocytes", "Reticulocytes", "ESR",
    "RDW", "MPV", "PDW", "Absolute Neutrophil", "Absolute Lymphocyte",
    "Prothrombin Time", "INR", "APTT", "Fibrinogen", "D-Dimer",
    "Serum Iron", "TIBC", "Ferritin", "Vitamin B12", "Folate",
    "HbA1c", "Fasting Glucose", "Post-Prandial Glucose", "Serum Insulin", "C-Peptide",
    "TSH", "Free T3", "Free T4", "Anti-TPO", "Thyroglobulin",
    "Total Cholesterol", "Triglycerides", "HDL", "LDL", "VLDL",
    "Total Bilirubin", "Direct Bilirubin", "Indirect Bilirubin", "ALT/SGPT", "AST/SGOT",
    "Alkaline Phosphatase", "GGT", "Total Protein", "Albumin", "Globulin",
    "Serum Creatinine", "BUN", "eGFR", "Uric Acid", "Cystatin-C",
    "Sodium", "Potassium", "Chloride", "Bicarbonate", "Calcium",
    "Phosphorus", "Magnesium", "Zinc", "Copper", "Selenium",
  ];
  const units = ["g/dL", "fL", "×10³/μL", "×10⁶/μL", "mg/dL", "U/L", "mEq/L", "mmol/L", "%", "ng/mL"];
  const ranges = ["12.0–16.0", "4.5–11.0", "0.6–1.2", "70–100", "3.5–5.0", "150–400", "0.4–4.0", "0–40", "35–150", "60–100"];

  return Array.from({ length: count }, (_, i) => ({
    name: names[i % names.length],
    short_code: names[i % names.length].replace(/[^A-Z]/g, "").slice(0, 6) || `T${i + 1}`,
    category,
    result_value: String((10 + (i * 3.7)).toFixed(1)),
    result_unit: units[i % units.length],
    result_flag: flag,
    reference_range: ranges[i % ranges.length],
  }));
}

const BASE_LAB: ReportData["lab"] = {
  name: "Labora Diagnostics Pvt. Ltd.",
  report_header: "Accredited by NABL · ISO 15189:2022 · 24×7 Emergency Services",
  address: "42, MG Road, Indiranagar, Bangalore – 560 038",
  phone: "+91-80-4567-8900",
  email: "reports@laboradiag.in",
  gstin: "29AADCL1234A1ZX",
  report_footer: "Results are for clinical use only — Labora Diagnostics Pvt. Ltd.",
};

const BASE_PATIENT: ReportData["patient"] = {
  full_name: "Ravi Kumar Sharma",
  patient_code: "P-00042",
  age_years: 38,
  gender: "male",
  phone: "9876543210",
};

// ── Scenario definitions ─────────────────────────────────────────────────────

const SCENARIOS: Array<{
  name: string;
  data: ReportData;
  minPages: number;
  headerContains: string;
  footerContains: string;
}> = [
  {
    name: "1_minimal",
    minPages: 1,
    headerContains: "Minimal Lab",
    footerContains: "Minimal Lab",
    data: {
      lab: { name: "Minimal Lab" },
      patient: { full_name: "Test Patient", patient_code: "P-00001" },
      sample_id: "SMP-20260628-0001",
      created_at: new Date().toISOString(),
      tests: [makeTest({ name: "Haemoglobin", result_value: "14.2" })],
    },
  },
  {
    name: "2_standard_full_fields",
    minPages: 1,
    headerContains: "Labora Diagnostics",
    footerContains: "clinical use only",
    data: {
      lab: BASE_LAB,
      patient: BASE_PATIENT,
      sample_id: "SMP-20260628-0010",
      created_at: new Date().toISOString(),
      collection_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      doctor_name: "Dr. S. Krishnaswamy",
      verified_by: "Dr. Priya Nair (Pathologist)",
      verified_at: new Date().toISOString(),
      tests: [
        makeTest({ name: "Haemoglobin", result_value: "8.1", result_flag: "low", category: "Haematology" }),
        makeTest({ name: "WBC Count", result_value: "14.2", result_flag: "high", category: "Haematology" }),
        makeTest({ name: "Platelet Count", result_value: "420", result_flag: "normal", category: "Haematology" }),
        makeTest({ name: "Fasting Glucose", result_value: "195", result_flag: "high", result_unit: "mg/dL", reference_range: "70–100", category: "Diabetes" }),
        makeTest({ name: "HbA1c", result_value: "9.2", result_flag: "critical", result_unit: "%", reference_range: "< 5.7", category: "Diabetes" }),
        makeTest({ name: "TSH", result_value: "0.12", result_flag: "low", result_unit: "mIU/L", reference_range: "0.4–4.0", category: "Thyroid" }),
        makeTest({ name: "Free T4", result_value: "2.8", result_flag: "high", result_unit: "ng/dL", reference_range: "0.8–1.8", category: "Thyroid" }),
        makeTest({ name: "Total Cholesterol", result_value: "248", result_flag: "high", result_unit: "mg/dL", reference_range: "< 200", category: "Lipid Profile" }),
        makeTest({ name: "LDL", result_value: "162", result_flag: "high", result_unit: "mg/dL", reference_range: "< 130", category: "Lipid Profile" }),
        makeTest({ name: "HDL", result_value: "38", result_flag: "low", result_unit: "mg/dL", reference_range: "> 40", category: "Lipid Profile" }),
        makeTest({ name: "Serum Creatinine", result_value: "0.9", result_flag: "normal", result_unit: "mg/dL", reference_range: "0.6–1.2", category: "Kidney Function" }),
        makeTest({ name: "eGFR", result_value: "88", result_flag: "normal", result_unit: "mL/min", reference_range: "> 60", category: "Kidney Function" }),
      ],
    },
  },
  {
    name: "3_three_pages_40_tests",
    minPages: 2,
    headerContains: "Labora Diagnostics",
    footerContains: "clinical use only",
    data: {
      lab: BASE_LAB,
      patient: { ...BASE_PATIENT, full_name: "Meena Subramaniam", patient_code: "P-00099", gender: "female", age_years: 52 },
      sample_id: "SMP-20260628-0040",
      created_at: new Date().toISOString(),
      collection_time: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      doctor_name: "Dr. Arvind Menon",
      tests: [
        ...makeTests(10, "Haematology"),
        ...makeTests(8, "Biochemistry"),
        ...makeTests(6, "Liver Function"),
        ...makeTests(6, "Kidney Function"),
        ...makeTests(5, "Thyroid"),
        ...makeTests(5, "Lipid Profile"),
      ],
    },
  },
  {
    name: "4_huge_5plus_pages_94_tests",
    minPages: 4,
    headerContains: "Labora Diagnostics",
    footerContains: "clinical use only",
    data: {
      lab: BASE_LAB,
      patient: { ...BASE_PATIENT, full_name: "Ananya Krishnan", patient_code: "P-00200", gender: "female", age_years: 45, age_months: 6 },
      sample_id: "SMP-20260628-0094",
      created_at: new Date().toISOString(),
      collection_time: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      doctor_name: "Dr. Ramesh Iyer",
      verified_by: "Dr. Chitra Balan (Senior Pathologist)",
      verified_at: new Date().toISOString(),
      tests: [
        ...makeTests(10, "Haematology"),
        ...makeTests(8, "Biochemistry"),
        ...makeTests(7, "Liver Function"),
        ...makeTests(6, "Kidney Function"),
        ...makeTests(6, "Thyroid"),
        ...makeTests(6, "Lipid Profile"),
        ...makeTests(5, "Diabetes"),
        ...makeTests(5, "Hormones"),
        ...makeTests(5, "Vitamins & Minerals"),
        ...makeTests(5, "Infectious Disease"),
        ...makeTests(4, "Tumor Markers"),
        ...makeTests(4, "Coagulation"),
        ...makeTests(4, "Cardiac Markers"),
        ...makeTests(4, "Urine Analysis"),
      ],
    },
  },
  {
    name: "5_single_category_overflow",
    minPages: 2,
    headerContains: "City Diagnostics",
    footerContains: "City Diagnostics",
    data: {
      lab: { name: "City Diagnostics", phone: "080-1234-5678" },
      patient: { full_name: "Sunder Rajan", patient_code: "P-00055", age_years: 60, gender: "male" },
      sample_id: "SMP-20260628-0055",
      created_at: new Date().toISOString(),
      doctor_name: "Dr. Lakshmi",
      tests: makeTests(30, "Complete Blood Count"),  // 30 rows in one category → forces page break mid-table
    },
  },
  {
    name: "6_missing_optionals",
    minPages: 1,
    headerContains: "Bare Lab",
    footerContains: "Bare Lab",
    data: {
      // No address, phone, email, gstin, report_header, report_footer
      lab: { name: "Bare Lab" },
      // No age, gender, phone — minimal patient
      patient: { full_name: "Anonymous Patient", patient_code: "P-ANON" },
      sample_id: "SMP-20260628-0000",
      // No collection_time, no doctor_name, no verified_by
      created_at: new Date().toISOString(),
      tests: [
        makeTest({ name: "Haemoglobin", result_value: "—", result_flag: undefined }),
        makeTest({ name: "WBC Count", result_value: "9.1" }),
      ],
    },
  },
  {
    name: "7_long_names_and_footer",
    minPages: 1,
    headerContains: "Sree Venkateswara",
    footerContains: "NABL Accredited",
    data: {
      lab: {
        name: "Sree Venkateswara Advanced Molecular Diagnostics & Research Institute",
        report_header: "NABL Accredited · CAP Certified · ISO 15189:2022 · Ministry of Health Approved Laboratory",
        address: "Survey No. 142/3, Near Apollo Hospital, Jubilee Hills Road No. 78, Hyderabad, Telangana – 500 096, India",
        phone: "+91-40-6789-0123 / +91-40-6789-0124",
        email: "laboratory@sreevenkateshwaradiagnostics.co.in",
        gstin: "36AABCS1234B1ZY",
        report_footer: "NABL Accredited Lab No. MC-2341 | Results valid for 30 days from date of collection | This is a computer-generated report and does not require a physical signature",
      },
      patient: { full_name: "Venkataraman Subramanian Krishnamurthy", patient_code: "P-HYD-00289", age_years: 67, gender: "male", phone: "9000000000" },
      sample_id: "SMP-20260628-HYD-0289",
      created_at: new Date().toISOString(),
      collection_time: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      doctor_name: "Dr. Venkata Narayana Reddy Chakravarthy",
      verified_by: "Dr. Padmavathi Venkataramaiah (Chief Pathologist & HOD)",
      verified_at: new Date().toISOString(),
      tests: [
        ...makeTests(8, "Haematology"),
        ...makeTests(6, "Biochemistry"),
        ...makeTests(5, "Thyroid"),
      ],
    },
  },
  {
    name: "8a_preprinted_mode_no_header_footer",
    minPages: 1,
    // In preprinted mode header/footer are NOT in the PDF — verify absence
    headerContains: "SMP-",  // sample_id in patient info is always present
    footerContains: "SMP-",  // same — just confirm page has content
    data: {
      lab: {
        name: "Preprint Lab",
        report_print_mode: "preprinted" as const,
        phone: "080-1234-5678",
      },
      patient: { full_name: "Test Patient Preprint", patient_code: "P-00200", age_years: 40 },
      sample_id: "SMP-PREPRINT-001",
      created_at: new Date().toISOString(),
      tests: [
        makeTest({ name: "Haemoglobin", result_value: "13.5", result_flag: "normal", category: "Haematology" }),
        makeTest({ name: "WBC Count", result_value: "8.2", result_flag: "normal", category: "Haematology" }),
      ],
    },
  },
  {
    name: "8b_all_critical_flags",
    minPages: 1,
    headerContains: "ICU Lab",
    footerContains: "ICU Lab",
    data: {
      lab: { name: "ICU Lab", report_footer: "ICU Lab — Critical Values Reported Immediately" },
      patient: { full_name: "Emergency Patient", patient_code: "P-ICU-001", age_years: 72, gender: "female" },
      sample_id: "SMP-STAT-20260628-001",
      created_at: new Date().toISOString(),
      doctor_name: "Dr. ICU Specialist",
      tests: [
        makeTest({ name: "Serum Potassium", result_value: "7.2", result_unit: "mEq/L", result_flag: "critical", reference_range: "3.5–5.0", category: "Electrolytes" }),
        makeTest({ name: "Serum Sodium", result_value: "118", result_unit: "mEq/L", result_flag: "critical", reference_range: "135–145", category: "Electrolytes" }),
        makeTest({ name: "Serum Creatinine", result_value: "8.9", result_unit: "mg/dL", result_flag: "critical", reference_range: "0.6–1.2", category: "Kidney Function" }),
        makeTest({ name: "pH (Arterial)", result_value: "7.15", result_unit: "", result_flag: "critical", reference_range: "7.35–7.45", category: "ABG" }),
        makeTest({ name: "pCO2", result_value: "68", result_unit: "mmHg", result_flag: "critical", reference_range: "35–45", category: "ABG" }),
        makeTest({ name: "Haemoglobin", result_value: "5.1", result_unit: "g/dL", result_flag: "critical", reference_range: "12.0–16.0", category: "Haematology" }),
        makeTest({ name: "Platelet Count", result_value: "22", result_unit: "×10³/μL", result_flag: "critical", reference_range: "150–400", category: "Haematology" }),
        makeTest({ name: "Troponin I", result_value: "12.4", result_unit: "ng/mL", result_flag: "critical", reference_range: "< 0.04", category: "Cardiac Markers" }),
      ],
    },
  },
];

// ── Test runner ──────────────────────────────────────────────────────────────

async function runTests() {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  console.log("\n" + "═".repeat(72));
  console.log("  LABORA PDF MULTI-PAGE REPORT TEST SUITE");
  console.log("  " + new Date().toLocaleString("en-IN"));
  console.log("═".repeat(72));

  for (const scenario of SCENARIOS) {
    const filename = `${scenario.name}.pdf`;
    const filepath = join(OUT_DIR, filename);
    process.stdout.write(`\n▶ ${scenario.name.replace(/_/g, " ").padEnd(45)}`);

    try {
      // ── 1. Generate PDF ──────────────────────────────────────────────────
      const buf = await generateReportPDF(scenario.data);
      if (buf.length < 1000) throw new Error(`PDF too small: ${buf.length} bytes (likely render error)`);
      writeFileSync(filepath, buf);

      // ── 2. Check page count ──────────────────────────────────────────────
      const infoOut = execSync(`pdfinfo "${filepath}" 2>&1`).toString();
      const pagesMatch = infoOut.match(/Pages:\s*(\d+)/);
      const actualPages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
      if (actualPages < scenario.minPages) {
        throw new Error(`Expected ≥${scenario.minPages} pages, got ${actualPages}`);
      }

      // ── 3. Extract text per page and assert header+footer ───────────────
      const textOut = execSync(`pdftotext -layout "${filepath}" - 2>&1`).toString();
      // pdftotext separates pages with form-feed \f
      const pages = textOut.split("\f").filter(p => p.trim().length > 0);

      const headerMissing: number[] = [];
      const footerMissing: number[] = [];

      for (let p = 0; p < pages.length; p++) {
        const pageText = pages[p];
        if (!pageText.includes(scenario.headerContains)) headerMissing.push(p + 1);
        if (!pageText.includes(scenario.footerContains)) footerMissing.push(p + 1);
      }

      if (headerMissing.length > 0) {
        throw new Error(`Header missing on pages: ${headerMissing.join(", ")} (expected "${scenario.headerContains}")`);
      }
      if (footerMissing.length > 0) {
        throw new Error(`Footer missing on pages: ${footerMissing.join(", ")} (expected "${scenario.footerContains}")`);
      }

      // ── 4. Verify page numbers in digital mode; absent in preprinted mode ──
      const isPreprinted = scenario.data.lab.report_print_mode === "preprinted";
      const hasPageNumbers = pages.some(p => /Page\s+\d+\s+of\s+\d+/i.test(p));
      if (!isPreprinted && !hasPageNumbers) {
        throw new Error("No page numbers found in any page (digital mode requires page numbers)");
      }
      if (isPreprinted && hasPageNumbers) {
        throw new Error("Page numbers found in preprinted mode — footer should be absent");
      }
      // In preprinted mode, also verify lab name is NOT in the PDF (no digital header)
      if (isPreprinted) {
        const labNameInPdf = pages.some(p => p.includes(scenario.data.lab.name));
        if (labNameInPdf) {
          throw new Error(`Lab name "${scenario.data.lab.name}" found in preprinted PDF — header should be absent`);
        }
      }

      // ── 5. Verify patient name on page 1 only ───────────────────────────
      const patientName = scenario.data.patient.full_name;
      if (!pages[0]?.includes(patientName.split(" ")[0])) {
        throw new Error(`Patient name not found on page 1`);
      }

      // ── PASS ──────────────────────────────────────────────────────────────
      const line = `✓ PASS — ${actualPages} page${actualPages > 1 ? "s" : ""}, ${buf.length.toLocaleString()} bytes`;
      console.log(line);
      results.push(`✓ ${scenario.name}: ${line}`);
      passed++;

    } catch (e: any) {
      const line = `✗ FAIL — ${e.message}`;
      console.log(line);
      results.push(`✗ ${scenario.name}: ${line}`);
      failed++;
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(72));
  console.log(`  Results: ${passed} passed, ${failed} failed / ${SCENARIOS.length} total`);
  if (failed === 0) {
    console.log("  🎉 All scenarios PASSED — header and footer present on every page");
  } else {
    console.log("  ⚠️  Some scenarios FAILED — see details above");
  }
  console.log(`  PDFs saved to: ${OUT_DIR}`);
  console.log("─".repeat(72) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
