import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") ?? "1");
  const limit = 50;
  const offset = (page - 1) * limit;
  const entity_type = sp.get("entity_type") ?? undefined;
  const entity_id = sp.get("entity_id") ?? undefined;
  const actor_id = sp.get("actor_id") ?? undefined;

  const repo = await getRepository();
  const result = await repo.listAuditLogs(session.tenant_id, { entity_type, entity_id, actor_id, limit, offset });
  return NextResponse.json({ ...result, page, limit });
}
