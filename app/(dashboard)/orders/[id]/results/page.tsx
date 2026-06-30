"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, CheckCircle, Save, Pencil, X, History } from "lucide-react";
import Link from "next/link";

interface TestResult {
  id: string;
  test_id: string;
  status: string;
  result_value: string;
  result_unit: string;
  result_flag: string;
  result_notes: string;
  completed_by?: string;
  completed_at?: string;
  test: {
    name: string;
    short_code: string;
    reference_range?: string;
    unit?: string;
    sample_type?: string;
  };
}

const FLAG_COLOR: Record<string, string> = {
  normal: "text-green-600",
  low: "text-amber-600",
  high: "text-amber-600",
  critical: "text-red-600 font-bold",
};

export default function ResultsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const { toast } = useToast();
  const [orderTests, setOrderTests] = useState<TestResult[]>([]);
  const [results, setResults] = useState<Record<string, Partial<TestResult>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load order");
        return r.json();
      })
      .then(d => {
        const tests = d.order?.order_tests ?? [];
        setOrderTests(tests);
        const initial: Record<string, Partial<TestResult>> = {};
        tests.forEach((t: TestResult) => {
          initial[t.id] = {
            result_value: t.result_value ?? "",
            result_unit: t.result_unit ?? t.test?.unit ?? "",
            result_flag: t.result_flag ?? "",
            result_notes: t.result_notes ?? "",
          };
        });
        setResults(initial);
      })
      .catch(err => {
        console.error(err);
        toast("Failed to load order tests", "error");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  function set(testId: string, key: string, value: string) {
    setResults(prev => ({ ...prev, [testId]: { ...prev[testId], [key]: value } }));
  }

  function startEdit(testId: string) {
    setEditing(prev => new Set([...prev, testId]));
  }

  function cancelEdit(testId: string, ot: TestResult) {
    // Restore original values
    setResults(prev => ({
      ...prev,
      [testId]: {
        result_value: ot.result_value ?? "",
        result_unit: ot.result_unit ?? ot.test?.unit ?? "",
        result_flag: ot.result_flag ?? "",
        result_notes: ot.result_notes ?? "",
      }
    }));
    setEditing(prev => { const next = new Set(prev); next.delete(testId); return next; });
  }

  async function saveResult(ot: TestResult) {
    const r = results[ot.id] ?? {};
    if (!r.result_value?.trim()) { toast("Result value is required", "error"); return; }
    setSaving(prev => ({ ...prev, [ot.id]: true }));
    const payload = {
      result_value: r.result_value,
      result_unit: r.result_unit,
      result_flag: r.result_flag || undefined,
      result_notes: r.result_notes,
      status: "completed",
    };
    const res = await fetch(`/api/orders/${orderId}/tests/${ot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast(`${ot.test.name} saved`, "success");
      // Update local state
      setOrderTests(prev => prev.map(t => t.id === ot.id
        ? { ...t, status: "completed", result_value: payload.result_value ?? "", result_unit: payload.result_unit ?? "", result_flag: payload.result_flag ?? "", result_notes: payload.result_notes ?? "" }
        : t
      ));
      setEditing(prev => { const next = new Set(prev); next.delete(ot.id); return next; });
    } else {
      const d = await res.json();
      toast(d.error ?? "Save failed", "error");
    }
    setSaving(prev => ({ ...prev, [ot.id]: false }));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  );

  const completedCount = orderTests.filter(t => t.status === "completed").length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/orders/${orderId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Enter Results</h1>
          <p className="text-sm text-gray-500">
            {completedCount} of {orderTests.length} completed
            {completedCount > 0 && completedCount < orderTests.length && (
              <span className="ml-2 text-amber-600">· {orderTests.length - completedCount} pending</span>
            )}
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-24">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${orderTests.length ? (completedCount / orderTests.length) * 100 : 0}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-400 mt-1">
            {orderTests.length ? Math.round((completedCount / orderTests.length) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {orderTests.map(ot => {
          const r = results[ot.id] ?? {};
          const isComplete = ot.status === "completed";
          const isEditing = editing.has(ot.id);
          const isEditable = !isComplete || isEditing;

          return (
            <Card
              key={ot.id}
              className={`transition-all ${isComplete && !isEditing ? "border-emerald-200" : isEditing ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"}`}
              style={isComplete && !isEditing ? { background: "rgba(16,185,129,0.03)" } : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {ot.test.name}
                      <span className="text-xs font-normal text-gray-400 font-mono">{ot.test.short_code}</span>
                    </CardTitle>
                    {ot.test.sample_type && (
                      <p className="text-xs text-gray-400 mt-0.5">Sample: {ot.test.sample_type}</p>
                    )}
                    {ot.test.reference_range && (
                      <p className="text-xs text-gray-400">Ref: {ot.test.reference_range} {ot.test.unit ? `(${ot.test.unit})` : ""}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isComplete && !isEditing && (
                      <>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${r.result_flag ? FLAG_COLOR[r.result_flag] ?? "" : "text-gray-900"}`}>
                            {ot.result_value} {ot.result_unit}
                          </p>
                          {ot.result_flag && (
                            <p className={`text-xs ${FLAG_COLOR[ot.result_flag] ?? "text-gray-500"}`}>
                              {ot.result_flag.toUpperCase()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(ot.id)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 px-2"
                          title="Edit result"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                    {!isComplete && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                    {isEditing && (
                      <Badge variant="warning">Editing</Badge>
                    )}
                  </div>
                </div>

                {/* Correction notice */}
                {isEditing && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <History className="h-3.5 w-3.5 shrink-0" />
                    Correcting a completed result — previous value will be saved in the audit log
                  </div>
                )}
              </CardHeader>

              {isEditable && (
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Result Value *</Label>
                      <Input
                        placeholder="e.g. 12.5"
                        value={r.result_value ?? ""}
                        onChange={e => set(ot.id, "result_value", e.target.value)}
                        autoFocus={isEditing}
                        className={!r.result_value ? "border-red-200" : ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input
                        placeholder={ot.test.unit ?? "e.g. mg/dL"}
                        value={r.result_unit ?? ""}
                        onChange={e => set(ot.id, "result_unit", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Flag</Label>
                    <Select
                      value={r.result_flag ?? ""}
                      onChange={e => set(ot.id, "result_flag", e.target.value)}
                    >
                      <option value="">— Select flag —</option>
                      <option value="normal">✓ Normal</option>
                      <option value="low">↓ Low</option>
                      <option value="high">↑ High</option>
                      <option value="critical">⚠ Critical</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes (optional)</Label>
                    <Textarea
                      placeholder="Any observations or comments..."
                      value={r.result_notes ?? ""}
                      onChange={e => set(ot.id, "result_notes", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => saveResult(ot)}
                      loading={saving[ot.id]}
                      disabled={!r.result_value?.trim()}
                    >
                      <Save className="h-3 w-3 mr-1.5" />
                      {isEditing ? "Save Correction" : "Save Result"}
                    </Button>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelEdit(ot.id, ot)}
                        className="text-gray-500"
                      >
                        <X className="h-3 w-3 mr-1.5" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {completedCount === orderTests.length && orderTests.length > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 text-center">
          <p className="text-sm font-medium text-green-800">All results entered</p>
          <p className="text-xs text-green-600 mt-1">You can now generate the report</p>
        </div>
      )}

      <div className="mt-6">
        <Link href={`/orders/${orderId}/report`}>
          <Button className="w-full" variant={completedCount === orderTests.length ? "default" : "outline"}>
            {completedCount === orderTests.length ? "Generate Report →" : "Go to Report Page"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
