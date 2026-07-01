"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Zap, HardDrive, CheckCircle, Database, Shield, Check, Cloud, Globe } from "lucide-react";

const localFeatures = [
  { icon: Database, label: "Local SQLite Database", desc: "Your data never leaves this device" },
  { icon: Shield, label: "Encrypted Passwords", desc: "bcrypt-secured credentials" },
  { icon: Zap, label: "Instant Access", desc: "No internet required, ever" },
];

const cloudFeatures = [
  { icon: Cloud, label: "Supabase Cloud Database", desc: "Secure, hosted Postgres database" },
  { icon: Globe, label: "Access From Anywhere", desc: "Works on any device, any browser" },
  { icon: Shield, label: "Supabase Auth", desc: "Enterprise-grade authentication" },
];

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ lab_name: "", full_name: "", email: "", password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"local" | "cloud">("cloud");

  useEffect(() => {
    const m = (document.querySelector('meta[name="storage-mode"]') as HTMLMetaElement)?.content as "local" | "cloud";
    setMode(m === "local" ? "local" : "cloud");
    fetch("/api/setup").then(r => r.json()).then(d => {
      if (!d.needsSetup) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    }).catch(() => setChecking(false));
  }, [router]);

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    setFieldErrors(e => ({ ...e, [k]: "" }));
    setError("");
  }

  function validateStep0(): boolean {
    const errs: Record<string, string> = {};
    if (!form.lab_name.trim()) errs.lab_name = "Lab name is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!form.confirm_password) errs.confirm_password = "Please confirm your password";
    else if (form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0) {
      if (validateStep0()) setStep(1);
      return;
    }
    if (!validateStep1()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab_name: form.lab_name, full_name: form.full_name, email: form.email, password: form.password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Setup failed. Please try again."); setLoading(false); return; }
    if (mode === "cloud") {
      router.push("/login?setup=done");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  if (checking) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-red-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-red-600 flex-col justify-center px-16 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full -translate-y-32 translate-x-32 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-700 rounded-full translate-y-24 -translate-x-24 opacity-50" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Labora</h1>
              <p className="text-red-200 text-xs font-medium uppercase tracking-widest">Desktop Edition</p>
            </div>
          </div>

          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            {mode === "cloud" ? <>Your lab,<br /><span className="text-amber-300">in the cloud.</span></> : <>Your lab,<br /><span className="text-amber-300">completely offline.</span></>}
          </h2>
          <p className="text-red-100 text-lg mb-10 leading-relaxed">
            {mode === "cloud"
              ? "Set up takes 30 seconds. Access from any device, anywhere."
              : "Set up takes 30 seconds. Your data stays on this device, always."}
          </p>

          <div className="space-y-4">
            {(mode === "cloud" ? cloudFeatures : localFeatures).map((f) => (
              <div key={f.label} className="flex items-center gap-4 p-4 rounded-xl bg-white/10 border border-white/20">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{f.label}</p>
                  <p className="text-red-200 text-xs mt-0.5">{f.desc}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-amber-300 ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-8 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-red-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Labora Setup</h1>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-3 mb-6">
            {["Lab Details", "Admin Account"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all`}
                  style={i < step
                    ? { background: "#16a34a", color: "white" }
                    : i === step
                    ? { background: "#DC2626", color: "white" }
                    : { background: "#e5e7eb", color: "#9ca3af" }}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium transition-colors ${i === step ? "text-red-600 font-semibold" : i < step ? "text-green-600" : "text-gray-400"}`}>{s}</span>
                {i < 1 && <div className="flex-1 h-px transition-colors" style={{ background: i < step ? "#16a34a" : "#e5e7eb" }} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <form onSubmit={handleSubmit} noValidate>

              {step === 0 ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Your Lab Details</h3>
                  <p className="text-sm text-gray-500 mb-6">Tell us about your pathology lab</p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="lab_name">Lab Name *</Label>
                      <Input
                        id="lab_name"
                        value={form.lab_name}
                        onChange={e => set("lab_name", e.target.value)}
                        placeholder="e.g. Shree Pathology Lab"
                        className={fieldErrors.lab_name ? "border-red-400 focus:ring-red-400" : ""}
                        autoFocus
                      />
                      {fieldErrors.lab_name && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{fieldErrors.lab_name}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full h-11 text-base">
                      Continue →
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Admin Account</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Login credentials for <span className="font-semibold text-red-600">{form.lab_name}</span>
                  </p>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                      <AlertCircle className="h-4 w-4 shrink-0" />{error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={e => set("full_name", e.target.value)}
                        placeholder="Dr. Admin"
                        className={fieldErrors.full_name ? "border-red-400" : ""}
                        autoFocus
                      />
                      {fieldErrors.full_name && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.full_name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                        placeholder="admin@yourlab.com"
                        className={fieldErrors.email ? "border-red-400" : ""}
                      />
                      {fieldErrors.email && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.email}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={e => set("password", e.target.value)}
                          placeholder="Min 8 chars"
                          className={fieldErrors.password ? "border-red-400" : ""}
                        />
                        {fieldErrors.password && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.password}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirm *</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={form.confirm_password}
                          onChange={e => set("confirm_password", e.target.value)}
                          placeholder="Repeat"
                          className={fieldErrors.confirm_password ? "border-red-400" : ""}
                        />
                        {fieldErrors.confirm_password && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fieldErrors.confirm_password}</p>}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => { setStep(0); setFieldErrors({}); setError(""); }}
                        className="flex-none px-4 h-11 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        ← Back
                      </button>
                      <Button type="submit" loading={loading} className="flex-1 h-11 text-base">
                        {loading ? "Setting up..." : "Create Lab & Login"}
                      </Button>
                    </div>

                    {loading && (
                      <p className="text-center text-xs text-gray-400 animate-pulse">
                        Initializing database and securing your account...
                      </p>
                    )}
                  </div>
                </>
              )}
            </form>

            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              {mode === "cloud" ? <Cloud className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /> : <HardDrive className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />}
              <p className="text-xs text-gray-500">
                {mode === "cloud"
                  ? "Your lab data is stored in Supabase cloud. After setup, sign in to access your dashboard."
                  : <>Data stored locally on this device. Back up <code className="bg-gray-200 px-1 rounded text-gray-700">labora.db</code> regularly.</>}
              </p>
            </div>
            <div className="mt-2 text-center">
              <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">Already have an account? Sign in →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
