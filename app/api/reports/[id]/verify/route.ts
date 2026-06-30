import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!["admin", "pathologist"].includes(session.role)) {
    return NextResponse.json({ error: "Only pathologists can verify reports" }, { status: 403 });
  }
  const repo = await getRepository();
  try {
    await repo.updateReport(id, session.tenant_id, { status: "verified", verified_by: session.id, verified_at: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** PATCH — reset report status (e.g. back to draft for correction) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!["admin", "pathologist"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { status } = await req.json().catch(() => ({}));
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });
  const repo = await getRepository();
  try {
    await repo.updateReport(id, session.tenant_id, { status });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
