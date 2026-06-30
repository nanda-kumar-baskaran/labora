"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Zap, CheckCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PublicReportPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/r/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Network error — could not load report"))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-red-600 border-t-transparent" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-semibold text-gray-800">Report Not Available</h1>
        <p className="text-gray-500 mt-2">{error || "This report link is invalid or has expired."}</p>
      </div>
    </div>
  );

  const { report, tenant, pdfUrl } = data;
  const order = report.order;
  const patient = order?.patient;
  const tests = order?.order_tests ?? [];

  const testsByCategory = (tests as any[]).reduce((acc: Record<string, any[]>, ot: any) => {
    const cat = ot.test?.category ?? "Results";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ot);
    return acc;
  }, {});

  const flagColor: Record<string, string> = {
    normal: "text-green-600", low: "text-amber-600", high: "text-amber-600", critical: "text-red-600 font-bold"
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Lab Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-red-600 rounded-xl flex items-center justify-center">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{tenant?.name}</h1>
                {tenant?.address && <p className="text-sm text-gray-500">{tenant.address}</p>}
                {tenant?.phone && <p className="text-sm text-gray-500">Tel: {tenant.phone}</p>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="success" className="text-sm">
                <CheckCircle className="h-3 w-3 mr-1" />Verified Report
              </Badge>
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium">
                  <Download className="h-3 w-3" />Download PDF
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Patient Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900 ml-2">{patient?.full_name}</span></div>
            <div><span className="text-gray-500">Patient ID:</span> <span className="font-mono text-gray-900 ml-2">{patient?.patient_code}</span></div>
            {patient?.age_years != null && <div><span className="text-gray-500">Age:</span> <span className="text-gray-900 ml-2">{patient.age_years} years</span></div>}
            {patient?.gender && <div><span className="text-gray-500">Gender:</span> <span className="text-gray-900 ml-2 capitalize">{patient.gender}</span></div>}
            <div><span className="text-gray-500">Sample ID:</span> <span className="font-mono text-gray-900 ml-2">{order?.sample_id}</span></div>
            <div><span className="text-gray-500">Date:</span> <span className="text-gray-900 ml-2">{new Date(report.created_at).toLocaleDateString("en-IN")}</span></div>
          </div>
        </div>

        {/* Results */}
        {Object.entries(testsByCategory).map(([category, catTests]) => (
          <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{category}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500 w-1/3">Test</th>
                  <th className="text-left py-2 font-medium text-gray-500">Result</th>
                  <th className="text-left py-2 font-medium text-gray-500">Unit</th>
                  <th className="text-left py-2 font-medium text-gray-500">Reference Range</th>
                </tr>
              </thead>
              <tbody>
                {(catTests as any[]).map((ot, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{ot.test?.name}</td>
                    <td className={`py-2.5 font-semibold ${ot.result_flag ? flagColor[ot.result_flag] ?? "text-gray-900" : "text-gray-900"}`}>
                      {ot.result_value ?? "—"}
                      {ot.result_flag && ot.result_flag !== "normal" && (
                        <span className="ml-1 text-xs">({ot.result_flag.toUpperCase()})</span>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-500">{ot.result_unit ?? "—"}</td>
                    <td className="py-2.5 text-gray-500">{ot.test?.reference_range ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="text-center text-xs text-gray-400 mt-6">
          *** This is a digitally verified report from {tenant?.name} ***
        </div>
      </div>
    </div>
  );
}
