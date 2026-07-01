import { getRepository } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";
import { generateReportPDF } from "@/lib/pdf/report-template";
import type { ReportData } from "@/lib/pdf/report-template";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const repo = await getRepository();
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data, count } = await repo.listReports(session.tenant_id, undefined, { limit, offset });
  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (!can(session, "report:generate")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { order_id } = await req.json();
  if (!order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 });
  const repo = await getRepository();
  const storage = await getStorage();
  const order = await repo.getOrder(order_id, session.tenant_id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const tenant = await repo.getTenant(session.tenant_id);
  if (!order.patient) return NextResponse.json({ error: "Patient data missing from order" }, { status: 500 });
  // Build logo URL — if it's a relative path, make it absolute using the app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const rawLogo = (tenant as any)?.logo_url;
  const logoUrl = rawLogo
    ? rawLogo.startsWith("http") ? rawLogo : `${appUrl}${rawLogo}`
    : undefined;

  const reportData: ReportData = {
    lab: {
      ...(tenant ?? { name: "Lab" }),
      logo_url: logoUrl,
      report_print_mode: (tenant as any)?.report_print_mode ?? "digital",
    },
    patient: order.patient,
    sample_id: order.sample_id,
    collection_time: order.collection_time,
    created_at: order.created_at,
    doctor_name: order.doctor?.full_name,
    tests: (order.order_tests ?? []).map((ot: any) => ({
      name: ot.test?.name, short_code: ot.test?.short_code,
      result_value: ot.result_value, result_unit: ot.result_unit,
      result_flag: ot.result_flag, reference_range: ot.test?.reference_range,
      category: ot.test?.category,
    })),
  };
  const pdfBuffer = await generateReportPDF(reportData);
  const pdfPath = `${session.tenant_id}/${order.sample_id}-${Date.now()}.pdf`;
  try {
    await storage.upload(pdfPath, pdfBuffer, "application/pdf");
    const pdfUrl = await storage.getUrl(pdfPath, 3600);
    const existingReport = await repo.getReportByOrder(order_id);
    if (existingReport) {
      await repo.updateReport(existingReport.id, session.tenant_id, { pdf_path: pdfPath, pdf_url: pdfUrl, status: "draft", generated_by: session.id });
      return NextResponse.json({ id: existingReport.id, public_token: existingReport.public_token, pdf_url: pdfUrl });
    }
    const report = await repo.createReport({ tenant_id: session.tenant_id, order_id, pdf_path: pdfPath, pdf_url: pdfUrl, status: "draft", generated_by: session.id });
    return NextResponse.json(report, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
