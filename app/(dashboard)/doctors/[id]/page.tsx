import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRepository } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Phone, Mail, Building2, Stethoscope } from "lucide-react";
import { format } from "date-fns";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();

  const doctor = await repo.getDoctor(id, session.tenant_id);
  if (!doctor) notFound();

  const referrals = await repo.listReferralsByDoctor(id, session.tenant_id);

  const totalCommission = referrals.reduce((s, r) => s + Number(r.commission_amt), 0);
  const unpaidCommission = referrals.filter(r => !r.is_paid).reduce((s, r) => s + Number(r.commission_amt), 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/doctors">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{doctor.full_name}</h1>
          {doctor.qualification && (
            <p className="text-sm text-gray-500">{doctor.qualification}{doctor.specialization ? ` · ${doctor.specialization}` : ""}</p>
          )}
        </div>
        <Badge variant={doctor.commission_pct > 0 ? "warning" : "secondary"}>
          {doctor.commission_pct > 0 ? `${doctor.commission_pct}% commission` : "No commission"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Doctor info */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4" />Doctor Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {doctor.clinic_name && (
              <div className="flex items-center gap-2 text-gray-500">
                <Building2 className="h-4 w-4 text-gray-400" />
                {doctor.clinic_name}
              </div>
            )}
            {doctor.phone && (
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="h-4 w-4 text-gray-400" />
                {doctor.phone}
              </div>
            )}
            {doctor.email && (
              <div className="flex items-center gap-2 text-gray-500">
                <Mail className="h-4 w-4 text-gray-400" />
                {doctor.email}
              </div>
            )}
            <div className="pt-2 text-xs text-gray-400">
              Added: {format(new Date(doctor.created_at), "dd MMM yyyy")}
            </div>
          </CardContent>
        </Card>

        {/* Commission summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Commission Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total referrals</span>
              <span className="font-semibold">{referrals.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total commission</span>
              <span className="font-semibold">₹{totalCommission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unpaid commission</span>
              <span className={`font-semibold ${unpaidCommission > 0 ? "text-red-400" : "text-gray-400"}`}>
                ₹{unpaidCommission.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral History ({referrals.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!referrals.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    No referrals yet
                  </TableCell>
                </TableRow>
              )}
              {referrals.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/orders/${r.order_id}`} className="text-red-600 hover:text-red-700 transition-colors">
                      {r.order?.sample_id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{r.order?.patient?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {r.order?.created_at ? format(new Date(r.order.created_at), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ₹{r.invoice ? Number(r.invoice.total_amt).toFixed(2) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{Number(r.commission_amt).toFixed(2)}
                    <span className="text-xs text-gray-400 ml-1">({r.commission_pct}%)</span>
                  </TableCell>
                  <TableCell>
                    {r.is_paid
                      ? <Badge variant="success">Paid</Badge>
                      : <Badge variant="destructive">Unpaid</Badge>}
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
