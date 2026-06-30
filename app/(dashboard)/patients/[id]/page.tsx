import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRepository } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Beaker, Phone, Mail, MapPin, Shield } from "lucide-react";
import { format } from "date-fns";

const statusBadgeVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  registered: "secondary",
  collected: "warning",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const repo = await getRepository();

  const patient = await repo.getPatient(id, session.tenant_id);
  if (!patient) notFound();

  const { data: orders } = await repo.listOrders(session.tenant_id, undefined, {
    limit: 50, offset: 0, orderBy: "created_at", orderDir: "desc"
  });
  // Filter to this patient's orders
  const patientOrders = orders.filter((o: any) => o.patient_id === id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{patient.full_name}</h1>
          <p className="text-sm font-mono text-gray-500">{patient.patient_code}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {session.role === "admin" && (
            <Link href={`/audit?entity_type=patient&entity_id=${id}`}>
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Edit History
              </Button>
            </Link>
          )}
          <Link href={`/orders/new?patient_id=${id}`}>
            <Button>
              <Beaker className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle>Patient Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="font-medium w-20 text-gray-700">Gender:</span>
              {patient.gender ? <Badge variant="secondary" className="capitalize">{patient.gender}</Badge> : "—"}
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="font-medium w-20 text-gray-700">Age:</span>
              {patient.age_years != null ? `${patient.age_years} years` : patient.dob ? format(new Date(patient.dob), "dd/MM/yyyy") : "—"}
            </div>
            {patient.phone && (
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="h-3 w-3" />
                {patient.phone}
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-2 text-gray-500">
                <Mail className="h-3 w-3" />
                {patient.email}
              </div>
            )}
            {patient.address && (
              <div className="flex items-start gap-2 text-gray-500">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                {patient.address}
              </div>
            )}
            <div className="pt-2 text-xs text-gray-400">
              Registered: {format(new Date(patient.created_at), "dd MMM yyyy")}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Orders ({patientOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!patientOrders.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">No orders yet</TableCell>
                  </TableRow>
                )}
                {patientOrders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.sample_id}</TableCell>
                    <TableCell className="text-xs text-gray-500">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[o.status] ?? "secondary"} className="capitalize">{o.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.priority === "stat" ? "destructive" : o.priority === "urgent" ? "warning" : "outline"} className="capitalize">
                        {o.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium text-sm text-red-600 hover:text-red-700 transition-colors">View</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
