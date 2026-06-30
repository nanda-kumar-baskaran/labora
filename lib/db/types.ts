export type UserRole = "admin" | "staff" | "technician" | "pathologist";
export type OrderStatus = "registered" | "collected" | "processing" | "completed" | "cancelled";
export type OrderPriority = "routine" | "urgent" | "stat";
export type TestStatus = "pending" | "processing" | "completed" | "cancelled";
export type ResultFlag = "normal" | "low" | "high" | "critical";
export type ReportStatus = "draft" | "verified" | "delivered";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "card" | "upi" | "netbanking" | "cheque" | "other";

export interface DBPatient {
  id: string;
  tenant_id: string;
  patient_code: string;
  full_name: string;
  dob?: string;
  age_years?: number;
  age_months?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface DBDoctor {
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

export interface DBTestCatalog {
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
  created_at: string;
}

export interface DBOrder {
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
}

export interface DBOrderTest {
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
}

export interface DBReport {
  id: string;
  tenant_id: string;
  order_id: string;
  pdf_path?: string;
  pdf_url?: string;
  public_token: string;
  generated_by?: string;
  verified_by?: string;
  verified_at?: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface DBInvoice {
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
  balance_amt: number; // computed: total_amt - paid_amt
  status: InvoiceStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DBPayment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference_no?: string;
  collected_by: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface DBTenant {
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
  updated_at: string;
}

export interface DBUser {
  id: string;
  tenant_id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // local auth only
  password_hash?: string;
  email?: string;
}

export interface DBStatusHistory {
  id: string;
  tenant_id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  changed_by: string;
  notes?: string;
  created_at: string;
}

export interface DBReferral {
  id: string;
  tenant_id: string;
  order_id: string;
  doctor_id: string;
  invoice_id?: string;
  commission_pct: number;
  commission_amt: number;
  is_paid: boolean;
  paid_on?: string;
  created_at: string;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
}
