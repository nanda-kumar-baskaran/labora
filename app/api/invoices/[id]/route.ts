import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();
  const invoice = await repo.getInvoice(id, session.tenant_id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}
