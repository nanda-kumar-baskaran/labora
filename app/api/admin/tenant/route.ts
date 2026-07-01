import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  const repo = await getRepository();
  const tenant = await repo.getTenant(session.tenant_id);
  return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const repo = await getRepository();
  try {
    const old = await repo.getTenant(session.tenant_id);
    const tenant = await repo.updateTenant(session.tenant_id, body);
    await logAudit(repo, session, "update", "tenant", session.tenant_id, old?.name, old as any ?? {}, body as any);
    return NextResponse.json(tenant);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
