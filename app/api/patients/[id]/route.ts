import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional(),
  age_years: z.coerce.number().int().min(0).max(150).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();
  const patient = await repo.getPatient(id, session.tenant_id);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: orders } = await repo.listOrders(session.tenant_id, undefined, { limit: 20, offset: 0 });
  const patientOrders = orders.filter((o: any) => o.patient_id === id);
  return NextResponse.json({ patient, orders: patientOrders });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!can(session, "patient:edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  try {
    const old = await repo.getPatient(id, session.tenant_id);
    if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const patient = await repo.updatePatient(id, session.tenant_id, parsed.data);
    await logAudit(repo, session, "update", "patient", id, old.full_name, old as any, parsed.data as any);
    return NextResponse.json(patient);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
