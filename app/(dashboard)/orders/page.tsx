import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getRepository } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Registered", value: "registered" },
  { label: "Collected", value: "collected" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
];

const statusVariant: Record<string, any> = {
  registered: "secondary",
  collected: "warning",
  processing: "default",
  completed: "success",
  cancelled: "destructive",
};
const priorityVariant: Record<string, any> = {
  routine: "outline",
  urgent: "warning",
  stat: "destructive",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const repo = await getRepository();
  const status = sp.status ?? "";
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: orders, count } = await repo.listOrders(
    session.tenant_id,
    status || undefined,
    { limit, offset, orderBy: "created_at", orderDir: "desc" }
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{count ?? 0} total orders</p>
        </div>
        <Link href="/orders/new">
          <Button><PlusCircle className="h-4 w-4 mr-2" />New Order</Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit bg-gray-100">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/orders?status=${tab.value}` : "/orders"}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              status === tab.value
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
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
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!orders?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  No orders found
                </TableCell>
              </TableRow>
            )}
            {orders?.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs font-medium">{o.sample_id}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{o.patient?.full_name}</div>
                  <div className="text-xs text-gray-400">{o.patient?.patient_code}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={priorityVariant[o.priority]} className="capitalize">{o.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[o.status]} className="capitalize">{o.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-400">{format(new Date(o.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                <TableCell>
                  <Link href={`/orders/${o.id}`} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">View</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
