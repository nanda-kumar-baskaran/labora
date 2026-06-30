"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, ArrowRight, Check, Search, X, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { Patient, TestCatalog, Doctor } from "@/types";

const STEPS = ["Patient", "Tests", "Referral", "Summary"];

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Step 2
  const [allTests, setAllTests] = useState<TestCatalog[]>([]);
  // discount_str stores the raw input string so "0" prefix doesn't appear when typing
  const [selectedTests, setSelectedTests] = useState<Record<string, { test: TestCatalog; discount_pct: number; discount_str: string }>>({});
  const [testSearch, setTestSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Step 3
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [referredBy, setReferredBy] = useState("");

  // Step 4
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [notes, setNotes] = useState("");

  // Pre-fill patient from URL
  useEffect(() => {
    const pid = searchParams.get("patient_id");
    if (pid) {
      fetch(`/api/patients/${pid}`)
        .then(r => r.json())
        .then(d => { if (d.patient) setSelectedPatient(d.patient); });
    }
  }, [searchParams]);

  // Search patients
  useEffect(() => {
    if (!patientSearch.trim()) { setPatients([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      const r = await fetch(`/api/patients?q=${encodeURIComponent(patientSearch)}`);
      const d = await r.json();
      setPatients(d.data ?? []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Pre-fetch tests + doctors on mount so step 2/3 are instant
  useEffect(() => {
    fetch("/api/tests").then(r => r.json()).then(setAllTests);
    fetch("/api/doctors").then(r => r.json()).then(d => setDoctors(d ?? []));
  }, []);

  // Derived: all unique categories sorted
  const allCategories = Array.from(new Set(allTests.map(t => t.category ?? "Other"))).sort();

  // Derived: filtered tests based on search + category
  const filteredTests = allTests.filter(t => {
    const q = testSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      t.short_code.toLowerCase().includes(q) ||
      (t.category ?? "").toLowerCase().includes(q) ||
      (t.sample_type ?? "").toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || (t.category ?? "Other") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered tests by category
  const testsByCategory = filteredTests.reduce<Record<string, TestCatalog[]>>((acc, t) => {
    const cat = t.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  function toggleTest(test: TestCatalog) {
    setSelectedTests(prev => {
      const next = { ...prev };
      if (next[test.id]) delete next[test.id];
      else next[test.id] = { test, discount_pct: 0, discount_str: "" };
      return next;
    });
  }

  const totalAmount = Object.values(selectedTests).reduce((sum, { test, discount_pct }) => {
    return sum + test.price * (1 - discount_pct / 100);
  }, 0);

  async function handleSubmit() {
    if (!selectedPatient) return;
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctorId || undefined,
        referred_by: referredBy || undefined,
        priority,
        notes: notes || undefined,
        tests: Object.values(selectedTests).map(({ test, discount_pct }) => ({
          test_id: test.id,
          price: test.price,
          discount_pct,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error?.message ?? "Failed to create order", "error");
      setSubmitting(false);
      return;
    }
    toast("Order created! Sample ID: " + data.sample_id, "success");
    router.push(`/orders/${data.id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
          <p className="text-sm text-gray-500">Create a new sample order</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium`}
              style={i <= step
                ? { background: "linear-gradient(135deg, #DC2626, #991B1B)", color: "#ffffff" }
                : { background: "#f3f4f6", color: "#9ca3af" }}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "text-red-600 font-medium" : i < step ? "text-gray-500" : "text-gray-400"}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px mx-1"
              style={{ background: i < step ? "#DC2626" : "#e5e7eb" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Patient */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Select Patient</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                <div>
                  <p className="font-medium text-gray-900">{selectedPatient.full_name}</p>
                  <p className="text-sm text-red-600">{selectedPatient.patient_code} · {selectedPatient.phone}</p>
                </div>
                <button onClick={() => setSelectedPatient(null)} className="text-red-400 hover:text-red-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search patient name, phone, or ID..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                  />
                </div>
                {searchLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />Searching...
                  </div>
                )}
                {patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setPatients([]); setPatientSearch(""); }}
                    className="w-full text-left p-3 rounded-lg mb-2 transition-colors border border-gray-200 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">{p.full_name}</p>
                    <p className="text-sm text-gray-500">{p.patient_code} · {p.phone} · {p.age_years != null ? `${p.age_years}y` : ""} {p.gender ?? ""}</p>
                  </button>
                ))}
                <Link href="/patients/new" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                  + Register new patient
                </Link>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(1)} disabled={!selectedPatient}>
                Next: Select Tests <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Tests */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Tests</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {Object.keys(selectedTests).length} selected · ₹{totalAmount.toFixed(2)}
                  {filteredTests.length !== allTests.length && (
                    <span className="ml-2 text-gray-400">({filteredTests.length} of {allTests.length} shown)</span>
                  )}
                </p>
              </div>
              {Object.keys(selectedTests).length > 0 && (
                <button
                  onClick={() => setSelectedTests({})}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Search + Filter bar */}
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, code, sample type..."
                  value={testSearch}
                  onChange={e => setTestSearch(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 transition-colors"
                  autoFocus
                />
                {testSearch && (
                  <button
                    onClick={() => setTestSearch("")}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 transition-colors min-w-[160px]"
              >
                <option value="">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {!allTests.length && (
              <div className="text-center text-gray-400 py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading tests...
              </div>
            )}

            {allTests.length > 0 && filteredTests.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium">No tests found</p>
                <p className="text-sm mt-1">Try a different search term or category</p>
                <button
                  onClick={() => { setTestSearch(""); setSelectedCategory(""); }}
                  className="mt-3 text-sm text-red-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto -mx-6 px-6">
              {Object.entries(testsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, tests]) => (
                <div key={cat} className="mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1 sticky top-0 bg-white py-1">
                    <Zap className="h-3 w-3 text-red-500" />{cat}
                    <span className="ml-auto font-normal text-gray-400">{tests.length}</span>
                  </h3>
                  <div className="space-y-1.5">
                    {tests.map(t => {
                      const isSelected = !!selectedTests[t.id];
                      // Highlight matching text
                      const q = testSearch.toLowerCase().trim();
                      return (
                        <div key={t.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                            isSelected ? "border-red-300 bg-red-50 shadow-sm" : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                          onClick={() => toggleTest(t)}
                        >
                          <input type="checkbox" readOnly checked={isSelected} className="accent-red-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-gray-900">{t.name}</span>
                              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{t.short_code}</span>
                            </div>
                            {t.sample_type && (
                              <p className="text-xs text-gray-400 mt-0.5">{t.sample_type}
                                {t.reference_range ? ` · Ref: ${t.reference_range}` : ""}
                                {t.unit ? ` ${t.unit}` : ""}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-red-600">₹{t.price}</span>
                            {isSelected && (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <span className="text-xs text-gray-400">Disc%</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9]*\.?[0-9]*"
                                  placeholder="0"
                                  className="w-14 h-7 text-xs rounded-md border border-gray-300 bg-white px-1.5 text-center focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-400"
                                  value={selectedTests[t.id].discount_str}
                                  onChange={e => {
                                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                                    const num = parseFloat(raw);
                                    const pct = isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
                                    setSelectedTests(prev => ({
                                      ...prev,
                                      [t.id]: { ...prev[t.id], discount_pct: pct, discount_str: raw }
                                    }));
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100 mt-4">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
              <Button onClick={() => setStep(2)} disabled={!Object.keys(selectedTests).length}>
                Next: Referral <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Referral */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Referral Doctor (Optional)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Doctor</Label>
              <Select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                <option value="">No referral</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name} {d.clinic_name ? `(${d.clinic_name})` : ""}</option>
                ))}
              </Select>
            </div>
            {!selectedDoctorId && (
              <div className="space-y-2">
                <Label>Or enter name manually</Label>
                <Input placeholder="Dr. Sharma, City Clinic" value={referredBy} onChange={e => setReferredBy(e.target.value)} />
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
              <Button onClick={() => setStep(3)}>
                Next: Summary <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Patient</p>
              <p className="font-medium text-gray-900">{selectedPatient?.full_name}</p>
              <p className="text-sm text-gray-500">{selectedPatient?.patient_code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Tests ({Object.keys(selectedTests).length})</p>
              {Object.values(selectedTests).map(({ test, discount_pct }) => (
                <div key={test.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span className="text-gray-700">{test.name}</span>
                  <span className="font-medium text-gray-900">
                    ₹{(test.price * (1 - discount_pct / 100)).toFixed(2)}
                    {discount_pct > 0 && <span className="text-xs text-gray-400 ml-1">(-{discount_pct}%)</span>}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold mt-2 pt-1 text-base">
                <span className="text-gray-900">Total</span>
                <span className="text-red-600">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onChange={e => setPriority(e.target.value as any)}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT (Emergency)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Any special instructions..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
              <Button onClick={handleSubmit} loading={submitting}>
                <Check className="mr-2 h-4 w-4" />Create Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
