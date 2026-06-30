export type UserRole = "admin" | "staff" | "technician" | "pathologist" | "doctor";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logo_url?: string;
  report_header?: string;
  report_footer?: string;
  is_active: boolean;
  plan: string;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  tenant_id: string;
  patient_code: string;
  full_name: string;
  dob?: string;
  age_years?: number;
  age_months?: number;
  gender?: "male" | "female" | "other";
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  tenant_id: string;
  full_name: string;
  qualification?: string;
  specialization?: string;
  clinic_name?: string;
  phone?: string;
  email?: string;
  commission_pct: number;
  is_active: boolean;
  created_at: string;
}

export interface TestCatalog {
  id: string;
  tenant_id: string;
  name: string;
  short_code: string;
  category?: string;
  sample_type?: string;
  turnaround_hrs: number;
  price: number;
  cost?: number;
  reference_range?: string;
  unit?: string;
  method?: string;
  is_active: boolean;
}

export type OrderStatus = "registered" | "collected" | "processing" | "completed" | "cancelled";
export type OrderPriority = "routine" | "urgent" | "stat";

export interface SampleOrder {
  id: string;
  tenant_id: string;
  sample_id: string;
  patient_id: string;
  doctor_id?: string;
  referred_by?: string;
  priority: OrderPriority;
  status: OrderStatus;
  collection_time?: string;
  collected_by?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joins
  patient?: Patient;
  doctor?: Doctor;
  order_tests?: OrderTest[];
}

export type TestStatus = "pending" | "processing" | "completed" | "cancelled";
export type ResultFlag = "normal" | "low" | "high" | "critical";

export interface OrderTest {
  id: string;
  tenant_id: string;
  order_id: string;
  test_id: string;
  price: number;
  discount_pct: number;
  status: TestStatus;
  result_value?: string;
  result_unit?: string;
  result_flag?: ResultFlag;
  result_notes?: string;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
  // joins
  test?: TestCatalog;
}

export type ReportStatus = "draft" | "verified" | "delivered";

export interface Report {
  id: string;
  tenant_id: string;
  order_id: string;
  pdf_url?: string;
  pdf_path?: string;
  public_token: string;
  generated_by?: string;
  verified_by?: string;
  verified_at?: string;
  status: ReportStatus;
  delivery_method?: string[];
  delivered_at?: string;
  created_at: string;
  // joins
  order?: SampleOrder;
}

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  order_id: string;
  patient_id: string;
  subtotal: number;
  discount_amt: number;
  tax_amt: number;
  total_amt: number;
  paid_amt: number;
  balance_amt: number;
  status: InvoiceStatus;
  created_by: string;
  created_at: string;
  // joins
  patient?: Patient;
  order?: SampleOrder;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  method: "cash" | "card" | "upi" | "netbanking" | "cheque" | "other";
  reference_no?: string;
  collected_by: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface DashboardSummary {
  todayOrders: number;
  pendingReports: number;
  todayRevenue: number;
  pendingPayments: number;
  weeklyOrders: { date: string; count: number }[];
  weeklyRevenue: { date: string; amount: number }[];
  topDoctors: { doctor_id: string; full_name: string; count: number; commission: number }[];
}
