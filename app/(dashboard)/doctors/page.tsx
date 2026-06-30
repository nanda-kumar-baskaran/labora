import Link from "next/link";
import { guardPage } from "@/lib/page-guard";
import { getRepository } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Stethoscope } from "lucide-react";

export default async function DoctorsPage() {
  const session = await guardPage("doctor:view");
  const repo = await getRepository();

  const doctors = await repo.listDoctors(session.tenant_id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm text-gray-500 mt-1">{doctors?.length ?? 0} referral doctors</p>
        </div>
        <Link href="/doctors/new">
          <Button><UserPlus className="h-4 w-4 mr-2" />Add Doctor</Button>
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!doctors?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-12">
                  <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No doctors added yet
                </TableCell>
              </TableRow>
            )}
            {doctors?.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="font-medium">{d.full_name}</div>
                  {d.qualification && <div className="text-xs text-gray-400">{d.qualification}{d.specialization ? ` · ${d.specialization}` : ""}</div>}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{d.clinic_name ?? "—"}</TableCell>
                <TableCell className="text-gray-500 text-sm">{d.phone ?? "—"}</TableCell>
                <TableCell>
                  {d.commission_pct > 0
                    ? <Badge variant="warning">{d.commission_pct}%</Badge>
                    : <span className="text-gray-400 text-sm">No commission</span>}
                </TableCell>
                <TableCell>
                  <Link href={`/doctors/${d.id}`} className="text-sm text-red-600 hover:text-red-700 transition-colors">View</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
