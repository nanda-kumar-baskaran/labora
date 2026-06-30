"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  FlaskConical, FileText, IndianRupee, AlertCircle, TrendingUp,
  Activity, ArrowUpRight, Stethoscope, Users, TestTube,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  registered: "#94a3b8",
  collected: "#f59e0b",
  processing: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

const PIE_COLORS = ["#DC2626", "#f59e0b", "#3b82f6", "#22c55e", "#94a3b8"];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, color, bgColor, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">{sub}</span>
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

const BarTip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm shadow-lg bg-white border border-gray-200">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        <p className="text-gray-900 font-semibold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const LineTip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg px-3 py-2 text-sm shadow-lg bg-white border border-gray-200">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        <p className="text-gray-900 font-semibold">₹{Number(payload[0].value).toFixed(0)}</p>
      </div>
    );
  }
  return null;
};

function EmptyChart({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="h-44 flex flex-col items-center justify-center gap-2 text-gray-300">
      <Icon className="h-8 w-8" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse border border-gray-200" />
        ))}
      </div>
    </div>
  );

  const cards: StatCardProps[] = [
    { label: "Today's Orders", value: data?.todayOrders ?? 0, icon: FlaskConical, color: "text-red-600", bgColor: "bg-red-50", sub: "Active today" },
    { label: "Total Patients", value: data?.totalPatients ?? 0, icon: Users, color: "text-purple-600", bgColor: "bg-purple-50" },
    { label: "Pending Reports", value: data?.pendingReports ?? 0, icon: FileText, color: "text-amber-600", bgColor: "bg-amber-50" },
    { label: "Today's Revenue", value: `₹${(data?.todayRevenue ?? 0).toFixed(0)}`, icon: IndianRupee, color: "text-green-600", bgColor: "bg-green-50", sub: "Collected" },
    { label: "Pending Dues", value: `₹${(data?.pendingPaymentsAmt ?? 0).toFixed(0)}`, icon: AlertCircle, color: "text-orange-600", bgColor: "bg-orange-50" },
  ];

  const weeklyData = (data?.weeklyOrders ?? []).map((d: any) => ({
    ...d,
    date: (() => { try { return format(parseISO(d.date), "EEE"); } catch { return d.date; } })(),
  }));

  const monthlyData = (data?.monthlyRevenue ?? []).map((d: any) => ({
    ...d,
    label: (() => { try { return format(parseISO(d.month + "-01"), "MMM yy"); } catch { return d.month; } })(),
  }));

  const statusData = (data?.ordersByStatus ?? []).map((d: any) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: d.count,
    color: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  const testData = (data?.testPopularity ?? []).slice(0, 8);
  const recentPatients = data?.recentPatients ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
      </div>

      {/* KPI Cards — 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Row 1: Weekly Orders + Monthly Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              Orders This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<BarTip />} cursor={{ fill: "rgba(220,38,38,0.05)", radius: 4 }} />
                  <Bar dataKey="count" fill="#DC2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={TrendingUp} label="No orders this week" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-green-600" />
              Revenue Trend (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<LineTip />} />
                  <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={IndianRupee} label="No revenue data yet" />}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Order Status Pie + Top Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusData.map((entry: any, i: number) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [v, name]} />
                  <Legend formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={Activity} label="No orders yet" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TestTube className="h-4 w-4 text-red-600" />
              Most Ordered Tests (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={testData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="count" fill="#DC2626" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={TestTube} label="No test data this week" />}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top Doctors + Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-red-600" />
              Top Referring Doctors
              <span className="ml-auto text-xs text-gray-400 font-normal">7 days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Refs</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.topDoctors?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400 py-8 text-sm">No referral data</TableCell>
                  </TableRow>
                )}
                {data?.topDoctors?.map((d: any) => (
                  <TableRow key={d.doctor_id}>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                          {d.full_name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900 font-medium truncate max-w-[120px]">{d.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Badge variant="default">{d.count}</Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-sm font-semibold text-green-600">₹{d.commission.toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Recent Patients
              <Link href="/patients" className="ml-auto text-xs text-red-600 hover:text-red-700 font-normal">View all →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!recentPatients.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400 py-8 text-sm">No patients yet</TableCell>
                  </TableRow>
                )}
                {recentPatients.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {p.full_name.charAt(0)}
                        </div>
                        <Link href={`/patients/${p.id}`} className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors">{p.full_name}</Link>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs font-mono text-gray-400">{p.patient_code}</TableCell>
                    <TableCell className="py-2.5 text-right text-xs text-gray-400">
                      {(() => { try { return format(parseISO(p.created_at), "dd MMM"); } catch { return "—"; } })()}
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
