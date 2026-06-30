import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { randomBytes } from "crypto";

const orderSchema = z.object({
  patient_id: z.string(),
  doctor_id: z.string().optional(),
  referred_by: z.string().optional(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  notes: z.string().optional(),
  tests: z.array(z.object({
    test_id: z.string(),
    price: z.coerce.number().min(0),
    discount_pct: z.coerce.number().min(0).max(100).default(0),
  })).min(1),
});

async function generateSampleId(repo: any, tenantId: string): Promise<string> {
  const today = format(new Date(), "yyyyMMdd");
  const count = await repo.countTodayOrders(tenantId);
  return `SMP-${today}-${String(count + 1).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const repo = await getRepository();
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data, count } = await repo.listOrders(session.tenant_id, status, { limit, offset });
  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!can(session, "order:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  const sample_id = await generateSampleId(repo, session.tenant_id);
  try {
    const order = await repo.createOrder({
      tenant_id: session.tenant_id, sample_id,
      patient_id: parsed.data.patient_id,
      doctor_id: parsed.data.doctor_id,
      referred_by: parsed.data.referred_by,
      priority: parsed.data.priority,
      notes: parsed.data.notes,
      status: "registered",
      created_by: session.id,
    });
    await repo.createOrderTests(parsed.data.tests.map(t => ({
      tenant_id: session.tenant_id, order_id: order.id,
      test_id: t.test_id, price: t.price, discount_pct: t.discount_pct, status: "pending" as const,
    })));
    // Auto-generate invoice with collision-safe number (hex ensures uniqueness)
    const subtotal = parsed.data.tests.reduce((s, t) => s + t.price * (1 - t.discount_pct / 100), 0);
    const invoiceNumber = `INV-${format(new Date(), "yyyyMM")}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const invoice = await repo.createInvoice({
      tenant_id: session.tenant_id, invoice_number: invoiceNumber,
      order_id: order.id, patient_id: parsed.data.patient_id,
      subtotal, discount_amt: 0, tax_amt: 0, total_amt: subtotal, paid_amt: 0,
      status: "unpaid", created_by: session.id,
    });
    // Doctor commission
    if (parsed.data.doctor_id) {
      const doctor = await repo.getDoctor(parsed.data.doctor_id, session.tenant_id);
      if (doctor && doctor.commission_pct > 0) {
        await repo.createReferral({
          tenant_id: session.tenant_id, order_id: order.id,
          doctor_id: parsed.data.doctor_id, invoice_id: invoice.id,
          commission_pct: doctor.commission_pct,
          commission_amt: (subtotal * doctor.commission_pct) / 100,
          is_paid: false,
        });
      }
    }
    return NextResponse.json(order, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
