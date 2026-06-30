"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Zap, Cloud, HardDrive, Activity, Info } from "lucide-react";

const SESSION_KEY = "labora_session_active";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"cloud" | "local">("cloud");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Show reason banner if redirected from auto-logout
  const logoutReason = searchParams.get("reason");
  const reasonMessage = logoutReason === "inactivity"
    ? "You were logged out due to 15 minutes of inactivity."
    : logoutReason === "session_end"
    ? "Your session ended. Please sign in again."
    : null;

  useEffect(() => {
    const m = (document.querySelector('meta[name="storage-mode"]') as HTMLMetaElement)?.content;
    if (m === "local") {
      setMode("local");
      fetch("/api/setup")
        .then(r => r.json())
        .then(d => {
          setNeedsSetup(d.needsSetup === true);
          setCheckingSetup(false);
        })
        .catch(() => {
          setNeedsSetup(false);
          setCheckingSetup(false);
        });
    } else {
      setCheckingSetup(false);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password) { setError("Password is required"); return; }
    setLoading(true);
    setError("");
    if (mode === "local") {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid email or password"); setLoading(false); return; }
      sessionStorage.setItem(SESSION_KEY, "1");
      const roleHome: Record<string, string> = { admin: "/dashboard", staff: "/home", technician: "/home", pathologist: "/home" };
      router.push(roleHome[data.role] ?? "/orders");
      router.refresh();
    } else {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) { setError(authErr.message); setLoading(false); return; }
      sessionStorage.setItem(SESSION_KEY, "1");
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-600 shadow-lg mb-4">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Labora</h1>
          <p className="text-sm text-gray-500 mt-1">Lab Intelligence Platform</p>
        </div>

        {/* Mode badge */}
        <div className="flex justify-center mb-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border
            ${mode === "local"
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {mode === "local" ? <HardDrive className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
            {mode === "local" ? "Offline Mode — Local Storage" : "Cloud Mode"}
          </div>
        </div>

        {/* Auto-logout reason banner */}
        {reasonMessage && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <Info className="h-4 w-4 shrink-0" />
            {reasonMessage}
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">
            {mode === "local" ? "Sign in to your local lab" : "Sign in to your lab account"}
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@yourlab.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full h-11 text-base">
              <Activity className="h-4 w-4 mr-2" />
              Sign In to Labora
            </Button>
          </form>

          {/* Setup link — shown in local mode when no lab is set up */}
          {mode === "local" && !checkingSetup && (
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              {needsSetup ? (
                <>
                  <p className="text-sm text-gray-500 mb-2">First time using Labora?</p>
                  <a
                    href="/setup"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    <Zap className="h-4 w-4" />
                    Set Up Your Lab
                  </a>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Lab already configured. Sign in above.</p>
                  <p className="text-xs text-gray-400">
                    Forgot your password?{" "}
                    <a href="/reset" className="text-red-600 hover:underline font-medium">
                      Recover access →
                    </a>
                  </p>
                  <p className="text-xs text-gray-400">
                    Need to reconfigure?{" "}
                    <a href="/reset" className="text-gray-400 hover:underline">
                      Emergency reset
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-8 mt-6">
          {[["500+", "Labs Served"], ["99.9%", "Uptime"], ["HIPAA", "Compliant"]].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-sm font-bold text-red-600">{val}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
