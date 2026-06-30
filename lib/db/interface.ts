import type {
  DBPatient, DBDoctor, DBTestCatalog, DBOrder, DBOrderTest,
  DBReport, DBInvoice, DBPayment, DBTenant, DBUser, DBStatusHistory,
  DBReferral, ListOptions, PaginatedResult,
  OrderStatus, TestStatus, ResultFlag, ReportStatus, UserRole,
} from "./types";

export interface IRepository {
  // ── Tenants ──────────────────────────────────────────────────────
  getTenant(tenantId: string): Promise<DBTenant | null>;
  updateTenant(tenantId: string, data: Partial<DBTenant>): Promise<DBTenant>;

  // ── Users ─────────────────────────────────────────────────────────
  getUser(userId: string): Promise<DBUser | null>;
  getUserByEmail(email: string, tenantId: string): Promise<DBUser | null>;
  listUsers(tenantId: string): Promise<DBUser[]>;
  createUser(data: Omit<DBUser, "created_at" | "updated_at">): Promise<DBUser>;
  updateUser(userId: string, tenantId: string, data: Partial<DBUser>): Promise<DBUser>;

  // ── Patients ──────────────────────────────────────────────────────
  listPatients(tenantId: string, search?: string, opts?: ListOptions): Promise<PaginatedResult<DBPatient>>;
  getPatient(id: string, tenantId: string): Promise<DBPatient | null>;
  createPatient(data: Omit<DBPatient, "id" | "created_at" | "updated_at">): Promise<DBPatient>;
  updatePatient(id: string, tenantId: string, data: Partial<DBPatient>): Promise<DBPatient>;
  countPatients(tenantId: string): Promise<number>;

  // ── Test Catalog ──────────────────────────────────────────────────
  listTests(tenantId: string): Promise<DBTestCatalog[]>;
  getTest(id: string, tenantId: string): Promise<DBTestCatalog | null>;
  createTest(data: Omit<DBTestCatalog, "id" | "created_at">): Promise<DBTestCatalog>;
  updateTest(id: string, tenantId: string, data: Partial<Pick<DBTestCatalog, "name" | "short_code" | "category" | "sample_type" | "price" | "cost" | "reference_range" | "unit" | "turnaround_hrs" | "method" | "is_active">>): Promise<DBTestCatalog>;

