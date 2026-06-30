"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewDoctorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", qualification: "", specialization: "", clinic_name: "", phone: "", email: "", commission_pct: "0",
  });

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, commission_pct: parseFloat(form.commission_pct) || 0, email: form.email || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error?.message ?? "Failed to add doctor", "error"); setLoading(false); return; }
    toast("Doctor added!", "success");
    router.push("/doctors");
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/doctors"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Doctor</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Doctor Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Dr. Rajesh Sharma" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Qualification</Label><Input value={form.qualification} onChange={e => set("qualification", e.target.value)} placeholder="MBBS, MD" /></div>
              <div className="space-y-2"><Label>Specialization</Label><Input value={form.specialization} onChange={e => set("specialization", e.target.value)} placeholder="General Physician" /></div>
            </div>
            <div className="space-y-2"><Label>Clinic / Hospital</Label><Input value={form.clinic_name} onChange={e => set("clinic_name", e.target.value)} placeholder="City Clinic" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" /></div>
              <div className="space-y-2"><Label>Commission %</Label><Input type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={e => set("commission_pct", e.target.value)} placeholder="0" /></div>
            </div>
            <div className="space-y-2"><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="doctor@clinic.com" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">Add Doctor</Button>
              <Link href="/doctors"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
