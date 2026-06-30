/**
 * POST /api/reports/[id]/email
 * Emails the PDF report to the patient.
 * Requires SMTP env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Falls back gracefully if nodemailer is not installed.
 */
import { getRepository } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

const SMTP_VARS = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!["admin", "pathologist", "staff"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check SMTP config
  const smtpMissing = SMTP_VARS.some(v => !process.env[v]);
  if (smtpMissing) {
    return NextResponse.json({
      error: "SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM to your environment.",
      smtpMissing: true,
    }, { status: 422 });
  }

  const repo = await getRepository();
  const report = await repo.getReportByToken("").catch(() => null); // find by id below
  // Fetch report directly
  const { data: reports } = await repo.listReports(session.tenant_id, undefined, { limit: 1000, offset: 0 });
  const found = reports.find((r: any) => r.id === id);
  if (!found) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const order = await repo.getOrder(found.order_id!, session.tenant_id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const patientEmail = (order.patient as any)?.email;
  if (!patientEmail) {
    return NextResponse.json({ error: "Patient has no email address on file" }, { status: 422 });
  }

  if (!found.pdf_path) {
    return NextResponse.json({ error: "No PDF generated yet — generate the report first" }, { status: 422 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let nodemailerMod: any;
    try { nodemailerMod = require("nodemailer"); } catch { /* not installed */ }
    if (!nodemailerMod) {
      return NextResponse.json({ error: "nodemailer package not installed. Run: npm install nodemailer", smtpMissing: true }, { status: 422 });
    }

    const storage = await getStorage();
    const pdfUrl = await storage.getUrl(found.pdf_path, 3600);

    // Fetch the PDF bytes to attach
    let pdfBuffer: Buffer | undefined;
    try {
      const pdfRes = await fetch(pdfUrl);
      pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    } catch {
      // If we can't fetch (e.g. local storage), send link only
    }

    const transporter = nodemailerMod.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const labName = (await repo.getTenant(session.tenant_id))?.name ?? "Lab";
    const patientName = order.patient?.full_name ?? "Patient";
    const sampleId = order.sample_id;

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: patientEmail,
      subject: `Your Lab Report — ${sampleId} | ${labName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#DC2626">${labName}</h2>
          <p>Dear ${patientName},</p>
          <p>Your lab report for sample <strong>${sampleId}</strong> is ready.</p>
          ${pdfBuffer ? "<p>Please find your report attached as a PDF.</p>" : `<p><a href="${pdfUrl}">Click here to download your report</a></p>`}
          <p style="color:#888;font-size:12px;margin-top:24px">This is an automated email from ${labName}. Please do not reply.</p>
        </div>
      `,
      attachments: pdfBuffer ? [{ filename: `report-${sampleId}.pdf`, content: pdfBuffer, contentType: "application/pdf" }] : [],
    });

    return NextResponse.json({ success: true, sentTo: patientEmail });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Email failed" }, { status: 500 });
  }
}
