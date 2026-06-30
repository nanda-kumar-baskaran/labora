import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRepository } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Verified", value: "verified" },
  { label: "Delivered", value: "delivered" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const session = await requireSession();
  const repo = await getRepository();
  const status = sp.status ?? "";

  const { data: reports, count } = await repo.listReports(
    session.tenant_id,
    status || undefined,
    { limit: 50, offset: 0, orderBy: "created_at", orderDir: "desc" }
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} total reports</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit bg-gray-100">
        {STATUS_TABS.map(tab => (
          <Link key={tab.value} href={tab.value ? `/reports?status=${tab.value}` : "/reports"}
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
              <TableHead>Sample ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!reports?.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-12">No reports found</TableCell></TableRow>
            )}
            {reports?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.order?.sample_id}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{r.order?.patient?.full_name}</div>
                  <div className="text-xs text-gray-400">{r.order?.patient?.patient_code}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "verified" ? "success" : r.status === "delivered" ? "default" : "secondary"} className="capitalize">{r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-400">{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  <Link href={`/orders/${r.order_id}/report`} className="text-sm text-red-600 hover:text-red-700 transition-colors">Manage</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
