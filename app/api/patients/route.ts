import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patientSchema = z.object({
  full_name: z.string().min(2),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: z.string().optional(),
  age_years: z.coerce.number().int().min(0).max(150).optional(),
  age_months: z.coerce.number().int().min(0).max(11).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const repo = await getRepository();
  const search = req.nextUrl.searchParams.get("q") ?? "";
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const { data, count } = await repo.listPatients(session.tenant_id, search || undefined, { limit, offset });
  return NextResponse.json({ data, count, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (!can(session, "patient:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  const count = await repo.countPatients(session.tenant_id);
  const patient_code = `P-${String(count + 1).padStart(5, "0")}`;
  try {
    const patient = await repo.createPatient({
      ...parsed.data,
      tenant_id: session.tenant_id,
      patient_code,
      gender: parsed.data.gender ?? undefined,
      email: parsed.data.email || undefined,
    });
    return NextResponse.json(patient, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
