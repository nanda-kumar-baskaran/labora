import {
  Document, Page, Text, View, StyleSheet, renderToBuffer, Image,
} from "@react-pdf/renderer";

/**
 * Multi-page report template for Labora.
 *
 * Layout strategy (react-pdf multi-page):
 *   - Header (lab name, accreditation, address, contact) → fixed={true} + absolute position top
 *   - Footer (disclaimer + footer text + page number) → fixed={true} + absolute position bottom
 *   - Both are `fixed` so they repeat on EVERY page automatically.
 *   - Page padding reserves space so content never overlaps header or footer:
 *       paddingTop  = HEADER_TOP + HEADER_HEIGHT + GAP
 *       paddingBottom = FOOTER_HEIGHT + FOOTER_BOTTOM + GAP
 *   - Each table row has wrap={false} so rows are never split across pages.
 *   - Patient info block (page-1 only) does NOT use fixed; it sits in normal flow after the header space.
 */

// ── Dimensions (A4 = 595 × 842 pt) ──────────────────────────────────────────
const PAGE_H = 842;
const SIDE_PAD = 40;
const HEADER_TOP = 20;        // absolute top offset for header
const HEADER_HEIGHT = 78;     // measured max: lab name 18pt + 4 info lines × 11pt ≈ 62pt + border
const CONTENT_TOP_PAD = HEADER_TOP + HEADER_HEIGHT + 14; // 112
const FOOTER_BOTTOM = 18;     // absolute bottom offset for footer
const FOOTER_HEIGHT = 22;     // border + text + spacing
const CONTENT_BOTTOM_PAD = FOOTER_BOTTOM + FOOTER_HEIGHT + 12; // 52

// Pre-printed paper: larger top/bottom margins so content doesn't print over the letterhead area.
// Typical Indian lab letterhead = ~90pt top, ~60pt bottom.
const PREPRINT_TOP_PAD = 100;   // leave 100pt blank at top for letterhead
const PREPRINT_BOTTOM_PAD = 70; // leave 70pt blank at bottom for pre-printed footer

// ── Brand palette (red/dark — matches Labora UI) ─────────────────────────────
const RED = "#DC2626";
const DARK = "#111827";
const MID = "#6b7280";
const LIGHT_BG = "#fef2f2"; // very light red tint for table header
const ROW_ALT = "#fafafa";
const BORDER = "#e5e7eb";
const BORDER_RED = "#fca5a5";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
    paddingTop: CONTENT_TOP_PAD,
    paddingBottom: CONTENT_BOTTOM_PAD,
    paddingLeft: SIDE_PAD,
    paddingRight: SIDE_PAD,
  },

  // ── Fixed header — repeats on every page ──────────────────────────────────
  pageHeader: {
    position: "absolute",
    top: HEADER_TOP,
    left: SIDE_PAD,
    right: SIDE_PAD,
    borderBottom: `2pt solid ${RED}`,
    paddingBottom: 8,
  },
  labName: { fontSize: 17, fontFamily: "Helvetica-Bold", color: RED },
  labSub: { fontSize: 8.5, color: MID, marginTop: 2 },
  labContact: { flexDirection: "row", gap: 14, marginTop: 3 },

  // ── Fixed footer — repeats on every page ──────────────────────────────────
  pageFooter: {
    position: "absolute",
    bottom: FOOTER_BOTTOM,
    left: SIDE_PAD,
    right: SIDE_PAD,
    borderTop: `0.5pt solid ${BORDER}`,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: "#9ca3af" },
  pageNum: { fontSize: 7.5, color: "#9ca3af" },

  // ── Patient info (page 1 only) ───────────────────────────────────────────
  patientSection: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: `0.5pt solid ${BORDER}`,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: RED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoGrid: { flexDirection: "row", gap: 32 },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { fontFamily: "Helvetica-Bold", width: 90, fontSize: 9, color: "#4b5563" },
  infoValue: { flex: 1, fontSize: 9, color: DARK },

  // ── Category + table ────────────────────────────────────────────────────
  categorySection: { marginBottom: 14 },
  catTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    backgroundColor: LIGHT_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderLeft: `3pt solid ${RED}`,
    marginBottom: 0,
  },
  table: {
    border: `1pt solid ${BORDER}`,
    borderRadius: 3,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottom: `1pt solid ${BORDER}`,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#374151" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottom: `0.5pt solid ${BORDER}`,
  },
  tableRowAlt: { backgroundColor: ROW_ALT },
  tableRowLast: { borderBottom: "0pt solid transparent" },
  td: { fontSize: 9, color: DARK },

  // Column widths (flex)
  colTest: { flex: 3.2 },
  colResult: { flex: 1.8 },
  colUnit: { flex: 1.2 },
  colRef: { flex: 2.5 },
  colFlag: { flex: 1.3 },

  // Flag colours
  flagNormal: { color: "#16a34a" },
  flagLow: { color: "#d97706", fontFamily: "Helvetica-Bold" },
  flagHigh: { color: "#d97706", fontFamily: "Helvetica-Bold" },
  flagCritical: { color: "#dc2626", fontFamily: "Helvetica-Bold" },

  // ── Signature block ────────────────────────────────────────────────────
  signatureArea: { marginTop: 24, flexDirection: "row", justifyContent: "flex-end" },
  signatureBox: {
    borderTop: `0.5pt solid #374151`,
    paddingTop: 6,
    width: 180,
    alignItems: "center",
  },
  signatureLabel: { fontSize: 8.5, color: "#4b5563" },
  signatureName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 2 },
  signatureDate: { fontSize: 8, color: MID, marginTop: 1 },
});

