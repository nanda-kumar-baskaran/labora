"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", gender: "", age_years: "", phone: "", email: "", address: "",
  });

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        age_years: form.age_years ? parseInt(form.age_years) : undefined,
        gender: form.gender || undefined,
        email: form.email || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error?.message ?? "Failed to register patient", "error");
      setLoading(false);
      return;
    }
    toast("Patient registered successfully!", "success");
    router.push(`/patients/${data.id}`);
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/patients">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Patient</h1>
          <p className="text-sm text-gray-500">Add a new patient to the system</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Patient Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Patient's full name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select id="gender" value={form.gender} onChange={e => set("gender", e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age_years">Age (years)</Label>
                <Input id="age_years" type="number" min="0" max="150" value={form.age_years} onChange={e => set("age_years", e.target.value)} placeholder="e.g. 35" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="patient@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={form.address} onChange={e => set("address", e.target.value)} placeholder="House / Street / City" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">Register Patient</Button>
              <Link href="/patients"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
