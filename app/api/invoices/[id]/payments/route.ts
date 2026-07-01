import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["cash", "card", "upi", "netbanking", "cheque", "other"]),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
  payment_date: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();
  const payments = await repo.listPayments(id, session.tenant_id);
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (!can(session, "billing:record")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  const invoice = await repo.getInvoice(id, session.tenant_id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (parsed.data.amount > invoice.balance_amt + 0.01) {
    return NextResponse.json({ error: `Amount exceeds balance of ₹${invoice.balance_amt.toFixed(2)}` }, { status: 400 });
  }
  try {
    const payment = await repo.createPayment({
      tenant_id: session.tenant_id, invoice_id: id,
      amount: parsed.data.amount, method: parsed.data.method,
      reference_no: parsed.data.reference_no,
      notes: parsed.data.notes,
      payment_date: parsed.data.payment_date ?? new Date().toISOString().split("T")[0],
      collected_by: session.id,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
