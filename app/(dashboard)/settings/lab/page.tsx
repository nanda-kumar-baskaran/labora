"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Save, Zap, AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp, Upload, Image, X, FileText, Download } from "lucide-react";

export default function LabSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateResult, setTemplateResult] = useState<{ hasLogo: boolean; headerText: string | null; footerText: string | null } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Reset section state
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetAction, setResetAction] = useState<"reset_auth" | "full_reset">("reset_auth");
  const [resetting, setResetting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    fetch("/api/admin/tenant").then(r => r.json()).then(d => { setForm(d ?? {}); setLoading(false); });
  }, []);

  function set(k: string, v: string) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please select an image file (PNG, JPG, SVG)", "error"); return; }
    if (file.size > 2 * 1024 * 1024) { toast("Image must be under 2MB", "error"); return; }
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "logo");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        set("logo_url", data.url);
        toast("Logo uploaded!", "success");
      } else {
        toast(data.error ?? "Upload failed", "error");
      }
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) { toast("Please upload a .docx Word file", "error"); return; }
    setUploadingTemplate(true);
    setTemplateResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/report-template", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setTemplateResult(data.extracted);
        toast(data.message, "success");
        // Refresh form to show updated values
        const r2 = await fetch("/api/admin/tenant");
        if (r2.ok) setForm(await r2.json());
      } else {
        toast(data.error ?? "Upload failed", "error");
      }
    } finally {
      setUploadingTemplate(false);
      if (templateInputRef.current) templateInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/tenant", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) toast("Lab profile updated!", "success");
    else toast("Failed to update", "error");
    setSaving(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetAction === "full_reset" && confirmText !== "DELETE EVERYTHING") {
      toast('Type "DELETE EVERYTHING" to confirm full reset', "error");
      return;
    }
    setResetting(true);
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm_password: resetPassword, action: resetAction }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(data.message, "success");
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/setup");
      router.refresh();
    } else {
      toast(data.error ?? "Reset failed", "error");
      setResetting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      Loading...
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Zap className="h-6 w-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Profile</h1>
          <p className="text-sm text-gray-500">Update your lab's details and branding</p>
        </div>
      </div>

      {/* Lab details form */}
      <Card>
        <CardHeader><CardTitle>Lab Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Lab Name *</Label>
              <Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={form.address ?? ""} onChange={e => set("address", e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>City</Label><Input value={form.city ?? ""} onChange={e => set("city", e.target.value)} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={form.state ?? ""} onChange={e => set("state", e.target.value)} /></div>
              <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode ?? ""} onChange={e => set("pincode", e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={form.gstin ?? ""} onChange={e => set("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Lab Logo</Label>
              <div className="flex items-start gap-4">
                {form.logo_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logo_url} alt="Lab logo" className="h-16 w-auto max-w-[160px] object-contain rounded-lg border border-gray-200 bg-gray-50 p-1" />
                    <button
                      type="button"
                      onClick={() => set("logo_url", "")}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-32 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                    <Image className="h-6 w-6" />
                  </div>
                )}
                <div className="space-y-1">
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} loading={uploadingLogo}>
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    {form.logo_url ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-gray-400">PNG, JPG, SVG · max 2MB · shown on PDF reports</p>
                </div>
              </div>
            </div>

            {/* Report Template Upload */}
            <div className="space-y-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <Label className="flex items-center gap-2 text-gray-700 font-semibold">
                <FileText className="h-4 w-4 text-red-500" />
                Custom Report Template (Word Document)
              </Label>
              <p className="text-xs text-gray-500">
                Download the template, add your lab letterhead/logo to the header and disclaimer text to the footer,
                then upload it back. Your header and footer will be automatically applied to all generated reports.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a href="/api/admin/report-template" download="labora-report-template.docx">
                  <Button type="button" variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download Template (.docx)
                  </Button>
                </a>
                <div>
                  <input ref={templateInputRef} type="file" accept=".docx" className="hidden" onChange={handleTemplateUpload} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => templateInputRef.current?.click()}
                    loading={uploadingTemplate}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Upload Completed Template
                  </Button>
                </div>
              </div>
              {templateResult && (
                <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 space-y-1">
                  <p className="font-semibold">✓ Template applied:</p>
                  {templateResult.hasLogo && <p>• Logo image extracted and saved</p>}
                  {templateResult.headerText && <p>• Header: &ldquo;{templateResult.headerText}&rdquo;</p>}
                  {templateResult.footerText && <p>• Footer: &ldquo;{templateResult.footerText}&rdquo;</p>}
                  {!templateResult.hasLogo && !templateResult.headerText && !templateResult.footerText && (
                    <p>No content found — edit the header/footer in Word and re-upload</p>
                  )}
                </div>
              )}
            </div>

            {/* Print Mode */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                <FileText className="h-3.5 w-3.5 text-red-500" />
                Report Print Mode
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Digital mode */}
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${(form.report_print_mode ?? "digital") === "digital"
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                  <input
                    type="radio"
                    name="print_mode"
                    value="digital"
                    checked={(form.report_print_mode ?? "digital") === "digital"}
                    onChange={() => set("report_print_mode", "digital")}
                    className="mt-0.5 accent-red-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Digital Letterhead</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lab name, logo, address, and footer are printed <span className="text-red-600 font-medium">by the software</span> on every page. Use this for plain paper.
                    </p>
                  </div>
                </label>

                {/* Pre-printed mode */}
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${form.report_print_mode === "preprinted"
                    ? "border-amber-400 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                  <input
                    type="radio"
                    name="print_mode"
                    value="preprinted"
                    checked={form.report_print_mode === "preprinted"}
                    onChange={() => set("report_print_mode", "preprinted")}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Pre-printed Letterhead</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lab uses paper with header/footer <span className="text-amber-700 font-medium">already printed</span>. PDF leaves blank space at top &amp; bottom — no duplicate printing.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Report Header — only relevant in digital mode */}
            {(form.report_print_mode ?? "digital") === "digital" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                Report Header Text
              </Label>
              <Textarea
                value={form.report_header ?? ""}
                onChange={e => set("report_header", e.target.value)}
                placeholder="Accredited by NABL · ISO 15189:2012 · 24×7 Emergency Services"
                rows={2}
              />
              <p className="text-xs text-gray-400">Appears below the lab name in PDF reports (accreditations, tagline, etc.)</p>
            </div>
            )}

            {/* Report Footer — only relevant in digital mode */}
            {(form.report_print_mode ?? "digital") === "digital" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                Report Footer Text
              </Label>
              <Input
                value={form.report_footer ?? ""}
                onChange={e => set("report_footer", e.target.value)}
                placeholder="Results are confidential — for clinical use only"
              />
              <p className="text-xs text-gray-400">Appears at the bottom of every PDF report page</p>
            </div>
            )}

            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4 mr-2" />Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone — keep semantic red but use light red for light theme */}
      <div className="rounded-xl overflow-hidden border border-red-200 bg-red-50">
        <button
          onClick={() => setShowReset(!showReset)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-700">Danger Zone</p>
              <p className="text-xs text-red-400">Reset setup, change admin credentials, or wipe all data</p>
            </div>
          </div>
          {showReset
            ? <ChevronUp className="h-4 w-4 text-red-400" />
            : <ChevronDown className="h-4 w-4 text-red-400" />}
        </button>

        {showReset && (
          <div className="px-6 pb-6 border-t border-red-200">
            <form onSubmit={handleReset} className="space-y-5 mt-5">

              {/* Action selector */}
              <div className="space-y-3">
                <Label>What do you want to reset?</Label>

                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${resetAction === "reset_auth"
                    ? "border-amber-400 bg-amber-50"
                    : "border-red-200 hover:border-red-300 bg-white"}`}>
                  <input type="radio" name="action" value="reset_auth" checked={resetAction === "reset_auth"}
                    onChange={() => setResetAction("reset_auth")} className="mt-0.5 accent-amber-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">Reset setup only</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Deletes all user accounts so you can re-run /setup with a new lab name and admin email.
                      <span className="text-emerald-600"> Patients, orders, reports and billing data are preserved.</span>
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${resetAction === "full_reset"
                    ? "border-red-400 bg-red-100"
                    : "border-red-200 hover:border-red-300 bg-white"}`}>
                  <input type="radio" name="action" value="full_reset" checked={resetAction === "full_reset"}
                    onChange={() => setResetAction("full_reset")} className="mt-0.5 accent-red-600" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-900">Full factory reset</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Wipes <span className="text-red-600 font-medium">ALL data</span> — patients, orders, reports,
                      billing, users. The app will be like a fresh install.
                      <span className="text-red-600 font-medium"> This cannot be undone.</span>
                    </p>
                  </div>
                </label>
              </div>

              {/* Password confirmation */}
              <div className="space-y-2">
                <Label>Confirm your current admin password</Label>
                <Input
                  type="password"
                  placeholder="Current admin password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  required
                />
              </div>

              {/* Extra confirmation for full reset */}
              {resetAction === "full_reset" && (
                <div className="space-y-2">
                  <Label className="text-red-600 text-xs">
                    Type <code className="px-1 rounded bg-red-100 text-red-700">DELETE EVERYTHING</code> to confirm
                  </Label>
                  <Input
                    placeholder="DELETE EVERYTHING"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    className="border-red-300 focus:ring-red-500/50"
                  />
                </div>
              )}

              <Button
                type="submit"
                loading={resetting}
                disabled={!resetPassword || (resetAction === "full_reset" && confirmText !== "DELETE EVERYTHING")}
                className="bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-700/30"
              >
                {resetAction === "full_reset"
                  ? <><Trash2 className="h-4 w-4 mr-2" />Full Reset — Wipe Everything</>
                  : <><RefreshCw className="h-4 w-4 mr-2" />Reset Setup &amp; User Accounts</>}
              </Button>

              <p className="text-xs text-gray-400">
                After reset you'll be logged out and redirected to /setup to create a new admin account.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
