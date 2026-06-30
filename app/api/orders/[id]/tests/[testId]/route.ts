import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const resultSchema = z.object({
  result_value: z.string().optional(),
  result_unit: z.string().optional(),
  result_flag: z.enum(["normal", "low", "high", "critical"]).optional(),
  result_notes: z.string().optional(),
  status: z.enum(["pending", "processing", "completed"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; testId: string }> }) {
  const { id: orderId, testId } = await params;
  const session = await requireSession();
  if (!["admin", "technician", "pathologist"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = resultSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepository();
  const updateData: any = { ...parsed.data };
  if (parsed.data.status === "completed") {
    updateData.completed_by = session.id;
    updateData.completed_at = new Date().toISOString();
  }
  try {
    // Fetch old result for audit diff
    const oldTests = await repo.getOrderTests(orderId, session.tenant_id);
    const oldTest = oldTests.find(t => t.id === testId);
    await repo.updateOrderTest(testId, orderId, session.tenant_id, updateData);
    const allDone = await repo.allTestsDone(orderId, session.tenant_id);
    if (allDone) await repo.updateOrderStatus(orderId, session.tenant_id, "completed", session.id);
    // Audit result entry
    await logAudit(repo, session, "update_result", "order_test", testId,
      `Order ${orderId} / Test ${testId}`, oldTest as any ?? {}, updateData as any);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