  // ── Orders ────────────────────────────────────────────────────────
  listOrders(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<DBOrder & { patient?: Pick<DBPatient, "full_name" | "patient_code" | "phone">; doctor?: Pick<DBDoctor, "full_name"> }>>;
  getOrder(id: string, tenantId: string): Promise<(DBOrder & {
    patient?: DBPatient;
    doctor?: Pick<DBDoctor, "full_name" | "phone">;
    order_tests?: (DBOrderTest & { test?: DBTestCatalog })[];
    reports?: Pick<DBReport, "id" | "status" | "public_token" | "pdf_url">[];
    invoices?: Pick<DBInvoice, "id" | "invoice_number" | "total_amt" | "paid_amt" | "balance_amt" | "status">[];
  }) | null>;
  createOrder(data: Omit<DBOrder, "id" | "created_at" | "updated_at">): Promise<DBOrder>;
  updateOrderStatus(id: string, tenantId: string, status: OrderStatus, changedBy: string, collectedBy?: string): Promise<void>;
  countTodayOrders(tenantId: string): Promise<number>;

  // ── Order Tests ───────────────────────────────────────────────────
  createOrderTests(tests: Omit<DBOrderTest, "id" | "created_at">[]): Promise<void>;
  updateOrderTest(id: string, orderId: string, tenantId: string, data: {
    result_value?: string;
    result_unit?: string;
    result_flag?: ResultFlag;
    result_notes?: string;
    status?: TestStatus;
    completed_by?: string;
    completed_at?: string;
  }): Promise<void>;
  getOrderTests(orderId: string, tenantId: string): Promise<DBOrderTest[]>;
  allTestsDone(orderId: string, tenantId: string): Promise<boolean>;

  // ── Status History ────────────────────────────────────────────────
  getStatusHistory(orderId: string): Promise<DBStatusHistory[]>;

  // ── Reports ───────────────────────────────────────────────────────
  listReports(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<DBReport & { order?: { sample_id: string; patient?: Pick<DBPatient, "full_name" | "patient_code"> } }>>;
  getReportByOrder(orderId: string): Promise<DBReport | null>;
  getReportByToken(token: string): Promise<(DBReport & { order?: DBOrder & { patient?: DBPatient; doctor?: Pick<DBDoctor, "full_name">; order_tests?: (DBOrderTest & { test?: DBTestCatalog })[] } }) | null>;
  createReport(data: Omit<DBReport, "id" | "created_at" | "updated_at" | "public_token">): Promise<DBReport>;
  updateReport(id: string, tenantId: string, data: Partial<DBReport>): Promise<void>;
  countPendingReports(tenantId: string): Promise<number>;

  // ── Invoices ──────────────────────────────────────────────────────
  listInvoices(tenantId: string, status?: string, opts?: ListOptions): Promise<PaginatedResult<DBInvoice & { patient?: Pick<DBPatient, "full_name" | "patient_code">; order?: Pick<DBOrder, "sample_id"> }>>;
  getInvoice(id: string, tenantId: string): Promise<(DBInvoice & { patient?: Pick<DBPatient, "full_name" | "patient_code">; order?: Pick<DBOrder, "sample_id"> }) | null>;
  getInvoiceByOrder(orderId: string, tenantId: string): Promise<DBInvoice | null>;
  createInvoice(data: Omit<DBInvoice, "id" | "created_at" | "updated_at" | "balance_amt">): Promise<DBInvoice>;
  getTodayRevenue(tenantId: string): Promise<number>;
  getPendingPaymentsTotal(tenantId: string): Promise<number>;

  // ── Payments ──────────────────────────────────────────────────────
  listPayments(invoiceId: string, tenantId: string): Promise<DBPayment[]>;
  createPayment(data: Omit<DBPayment, "id" | "created_at">): Promise<DBPayment>;

  // ── Doctors ───────────────────────────────────────────────────────
  listDoctors(tenantId: string): Promise<DBDoctor[]>;
  getDoctor(id: string, tenantId: string): Promise<DBDoctor | null>;
  createDoctor(data: Omit<DBDoctor, "id" | "created_at">): Promise<DBDoctor>;

  // ── Referrals ─────────────────────────────────────────────────────
  createReferral(data: Omit<DBReferral, "id" | "created_at">): Promise<void>;
  listReferralsByDoctor(doctorId: string, tenantId: string): Promise<DBReferral[]>;
  getTopDoctors(tenantId: string, since: string): Promise<{ doctor_id: string; full_name: string; count: number; commission: number }[]>;

  // ── Dashboard ─────────────────────────────────────────────────────
  getWeeklyOrderCounts(tenantId: string, since: string): Promise<{ date: string; count: number }[]>;
  getMonthlyRevenue(tenantId: string, since: string): Promise<{ month: string; revenue: number }[]>;
  getOrdersByStatus(tenantId: string): Promise<{ status: string; count: number }[]>;
  getTestPopularity(tenantId: string, since: string): Promise<{ name: string; count: number }[]>;
  getRecentPatients(tenantId: string, limit: number): Promise<{ id: string; full_name: string; patient_code: string; created_at: string }[]>;

  // ── Audit Log ─────────────────────────────────────────────────────
  createAuditLog(entry: {
    tenant_id: string; actor_id: string; actor_name: string;
    action: string; entity_type: string; entity_id: string;
    entity_label?: string; changes: Record<string, { old: unknown; new: unknown }>;
  }): Promise<void>;
  listAuditLogs(tenantId: string, opts?: {
    entity_type?: string; entity_id?: string; actor_id?: string;
    limit?: number; offset?: number;
  }): Promise<{ data: any[]; count: number }>;
}
