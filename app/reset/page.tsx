"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Zap, ArrowLeft, RefreshCw, Trash2, Check, HelpCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [action, setAction] = useState<"reset_auth" | "full_reset">("reset_auth");
  const [forgot, setForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function toggleForgot() {
    setForgot(f => !f);
    setPassword("");
    setAction("reset_auth"); // forgot path only allows reset_auth
    setConfirmText("");
    setError("");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!forgot && !password) { setError("Admin password is required"); return; }
    if (action === "full_reset" && confirmText !== "DELETE EVERYTHING") {
      setError('Type "DELETE EVERYTHING" to confirm full reset');
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm_password: forgot ? undefined : password, forgot, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Reset failed");
      setLoading(false);
      return;
    }
    // Clear session cookie by logging out
    await fetch("/api/auth/logout", { method: "POST" });
    setDone(true);
    setTimeout(() => router.push("/setup"), 2000);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reset complete</h2>
          <p className="text-gray-500 text-sm">Redirecting to setup…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-600 shadow-lg mb-4">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Labora</h1>
          <p className="text-sm text-gray-500 mt-1">
            {forgot ? "Password recovery — your data is safe" : "Emergency reset — requires your admin password"}
          </p>
        </div>

        {/* Forgot password info banner */}
        {forgot && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Your patient &amp; order data is safe</p>
              <p>This will only remove login accounts. All lab data (patients, orders, reports, billing) is preserved. You&apos;ll re-create your admin account on the next screen.</p>
            </div>
          </div>
        )}

        {/* Warning banner — shown when NOT in forgot mode */}
        {!forgot && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">This will permanently delete data</p>
              <p>Choose carefully. After reset you&apos;ll be taken to setup a fresh lab.</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleReset} className="space-y-5">

            {/* Action selector — hidden when forgot=true (locked to reset_auth) */}
            {!forgot && (
              <div className="space-y-3">
                <Label>What do you want to reset?</Label>

                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${action === "reset_auth" ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="action" checked={action === "reset_auth"}
                    onChange={() => { setAction("reset_auth"); setConfirmText(""); setError(""); }}
                    className="mt-0.5 accent-amber-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-semibold text-gray-900">Reset setup only</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Deletes all user accounts so you can re-run setup with a new admin email.
                      <span className="text-green-600 font-medium"> All patient &amp; order data is preserved.</span>
                    </p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors
                  ${action === "full_reset" ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="action" checked={action === "full_reset"}
                    onChange={() => { setAction("full_reset"); setConfirmText(""); setError(""); }}
                    className="mt-0.5 accent-red-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-semibold text-gray-900">Full factory reset</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Wipes <span className="text-red-600 font-semibold">everything</span> — patients, orders,
                      reports, billing, users. App returns to fresh install state.
                      <span className="text-red-600 font-semibold"> Cannot be undone.</span>
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Admin password — hidden when forgot=true */}
            {!forgot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Current admin password</Label>
                  <button
                    type="button"
                    onClick={toggleForgot}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your admin password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  autoFocus
                />
              </div>
            )}

            {/* Extra confirmation for full reset */}
            {action === "full_reset" && !forgot && (
              <div className="space-y-2">
                <Label htmlFor="confirmText" className="text-red-600 text-xs">
                  Type <code className="bg-red-50 px-1 py-0.5 rounded border border-red-200 font-mono">DELETE EVERYTHING</code> to confirm
                </Label>
                <Input
                  id="confirmText"
                  placeholder="DELETE EVERYTHING"
                  value={confirmText}
                  onChange={e => { setConfirmText(e.target.value); setError(""); }}
                  className={confirmText && confirmText !== "DELETE EVERYTHING" ? "border-red-400 focus:ring-red-400" : ""}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              loading={loading}
              disabled={
                (!forgot && !password) ||
                (!forgot && action === "full_reset" && confirmText !== "DELETE EVERYTHING")
              }
              className={`w-full h-11 ${action === "full_reset" && !forgot ? "bg-red-700 hover:bg-red-800 border-red-800" : ""}`}
            >
              {forgot
                ? <><RefreshCw className="h-4 w-4 mr-2" />Reset Login — Keep All Data</>
                : action === "full_reset"
                  ? <><Trash2 className="h-4 w-4 mr-2" />Full Reset — Wipe Everything</>
                  : <><RefreshCw className="h-4 w-4 mr-2" />Reset Setup &amp; User Accounts</>
              }
            </Button>

            {/* Toggle back to password mode */}
            {forgot && (
              <button
                type="button"
                onClick={toggleForgot}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
              >
                I remember my password — go back
              </button>
            )}
          </form>
        </div>

        <div className="text-center mt-4">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
