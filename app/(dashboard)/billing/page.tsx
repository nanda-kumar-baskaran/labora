import Link from "next/link";
import { requireSession } from "@/lib/session";
import { guardPage } from "@/lib/page-guard";
import { getRepository } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
];

const statusVariant: Record<string, any> = {
  unpaid: "destructive", partial: "warning", paid: "success", cancelled: "secondary"
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const session = await guardPage("billing:view");
  const repo = await getRepository();
  const status = sp.status ?? "";

  const { data: invoices, count } = await repo.listInvoices(
    session.tenant_id,
    status || undefined,
    { limit: 50, offset: 0, orderBy: "created_at", orderDir: "desc" }
  );

  const totalOutstanding = invoices?.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.balance_amt), 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} invoices · Outstanding: <span className="font-semibold text-red-600">₹{totalOutstanding.toFixed(2)}</span></p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit bg-gray-100">
        {STATUS_TABS.map(tab => (
          <Link key={tab.value} href={tab.value ? `/billing?status=${tab.value}` : "/billing"}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              status === tab.value
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700")}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!invoices?.length && (
              <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-12">No invoices found</TableCell></TableRow>
            )}
            {invoices?.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{inv.patient?.full_name}</div>
                  <div className="text-xs text-gray-400">{inv.patient?.patient_code}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-gray-400">{inv.order?.sample_id}</TableCell>
                <TableCell className="text-right font-medium">₹{Number(inv.total_amt).toFixed(2)}</TableCell>
                <TableCell className="text-right text-emerald-400">₹{Number(inv.paid_amt).toFixed(2)}</TableCell>
                <TableCell className={`text-right font-semibold ${Number(inv.balance_amt) > 0 ? "text-red-400" : "text-gray-400"}`}>₹{Number(inv.balance_amt).toFixed(2)}</TableCell>
                <TableCell><Badge variant={statusVariant[inv.status]} className="capitalize">{inv.status}</Badge></TableCell>
                <TableCell className="text-xs text-gray-400">{format(new Date(inv.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <Link href={`/billing/${inv.id}`} className="text-sm text-red-600 hover:text-red-700 transition-colors">Manage</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
