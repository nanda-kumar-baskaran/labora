import { getRepository } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepository();
  const storage = await getStorage();
  const report = await repo.getReportByToken(token);
  if (!report) return NextResponse.json({ error: "Report not found or not verified" }, { status: 404 });
  const tenant = await repo.getTenant(report.order?.tenant_id ?? report.tenant_id);
  let pdfUrl: string | null = null;
  if (report.pdf_path) {
    try { pdfUrl = await storage.getUrl(report.pdf_path, 3600); } catch { /* non-fatal */ }
  }
  return NextResponse.json({ report, tenant, pdfUrl });
}
