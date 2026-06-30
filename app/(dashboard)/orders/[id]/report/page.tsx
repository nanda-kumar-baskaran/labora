"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, FileText, CheckCircle, Download, Link2, RefreshCw, Mail, Edit2, AlertCircle, Printer } from "lucide-react";
import Link from "next/link";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ sent?: boolean; error?: string; smtpMissing?: boolean } | null>(null);

  async function loadOrder() {
    try {
      const r = await fetch(`/api/orders/${orderId}`);
      if (!r.ok) throw new Error("Failed to load order");
      const d = await r.json();
      setOrder(d.order);
    } catch (err) {
      console.error(err);
      toast("Failed to load order", "error");
    }
  }

  useEffect(() => { loadOrder(); }, [orderId]);

  const report = order?.reports?.[0];
  const patientEmail = order?.patient?.email;

  async function generateReport() {
    setGenerating(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast("Report generated!", "success");
      await loadOrder();
    } else {
      toast(data.error ?? "Generation failed", "error");
    }
    setGenerating(false);
  }

  async function correctAndRegenerate() {
    // Reset report to draft so results can be edited again, then regenerate
    if (!report) return;
    setGenerating(true);
    try {
      // Mark report as draft first (unlock for editing)
      const patchRes = await fetch(`/api/reports/${report.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      // Regenerate regardless (creates new PDF)
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast("Report reset to draft — update results and regenerate", "success");
        await loadOrder();
      } else {
        toast(data.error ?? "Regeneration failed", "error");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function verifyReport() {
    if (!report) return;
    setVerifying(true);
    const res = await fetch(`/api/reports/${report.id}/verify`, { method: "POST" });
    if (res.ok) {
      toast("Report verified!", "success");
      await loadOrder();
    } else {
      toast("Verification failed", "error");
    }
    setVerifying(false);
  }

  async function emailReport() {
    if (!report || !patientEmail) return;
    setEmailing(true);
    setEmailStatus(null);
    const res = await fetch(`/api/reports/${report.id}/email`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setEmailStatus({ sent: true });
      toast(`Report emailed to ${patientEmail}`, "success");
    } else if (data.smtpMissing) {
      setEmailStatus({ smtpMissing: true });
    } else {
      setEmailStatus({ error: data.error ?? "Email failed" });
      toast(data.error ?? "Email failed", "error");
    }
    setEmailing(false);
  }

  const shareUrl = report?.public_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${report.public_token}`
    : null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/orders/${orderId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report</h1>
          <p className="text-sm text-gray-500 font-mono">{order?.sample_id}</p>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">PDF Report</CardTitle>
            {report && (
              <Badge variant={report.status === "verified" ? "success" : report.status === "draft" ? "secondary" : "default"} className="capitalize">
                {report.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateReport} loading={generating} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {report ? "Regenerate PDF" : "Generate PDF"}
            </Button>
            {report && (
              <Button onClick={correctAndRegenerate} loading={generating} variant="outline" title="Reset to draft and re-generate — go back to results page to fix values first">
                <Edit2 className="h-4 w-4 mr-2" />
                Correct &amp; Regenerate
              </Button>
            )}
            {report && report.status !== "verified" && (
              <Button onClick={verifyReport} loading={verifying}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Report
              </Button>
            )}
            {report?.pdf_url && (
              <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline"><Download className="h-4 w-4 mr-2" />Download PDF</Button>
              </a>
            )}
            {report?.pdf_url && report?.status === "verified" && (
              <Button
                variant="outline"
                onClick={() => {
                  // iframe.contentWindow.print() is blocked by Electron's security sandbox.
                  // Instead, open the PDF URL in a new window and trigger print from there.
                  const w = window.open(report.pdf_url, "_blank");
                  if (w) { w.onload = () => w.print(); }
                }}
                className="text-green-700 border-green-200 hover:bg-green-50"
              >
                <Printer className="h-4 w-4 mr-2" />Print Report
              </Button>
            )}
          </div>

          {/* Email to patient */}
          {report && (
            <div className="pt-2 border-t border-gray-100">
              {patientEmail ? (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={emailReport}
                    loading={emailing}
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email to Patient
                  </Button>
                  <span className="text-xs text-gray-400">{patientEmail}</span>
                  {emailStatus?.sent && <span className="text-xs text-green-600 font-medium">✓ Sent</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>Patient has no email on file —</span>
                  <Link href={`/patients/${order?.patient_id}`} className="text-red-600 hover:underline">add it in patient profile</Link>
                </div>
              )}

              {/* SMTP not configured warning */}
              {emailStatus?.smtpMissing && (
                <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Email not configured</p>
                    <p className="text-xs mt-0.5">Add SMTP settings in Settings → Lab Profile to enable email delivery.</p>
                  </div>
                </div>
              )}
              {emailStatus?.error && (
                <p className="mt-1 text-xs text-red-600">{emailStatus.error}</p>
              )}
            </div>
          )}

          {/* Correct & Regenerate info */}
          {report && report.status === "verified" && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <p className="font-medium mb-1">Need to correct this report?</p>
              <p>Click <strong>Correct &amp; Regenerate</strong> above — it resets the report to draft. Then go to <Link href={`/orders/${orderId}/results`} className="underline">Enter Results</Link> to fix values, and regenerate.</p>
            </div>
          )}

          {/* Share link */}
          {shareUrl && report?.status === "verified" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <Link2 className="h-4 w-4 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-1 text-red-600">Public share link (no login required)</p>
                <a href={shareUrl} target="_blank" className="text-xs text-gray-500 hover:text-red-600 break-all transition-colors">{shareUrl}</a>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(shareUrl); toast("Link copied!", "success"); }}
                className="text-xs text-white px-2 py-1 rounded transition-colors hover:opacity-90 bg-red-600"
              >Copy</button>
            </div>
          )}

          {!report && (
            <div className="flex items-center gap-3 p-4 rounded-lg text-gray-400 bg-gray-50 border border-dashed border-gray-200">
              <FileText className="h-8 w-8" />
              <div>
                <p className="text-sm font-medium">No report generated yet</p>
                <p className="text-xs">Click "Generate PDF" to create the report</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {report?.pdf_url && (
        <Card>
          <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
          <CardContent className="p-0">
            <iframe src={report.pdf_url} className="w-full h-[600px] rounded-b-lg" title="Report Preview" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
