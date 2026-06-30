import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const repo = await getRepository();
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data, count } = await repo.listInvoices(session.tenant_id, status, { limit, offset });
  return NextResponse.json({ data, count, page, limit });
}
