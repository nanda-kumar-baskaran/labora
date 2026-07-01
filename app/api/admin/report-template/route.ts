/**
 * GET  /api/admin/report-template  — download a .docx template file
 * POST /api/admin/report-template  — upload completed template, extract header/footer images
 *
 * The template Word document has:
 *   - A header section (for the lab's logo/letterhead)
 *   - A footer section (for disclaimers, contact info, accreditation)
 *   - Empty body with a placeholder note
 *
 * When the user uploads the completed .docx:
 *   - We extract the header image (first image in header) → save as logo_url
 *   - We extract the footer text → save as report_footer
 *   - We extract the header text → save as report_header
 */
import { requireSession } from "@/lib/session";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun,
      AlignmentType, BorderStyle, HeadingLevel, PageBreak } = await import("docx");

    const headerInstructions = [
      new Paragraph({
        children: [
          new TextRun({ text: "YOUR LAB LOGO / LETTERHEAD", bold: true, size: 28, color: "DC2626" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Add your lab name, logo, address, phone, email, and accreditation details in this header area.",
            size: 18, color: "6B7280", italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "─".repeat(80), color: "E5E7EB", size: 16 })],
        alignment: AlignmentType.CENTER,
      }),
    ];

    const footerInstructions = [
      new Paragraph({
        children: [new TextRun({ text: "─".repeat(80), color: "E5E7EB", size: 16 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "YOUR FOOTER TEXT", bold: true, size: 18, color: "DC2626" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "e.g. NABL Accredited Lab | Results valid for 30 days | For clinical use only",
            size: 16, color: "6B7280", italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ];

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: headerInstructions,
          }),
        },
        footers: {
          default: new Footer({
            children: footerInstructions,
          }),
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "LABORA REPORT TEMPLATE", bold: true, size: 32, color: "DC2626" }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "INSTRUCTIONS",
                bold: true, size: 22, color: "374151",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1.  Edit the HEADER section (top of this page) — add your lab logo, name, address, accreditation.",
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2.  Edit the FOOTER section (bottom of this page) — add your disclaimer, lab code, website.",
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3.  Do NOT modify the body of this document — only edit header and footer.",
                size: 20, color: "DC2626",
              }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4.  Save the file and upload it back in Settings → Lab Profile → Report Template.",
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "─────────────────────────────────────────────────────────────────────",
                color: "E5E7EB",
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "[ REPORT CONTENT WILL APPEAR HERE ]",
                italics: true, color: "9CA3AF", size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Patient name, test results, reference ranges, and pathologist signature",
                italics: true, color: "D1D5DB", size: 18,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "─────────────────────────────────────────────────────────────────────",
                color: "E5E7EB",
              }),
            ],
            spacing: { before: 200, after: 200 },
          }),
        ],
      }],
    });

    const buf = await Packer.toBuffer(doc);
    // NextResponse needs ArrayBuffer, not Node Buffer
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return new NextResponse(arrayBuf as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="labora-report-template.docx"',
        "Content-Length": String(buf.length),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.endsWith(".docx")) {
      return NextResponse.json({ error: "Please upload a .docx file" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract content using mammoth (text) — parse header text and footer text
    const mammoth = await import("mammoth").catch(() => null);
    let headerText = "";
    let footerText = "";
    let logoBase64: string | null = null;
    let logoContentType = "image/png";

    if (mammoth) {
      // Extract raw text
      const result = await mammoth.extractRawText({ buffer });
      const allText = result.value ?? "";
      // Heuristic: first non-instruction line(s) that aren't our placeholders
      const lines = allText.split("\n").map(l => l.trim()).filter(l => l.length > 3);
      const skip = ["LABORA", "INSTRUCTIONS", "Edit the HEADER", "Edit the FOOTER", "Do NOT", "Save the", "REPORT CONTENT", "Patient name", "─"];
      const contentLines = lines.filter(l => !skip.some(s => l.includes(s)));
      if (contentLines.length > 0) headerText = contentLines[0];
      if (contentLines.length > 1) footerText = contentLines[contentLines.length - 1];
    }

    // Extract images using JSZip (docx is a zip)
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      // Look for images in word/media/
      const mediaFiles = Object.keys(zip.files).filter(k => k.startsWith("word/media/") && !zip.files[k].dir);
      if (mediaFiles.length > 0) {
        const imgFile = zip.files[mediaFiles[0]];
        const imgBuf = await imgFile.async("nodebuffer");
        const ext = mediaFiles[0].split(".").pop()?.toLowerCase();
        const mimeMap: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp" };
        logoContentType = mimeMap[ext ?? "png"] ?? "image/png";
        logoBase64 = `data:${logoContentType};base64,${imgBuf.toString("base64")}`;
      }
    } catch {
      // JSZip not available or no images — skip
    }

    // Save extracted data to tenant
    const { getRepository } = await import("@/lib/db");
    const { getStorage } = await import("@/lib/storage");
    const repo = await getRepository();

    const updates: Record<string, string> = {};
    if (headerText) updates.report_header = headerText;
    if (footerText) updates.report_footer = footerText;

    // If we extracted a logo, save it to storage
    if (logoBase64) {
      // Convert base64 to buffer and upload
      const imgBuffer = Buffer.from(logoBase64.split(",")[1], "base64");
      const storage = await getStorage();
      const logoPath = `${session.tenant_id}/logo-template-${Date.now()}.${logoContentType.split("/")[1]}`;
      await storage.upload(logoPath, imgBuffer, logoContentType);
      const logoUrl = await storage.getUrl(logoPath);
      updates.logo_url = logoUrl;
    }

    if (Object.keys(updates).length > 0) {
      await repo.updateTenant(session.tenant_id, updates);
    }

    return NextResponse.json({
      success: true,
      extracted: {
        hasLogo: !!logoBase64,
        headerText: headerText || null,
        footerText: footerText || null,
      },
      message: `Template applied — ${logoBase64 ? "logo extracted, " : ""}${headerText ? "header text extracted" : "no header text found"}. Check Settings → Lab Profile to verify.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