const flagStyleMap: Record<string, any> = {
  normal: styles.flagNormal,
  low: styles.flagLow,
  high: styles.flagHigh,
  critical: styles.flagCritical,
};

const flagLabel: Record<string, string> = {
  normal: "Normal",
  low: "Low ↓",
  high: "High ↑",
  critical: "CRITICAL ⚠",
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReportData {
  lab: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    logo_url?: string;       // absolute URL or base64 for the lab logo
    report_header?: string;  // accreditation tagline
    report_footer?: string;  // custom footer text
    /** 'preprinted' = lab uses pre-printed letterhead; omit header & footer from PDF */
    report_print_mode?: "digital" | "preprinted";
  };
  patient: {
    full_name: string;
    patient_code: string;
    age_years?: number;
    age_months?: number;
    gender?: string;
    phone?: string;
    email?: string;
  };
  sample_id: string;
  collection_time?: string;
  created_at: string;
  doctor_name?: string;
  tests: {
    name: string;
    short_code: string;
    result_value?: string;
    result_unit?: string;
    result_flag?: string;
    reference_range?: string;
    category?: string;
    notes?: string;
  }[];
  verified_by?: string;
  verified_at?: string;
}

// ── Document component ───────────────────────────────────────────────────────

function ReportDocument({ data }: { data: ReportData }) {
  // Group tests by category, preserving insertion order within each category
  const categories: Record<string, typeof data.tests> = {};
  for (const t of data.tests) {
    const cat = t.category?.trim() || "Results";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t);
  }

  const isPreprinted = data.lab.report_print_mode === "preprinted";
  const footerText = data.lab.report_footer || data.lab.name;
  const reportDate = (() => {
    try { return new Date(data.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return data.created_at; }
  })();
  const collectedStr = data.collection_time
    ? (() => { try { return new Date(data.collection_time).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return data.collection_time; } })()
    : null;

  // Page style: pre-printed paper uses larger top/bottom margins, no digital header/footer
  const pageStyle = isPreprinted
    ? { ...styles.page, paddingTop: PREPRINT_TOP_PAD, paddingBottom: PREPRINT_BOTTOM_PAD }
    : styles.page;

  return (
    <Document title={`Report – ${data.sample_id} | ${data.lab.name}`} author={data.lab.name}>
      <Page size="A4" style={pageStyle}>

        {/* ── FIXED HEADER: only in digital mode ── */}
        {!isPreprinted && (
          <View style={styles.pageHeader} fixed>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              {/* Logo — only shown if logo_url is present */}
              {data.lab.logo_url && (
                <Image
                  src={data.lab.logo_url}
                  style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 4 }}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.labName}>{data.lab.name}</Text>
                {data.lab.report_header && (
                  <Text style={styles.labSub}>{data.lab.report_header}</Text>
                )}
                {data.lab.address && (
                  <Text style={styles.labSub}>{data.lab.address}</Text>
                )}
                <View style={styles.labContact}>
                  {data.lab.phone && <Text style={styles.labSub}>Tel: {data.lab.phone}</Text>}
                  {data.lab.email && <Text style={styles.labSub}>Email: {data.lab.email}</Text>}
                  {data.lab.gstin && <Text style={styles.labSub}>GSTIN: {data.lab.gstin}</Text>}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── FIXED FOOTER: only in digital mode ── */}
        {!isPreprinted && (
          <View style={styles.pageFooter} fixed>
            <Text style={styles.footerText}>*** This is a computer-generated report — {footerText} ***</Text>
            <Text
              style={styles.pageNum}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        )}

        {/* ── PATIENT INFO (in flow — page 1 only) ── */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{data.patient.full_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Patient ID:</Text>
                <Text style={styles.infoValue}>{data.patient.patient_code}</Text>
              </View>
              {data.patient.age_years != null && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age:</Text>
                  <Text style={styles.infoValue}>
                    {data.patient.age_years} yrs{data.patient.age_months ? ` ${data.patient.age_months} mo` : ""}
                  </Text>
                </View>
              )}
              {data.patient.gender && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Gender:</Text>
                  <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>
                    {data.patient.gender}
                  </Text>
                </View>
              )}
              {data.patient.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{data.patient.phone}</Text>
                </View>
              )}
            </View>
            <View style={styles.infoCol}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sample ID:</Text>
                <Text style={styles.infoValue}>{data.sample_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Report Date:</Text>
                <Text style={styles.infoValue}>{reportDate}</Text>
              </View>
              {collectedStr && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Collected:</Text>
                  <Text style={styles.infoValue}>{collectedStr}</Text>
                </View>
              )}
              {data.doctor_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Referred by:</Text>
                  <Text style={styles.infoValue}>Dr. {data.doctor_name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── TEST RESULTS by category ── */}
        {Object.entries(categories).map(([category, tests]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.catTitle}>{category}</Text>
            <View style={styles.table}>
              {/* Table header — not fixed so it doesn't eat space on pages 2+ */}
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colTest]}>Test Name</Text>
                <Text style={[styles.th, styles.colResult]}>Result</Text>
                <Text style={[styles.th, styles.colUnit]}>Unit</Text>
                <Text style={[styles.th, styles.colRef]}>Reference Range</Text>
                <Text style={[styles.th, styles.colFlag]}>Status</Text>
              </View>

              {tests.map((t, i) => {
                const isLast = i === tests.length - 1;
                const flagSty = t.result_flag ? (flagStyleMap[t.result_flag] ?? {}) : {};
                return (
                  // wrap=false prevents a row from splitting across pages
                  <View
                    key={i}
                    wrap={false}
                    style={[
                      styles.tableRow,
                      i % 2 === 1 ? styles.tableRowAlt : {},
                      isLast ? styles.tableRowLast : {},
                    ]}
                  >
                    <View style={styles.colTest}>
                      <Text style={styles.td}>{t.name}</Text>
                      {t.notes && (
                        <Text style={{ fontSize: 7.5, color: MID, marginTop: 1 }}>{t.notes}</Text>
                      )}
                    </View>
                    <Text style={[styles.td, styles.colResult, flagSty]}>
                      {t.result_value ?? "—"}
                    </Text>
                    <Text style={[styles.td, styles.colUnit]}>{t.result_unit ?? "—"}</Text>
                    <Text style={[styles.td, styles.colRef]}>{t.reference_range ?? "—"}</Text>
                    <Text style={[styles.td, styles.colFlag, flagSty]}>
                      {t.result_flag ? (flagLabel[t.result_flag] ?? t.result_flag.toUpperCase()) : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── SIGNATURE / VERIFICATION ── */}
        <View wrap={false} style={styles.signatureArea}>
          <View style={styles.signatureBox}>
            {data.verified_by ? (
              <>
                <Text style={styles.signatureLabel}>Electronically verified by</Text>
                <Text style={styles.signatureName}>{data.verified_by}</Text>
                {data.verified_at && (
                  <Text style={styles.signatureDate}>
                    {(() => { try { return new Date(data.verified_at).toLocaleString("en-IN"); } catch { return data.verified_at; } })()}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.signatureLabel}>Pathologist Signature</Text>
                <Text style={[styles.signatureLabel, { marginTop: 20, color: "#d1d5db" }]}>
                  Pending verification
                </Text>
              </>
            )}
          </View>
        </View>

      </Page>
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  return await renderToBuffer(<ReportDocument data={data} />);
}
