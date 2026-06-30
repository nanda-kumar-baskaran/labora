import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();
  const order = await repo.getOrder(id, session.tenant_id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const history = await repo.getStatusHistory(id);
  return NextResponse.json({ order, history });
}
