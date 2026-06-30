"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, IndianRupee, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference_no: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/invoices/${params.id}`),
        fetch(`/api/invoices/${params.id}/payments`),
      ]);

      if (!invRes.ok) {
        const d = await invRes.json();
        setError(d.error ?? "Invoice not found");
        setLoading(false);
        return;
      }

      const [inv, pays] = await Promise.all([
        invRes.json(),
        payRes.ok ? payRes.json() : Promise.resolve([]),
      ]);

      setInvoice(inv);
      setPayments(Array.isArray(pays) ? pays : []);
    } catch (e) {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payForm.amount) return;
    setSaving(true);
    const res = await fetch(`/api/invoices/${params.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payForm, amount: parseFloat(payForm.amount) }),
    });
    const data = await res.json();
    if (res.ok) {
      toast("Payment recorded!", "success");
      setPayForm({ amount: "", method: "cash", reference_no: "" });
      await fetchAll(); // refresh both invoice and payments
    } else {
      toast(data.error ?? "Payment failed", "error");
    }
    setSaving(false);
  }

  const statusVariant: Record<string, any> = { unpaid: "destructive", partial: "warning", paid: "success" };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="animate-spin h-6 w-6 rounded-full border-2 border-red-600 border-t-transparent mr-3" />
      Loading...
    </div>
  );

  if (error || !invoice) return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/billing"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
      </div>
      <div className="flex items-center gap-3 p-4 rounded-lg text-red-700 bg-red-50 border border-red-200">
        <AlertCircle className="h-5 w-5 shrink-0" />
        {error || "Invoice not found"}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/billing"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <p className="text-sm text-gray-500">{invoice.patient?.full_name} · {invoice.order?.sample_id}</p>
        </div>
        <Badge variant={statusVariant[invoice.status] ?? "secondary"} className="capitalize text-sm">
          {invoice.status}
        </Badge>
      </div>

      {/* Amount summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Amount Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">₹{Number(invoice.total_amt).toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">₹{Number(invoice.paid_amt).toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Paid</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${Number(invoice.balance_amt) > 0 ? "text-red-400" : "text-gray-400"}`}>
                ₹{Number(invoice.balance_amt).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Balance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record payment form — only show if balance > 0 */}
      {invoice.status !== "paid" && Number(invoice.balance_amt) > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Record Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={recordPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(invoice.balance_amt)}
                    placeholder={`Max: ₹${Number(invoice.balance_amt).toFixed(2)}`}
                    value={payForm.amount}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reference No. (optional)</Label>
                <Input
                  placeholder="UPI txn ID, cheque no..."
                  value={payForm.reference_no}
                  onChange={e => setPayForm(f => ({ ...f, reference_no: e.target.value }))}
                />
              </div>
              <Button type="submit" loading={saving}>Record Payment</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!payments.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                    No payments recorded yet
                  </TableCell>
                </TableRow>
              )}
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{p.method}</Badge></TableCell>
                  <TableCell className="text-xs text-gray-400">{p.reference_no ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-400">
                    ₹{Number(p.amount).toFixed(2)}
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
