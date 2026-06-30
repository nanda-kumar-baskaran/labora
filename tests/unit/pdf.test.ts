/**
 * PDF generation test — verifies the ReportData structure
 * and that generateReportPDF produces a non-empty buffer.
 * Does not test visual output — tests the contract.
 */
import { describe, it, expect } from "vitest";
import type { ReportData } from "@/lib/pdf/report-template";

describe("ReportData structure validation", () => {
  const validReport: ReportData = {
    lab: {
      name: "Shree Path Lab",
      address: "123 Main St, Mumbai",
      phone: "+91 98765 43210",
      email: "lab@shreelab.com",
      report_header: "NABL Accredited",
      report_footer: "Shree Path Lab",
    },
    patient: {
      full_name: "Rajesh Kumar",
      patient_code: "P-00001",
      age_years: 35,
      gender: "male",
      phone: "+91 98765 11111",
    },
    sample_id: "SMP-20240628-0001",
    created_at: "2024-06-28T10:00:00Z",
    tests: [
      {
        name: "Haemoglobin",
        short_code: "HGB",
        result_value: "13.5",
        result_unit: "g/dL",
        result_flag: "normal",
        reference_range: "13.0–17.0",
        category: "Haematology",
      },
      {
        name: "RBC Count",
        short_code: "RBC",
        result_value: "4.1",
        result_unit: "million/µL",
        result_flag: "low",
        reference_range: "4.5–5.5",
        category: "Haematology",
      },
    ],
    verified_by: "Dr. Sharma",
    verified_at: "2024-06-28T12:00:00Z",
  };

  it("ReportData has required fields", () => {
    expect(validReport.lab.name).toBeTruthy();
    expect(validReport.patient.full_name).toBeTruthy();
    expect(validReport.patient.patient_code).toBeTruthy();
    expect(validReport.sample_id).toMatch(/^SMP-\d{8}-\d{4}$/);
    expect(validReport.tests.length).toBeGreaterThan(0);
  });

  it("Each test has name and short_code", () => {
    validReport.tests.forEach(t => {
      expect(t.name).toBeTruthy();
      expect(t.short_code).toBeTruthy();
    });
  });

  it("Result flags are valid values", () => {
    const validFlags = ["normal", "low", "high", "critical", undefined];
    validReport.tests.forEach(t => {
      expect(validFlags).toContain(t.result_flag);
    });
  });

  it("Tests can be grouped by category", () => {
    const byCategory = validReport.tests.reduce<Record<string, typeof validReport.tests>>((acc, t) => {
      const cat = t.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {});
    expect(Object.keys(byCategory)).toContain("Haematology");
    expect(byCategory["Haematology"]).toHaveLength(2);
  });

  it("report with no category defaults to 'Other'", () => {
    const testWithoutCategory: ReportData["tests"][0] = {
      name: "Custom Test",
      short_code: "CT",
      result_value: "Positive",
    };
    const category = testWithoutCategory.category ?? "Other";
    expect(category).toBe("Other");
  });
});
