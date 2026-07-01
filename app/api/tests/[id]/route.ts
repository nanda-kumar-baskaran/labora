import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { requireWriteAccess } from "@/lib/subscription";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  short_code: z.string().min(1).optional(),
  category: z.string().optional(),
  sample_type: z.string().optional(),
  turnaround_hrs: z.coerce.number().int().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  cost: z.coerce.number().min(0).optional(),
  reference_range: z.string().optional(),
  unit: z.string().optional(),
  method: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const denied = await requireWriteAccess(session);
  if (denied) return denied;
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  try {
    const old = await repo.getTest(id, session.tenant_id);
    const updated = await repo.updateTest(id, session.tenant_id, parsed.data);
    await logAudit(repo, session, "update", "test_catalog", id, old?.name, old as any ?? {}, parsed.data as any);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
