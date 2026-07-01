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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "", gender: "", age_years: "", phone: "", email: "", address: "",
  });

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Patient name is required";
    if (!form.age_years) e.age_years = "Age is required";
    else if (parseInt(form.age_years) < 0 || parseInt(form.age_years) > 150) e.age_years = "Enter a valid age (0–150)";
    if (!form.gender) e.gender = "Gender is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
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
              <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={e => set("full_name", e.target.value)}
                placeholder="Patient's full name"
                className={errors.full_name ? "border-red-400 focus:ring-red-400" : ""}
              />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                <Select
                  id="gender"
                  value={form.gender}
                  onChange={e => set("gender", e.target.value)}
                  className={errors.gender ? "border-red-400" : ""}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="age_years">Age (years) <span className="text-red-500">*</span></Label>
                <Input
                  id="age_years"
                  type="number"
                  min="0"
                  max="150"
                  value={form.age_years}
                  onChange={e => set("age_years", e.target.value)}
                  placeholder="e.g. 35"
                  className={errors.age_years ? "border-red-400 focus:ring-red-400" : ""}
                />
                {errors.age_years && <p className="text-xs text-red-500">{errors.age_years}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="patient@example.com"
                className={errors.email ? "border-red-400 focus:ring-red-400" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={form.address} onChange={e => set("address", e.target.value)} placeholder="House / Street / City" rows={2} />
            </div>
            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>
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
