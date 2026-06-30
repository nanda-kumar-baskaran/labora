import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const testSchema = z.object({
  name: z.string().min(1),
  short_code: z.string().min(1),
  category: z.string().optional(),
  sample_type: z.string().optional(),
  turnaround_hrs: z.coerce.number().int().min(1).default(24),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0).optional(),
  reference_range: z.string().optional(),
  unit: z.string().optional(),
  method: z.string().optional(),
});

export async function GET() {
  const session = await requireSession();
  const repo = await getRepository();
  const data = await repo.listTests(session.tenant_id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  try {
    const test = await repo.createTest({
      ...parsed.data,
      short_code: parsed.data.short_code.toUpperCase(),
      tenant_id: session.tenant_id,
      is_active: true,
    });
    return NextResponse.json(test, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
