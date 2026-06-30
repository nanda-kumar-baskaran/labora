"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Plus, ChevronDown, ChevronUp, Zap, Loader2, Download, Search, Pencil, Check, X } from "lucide-react";

interface Test {
  id: string;
  name: string;
  short_code: string;
  category: string | null;
  sample_type: string | null;
  reference_range: string | null;
  unit: string | null;
  price: number;
  turnaround_hrs: number;
  method: string | null;
}

function EditableCell({
  value,
  onSave,
  type = "text",
  align = "left",
}: {
  value: string | number | null;
  onSave: (v: string) => Promise<void>;
  type?: "text" | "number";
  align?: "left" | "right";
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() { setVal(String(value ?? "")); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  function cancel() { setEditing(false); }
  async function save() {
    setSaving(true);
    try { await onSave(val); setEditing(false); }
    catch { /* toast handled by parent */ }
    finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[80px]">
        <Input
          ref={inputRef}
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="h-7 text-xs py-0 px-1.5 min-w-0 w-full"
        />
        <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700 shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit"
      className={`group flex items-center gap-1 w-full text-left hover:bg-red-50 rounded px-1 -mx-1 transition-colors ${align === "right" ? "justify-end" : ""}`}
    >
      <span className="text-xs">{value ?? <span className="text-gray-300 italic">—</span>}</span>
      <Pencil className="h-2.5 w-2.5 text-gray-300 group-hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function TestCatalogPage() {
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", short_code: "", category: "", sample_type: "Blood", price: "", reference_range: "", unit: "", turnaround_hrs: "24" });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function loadTests() {
    setLoading(true);
    const r = await fetch("/api/tests");
    setTests(await r.json());
    setLoading(false);
  }

  useEffect(() => { loadTests(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast("Test name is required", "error"); return; }
    if (!form.short_code.trim()) { toast("Short code is required", "error"); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { toast("Valid price is required", "error"); return; }
    setSaving(true);
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: parseFloat(form.price), turnaround_hrs: parseInt(form.turnaround_hrs) }),
    });
    const data = await res.json();
    if (res.ok) {
      toast("Test added!", "success");
      setShowForm(false);
      setForm({ name: "", short_code: "", category: "", sample_type: "Blood", price: "", reference_range: "", unit: "", turnaround_hrs: "24" });
      await loadTests();
    } else {
      toast(data.error?.message ?? data.error ?? "Failed to add test", "error");
    }
    setSaving(false);
  }

  async function handleSeedTests() {
    setSeeding(true);
    const res = await fetch("/api/tests/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overwrite: false }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.added === 0) {
        toast(`All ${data.total} built-in tests already present — nothing to add`, "success");
      } else {
        toast(`✓ Added ${data.added} built-in tests${data.skipped > 0 ? ` (${data.skipped} already existed)` : ""}`, "success");
      }
      await loadTests();
    } else {
      toast(data.error ?? "Failed to load built-in tests", "error");
    }
    setSeeding(false);
  }

  async function updateField(testId: string, field: string, raw: string) {
    let value: string | number = raw;
    if (field === "price" || field === "turnaround_hrs") {
      const n = parseFloat(raw);
      if (isNaN(n) || n < 0) { toast(`Invalid value for ${field}`, "error"); throw new Error("invalid"); }
      value = n;
    }
    const res = await fetch(`/api/tests/${testId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const d = await res.json();
      toast(d.error ?? "Update failed", "error");
      throw new Error(d.error);
    }
    const updated = await res.json();
    setTests(prev => prev.map(t => t.id === testId ? { ...t, ...updated } : t));
    toast("Saved!", "success");
  }

  // Filter by search
  const q = search.toLowerCase().trim();
  const filteredTests = q
    ? tests.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.short_code.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.sample_type ?? "").toLowerCase().includes(q)
      )
    : tests;

  const byCategory = filteredTests.reduce<Record<string, Test[]>>((acc, t) => {
    const cat = t.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tests.length} active tests
            {q && filteredTests.length !== tests.length && ` · ${filteredTests.length} matching`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSeedTests}
            loading={seeding}
            variant="outline"
            title="Load all standard pathology tests with real reference ranges and pricing"
          >
            <Download className="h-4 w-4 mr-2" />
            {tests.length === 0 ? "Load Built-in Tests" : "Add Missing Tests"}
          </Button>
          <Button onClick={() => setShowForm(!showForm)} variant="outline">
            {showForm ? <ChevronUp className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? "Cancel" : "Add Custom Test"}
          </Button>
        </div>
      </div>

      {/* Seed prompt when catalog is empty */}
      {!loading && tests.length === 0 && (
        <div className="mb-6 p-6 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-red-400" />
          <h3 className="font-semibold text-gray-900 mb-1">No tests in catalog yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Load <strong>94 built-in standard tests</strong> with real ICMR/NABL reference ranges and indicative pricing — or add your own.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleSeedTests} loading={seeding}>
              <Download className="h-4 w-4 mr-2" />
              Load Built-in Tests (94 tests)
            </Button>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Test
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Sources: ICMR, NABL, Lal PathLabs, Metropolis, Thyrocare · Prices are indicative MRP, editable anytime
          </p>
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Add Custom Test</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Test Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Complete Blood Count" required /></div>
              <div className="space-y-2"><Label>Short Code *</Label><Input value={form.short_code} onChange={e => set("short_code", e.target.value.toUpperCase())} placeholder="CBC" required /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="Haematology" /></div>
              <div className="space-y-2"><Label>Sample Type</Label><Input value={form.sample_type} onChange={e => set("sample_type", e.target.value)} placeholder="Blood" /></div>
              <div className="space-y-2"><Label>Price (₹) *</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} required /></div>
              <div className="space-y-2"><Label>TAT (hours)</Label><Input type="number" min="1" value={form.turnaround_hrs} onChange={e => set("turnaround_hrs", e.target.value)} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="mg/dL" /></div>
              <div className="space-y-2"><Label>Reference Range</Label><Input value={form.reference_range} onChange={e => set("reference_range", e.target.value)} placeholder="13.5 - 17.5" /></div>
              <div className="col-span-2 flex justify-end">
                <Button type="submit" loading={saving}>Add Test</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search bar */}
      {tests.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, category or sample type…"
            className="pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading tests...</span>
        </div>
      ) : filteredTests.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 px-1">
            💡 Click any cell to edit it inline — press Enter to save, Escape to cancel
          </p>
          {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catTests]) => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  {cat}
                  <Badge variant="secondary" className="ml-auto">{catTests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Code</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Sample</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Reference Range</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Unit</th>
                        <th className="text-right px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Price (₹)</th>
                        <th className="text-right px-4 py-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">TAT (h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {catTests.sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 font-medium text-gray-900">
                            <EditableCell value={t.name} onSave={v => updateField(t.id, "name", v)} />
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-500">
                            <EditableCell value={t.short_code} onSave={v => updateField(t.id, "short_code", v.toUpperCase())} />
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            <EditableCell value={t.sample_type} onSave={v => updateField(t.id, "sample_type", v)} />
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            <EditableCell value={t.reference_range} onSave={v => updateField(t.id, "reference_range", v)} />
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            <EditableCell value={t.unit} onSave={v => updateField(t.id, "unit", v)} />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-red-600">
                            <EditableCell value={t.price} onSave={v => updateField(t.id, "price", v)} type="number" align="right" />
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500">
                            <EditableCell value={t.turnaround_hrs} onSave={v => updateField(t.id, "turnaround_hrs", v)} type="number" align="right" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tests.length > 0 && q ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
          <Search className="h-8 w-8" />
          <p className="text-sm">No tests match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch("")} className="text-sm text-red-600 hover:text-red-700">Clear search</button>
        </div>
      ) : null}
    </div>
  );
}
