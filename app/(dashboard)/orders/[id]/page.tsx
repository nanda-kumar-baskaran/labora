import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRepository } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TestTube, FileText } from "lucide-react";
import { format } from "date-fns";
import { StatusAdvanceButton } from "./status-advance-button";

const STATUS_STEPS = ["registered", "collected", "processing", "completed"] as const;
const statusVariant: Record<string, any> = {
  registered: "secondary", collected: "warning", processing: "default", completed: "success", cancelled: "destructive"
};
const resultFlagVariant: Record<string, any> = {
  normal: "success", low: "warning", high: "warning", critical: "destructive"
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();

  const order = await repo.getOrder(id, session.tenant_id);
  if (!order) notFound();

  const history = await repo.getStatusHistory(id);

  const invoice = order.invoices?.[0];
  const report = order.reports?.[0];
  const currentStepIdx = STATUS_STEPS.indexOf(order.status as any);
  const nextStatus = currentStepIdx < STATUS_STEPS.length - 1 ? STATUS_STEPS[currentStepIdx + 1] : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{order.sample_id}</h1>
            <Badge variant={statusVariant[order.status]} className="capitalize text-sm">{order.status}</Badge>
            <Badge variant={order.priority === "stat" ? "destructive" : order.priority === "urgent" ? "warning" : "outline"} className="capitalize">{order.priority}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">Created {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}</p>
        </div>
        <div className="flex gap-2">
          {(session.role === "technician" || session.role === "admin" || session.role === "pathologist") && (
            <Link href={`/orders/${id}/results`}><Button variant="outline"><TestTube className="h-4 w-4 mr-2" />Enter Results</Button></Link>
          )}
          <Link href={`/orders/${id}/report`}><Button variant="outline"><FileText className="h-4 w-4 mr-2" />Report</Button></Link>
        </div>
      </div>

      {/* Status stepper */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center mb-4">
            {STATUS_STEPS.map((s, i) => {
              const done = i <= currentStepIdx;
              const histItem = history?.find(h => h.to_status === s);
              return (
                <div key={s} className="flex flex-1 items-center">
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={done ? { background: "linear-gradient(135deg,#DC2626,#991B1B)", color: "#ffffff" } : { background: "#f3f4f6", color: "#9ca3af" }}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium capitalize" style={{ color: done ? "#DC2626" : "#9ca3af" }}>{s}</span>
                    {histItem && <span className="text-xs text-gray-400">{format(new Date(histItem.created_at), "HH:mm")}</span>}
                  </div>
                  {/* Connector line between steps */}
                  {i < STATUS_STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-2 mt-[-18px]" style={{ background: i < currentStepIdx ? "#DC2626" : "#e5e7eb" }} />
                  )}
                </div>
              );
            })}
          </div>
          {nextStatus && order.status !== "cancelled" && (
            <div className="flex justify-center mt-2">
              <StatusAdvanceButton orderId={id} nextStatus={nextStatus} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient */}
        <Card>
          <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{order.patient?.full_name}</p>
            <p className="text-gray-500">{(order.patient as any)?.patient_code}</p>
            {order.patient?.phone && <p className="text-gray-500">{order.patient.phone}</p>}
            {(order.patient as any)?.age_years != null && <p className="text-gray-500">{(order.patient as any).age_years}y · {(order.patient as any).gender}</p>}
            {order.doctor && <p className="text-gray-500 mt-2">Referred by: {order.doctor.full_name}</p>}
          </CardContent>
        </Card>

        {/* Invoice */}
        {invoice && (
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-mono text-xs text-gray-400">{invoice.invoice_number}</p>
              <div className="flex justify-between"><span>Total</span><span className="font-semibold">₹{Number(invoice.total_amt).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Paid</span><span className="text-emerald-400">₹{Number(invoice.paid_amt).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Balance</span><span className={Number(invoice.balance_amt) > 0 ? "text-red-500 font-semibold" : "text-emerald-400"}>₹{Number(invoice.balance_amt).toFixed(2)}</span></div>
              <Badge variant={invoice.status === "paid" ? "success" : invoice.status === "partial" ? "warning" : "destructive"} className="capitalize mt-1">{invoice.status}</Badge>
              <Link href={`/billing/${invoice.id}`} className="block mt-2 text-xs text-red-600 hover:text-red-700 transition-colors">Manage billing →</Link>
            </CardContent>
          </Card>
        )}

        {/* Report */}
        {report && (
          <Card>
            <CardHeader><CardTitle className="text-base">Report</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Badge variant={report.status === "verified" ? "success" : report.status === "draft" ? "secondary" : "default"} className="capitalize">{report.status}</Badge>
              {report.status === "verified" && (
                <a href={`/r/${report.public_token}`} target="_blank" className="block text-xs mt-2 text-red-600 hover:text-red-700 transition-colors">View public report →</a>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tests */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Tests ({order.order_tests?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_tests?.map((ot: any) => (
                <TableRow key={ot.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{ot.test?.name}</div>
                    <div className="text-xs text-gray-400">{ot.test?.short_code}</div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{ot.test?.sample_type ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">₹{ot.price}</TableCell>
                  <TableCell><Badge variant={ot.status === "completed" ? "success" : "secondary"} className="capitalize">{ot.status}</Badge></TableCell>
                  <TableCell className="text-sm">{ot.result_value ? `${ot.result_value} ${ot.result_unit ?? ""}` : "—"}</TableCell>
                  <TableCell>
                    {ot.result_flag ? <Badge variant={resultFlagVariant[ot.result_flag]} className="capitalize">{ot.result_flag}</Badge> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
