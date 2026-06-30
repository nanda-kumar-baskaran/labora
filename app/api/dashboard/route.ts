import { getRepository } from "@/lib/db";
import { requireSession, hasRole } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();
  if (!hasRole(session, ["admin"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const repo = await getRepository();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const [
    todayOrders,
    pendingReports,
    todayRevenue,
    pendingPaymentsAmt,
    topDoctors,
    weeklyOrders,
    monthlyRevenue,
    ordersByStatus,
    testPopularity,
    recentPatients,
    totalPatients,
  ] = await Promise.all([
    repo.countTodayOrders(session.tenant_id),
    repo.countPendingReports(session.tenant_id),
    repo.getTodayRevenue(session.tenant_id),
    repo.getPendingPaymentsTotal(session.tenant_id),
    repo.getTopDoctors(session.tenant_id, weekAgo),
    repo.getWeeklyOrderCounts(session.tenant_id, weekAgo),
    repo.getMonthlyRevenue(session.tenant_id, sixMonthsAgo),
    repo.getOrdersByStatus(session.tenant_id),
    repo.getTestPopularity(session.tenant_id, weekAgo),
    repo.getRecentPatients(session.tenant_id, 5),
    repo.countPatients(session.tenant_id),
  ]);

  return NextResponse.json({
    todayOrders, pendingReports, todayRevenue, pendingPaymentsAmt,
    topDoctors, weeklyOrders,
    monthlyRevenue, ordersByStatus, testPopularity, recentPatients,
    totalPatients,
  });
}
