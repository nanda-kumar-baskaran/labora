/**
 * GET /api/work-queue
 * Returns the work queue for the current user based on their role.
 * Technician: orders needing sample collection + result entry
 * Pathologist: orders with all results done but report unverified
 * Staff: today's orders + pending patients
 */
import { getRepository } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();
  const repo = await getRepository();

  const { data: allOrders } = await repo.listOrders(session.tenant_id, undefined, { limit: 200, offset: 0 });
  const today = new Date().toISOString().split("T")[0];

  if (session.role === "technician") {
    // Pending collections (registered) + results to enter (collected/processing)
    const pendingCollection = allOrders.filter((o: any) => o.status === "registered");
    const pendingResults = allOrders.filter((o: any) => ["collected", "processing"].includes(o.status));
    const todayOrders = allOrders.filter((o: any) => o.created_at?.startsWith(today));
    return NextResponse.json({
      role: "technician",
      pendingCollection: pendingCollection.slice(0, 10),
      pendingResults: pendingResults.slice(0, 10),
      todayCount: todayOrders.length,
      totalPending: pendingCollection.length + pendingResults.length,
    });
  }

  if (session.role === "pathologist") {
    // Orders completed (all results in) but report not verified
    const completedOrders = allOrders.filter((o: any) => o.status === "completed");
    const pendingReports = await repo.countPendingReports(session.tenant_id);
    const { data: draftReports } = await repo.listReports(session.tenant_id, "draft", { limit: 20, offset: 0 });
    const todayOrders = allOrders.filter((o: any) => o.created_at?.startsWith(today));
    return NextResponse.json({
      role: "pathologist",
      pendingVerification: draftReports,
      completedOrdersCount: completedOrders.length,
      pendingReports,
      todayCount: todayOrders.length,
    });
  }

  // Admin has full dashboard — shouldn't call this
  if (session.role === "admin") {
    return NextResponse.json({ error: "Admin should use /api/dashboard" }, { status: 400 });
  }

  if (session.role === "staff") {
    const todayOrders = allOrders.filter((o: any) => o.created_at?.startsWith(today));
    const totalPatients = await repo.countPatients(session.tenant_id);
    const recentPatients = await repo.getRecentPatients(session.tenant_id, 5);
    const ordersByStatus = await repo.getOrdersByStatus(session.tenant_id);
    return NextResponse.json({
      role: "staff",
      todayOrders: todayOrders.slice(0, 10),
      todayCount: todayOrders.length,
      totalPatients,
      recentPatients,
      ordersByStatus,
    });
  }

  return NextResponse.json({ error: "Unexpected role" }, { status: 400 });
}
