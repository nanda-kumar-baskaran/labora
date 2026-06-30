"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FlaskConical, FileText, Users, Activity, Clock, CheckCircle,
  AlertTriangle, TestTube, Beaker, ArrowRight, TrendingUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  registered: "#94a3b8",
  collected: "#f59e0b",
  processing: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

function StatCard({ label, value, icon: Icon, color, bgColor, sub }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function TechnicianView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Today's Orders" value={data.todayCount} icon={Beaker} color="text-red-600" bgColor="bg-red-50" sub="Your workload today" />
        <StatCard label="Pending Collection" value={data.pendingCollection?.length ?? 0} icon={Clock} color="text-amber-600" bgColor="bg-amber-50" sub="Samples to collect" />
        <StatCard label="Results to Enter" value={data.pendingResults?.length ?? 0} icon={TestTube} color="text-blue-600" bgColor="bg-blue-50" sub="Awaiting your entry" />
      </div>

      {data.pendingCollection?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Sample Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Sample ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.pendingCollection.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.sample_id}</TableCell>
                    <TableCell className="text-sm">{o.patient?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={o.priority === "stat" ? "destructive" : o.priority === "urgent" ? "warning" : "outline"} className="capitalize text-xs">{o.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${o.id}`}>
                        <Button variant="ghost" size="sm"><ArrowRight className="h-3.5 w-3.5" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.pendingResults?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TestTube className="h-4 w-4 text-blue-500" />
              Results to Enter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Sample ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.pendingResults.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.sample_id}</TableCell>
                    <TableCell className="text-sm">{o.patient?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "processing" ? "default" : "warning"} className="capitalize text-xs">{o.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${o.id}/results`}>
                        <Button size="sm" variant="outline">Enter Results</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.pendingCollection?.length === 0 && data.pendingResults?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <p className="text-sm text-gray-500 font-medium">All caught up!</p>
          <p className="text-xs text-gray-400">No pending collections or results to enter</p>
        </div>
      )}
    </div>
  );
}

function PathologistView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Today's Orders" value={data.todayCount} icon={Beaker} color="text-red-600" bgColor="bg-red-50" />
        <StatCard label="Reports to Verify" value={data.pendingReports ?? 0} icon={FileText} color="text-amber-600" bgColor="bg-amber-50" sub="Draft reports awaiting sign-off" />
        <StatCard label="Completed Orders" value={data.completedOrdersCount ?? 0} icon={CheckCircle} color="text-green-600" bgColor="bg-green-50" />
      </div>

      {data.pendingVerification?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Reports Awaiting Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.pendingVerification.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.order?.sample_id ?? r.order_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm">{r.order?.patient?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {(() => { try { return format(parseISO(r.created_at), "dd MMM"); } catch { return "—"; } })()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${r.order_id}/report`}>
                        <Button size="sm" variant="outline">Review &amp; Verify</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(!data.pendingVerification || data.pendingVerification.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle className="h-12 w-12 text-green-400" />
          <p className="text-sm text-gray-500 font-medium">No reports pending verification</p>
        </div>
      )}
    </div>
  );
}

function StaffView({ data }: { data: any }) {
  const statusData = (data.ordersByStatus ?? []).map((d: any) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.count,
    color: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Today's Orders" value={data.todayCount} icon={Activity} color="text-red-600" bgColor="bg-red-50" />
        <StatCard label="Total Patients" value={data.totalPatients ?? 0} icon={Users} color="text-purple-600" bgColor="bg-purple-50" />
        <StatCard label="Order Status" value={statusData.reduce((s: number, d: any) => s + d.value, 0)} icon={TrendingUp} color="text-blue-600" bgColor="bg-blue-50" sub="All time" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {statusData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {statusData.map((entry: any, i: number) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {statusData.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Recent Patients
              <Link href="/patients" className="ml-auto text-xs text-red-600 font-normal">View all →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Code</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {!data.recentPatients?.length && (
                  <TableRow><TableCell colSpan={2} className="text-center text-gray-400 py-6 text-sm">No patients yet</TableCell></TableRow>
                )}
                {data.recentPatients?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/patients/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-red-600">{p.full_name}</Link>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-400">{p.patient_code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {data.todayOrders?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Beaker className="h-4 w-4 text-red-500" />
              Today&apos;s Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Sample ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.todayOrders.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs text-red-600 hover:underline">{o.sample_id}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{o.patient?.full_name ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{o.status}</Badge></TableCell>
                    <TableCell><Badge variant={o.priority === "stat" ? "destructive" : "outline"} className="capitalize text-xs">{o.priority}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/work-queue")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse border border-gray-200" />)}
      </div>
    </div>
  );

  if (!data) return null;

  const greetingMap: Record<string, string> = {
    technician: "Lab Technician Work Queue",
    pathologist: "Pathologist Review Queue",
    staff: "Staff Overview",
  };
  const subMap: Record<string, string> = {
    technician: "Your pending collections and results to process",
    pathologist: "Reports waiting for your verification",
    staff: "Today's activity and patient registrations",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">{greetingMap[data.role] ?? "Home"}</h1>
        </div>
        <p className="text-sm text-gray-500">
          {subMap[data.role] ?? ""} · {format(new Date(), "EEEE, dd MMMM yyyy")}
        </p>
      </div>

      {data.role === "technician" && <TechnicianView data={data} />}
      {data.role === "pathologist" && <PathologistView data={data} />}
      {data.role === "staff" && <StaffView data={data} />}
    </div>
  );
}
