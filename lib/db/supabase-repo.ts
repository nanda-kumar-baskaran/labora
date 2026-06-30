import { createClient, createAdminClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import type { IRepository } from "./interface";
import type {
  DBPatient, DBDoctor, DBTestCatalog, DBOrder, DBOrderTest,
  DBReport, DBInvoice, DBPayment, DBTenant, DBUser, DBStatusHistory,
  DBReferral, ListOptions, PaginatedResult,
  OrderStatus, TestStatus, ResultFlag,
} from "./types";

export class SupabaseRepository implements IRepository {

  // ── Tenants ──────────────────────────────────────────────────────
  async getTenant(tenantId: string): Promise<DBTenant | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    return data ?? null;
  }

  async updateTenant(tenantId: string, data: Partial<DBTenant>): Promise<DBTenant> {
    const supabase = await createClient();
    const { id, created_at, updated_at, plan, is_active, slug, ...safe } = data as any;
    const { data: updated, error } = await supabase.from("tenants").update(safe).eq("id", tenantId).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  // ── Users ─────────────────────────────────────────────────────────
  async getUser(userId: string): Promise<DBUser | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("users").select("*").eq("id", userId).single();
    return data ?? null;
  }

  async getUserByEmail(email: string, tenantId: string): Promise<DBUser | null> {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("users")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("email", email)   // BUG FIX: was missing email filter — returned any user in tenant
      .single();
    return (data as DBUser) ?? null;
  }

  async listUsers(tenantId: string): Promise<DBUser[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("users").select("*").eq("tenant_id", tenantId).order("created_at");
    return (data ?? []) as DBUser[];
  }

  async createUser(data: Omit<DBUser, "created_at" | "updated_at">): Promise<DBUser> {
    const admin = await createAdminClient();
    const { data: created, error } = await admin.from("users").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  async updateUser(userId: string, tenantId: string, data: Partial<DBUser>): Promise<DBUser> {
    const supabase = await createClient();
    const { data: updated, error } = await supabase.from("users").update(data).eq("id", userId).eq("tenant_id", tenantId).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  // ── Patients ──────────────────────────────────────────────────────
  async countPatients(tenantId: string): Promise<number> {
    const supabase = await createClient();
    const { count } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
    return count ?? 0;
  }

  async listPatients(tenantId: string, search?: string, opts?: ListOptions): Promise<PaginatedResult<DBPatient>> {
    const supabase = await createClient();
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let q = supabase.from("patients").select("*", { count: "exact" }).eq("tenant_id", tenantId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,patient_code.ilike.%${search}%`);
    const { data, count } = await q;
    return { data: data ?? [], count: count ?? 0 };
  }

  async getPatient(id: string, tenantId: string): Promise<DBPatient | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("patients").select("*").eq("id", id).eq("tenant_id", tenantId).single();
    return data ?? null;
  }

  async createPatient(data: Omit<DBPatient, "id" | "created_at" | "updated_at">): Promise<DBPatient> {
    const supabase = await createClient();
    const { data: created, error } = await supabase.from("patients").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  async updatePatient(id: string, tenantId: string, data: Partial<DBPatient>): Promise<DBPatient> {
    const supabase = await createClient();
    const { data: updated, error } = await supabase.from("patients").update(data).eq("id", id).eq("tenant_id", tenantId).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  // ── Test Catalog ──────────────────────────────────────────────────
  async listTests(tenantId: string): Promise<DBTestCatalog[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("test_catalog").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("category").order("name");
    return data ?? [];
  }

  async getTest(id: string, tenantId: string): Promise<DBTestCatalog | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("test_catalog").select("*").eq("id", id).eq("tenant_id", tenantId).single();
    return data ?? null;
  }

  async createTest(data: Omit<DBTestCatalog, "id" | "created_at">): Promise<DBTestCatalog> {
    const supabase = await createClient();
    const { data: created, error } = await supabase.from("test_catalog").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  async updateTest(id: string, tenantId: string, data: Partial<Pick<DBTestCatalog, "name" | "short_code" | "category" | "sample_type" | "price" | "cost" | "reference_range" | "unit" | "turnaround_hrs" | "method" | "is_active">>): Promise<DBTestCatalog> {
    const supabase = await createClient();
    const { data: updated, error } = await supabase.from("test_catalog").update(data).eq("id", id).eq("tenant_id", tenantId).select().single();
    if (error) throw new Error(error.message);
    return updated;
  }

  // ── Orders ────────────────────────────────────────────────────────
  async listOrders(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<DBOrder & { patient?: any; doctor?: any }>> {
    const supabase = await createClient();
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let q = supabase.from("sample_orders")
      .select("*, patient:patients(full_name, phone, patient_code), doctor:doctors(full_name), order_tests(count)", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) q = q.eq("status", status);
    const { data, count } = await q;
    return { data: data ?? [], count: count ?? 0 };
  }

  async getOrder(id: string, tenantId: string): Promise<any> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("sample_orders")
      .select("*, patient:patients(*), doctor:doctors(full_name, phone), order_tests(*, test:test_catalog(*)), reports(id, status, public_token, pdf_url), invoices(id, invoice_number, total_amt, paid_amt, balance_amt, status)")
      .eq("id", id).eq("tenant_id", tenantId).single();
    if (error || !data) return null;
    return data;
  }

  async createOrder(data: Omit<DBOrder, "id" | "created_at" | "updated_at">): Promise<DBOrder> {
    const supabase = await createClient();
    const { data: created, error } = await supabase.from("sample_orders").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  async updateOrderStatus(id: string, tenantId: string, status: OrderStatus, changedBy: string, collectedBy?: string): Promise<void> {
    const supabase = await createClient();
    const { data: current } = await supabase.from("sample_orders").select("status").eq("id", id).eq("tenant_id", tenantId).single();
    const updateData: any = { status };
    if (status === "collected") { updateData.collection_time = new Date().toISOString(); updateData.collected_by = collectedBy ?? changedBy; }
    await supabase.from("sample_orders").update(updateData).eq("id", id).eq("tenant_id", tenantId);
    // Status history is handled by DB trigger in Supabase
  }

  async countTodayOrders(tenantId: string): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase.from("sample_orders").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", today);
    return count ?? 0;
  }

  // ── Order Tests ───────────────────────────────────────────────────
  async createOrderTests(tests: Omit<DBOrderTest, "id" | "created_at">[]): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("order_tests").insert(tests);
    if (error) throw new Error(error.message);
  }

  async updateOrderTest(id: string, orderId: string, tenantId: string, data: any): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("order_tests").update(data).eq("id", id).eq("order_id", orderId).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  }

  async getOrderTests(orderId: string, tenantId: string): Promise<DBOrderTest[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("order_tests").select("*").eq("order_id", orderId).eq("tenant_id", tenantId);
    return data ?? [];
  }

  async allTestsDone(orderId: string, tenantId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data } = await supabase.from("order_tests").select("status").eq("order_id", orderId).eq("tenant_id", tenantId);
    return (data ?? []).length > 0 && (data ?? []).every((t: any) => t.status === "completed" || t.status === "cancelled");
  }

  // ── Status History ────────────────────────────────────────────────
  async getStatusHistory(orderId: string): Promise<DBStatusHistory[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("sample_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
    return data ?? [];
  }

  // ── Reports ───────────────────────────────────────────────────────
  async listReports(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<any>> {
    const supabase = await createClient();
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let q = supabase.from("reports")
      .select("*, order:sample_orders(sample_id, patient:patients(full_name, patient_code))", { count: "exact" })
      .eq("tenant_id", tenantId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status) q = q.eq("status", status);
    const { data, count } = await q;
    return { data: data ?? [], count: count ?? 0 };
  }

  async getReportByOrder(orderId: string): Promise<DBReport | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("reports").select("*").eq("order_id", orderId).single();
    return data ?? null;
  }

  async getReportByToken(token: string): Promise<any> {
    const admin = await createAdminClient();
    const { data } = await admin.from("reports")
      .select("*, order:sample_orders(*, patient:patients(*), doctor:doctors(full_name), order_tests(*, test:test_catalog(*)))")
      .eq("public_token", token).eq("status", "verified").single();
    return data ?? null;
  }

  async createReport(data: Omit<DBReport, "id" | "created_at" | "updated_at" | "public_token">): Promise<DBReport> {
    const supabase = await createClient();
    const public_token = randomBytes(16).toString("hex");
    const { data: created, error } = await supabase.from("reports").insert({ ...data, public_token }).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  async updateReport(id: string, tenantId: string, data: Partial<DBReport>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("reports").update(data).eq("id", id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  }

  async countPendingReports(tenantId: string): Promise<number> {
    const supabase = await createClient();
    const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "draft");
    return count ?? 0;
  }

  // ── Invoices ──────────────────────────────────────────────────────
  async listInvoices(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<any>> {
    const supabase = await createClient();
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    let q = supabase.from("invoices")
      .select("*, patient:patients(full_name, patient_code), order:sample_orders(sample_id)", { count: "exact" })
      .eq("tenant_id", tenantId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (status) q = q.eq("status", status);
    const { data, count } = await q;
    return { data: data ?? [], count: count ?? 0 };
  }

  async getInvoice(id: string, tenantId: string): Promise<any> {
    const supabase = await createClient();
    const { data } = await supabase.from("invoices")
      .select("*, patient:patients(full_name, patient_code), order:sample_orders(sample_id)")
      .eq("id", id).eq("tenant_id", tenantId).single();
    return data ?? null;
  }

  async getInvoiceByOrder(orderId: string, tenantId: string): Promise<DBInvoice | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("invoices").select("*").eq("order_id", orderId).eq("tenant_id", tenantId).single();
    return data ?? null;
  }

  async createInvoice(data: Omit<DBInvoice, "id" | "created_at" | "updated_at" | "balance_amt">): Promise<DBInvoice> {
    const supabase = await createClient();
    const { data: created, error } = await supabase.from("invoices").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  async getTodayRevenue(tenantId: string): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("payments").select("amount").eq("tenant_id", tenantId).gte("payment_date", today);
    return (data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  }

  async getPendingPaymentsTotal(tenantId: string): Promise<number> {
    const supabase = await createClient();
    const { data } = await supabase.from("invoices").select("balance_amt").eq("tenant_id", tenantId).not("status", "in", '("paid","cancelled")');
    return (data ?? []).reduce((s: number, i: any) => s + Number(i.balance_amt), 0);
  }

  // ── Payments ──────────────────────────────────────────────────────
  async listPayments(invoiceId: string, tenantId: string): Promise<DBPayment[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("payments").select("*").eq("invoice_id", invoiceId).eq("tenant_id", tenantId).order("created_at", { ascending: false });
    return data ?? [];
  }

  async createPayment(data: Omit<DBPayment, "id" | "created_at">): Promise<DBPayment> {
    const supabase = await createClient();
    const { data: created, error } = await supabase.from("payments").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  // ── Doctors ───────────────────────────────────────────────────────
  async listDoctors(tenantId: string): Promise<DBDoctor[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("doctors").select("*, referrals(count)").eq("tenant_id", tenantId).eq("is_active", true).order("full_name");
    return data ?? [];
  }

  async getDoctor(id: string, tenantId: string): Promise<DBDoctor | null> {
    const supabase = await createClient();
    const { data } = await supabase.from("doctors").select("*").eq("id", id).eq("tenant_id", tenantId).single();
    return data ?? null;
  }

  async createDoctor(data: Omit<DBDoctor, "id" | "created_at">): Promise<DBDoctor> {
    const supabase = await createClient();
    const { data: created, error } = await supabase.from("doctors").insert(data).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  // ── Referrals ─────────────────────────────────────────────────────
  async createReferral(data: Omit<DBReferral, "id" | "created_at">): Promise<void> {
    const supabase = await createClient();
    await supabase.from("referrals").insert(data);
  }

  async listReferralsByDoctor(doctorId: string, tenantId: string): Promise<DBReferral[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("referrals")
      .select("*, order:sample_orders(sample_id, created_at, patient:patients(full_name)), invoice:invoices(total_amt)")
      .eq("doctor_id", doctorId).eq("tenant_id", tenantId).order("created_at", { ascending: false });
    return data ?? [];
  }

  async getTopDoctors(tenantId: string, since: string): Promise<{ doctor_id: string; full_name: string; count: number; commission: number }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("referrals")
      .select("doctor_id, commission_amt, doctor:doctors(full_name)")
      .eq("tenant_id", tenantId).gte("created_at", since);
    const map: Record<string, any> = {};
    (data ?? []).forEach((r: any) => {
      if (!map[r.doctor_id]) map[r.doctor_id] = { doctor_id: r.doctor_id, full_name: r.doctor?.full_name ?? "Unknown", count: 0, commission: 0 };
      map[r.doctor_id].count++;
      map[r.doctor_id].commission += Number(r.commission_amt);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  // ── Dashboard ─────────────────────────────────────────────────────
  async getWeeklyOrderCounts(tenantId: string, since: string): Promise<{ date: string; count: number }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("sample_orders").select("created_at").eq("tenant_id", tenantId).gte("created_at", since);
    const dayCount: Record<string, number> = {};
    (data ?? []).forEach((o: any) => {
      const day = o.created_at.split("T")[0];
      dayCount[day] = (dayCount[day] ?? 0) + 1;
    });
    return Object.entries(dayCount).map(([date, count]) => ({ date, count }));
  }

  async getMonthlyRevenue(tenantId: string, since: string): Promise<{ month: string; revenue: number }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("invoices").select("created_at, paid_amt").eq("tenant_id", tenantId).gte("created_at", since);
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      const month = r.created_at.substring(0, 7);
      map[month] = (map[month] ?? 0) + Number(r.paid_amt ?? 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, revenue]) => ({ month, revenue }));
  }

  async getOrdersByStatus(tenantId: string): Promise<{ status: string; count: number }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("sample_orders").select("status").eq("tenant_id", tenantId);
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { map[r.status] = (map[r.status] ?? 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }

  async getTestPopularity(tenantId: string, since: string): Promise<{ name: string; count: number }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("order_tests")
      .select("test:test_catalog(name), order:sample_orders!inner(created_at, tenant_id)")
      .eq("order.tenant_id", tenantId)
      .gte("order.created_at", since);
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      const name = r.test?.name;
      if (name) map[name] = (map[name] ?? 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count }));
  }

  async getRecentPatients(tenantId: string, limit: number): Promise<{ id: string; full_name: string; patient_code: string; created_at: string }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("patients").select("id, full_name, patient_code, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as any[];
  }

  // ── Audit Log ─────────────────────────────────────────────────────
  async createAuditLog(entry: {
    tenant_id: string; actor_id: string; actor_name: string;
    action: string; entity_type: string; entity_id: string;
    entity_label?: string; changes: Record<string, { old: unknown; new: unknown }>;
  }): Promise<void> {
    const supabase = await createClient();
    await supabase.from("audit_log").insert({
      tenant_id: entry.tenant_id, actor_id: entry.actor_id, actor_name: entry.actor_name,
      action: entry.action, entity_type: entry.entity_type, entity_id: entry.entity_id,
      entity_label: entry.entity_label ?? null, changes_json: JSON.stringify(entry.changes),
    });
  }

  async listAuditLogs(tenantId: string, opts?: {
    entity_type?: string; entity_id?: string; actor_id?: string;
    limit?: number; offset?: number;
  }): Promise<{ data: any[]; count: number }> {
    const supabase = await createClient();
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    let query = supabase.from("audit_log").select("*", { count: "exact" }).eq("tenant_id", tenantId);
    if (opts?.entity_type) query = query.eq("entity_type", opts.entity_type);
    if (opts?.entity_id) query = query.eq("entity_id", opts.entity_id);
    if (opts?.actor_id) query = query.eq("actor_id", opts.actor_id);
    const { data, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    return { data: (data ?? []).map((r: any) => ({ ...r, changes: JSON.parse(r.changes_json) })), count: count ?? 0 };
  }
}
