import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const doctorSchema = z.object({
  full_name: z.string().min(2),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  clinic_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  commission_pct: z.coerce.number().min(0).max(100).default(0),
});

export async function GET() {
  const session = await requireSession();
  const repo = await getRepository();
  const data = await repo.listDoctors(session.tenant_id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!["admin", "staff"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = doctorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  try {
    const doctor = await repo.createDoctor({ ...parsed.data, tenant_id: session.tenant_id, is_active: true, email: parsed.data.email || undefined });
    return NextResponse.json(doctor, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
